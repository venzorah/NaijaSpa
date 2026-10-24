import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVendor } from "@/lib/vendor-auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireVendor();
    const staff = await prisma.vendorStaff.findMany({
      where: { vendorId: user.vendorId },
      include: { _count: { select: { bookings: true } }, slots: true }
    });
    return NextResponse.json({ staff });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireVendor();
    const body = z
      .object({
        name: z.string().min(2),
        gender: z.string().optional(),
        title: z.string().optional(),
        bio: z.string().optional()
      })
      .parse(await req.json());
    const staff = await prisma.vendorStaff.create({
      data: {
        vendorId: user.vendorId,
        name: body.name,
        gender: body.gender ?? "",
        title: body.title,
        bio: body.bio
      }
    });
    return NextResponse.json({ staff });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireVendor();
    const body = z
      .object({
        id: z.string(),
        name: z.string().min(2).optional(),
        gender: z.string().optional(),
        title: z.string().optional(),
        bio: z.string().optional(),
        active: z.boolean().optional()
      })
      .parse(await req.json());
    const existing = await prisma.vendorStaff.findFirst({ where: { id: body.id, vendorId: user.vendorId } });
    if (!existing) return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    const { id, ...data } = body;
    const staff = await prisma.vendorStaff.update({ where: { id }, data });
    return NextResponse.json({ staff });
  } catch (e) {
    return jsonError(e);
  }
}
