import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { requireVendor } from "@/lib/vendor-auth";
import { prisma } from "@/lib/db";
import { vendorEntitlement } from "@/lib/entitlements";
import { publicContactAllowed } from "@/lib/commercial";

const bodySchema = z.object({
  privatePhone: z.string().optional().nullable(),
  privateWhatsapp: z.string().optional().nullable(),
  instagramUrl: z.string().optional().nullable()
});

export async function GET() {
  try {
    const user = await requireVendor();
    const [vendor, ent] = await Promise.all([
      prisma.vendor.findUniqueOrThrow({
        where: { id: user.vendorId },
        select: { privatePhone: true, privateWhatsapp: true, instagramUrl: true }
      }),
      vendorEntitlement(user.vendorId)
    ]);
    return NextResponse.json({
      paid: ent.activePaid,
      public: publicContactAllowed(ent),
      email: user.email,
      privatePhone: vendor.privatePhone ?? "",
      privateWhatsapp: vendor.privateWhatsapp ?? "",
      instagramUrl: vendor.instagramUrl ?? ""
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireVendor();
    const body = bodySchema.parse(await req.json());
    const vendor = await prisma.vendor.update({
      where: { id: user.vendorId },
      data: {
        privatePhone: body.privatePhone?.trim() || null,
        privateWhatsapp: body.privateWhatsapp?.trim() || null,
        instagramUrl: body.instagramUrl?.trim() || null
      },
      select: { privatePhone: true, privateWhatsapp: true, instagramUrl: true }
    });
    const ent = await vendorEntitlement(user.vendorId);
    return NextResponse.json({
      ok: true,
      paid: ent.activePaid,
      public: publicContactAllowed(ent),
      email: user.email,
      privatePhone: vendor.privatePhone ?? "",
      privateWhatsapp: vendor.privateWhatsapp ?? "",
      instagramUrl: vendor.instagramUrl ?? ""
    });
  } catch (e) {
    return jsonError(e);
  }
}
