import { prisma, setConfig } from "@/lib/db";
import { duringNextBuild } from "@/lib/live-db";
import { DEFAULT_SHOP_PLANS, DEFAULT_SHOP_VENDOR_STATES, SHOP_CATEGORIES, SHOP_CONFIG } from "./constants";
import { clampShopProductImageBytes, SHOP_PRODUCT_IMAGE_BYTES } from "./product-media";

export { DEFAULT_SHOP_VENDOR_STATES };

let shopDbSkipUntil = 0;
let shopDbProbe: Promise<boolean> | null = null;

const SHOP_DB_AUTH_FAIL = /Authentication failed|P1000|P1001|Can't reach database|not valid/i;

export function shopDbUnavailable() {
  return duringNextBuild() || !process.env.DATABASE_URL || Date.now() < shopDbSkipUntil;
}

export function markShopDbUnavailable(error?: unknown) {
  const message = error instanceof Error ? `${error.message} ${error.name}` : String(error ?? "");
  const ms = SHOP_DB_AUTH_FAIL.test(message) ? 10 * 60_000 : 30_000;
  shopDbSkipUntil = Math.max(shopDbSkipUntil, Date.now() + ms);
}

/** One connectivity check so parallel Shop queries do not all hit a dead database. */
export async function shopDbReady() {
  if (shopDbUnavailable()) return false;
  if (shopDbProbe) return shopDbProbe;
  shopDbProbe = prisma
    .$queryRaw`SELECT 1`
    .then(() => true)
    .catch((error) => {
      markShopDbUnavailable(error);
      return false;
    })
    .finally(() => {
      shopDbProbe = null;
    });
  return shopDbProbe;
}

export async function ensureShopCatalog() {
  if (!(await shopDbReady())) return;
  try {
    for (const [index, cat] of SHOP_CATEGORIES.entries()) {
      const existing = await prisma.shopCategory.findUnique({ where: { slug: cat.slug } });
      if (existing) continue;
      await prisma.shopCategory.create({
        data: { slug: cat.slug, name: cat.name, sortOrder: index + 1, active: true }
      });
    }
    for (const plan of DEFAULT_SHOP_PLANS) {
      const existing = await prisma.shopPlan.findUnique({ where: { code: plan.code } });
      if (existing) continue;
      await prisma.shopPlan.create({
        data: {
          code: plan.code,
          name: plan.name,
          durationDays: plan.durationDays,
          priceKobo: plan.priceKobo,
          commissionBps: plan.commissionBps,
          featuredBoost: plan.featuredBoost,
          active: true
        }
      });
    }
    const states = await prisma.systemConfig.findUnique({ where: { key: SHOP_CONFIG.vendorStates } });
    if (!states) await setConfig(SHOP_CONFIG.vendorStates, JSON.stringify([...DEFAULT_SHOP_VENDOR_STATES]));
    const days = await prisma.systemConfig.findUnique({ where: { key: SHOP_CONFIG.settlementDays } });
    if (!days) await setConfig(SHOP_CONFIG.settlementDays, "7");
    const min = await prisma.systemConfig.findUnique({ where: { key: SHOP_CONFIG.minPayoutKobo } });
    if (!min) await setConfig(SHOP_CONFIG.minPayoutKobo, "500000");
    const mode = await prisma.systemConfig.findUnique({ where: { key: SHOP_CONFIG.payoutMode } });
    if (!mode) await setConfig(SHOP_CONFIG.payoutMode, "request");
    const imageCap = await prisma.systemConfig.findUnique({ where: { key: SHOP_CONFIG.productImageMaxBytes } });
    if (!imageCap) await setConfig(SHOP_CONFIG.productImageMaxBytes, String(SHOP_PRODUCT_IMAGE_BYTES));
  } catch (error) {
    markShopDbUnavailable(error);
  }
}

export async function shopVendorStates(): Promise<string[]> {
  if (!(await shopDbReady())) return [...DEFAULT_SHOP_VENDOR_STATES];
  await ensureShopCatalog();
  let row: { value: string } | null = null;
  try {
    row = await prisma.systemConfig.findUnique({ where: { key: SHOP_CONFIG.vendorStates } });
  } catch (error) {
    markShopDbUnavailable(error);
    return [...DEFAULT_SHOP_VENDOR_STATES];
  }
  try {
    const parsed = row?.value ? (JSON.parse(row.value) as unknown) : DEFAULT_SHOP_VENDOR_STATES;
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
      return parsed.length ? parsed : [...DEFAULT_SHOP_VENDOR_STATES];
    }
  } catch {
    /* keep defaults */
  }
  return [...DEFAULT_SHOP_VENDOR_STATES];
}

export async function shopSettlementDays() {
  const row = await prisma.systemConfig.findUnique({ where: { key: SHOP_CONFIG.settlementDays } });
  const n = Number(row?.value ?? 7);
  return Number.isFinite(n) && n >= 0 ? Math.min(60, Math.round(n)) : 7;
}

export async function shopMinPayoutKobo() {
  const row = await prisma.systemConfig.findUnique({ where: { key: SHOP_CONFIG.minPayoutKobo } });
  const n = Number(row?.value ?? 500000);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 500000;
}

export async function shopPayoutMode() {
  const row = await prisma.systemConfig.findUnique({ where: { key: SHOP_CONFIG.payoutMode } });
  return row?.value === "automatic" ? "automatic" : "request";
}

export async function shopProductImageMaxBytes() {
  if (!(await shopDbReady())) return SHOP_PRODUCT_IMAGE_BYTES;
  try {
    const row = await prisma.systemConfig.findUnique({ where: { key: SHOP_CONFIG.productImageMaxBytes } });
    return clampShopProductImageBytes(Number(row?.value ?? SHOP_PRODUCT_IMAGE_BYTES));
  } catch (error) {
    markShopDbUnavailable(error);
    return SHOP_PRODUCT_IMAGE_BYTES;
  }
}
