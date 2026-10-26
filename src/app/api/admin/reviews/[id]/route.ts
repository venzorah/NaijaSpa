import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { refreshVendorRating } from "@/lib/reviews";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin("support.manage");
    const { id } = await params;
    const before = await prisma.review.findUniqueOrThrow({ where: { id } });
    const body = z.object({ status: z.enum(["published", "hidden", "flagged"]) }).parse(await req.json());
    const review = await prisma.review.update({ where: { id }, data: { status: body.status } });
    await refreshVendorRating(review.vendorId);
    await audit({ actorId: actor.id, action: "review.moderate", entityType: "Review", entityId: id, before, after: review });
    return NextResponse.json({ review });
  } catch (e) {
    return jsonError(e);
  }
}
