import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { VendorStaffConsole } from "@/components/vendor/staff-console";
import { StaffTimeline } from "@/components/vendor/staff-timeline";
export default async function Page() {
    const user = await getSession();
    const staff = await prisma.vendorStaff.findMany({
        where: { vendorId: user?.vendorId || "" },
        include: { slots: true, _count: { select: { bookings: true } } },
        orderBy: { name: "asc" }
    });
    return (<VendorStaffConsole timeline={<StaffTimeline vendorId={user?.vendorId || ""}/>} staff={staff.map((s) => ({
            id: s.id,
            name: s.name,
            gender: s.gender,
            title: s.title ?? "",
            bio: s.bio ?? "",
            active: s.active,
            bookings: s._count.bookings,
            slots: s.slots.map((sl) => ({ weekday: sl.weekday, startMin: sl.startMin, endMin: sl.endMin, bufferMin: sl.bufferMin }))
        }))}/>);
}
