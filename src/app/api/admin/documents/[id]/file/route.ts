import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { verificationDocBytes } from "@/lib/verification-docs";

export const runtime = "nodejs";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin("vendors.verify");
    const { id } = await ctx.params;
    const doc = await prisma.verificationDoc.findUnique({
      where: { id },
      select: { filePath: true, mimeType: true, imagePayload: true }
    });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const file = await verificationDocBytes(doc);
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return new NextResponse(Uint8Array.from(file.bytes), {
      headers: {
        "Content-Type": file.mime,
        "Content-Length": String(file.bytes.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `inline; filename="${id.replace(/[^a-zA-Z0-9._-]/g, "") || "document"}.jpg"`
      }
    });
  } catch (e) {
    return jsonError(e);
  }
}
