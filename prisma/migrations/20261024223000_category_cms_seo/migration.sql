-- AlterTable
ALTER TABLE "Category" ADD COLUMN "metaTitle" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Category" ADD COLUMN "metaDescription" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "CmsBlock" ADD COLUMN "metaTitle" TEXT NOT NULL DEFAULT '';
ALTER TABLE "CmsBlock" ADD COLUMN "metaDescription" TEXT NOT NULL DEFAULT '';
