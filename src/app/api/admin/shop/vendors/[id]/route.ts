import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { vendorDocumentView } from "@/lib/verification-docs";
import { ensureShopCatalog } from "@/lib/shop/ensure";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(["shop.manage", "catalog.manage"]);
    const { id } = await ctx.params;
    await ensureShopCatalog();
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        owner: { select: { email: true, name: true, emailVerifiedAt: true } },
        documents: { select: { id: true, kind: true, status: true } }
      }
    });
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    const [products, categories] = await Promise.all([
      prisma.shopProduct.findMany({
        where: { vendorId: id },
        include: { variants: true, images: { orderBy: { sortOrder: "asc" } }, category: true },
        orderBy: { updatedAt: "desc" }
      }),
      prisma.shopCategory.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } })
    ]);
    return NextResponse.json({
      vendor: {
        id: vendor.id,
        businessName: vendor.businessName,
        shopStatus: vendor.shopStatus,
        applicationStatus: vendor.applicationStatus,
        city: vendor.city,
        state: vendor.state,
        address: vendor.address,
        logoUrl: vendor.logoUrl,
        coverUrl: vendor.coverUrl,
        shopNote: vendor.shopNote,
        owner: vendor.owner,
        documents: vendor.documents.map(vendorDocumentView)
      },
      products,
      categories
    });
  } catch (e) {
    return jsonError(e);
  }
}
