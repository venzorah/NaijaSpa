import { redirect } from "next/navigation";
import { PortalLogin } from "@/components/portal-login";
import { getSession } from "@/lib/auth";
import { headers } from "next/headers";
import { isVendorRole } from "@/lib/rbac";
import { vendorNext, vendorAccessHref, vendorReferrerPath } from "@/lib/vendor-access";

export default async function VendorLoginPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, sp] = await Promise.all([getSession(), searchParams]);
  const next = vendorNext(typeof sp.next === "string" ? sp.next : undefined);
  if (user && isVendorRole(user.role)) redirect(next);
  if (user) {
    const h = await headers();
    redirect(vendorAccessHref(next, vendorReferrerPath(h.get("referer"), h.get("host"))));
  }
  return (
    <PortalLogin
      portal="vendor"
      title="Vendor portal"
      subtitle="Manage services, galleries, bookings and earnings."
      defaultNext="/vendor/dashboard"
    />
  );
}
