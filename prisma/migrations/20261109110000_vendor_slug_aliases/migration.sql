CREATE TABLE "VendorSlugAlias" (
    "slug" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    CONSTRAINT "VendorSlugAlias_pkey" PRIMARY KEY ("slug")
);
CREATE INDEX "VendorSlugAlias_vendorId_idx" ON "VendorSlugAlias"("vendorId");
ALTER TABLE "VendorSlugAlias" ADD CONSTRAINT "VendorSlugAlias_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
