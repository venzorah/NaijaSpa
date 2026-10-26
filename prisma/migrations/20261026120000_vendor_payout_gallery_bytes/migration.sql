-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "payoutBankCode" TEXT;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "payoutBankName" TEXT;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "payoutAccountNumber" TEXT;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "payoutAccountName" TEXT;
ALTER TABLE "Vendor" ADD COLUMN IF NOT EXISTS "payoutRecipientCode" TEXT;

-- AlterTable
ALTER TABLE "TherapistGalleryImage" ADD COLUMN IF NOT EXISTS "payload" BYTEA;
ALTER TABLE "TherapistGalleryImage" ADD COLUMN IF NOT EXISTS "mimeType" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "earningId" TEXT;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "reference" TEXT;
ALTER TABLE "Payout" ADD COLUMN IF NOT EXISTS "providerRef" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Payout_earningId_key" ON "Payout"("earningId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Payout_earningId_fkey'
  ) THEN
    ALTER TABLE "Payout" ADD CONSTRAINT "Payout_earningId_fkey" FOREIGN KEY ("earningId") REFERENCES "VendorEarning"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
