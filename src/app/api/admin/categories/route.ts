import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function POST(req: Request) {
  try {
    const actor = await requireAdmin("catalog.manage");
    const body = z
      .object({
        name: z.string().min(2),
        slug: z.string().min(2).optional(),
        description: z.string().optional()
      })
      .parse(await req.json());
    const slug = (body.slug || body.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const last = await prisma.category.aggregate({ _max: { sortOrder: true } });
    const category = await prisma.category.create({
      data: {
        name: body.name,
        slug,
        description: body.description ?? "",
        sortOrder: (last._max.sortOrder ?? 0) + 1,
        active: false
      }
    });
    await audit({ actorId: actor.id, action: "category.create", entityType: "Category", entityId: category.id, after: category });
    return NextResponse.json({ category });
  } catch (e) {
    return jsonError(e);
  }
}
