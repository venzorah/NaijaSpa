-- Therapist galleries (max 7 per vendor, enforced in app) and paid-plan video links.
CREATE TABLE "TherapistGallery" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TherapistGallery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TherapistGalleryImage" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT NOT NULL DEFAULT '',
    "therapistName" TEXT NOT NULL DEFAULT '',
    "byteSize" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TherapistGalleryImage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VendorVideoLink" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorVideoLink_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TherapistGallery_vendorId_idx" ON "TherapistGallery"("vendorId");
CREATE INDEX "TherapistGalleryImage_galleryId_idx" ON "TherapistGalleryImage"("galleryId");
CREATE INDEX "VendorVideoLink_vendorId_idx" ON "VendorVideoLink"("vendorId");

ALTER TABLE "TherapistGallery" ADD CONSTRAINT "TherapistGallery_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TherapistGalleryImage" ADD CONSTRAINT "TherapistGalleryImage_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "TherapistGallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorVideoLink" ADD CONSTRAINT "VendorVideoLink_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
