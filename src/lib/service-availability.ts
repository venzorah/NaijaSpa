import { prisma } from "./db";
import { AVAILABILITY_DAYS, findNextSlot, nextLabelFor, RESERVING_BOOKING_STATES } from "./next-slot";

type Service = { id: string; vendorId: string; durationMin: number; staff: { staff: { id: string; active: boolean; gender?: string } }[] };

/** Batch schedule reads for a listing page rather than querying per card. */
export async function serviceAvailabilityLabels(services: Service[], gender?: string, now = new Date()) {
  const labels = new Map<string, string | undefined>();
  if (!services.length) return labels;
  const vendorIds = [...new Set(services.map((s) => s.vendorId))];
  const staffIds = [...new Set(services.flatMap((s) => s.staff.filter((link) => link.staff.active).map((link) => link.staff.id)))];
  const until = new Date(now.getTime() + AVAILABILITY_DAYS * 86400_000);
  const slots = await prisma.availabilitySlot.findMany({ where: { vendorId: { in: vendorIds } } });
  const buffer = Math.max(0, ...slots.map((s) => s.bufferMin)) * 60_000;
  const [bookings, timeOff] = await Promise.all([
    prisma.booking.findMany({ where: { vendorId: { in: vendorIds }, status: { in: RESERVING_BOOKING_STATES }, startsAt: { lt: new Date(until.getTime() + buffer) }, endsAt: { gt: new Date(now.getTime() - buffer) } }, select: { vendorId: true, staffId: true, startsAt: true, endsAt: true } }),
    staffIds.length ? prisma.timeOff.findMany({ where: { staffId: { in: staffIds }, startsAt: { lt: until }, endsAt: { gt: now } }, select: { staffId: true, startsAt: true, endsAt: true } }) : []
  ]);
  for (const service of services) {
    const eligible = service.staff.filter((link) => link.staff.active && (!gender || link.staff.gender === gender)).map((link) => link.staff.id);
    const next = findNextSlot({ durationMin: service.durationMin, staffIds: eligible, hasAssignedStaff: service.staff.length > 0,
      slots: slots.filter((s) => s.vendorId === service.vendorId), bookings: bookings.filter((b) => b.vendorId === service.vendorId), timeOff }, now);
    labels.set(service.id, nextLabelFor(next, now));
  }
  return labels;
}
