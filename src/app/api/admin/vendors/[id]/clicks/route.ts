import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { recordAdminVendorClick } from "@/lib/listing-view-store";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin(["vendors.manage", "vendors.verify"]);
    const { id } = await params;
    const vendor = await prisma.vendor.findFirst({
      where: { id, applicationStatus: { not: "deleted" } },
      select: { id: true }
    });
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    const clickId = await recordAdminVendorClick(vendor.id, actor.id);
    return NextResponse.json({ ok: true, clickId });
  } catch (e) {
    return jsonError(e);
  }
}
