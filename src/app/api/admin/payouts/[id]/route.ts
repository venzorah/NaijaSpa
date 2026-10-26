import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { releaseVendorPayout } from "@/lib/payouts";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin("finance.manage");
    const { id } = await params;
    const before = await prisma.payout.findUniqueOrThrow({ where: { id } });
    const body = z
      .object({
        status: z.enum(["pending", "paid", "failed"]).optional(),
        note: z.string().optional(),
        retry: z.boolean().optional()
      })
      .parse(await req.json());
    if (body.retry) {
      if (!before.earningId) return NextResponse.json({ error: "This payout is not tied to a booking earning." }, { status: 400 });
      const earning = await prisma.vendorEarning.findUniqueOrThrow({ where: { id: before.earningId } });
      await prisma.payout.update({
        where: { id },
        data: { status: "failed", providerRef: null, note: "Finance retried Paystack transfer to the vendor account." }
      });
      await releaseVendorPayout(earning.bookingId);
      const payout = await prisma.payout.findUniqueOrThrow({ where: { id } });
      await audit({ actorId: actor.id, action: "payout.retry", entityType: "Payout", entityId: id, before, after: payout });
      return NextResponse.json({ payout });
    }
    if (!body.status) return NextResponse.json({ error: "status or retry is required" }, { status: 400 });
    const payout = await prisma.payout.update({ where: { id }, data: { status: body.status, note: body.note } });
    if (body.status === "paid" && before.earningId) {
      await prisma.vendorEarning.update({ where: { id: before.earningId }, data: { status: "paid" } });
    }
    await audit({ actorId: actor.id, action: "payout.update", entityType: "Payout", entityId: id, before, after: payout });
    return NextResponse.json({ payout });
  } catch (e) {
    return jsonError(e);
  }
}
