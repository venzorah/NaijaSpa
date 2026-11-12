import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/vendor-auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { formImage } from "@/lib/form-file";
import { isVerificationDocKind } from "@/lib/verification-doc-kinds";
import { saveVerificationDocument, vendorDocumentView } from "@/lib/verification-docs";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireVendor();
    const documents = await prisma.verificationDoc.findMany({
      where: { vendorId: user.vendorId },
      select: { id: true, kind: true, status: true }
    });
    return NextResponse.json({ documents: documents.map(vendorDocumentView) });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireVendor();
    const fd = await req.formData();
    const kind = String(fd.get("kind") || "");
    if (!isVerificationDocKind(kind)) {
      const err = new Error("Choose ID, business registration or a practice licence.");
      (err as Error & { status: number }).status = 400;
      throw err;
    }
    const file = formImage(fd);
    if (!file) {
      const err = new Error("Choose a document photo.");
      (err as Error & { status: number }).status = 400;
      throw err;
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const doc = await saveVerificationDocument(user.vendorId, kind, bytes);
    return NextResponse.json({ document: vendorDocumentView(doc) });
  } catch (e) {
    return jsonError(e);
  }
}
