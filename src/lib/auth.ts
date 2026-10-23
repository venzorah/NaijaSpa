import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { ROLES, type Role } from "./rbac";

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

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret());
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { userId: user.id, token, expiresAt } });
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
  if (token) await prisma.session.deleteMany({ where: { token } });
  jar.delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const row = await prisma.session.findUnique({ where: { token } });
    if (!row || row.expiresAt < new Date()) return null;
    const user = await prisma.user.findUnique({
      where: { id: payload.id as string },
      include: { vendorOwned: true, staffMemberships: true }
    });
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
}

export function requireUser(user: SessionUser | null): SessionUser {
  if (!user) {
    const err = new Error("Unauthorized");
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  return user;
}

export { COOKIE, ROLES };
