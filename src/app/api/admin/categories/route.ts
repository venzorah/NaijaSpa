import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: Request) {
  try {
    const actor = await requireAdmin("catalog.manage");
    const body = z
      .object({
        name: z.string().min(2).max(80),
        slug: z.string().min(2).max(80).optional(),
        description: z.string().max(2000).optional(),
        metaTitle: z.string().max(80).optional(),
        metaDescription: z.string().max(320).optional(),
        synonyms: z.string().max(400).optional()
      })
      .parse(await req.json());
    const slug = slugify(body.slug || body.name);
    if (!slug) throw Object.assign(new Error("Enter a valid slug"), { status: 400 });
    const last = await prisma.category.aggregate({ _max: { sortOrder: true } });
    const category = await prisma.category.create({
      data: {
        name: body.name.trim(),
        slug,
        description: body.description ?? "",
        metaTitle: body.metaTitle ?? "",
        metaDescription: body.metaDescription ?? "",
        synonyms: body.synonyms ?? "",
        sortOrder: (last._max.sortOrder ?? 0) + 1,
        active: false
      }
    });
    await audit({ actorId: actor.id, action: "category.create", entityType: "Category", entityId: category.id, after: category });
    revalidateTag("home-catalog");
    return NextResponse.json({ category });
  } catch (e) {
    return jsonError(e);
  }
}
