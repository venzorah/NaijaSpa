import { requireAdminScreen } from "@/lib/admin-auth";
import { AdminPageHeader } from "@/components/admin/page-header";
import { HomepageConsole } from "@/components/admin/homepage-console";
import { prisma } from "@/lib/db";
import { HOME_SECTIONS_CONFIG_KEY, parseHomeSections } from "@/lib/home-sections";

export const dynamic = "force-dynamic";

export default async function Page() {
  const { editable } = await requireAdminScreen("homepage");
  const [row, categories, vendors, services] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { key: HOME_SECTIONS_CONFIG_KEY } }),
    prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
    prisma.vendor.findMany({
      where: { applicationStatus: "approved" },
      orderBy: { businessName: "asc" },
      take: 300,
      select: { id: true, businessName: true, city: true, state: true }
    }),
    prisma.service.findMany({
      where: { active: true, vendor: { applicationStatus: "approved" } },
      orderBy: { name: "asc" },
      take: 400,
      select: {
        id: true,
        name: true,
        vendorId: true,
        vendor: { select: { businessName: true } },
        category: { select: { slug: true, name: true } }
      }
    })
  ]);
  return (
    <div className="max-w-3xl">
      <AdminPageHeader screen="homepage" />
      <HomepageConsole
        initial={{
          canEdit: editable,
          layout: parseHomeSections(row?.value),
          categories,
          vendors,
          services: services.map((service) => ({
            id: service.id,
            name: service.name,
            vendorId: service.vendorId,
            vendorName: service.vendor.businessName,
            categorySlug: service.category?.slug ?? "",
            categoryName: service.category?.name ?? ""
          }))
        }}
      />
    </div>
  );
}
