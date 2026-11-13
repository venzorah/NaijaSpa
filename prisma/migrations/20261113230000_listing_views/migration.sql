ALTER TABLE "Vendor" ADD COLUMN "publicViewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Vendor" ADD COLUMN "adminClickCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Service" ADD COLUMN "publicViewCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "AdminListingClick" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminListingClick_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminListingClick_vendorId_createdAt_idx" ON "AdminListingClick"("vendorId", "createdAt");
CREATE INDEX "AdminListingClick_actorId_idx" ON "AdminListingClick"("actorId");

ALTER TABLE "AdminListingClick" ADD CONSTRAINT "AdminListingClick_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdminListingClick" ADD CONSTRAINT "AdminListingClick_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
