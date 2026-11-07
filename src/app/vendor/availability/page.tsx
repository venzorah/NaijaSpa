import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { VendorAvailabilityConsole } from "@/components/vendor/availability-console";
import { VendorCalendar } from "@/components/vendor/calendar";
import { lagosWeekStart } from "@/lib/vendor-calendar";
export default async function Page({ searchParams }: {
    searchParams: Promise<{
        week?: string;
    }>;
}) {
    const user = await getSession();
    const vendorId = user?.vendorId || "";
    const { week } = await searchParams;
    const at = week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? new Date(`${week}T12:00:00+01:00`) : new Date();
    const start = lagosWeekStart(Number.isFinite(at.getTime()) ? at : new Date()), end = new Date(start.getTime() + 7 * 86400000);
    const local = new Date(start.getTime() + 3600000);
    const monthStart = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - 3600000);
    const gridStart = lagosWeekStart(monthStart), gridEnd = new Date(gridStart.getTime() + 42 * 86400000);
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
    const appointments = await prisma.booking.findMany({ where: { vendorId, startsAt: { gte: gridStart, lt: gridEnd }, status: { notIn: ["cancelled", "refunded", "refund_pending", "no_show"] } }, select: { id: true, startsAt: true, endsAt: true, status: true, locationType: true, service: { select: { name: true } }, staff: { select: { name: true } } }, orderBy: { startsAt: 'asc' } });
    const locations = {
        spa: services.length ? services.some((s) => s.spaEnabled) : true,
        hotel: services.length ? services.some((s) => s.hotelEnabled) : true,
        home: services.length ? services.some((s) => s.homeEnabled) : true
    };
    return (<VendorAvailabilityConsole calendar={<VendorCalendar start={start.toISOString()} events={[...appointments.map(b => ({ id: b.id, startsAt: b.startsAt.toISOString(), endsAt: b.endsAt.toISOString(), title: b.service.name, subtitle: `${b.staff?.name || 'Any therapist'} · ${b.locationType}`, status: b.status })), ...blocks.filter(b => b.startsAt < gridEnd && b.endsAt > gridStart).map(b => ({ id: b.id, startsAt: b.startsAt.toISOString(), endsAt: b.endsAt.toISOString(), title: b.reason || 'Blocked time', subtitle: names[b.staffId] || 'Therapist', status: 'blocked', blocked: true }))]}/>} slots={slots.map((s) => ({ weekday: s.weekday, startMin: s.startMin, endMin: s.endMin, bufferMin: s.bufferMin }))} locations={locations} staff={staff} blocks={blocks.map((b) => ({
            id: b.id,
            staffName: names[b.staffId] || "Therapist",
            startsAt: b.startsAt.toLocaleString("en-NG"),
            endsAt: b.endsAt.toLocaleString("en-NG"),
            reason: b.reason || "Blocked"
        }))}/>);
}
