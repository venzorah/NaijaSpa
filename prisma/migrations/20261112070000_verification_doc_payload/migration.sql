DELETE FROM "VerificationDoc" a
USING "VerificationDoc" b
WHERE a."vendorId" = b."vendorId" AND a.kind = b.kind AND a.id < b.id;

ALTER TABLE "VerificationDoc" ADD COLUMN IF NOT EXISTS "mimeType" TEXT NOT NULL DEFAULT '';
ALTER TABLE "VerificationDoc" ADD COLUMN IF NOT EXISTS "byteSize" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "VerificationDoc" ADD COLUMN IF NOT EXISTS "imagePayload" BYTEA;

CREATE UNIQUE INDEX IF NOT EXISTS "VerificationDoc_vendorId_kind_key" ON "VerificationDoc"("vendorId", "kind");
