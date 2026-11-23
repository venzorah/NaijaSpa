-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN "commerceKind" TEXT NOT NULL DEFAULT 'services';
ALTER TABLE "Vendor" ADD COLUMN "shopStatus" TEXT NOT NULL DEFAULT 'none';
ALTER TABLE "Vendor" ADD COLUMN "shopNote" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Vendor" ADD COLUMN "shopRejectedReason" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "shopMasterOrderId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "shopVendorSubscriptionId" TEXT;

-- CreateTable
CREATE TABLE "ShopPlan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "priceKobo" INTEGER NOT NULL,
    "commissionBps" INTEGER NOT NULL,
    "featuredBoost" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopPlan_code_key" ON "ShopPlan"("code");

CREATE TABLE "ShopVendorSubscription" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'system',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopVendorSubscription_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShopVendorSubscription_vendorId_status_idx" ON "ShopVendorSubscription"("vendorId", "status");

CREATE TABLE "ShopCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ShopCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopCategory_slug_key" ON "ShopCategory"("slug");
CREATE INDEX "ShopCategory_parentId_sortOrder_idx" ON "ShopCategory"("parentId", "sortOrder");

CREATE TABLE "ShopProduct" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "ingredients" TEXT NOT NULL DEFAULT '',
    "usage" TEXT NOT NULL DEFAULT '',
    "warnings" TEXT NOT NULL DEFAULT '',
    "expiryNote" TEXT NOT NULL DEFAULT '',
    "nafdacNumber" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sponsoredUntil" TIMESTAMP(3),
    "ratingAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopProduct_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopProduct_slug_key" ON "ShopProduct"("slug");
CREATE INDEX "ShopProduct_vendorId_status_idx" ON "ShopProduct"("vendorId", "status");
CREATE INDEX "ShopProduct_categoryId_status_idx" ON "ShopProduct"("categoryId", "status");

CREATE TABLE "ShopProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ShopProductImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShopProductImage_productId_idx" ON "ShopProductImage"("productId");

CREATE TABLE "ShopProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default',
    "priceKobo" INTEGER NOT NULL,
    "compareKobo" INTEGER NOT NULL DEFAULT 0,
    "stockOnHand" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ShopProductVariant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopProductVariant_productId_sku_key" ON "ShopProductVariant"("productId", "sku");
CREATE INDEX "ShopProductVariant_productId_idx" ON "ShopProductVariant"("productId");

CREATE TABLE "ShopInventoryTxn" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "refType" TEXT NOT NULL DEFAULT '',
    "refId" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopInventoryTxn_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopInventoryTxn_kind_refType_refId_variantId_key" ON "ShopInventoryTxn"("kind", "refType", "refId", "variantId");
CREATE INDEX "ShopInventoryTxn_variantId_createdAt_idx" ON "ShopInventoryTxn"("variantId", "createdAt");

CREATE TABLE "ShopShippingProfile" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "localEnabled" BOOLEAN NOT NULL DEFAULT true,
    "localFeeKobo" INTEGER NOT NULL DEFAULT 0,
    "localEtaDays" INTEGER NOT NULL DEFAULT 2,
    "interstateOn" BOOLEAN NOT NULL DEFAULT false,
    "pickupEnabled" BOOLEAN NOT NULL DEFAULT false,
    "freeAboveKobo" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ShopShippingProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopShippingProfile_vendorId_key" ON "ShopShippingProfile"("vendorId");

CREATE TABLE "ShopShippingZone" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "feeKobo" INTEGER NOT NULL,
    "etaDays" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "ShopShippingZone_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopShippingZone_profileId_state_key" ON "ShopShippingZone"("profileId", "state");

CREATE TABLE "ShopCart" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "guestKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopCart_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShopCart_userId_idx" ON "ShopCart"("userId");
CREATE INDEX "ShopCart_guestKey_idx" ON "ShopCart"("guestKey");

CREATE TABLE "ShopCartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "ShopCartItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopCartItem_cartId_variantId_key" ON "ShopCartItem"("cartId", "variantId");

CREATE TABLE "ShopMasterOrder" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "neighbourhood" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending_payment',
    "productKobo" INTEGER NOT NULL,
    "shippingKobo" INTEGER NOT NULL,
    "totalKobo" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopMasterOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopMasterOrder_number_key" ON "ShopMasterOrder"("number");

