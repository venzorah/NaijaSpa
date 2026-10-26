import { VendorOnboarding } from "@/components/vendor-onboarding";
import { VendorPageHeader } from "@/components/vendor/page-header";
import { VendorListingContactForm } from "@/components/vendor-listing-contact-form";

export default function Page() {
  return (
    <div>
      <VendorPageHeader title="Business profile" description="Edit and save your spa details any time. After a paid upgrade, add public phone, WhatsApp and Instagram, then save." />
      <VendorListingContactForm highlightMissing />
      <div className="mt-4">
        <VendorOnboarding embedded />
      </div>
    </div>
  );
}
