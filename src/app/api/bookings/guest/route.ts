import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createBooking } from "@/lib/booking";
import { findOrCreateGuestCustomer, startGuestSession } from "@/lib/guest-identity";
import { jsonError, rateLimit, clientAddress } from "@/lib/http";
import { bookingReference } from "@/lib/phone";
import { audit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const existing = await getSession();
    if (existing?.role === "customer") {
      return NextResponse.json({ error: "You are already signed in. Use the regular checkout." }, { status: 409 });
    }
    await rateLimit(`guest-book:${clientAddress(req)}`, 8, 60 * 60 * 1000);
    const body = z
      .object({
        name: z.string().trim().min(2).max(80),
        phone: z.string().trim().min(10).max(20),
        email: z.string().trim().email().optional().or(z.literal("")),
        serviceId: z.string(),
        staffId: z.string().optional(),
        locationType: z.enum(["spa", "hotel", "home"]),
        locationDetails: z.string().default(""),
        customerNotes: z.string().max(1000).optional(),
        startsAt: z.string().datetime({ offset: true }),
        addonIds: z.array(z.string().min(1).max(64)).max(20).optional(),
        idempotencyKey: z.string().min(8),
        promoCode: z.string().optional()
      })
      .parse(await req.json());
    const guest = await findOrCreateGuestCustomer({
      name: body.name,
      phone: body.phone,
      email: body.email || undefined
    });
    const booking = await createBooking({
      customerId: guest.id,
      serviceId: body.serviceId,
      staffId: body.staffId,
      locationType: body.locationType,
      locationDetails: body.locationDetails,
      customerNotes: body.customerNotes,
      startsAt: new Date(body.startsAt),
      addonIds: body.addonIds,
      idempotencyKey: body.idempotencyKey,
      promoCode: body.promoCode
    });
    await startGuestSession(guest);
    await audit({
      actorId: guest.id,
      action: "booking.guest_create",
      entityType: "Booking",
      entityId: booking.id
    });
    return NextResponse.json({
      ...booking,
      reference: bookingReference(booking.id)
    });
  } catch (e) {
    return jsonError(e);
  }
}
