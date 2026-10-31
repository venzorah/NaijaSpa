import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ hash: vi.fn(), db: {
  $transaction: vi.fn(), $queryRaw: vi.fn(),
  user: { findUnique: vi.fn(), update: vi.fn() },
  passwordReset: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  session: { deleteMany: vi.fn() }, auditLog: { create: vi.fn() }
} }));
vi.mock("../src/lib/db", () => ({ prisma: mocks.db }));
vi.mock("../src/lib/auth", () => ({ hashPassword: mocks.hash }));
import { issuePasswordReset, completePasswordReset } from "../src/lib/password-reset";
import { hashResetOtp } from "../src/lib/auth-reset";
const db = mocks.db;
const challenge = () => ({ id: "challenge", userId: "user", token: hashResetOtp("user", "challenge", "123456"), expiresAt: new Date(Date.now() + 60_000), createdAt: new Date(Date.now() - 61_000), usedAt: null, failedAttempts: 0 });
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("OTP_HASH_SECRET", Buffer.alloc(32, 7).toString("base64url"));
  db.$transaction.mockImplementation(async (fn) => fn(db));
  db.user.findUnique.mockResolvedValue({ id: "user", status: "active" });
  db.passwordReset.findFirst.mockResolvedValue(challenge());
  db.passwordReset.updateMany.mockResolvedValue({ count: 1 });
  mocks.hash.mockResolvedValue("new-password-hash");
});
afterEach(() => vi.unstubAllEnvs());
describe("persistent OTP security", () => {
  it("issues a keyed per-challenge digest without storing a plaintext code", async () => {
    db.passwordReset.findFirst.mockResolvedValue(null);
    const issued = await issuePasswordReset("user"); expect(issued).not.toBeNull();
    const data = db.passwordReset.create.mock.calls[0][0].data;
    expect(data.token).toBe(hashResetOtp("user", issued!.id, issued!.code));
    expect(data.code).toBeUndefined(); expect(data.expiresAt.getTime() - data.createdAt.getTime()).toBe(15 * 60_000);
  });
  it("enforces a persisted resend cooldown even without Redis", async () => {
    db.passwordReset.findFirst.mockResolvedValue({ ...challenge(), createdAt: new Date() });
    expect(await issuePasswordReset("user")).toBeNull(); expect(db.passwordReset.create).not.toHaveBeenCalled();
  });
  it("supersedes old unused challenges before creating a fresh challenge", async () => {
    await issuePasswordReset("user");
    expect(db.passwordReset.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "user", usedAt: null } }));
    expect(db.passwordReset.updateMany.mock.invocationCallOrder[0]).toBeLessThan(db.passwordReset.create.mock.invocationCallOrder[0]);
  });
  it("consumes the challenge before changing the password and revokes sessions", async () => {
    expect(await completePasswordReset("person@example.com", "123456", "New-password-123")).toBe(true);
    expect(db.passwordReset.updateMany.mock.calls[0][0].where).toMatchObject({ id: "challenge", usedAt: null, failedAttempts: { lt: 5 } });
    expect(db.passwordReset.updateMany.mock.invocationCallOrder[0]).toBeLessThan(db.user.update.mock.invocationCallOrder[0]);
    expect(db.session.deleteMany).toHaveBeenCalledWith({ where: { userId: "user" } });
  });
  it("refuses a lost claim without changing passwords or sessions", async () => {
    db.passwordReset.updateMany.mockResolvedValue({ count: 0 });
    expect(await completePasswordReset("person@example.com", "123456", "New-password-123")).toBe(false);
    expect(db.user.update).not.toHaveBeenCalled(); expect(db.session.deleteMany).not.toHaveBeenCalled();
  });
  it("commits failed attempts rather than rolling them back by throwing", async () => {
    expect(await completePasswordReset("person@example.com", "000000", "New-password-123")).toBe(false);
    expect(db.passwordReset.update).toHaveBeenCalledWith({ where: { id: "challenge" }, data: { failedAttempts: 1 } });
    expect(mocks.hash).not.toHaveBeenCalled();
  });
  it("retires a challenge on its fifth wrong guess", async () => {
    db.passwordReset.findFirst.mockResolvedValue({ ...challenge(), failedAttempts: 4 });
    expect(await completePasswordReset("person@example.com", "000000", "New-password-123")).toBe(false);
    expect(db.passwordReset.update.mock.calls[0][0].data).toMatchObject({ failedAttempts: 5, usedAt: expect.any(Date) });
  });
  it("rejects expired challenges without hashing a password", async () => {
    db.passwordReset.findFirst.mockResolvedValue({ ...challenge(), expiresAt: new Date(Date.now() - 1) });
    expect(await completePasswordReset("person@example.com", "123456", "New-password-123")).toBe(false);
    expect(mocks.hash).not.toHaveBeenCalled();
  });
  it("rejects exhausted challenges even when the code is correct", async () => {
    db.passwordReset.findFirst.mockResolvedValue({ ...challenge(), failedAttempts: 5 });
    expect(await completePasswordReset("person@example.com", "123456", "New-password-123")).toBe(false);
    expect(db.user.update).not.toHaveBeenCalled();
  });
  it("does not allow inactive accounts to issue or consume challenges", async () => {
    db.user.findUnique.mockResolvedValue({ id: "user", status: "suspended" });
    expect(await issuePasswordReset("user")).toBeNull();
    expect(await completePasswordReset("person@example.com", "123456", "New-password-123")).toBe(false);
    expect(db.user.update).not.toHaveBeenCalled();
  });
});
