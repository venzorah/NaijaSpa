import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import { portalNext } from "@/lib/portal-auth";

export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const dest = requestHeaders.get("x-naijaspa-customer-path") || "/account/bookings";
  const path = dest.split("?")[0];
  // Paystack returns here without cookies in some in-app browsers. Verify must still run.
  if (path === "/checkout/verify") return children;

  const user = await getSession();
  const next = portalNext(dest, "customer");
  if (!user) redirect(`/login?${new URLSearchParams({ next })}`);
  if (user.role !== "customer") redirect(`/customer-access?${new URLSearchParams({ next })}`);
  return children;
}
