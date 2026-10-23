-- Vendor-priced Hotel and Home service add-ons. Spa/Office has no extra charge.
ALTER TABLE "Service" ADD COLUMN "hotelAddonKobo" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Service" ADD COLUMN "homeAddonKobo" INTEGER NOT NULL DEFAULT 0;
