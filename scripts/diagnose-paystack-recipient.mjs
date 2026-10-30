import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import crypto from "node:crypto";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const key = process.env.PAYSTACK_SECRET_KEY;
assert(key?.startsWith("sk_test_"), "This diagnostic refuses LIVE keys");
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient({ log: [] });
const manifest = JSON.parse(await readFile(process.argv[2], "utf8"));
assert(/^integration-[a-f0-9]{12}$/.test(manifest.run));
assert.equal(manifest.vendorId, `${manifest.run}-vendor`);
async function call(path, body) {
  const response = await fetch(`https://api.paystack.co${path}`, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000) });
  return { httpStatus: response.status, ...await response.json() };
}
try {
  const vendor = await db.vendor.findUniqueOrThrow({ where: { id: manifest.vendorId }, select: { payoutRecipientCode: true } });
  assert(vendor.payoutRecipientCode, "Fixture recipient missing");
  const recipient = await call(`/transferrecipient/${encodeURIComponent(vendor.payoutRecipientCode)}`);
  console.log(JSON.stringify({ check: "sandbox-recipient-read", httpStatus: recipient.httpStatus, ok: recipient.status === true,
    active: recipient.data?.active, domain: recipient.data?.domain, currency: recipient.data?.currency, type: recipient.data?.type,
    codeFormatValid: /^RCP_[a-zA-Z0-9]+$/.test(vendor.payoutRecipientCode), ...(recipient.status ? {} : { providerMessage: recipient.message }) }));
  if (recipient.status && process.argv.includes("--test-transfer")) {
    const result = await call("/transfer", { source: "balance", amount: 5000, recipient: vendor.payoutRecipientCode, currency: "NGN", reason: "NaijaSpa isolated sandbox diagnostic", reference: `ns-test-${crypto.randomUUID()}` });
    console.log(JSON.stringify({ check: "sandbox-direct-transfer", httpStatus: result.httpStatus, ok: result.status === true, transferStatus: result.data?.status, ...(result.status ? {} : { providerMessage: result.message }) }));
  }
} catch (error) { process.exitCode = 1; console.log(JSON.stringify({ check: "sandbox-recipient-diagnostic", ok: false, code: error.cause?.code || error.code || error.name })); }
finally { await db.$disconnect(); }
