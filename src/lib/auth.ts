import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { ROLES, type Role } from "./rbac";
import { withTimeout } from "./timeout";
import { persistSessionRecord } from "./session-store";
import { cache } from "react";

const COOKIE = "naijaspa_session";

function secret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me");
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  locale: string;
  theme: string | null;
  vendorId?: string | null;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string | null | undefined) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser, expectedPasswordHash?: string) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret());
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  await persistSessionRecord(user.id, token, expiresAt, expectedPasswordHash);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  jar.delete(COOKIE);
  if (token) {
    await withTimeout(prisma.session.deleteMany({ where: { token } }), 2500).catch(() => undefined);
  }
}

export async function hasSessionCookie(): Promise<boolean> {
  return Boolean((await cookies()).get(COOKIE)?.value);
}

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    await jwtVerify(token, secret());
    const row = await withTimeout(
      prisma.session.findUnique({
        where: { token },
        select: {
          expiresAt: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              locale: true,
              theme: true,
              status: true,
              vendorOwned: { select: { id: true } },
              staffMemberships: { select: { vendorId: true }, take: 1 }
            }
          }
        }
      }),
      4000
    );
    if (!row || row.expiresAt < new Date()) return null;
    const user = row.user;
    if (!user || user.status !== "active") return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      locale: user.locale,
      theme: user.theme,
      vendorId: user.vendorOwned?.id ?? user.staffMemberships[0]?.vendorId ?? null
    };
  } catch {
    return null;
  }
});

export function requireUser(user: SessionUser | null): SessionUser {
  if (!user) {
    const err = new Error("Unauthorized");
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  return user;
}

export { COOKIE, ROLES };
