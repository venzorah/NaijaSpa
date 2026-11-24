import { VendorOnboarding } from "@/components/vendor-onboarding";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SHOP_ONBOARDING_HOME } from "@/lib/shop/onboarding";
import { isProductOnlyVendor } from "@/lib/shop/vendor-kind";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const user = await getSession();
  if (user?.vendorId) {
    const vendor = await prisma.vendor.findUnique({ where: { id: user.vendorId }, select: { commerceKind: true } });
    if (isProductOnlyVendor(vendor?.commerceKind)) redirect(SHOP_ONBOARDING_HOME);
  }
  return <VendorOnboarding />;
}
