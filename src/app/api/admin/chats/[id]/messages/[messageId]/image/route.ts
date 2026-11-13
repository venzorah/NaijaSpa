import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { jsonError } from "@/lib/http";
import { readAdminChatImage } from "@/lib/booking-chat";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  try {
    await requireAdmin(["bookings.manage", "support.manage"]);
    const { id, messageId } = await params;
    const image = await readAdminChatImage(id, messageId);
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
