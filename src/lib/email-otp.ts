import { randomUUID } from "node:crypto";
import { prisma } from "./db";
import {
  assertOtpSecurityConfigured,
  generateResetOtp,
  hashOtp,
  otpMatches,
  RESET_MAX_ATTEMPTS,
  RESET_OTP_MINUTES,
  RESET_RESEND_SECONDS
} from "./auth-reset";

const PURPOSE = "email-verify" as const;

export async function issueEmailVerifyOtp(userId: string) {
  assertOtpSecurityConfigured();
  const id = randomUUID();
  const code = generateResetOtp();
  const token = hashOtp(PURPOSE, userId, id, code);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR NO KEY UPDATE`;
    const user = await tx.user.findUnique({ where: { id: userId }, select: { status: true, emailVerifiedAt: true } });
    if (!user || user.status !== "active") return null;
    if (user.emailVerifiedAt) return { alreadyVerified: true as const };
    const now = new Date();
    const previous = await tx.emailOtpChallenge.findFirst({
      where: { userId, purpose: PURPOSE, usedAt: null },
      orderBy: { createdAt: "desc" }
    });
    if (previous && now.getTime() - previous.createdAt.getTime() < RESET_RESEND_SECONDS * 1000) {
      return { wait: true as const };
    }
    await tx.emailOtpChallenge.updateMany({ where: { userId, purpose: PURPOSE, usedAt: null }, data: { usedAt: now } });
    await tx.emailOtpChallenge.create({
      data: { id, userId, purpose: PURPOSE, token, expiresAt: new Date(now.getTime() + RESET_OTP_MINUTES * 60_000), createdAt: now }
    });
    return { id, code };
  }, { isolationLevel: "ReadCommitted" });
}

export async function completeEmailVerifyOtp(userId: string, code: string) {
  assertOtpSecurityConfigured();
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR NO KEY UPDATE`;
    const user = await tx.user.findUnique({ where: { id: userId }, select: { status: true, emailVerifiedAt: true } });
    if (!user || user.status !== "active") return false;
    if (user.emailVerifiedAt) return true;
    const now = new Date();
    const row = await tx.emailOtpChallenge.findFirst({
      where: { userId, purpose: PURPOSE, usedAt: null },
      orderBy: { createdAt: "desc" }
    });
    if (!row || row.expiresAt <= now || row.failedAttempts >= RESET_MAX_ATTEMPTS) return false;
    if (!otpMatches(PURPOSE, row.token, userId, row.id, code)) {
      const failedAttempts = row.failedAttempts + 1;
      await tx.emailOtpChallenge.update({
        where: { id: row.id },
        data: { failedAttempts, ...(failedAttempts >= RESET_MAX_ATTEMPTS ? { usedAt: now } : {}) }
      });
      return false;
    }
    const consumed = await tx.emailOtpChallenge.updateMany({
      where: { id: row.id, usedAt: null, expiresAt: { gt: now }, failedAttempts: { lt: RESET_MAX_ATTEMPTS } },
      data: { usedAt: now }
    });
    if (consumed.count !== 1) return false;
    await tx.user.update({ where: { id: userId }, data: { emailVerifiedAt: now } });
    await tx.emailOtpChallenge.updateMany({ where: { userId, purpose: PURPOSE, usedAt: null }, data: { usedAt: now } });
    return true;
  }, { isolationLevel: "ReadCommitted", timeout: 10000 });
}
