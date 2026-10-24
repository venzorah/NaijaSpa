import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function PATCH(req: Request) {
  try {
    const actor = await requireAdmin("cms.manage");
    const body = z
      .object({
        id: z.string(),
        title: z.string().optional(),
        body: z.string().optional(),
        published: z.boolean().optional()
      })
      .parse(await req.json());
    const before = await prisma.cmsBlock.findUniqueOrThrow({ where: { id: body.id } });
    const block = await prisma.cmsBlock.update({
      where: { id: body.id },
      data: { title: body.title, body: body.body, published: body.published }
    });
    await audit({ actorId: actor.id, action: "cms.update", entityType: "CmsBlock", entityId: body.id, before, after: block });
    return NextResponse.json({ block });
  } catch (e) {
    return jsonError(e);
  }
}
