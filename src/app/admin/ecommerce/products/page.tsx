import { prisma } from "@/lib/db";
import { ShopProductActions } from "@/components/admin/shop-actions";
import { shopQuery } from "@/lib/shop/safe-query";

export default async function EcommerceProductsPage() {
  const products = await shopQuery(
    () =>
      prisma.shopProduct.findMany({
        include: { vendor: { select: { businessName: true } }, category: true },
        orderBy: { updatedAt: "desc" },
        take: 200
      }),
    []
  );
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Catalog</p>
      <h1 className="mt-1 font-display text-3xl">Products</h1>
      <p className="mt-2 text-sm text-ink2">Approve listings before they appear on Shop.</p>
      <ul className="mt-6 space-y-3">
        {products.map((p) => (
          <li key={p.id} className="rounded-3xl border border-line bg-card p-4">
            <p className="font-semibold">{p.name}</p>
            <p className="text-sm text-ink2">{p.vendor.businessName} · {p.category.name} · {p.status}</p>
            <p className="mt-1">
              <a href={`/admin/ecommerce/vendors/${p.vendorId}`} className="text-sm font-semibold text-goldink">
                Open seller
              </a>
            </p>
            <ShopProductActions id={p.id} />
          </li>
        ))}
        {!products.length ? <li className="rounded-3xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink2">No products submitted yet.</li> : null}
      </ul>
    </div>
  );
}
