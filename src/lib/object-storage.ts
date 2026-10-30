import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

export function r2Configured() {
  return ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"].every((k) => Boolean(process.env[k]?.trim()));
}

export function uploadStorage() {
  const mode = process.env.UPLOAD_STORAGE || "local";
  if (mode !== "local" && mode !== "r2") throw new Error("UPLOAD_STORAGE must be local or r2");
  if (mode === "r2" && !r2Configured()) throw Object.assign(new Error("Cloudflare R2 credentials are incomplete"), { status: 503 });
  return mode;
}

function client() {
  if (!r2Configured()) throw Object.assign(new Error("Cloudflare R2 is not configured"), { status: 503 });
  const account = process.env.R2_ACCOUNT_ID!.trim();
  if (!/^[a-f0-9]{32}$/i.test(account)) throw new Error("Invalid R2 account ID");
  return new S3Client({
    region: "auto", endpoint: `https://${account}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(), secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim() },
    requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED",
    maxAttempts: 2
  });
}

function validKey(key: string) {
  if (!/^(galleries\/[a-zA-Z0-9_-]+|categories)\/[a-zA-Z0-9_-]+\.(png|jpg|jpeg|gif|webp)$/.test(key)) throw new Error("Invalid media object key");
  return key;
}

export async function putMediaObject(key: string, bytes: Uint8Array, mime: string) {
  const storage = client();
  try {
    await storage.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!.trim(), Key: validKey(key), Body: bytes,
      ContentType: mime, CacheControl: "public, max-age=31536000, immutable" }), { abortSignal: AbortSignal.timeout(20000) });
  } catch { throw Object.assign(new Error("R2 upload failed. Check bucket access and credentials."), { status: 503 }); }
  finally { storage.destroy(); }
}

export async function getMediaObject(key: string) {
  if (!r2Configured()) return null;
  const storage = client();
  try {
    const result = await storage.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!.trim(), Key: validKey(key) }), { abortSignal: AbortSignal.timeout(15000) });
    if (!result.Body) return null;
    return { bytes: Buffer.from(await result.Body.transformToByteArray()), mime: result.ContentType || "application/octet-stream" };
  } catch (e) {
    if (typeof e === "object" && e && (("name" in e && e.name === "NoSuchKey") || ("$metadata" in e && (e.$metadata as { httpStatusCode?: number }).httpStatusCode === 404))) return null;
    throw Object.assign(new Error("Media storage is temporarily unavailable"), { status: 503 });
  } finally { storage.destroy(); }
}

export async function deleteMediaObject(key: string) {
  if (!r2Configured()) return;
  const storage = client();
  try { await storage.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!.trim(), Key: validKey(key) }), { abortSignal: AbortSignal.timeout(15000) }); }
  catch { throw Object.assign(new Error("R2 deletion failed. Please retry."), { status: 503 }); }
  finally { storage.destroy(); }
}
