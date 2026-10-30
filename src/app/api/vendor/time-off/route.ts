import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVendor } from "@/lib/vendor-auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireVendor();
    const staff = await prisma.vendorStaff.findMany({ where: { vendorId: user.vendorId }, select: { id: true, name: true } });
    const rows = await prisma.timeOff.findMany({
      where: { staffId: { in: staff.map((s) => s.id) } },
      orderBy: { startsAt: "asc" }
    });
    const names = Object.fromEntries(staff.map((s) => [s.id, s.name]));
    return NextResponse.json({
      blocks: rows.map((r) => ({ ...r, staffName: names[r.staffId] || "Therapist" }))
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireVendor();
    const body = z
      .object({
        staffId: z.string(),
        startsAt: z.string().datetime({ offset: true }),
        endsAt: z.string().datetime({ offset: true }),
        reason: z.string().min(2)
      }).refine((b) => new Date(b.endsAt) > new Date(b.startsAt), "End time must follow start time")
      .parse(await req.json());
    const staff = await prisma.vendorStaff.findFirst({ where: { id: body.staffId, vendorId: user.vendorId } });
    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    const block = await prisma.timeOff.create({
      data: {
        staffId: body.staffId,
        startsAt: new Date(body.startsAt),
        endsAt: new Date(body.endsAt),
        reason: body.reason
      }
    });
    return NextResponse.json({ block });
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireVendor();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const block = await prisma.timeOff.findUnique({ where: { id } });
    if (!block) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const staff = await prisma.vendorStaff.findFirst({ where: { id: block.staffId, vendorId: user.vendorId } });
    if (!staff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await prisma.timeOff.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
