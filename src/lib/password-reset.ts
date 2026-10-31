import { randomUUID } from "node:crypto";
import { prisma } from "./db";
import { hashPassword } from "./auth";
import { assertOtpSecurityConfigured, generateResetOtp, hashResetOtp, resetOtpMatches, RESET_MAX_ATTEMPTS, RESET_OTP_MINUTES, RESET_RESEND_SECONDS } from "./auth-reset";

export async function issuePasswordReset(userId: string) {
  const id = randomUUID(), code = generateResetOtp();
  const token = hashResetOtp(userId, id, code);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR NO KEY UPDATE`;
    const user = await tx.user.findUnique({ where: { id: userId }, select: { status: true } });
    if (!user || user.status !== "active") return null;
    const now = new Date();
    const previous = await tx.passwordReset.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
    if (previous && now.getTime() - previous.createdAt.getTime() < RESET_RESEND_SECONDS * 1000) return null;
    await tx.passwordReset.updateMany({ where: { userId, usedAt: null }, data: { usedAt: now } });
    await tx.passwordReset.create({ data: { id, userId, token, expiresAt: new Date(now.getTime() + RESET_OTP_MINUTES * 60_000), createdAt: now } });
    return { id, code };
  }, { isolationLevel: "ReadCommitted" });
}

export async function completePasswordReset(email: string, code: string, password: string) {
  assertOtpSecurityConfigured();
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return false;
  return prisma.$transaction(async (tx) => {
    // Issuance and verification share this lock. Concurrent requests cannot
    // consume a challenge twice, or issue two current challenges.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR NO KEY UPDATE`;
    const currentUser = await tx.user.findUnique({ where: { id: user.id }, select: { status: true } });
    if (!currentUser || currentUser.status !== "active") return false;
    const row = await tx.passwordReset.findFirst({ where: { userId: user.id, usedAt: null }, orderBy: { createdAt: "desc" } });
    const now = new Date();
    if (!row || row.expiresAt <= now || row.failedAttempts >= RESET_MAX_ATTEMPTS) return false;
    if (!resetOtpMatches(row.token, user.id, row.id, code)) {
      const failedAttempts = row.failedAttempts + 1;
      // Return rather than throw so failed-attempt increments commit.
      await tx.passwordReset.update({ where: { id: row.id }, data: { failedAttempts, ...(failedAttempts >= RESET_MAX_ATTEMPTS ? { usedAt: now } : {}) } });
      return false;
    }
    const passwordHash = await hashPassword(password);
    const consumedAt = new Date();
    const consumed = await tx.passwordReset.updateMany({ where: { id: row.id, usedAt: null, expiresAt: { gt: consumedAt }, failedAttempts: { lt: RESET_MAX_ATTEMPTS } }, data: { usedAt: consumedAt } });
    if (consumed.count !== 1) return false;
    await tx.user.update({ where: { id: user.id }, data: { passwordHash } });
    await tx.passwordReset.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: consumedAt } });
    await tx.session.deleteMany({ where: { userId: user.id } });
    await tx.auditLog.create({ data: { actorId: user.id, action: "account.password_reset", entityType: "User", entityId: user.id } });
    return true;
  }, { isolationLevel: "ReadCommitted", timeout: 10000 });
}
