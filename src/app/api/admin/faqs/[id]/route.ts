import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin("cms.manage");
    const { id } = await params;
    const before = await prisma.faq.findUniqueOrThrow({ where: { id } });
    const body = z
      .object({
        question: z.string().optional(),
        answer: z.string().optional(),
        published: z.boolean().optional(),
        sortOrder: z.number().int().optional()
      })
      .parse(await req.json());
    const faq = await prisma.faq.update({ where: { id }, data: body });
    await audit({ actorId: actor.id, action: "faq.update", entityType: "Faq", entityId: id, before, after: faq });
    return NextResponse.json({ faq });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin("cms.manage");
    const { id } = await params;
    await prisma.faq.delete({ where: { id } });
    await audit({ actorId: actor.id, action: "faq.delete", entityType: "Faq", entityId: id });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
