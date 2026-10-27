import { requireAdminScreen } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { AdminPageHeader } from "@/components/admin/page-header";
import { CategoriesConsole } from "@/components/admin/categories-console";
import { categoryAdminSelect } from "@/lib/category-fields";

export default async function CategoriesPage() {
  const { editable } = await requireAdminScreen("categories");
  const categories = await prisma.category
    .findMany({
      orderBy: { sortOrder: "asc" },
      select: categoryAdminSelect
    })
    .catch((error) => {
      console.error("admin.categories.list", error);
      return [];
    });
  return (
    <div>
      <AdminPageHeader screen="categories" />
      <CategoriesConsole
        editable={editable}
        rows={categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: c.description,
          synonyms: c.synonyms,
          metaTitle: c.metaTitle,
          metaDescription: c.metaDescription,
          imageUrl: c.imageUrl,
          active: c.active,
          services: c.services.length,
          vendors: new Set(c.services.map((s) => s.vendorId)).size
        }))}
      />
    </div>
  );
}
