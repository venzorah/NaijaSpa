import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formImage } from "@/lib/form-file";
import { jsonError } from "@/lib/http";
import { requireVendor } from "@/lib/vendor-auth";
import { canDraftShopProducts } from "@/lib/shop/onboarding";
import { saveShopProductPhoto } from "@/lib/shop/save-product-photo";

export async function POST(req: Request) {
  try {
    const user = await requireVendor();
    const vendor = await prisma.vendor.findUnique({ where: { id: user.vendorId }, select: { shopStatus: true } });
    if (!canDraftShopProducts(vendor?.shopStatus)) {
      return NextResponse.json({ error: "Finish store setup first, then upload product photos." }, { status: 403 });
    }
    const file = formImage(await req.formData());
    if (!file) return NextResponse.json({ error: "Choose an image file." }, { status: 400 });
    const saved = await saveShopProductPhoto(user.vendorId, user.id, file);
    return NextResponse.json(saved);
  } catch (e) {
    return jsonError(e);
  }
}
