import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  $transaction: vi.fn(), $queryRaw: vi.fn(),
  user: { findUnique: vi.fn() },
  booking: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  service: { findUnique: vi.fn() }, vendorStaff: { findMany: vi.fn() },
  availabilitySlot: { findMany: vi.fn() }, timeOff: { findFirst: vi.fn() },
  vendorSubscription: { findFirst: vi.fn() }, payment: { findFirst: vi.fn() },
  vendorEarning: { create: vi.fn() }, notification: { create: vi.fn() },
  refund: { findFirst: vi.fn(), create: vi.fn() }
}));
vi.mock("../src/lib/db", () => ({ prisma: db, getCommercialConfig: vi.fn(async () => ({ freeCommissionBps: 1000 })) }));
vi.mock("../src/lib/entitlements", () => ({ vendorEntitlement: vi.fn(async () => ({ planCode: "FREE", commissionBps: 1000 })) }));
import { createBooking, confirmBookingFromPayment } from "../src/lib/booking";
import { markBookingCompleted, releaseVendorPayout } from "../src/lib/payouts";

const input = {
  customerId: "customer", serviceId: "service", locationType: "spa" as const,
  locationDetails: "", startsAt: new Date("2099-01-05T10:00:00+01:00"), idempotencyKey: "unique-key"
};
beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation(async (fn) => fn(db));
  db.user.findUnique.mockResolvedValue({ status: "active", deletionRequestedAt: null });
  db.booking.findUnique.mockResolvedValue(null);
  db.service.findUnique.mockResolvedValue({
    id: "service", vendorId: "vendor", active: true, spaEnabled: true,
    durationMin: 60, basePriceKobo: 10000, addons: [], staff: [{ staffId: "staff" }],
    vendor: { visibility: "public", applicationStatus: "approved" }
  });
  db.vendorStaff.findMany.mockResolvedValue([{ id: "staff" }]);
  const weekday = new Date(input.startsAt.getTime() + 3_600_000).getUTCDay();
  db.availabilitySlot.findMany.mockResolvedValue([{ weekday, startMin: 540, endMin: 1200, bufferMin: 15, staffId: null }]);
  db.timeOff.findFirst.mockResolvedValue(null);
  db.booking.findFirst.mockResolvedValue(null);
  db.vendorSubscription.findFirst.mockResolvedValue(null);
  db.booking.create.mockImplementation(async ({ data }) => data);
});

