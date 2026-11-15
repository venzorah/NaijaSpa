import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { isCustomerAccountHub } from "@/lib/customer-nav";
import { portalNext } from "@/lib/portal-auth";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const dest = requestHeaders.get("x-naijaspa-customer-path") ?? "";
  if (isCustomerAccountHub(dest)) return children;

  const user = await getSession();
  const next = portalNext(dest, "customer");
  if (!user) redirect(`/login?${new URLSearchParams({ next })}`);
  if (user.role !== "customer") redirect(`/customer-access?${new URLSearchParams({ next })}`);
  return children;
}
