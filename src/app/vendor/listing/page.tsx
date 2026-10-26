import { VendorPageHeader } from "@/components/vendor/page-header";
import { VendorListingContactForm } from "@/components/vendor-listing-contact-form";

export default function VendorListingPage() {
  return (
    <div>
      <VendorPageHeader
        title="Listing details"
        description="After a paid upgrade, add phone, WhatsApp and Instagram that Free listings keep private, then save."
      />
      <VendorListingContactForm highlightMissing />
    </div>
  );
}
