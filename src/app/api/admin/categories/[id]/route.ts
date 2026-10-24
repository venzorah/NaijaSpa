import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin("catalog.manage");
    const { id } = await params;
    const before = await prisma.category.findUniqueOrThrow({ where: { id } });
    const body = z
      .object({
        name: z.string().min(2).optional(),
        slug: z.string().min(2).optional(),
        description: z.string().optional(),
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
      return NextResponse.json({ ok: true });
    }
    const category = await prisma.category.update({
      where: { id },
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description,
        active: body.active,
        sortOrder: body.sortOrder,
        archivedAt: body.active === false ? new Date() : body.active === true ? null : undefined
      }
    });
    await audit({ actorId: actor.id, action: "category.update", entityType: "Category", entityId: id, before, after: category });
    return NextResponse.json({ category });
  } catch (e) {
    return jsonError(e);
  }
}
