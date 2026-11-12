import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/vendor-auth";
import { jsonError } from "@/lib/http";
import { deleteVerificationDocument } from "@/lib/verification-docs";

export const runtime = "nodejs";

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireVendor();
    const { id } = await ctx.params;
    await deleteVerificationDocument(user.vendorId, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
