import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "./db";
import { detectImageMime, extensionForMime } from "./galleries";
import { deleteMediaObject, getMediaObject, putMediaObject, uploadStorage } from "./object-storage";
import {
  MAX_VERIFICATION_DOC_BYTES,
  verificationDocLabel,
  type VerificationDocKind
} from "./verification-doc-kinds";

export {
  MAX_VERIFICATION_DOC_BYTES,
  VERIFICATION_DOC_KINDS,
  VERIFICATION_DOC_OPTIONS,
  isVerificationDocKind,
  verificationDocLabel,
  type VerificationDocKind
} from "./verification-doc-kinds";

export function kycUploadsRoot() {
  return path.resolve(process.cwd(), "uploads", "kyc");
}

function storageKey(vendorId: string, fileName: string) {
  return `kyc/${vendorId}/${fileName}`;
}

export async function saveVerificationDocument(vendorId: string, kind: VerificationDocKind, bytes: Uint8Array) {
  if (bytes.byteLength > MAX_VERIFICATION_DOC_BYTES) {
    throw Object.assign(new Error("Each document image must be at most 2 MB."), { status: 400 });
  }
  const mime = detectImageMime(bytes);
  if (!mime) {
    throw Object.assign(new Error("Upload a JPEG, PNG, WebP or GIF photo of the document."), { status: 400 });
  }
  const id = randomUUID().replaceAll("-", "").slice(0, 16);
  const fileName = `${kind}-${id}.${extensionForMime(mime)}`;
  const filePath = storageKey(vendorId, fileName);
  const storage = uploadStorage();
  if (storage === "r2") {
    await putMediaObject(filePath, bytes, mime);
  } else {
    const dir = path.join(kycUploadsRoot(), vendorId);
    try {
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, fileName), bytes);
    } catch {
      /* Vercel and other hosts are read-only; bytes stay in the database. */
    }
  }
  const existing = await prisma.verificationDoc.findUnique({ where: { vendorId_kind: { vendorId, kind } } });
  if (existing) await deleteVerificationFile(existing.filePath);
  const payload = storage === "r2" ? null : Buffer.from(bytes);
  return prisma.verificationDoc.upsert({
    where: { vendorId_kind: { vendorId, kind } },
    create: {
      vendorId,
      kind,
      filePath,
      mimeType: mime,
      byteSize: bytes.byteLength,
      imagePayload: payload,
      status: "submitted"
    },
    update: {
      filePath,
      mimeType: mime,
      byteSize: bytes.byteLength,
      imagePayload: payload,
      status: "submitted",
      notes: null
    }
  });
}

export async function deleteVerificationDocument(vendorId: string, id: string) {
  const doc = await prisma.verificationDoc.findFirst({ where: { id, vendorId } });
  if (!doc) {
    throw Object.assign(new Error("Document not found."), { status: 404 });
  }
  await deleteVerificationFile(doc.filePath);
  await prisma.verificationDoc.delete({ where: { id: doc.id } });
}

export async function deleteVerificationFile(filePath: string) {
  if (!filePath.startsWith("kyc/")) return;
  await deleteMediaObject(filePath);
  const rest = filePath.slice("kyc/".length);
  if (!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp|gif)$/.test(rest)) return;
  const resolved = path.resolve(kycUploadsRoot(), rest);
  if (!resolved.startsWith(kycUploadsRoot() + path.sep)) return;
  try {
    await unlink(resolved);
  } catch {
    /* missing file is fine */
  }
}

export async function verificationDocBytes(doc: {
  filePath: string;
  mimeType: string;
  imagePayload: Uint8Array | Buffer | null;
}) {
  const sniff = (bytes: Buffer) => {
    const mime = detectImageMime(bytes);
    if (!mime) return null;
    return { bytes, mime };
  };
  if (doc.imagePayload && doc.imagePayload.length) {
    return sniff(Buffer.from(doc.imagePayload));
  }
  try {
    const object = await getMediaObject(doc.filePath);
    if (object) return sniff(Buffer.from(object.bytes));
  } catch {
    throw Object.assign(new Error("Document storage is temporarily unavailable."), { status: 503 });
  }
  if (!doc.filePath.startsWith("kyc/")) return null;
  const rest = doc.filePath.slice("kyc/".length);
  if (!/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp|gif)$/.test(rest)) return null;
  const resolved = path.resolve(kycUploadsRoot(), rest);
  if (!resolved.startsWith(kycUploadsRoot() + path.sep)) return null;
  try {
    return sniff(await readFile(resolved));
  } catch {
    return null;
  }
}

export function vendorDocumentView(doc: { id: string; kind: string; status: string }) {
  return {
    id: doc.id,
    kind: doc.kind,
    label: verificationDocLabel(doc.kind),
    status: doc.status,
    url: `/api/vendor/documents/${doc.id}/file`
  };
}
