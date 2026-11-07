import { requireAdmin } from "@/lib/admin-auth";
import { deleteVendor } from "@/lib/admin-account-actions";
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
    assertPermission(actor, "vendors.manage");
    const { id } = await params;
    const before = await prisma.vendor.findUniqueOrThrow({ where: { id } });
    if (before.applicationStatus === "deleted") return NextResponse.json({error:"Vendor not found"},{status:404});
    const body = z
      .object({
        applicationStatus: z.enum(["draft", "submitted", "under_review", "approved", "rejected", "suspended"]).optional(),
        verificationStatus: z.enum(["unverified", "verified", "rejected"]).optional(),
        visibility: z.enum(["hidden", "public"]).optional(),
        planCode: z.string().min(2).max(40).optional()
      })
      .parse(await req.json());
    if (body.planCode) {
      await grantVendorPlan(id, String(body.planCode), "admin_grant");
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

export async function DELETE(req:Request,{params}:{params:Promise<{id:string}>}) {try{const actor=await requireAdmin("vendors.manage");const body=z.object({reason:z.string().trim().min(5).max(500)}).parse(await req.json());const result=await deleteVendor(actor,(await params).id,body.reason);revalidateTag("home-catalog");revalidateTag("home-hero");return NextResponse.json(result);}catch(e){return jsonError(e);}}
