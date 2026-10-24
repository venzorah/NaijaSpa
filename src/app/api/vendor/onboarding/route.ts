import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

const bodySchema = z.object({
  providerType: z.enum(["spa", "independent", "hotel", "mobile"]),
  businessName: z.string().min(2),
  description: z.string().optional().default(""),
  privatePhone: z.string().optional().nullable(),
  privateWhatsapp: z.string().optional().nullable(),
  state: z.string().min(2),
  city: z.string().min(2),
  neighbourhood: z.string().optional().default(""),
  address: z.string().min(4),
  cancellationPolicy: z.string().optional().default(""),
  hoursJson: z.string().optional(),
  submit: z.boolean().optional().default(false)
});

export async function GET() {
  try {
    const user = requireUser(await getSession());
    if (!user.vendorId) return NextResponse.json({ error: "Not a vendor" }, { status: 403 });
    const vendor = await prisma.vendor.findUniqueOrThrow({ where: { id: user.vendorId } });
    return NextResponse.json({
      vendor: {
        providerType: vendor.providerType,
        businessName: vendor.businessName,
        description: vendor.description,
        privatePhone: vendor.privatePhone ?? "",
        privateWhatsapp: vendor.privateWhatsapp ?? "",
        state: vendor.state,
        city: vendor.city,
        neighbourhood: vendor.neighbourhood,
        address: vendor.address,
        cancellationPolicy: vendor.cancellationPolicy,
        hoursJson: vendor.hoursJson,
        applicationStatus: vendor.applicationStatus
      }
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = requireUser(await getSession());
    if (!user.vendorId) return NextResponse.json({ error: "Not a vendor" }, { status: 403 });
    const body = bodySchema.parse(await req.json());
    const current = await prisma.vendor.findUniqueOrThrow({ where: { id: user.vendorId } });
    if (["approved", "suspended"].includes(current.applicationStatus) && body.submit) {
      return NextResponse.json({ error: "This listing cannot be resubmitted." }, { status: 409 });
    }
    const vendor = await prisma.vendor.update({
      where: { id: user.vendorId },
      data: {
        providerType: body.providerType,
        businessName: body.businessName,
        description: body.description,
        privatePhone: body.privatePhone || null,
        privateWhatsapp: body.privateWhatsapp || null,
        state: body.state,
        city: body.city,
        neighbourhood: body.neighbourhood,
        address: body.address,
        cancellationPolicy: body.cancellationPolicy,
        hoursJson: body.hoursJson ?? current.hoursJson,
        applicationStatus: body.submit ? "submitted" : current.applicationStatus === "draft" ? "draft" : current.applicationStatus
      }
    });
    return NextResponse.json({ ok: true, applicationStatus: vendor.applicationStatus });
  } catch (e) {
    return jsonError(e);
  }
}
