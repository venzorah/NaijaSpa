import { VendorOnboarding } from "@/components/vendor-onboarding";
import { VendorPageHeader } from "@/components/vendor/page-header";

export default function Page() {
  return (
    <div>
      <VendorPageHeader title="Business profile" description="This is what guests and NaijaSpa verification see. Hours, address and private contact stay on your listing." />
      <VendorOnboarding embedded />
    </div>
  );
}
