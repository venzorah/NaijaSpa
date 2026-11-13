import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { listVendorHits, vendorHitTotals } from "@/lib/listing-view-store";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(["vendors.manage", "vendors.verify", "analytics.view"]);
    const { id } = await params;
    const vendor = await prisma.vendor.findFirst({
      where: { id, applicationStatus: { not: "deleted" } },
      select: { id: true, slug: true }
    });
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    const [hits, totals] = await Promise.all([listVendorHits(vendor.id), vendorHitTotals(vendor.id)]);
    return NextResponse.json({
      slug: vendor.slug,
      totals,
      hits: hits.map((hit) => ({
        ...hit,
        createdAt: hit.createdAt instanceof Date ? hit.createdAt.toISOString() : String(hit.createdAt)
      }))
    });
  } catch (e) {
    return jsonError(e);
  }
}
