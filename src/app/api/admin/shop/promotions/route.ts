import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    await requireAdmin("shop.manage");
    const promotions = await prisma.shopPromotion.findMany({ orderBy: { startsAt: "desc" }, take: 100 });
    return NextResponse.json({ promotions });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin("shop.manage");
    const body = z
      .object({
        kind: z.enum(["featured_product", "sponsored_product", "featured_vendor"]),
        label: z.string().min(2).max(80),
        productId: z.string().optional(),
        vendorId: z.string().optional(),
        startsAt: z.string(),
        endsAt: z.string(),
        active: z.boolean().default(true)
      })
      .parse(await req.json());
    const promotion = await prisma.shopPromotion.create({
      data: {
        kind: body.kind,
        label: body.label,
        productId: body.productId,
        vendorId: body.vendorId,
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt),
        active: body.active
      }
    });
    if (body.productId && body.kind.includes("product")) {
      await prisma.shopProduct.update({
        where: { id: body.productId },
        data: { featured: body.kind === "featured_product", sponsoredUntil: body.kind === "sponsored_product" ? new Date(body.endsAt) : undefined }
      });
    }
    return NextResponse.json({ promotion });
  } catch (e) {
    return jsonError(e);
  }
}
