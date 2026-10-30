import { loadEnvConfig } from "@next/env";
import { randomBytes } from "node:crypto";
import { SignJWT } from "jose";
import assert from "node:assert/strict";

loadEnvConfig(process.cwd());
const base = "http://127.0.0.1:3000";
assert(["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname), "Local database required");
const run = `flow-fix-${randomBytes(6).toString("hex")}`;
async function main() {
const { prisma: db } = await import("../src/lib/db");
const { serviceAvailabilityLabels } = await import("../src/lib/service-availability");
const { findNextSlot } = await import("../src/lib/next-slot");
const { confirmBookingFromPayment } = await import("../src/lib/booking");
const customer = `${run}-customer`, owner = `${run}-owner`, other = `${run}-other`;
const vendorId = `${run}-vendor`, serviceId = `${run}-service`, staffId = `${run}-staff`;
const userIds = [customer, owner, other];
const cookies = new Map<string, string>();
function report(check: string) { console.log(JSON.stringify({ check, ok: true })); }
async function call(path: string, userId: string, body: object) {
  const response = await fetch(`${base}${path}`, { method: "POST", headers: { Cookie: cookies.get(userId)!, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
  return { status: response.status, data: await response.json() };
}
async function payFixture(bookingId: string, amountKobo: number) {
  return db.payment.create({ data: { bookingId, amountKobo, provider: "test-fixture", purpose: "booking", status: "success", reference: `${run}-${bookingId}`, idempotencyKey: `${run}-${bookingId}` } });
}
try {
  for (const id of userIds) {
    await db.user.create({ data: { id, email: `${id}@example.com`, name: "Workflow fixture", role: id === owner ? "vendor_owner" : "customer" } });
    const token = await new SignJWT({ id }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("10m").sign(new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me"));
    await db.session.create({ data: { userId: id, token, expiresAt: new Date(Date.now() + 600_000) } });
    cookies.set(id, `naijaspa_session=${token}`);
  }
  await db.vendor.create({ data: { id: vendorId, ownerId: owner, slug: vendorId, businessName: "Workflow fixture", city: "Lagos", neighbourhood: "Test", address: "Test", applicationStatus: "approved", visibility: "public" } });
  await db.category.create({ data: { id: run, slug: run, name: "Workflow fixture" } });
  await db.vendorStaff.create({ data: { id: staffId, vendorId, name: "Test therapist" } });
  await db.service.create({ data: { id: serviceId, vendorId, categoryId: run, slug: serviceId, name: "Workflow fixture treatment", durationMin: 60, basePriceKobo: 10000, staff: { create: { staffId } } } });
  const service = await db.service.findUniqueOrThrow({ where: { id: serviceId }, include: { staff: { include: { staff: true } } } });
  assert.equal((await serviceAvailabilityLabels([service])).get(serviceId), undefined);
  report("no-hours-no-invented-availability");
  await db.availabilitySlot.createMany({ data: Array.from({ length: 7 }, (_, weekday) => ({ vendorId, weekday, startMin: 540, endMin: 1080, bufferMin: 15 })) });
  assert((await serviceAvailabilityLabels([service])).get(serviceId)?.startsWith("Next: "));
  const off = await db.timeOff.create({ data: { staffId, startsAt: new Date(Date.now() - 86400_000), endsAt: new Date(Date.now() + 16 * 86400_000) } });
  assert.equal((await serviceAvailabilityLabels([service])).get(serviceId), undefined);
  await db.timeOff.delete({ where: { id: off.id } });
  report("live-schedules-and-time-off");
  const now = new Date();
  const slots = await db.availabilitySlot.findMany({ where: { vendorId } });
  const next = findNextSlot({ durationMin: 60, staffIds: [staffId], hasAssignedStaff: true, slots, bookings: [], timeOff: [] }, now);
  assert(next);
  const suggested = await call("/api/bookings", other, { serviceId, locationType: "spa", startsAt: next.toISOString(), idempotencyKey: `${run}-suggested` });
  assert.equal(suggested.status, 200, "Suggested appointment was rejected by booking validation");
  report("suggested-slot-accepted-by-real-booking-api");
  const tomorrow = new Date(now.getTime() + 86400_000 + 3600_000);
  const midnight = Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate()) - 3600_000;
  const reserve = async (hour: number, key: string) => {
    const result = await call("/api/bookings", customer, { serviceId, locationType: "spa", startsAt: new Date(midnight + hour * 3600_000).toISOString(), idempotencyKey: `${run}-${key}` });
    assert.equal(result.status, 200, `Fixture booking ${key} failed`); return result.data;
  };
  const unpaid = await reserve(10, "unpaid"), paid = await reserve(12, "paid"), late = await reserve(14, "late");
  await payFixture(paid.id, paid.customerTotalKobo);
  // Exercise the booking-row lock with payment confirmation racing deletion.
  const [deleted] = await Promise.all([call("/api/account/profile", customer, { deleteAccount: true }), confirmBookingFromPayment(paid.id)]);
  assert.equal(deleted.status, 200);
  assert.equal(deleted.data.cancelledBookings, 3);
  assert.equal((await db.booking.findUniqueOrThrow({ where: { id: unpaid.id } })).status, "cancelled");
  assert.equal((await db.booking.findUniqueOrThrow({ where: { id: paid.id } })).status, "refund_pending");
  assert.equal(await db.refund.count({ where: { bookingId: paid.id } }), 1);
  assert.equal((await db.booking.findUniqueOrThrow({ where: { id: suggested.data.id } })).status, "awaiting_payment");
  report("deletion-cancels-only-own-future-bookings-and-queues-refund-review");
  const requestedAt = (await db.user.findUniqueOrThrow({ where: { id: customer } })).deletionRequestedAt;
  const repeated = await call("/api/account/profile", customer, { deleteAccount: true });
  assert.equal(repeated.status, 200); assert.equal(repeated.data.cancelledBookings, 0);
  assert.equal(await db.refund.count({ where: { bookingId: paid.id } }), 1);
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: customer } })).deletionRequestedAt?.getTime(), requestedAt?.getTime());
  report("repeat-deletion-is-idempotent");
  await payFixture(late.id, late.customerTotalKobo);
  await confirmBookingFromPayment(late.id);
  assert.equal((await db.booking.findUniqueOrThrow({ where: { id: late.id } })).status, "refund_pending");
  assert.equal(await db.refund.count({ where: { bookingId: late.id } }), 1);
  report("late-payment-cannot-revive-cancelled-booking");
  const blocked = await call("/api/bookings", customer, { serviceId, locationType: "spa", startsAt: new Date(midnight + 16 * 3600_000).toISOString(), idempotencyKey: `${run}-blocked` });
  assert.equal(blocked.status, 409);
  report("new-bookings-blocked-during-deletion");
} catch (error) {
  process.exitCode = 1;
  console.error(JSON.stringify({ check: "availability-deletion", ok: false, detail: error instanceof assert.AssertionError ? error.message : "Workflow test failed; credentials omitted" }));
} finally {
  const bookings = await db.booking.findMany({ where: { vendorId }, select: { id: true } });
  const ids = bookings.map((b) => b.id);
  await db.refund.deleteMany({ where: { bookingId: { in: ids } } });
  await db.payment.deleteMany({ where: { bookingId: { in: ids } } });
  await db.vendorEarning.deleteMany({ where: { vendorId } });
  await db.booking.deleteMany({ where: { vendorId } });
  await db.timeOff.deleteMany({ where: { staffId } });
  await db.availabilitySlot.deleteMany({ where: { vendorId } });
  await db.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.category.deleteMany({ where: { id: run } });
  await db.$disconnect();
}
}
main().catch(() => { console.error("Workflow test could not complete; credentials omitted"); process.exitCode = 1; });
