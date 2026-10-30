BEGIN;
LOCK TABLE "Favourite" IN SHARE ROW EXCLUSIVE MODE;

-- Empty rows cannot represent a saved item. Keep one record per saved target,
-- preferring an existing provider association when service saves were duplicated.
DELETE FROM "Favourite"
WHERE NULLIF(BTRIM("vendorId"), '') IS NULL AND NULLIF(BTRIM("serviceId"), '') IS NULL;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "userId", "serviceId"
    ORDER BY ("vendorId" IS NULL), "createdAt", id) AS position
  FROM "Favourite" WHERE "serviceId" IS NOT NULL
)
DELETE FROM "Favourite" WHERE id IN (SELECT id FROM ranked WHERE position > 1);

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "userId", "vendorId" ORDER BY "createdAt", id) AS position
  FROM "Favourite" WHERE "serviceId" IS NULL
)
DELETE FROM "Favourite" WHERE id IN (SELECT id FROM ranked WHERE position > 1);

CREATE UNIQUE INDEX "Favourite_userId_serviceId_key" ON "Favourite"("userId", "serviceId");
-- A provider-only save is independent of saving one or more of its treatments.
CREATE UNIQUE INDEX "Favourite_userId_vendor_only_key" ON "Favourite"("userId", "vendorId") WHERE "serviceId" IS NULL;
ALTER TABLE "Favourite" ADD CONSTRAINT "Favourite_target_required"
  CHECK (NULLIF(BTRIM("vendorId"), '') IS NOT NULL OR NULLIF(BTRIM("serviceId"), '') IS NOT NULL);
COMMIT;
