import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVendor } from "@/lib/vendor-auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireVendor();
    const slots = await prisma.availabilitySlot.findMany({
      where: { vendorId: user.vendorId },
      orderBy: [{ weekday: "asc" }, { startMin: "asc" }]
    });
    return NextResponse.json({ slots });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireVendor();
    const body = z
      .object({
        staffId: z.string().nullable().optional(),
        slots: z.array(
          z.object({
            weekday: z.number().int().min(0).max(6),
            startMin: z.number().int().min(0).max(24 * 60 - 1),
            endMin: z.number().int().min(1).max(24 * 60),
            bufferMin: z.number().int().min(0).max(180)
          })
        )
      })
      .parse(await req.json());
    const staffId = body.staffId ?? null;
    if (staffId) {
      const staff = await prisma.vendorStaff.findFirst({ where: { id: staffId, vendorId: user.vendorId } });
      if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }
    await prisma.availabilitySlot.deleteMany({ where: { vendorId: user.vendorId, staffId } });
    if (body.slots.length) {
      await prisma.availabilitySlot.createMany({
        data: body.slots.map((s) => ({
          vendorId: user.vendorId,
          staffId,
          weekday: s.weekday,
          startMin: s.startMin,
          endMin: s.endMin,
          bufferMin: s.bufferMin
        }))
      });
    }
    const slots = await prisma.availabilitySlot.findMany({ where: { vendorId: user.vendorId } });
    return NextResponse.json({ slots });
  } catch (e) {
    return jsonError(e);
  }
}
