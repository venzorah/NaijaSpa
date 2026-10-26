import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { getSession, requireUser } from "@/lib/auth";
import { assertPermission } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { jsonError } from "@/lib/http";
import { grantVendorPlan } from "@/lib/subscription-lifecycle";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = requireUser(await getSession());
    assertPermission(actor.role, "vendors.manage");
    const { id } = await params;
    const before = await prisma.vendor.findUniqueOrThrow({ where: { id } });
    const body = z
      .object({
        applicationStatus: z.enum(["draft", "submitted", "under_review", "approved", "rejected", "suspended"]).optional(),
        verificationStatus: z.enum(["unverified", "verified", "rejected"]).optional(),
        visibility: z.enum(["hidden", "public"]).optional(),
        planCode: z.string().min(2).max(40).optional()
      })
      .parse(await req.json());
    if (body.planCode) {
      await grantVendorPlan(id, body.planCode.toUpperCase(), "admin_grant");
    }
    const vendor = await prisma.vendor.update({
      where: { id },
      data: {
        applicationStatus: body.applicationStatus,
        verificationStatus: body.verificationStatus,
        visibility: body.visibility
      }
    });
    await audit({ actorId: actor.id, action: "vendor.update", entityType: "Vendor", entityId: id, before, after: vendor });
    revalidateTag("home-catalog");
    return NextResponse.json({ vendor });
  } catch (e) {
    return jsonError(e);
  }
}
