import Link from "next/link";
import { prisma } from "@/lib/db";
import { ShopVendorActions } from "@/components/admin/shop-actions";
import { ShopAdminError } from "@/components/admin/shop-admin-error";
import { adminShopLoad } from "@/lib/shop/admin-load";

export default async function EcommerceVendorsPage() {
  const loaded = await adminShopLoad(() =>
    prisma.vendor.findMany({
      where: { shopStatus: { not: "none" } },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        businessName: true,
        state: true,
        city: true,
        shopStatus: true,
        commerceKind: true,
        shopNote: true,
        owner: { select: { email: true, emailVerifiedAt: true } },
        _count: { select: { shopProducts: { where: { status: "pending" } } } }
      }
    })
  );
  if (!loaded.ok) {
    return (
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Sellers</p>
        <h1 className="mt-1 font-display text-3xl">Product vendors</h1>
        <ShopAdminError message={loaded.error} />
      </div>
    );
  }
  const vendors = loaded.data;
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Sellers</p>
      <h1 className="mt-1 font-display text-3xl">Product vendors</h1>
      <p className="mt-2 text-sm text-ink2">After a seller submits, approve the store and products. You can also open a seller to list products for them.</p>
      <ul className="mt-6 space-y-3">
        {vendors.map((v) => (
          <li key={v.id} className="rounded-3xl border border-line bg-card p-4">
            <p className="font-semibold">{v.businessName}</p>
            <p className="text-sm text-ink2">
              {v.city}, {v.state} · {v.shopStatus} · {v.owner.emailVerifiedAt ? "email verified" : "email unverified"} · {v._count.shopProducts} pending products
            </p>
            {v.shopNote ? <p className="mt-1 text-sm">{v.shopNote}</p> : null}
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Link prefetch={false} href={`/admin/ecommerce/vendors/${v.id}`} className="text-sm font-semibold text-goldink">
                Open & assist listing →
              </Link>
            </div>
            <ShopVendorActions vendorId={v.id} />
          </li>
        ))}
        {!vendors.length ? <li className="rounded-3xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink2">No Product Store applications yet.</li> : null}
      </ul>
    </div>
  );
}
