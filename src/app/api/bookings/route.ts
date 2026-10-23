import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireUser } from "@/lib/auth";
import { createBooking } from "@/lib/booking";
import { jsonError } from "@/lib/http";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = requireUser(await getSession());
    const bookings = await prisma.booking.findMany({
      where: { customerId: user.id },
      include: { service: true, vendor: true, payments: true },
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
        startsAt: z.string(),
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
