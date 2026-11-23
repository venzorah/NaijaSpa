import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireVendor } from "@/lib/vendor-auth";
import { jsonError } from "@/lib/http";
import { NIGERIA_STATES } from "@/lib/nigeria";

export async function GET() {
  try {
    const user = await requireVendor();
    const profile = await prisma.shopShippingProfile.findUnique({
      where: { vendorId: user.vendorId },
      include: { zones: true }
    });
    return NextResponse.json({ profile, states: NIGERIA_STATES });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PUT(req: Request) {
  try {
    const user = await requireVendor();
    const body = z
      .object({
        localEnabled: z.boolean(),
        localFeeKobo: z.number().int().min(0).max(5_000_000),
        localEtaDays: z.number().int().min(0).max(30),
        interstateOn: z.boolean(),
        pickupEnabled: z.boolean(),
        freeAboveKobo: z.number().int().min(0).max(50_000_000),
        zones: z.array(z.object({ state: z.enum(NIGERIA_STATES), feeKobo: z.number().int().min(0).max(5_000_000), etaDays: z.number().int().min(1).max(30) })).max(40)
      })
      .parse(await req.json());
    const profile = await prisma.shopShippingProfile.upsert({
      where: { vendorId: user.vendorId },
      create: {
        vendorId: user.vendorId,
        localEnabled: body.localEnabled,
        localFeeKobo: body.localFeeKobo,
        localEtaDays: body.localEtaDays,
        interstateOn: body.interstateOn,
        pickupEnabled: body.pickupEnabled,
        freeAboveKobo: body.freeAboveKobo
      },
      update: {
        localEnabled: body.localEnabled,
        localFeeKobo: body.localFeeKobo,
        localEtaDays: body.localEtaDays,
        interstateOn: body.interstateOn,
        pickupEnabled: body.pickupEnabled,
        freeAboveKobo: body.freeAboveKobo
      }
    });
    await prisma.shopShippingZone.deleteMany({ where: { profileId: profile.id } });
    if (body.interstateOn && body.zones.length) {
      await prisma.shopShippingZone.createMany({
        data: body.zones.map((zone) => ({ profileId: profile.id, ...zone }))
      });
    }
    const saved = await prisma.shopShippingProfile.findUnique({ where: { id: profile.id }, include: { zones: true } });
    return NextResponse.json({ profile: saved });
  } catch (e) {
    return jsonError(e);
  }
}
