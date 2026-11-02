import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { randomUUID } from "node:crypto";
import { formImage } from "@/lib/form-file";
import { saveCategoryImageFile, deleteCategoryImageFile } from "@/lib/category-media";
import { publicContentUrl } from "@/lib/public-content";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: Request) {
  try {
    const actor = await requireAdmin("catalog.manage");
    const form = req.headers.get("content-type")?.includes("multipart/form-data") ? await req.formData() : null;
    const input = form ? Object.fromEntries([...form.entries()].filter(([key]) => key !== "file" && !(key === "slug" && !form.get(key)))) : await req.json();
    const body = z
      .object({
        name: z.string().trim().min(2).max(80),
        slug: z.string().min(2).max(80).optional(),
        description: z.string().max(2000).optional(),
        metaTitle: z.string().max(80).optional(),
        metaDescription: z.string().max(320).optional(),
        synonyms: z.string().max(400).optional(),
        imageUrl: z.union([publicContentUrl, z.literal("")]).optional()
      })
      .parse(input);
    const slug = slugify(body.slug || body.name);
    if (!slug) throw Object.assign(new Error("Enter a valid slug"), { status: 400 });
    const last = await prisma.category.aggregate({ _max: { sortOrder: true } });
    const file = form ? formImage(form) : null;
    if (file && file.size > 2 * 1024 * 1024) return NextResponse.json({ error: "Each category image must be at most 2 MB" }, { status: 400 });
    const bytes = file ? new Uint8Array(await file.arrayBuffer()) : null;
    const saved = bytes ? await saveCategoryImageFile(randomUUID(), bytes) : null;
    const category = await prisma.category.create({
      data: {
        name: body.name.trim(),
        slug,
        description: body.description ?? "",
        metaTitle: body.metaTitle ?? "",
        metaDescription: body.metaDescription ?? "",
        synonyms: body.synonyms ?? "",
        imageUrl: saved?.url ?? (body.imageUrl || null),
        imagePayload: bytes && saved?.storage !== "r2" ? Buffer.from(bytes) : null,
        imageMime: saved?.mime ?? "",
        sortOrder: (last._max.sortOrder ?? 0) + 1,
        active: false
      }
    }).catch(async (error) => {
      if (saved) await deleteCategoryImageFile(saved.url).catch(() => console.error("Could not clean up category upload"));
      throw error;
    });
    const publicCategory = { ...category, imagePayload: undefined };
    await audit({ actorId: actor.id, action: "category.create", entityType: "Category", entityId: category.id, after: publicCategory });
    revalidateTag("home-catalog");
    return NextResponse.json({ category: publicCategory });
  } catch (e) {
    if (typeof e === "object" && e && "code" in e && e.code === "P2002") {
      return NextResponse.json({ error: "This category slug is already in use. Choose another." }, { status: 409 });
    }
    return jsonError(e);
  }
}
