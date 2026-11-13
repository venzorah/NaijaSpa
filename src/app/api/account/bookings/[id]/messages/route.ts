import { NextResponse } from "next/server";
import { getSession, requireUser } from "@/lib/auth";
import { jsonError, rateLimit } from "@/lib/http";
import {
  listBookingMessages,
  parseBookingChatPost,
  postBookingChatImage,
  postBookingMessage
} from "@/lib/booking-chat";

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
    const payload = await parseBookingChatPost(req);
    if (payload.kind === "image") {
      await rateLimit(`booking-chat-image:${user.id}`, 8, 60_000);
      const { message } = await postBookingChatImage(id, "customer", user.id, payload.bytes, payload.caption);
      return NextResponse.json({ message });
    }
    const { message } = await postBookingMessage(id, "customer", user.id, payload.body);
    return NextResponse.json({ message });
  } catch (e) {
    return jsonError(e);
  }
}
