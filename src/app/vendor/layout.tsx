import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PortalChrome } from "@/components/portal-chrome";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login/vendor?next=/vendor");
  if (!["vendor_owner", "vendor_staff"].includes(user.role)) redirect("/account");
  return (
    <PortalChrome variant="vendor" title="Vendor" subtitle="Vendor portal" userName={user.name}>
      {children}
    </PortalChrome>
  );
}
