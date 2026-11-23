import { prisma } from "@/lib/db";
import { ShopProductActions } from "@/components/admin/shop-actions";

export default async function EcommerceProductsPage() {
  const products = await prisma.shopProduct.findMany({
    include: { vendor: { select: { businessName: true } }, category: true },
    orderBy: { updatedAt: "desc" },
    take: 200
  });
  return (
    <div>
      <h1 className="font-display text-3xl">Products</h1>
      <ul className="mt-6 space-y-3">
        {products.map((p) => (
          <li key={p.id} className="rounded-3xl border border-line bg-card p-4">
            <p className="font-semibold">{p.name}</p>
            <p className="text-sm text-ink2">{p.vendor.businessName} · {p.category.name} · {p.status}</p>
            <ShopProductActions id={p.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
