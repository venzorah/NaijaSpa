import { prisma } from "@/lib/db";
import { ShopVendorActions } from "@/components/admin/shop-actions";
import { shopQuery } from "@/lib/shop/safe-query";

export default async function EcommerceVendorsPage() {
  const vendors = await shopQuery(
    () =>
      prisma.vendor.findMany({
        where: { shopStatus: { not: "none" } },
        orderBy: { updatedAt: "desc" },
        select: { id: true, businessName: true, state: true, city: true, shopStatus: true, commerceKind: true, shopNote: true }
      }),
    []
  );
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Sellers</p>
      <h1 className="mt-1 font-display text-3xl">Product vendors</h1>
      <p className="mt-2 text-sm text-ink2">Approve Product Store access. This does not grant Silver/Gold/Platinum listing plans.</p>
      <ul className="mt-6 space-y-3">
        {vendors.map((v) => (
          <li key={v.id} className="rounded-3xl border border-line bg-card p-4">
            <p className="font-semibold">{v.businessName}</p>
            <p className="text-sm text-ink2">{v.city}, {v.state} · {v.commerceKind} · {v.shopStatus}</p>
            {v.shopNote ? <p className="mt-1 text-sm">{v.shopNote}</p> : null}
            <ShopVendorActions vendorId={v.id} />
          </li>
        ))}
        {!vendors.length ? <li className="rounded-3xl border border-dashed border-line px-4 py-10 text-center text-sm text-ink2">No Product Store applications yet.</li> : null}
      </ul>
    </div>
  );
}
