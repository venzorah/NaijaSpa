import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";
import { bookingReference, displayNgPhone, isGuestAccountKind, isGuestPlaceholderEmail } from "@/lib/phone";
import { VendorBookingsConsole } from "@/components/vendor/bookings-console";
export default async function Page({ searchParams }: {
    searchParams: Promise<{
        q?: string;
    }>;
}) {
    const user = await getSession();
    const sp = await searchParams;
    if (!user?.vendorId) return (<VendorBookingsConsole initialQuery={sp.q ?? ""} rows={[]}/>);
    const bookings = await prisma.booking.findMany({
        where: { vendorId: user.vendorId },
        select: {
            id: true,
            status: true,
            startsAt: true,
            locationType: true,
            customerNotes: true,
            vendorPayableKobo: true,
            service: { select: { name: true } },
            customer: { select: { name: true, email: true, phone: true, phoneNormalized: true, accountKind: true } },
            staff: { select: { name: true } },
            payments: { select: { status: true }, take: 3, orderBy: { createdAt: "desc" } }
        },
        orderBy: { startsAt: "desc" },
        take: 200
    });
    return (<VendorBookingsConsole initialQuery={sp.q ?? ""} rows={bookings.map((b) => ({
            id: b.id,
            ref: bookingReference(b.id),
            customer: b.customer.name,
            customerKind: isGuestAccountKind(b.customer.accountKind) ? "guest" : "registered",
            phone: b.customer.phone || (b.customer.phoneNormalized ? displayNgPhone(b.customer.phoneNormalized) : ""),
            email: b.customer.email && !isGuestPlaceholderEmail(b.customer.email) ? b.customer.email : "",
            notes: b.customerNotes,
            service: b.service.name,
            when: b.startsAt.toLocaleString("en-NG", { timeZone: "Africa/Lagos" }),
            time: b.startsAt.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" }),
            location: b.locationType,
            staff: b.staff?.name || "Any",
            payable: b.vendorPayableKobo,
            totalLabel: formatNgn(b.vendorPayableKobo),
            status: b.status,
            payment: b.payments.some((p) => p.status === "success") ? "success" : b.payments[0]?.status ?? "unpaid"
        }))}/>);
}
