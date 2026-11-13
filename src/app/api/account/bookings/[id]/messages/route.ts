import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession, requireUser } from "@/lib/auth";
import { jsonError, rateLimit } from "@/lib/http";
import { bookingMessageBody, listBookingMessages, postBookingMessage } from "@/lib/booking-chat";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireUser(await getSession());
    const { id } = await params;
    const { messages } = await listBookingMessages(id, "customer", user.id);
    return NextResponse.json({ messages });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = requireUser(await getSession());
    await rateLimit(`booking-chat:${user.id}`, 40, 60_000);
    const { id } = await params;
    const body = z.object({ body: bookingMessageBody }).parse(await req.json());
    const { message } = await postBookingMessage(id, "customer", user.id, body.body);
    return NextResponse.json({ message });
  } catch (e) {
    return jsonError(e);
  }
}
