import { VendorPageHeader } from "@/components/vendor/page-header";
import { VendorSettingsNav } from "@/components/vendor/settings-nav";
export default function Layout({ children }: {
    children: React.ReactNode;
}) { return <div><VendorPageHeader title="Settings" description="Appearance, notifications, team access and security."/><VendorSettingsNav />{children}</div>; }
