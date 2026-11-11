ALTER TABLE "MediaAsset" ADD COLUMN "deletedAt" TIMESTAMP(3), ADD COLUMN "storageCleanupPending" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "MediaAsset_storageCleanupPending_deletedAt_idx" ON "MediaAsset"("storageCleanupPending", "deletedAt");
