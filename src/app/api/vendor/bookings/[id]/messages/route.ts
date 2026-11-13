import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, rateLimit } from "@/lib/http";
import { requireVendor } from "@/lib/vendor-auth";
import { bookingMessageBody, listBookingMessages, postBookingMessage } from "@/lib/booking-chat";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireVendor();
    const { id } = await params;
    const { messages } = await listBookingMessages(id, "vendor", user.id, user.vendorId);
    return NextResponse.json({ messages });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireVendor();
    await rateLimit(`booking-chat:${user.id}`, 40, 60_000);
    const { id } = await params;
    const body = z.object({ body: bookingMessageBody }).parse(await req.json());
    const { message } = await postBookingMessage(id, "vendor", user.id, body.body, user.vendorId);
    return NextResponse.json({ message });
  } catch (e) {
    return jsonError(e);
  }
}
