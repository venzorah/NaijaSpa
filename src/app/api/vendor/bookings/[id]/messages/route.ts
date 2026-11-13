import { NextResponse } from "next/server";
import { jsonError, rateLimit } from "@/lib/http";
import { requireVendor } from "@/lib/vendor-auth";
import {
  listBookingMessages,
  parseBookingChatPost,
  postBookingChatImage,
  postBookingMessage
} from "@/lib/booking-chat";

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
    const payload = await parseBookingChatPost(req);
    if (payload.kind === "image") {
      await rateLimit(`booking-chat-image:${user.id}`, 8, 60_000);
      const { message } = await postBookingChatImage(id, "vendor", user.id, payload.bytes, payload.caption, user.vendorId);
      return NextResponse.json({ message });
    }
    const { message } = await postBookingMessage(id, "vendor", user.id, payload.body, user.vendorId);
    return NextResponse.json({ message });
  } catch (e) {
    return jsonError(e);
  }
}
