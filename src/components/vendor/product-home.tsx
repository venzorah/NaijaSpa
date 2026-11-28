import Link from "next/link";
import { ArrowRight, MessageCircle, Package, ShoppingBag, Truck, Wallet } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatCount, formatNgn, formatNgnCompact } from "@/lib/money";
import { shopQuery } from "@/lib/shop/safe-query";
import { VendorPageHeader } from "@/components/vendor/page-header";
import { Panel } from "@/components/admin/panel";
import { StatCard } from "@/components/vendor/stat-card";
import { AdminStatusPill } from "@/components/admin/status-pill";
import { SHOP_ONBOARDING_HOME, shopOnboardingIncomplete } from "@/lib/shop/onboarding";

function greeting() {
  const hour = (new Date().getUTCHours() + 1) % 24;
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DualWorkspaceBanner() {
  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-line bg-card p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-goldink">Treatments</p>
        <p className="mt-1 font-display text-xl">Spa bookings</p>
        <p className="mt-1 text-sm text-ink2">Explore listings, appointments and listing plans stay here.</p>
      </div>
      <Link href="/vendor/shop" className="rounded-2xl border border-gold/40 bg-gold/10 p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-goldink">NaijaSpa Shop</p>
        <p className="mt-1 font-display text-xl">Product Store</p>
        <p className="mt-1 text-sm text-ink2">Oils, soaps and tools are separate from treatments. Open Shop →</p>
      </Link>
    </div>
  );
}

export async function ProductVendorHome({ vendorId, firstName }: { vendorId: string; firstName: string }) {
  const weekAgo = new Date(Date.now() - 7 * 864e5);
  const [vendor, products, pendingProducts, liveProducts, orders, weekOrders, sub] = await Promise.all([
    shopQuery(
      () =>
        prisma.vendor.findUnique({
          where: { id: vendorId },
          select: {
            businessName: true,
            shopStatus: true,
            shopRejectedReason: true,
            city: true,
            address: true,
            logoUrl: true,
            coverUrl: true,
            owner: { select: { emailVerifiedAt: true } },
            _count: { select: { documents: true } }
          }
        }),
      {
        businessName: "your store",
        shopStatus: "none",
        shopRejectedReason: "",
        city: "",
        address: "",
        logoUrl: null,
        coverUrl: null,
        owner: { emailVerifiedAt: null },
        _count: { documents: 0 }
      }
    ),
    shopQuery(() => prisma.shopProduct.count({ where: { vendorId } }), 0),
    shopQuery(() => prisma.shopProduct.count({ where: { vendorId, status: "pending" } }), 0),
    shopQuery(() => prisma.shopProduct.count({ where: { vendorId, status: "approved" } }), 0),
    shopQuery(
      () =>
        prisma.shopVendorOrder.findMany({
          where: { vendorId, status: { not: "pending_payment" } },
          orderBy: { createdAt: "desc" },
          take: 8
        }),
      []
    ),
    shopQuery(
      () =>
        prisma.shopVendorOrder.findMany({
          where: { vendorId, createdAt: { gte: weekAgo }, status: { not: "pending_payment" } },
          select: { vendorPayableKobo: true }
        }),
      []
    ),
    shopQuery(
      () =>
        prisma.shopVendorSubscription.findFirst({
          where: { vendorId, status: "active" },
          include: { plan: true },
          orderBy: { endsAt: "desc" }
        }),
      null
    )
  ]);
  const openOrders = orders.filter((o) => ["confirmed", "processing"].includes(o.status)).length;
  const weekPayable = weekOrders.reduce((s, o) => s + o.vendorPayableKobo, 0);
  const status = vendor?.shopStatus ?? "none";
  const needsSetup = shopOnboardingIncomplete("products", {
    shopStatus: status,
    businessName: vendor?.businessName,
    city: vendor?.city,
    address: vendor?.address,
    logoUrl: vendor?.logoUrl,
    coverUrl: vendor?.coverUrl,
    docCount: vendor?._count.documents ?? 0,
    emailVerified: Boolean(vendor?.owner?.emailVerifiedAt)
  });
  return (
    <div>
      <VendorPageHeader
        hideBack
        eyebrow="Product Store"
        title={`${greeting()}, ${firstName}`}
        description={`This home is for selling products on NaijaSpa Shop — not spa bookings. ${vendor?.businessName || ""}.`}
        actions={
          <>
            <Link href="/vendor/messages" className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line px-4 text-sm font-semibold">
              <MessageCircle className="h-4 w-4" /> Messages
            </Link>
            <Link
              href={needsSetup ? SHOP_ONBOARDING_HOME : "/vendor/shop/products"}
              className="inline-flex min-h-11 items-center gap-1 rounded-full bg-gold px-4 text-sm font-bold text-ongold"
            >
              {needsSetup ? "Continue setup" : "Add a product"} <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        }
      />

      {needsSetup ? (
        <Panel className="mb-4" title="Finish store setup" description="Save business details, KYC and store images. You can leave and continue from the same section.">
          {vendor?.shopRejectedReason ? <p className="mb-3 text-sm text-ink2">Admin note: {vendor.shopRejectedReason}</p> : null}
          <Link href={SHOP_ONBOARDING_HOME} className="inline-flex min-h-11 items-center rounded-full bg-gold px-5 text-sm font-bold text-ongold">
            Continue onboarding
          </Link>
        </Panel>
      ) : (
        <p className="mb-4 text-sm text-ink2">
          Shop status: <span className="font-semibold capitalize">{status.replace(/_/g, " ")}</span>
          {status === "pending" ? " — Admin is reviewing your Product Store." : null}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard href="/vendor/shop/products" label="Products" value={formatCount(products)} icon={Package} sub={`${liveProducts} live · ${pendingProducts} awaiting approval`} />
        <StatCard href="/vendor/shop/orders" label="Open orders" value={formatCount(openOrders)} icon={ShoppingBag} sub="Paid orders to pack or dispatch" />
        <StatCard href="/vendor/shop/earnings" label="Payable this week" value={formatNgnCompact(weekPayable)} icon={Wallet} sub="Shop sales after product commission · payouts" emphasis="gold" />
        <StatCard href="/vendor/shop/plan" label="Shop plan" value={sub?.plan.name || "Shop Free"} icon={Truck} sub={`${((sub?.plan.commissionBps ?? 1000) / 100).toFixed(0)}% commission on products`} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { href: "/vendor/shop/products", label: "My products", body: "Featured photo, gallery and SEO" },
          { href: "/vendor/shop/orders", label: "Orders", body: "Pack, dispatch and track" },
          { href: "/vendor/shop/shipping", label: "Shipping", body: "Local and interstate fees" },
          { href: "/vendor/shop/plan", label: "Shop plan", body: "Free or monthly — not listing plans" }
        ].map((item) => (
          <Link key={item.href} href={item.href} className="rounded-2xl border border-line bg-card p-4 transition hover:border-gold/40">
            <p className="font-semibold">{item.label}</p>
            <p className="mt-1 text-sm text-ink2">{item.body}</p>
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <Panel title="Recent product orders" description="Spa bookings are not shown here" actions={<Link href="/vendor/shop/orders" className="text-sm font-semibold text-goldink">All orders</Link>}>
          {orders.length ? (
            <ul className="divide-y divide-line">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{o.number}</p>
                    <p className="text-xs text-ink2">{formatNgn(o.productKobo)} products</p>
                  </div>
                  <AdminStatusPill status={o.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink2">No product orders yet. Approved listings appear on NaijaSpa Shop.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
