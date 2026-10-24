import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { VendorServicesConsole } from "@/components/vendor/services-console";

export default async function Page() {
  const user = await getSession();
  const vendorId = user?.vendorId || "";
  const [services, categories] = await Promise.all([
    prisma.service.findMany({
      where: { vendorId },
      include: { category: { select: { id: true, name: true } }, _count: { select: { bookings: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } })
  ]);
  return (
    <VendorServicesConsole
      categories={categories}
      rows={services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        category: s.category.name,
        categoryId: s.category.id,
        basePriceKobo: s.basePriceKobo,
        durationMin: s.durationMin,
        active: s.active,
        bookings: s._count.bookings,
        spaEnabled: s.spaEnabled,
        hotelEnabled: s.hotelEnabled,
        homeEnabled: s.homeEnabled,
        hotelAddonKobo: s.hotelAddonKobo,
        homeAddonKobo: s.homeAddonKobo
      }))}
    />
  );
}
