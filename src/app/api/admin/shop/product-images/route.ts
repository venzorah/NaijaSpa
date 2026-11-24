import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formImage } from "@/lib/form-file";
import { jsonError } from "@/lib/http";
import { requireAdmin } from "@/lib/admin-auth";
import { saveShopProductPhoto } from "@/lib/shop/save-product-photo";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin("shop.manage");
    const fd = await req.formData();
    const vendorId = String(fd.get("vendorId") || "");
    if (!vendorId) return NextResponse.json({ error: "Choose a vendor." }, { status: 400 });
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } });
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    const file = formImage(fd);
    if (!file) return NextResponse.json({ error: "Choose an image file." }, { status: 400 });
    const saved = await saveShopProductPhoto(vendorId, admin.id, file);
    return NextResponse.json(saved);
  } catch (e) {
    return jsonError(e);
  }
}