describe("booking security", () => {
  it("returns a public unavailable message for a deleted service without creating a booking", async () => {
    db.service.findUnique.mockResolvedValue(null);
    await expect(createBooking(input)).rejects.toMatchObject({ status: 404, message: "This service is no longer available. Please choose another treatment from Explore." });
    expect(db.booking.create).not.toHaveBeenCalled();
  });
  it.each(["hidden", "unapproved"])("rejects a %s provider before reserving or charging", async (reason) => {
    db.service.findUnique.mockResolvedValue({ active: true, vendor: { visibility: reason === "hidden" ? "hidden" : "public", applicationStatus: reason === "unapproved" ? "submitted" : "approved" } });
    await expect(createBooking(input)).rejects.toMatchObject({ status: 404 });
    expect(db.booking.create).not.toHaveBeenCalled();
  });
  it("rejects new reservations after an account deletion request", async () => {
    db.user.findUnique.mockResolvedValue({ status: "active", deletionRequestedAt: new Date() });
    await expect(createBooking(input)).rejects.toMatchObject({ status: 409 });
    expect(db.booking.create).not.toHaveBeenCalled();
  });
  it("rejects another customer's idempotency key without returning their booking", async () => {
    db.booking.findUnique.mockResolvedValue({ customerId: "someone-else", locationDetails: "private address" });
    await expect(createBooking(input)).rejects.toMatchObject({ status: 409 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("returns the owner's retry without reserving another slot", async () => {
    const existing = { id: "booking", customerId: input.customerId };
    db.booking.findUnique.mockResolvedValue(existing);
    expect(await createBooking(input)).toBe(existing);
    expect(db.booking.create).not.toHaveBeenCalled();
  });
  it.each([new Date("invalid"), new Date("2020-01-01")])("rejects invalid or past dates", async (startsAt) => {
    await expect(createBooking({ ...input, startsAt })).rejects.toMatchObject({ status: 400 });
  });
  it("rejects a therapist who does not belong to the service/vendor", async () => {
    db.vendorStaff.findMany.mockResolvedValue([]);
    await expect(createBooking({ ...input, staffId: "foreign-staff" })).rejects.toMatchObject({ status: 400 });
    expect(db.vendorStaff.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ vendorId: "vendor", active: true, services: { some: { serviceId: "service" } } }) }));
  });
  it("enforces business hours", async () => {
    db.availabilitySlot.findMany.mockResolvedValue([]);
    await expect(createBooking(input)).rejects.toMatchObject({ status: 409 });
    expect(db.booking.create).not.toHaveBeenCalled();
  });
  it("honors time off when assigning a therapist automatically", async () => {
    db.timeOff.findFirst.mockResolvedValue({ id: "holiday" });
    await expect(createBooking(input)).rejects.toMatchObject({ status: 409 });
  });
  it("checks reservations after acquiring a vendor lock and includes buffers", async () => {
    await createBooking(input);
    expect(db.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(db.booking.findFirst.mock.invocationCallOrder[0]);
    expect(db.booking.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      startsAt: { lt: new Date(input.startsAt.getTime() + 75 * 60_000) },
      endsAt: { gt: new Date(input.startsAt.getTime() - 15 * 60_000) }
    }) }));
    expect(db.booking.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ staffId: "staff" }) }));
  });
  it("rejects overlapping reservations", async () => {
    db.booking.findFirst.mockResolvedValue({ id: "existing" });
    await expect(createBooking(input)).rejects.toMatchObject({ status: 409 });
  });
  it("allows only one concurrent reservation for the same therapist and time", async () => {
    let lock = Promise.resolve();
    let reserved = false;
    db.$transaction.mockImplementation(async (fn) => {
      let release = () => {};
      const tx = { ...db, $queryRaw: async (query: TemplateStringsArray) => {
        // Simulate the shared vendor lock; these customers have distinct user locks.
        if (!query[0].includes('"Vendor"')) return [];
        const previous = lock;
        lock = new Promise<void>((resolve) => { release = resolve; });
        await previous;
        return [];
      } };
      try { return await fn(tx); } finally { release(); }
    });
    db.booking.findFirst.mockImplementation(async () => reserved ? { id: "reserved" } : null);
    db.booking.create.mockImplementation(async ({ data }) => { reserved = true; return data; });
    const results = await Promise.allSettled([
      createBooking(input), createBooking({ ...input, customerId: "second-customer", idempotencyKey: "second-key" })
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    expect(db.booking.create).toHaveBeenCalledTimes(1);
  });
  it("checks idempotency ownership again after waiting for the lock", async () => {
    db.booking.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ customerId: "someone-else" });
    await expect(createBooking(input)).rejects.toMatchObject({ status: 409 });
    expect(db.booking.create).not.toHaveBeenCalled();
  });
  it("tries another therapist when the first one is on time off", async () => {
    db.vendorStaff.findMany.mockResolvedValue([{ id: "staff" }, { id: "second" }]);
    db.timeOff.findFirst.mockResolvedValueOnce({ id: "holiday" }).mockResolvedValueOnce(null);
    const booking = await createBooking(input);
    expect(booking.staffId).toBe("second");
  });
  it("cannot confirm an unpaid booking", async () => {
    db.booking.findUniqueOrThrow.mockResolvedValue({ id: "booking", status: "awaiting_payment", customerTotalKobo: 10000, currency: "NGN" });
    db.payment.findFirst.mockResolvedValue(null);
    await expect(confirmBookingFromPayment("booking")).rejects.toMatchObject({ status: 409 });
    expect(db.booking.update).not.toHaveBeenCalled();
  });
  it("records late payments for cancelled appointments as pending refunds", async () => {
    db.booking.findUniqueOrThrow.mockResolvedValue({ id: "booking", status: "cancelled", customerTotalKobo: 10000, currency: "NGN" });
    db.payment.findFirst.mockResolvedValue({ id: "payment", amountKobo: 10000 });
    db.refund.findFirst.mockResolvedValue(null);
    await confirmBookingFromPayment("booking");
    expect(db.refund.create).toHaveBeenCalledWith({ data: expect.objectContaining({ paymentId: "payment", amountKobo: 10000, status: "pending" }) });
    expect(db.booking.update).toHaveBeenCalledWith({ where: { id: "booking" }, data: expect.objectContaining({ status: "refund_pending" }) });
  });
  it("cannot complete an unpaid booking even if its status was manually confirmed", async () => {
    db.booking.findUniqueOrThrow.mockResolvedValue({ id: "booking", status: "confirmed", customerTotalKobo: 10000, currency: "NGN" });
    db.payment.findFirst.mockResolvedValue(null);
    await expect(markBookingCompleted("booking", "vendor")).rejects.toMatchObject({ status: 409 });
    expect(db.booking.update).not.toHaveBeenCalled();
  });
  it("cannot release money for an unpaid completed booking", async () => {
    db.booking.findUnique.mockResolvedValue({ id: "booking", status: "completed", customerTotalKobo: 10000, currency: "NGN" });
    db.payment.findFirst.mockResolvedValue(null);
    await expect(releaseVendorPayout("booking")).rejects.toMatchObject({ status: 409 });
    expect(db.vendorEarning.create).not.toHaveBeenCalled();
  });
});
