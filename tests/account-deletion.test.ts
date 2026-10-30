import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({
  $queryRaw: vi.fn(), $transaction: vi.fn(),
  user: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
  booking: { findMany: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
  refund: { create: vi.fn() }, vendorEarning: { updateMany: vi.fn() }, auditLog: { create: vi.fn() }
}));
vi.mock("../src/lib/db", () => ({ prisma: db }));
import { requestAccountDeletion } from "../src/lib/account-deletion";
const now = new Date("2026-11-02T08:00Z");
const booking = { id: "booking", customerId: "user", status: "awaiting_payment", startsAt: new Date("2026-11-03T08:00Z"), payments: [] };
beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation(async (fn) => fn(db));
  db.user.findUniqueOrThrow.mockResolvedValue({ deletionRequestedAt: null });
  db.booking.findMany.mockResolvedValue([{ id: "booking" }]);
  db.booking.findUniqueOrThrow.mockResolvedValue(booking);
});
describe("account deletion booking cleanup", () => {
  it("cancels upcoming unpaid appointments with a status event", async () => {
    expect(await requestAccountDeletion("user", now)).toEqual({ cancelledBookings: 1, refundReviewBookings: 0 });
    expect(db.booking.update).toHaveBeenCalledWith({ where: { id: "booking" }, data: expect.objectContaining({ status: "cancelled", statusHistory: { create: expect.objectContaining({ actorId: "user", fromStatus: "awaiting_payment", toStatus: "cancelled" }) } }) });
    expect(db.refund.create).not.toHaveBeenCalled();
    expect(db.user.update).toHaveBeenCalledWith({ where: { id: "user" }, data: { deletionRequestedAt: now } });
  });
  it("queues paid appointments for refund review and cancels pending earnings", async () => {
    db.booking.findUniqueOrThrow.mockResolvedValue({ ...booking, status: "confirmed", payments: [{ id: "payment", amountKobo: 10000, refunds: [] }] });
    expect((await requestAccountDeletion("user", now)).refundReviewBookings).toBe(1);
    expect(db.refund.create).toHaveBeenCalledWith({ data: expect.objectContaining({ paymentId: "payment", bookingId: "booking", amountKobo: 10000, status: "pending" }) });
    expect(db.booking.update.mock.calls[0][0].data.status).toBe("refund_pending");
    expect(db.vendorEarning.updateMany).toHaveBeenCalledWith({ where: { bookingId: "booking", status: "pending" }, data: { status: "cancelled" } });
  });
  it("does not create duplicate refunds or overwrite the original request date", async () => {
    const original = new Date("2026-11-01T08:00Z");
    db.user.findUniqueOrThrow.mockResolvedValue({ deletionRequestedAt: original });
    db.booking.findUniqueOrThrow.mockResolvedValue({ ...booking, status: "cancellation_requested", payments: [{ id: "payment", amountKobo: 10000, refunds: [{ id: "refund" }] }] });
    await requestAccountDeletion("user", now);
    expect(db.refund.create).not.toHaveBeenCalled();
    expect(db.user.update.mock.calls[0][0].data.deletionRequestedAt).toBe(original);
  });
  it.each(["completed", "in_progress", "cancelled", "refund_pending", "refunded", "no_show"])("preserves a booking that became %s before its lock was acquired", async (status) => {
    db.booking.findUniqueOrThrow.mockResolvedValue({ ...booking, status });
    expect((await requestAccountDeletion("user", now)).cancelledBookings).toBe(0);
    expect(db.booking.update).not.toHaveBeenCalled();
  });
  it("scopes the scan to this customer's future cancellable appointments", async () => {
    await requestAccountDeletion("user", now);
    expect(db.booking.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { customerId: "user", startsAt: { gt: now }, status: { in: ["pending", "awaiting_payment", "confirmed", "cancellation_requested"] } } }));
  });
  it("fails the transaction if a booking cannot be cancelled", async () => {
    db.booking.update.mockRejectedValue(new Error("database interrupted"));
    await expect(requestAccountDeletion("user", now)).rejects.toThrow("database interrupted");
    expect(db.user.update).not.toHaveBeenCalled();
  });
});
