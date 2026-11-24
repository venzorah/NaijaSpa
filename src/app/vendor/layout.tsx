import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { vendorEntitlement } from "@/lib/entitlements";

import { VendorPortal } from "@/components/vendor/portal";
import { headers } from "next/headers";
import { isVendorRole } from "@/lib/rbac";
import { vendorNext, vendorAccessHref, vendorReferrerPath } from "@/lib/vendor-access";
import { isProductOnlyVendor, productVendorServicePath } from "@/lib/shop/vendor-kind";
import { DEFAULT_SHOP_PLANS } from "@/lib/shop/constants";
import { SHOP_ONBOARDING_HOME, shopOnboardingIncomplete } from "@/lib/shop/onboarding";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  const requestHeaders = await headers();
  const next = vendorNext(requestHeaders.get("x-naijaspa-vendor-path"));
  if (!user) redirect(`/login/vendor?${new URLSearchParams({ next })}`);
  if (!isVendorRole(user.role)) {
    redirect(vendorAccessHref(next, vendorReferrerPath(requestHeaders.get("referer"), requestHeaders.get("host"))));
  }
  const vendorId = user.vendorId;
  const vendor = vendorId
    ? await prisma.vendor.findUnique({
        where: { id: vendorId },
        select: {
          businessName: true,
          logoUrl: true,
          coverUrl: true,
          city: true,
          address: true,
          applicationStatus: true,
          verificationStatus: true,
          commerceKind: true,
          shopStatus: true,
          shopOnboardingStep: true,
          owner: { select: { emailVerifiedAt: true } },
          _count: { select: { documents: true } }
        }
      })
    : null;
  const productOnly = isProductOnlyVendor(vendor?.commerceKind);
  const shopSetupIncomplete = shopOnboardingIncomplete(vendor?.commerceKind, {
    shopStatus: vendor?.shopStatus,
    businessName: vendor?.businessName,
    city: vendor?.city,
    address: vendor?.address,
    logoUrl: vendor?.logoUrl,
    coverUrl: vendor?.coverUrl,
    docCount: vendor?._count.documents ?? 0,
    emailVerified: Boolean(vendor?.owner?.emailVerifiedAt)
  });
  if (productOnly && next.startsWith("/vendor/onboarding")) {
    redirect(shopSetupIncomplete ? SHOP_ONBOARDING_HOME : "/vendor/dashboard");
  }
  if (productOnly && shopSetupIncomplete && !next.startsWith(SHOP_ONBOARDING_HOME)) {
    redirect(SHOP_ONBOARDING_HOME);
  }
  if (productOnly && productVendorServicePath(next)) redirect("/vendor/dashboard");

  const [ent, shopSub, actionCount, openTickets] = await Promise.all([
    vendorId && !productOnly ? vendorEntitlement(vendorId) : Promise.resolve(null),
    vendorId && productOnly
      ? prisma.shopVendorSubscription.findFirst({
          where: { vendorId, status: "active" },
          include: { plan: true },
          orderBy: { endsAt: "desc" }
        })
      : Promise.resolve(null),
    vendorId
      ? productOnly
        ? prisma.shopVendorOrder.count({ where: { vendorId, status: { in: ["confirmed", "processing"] } } })
        : prisma.booking.count({
            where: { vendorId, status: { in: ["awaiting_payment", "pending", "cancellation_requested"] } }
          })
      : Promise.resolve(0),
    prisma.notification.count({ where: { userId: user.id, readAt: null } })
  ]);
  const shopPlan = shopSub?.plan ?? DEFAULT_SHOP_PLANS[0];
  const shopPaid = Boolean(shopSub && shopPlan.code !== "SHOP_FREE");
  const verified = vendor?.verificationStatus === "verified";
  return (
    <VendorPortal
      commerceKind={vendor?.commerceKind || "services"}
      subtitle={
        productOnly
          ? vendor?.shopStatus === "approved"
            ? `Shop live · ${vendor?.city || "Nigeria"}`
            : `Shop ${vendor?.shopStatus || "setup"}`
          : verified
            ? `Verified · ${vendor?.city || "Nigeria"}`
            : vendor?.applicationStatus?.replace(/_/g, " ") || "Vendor portal"
      }
      userName={user.name}
      businessName={vendor?.businessName || user.name}
      logoUrl={vendor?.logoUrl}
      planPaid={productOnly ? shopPaid : Boolean(ent?.activePaid)}
      planLabel={productOnly ? shopPlan.name : ent?.activePaid ? `Paid · ${ent.planCode}` : "Free plan"}
      commissionBps={productOnly ? shopPlan.commissionBps : ent?.commissionBps ?? 1000}
      bookingBadge={actionCount}
      alerts={openTickets}
    >
      {children}
    </VendorPortal>
  );
}
