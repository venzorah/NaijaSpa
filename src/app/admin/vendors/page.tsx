import { requireAdminScreen } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/page-header";
import { VendorsConsole } from "@/components/admin/vendors-console";

export default async function AdminVendorsPage() {
  const { editable } = await requireAdminScreen("vendors");
  const vendors = await prisma.vendor.findMany({
    include: {
      owner: { select: { name: true, email: true } },
      subscriptions: { include: { plan: true }, orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { services: true } }
    },
    orderBy: { createdAt: "desc" }
  });
  return (
    <div>
      <AdminPageHeader screen="vendors" />
      <VendorsConsole
        editable={editable}
        rows={vendors.map((v) => ({
          id: v.id,
          businessName: v.businessName,
          slug: v.slug,
          city: v.city,
          neighbourhood: v.neighbourhood,
          applicationStatus: v.applicationStatus,
          verificationStatus: v.verificationStatus,
          visibility: v.visibility,
          ratingAvg: v.ratingAvg,
          reviewCount: v.reviewCount,
          ownerName: v.owner.name,
          ownerEmail: v.owner.email,
          plan: v.subscriptions[0]?.plan.name ?? "Free",
          services: v._count.services
        }))}
      />
    </div>
  );
}
