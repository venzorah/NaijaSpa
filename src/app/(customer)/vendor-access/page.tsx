import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isVendorRole } from "@/lib/rbac";
import { vendorNext, vendorCancelPath } from "@/lib/vendor-access";
import { VendorAccessGate } from "@/components/vendor-access-gate";

export default async function VendorAccessPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, params] = await Promise.all([getSession(), searchParams]);
  const next = vendorNext(typeof params.next === "string" ? params.next : null);
  if (!user) redirect(`/login/vendor?${new URLSearchParams({ next })}`);
  if (isVendorRole(user.role)) redirect(next);
  const back = vendorCancelPath(typeof params.back === "string" ? params.back : null);
  return <VendorAccessGate roleLabel={user.role === "customer" ? "a Customer" : user.roleLabel || "an administrator"} next={next} back={back} />;
}
