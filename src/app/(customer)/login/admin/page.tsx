import { PortalLogin } from "@/components/portal-login";

export default function AdminLoginPage() {
  return (
    <PortalLogin
      portal="admin"
      title="Admin console"
      subtitle="Vendors, commercial rules, finance and support. Invite-only accounts."
      defaultNext="/admin"
    />
  );
}
