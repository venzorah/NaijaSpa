import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma, setConfig } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { SHOP_CONFIG, DEFAULT_SHOP_VENDOR_STATES } from "@/lib/shop/constants";
import { NIGERIA_STATES } from "@/lib/nigeria";
import { ensureShopCatalog } from "@/lib/shop/ensure";
import {
  clampShopProductImageMb,
  SHOP_PRODUCT_IMAGE_BYTES,
  SHOP_PRODUCT_IMAGE_MB_MAX,
  SHOP_PRODUCT_IMAGE_MB_MIN
} from "@/lib/shop/product-media";

export async function GET() {
  try {
    await requireAdmin("shop.manage");
    await ensureShopCatalog();
    const rows = await prisma.systemConfig.findMany({ where: { key: { in: Object.values(SHOP_CONFIG) } } });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return NextResponse.json({
      vendorStates: JSON.parse(map[SHOP_CONFIG.vendorStates] || JSON.stringify(DEFAULT_SHOP_VENDOR_STATES)),
      settlementDays: Number(map[SHOP_CONFIG.settlementDays] ?? 7),
      minPayoutKobo: Number(map[SHOP_CONFIG.minPayoutKobo] ?? 500000),
      payoutMode: map[SHOP_CONFIG.payoutMode] ?? "request",
      productImageMaxMb: clampShopProductImageMb(Number(map[SHOP_CONFIG.productImageMaxBytes] ?? SHOP_PRODUCT_IMAGE_BYTES) / (1024 * 1024)),
      states: NIGERIA_STATES
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin("shop.manage");
    const body = z
      .object({
        vendorStates: z.array(z.enum(NIGERIA_STATES)).min(1),
        settlementDays: z.number().int().min(0).max(60),
        minPayoutKobo: z.number().int().min(0),
        payoutMode: z.enum(["request", "automatic"]),
        productImageMaxMb: z.number().min(SHOP_PRODUCT_IMAGE_MB_MIN).max(SHOP_PRODUCT_IMAGE_MB_MAX)
      })
      .parse(await req.json());
    await setConfig(SHOP_CONFIG.vendorStates, JSON.stringify(body.vendorStates));
    await setConfig(SHOP_CONFIG.settlementDays, String(body.settlementDays));
    await setConfig(SHOP_CONFIG.minPayoutKobo, String(body.minPayoutKobo));
    await setConfig(SHOP_CONFIG.payoutMode, body.payoutMode);
    await setConfig(SHOP_CONFIG.productImageMaxBytes, String(clampShopProductImageMb(body.productImageMaxMb) * 1024 * 1024));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
