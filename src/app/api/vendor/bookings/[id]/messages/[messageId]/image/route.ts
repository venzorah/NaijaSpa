import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";
import { readLiveChatImage } from "@/lib/booking-chat";
import { requireVendor } from "@/lib/vendor-auth";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  try {
    const user = await requireVendor();
    const { id, messageId } = await params;
    const image = await readLiveChatImage(id, messageId, "vendor", user.id, user.vendorId);
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
