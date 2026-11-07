CREATE TABLE "MediaAsset" (
 "id" TEXT NOT NULL,
 "url" TEXT NOT NULL,
 "name" TEXT NOT NULL,
 "mime" TEXT NOT NULL,
 "byteSize" INTEGER NOT NULL,
 "imagePayload" BYTEA,
 "createdById" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MediaAsset_url_key" ON "MediaAsset"("url");
CREATE INDEX "MediaAsset_createdAt_idx" ON "MediaAsset"("createdAt");
ALTER TABLE "Category" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Service" ADD COLUMN "deletedAt" TIMESTAMP(3);
