import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { ROLES, type Role } from "./rbac";
import { withTimeout } from "./timeout";
import { persistSessionRecord } from "./session-store";
import { cache } from "react";
import { getRoleAccess } from "./admin-role-store";
import type { Permission } from "./rbac";

const COOKIE = "naijaspa_session";

function secret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me");
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
  permissions?: Permission[];
  roleLabel?: string;
  locale: string;
  theme: string | null;
  vendorId?: string | null;
  accountKind?: string;
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

const sessionUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  locale: true,
  theme: true,
  status: true,
  vendorOwned: { select: { id: true, applicationStatus: true } },
  staffMemberships: {
    where: { active: true, vendor: { applicationStatus: { not: "deleted" } } },
    select: { vendorId: true },
    take: 1
  }
} as const;

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    await jwtVerify(token, secret());
    const load = (withAccountKind: boolean) =>
      withTimeout(
        prisma.session.findUnique({
          where: { token },
          select: {
            expiresAt: true,
            user: {
              select: withAccountKind ? { ...sessionUserSelect, accountKind: true } : sessionUserSelect
            }
          }
        }),
        4000
      );
    const row = await load(true).catch(() => load(false));
    if (!row || row.expiresAt < new Date()) return null;
    const user = row.user as typeof row.user & { accountKind?: string };
    if (!user || user.status !== "active") return null;
    return {
      ...await getRoleAccess(user.role),
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      locale: user.locale,
      theme: user.theme,
      accountKind: user.accountKind,
      vendorId: (user.vendorOwned?.applicationStatus !== "deleted" ? user.vendorOwned?.id : null) ?? user.staffMemberships[0]?.vendorId ?? null
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
