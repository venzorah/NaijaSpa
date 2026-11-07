import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { requireVendor } from "@/lib/vendor-auth";
import { jsonError } from "@/lib/http";
export async function PATCH(req: Request) { try {
    const user = await requireVendor();
    const body = z.object({ imageId: z.string().min(1), target: z.enum(['cover', 'logo']) }).parse(await req.json());
    const image = await prisma.therapistGalleryImage.findFirst({ where: { id: body.imageId, gallery: { vendorId: user.vendorId } }, select: { url: true } });
    if (!image)
        return NextResponse.json({ error: 'Choose an image from your own galleries.' }, { status: 404 });
    await prisma.vendor.update({ where: { id: user.vendorId }, data: body.target === 'cover' ? { coverUrl: image.url } : { logoUrl: image.url } });
    revalidateTag('home-catalog');
    return NextResponse.json({ ok: true });
}
catch (e) {
    return jsonError(e);
} }
