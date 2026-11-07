CREATE TABLE "ServiceSlugAlias" (
    "slug" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceSlugAlias_pkey" PRIMARY KEY ("slug")
);

CREATE INDEX "ServiceSlugAlias_serviceId_idx" ON "ServiceSlugAlias"("serviceId");

ALTER TABLE "ServiceSlugAlias" ADD CONSTRAINT "ServiceSlugAlias_serviceId_fkey"
FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
