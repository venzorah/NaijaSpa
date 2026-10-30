import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient({ log: [] });
const base = process.env.TEST_APP_URL || "http://127.0.0.1:3000";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
assert(["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL).hostname));
assert.equal(process.env.UPLOAD_STORAGE, "r2");
const m = JSON.parse(await readFile(process.argv[2], "utf8"));
assert(/^integration-[a-f0-9]{12}$/.test(m.run));
assert.equal(m.vendorId, `${m.run}-vendor`);
const galleryId = `upload-test-${randomUUID()}`;
let image;
let cookie;
let originalPrefs;
async function call(path, method = "GET", body) {
  const response = await fetch(`${base}${path}`, { method, headers: { Cookie: cookie, ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }) },
    ...(body ? { body: body instanceof FormData ? body : JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60000) });
  return { status: response.status, data: await response.json() };
}
function report(check) { console.log(JSON.stringify({ check, ok: true })); }
try {
  const session = await db.session.findFirst({ where: { userId: `${m.run}-owner`, expiresAt: { gt: new Date() } } });
  assert(session, "Fixture session expired");
  cookie = `naijaspa_session=${session.token}`;
  await db.therapistGallery.create({ data: { id: galleryId, vendorId: m.vendorId, title: "R2 upload test" } });
  const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
  const form = new FormData(); form.set("galleryId", galleryId); form.set("file", new Blob([bytes], { type: "image/png" }), "test.png");
  const upload = await call("/api/vendor/galleries/images", "POST", form);
  assert.equal(upload.status, 200, `Upload status ${upload.status}`); image = upload.data.image;
  const row = await db.therapistGalleryImage.findUniqueOrThrow({ where: { id: image.id } });
  assert.equal(row.payload, null, "R2 upload must not duplicate bytes in the database");
  const download = await fetch(`${base}${image.url}`, { signal: AbortSignal.timeout(60000) });
  assert.equal(download.status, 200); assert.equal(download.headers.get("content-type"), "image/png");
  assert(bytes.equals(Buffer.from(await download.arrayBuffer())));
  report("application-r2-upload-and-public-read");
  assert.equal((await call(`/api/vendor/galleries/images?id=${image.id}`, "DELETE")).status, 200);
  assert.equal((await fetch(`${base}${image.url}`)).status, 404); image = null;
  report("application-r2-delete");
  if (!process.argv.includes("--uploads-only")) {
  const user = await db.user.findUniqueOrThrow({ where: { id: session.userId }, select: { notificationPreferencesJson: true } });
  originalPrefs = user.notificationPreferencesJson;
  const prefs = { reminders: false, offers: true, sms: false, email: true };
  assert.equal((await call("/api/account/notifications", "PUT", prefs)).status, 200);
  const saved = await call("/api/account/notifications");
  assert.equal(saved.status, 200); assert.deepEqual(saved.data.preferences, prefs);
  report("notification-preferences-persist");
  const push = await call("/api/account/push"); assert.equal(push.status, 200); assert.equal(push.data.configured, true);
  assert(push.data.publicKey && !JSON.stringify(push.data).includes("privateKey"));
  const rejected = await call("/api/account/push", "POST", { endpoint: "https://127.0.0.1/push", keys: { p256dh: "invalid", auth: "invalid" } });
  assert.equal(rejected.status, 400);
  assert.equal((await fetch(`${base}/api/jobs/notifications`, { method: "POST" })).status, 401);
  report("push-configuration-subscription-and-job-guards");
  }
} catch (error) {
  process.exitCode = 1;
  console.error(JSON.stringify({ check: "upload-push-integration", ok: false, detail: error instanceof assert.AssertionError ? error.message : "Integration failed; credentials omitted" }));
} finally {
  if (image) await call(`/api/vendor/galleries/images?id=${image.id}`, "DELETE");
  await db.therapistGallery.deleteMany({ where: { id: galleryId, vendorId: m.vendorId } });
  if (originalPrefs !== undefined) await db.user.update({ where: { id: `${m.run}-owner` }, data: { notificationPreferencesJson: originalPrefs } });
  await db.$disconnect();
}
