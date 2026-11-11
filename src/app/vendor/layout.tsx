import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { vendorEntitlement } from "@/lib/entitlements";

import { VendorPortal } from "@/components/vendor/portal";
import { headers } from "next/headers";
import { isVendorRole } from "@/lib/rbac";
import { vendorNext, vendorAccessHref, vendorReferrerPath } from "@/lib/vendor-access";
export default async function VendorLayout({ children }: {
    children: React.ReactNode;
}) {
    const user = await getSession();
    const requestHeaders = await headers();
    const next = vendorNext(requestHeaders.get("x-naijaspa-vendor-path"));
    if (!user)
        redirect(`/login/vendor?${new URLSearchParams({ next })}`);
    if (!isVendorRole(user.role))
        redirect(vendorAccessHref(next, vendorReferrerPath(requestHeaders.get("referer"), requestHeaders.get("host"))));
    const vendorId = user.vendorId;
    const [vendor, ent, actionCount, openTickets] = await Promise.all([
        vendorId
            ? prisma.vendor.findUnique({
                where: { id: vendorId },
                select: { businessName: true, logoUrl: true, city: true, applicationStatus: true, verificationStatus: true }
            })
            : Promise.resolve(null),
        vendorId ? vendorEntitlement(vendorId) : Promise.resolve(null),
        vendorId
            ? prisma.booking.count({
                where: { vendorId, status: { in: ["awaiting_payment", "pending", "cancellation_requested"] } }
            })
            : Promise.resolve(0),
        prisma.notification.count({ where: { userId: user.id, readAt: null } })
    ]);
    const verified = vendor?.verificationStatus === "verified";
    return (<VendorPortal subtitle={verified ? `Verified · ${vendor?.city || "Nigeria"}` : vendor?.applicationStatus?.replace(/_/g, " ") || "Vendor portal"} userName={user.name} businessName={vendor?.businessName || user.name} logoUrl={vendor?.logoUrl} planPaid={Boolean(ent?.activePaid)} planLabel={ent?.activePaid ? `Paid · ${ent.planCode}` : "Free plan"} commissionBps={ent?.commissionBps ?? 1000} bookingBadge={actionCount} alerts={openTickets}>
      {children}
    </VendorPortal>);
}
