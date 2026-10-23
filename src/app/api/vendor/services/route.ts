import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const user = requireUser(await getSession());
    if (!user.vendorId) return NextResponse.json({ error: "Not a vendor" }, { status: 403 });
    const services = await prisma.service.findMany({ where: { vendorId: user.vendorId } });
    return NextResponse.json({ services, unlimited: true });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = requireUser(await getSession());
    if (!user.vendorId) return NextResponse.json({ error: "Not a vendor" }, { status: 403 });
    const body = z
      .object({
        name: z.string().min(2),
        categoryId: z.string(),
        basePriceKobo: z.number().int().positive(),
        durationMin: z.number().int().positive(),
        description: z.string().optional(),
        spaEnabled: z.boolean().optional(),
        hotelEnabled: z.boolean().optional(),
        homeEnabled: z.boolean().optional()
      })
      .parse(await req.json());
    const service = await prisma.service.create({
      data: {
        vendorId: user.vendorId,
        slug: `${body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`,
        ...body
      }
    });
    return NextResponse.json({ service });
  } catch (e) {
    return jsonError(e);
  }
}