CREATE TABLE "ShopVendorOrder" (
    "id" TEXT NOT NULL,
    "masterOrderId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_payment',
    "productKobo" INTEGER NOT NULL,
    "shippingKobo" INTEGER NOT NULL,
    "commissionBps" INTEGER NOT NULL,
    "commissionKobo" INTEGER NOT NULL,
    "vendorPayableKobo" INTEGER NOT NULL,
    "planCodeSnapshot" TEXT NOT NULL,
    "tracking" TEXT NOT NULL DEFAULT '',
    "dispatchedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopVendorOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopVendorOrder_number_key" ON "ShopVendorOrder"("number");
CREATE INDEX "ShopVendorOrder_vendorId_status_idx" ON "ShopVendorOrder"("vendorId", "status");
CREATE INDEX "ShopVendorOrder_masterOrderId_idx" ON "ShopVendorOrder"("masterOrderId");

CREATE TABLE "ShopOrderItem" (
    "id" TEXT NOT NULL,
    "vendorOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "skuSnapshot" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitKobo" INTEGER NOT NULL,
    "lineKobo" INTEGER NOT NULL,

    CONSTRAINT "ShopOrderItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ShopLedgerEntry" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vendorOrderId" TEXT,
    "kind" TEXT NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShopLedgerEntry_vendorId_createdAt_idx" ON "ShopLedgerEntry"("vendorId", "createdAt");

CREATE TABLE "ShopPayout" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "providerRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopPayout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopPayout_reference_key" ON "ShopPayout"("reference");

CREATE TABLE "ShopSettlement" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vendorOrderId" TEXT NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "availableAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "payoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopSettlement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopSettlement_vendorOrderId_key" ON "ShopSettlement"("vendorOrderId");
CREATE INDEX "ShopSettlement_vendorId_status_idx" ON "ShopSettlement"("vendorId", "status");

CREATE TABLE "ShopReturn" (
    "id" TEXT NOT NULL,
    "masterOrderId" TEXT NOT NULL,
    "vendorOrderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidenceUrl" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'open',
    "refundKobo" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopReturn_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShopReturn_vendorOrderId_status_idx" ON "ShopReturn"("vendorOrderId", "status");

CREATE TABLE "ShopReview" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'published',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShopReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopReview_productId_userId_key" ON "ShopReview"("productId", "userId");

CREATE TABLE "ShopPromotion" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT,
    "productId" TEXT,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ShopPromotion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShopPromotion_kind_active_startsAt_idx" ON "ShopPromotion"("kind", "active", "startsAt");

-- ForeignKeys
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_shopMasterOrderId_fkey" FOREIGN KEY ("shopMasterOrderId") REFERENCES "ShopMasterOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_shopVendorSubscriptionId_fkey" FOREIGN KEY ("shopVendorSubscriptionId") REFERENCES "ShopVendorSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ShopVendorSubscription" ADD CONSTRAINT "ShopVendorSubscription_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopVendorSubscription" ADD CONSTRAINT "ShopVendorSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ShopPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ShopCategory" ADD CONSTRAINT "ShopCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ShopCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ShopProduct" ADD CONSTRAINT "ShopProduct_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopProduct" ADD CONSTRAINT "ShopProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ShopCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ShopProductImage" ADD CONSTRAINT "ShopProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ShopProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopProductVariant" ADD CONSTRAINT "ShopProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ShopProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopInventoryTxn" ADD CONSTRAINT "ShopInventoryTxn_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ShopProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShopShippingProfile" ADD CONSTRAINT "ShopShippingProfile_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopShippingZone" ADD CONSTRAINT "ShopShippingZone_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ShopShippingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShopCart" ADD CONSTRAINT "ShopCart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopCartItem" ADD CONSTRAINT "ShopCartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "ShopCart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopCartItem" ADD CONSTRAINT "ShopCartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ShopProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShopCartItem" ADD CONSTRAINT "ShopCartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ShopProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ShopMasterOrder" ADD CONSTRAINT "ShopMasterOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShopVendorOrder" ADD CONSTRAINT "ShopVendorOrder_masterOrderId_fkey" FOREIGN KEY ("masterOrderId") REFERENCES "ShopMasterOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopVendorOrder" ADD CONSTRAINT "ShopVendorOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShopOrderItem" ADD CONSTRAINT "ShopOrderItem_vendorOrderId_fkey" FOREIGN KEY ("vendorOrderId") REFERENCES "ShopVendorOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopOrderItem" ADD CONSTRAINT "ShopOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ShopProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShopOrderItem" ADD CONSTRAINT "ShopOrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ShopProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ShopLedgerEntry" ADD CONSTRAINT "ShopLedgerEntry_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopLedgerEntry" ADD CONSTRAINT "ShopLedgerEntry_vendorOrderId_fkey" FOREIGN KEY ("vendorOrderId") REFERENCES "ShopVendorOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ShopPayout" ADD CONSTRAINT "ShopPayout_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopSettlement" ADD CONSTRAINT "ShopSettlement_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopSettlement" ADD CONSTRAINT "ShopSettlement_vendorOrderId_fkey" FOREIGN KEY ("vendorOrderId") REFERENCES "ShopVendorOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShopSettlement" ADD CONSTRAINT "ShopSettlement_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "ShopPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ShopReturn" ADD CONSTRAINT "ShopReturn_masterOrderId_fkey" FOREIGN KEY ("masterOrderId") REFERENCES "ShopMasterOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopReturn" ADD CONSTRAINT "ShopReturn_vendorOrderId_fkey" FOREIGN KEY ("vendorOrderId") REFERENCES "ShopVendorOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ShopReturn" ADD CONSTRAINT "ShopReturn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ShopReview" ADD CONSTRAINT "ShopReview_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ShopProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShopReview" ADD CONSTRAINT "ShopReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ShopPromotion" ADD CONSTRAINT "ShopPromotion_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShopPromotion" ADD CONSTRAINT "ShopPromotion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ShopProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
