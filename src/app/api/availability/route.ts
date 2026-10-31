import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { availableServiceSlots, AVAILABILITY_DAYS, RESERVING_BOOKING_STATES } from "@/lib/next-slot";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const serviceId = new URL(req.url).searchParams.get("serviceId");
  if (!serviceId || serviceId.length > 200) return NextResponse.json({ error: "Valid serviceId required" }, { status: 400 });
  const service = await prisma.service.findFirst({
    where: { id: serviceId, active: true, vendor: { visibility: "public", applicationStatus: "approved" } },
    select: { vendorId: true, durationMin: true, staff: { select: { staff: { select: { id: true, active: true } } } } }
  });
  if (!service) return NextResponse.json({ error: "Service unavailable" }, { status: 404 });
  const now = new Date();
  const until = new Date(now.getTime() + AVAILABILITY_DAYS * 86400_000);
  const staffIds = service.staff.filter((link) => link.staff.active).map((link) => link.staff.id);
  const slots = await prisma.availabilitySlot.findMany({ where: { vendorId: service.vendorId } });
  const buffer = Math.max(0, ...slots.map((slot) => slot.bufferMin)) * 60_000;
  const [bookings, timeOff] = await Promise.all([
    prisma.booking.findMany({ where: { vendorId: service.vendorId, status: { in: RESERVING_BOOKING_STATES }, startsAt: { lt: new Date(until.getTime() + buffer) }, endsAt: { gt: new Date(now.getTime() - buffer) } }, select: { staffId: true, startsAt: true, endsAt: true } }),
    prisma.timeOff.findMany({ where: { staffId: { in: staffIds }, startsAt: { lt: until }, endsAt: { gt: now } }, select: { staffId: true, startsAt: true, endsAt: true } })
  ]);
  const appointments = availableServiceSlots({ durationMin: service.durationMin, staffIds, hasAssignedStaff: service.staff.length > 0, slots, bookings, timeOff }, now);
  return NextResponse.json({ slots: appointments.map((date) => date.toISOString()), timeZone: "Africa/Lagos" }, { headers: { "Cache-Control": "no-store" } });
}
