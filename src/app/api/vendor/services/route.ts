import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { getSession, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const user = requireUser(await getSession());
    if (!user.vendorId) return NextResponse.json({ error: "Not a vendor" }, { status: 403 });
    const [services, categories] = await Promise.all([
      prisma.service.findMany({
        where: { vendorId: user.vendorId },
        include: { category: { select: { name: true } }, _count: { select: { bookings: true } } },
        orderBy: { createdAt: "desc" }
      }),
      prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } })
    ]);
    return NextResponse.json({ services, categories, unlimited: true });
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
        homeEnabled: z.boolean().optional(),
        hotelAddonKobo: z.number().int().min(0).optional(),
        homeAddonKobo: z.number().int().min(0).optional()
      })
      .parse(await req.json());
    const service = await prisma.service.create({
      data: {
        vendorId: user.vendorId,
        slug: `${body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now().toString(36)}`,
        ...body
      }
    });
    revalidateTag("home-catalog");
    return NextResponse.json({ service });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = requireUser(await getSession());
    if (!user.vendorId) return NextResponse.json({ error: "Not a vendor" }, { status: 403 });
    const body = z
      .object({
        id: z.string().optional(),
        location: z.enum(["spa", "hotel", "home"]).optional(),
        locationEnabled: z.boolean().optional(),
        name: z.string().min(2).optional(),
        description: z.string().optional(),
        basePriceKobo: z.number().int().positive().optional(),
        durationMin: z.number().int().positive().optional(),
        active: z.boolean().optional(),
        hotelAddonKobo: z.number().int().min(0).optional(),
        homeAddonKobo: z.number().int().min(0).optional(),
        spaEnabled: z.boolean().optional(),
        hotelEnabled: z.boolean().optional(),
        homeEnabled: z.boolean().optional()
      })
      .parse(await req.json());
    if (body.location && body.locationEnabled !== undefined) {
      const field = body.location === "spa" ? "spaEnabled" : body.location === "hotel" ? "hotelEnabled" : "homeEnabled";
      await prisma.service.updateMany({ where: { vendorId: user.vendorId }, data: { [field]: body.locationEnabled } });
      revalidateTag("home-catalog");
      return NextResponse.json({ ok: true });
    }
    if (!body.id) return NextResponse.json({ error: "Service id required" }, { status: 400 });
    const existing = await prisma.service.findFirst({
      where: { id: body.id, vendorId: user.vendorId }
    });
    if (!existing) return NextResponse.json({ error: "Service not found" }, { status: 404 });
    const { id, location, locationEnabled, ...data } = body;
    const service = await prisma.service.update({ where: { id }, data });
    revalidateTag("home-catalog");
    return NextResponse.json({ service });
  } catch (e) {
    return jsonError(e);
  }
}
