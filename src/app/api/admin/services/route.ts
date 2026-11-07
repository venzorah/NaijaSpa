import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { readServiceRequest, saveService } from "@/lib/service-editor";
import { jsonError } from "@/lib/http";
export async function POST(request: Request) {
  try {
    const actor = await requireAdmin("catalog.manage");
    const { data, file } = await readServiceRequest(request);
    const { vendorId } = z.object({ vendorId: z.string().min(1) }).parse(data);
    if (!await prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } })) return NextResponse.json({ error: "Business not found" }, { status: 404 });
    const service = await saveService(vendorId, { ...(data as object), active: (data as { active?: boolean }).active ?? false }, file);
    await audit({ actorId: actor.id, action: "service.create", entityType: "Service", entityId: service.id, after: service });
    revalidateTag("home-catalog"); return NextResponse.json({ service });
  } catch (error) { return jsonError(error); }
}
