import { VendorPageHeader } from "@/components/vendor/page-header";
import { VendorListingContactForm } from "@/components/vendor-listing-contact-form";

export default function VendorListingPage() {
  return (
    <div>
      <VendorPageHeader
        title="Listing details"
        description="Save phone and WhatsApp for paid bookings. Explore stays private unless NaijaSpa turns public contact on."
      />
      <VendorListingContactForm highlightMissing />
    </div>
  );
}
