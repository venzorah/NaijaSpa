import { randomUUID } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { deleteCategoryImageFile, saveCategoryImageFile } from "@/lib/category-media";
import { prisma } from "@/lib/db";
import { categoryAuditSelect } from "@/lib/category-fields";
import { formImage } from "@/lib/form-file";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin("catalog.manage");
    const { id } = await params;
    const before = await prisma.category.findUniqueOrThrow({ where: { id }, select: categoryAuditSelect });
    const fd = await req.formData();
    const file = formImage(fd);
    if (!file) return NextResponse.json({ error: "Choose an image file" }, { status: 400 });
    const buf = new Uint8Array(await file.arrayBuffer());
    const saved = await saveCategoryImageFile(`${id}-${randomUUID()}`, buf);
    await deleteCategoryImageFile(before.imageUrl);
    const payload = { imageUrl: saved.url, imagePayload: Buffer.from(buf), imageMime: saved.mime };
    const category = await prisma.category
      .update({
        where: { id },
        data: payload,
        select: categoryAuditSelect
      })
      .catch(() =>
        prisma.category.update({
          where: { id },
          data: { imageUrl: saved.url },
          select: categoryAuditSelect
        })
      );
    await audit({
      actorId: actor.id,
      action: "category.image",
      entityType: "Category",
      entityId: id,
      before,
      after: category
    });
    revalidateTag("home-catalog");
    return NextResponse.json({ category });
  } catch (e) {
    return jsonError(e);
  }
}
