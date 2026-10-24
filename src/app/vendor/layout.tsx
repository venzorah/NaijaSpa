import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { vendorEntitlement } from "@/lib/entitlements";
import { PortalChrome } from "@/components/portal-chrome";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login/vendor?next=/vendor");
  if (!["vendor_owner", "vendor_staff"].includes(user.role)) redirect("/account");
  const vendorId = user.vendorId;
  const vendor = vendorId ? await prisma.vendor.findUnique({ where: { id: vendorId } }) : null;
  const ent = vendorId ? await vendorEntitlement(vendorId) : null;
  const actionCount = vendorId
    ? await prisma.booking.count({
        where: { vendorId, status: { in: ["awaiting_payment", "pending", "cancellation_requested"] } }
      })
    : 0;
  const openTickets = vendorId
    ? await prisma.supportTicket.count({ where: { authorId: user.id, status: { in: ["open", "pending"] } } })
    : 0;
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
