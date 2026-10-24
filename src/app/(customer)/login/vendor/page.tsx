import { PortalLogin } from "@/components/portal-login";

export default function VendorLoginPage() {
  return (
    <PortalLogin
      portal="vendor"
      title="Vendor portal"
      subtitle="Manage services, galleries, bookings and earnings."
      defaultNext="/vendor"
    />
  );
}
