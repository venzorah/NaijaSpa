import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { vendorEntitlement } from "@/lib/entitlements";
import { PortalChrome } from "@/components/portal-chrome";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login/vendor?next=/vendor/dashboard");
  if (!["vendor_owner", "vendor_staff"].includes(user.role)) redirect("/account/dashboard");
  const vendorId = user.vendorId;
  const [vendor, ent, actionCount, openTickets] = await Promise.all([
    vendorId
      ? prisma.vendor.findUnique({
          where: { id: vendorId },
          select: { businessName: true, city: true, applicationStatus: true, verificationStatus: true }
        })
      : Promise.resolve(null),
    vendorId ? vendorEntitlement(vendorId) : Promise.resolve(null),
    vendorId
      ? prisma.booking.count({
          where: { vendorId, status: { in: ["awaiting_payment", "pending", "cancellation_requested"] } }
        })
      : Promise.resolve(0),
    prisma.supportTicket.count({ where: { authorId: user.id, status: { in: ["open", "pending"] } } })
  ]);
  const verified = vendor?.verificationStatus === "verified";
  return (
    <PortalChrome
      variant="vendor"
      title="Vendor"
      subtitle={verified ? `Verified · ${vendor?.city || "Nigeria"}` : vendor?.applicationStatus?.replace(/_/g, " ") || "Vendor portal"}
      userName={user.name}
      businessName={vendor?.businessName}
      planPaid={Boolean(ent?.activePaid)}
      planLabel={ent?.activePaid ? `${ent.planCode} · 0% commission` : undefined}
      bookingBadge={actionCount > 0 ? String(actionCount) : undefined}
      alerts={openTickets}
    >
      {children}
    </PortalChrome>
  );
}
