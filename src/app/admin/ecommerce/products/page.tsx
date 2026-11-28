import Link from "next/link";
import { prisma } from "@/lib/db";
import { ShopProductActions } from "@/components/admin/shop-actions";
import { ShopAdminError } from "@/components/admin/shop-admin-error";
import { adminShopLoad } from "@/lib/shop/admin-load";
import { shopProductListingLabel } from "@/lib/shop/listing-status";

export default async function EcommerceProductsPage() {
  const loaded = await adminShopLoad(() =>
    prisma.shopProduct.findMany({
      include: { vendor: { select: { businessName: true } }, category: true },
      orderBy: { updatedAt: "desc" },
      take: 200
    })
  );
  if (!loaded.ok) {
    return (
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Catalog</p>
        <h1 className="mt-1 font-display text-3xl">Products</h1>
        <ShopAdminError message={loaded.error} />
      </div>
    );
  }
  const products = loaded.data;
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Catalog</p>
      <h1 className="mt-1 font-display text-3xl">Products</h1>
      <p className="mt-2 text-sm text-ink2">Publish, unpublish, draft or delete listings. Only published products appear on Shop.</p>
      <ul className="mt-6 space-y-3">
        {products.map((p) => (
          <li key={p.id} className="rounded-3xl border border-line bg-card p-4">
            <p className="font-semibold">{p.name}</p>
            <p className="text-sm text-ink2">{p.vendor.businessName} · {p.category.name} · {shopProductListingLabel(p.status)}</p>
            <p className="mt-1 flex flex-wrap gap-3">
              <Link prefetch={false} href={`/admin/ecommerce/vendors/${p.vendorId}`} className="text-sm font-semibold text-goldink">
                Open seller
              </Link>
              <Link prefetch={false} href={`/admin/ecommerce/vendors/${p.vendorId}?edit=${p.id}#shop-product-form`} className="text-sm font-semibold text-goldink">
                Edit listing
              </Link>
            </p>
            <ShopProductActions id={p.id} status={p.status} />
          </li>
        ))}
        {!products.length ? <li className="rounded-3xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink2">No products submitted yet.</li> : null}
      </ul>
    </div>
  );
}
