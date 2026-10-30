import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireUser } from "@/lib/auth";
import { createBooking, requestCancellation } from "@/lib/booking";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = requireUser(await getSession());
    const bookings = await prisma.booking.findMany({
      where: { customerId: user.id },
      include: {
        service: { select: { id: true, slug: true, name: true, durationMin: true, imageUrl: true } },
        vendor: { select: { id: true, slug: true, businessName: true, city: true, neighbourhood: true, address: true } },
        payments: { select: { id: true, reference: true, status: true, amountKobo: true, currency: true } }
      },
      orderBy: { startsAt: "desc" }
    });
    return NextResponse.json({ bookings });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = requireUser(await getSession());
    const body = z
      .object({
        serviceId: z.string(),
        staffId: z.string().optional(),
        locationType: z.enum(["spa", "hotel", "home"]),
        locationDetails: z.string().default(""),
        startsAt: z.string().datetime({ offset: true }),
        addonIds: z.array(z.string()).optional(),
        idempotencyKey: z.string().min(8),
        promoCode: z.string().optional()
      })
      .parse(await req.json());
    const booking = await createBooking({
      customerId: user.id,
      serviceId: body.serviceId,
      staffId: body.staffId,
      locationType: body.locationType,
      locationDetails: body.locationDetails,
      startsAt: new Date(body.startsAt),
      addonIds: body.addonIds,
      idempotencyKey: body.idempotencyKey,
      promoCode: body.promoCode
    });
    return NextResponse.json(booking);
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const user = requireUser(await getSession());
    const body = z
      .object({
        id: z.string(),
        action: z.literal("cancel"),
        reason: z.string().min(2).max(200)
      })
      .parse(await req.json());
    const booking = await requestCancellation(body.id, user.id, body.reason);
    return NextResponse.json({ booking });
  } catch (e) {
    return jsonError(e);
  }
}
