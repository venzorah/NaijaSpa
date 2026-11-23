import { prisma } from "@/lib/db";
import { ShopVendorActions } from "@/components/admin/shop-actions";

export default async function EcommerceVendorsPage() {
  const vendors = await prisma.vendor.findMany({
    where: { shopStatus: { not: "none" } },
    orderBy: { updatedAt: "desc" },
    select: { id: true, businessName: true, state: true, city: true, shopStatus: true, commerceKind: true, shopNote: true }
  });
  return (
    <div>
      <h1 className="font-display text-3xl">Product vendors</h1>
      <ul className="mt-6 space-y-3">
        {vendors.map((v) => (
          <li key={v.id} className="rounded-3xl border border-line bg-card p-4">
            <p className="font-semibold">{v.businessName}</p>
            <p className="text-sm text-ink2">{v.city}, {v.state} · {v.commerceKind} · {v.shopStatus}</p>
            {v.shopNote ? <p className="mt-1 text-sm">{v.shopNote}</p> : null}
            <ShopVendorActions vendorId={v.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
