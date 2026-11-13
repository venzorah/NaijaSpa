ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accountKind" TEXT NOT NULL DEFAULT 'registered';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneNormalized" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phoneVerifiedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "User_phoneNormalized_key" ON "User"("phoneNormalized");

ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "customerNotes" TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS "PhoneOtpChallenge" (
    "id" TEXT NOT NULL,
    "phoneNormalized" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneOtpChallenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PhoneOtpChallenge_phoneNormalized_createdAt_idx" ON "PhoneOtpChallenge"("phoneNormalized", "createdAt");
