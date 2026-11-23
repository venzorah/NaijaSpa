import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { setConfig } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { publicContentUrl } from "@/lib/public-content";
import { SHOP_CONFIG } from "@/lib/shop/constants";
import { DEFAULT_SHOP_HERO, getShopHeroSlides, parseShopHero, sanitizeShopHeroSlide } from "@/lib/shop/hero";

const slideSchema = z.object({
  kicker: z.string().min(1).max(80),
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(280),
  imageUrl: publicContentUrl,
  primaryLabel: z.string().min(1).max(40),
  primaryHref: publicContentUrl,
  secondaryLabel: z.string().min(1).max(40),
  secondaryHref: publicContentUrl
});

export async function GET() {
  try {
    await requireAdmin("shop.manage");
    return NextResponse.json({ slides: await getShopHeroSlides() });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin("shop.manage");
    const body = z.object({ slides: z.array(slideSchema).length(3) }).parse(await req.json());
    const slides = DEFAULT_SHOP_HERO.map((_, index) => sanitizeShopHeroSlide(body.slides[index], index));
    await setConfig(SHOP_CONFIG.hero, JSON.stringify(slides));
    revalidatePath("/shop");
    revalidatePath("/shop/page");
    return NextResponse.json({ slides: parseShopHero(JSON.stringify(slides)) });
  } catch (e) {
    return jsonError(e);
  }
}
