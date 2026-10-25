import { requireAdminScreen } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/page-header";
import { ServicesConsole } from "@/components/admin/services-console";

export default async function ServicesPage() {
  const { editable } = await requireAdminScreen("services");
  const services = await prisma.service.findMany({
    include: { vendor: { select: { businessName: true } }, category: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 200
  });
  return (
    <div>
      <AdminPageHeader screen="services" />
      <ServicesConsole
        editable={editable}
        rows={services.map((s) => ({
          id: s.id,
          slug: s.slug,
          name: s.name,
          description: s.description,
          imageUrl: s.imageUrl,
          vendor: s.vendor.businessName,
          category: s.category.name,
          price: s.basePriceKobo,
          duration: s.durationMin,
          active: s.active,
          locations: [s.spaEnabled ? "Spa/Office" : null, s.hotelEnabled ? "Hotel" : null, s.homeEnabled ? "Home" : null].filter(Boolean) as string[],
          createdAt: s.createdAt.toLocaleDateString("en-NG")
        }))}
      />
    </div>
  );
}
