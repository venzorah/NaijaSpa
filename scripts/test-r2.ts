import { loadEnvConfig } from "@next/env";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";

loadEnvConfig(process.cwd());

async function main() {
  const { uploadStorage, putMediaObject, getMediaObject, deleteMediaObject } = await import("../src/lib/object-storage");
  assert.equal(uploadStorage(), "r2", 'Set UPLOAD_STORAGE="r2" before testing');
  const key = `categories/r2-test-${randomUUID()}.png`;
  const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
  let uploaded = false;
  try {
    await putMediaObject(key, bytes, "image/png");
    uploaded = true;
    console.log(JSON.stringify({ check: "r2-upload", ok: true }));
    const result = await getMediaObject(key);
    assert(result && result.bytes.equals(bytes));
    assert.equal(result.mime, "image/png");
    console.log(JSON.stringify({ check: "r2-read-content", ok: true }));
  } finally {
    if (uploaded) {
      await deleteMediaObject(key);
      assert.equal(await getMediaObject(key), null);
      console.log(JSON.stringify({ check: "r2-delete", ok: true }));
    }
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ check: "r2", ok: false, detail: error instanceof Error ? error.message : "Storage check failed" }));
  process.exitCode = 1;
});
