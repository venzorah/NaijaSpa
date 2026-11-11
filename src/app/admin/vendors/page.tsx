import { requireAdminScreen } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/page-header";
import { VendorsConsole } from "@/components/admin/vendors-console";
import { listAdminGrantableVendorPlans } from "@/lib/vendor-plans-live";
import { hasPermission } from "@/lib/rbac";

export default async function AdminVendorsPage() {
  const { user, editable } = await requireAdminScreen("vendors");
  const [vendors, listingPlans] = await Promise.all([
    prisma.vendor.findMany({
      where: { applicationStatus: { not: "deleted" } },
      include: {
        owner: { select: { name: true, email: true, phone: true } },
        subscriptions: {
          where: { status: { in: ["active", "grace"] } },
          include: { plan: true },
          orderBy: { endsAt: "desc" },
          take: 1
        },
        _count: { select: { services: true } }
      },
      orderBy: { createdAt: "desc" }
    }),
    listAdminGrantableVendorPlans()
  ]);
  return (
    <div>
      <AdminPageHeader screen="vendors" />
      <VendorsConsole
        editable={editable}
        canInvite={hasPermission(user, "vendors.invite")}
        listingPlans={listingPlans.map((p) => ({
          code: p.code,
          name: p.name,
          priceKobo: p.priceKobo,
          durationDays: p.durationDays,
          active: p.active
        }))}
        rows={vendors.map((v) => ({
          id: v.id,
          businessName: v.businessName,
          slug: v.slug,
          description: v.description,
          providerType: v.providerType,
          state: v.state,
          address: v.address,
          instagramUrl: v.instagramUrl || "",
          cancellationPolicy: v.cancellationPolicy,
          city: v.city,
          neighbourhood: v.neighbourhood,
          applicationStatus: v.applicationStatus,
          verificationStatus: v.verificationStatus,
          visibility: v.visibility,
          ratingAvg: v.ratingAvg,
          reviewCount: v.reviewCount,
          ownerName: v.owner.name,
          ownerEmail: v.owner.email,
          mobile: v.privatePhone || v.owner.phone || "",
          whatsapp: v.privateWhatsapp || "",
          plan: v.subscriptions[0]?.plan.name ?? "Free",
          planCode: v.subscriptions[0]?.plan.code ?? "FREE",
          services: v._count.services
        }))}
      />
    </div>
  );
}
