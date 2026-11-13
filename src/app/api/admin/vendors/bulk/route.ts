import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { jsonError } from "@/lib/http";
import { VENDOR_BULK_ACTIONS, vendorBulkData, vendorBulkLabel } from "@/lib/admin-vendor-bulk";

export async function POST(req: Request) {
  try {
    const actor = await requireAdmin("vendors.manage");
    const body = z
      .object({
        ids: z.array(z.string().min(8).max(40)).min(1).max(100),
        action: z.enum(VENDOR_BULK_ACTIONS),
        reason: z.string().trim().min(5).max(500).optional()
      })
      .refine((value) => value.action !== "suspend" || Boolean(value.reason), "Add a reason to suspend vendors")
      .parse(await req.json());
    const ids = [...new Set(body.ids)];
    const result = await prisma.vendor.updateMany({
      where: {
        id: { in: ids },
        applicationStatus: body.action === "publish" ? "approved" : { not: "deleted" }
      },
      data: vendorBulkData(body.action)
    });
    await audit({
      actorId: actor.id,
      action: `vendor.bulk.${body.action}`,
      entityType: "Vendor",
      entityId: "bulk",
      after: { ids, count: result.count, reason: body.reason }
    });
    revalidateTag("home-catalog");
    return NextResponse.json({ ok: true, count: result.count, message: vendorBulkLabel(body.action, result.count) });
  } catch (e) {
    return jsonError(e);
  }
}
