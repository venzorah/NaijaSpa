import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { requireVendor } from "@/lib/vendor-auth";
import { prisma } from "@/lib/db";
import { readServiceRequest, saveService } from "@/lib/service-editor";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireVendor();
    const [services, categories] = await Promise.all([
      prisma.service.findMany({ where: { vendorId: user.vendorId }, include: { category: { select: { name: true } }, _count: { select: { bookings: true } } }, orderBy: { createdAt: "desc" } }),
      prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } })
    ]);
    return NextResponse.json({ services, categories, unlimited: true });
  } catch (error) { return jsonError(error); }
}
export async function POST(request: Request) {
  try {
    const user = await requireVendor();
    const { data, file } = await readServiceRequest(request);
    const service = await saveService(user.vendorId, data, file);
    revalidateTag("home-catalog");
    return NextResponse.json({ service });
  } catch (error) { return jsonError(error); }
}
export async function PATCH(request: Request) {
  try {
    const user = await requireVendor();
    const { data, file } = await readServiceRequest(request);
    const target = z.object({ id: z.string().optional(), location: z.enum(["spa", "hotel", "home"]).optional(), locationEnabled: z.boolean().optional() }).parse(data);
    if (target.location && target.locationEnabled !== undefined) {
      if (file) throw new Error("Select a service for this image.");
      const field = target.location === "spa" ? "spaEnabled" : target.location === "hotel" ? "hotelEnabled" : "homeEnabled";
      await prisma.service.updateMany({ where: { vendorId: user.vendorId }, data: { [field]: target.locationEnabled } });
      revalidateTag("home-catalog"); return NextResponse.json({ ok: true });
    }
    if (!target.id) return NextResponse.json({ error: "Service id required" }, { status: 400 });
    const service = await saveService(user.vendorId, data, file, target.id);
    revalidateTag("home-catalog"); return NextResponse.json({ service });
  } catch (error) { return jsonError(error); }
}
