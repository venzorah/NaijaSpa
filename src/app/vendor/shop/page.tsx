import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { ActivateShopButton } from "@/components/vendor/activate-shop";
import { formatNgn } from "@/lib/money";
import Link from "next/link";
import { shopQuery } from "@/lib/shop/safe-query";
import { SHOP_ONBOARDING_HOME } from "@/lib/shop/onboarding";
import { isProductOnlyVendor } from "@/lib/shop/vendor-kind";

export default async function VendorShopOverview() {
  const user = await getSession();
  if (!user?.vendorId) redirect("/login/vendor");
  const vendorId = user.vendorId;
  const vendor = await shopQuery(
    () =>
      prisma.vendor.findUnique({
        where: { id: vendorId },
        select: { shopStatus: true, shopNote: true, shopRejectedReason: true, commerceKind: true }
      }),
    { shopStatus: "none", shopNote: "", shopRejectedReason: "", commerceKind: "services" }
  );
  const products = await shopQuery(() => prisma.shopProduct.count({ where: { vendorId } }), 0);
  const orders = await shopQuery(
    () => prisma.shopVendorOrder.findMany({ where: { vendorId }, orderBy: { createdAt: "desc" }, take: 5 }),
    []
  );
  const status = vendor?.shopStatus ?? "none";
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Product Store</p>
      <h1 className="mt-1 font-display text-3xl">Overview</h1>
      <p className="mt-2 text-sm text-ink2">Status: {status}. This does not change your service listings or booking plans.</p>
      {vendor?.shopRejectedReason ? <p className="mt-2 text-sm text-ink2">Admin note: {vendor.shopRejectedReason}</p> : null}
      {isProductOnlyVendor(vendor?.commerceKind) && (status === "none" || status === "rejected") ? (
        <Link href={SHOP_ONBOARDING_HOME} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-gold px-5 text-sm font-bold text-ongold">
          Continue store setup
        </Link>
      ) : status === "none" || status === "rejected" ? (
        <div className="mt-4">
          <ActivateShopButton />
        </div>
      ) : null}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl border border-line bg-card p-4">
          <p className="text-sm text-ink2">Products</p>
          <p className="font-display text-3xl">{products}</p>
        </div>
        <div className="rounded-3xl border border-line bg-card p-4">
          <p className="text-sm text-ink2">Recent orders</p>
          <p className="font-display text-3xl">{orders.length}</p>
        </div>
        <Link href="/vendor/shop/products" className="rounded-3xl border border-gold bg-gold/10 p-4 font-semibold">
          Add a product →
        </Link>
      </div>
      <ul className="mt-6 space-y-2 text-sm">
        {orders.map((o) => (
          <li key={o.id} className="rounded-2xl border border-line bg-card px-4 py-3">
            {o.number} · {o.status} · {formatNgn(o.productKobo)}
          </li>
        ))}
        {!orders.length ? <li className="text-ink2">No product orders yet.</li> : null}
      </ul>
    </div>
  );
}
