import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { shopSlug } from "@/lib/shop/slug";
import { ensureShopCatalog } from "@/lib/shop/ensure";

export async function GET() {
  try {
    await requireAdmin("shop.manage");
    await ensureShopCatalog();
    const categories = await prisma.shopCategory.findMany({ orderBy: { sortOrder: "asc" } });
    return NextResponse.json({ categories });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin("shop.manage");
    const body = z
      .object({
        id: z.string().optional(),
        name: z.string().min(2).max(80),
        description: z.string().max(240).default(""),
        parentId: z.string().nullable().optional(),
        active: z.boolean().default(true),
        sortOrder: z.number().int().min(0).max(500)
      })
      .parse(await req.json());
    const slug = shopSlug(body.name);
    const row = body.id
      ? await prisma.shopCategory.update({
          where: { id: body.id },
          data: { name: body.name, description: body.description, parentId: body.parentId ?? null, active: body.active, sortOrder: body.sortOrder }
        })
      : await prisma.shopCategory.create({
          data: { slug, name: body.name, description: body.description, parentId: body.parentId ?? null, active: body.active, sortOrder: body.sortOrder }
        });
    return NextResponse.json({ category: row });
  } catch (e) {
    return jsonError(e);
  }
}
