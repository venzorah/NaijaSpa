import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
export async function GET(request: Request) {
  try {
    await requireAdmin(["catalog.manage", "vendors.manage"]);
    const vendorId = new URL(request.url).searchParams.get("vendorId") || "";
    const galleries = await prisma.therapistGallery.findMany({ where: { vendorId }, select: { id: true, title: true, images: { select: { id: true, url: true, caption: true }, orderBy: { sortOrder: "asc" } } }, orderBy: { sortOrder: "asc" } });
    return NextResponse.json({ galleries });
  } catch (error) { return jsonError(error); }
}
