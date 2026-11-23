import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { ActivateShopButton } from "@/components/vendor/activate-shop";
import { formatNgn } from "@/lib/money";
import Link from "next/link";

export default async function VendorShopOverview() {
  const user = await getSession();
  if (!user?.vendorId) redirect("/login/vendor");
  const [vendor, products, orders] = await Promise.all([
    prisma.vendor.findUnique({ where: { id: user.vendorId } }),
    prisma.shopProduct.count({ where: { vendorId: user.vendorId } }),
    prisma.shopVendorOrder.findMany({ where: { vendorId: user.vendorId }, orderBy: { createdAt: "desc" }, take: 5 })
  ]);
  return (
    <div>
      <h1 className="font-display text-2xl">Product Store</h1>
      <p className="mt-2 text-sm text-ink2">Status: {vendor?.shopStatus}. This does not change your service listings or booking plans.</p>
      {vendor?.shopStatus === "none" || vendor?.shopStatus === "rejected" ? <ActivateShopButton /> : null}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl border border-line bg-card p-4"><p className="text-sm text-ink2">Products</p><p className="font-display text-3xl">{products}</p></div>
        <div className="rounded-3xl border border-line bg-card p-4"><p className="text-sm text-ink2">Recent orders</p><p className="font-display text-3xl">{orders.length}</p></div>
        <Link href="/vendor/shop/products" className="rounded-3xl border border-gold bg-gold/10 p-4 font-semibold">Add a product →</Link>
      </div>
      <ul className="mt-6 space-y-2 text-sm">
        {orders.map((o) => (
          <li key={o.id}>{o.number} · {o.status} · {formatNgn(o.productKobo)}</li>
        ))}
      </ul>
    </div>
  );
}
