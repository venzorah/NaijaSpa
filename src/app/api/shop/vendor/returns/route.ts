import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireVendor } from "@/lib/vendor-auth";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireVendor();
    const returns = await prisma.shopReturn.findMany({
      where: { vendorOrder: { vendorId: user.vendorId } },
      include: { vendorOrder: true, master: true },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json({ returns });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireVendor();
    const body = z.object({ id: z.string(), note: z.string().max(400) }).parse(await req.json());
    const row = await prisma.shopReturn.findFirst({ where: { id: body.id, vendorOrder: { vendorId: user.vendorId } } });
    if (!row) return NextResponse.json({ error: "Return not found" }, { status: 404 });
    const updated = await prisma.shopReturn.update({ where: { id: row.id }, data: { reason: `${row.reason}\nVendor: ${body.note}` } });
    return NextResponse.json({ return: updated });
  } catch (e) {
    return jsonError(e);
  }
}
