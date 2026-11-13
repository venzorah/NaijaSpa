ALTER TABLE "Vendor" ADD COLUMN "publicClickCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Service" ADD COLUMN "publicClickCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "ListingHit" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "serviceId" TEXT,
    "kind" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT '',
    "medium" TEXT NOT NULL DEFAULT '',
    "campaign" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "term" TEXT NOT NULL DEFAULT '',
    "path" TEXT NOT NULL DEFAULT '',
    "referrer" TEXT NOT NULL DEFAULT '',
    "ipHash" TEXT NOT NULL DEFAULT '',
    "userAgent" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingHit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ListingHit_vendorId_createdAt_idx" ON "ListingHit"("vendorId", "createdAt");
CREATE INDEX "ListingHit_serviceId_createdAt_idx" ON "ListingHit"("serviceId", "createdAt");
CREATE INDEX "ListingHit_kind_channel_createdAt_idx" ON "ListingHit"("kind", "channel", "createdAt");

ALTER TABLE "ListingHit" ADD CONSTRAINT "ListingHit_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ListingHit" ADD CONSTRAINT "ListingHit_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
