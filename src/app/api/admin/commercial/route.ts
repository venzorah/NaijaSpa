import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireUser } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { getCommercialConfig, getGalleryConfig, getHomeFeedConfig, setConfig, prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { jsonError } from "@/lib/http";
import { clampInt, DEFAULT_GALLERY_CONFIG } from "@/lib/galleries";
import {
  DEFAULT_HOME_FEED_CONFIG,
  HOME_FEED_CONFIG_KEYS,
  HOME_FEED_LIMIT_MAX,
  HOME_FEED_LIMIT_MIN
} from "@/lib/home-types";
import { MARKETPLACE_HUBS_KEY, extraHubFromState, parseMarketplaceHubs } from "@/lib/hubs";

export async function GET() {
  try {
    const user = requireUser(await getSession());
    assertPermission(user.role, "finance.view");
    const [config, galleryConfig, homeFeedConfig, plans, hubsRow] = await Promise.all([
      getCommercialConfig(),
      getGalleryConfig(),
      getHomeFeedConfig(),
      prisma.subscriptionPlan.findMany(),
      prisma.systemConfig.findUnique({ where: { key: MARKETPLACE_HUBS_KEY } })
    ]);
    return NextResponse.json({
      config,
      galleryConfig,
      homeFeedConfig,
      plans,
      hubs: parseMarketplaceHubs(hubsRow?.value)
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PUT(req: Request) {
  try {
    const user = requireUser(await getSession());
    assertPermission(user.role, "commercial.manage");
    const before = await getCommercialConfig();
    const body = z
      .object({
        spaSurchargeKobo: z.number().int().nonnegative().optional(),
        hotelSurchargeKobo: z.number().int().nonnegative().optional(),
        homeSurchargeKobo: z.number().int().nonnegative().optional(),
        surchargeRecipient: z.enum(["vendor", "platform", "split"]).optional(),
        freeCommissionBps: z.number().int().min(0).max(10000).optional(),
        paidCommissionBps: z.number().int().min(0).max(10000).optional(),
        graceDays: z.number().int().min(0).optional(),
        galleryMaxImagesPerGallery: z.number().int().min(1).max(30).optional(),
        galleryMaxImageBytes: z.number().int().min(50_000).max(10 * 1024 * 1024).optional(),
        homeFeedFeaturedLimit: z.number().int().min(HOME_FEED_LIMIT_MIN).max(HOME_FEED_LIMIT_MAX).optional(),
        homeFeedPremiumLimit: z.number().int().min(HOME_FEED_LIMIT_MIN).max(HOME_FEED_LIMIT_MAX).optional(),
        homeFeedPromoLimit: z.number().int().min(HOME_FEED_LIMIT_MIN).max(HOME_FEED_LIMIT_MAX).optional(),
        homeFeedNearbyLimit: z.number().int().min(HOME_FEED_LIMIT_MIN).max(HOME_FEED_LIMIT_MAX).optional(),
        plans: z
          .array(z.object({ code: z.string(), priceKobo: z.number().int().nonnegative() }))
          .optional(),
        extraStates: z.array(z.string()).optional()
      })
      .parse(await req.json());
    for (const key of ["spaSurchargeKobo", "hotelSurchargeKobo", "homeSurchargeKobo", "surchargeRecipient", "freeCommissionBps", "paidCommissionBps", "graceDays"] as const) {
      if (body[key] != null) await setConfig(key, String(body[key]));
    }
    if (body.galleryMaxImagesPerGallery != null) {
      await setConfig(
        "galleryMaxImagesPerGallery",
        String(clampInt(body.galleryMaxImagesPerGallery, 1, 30, DEFAULT_GALLERY_CONFIG.maxImagesPerGallery))
      );
    }
    if (body.galleryMaxImageBytes != null) {
      await setConfig(
        "galleryMaxImageBytes",
        String(clampInt(body.galleryMaxImageBytes, 50_000, 10 * 1024 * 1024, DEFAULT_GALLERY_CONFIG.maxImageBytes))
      );
    }
    const homeFeedPuts: Array<[keyof typeof HOME_FEED_CONFIG_KEYS, number | undefined]> = [
      ["featured", body.homeFeedFeaturedLimit],
      ["premium", body.homeFeedPremiumLimit],
      ["promo", body.homeFeedPromoLimit],
      ["nearby", body.homeFeedNearbyLimit]
    ];
    for (const [rail, value] of homeFeedPuts) {
      if (value == null) continue;
      await setConfig(
        HOME_FEED_CONFIG_KEYS[rail],
        String(clampInt(value, HOME_FEED_LIMIT_MIN, HOME_FEED_LIMIT_MAX, DEFAULT_HOME_FEED_CONFIG[rail]))
      );
    }
    if (body.extraStates) {
      const extras = body.extraStates.map((s) => extraHubFromState(s)).filter((h): h is NonNullable<typeof h> => Boolean(h));
      const unique = extras.filter((h, i) => extras.findIndex((x) => x.state === h.state) === i);
      await setConfig(MARKETPLACE_HUBS_KEY, JSON.stringify(unique.map((h) => ({ id: h.id, label: h.label, state: h.state, city: h.city }))));
    }
    if (body.plans) {
      for (const p of body.plans) {
        if (p.code === "FREE" && p.priceKobo !== 0) continue;
        await prisma.subscriptionPlan.update({ where: { code: p.code }, data: { priceKobo: p.priceKobo } });
      }
    }
    const [after, galleryConfig, homeFeedConfig] = await Promise.all([
      getCommercialConfig(),
      getGalleryConfig(),
      getHomeFeedConfig()
    ]);
    await audit({
      actorId: user.id,
      action: "commercial.update",
      entityType: "SystemConfig",
      entityId: "commercial",
      before,
      after: { ...after, ...galleryConfig, ...homeFeedConfig }
    });
    return NextResponse.json({ config: after, galleryConfig, homeFeedConfig });
  } catch (e) {
    return jsonError(e);
  }
}
