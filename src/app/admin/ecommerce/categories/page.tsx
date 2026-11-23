import { prisma } from "@/lib/db";

export default async function EcommerceCategoriesPage() {
  const categories = await prisma.shopCategory.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div>
      <h1 className="font-display text-3xl">Categories</h1>
      <ul className="mt-6 space-y-2">
        {categories.map((c) => (
          <li key={c.id} className="rounded-2xl border border-line bg-card px-4 py-3 text-sm">
            {c.sortOrder}. {c.name} {c.active ? "" : "(disabled)"}
          </li>
        ))}
      </ul>
    </div>
  );
}
