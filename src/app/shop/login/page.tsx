import { PortalLogin } from "@/components/portal-login";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ShopLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await getSession();
  const next = (await searchParams).next || "/orders";
  if (user) redirect(next);
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <PortalLogin portal="customer" title="Shop sign in" subtitle="Use your NaijaSpa account. No second password." defaultNext={next} />
    </div>
  );
}
