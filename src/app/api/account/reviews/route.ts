import { NextResponse } from "next/server";
import { getSession, requireUser } from "@/lib/auth";
import { jsonError, rateLimit } from "@/lib/http";
import { createBookingReview, parseReviewInput } from "@/lib/reviews";

export async function POST(req: Request) {
  try {
    const user = requireUser(await getSession());
    rateLimit(`review:${user.id}`, 8, 60_000);
    const json = await req.json();
    const body = parseReviewInput(json);
    const bookingId = String(json.bookingId || "");
    if (!bookingId) return NextResponse.json({ error: "Booking is required" }, { status: 400 });
    const result = await createBookingReview({
      userId: user.id,
      bookingId,
      rating: body.rating,
      body: body.body
    });
    return NextResponse.json(result);
  } catch (e) {
    return jsonError(e);
  }
}
