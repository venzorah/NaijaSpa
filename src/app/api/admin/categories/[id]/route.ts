import { deleteCatalogEntry } from "@/lib/admin-catalog-delete";
import { requireAdmin as requireCatalogAdmin } from "@/lib/admin-auth";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { assertImageUrl } from "@/lib/galleries";
import { prisma } from "@/lib/db";
import { categoryAuditSelect } from "@/lib/category-fields";
import { jsonError } from "@/lib/http";
import { randomUUID } from "node:crypto";
import { formImage } from "@/lib/form-file";
import { saveCategoryImageFile, deleteCategoryImageFile } from "@/lib/category-media";

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
    const before = await prisma.category.findUniqueOrThrow({ where: { id }, select: categoryAuditSelect });
    if(before.deletedAt) return NextResponse.json({error:"Category not found"},{status:404});
    const form = req.headers.get("content-type")?.includes("multipart/form-data") ? await req.formData() : null;
    const input = form ? { ...Object.fromEntries([...form.entries()].filter(([key]) => key !== "file")), ...(form.has("active") ? { active: form.get("active") === "true" } : {}) } : await req.json();
    const body = z
      .object({
        name: z.string().trim().min(2).max(80).optional(),
        slug: z.string().min(2).max(80).optional(),
        description: z.string().max(2000).optional(),
        metaTitle: z.string().max(80).optional(),
        metaDescription: z.string().max(320).optional(),
        synonyms: z.string().max(400).optional(),
        imageUrl: z.string().max(500).nullable().optional(),
        active: z.boolean().optional(),
        sortOrder: z.number().int().optional(),
        order: z.array(z.string().min(1).max(64)).max(200).optional()
      })
      .parse(input);
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
    const file = form ? formImage(form) : null;
    if (file && file.size > 2 * 1024 * 1024) return NextResponse.json({ error: "Each category image must be at most 2 MB" }, { status: 400 });
    const bytes = file ? new Uint8Array(await file.arrayBuffer()) : null;
    const saved = bytes ? await saveCategoryImageFile(`${id}-${randomUUID()}`, bytes) : null;
    const changedImageUrl = imageUrl !== undefined && imageUrl !== before.imageUrl;
    const category = await prisma.category.update({
      where: { id },
      data: {
        name: body.name?.trim(),
        slug,
        description: body.description,
        metaTitle: body.metaTitle,
        metaDescription: body.metaDescription,
        synonyms: body.synonyms,
        imageUrl: saved?.url ?? imageUrl,
        imagePayload: saved ? saved.storage === "r2" ? null : Buffer.from(bytes!) : changedImageUrl ? null : undefined,
        imageMime: saved?.mime ?? (changedImageUrl ? "" : undefined),
        active: body.active,
        sortOrder: body.sortOrder,
        archivedAt: body.active === false ? new Date() : body.active === true ? null : undefined
      },
      select: categoryAuditSelect
    }).catch(async error => {
      if (saved) await deleteCategoryImageFile(saved.url).catch(() => console.error("Could not clean up category upload"));
      throw error;
    });
    if (before.imageUrl && before.imageUrl !== category.imageUrl) await deleteCategoryImageFile(before.imageUrl).catch(() => console.error("Could not remove previous category image"));
    await audit({ actorId: actor.id, action: "category.update", entityType: "Category", entityId: id, before, after: category });
    revalidateTag("home-catalog");
    return NextResponse.json({ category });
  } catch (e) {
    if (typeof e === "object" && e && "code" in e && e.code === "P2002") {
      return NextResponse.json({ error: "This category slug is already in use. Choose another." }, { status: 409 });
    }
    return jsonError(e);
  }
}

export async function DELETE(req:Request,{params}:{params:Promise<{id:string}>}){try{const actor=await requireCatalogAdmin("catalog.manage");const body=z.object({reason:z.string().trim().min(5).max(500)}).parse(await req.json());const result=await deleteCatalogEntry(actor.id,(await params).id,"category",body.reason);revalidateTag("home-catalog");return NextResponse.json(result);}catch(e){return jsonError(e);}}
