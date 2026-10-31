import { prisma } from "./db";

export async function persistSessionRecord(userId: string, token: string, expiresAt: Date, expectedPasswordHash?: string) {
  return prisma.$transaction(async (tx) => {
    // Coordinate with password resets. A login verified against the old hash
    // must not mint a new session after reset has revoked existing sessions.
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR NO KEY UPDATE`;
    const user = await tx.user.findUnique({ where: { id: userId }, select: { status: true, passwordHash: true } });
    if (!user || user.status !== "active" || (expectedPasswordHash !== undefined && user.passwordHash !== expectedPasswordHash)) {
      throw Object.assign(new Error("Credentials changed. Please sign in again."), { status: 401 });
    }
    return tx.session.create({ data: { userId, token, expiresAt } });
  }, { isolationLevel: "ReadCommitted" });
}
