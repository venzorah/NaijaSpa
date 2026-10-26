import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { assertImageUrl } from "@/lib/galleries";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin("catalog.manage");
    const { id } = await params;
    const before = await prisma.category.findUniqueOrThrow({ where: { id }, omit: { imagePayload: true } });
    const body = z
      .object({
        name: z.string().min(2).max(80).optional(),
        slug: z.string().min(2).max(80).optional(),
        description: z.string().max(2000).optional(),
        metaTitle: z.string().max(80).optional(),
        metaDescription: z.string().max(320).optional(),
        synonyms: z.string().max(400).optional(),
        imageUrl: z.string().max(500).nullable().optional(),
        active: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
        order: z.array(z.string()).optional()
      })
      .parse(await req.json());
    if (body.order) {
      await prisma.$transaction(
        body.order.map((cid, i) => prisma.category.update({ where: { id: cid }, data: { sortOrder: i } }))
      );
      await audit({ actorId: actor.id, action: "category.reorder", entityType: "Category", entityId: "all", after: { order: body.order } });
      revalidateTag("home-catalog");
      return NextResponse.json({ ok: true });
    }
    const slug = body.slug ? slugify(body.slug) : undefined;
    if (body.slug && !slug) throw Object.assign(new Error("Enter a valid slug"), { status: 400 });
    const imageUrl =
      body.imageUrl === undefined ? undefined : body.imageUrl === null || body.imageUrl === "" ? null : assertImageUrl(body.imageUrl);
    const clearUpload = imageUrl !== undefined && imageUrl !== before.imageUrl;
    const category = await prisma.category.update({
      where: { id },
      data: {
        name: body.name?.trim(),
        slug,
        description: body.description,
        metaTitle: body.metaTitle,
        metaDescription: body.metaDescription,
        synonyms: body.synonyms,
        imageUrl,
        ...(clearUpload ? { imagePayload: null, imageMime: "" } : {}),
        active: body.active,
        sortOrder: body.sortOrder,
        archivedAt: body.active === false ? new Date() : body.active === true ? null : undefined
      },
      omit: { imagePayload: true }
    });
    await audit({ actorId: actor.id, action: "category.update", entityType: "Category", entityId: id, before, after: category });
    revalidateTag("home-catalog");
    return NextResponse.json({ category });
  } catch (e) {
    return jsonError(e);
  }
}
