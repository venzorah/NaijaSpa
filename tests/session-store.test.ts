import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ $transaction: vi.fn(), $queryRaw: vi.fn(), user: { findUnique: vi.fn() }, session: { create: vi.fn() } }));
vi.mock("../src/lib/db", () => ({ prisma: db }));
import { persistSessionRecord } from "../src/lib/session-store";
beforeEach(() => {
  vi.resetAllMocks(); db.$transaction.mockImplementation(async (fn) => fn(db));
  db.user.findUnique.mockResolvedValue({ status: "active", passwordHash: "current-hash" });
});
describe("session creation during credential changes", () => {
  it("persists a password login only while the verified hash remains current", async () => {
    const expiresAt = new Date(); await persistSessionRecord("user", "token", expiresAt, "current-hash");
    expect(db.session.create).toHaveBeenCalledWith({ data: { userId: "user", token: "token", expiresAt } });
  });
  it("blocks a login validated against credentials that changed before persistence", async () => {
    await expect(persistSessionRecord("user", "token", new Date(), "old-hash")).rejects.toMatchObject({ status: 401 });
    expect(db.session.create).not.toHaveBeenCalled();
  });
  it("supports verified OAuth sessions without a password snapshot", async () => {
    await persistSessionRecord("user", "token", new Date()); expect(db.session.create).toHaveBeenCalledOnce();
  });
  it("rejects inactive accounts even after earlier credential verification", async () => {
    db.user.findUnique.mockResolvedValue({ status: "suspended", passwordHash: "current-hash" });
    await expect(persistSessionRecord("user", "token", new Date(), "current-hash")).rejects.toMatchObject({ status: 401 });
    expect(db.session.create).not.toHaveBeenCalled();
  });
});
