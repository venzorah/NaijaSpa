-- Exact place search (state + city) and preferred therapist gender.
ALTER TABLE "Vendor" ADD COLUMN "state" TEXT NOT NULL DEFAULT 'Lagos';
ALTER TABLE "VendorStaff" ADD COLUMN "gender" TEXT NOT NULL DEFAULT '';
