import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession, requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const user = requireUser(await getSession());
    const body = z.object({ productId: z.string(), rating: z.number().int().min(1).max(5), body: z.string().max(1000).default("") }).parse(await req.json());
    const bought = await prisma.shopOrderItem.findFirst({
      where: { productId: body.productId, vendorOrder: { master: { userId: user.id, status: "paid" } } }
    });
    if (!bought) return NextResponse.json({ error: "Reviews are for products you bought." }, { status: 403 });
    const review = await prisma.shopReview.upsert({
      where: { productId_userId: { productId: body.productId, userId: user.id } },
      create: { productId: body.productId, userId: user.id, rating: body.rating, body: body.body },
      update: { rating: body.rating, body: body.body }
    });
    const agg = await prisma.shopReview.aggregate({ where: { productId: body.productId, status: "published" }, _avg: { rating: true }, _count: true });
    await prisma.shopProduct.update({
      where: { id: body.productId },
      data: { ratingAvg: agg._avg.rating ?? 0, reviewCount: agg._count }
    });
    return NextResponse.json({ review });
  } catch (e) {
    return jsonError(e);
  }
}
