import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { jsonError } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const actor = await requireAdmin(["catalog.manage", "vendors.manage"]);
    const body = z
      .object({
        ids: z.array(z.string().min(8).max(40)).min(1).max(100),
        action: z.enum(["approve", "hide"]),
        reason: z.string().trim().min(5).max(500).optional()
      })
      .refine((value) => value.action !== "hide" || Boolean(value.reason), "Add a reason to hide services")
      .parse(await req.json());
    const ids = [...new Set(body.ids)];
    const result = await prisma.service.updateMany({
      where: { id: { in: ids }, deletedAt: null },
      data: { active: body.action === "approve" }
    });
    await audit({
      actorId: actor.id,
      action: body.action === "approve" ? "service.bulk.approve" : "service.bulk.hide",
      entityType: "Service",
      entityId: "bulk",
      after: { ids, count: result.count, reason: body.reason }
    });
    revalidateTag("home-catalog");
    const label = body.action === "approve" ? "Approved" : "Hid";
    return NextResponse.json({
      ok: true,
      count: result.count,
      message: `${label} ${result.count} service${result.count === 1 ? "" : "s"}.`
    });
  } catch (e) {
    return jsonError(e);
  }
}
