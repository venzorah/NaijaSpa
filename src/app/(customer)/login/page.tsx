import { PortalLogin } from "@/components/portal-login";

export default function CustomerLoginPage() {
  return (
    <PortalLogin
      portal="customer"
      title="Welcome back"
      subtitle="Book treatments, manage appointments and pay with Paystack."
      defaultNext="/account"
    />
  );
}
