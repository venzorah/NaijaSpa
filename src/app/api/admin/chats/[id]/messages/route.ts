import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { jsonError } from "@/lib/http";
import { listAdminBookingMessages } from "@/lib/booking-chat";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdmin(["bookings.manage", "support.manage"]);
    const { id } = await params;
    const { messages } = await listAdminBookingMessages(id, user.id);
    return NextResponse.json({ messages });
  } catch (e) {
    return jsonError(e);
  }
}
