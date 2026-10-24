import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { VendorAvailabilityConsole } from "@/components/vendor/availability-console";

export default async function Page() {
  const user = await getSession();
  const vendorId = user?.vendorId || "";
  const [slots, services, staff] = await Promise.all([
    prisma.availabilitySlot.findMany({ where: { vendorId, staffId: null }, orderBy: [{ weekday: "asc" }, { startMin: "asc" }] }),
    prisma.service.findMany({ where: { vendorId }, select: { spaEnabled: true, hotelEnabled: true, homeEnabled: true } }),
    prisma.vendorStaff.findMany({ where: { vendorId }, select: { id: true, name: true } })
  ]);
  const blocks = await prisma.timeOff.findMany({
    where: { staffId: { in: staff.map((s) => s.id) } },
    orderBy: { startsAt: "asc" }
  });
  const names = Object.fromEntries(staff.map((s) => [s.id, s.name]));
  const locations = {
    spa: services.length ? services.some((s) => s.spaEnabled) : true,
    hotel: services.length ? services.some((s) => s.hotelEnabled) : true,
    home: services.length ? services.some((s) => s.homeEnabled) : true
  };
  return (
    <VendorAvailabilityConsole
      slots={slots.map((s) => ({ weekday: s.weekday, startMin: s.startMin, endMin: s.endMin, bufferMin: s.bufferMin }))}
      locations={locations}
      staff={staff}
      blocks={blocks.map((b) => ({
        id: b.id,
        staffName: names[b.staffId] || "Therapist",
        startsAt: b.startsAt.toLocaleString("en-NG"),
        endsAt: b.endsAt.toLocaleString("en-NG"),
        reason: b.reason || "Blocked"
      }))}
    />
  );
}
