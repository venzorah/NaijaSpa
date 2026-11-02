import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireUser } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { assertAnyPermission, hasPermission } from "@/lib/rbac";
import { revalidateTag } from "next/cache";
import { publicContentUrl } from "@/lib/public-content";
import { getHeroAdDisplayLimit, getHomeHeroPayload, prisma, setConfig } from "@/lib/db";
import { audit } from "@/lib/audit";
import { jsonError } from "@/lib/http";
import {
  clampHeroAdDisplayLimit,
  DEFAULT_HERO_AD_DISPLAY_LIMIT,
  DEFAULT_HOME_HERO,
  HERO_AD_LIMIT_KEY,
  HERO_AD_LIMIT_MAX,
  HERO_AD_LIMIT_MIN,
  sanitizeHeroBanner
} from "@/lib/home-hero";

export async function GET() {
  try {
    const user = requireUser(await getSession());
    assertAnyPermission(user, ["cms.manage", "campaigns.manage"]);
    const [hero, ads, displayLimit, vendors] = await Promise.all([
      prisma.homeHero.findUnique({ where: { id: "home" } }),
      prisma.heroAd.findMany({
        include: { vendor: { select: { id: true, businessName: true, slug: true } } },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
      }),
      getHeroAdDisplayLimit(),
      prisma.vendor.findMany({
        where: { applicationStatus: "approved" },
        select: { id: true, businessName: true, slug: true },
        orderBy: { businessName: "asc" },
        take: 200
      })
    ]);
    return NextResponse.json({
      canEditBanner: hasPermission(user, "cms.manage"),
      banner: sanitizeHeroBanner(hero ?? DEFAULT_HOME_HERO),
      ads,
      displayLimit,
      vendors
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PUT(req: Request) {
  try {
    const user = requireUser(await getSession());
    assertPermission(user, "cms.manage");
    const before = await getHomeHeroPayload();
    const body = z
      .object({
        kicker: z.string().min(1).max(80).optional(),
        title: z.string().min(1).max(120).optional(),
        subtitle: z.string().max(240).optional(),
        priceLine: z.string().max(80).optional(),
        ctaLabel: z.string().min(1).max(40).optional(),
        ctaHref: publicContentUrl.optional(),
        imageUrl: publicContentUrl.optional(),
        displayLimit: z.number().int().min(HERO_AD_LIMIT_MIN).max(HERO_AD_LIMIT_MAX).optional()
      })
      .parse(await req.json());
    const current = await prisma.homeHero.findUnique({ where: { id: "home" } });
    const next = sanitizeHeroBanner({
      ...(current ?? DEFAULT_HOME_HERO),
      ...body
    });
    await prisma.homeHero.upsert({
      where: { id: "home" },
      create: { id: "home", ...next },
      update: next
    });
    if (body.displayLimit != null) {
      await setConfig(
        HERO_AD_LIMIT_KEY,
        String(clampHeroAdDisplayLimit(body.displayLimit, DEFAULT_HERO_AD_DISPLAY_LIMIT))
      );
    }
    revalidateTag("home-hero");
    revalidateTag("home-catalog");
    const after = await getHomeHeroPayload();
    await audit({
      actorId: user.id,
      action: "homeHero.update",
      entityType: "HomeHero",
      entityId: "home",
      before,
      after
    });
    return NextResponse.json(after);
  } catch (e) {
    return jsonError(e);
  }
}
