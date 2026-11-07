import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { readServiceRequest, saveService } from "@/lib/service-editor";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin("catalog.manage");
    const { id } = await params;
    const before = await prisma.service.findUniqueOrThrow({ where: { id } });
    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      const { data, file } = await readServiceRequest(req);
      const service = await saveService(before.vendorId, data, file, id);
      await audit({ actorId: actor.id, action: "service.edit", entityType: "Service", entityId: id, before, after: service });
      revalidateTag("home-catalog");
      return NextResponse.json({ service });
    }
    const body = z
      .object({
        active: z.boolean(),
        note: z.string().optional()
      })
      .parse(await req.json());
    const service = await prisma.service.update({
      where: { id },
      data: {
        active: body.active,
        cancellationRules: body.note ? `${before.cancellationRules}\n[moderation ${new Date().toISOString()}] ${body.note}`.trim() : undefined
      }
    });
    await audit({
      actorId: actor.id,
      action: body.active ? "service.approve" : "service.hide",
      entityType: "Service",
      entityId: id,
      before,
      after: { ...service, note: body.note }
    });
    revalidateTag("home-catalog");
    return NextResponse.json({ service });
  } catch (e) {
    return jsonError(e);
  }
}
