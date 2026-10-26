import { redirect } from "next/navigation";
import { VENDOR_DASHBOARD } from "@/lib/rbac";

export default function VendorRootPage() {
  redirect(VENDOR_DASHBOARD);
}
