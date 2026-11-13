import { NextResponse } from "next/server";
import { getSession, requireUser } from "@/lib/auth";
import { jsonError } from "@/lib/http";
import { readLiveChatImage } from "@/lib/booking-chat";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  try {
    const user = requireUser(await getSession());
    const { id, messageId } = await params;
    const image = await readLiveChatImage(id, messageId, "customer", user.id);
    return new NextResponse(new Uint8Array(image.bytes), {
      headers: {
        "Content-Type": image.mime,
        "Cache-Control": "private, no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
        "Cross-Origin-Resource-Policy": "same-origin"
      }
    });
  } catch (e) {
    return jsonError(e);
  }
}
