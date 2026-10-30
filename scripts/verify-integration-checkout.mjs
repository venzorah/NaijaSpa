// Verify only the isolated sandbox checkout created by test-local-integrations.mjs.
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
assert(process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_test_"), "Paystack test key required");
assert(["localhost", "127.0.0.1", "[::1]"].includes(new URL(process.env.DATABASE_URL).hostname), "Local database required");
const manifest = JSON.parse(await readFile(process.argv[2], "utf8"));
assert(/^integration-[a-f0-9]{12}$/.test(manifest.run), "Invalid test manifest");
assert.equal(manifest.vendorId, `${manifest.run}-vendor`);
assert(["localhost", "127.0.0.1"].includes(new URL(manifest.base).hostname), "Local app required");
const db = new PrismaClient({ log: [] });
try {
  const booking = await db.booking.findUniqueOrThrow({ where: { id: manifest.bookingId } });
  assert.equal(booking.vendorId, manifest.vendorId);
  const session = await db.session.findFirst({ where: { userId: booking.customerId, expiresAt: { gt: new Date() } } });
  assert(session, "Test session expired");
  const verify = async () => {
    const res = await fetch(`${manifest.base}/api/payments/verify?reference=${encodeURIComponent(manifest.reference)}`, {
      headers: { Cookie: `naijaspa_session=${session.token}` }, signal: AbortSignal.timeout(30000)
    });
    assert.equal(res.status, 200, "Checkout verification failed");
    return res.json();
  };
  const payment = await verify();
  if (payment.status !== "success") {
    console.log(JSON.stringify({ check: "sandbox-card-payment", complete: false, paymentStatus: payment.status, checkoutUrl: manifest.checkoutUrl }));
  } else {
    await Promise.all([verify(), verify()]);
    const current = await db.booking.findUniqueOrThrow({ where: { id: booking.id } });
    const earnings = await db.vendorEarning.count({ where: { bookingId: booking.id } });
    const confirmations = await db.bookingStatusEvent.count({ where: { bookingId: booking.id, toStatus: "confirmed" } });
    assert(["confirmed", "in_progress", "completed"].includes(current.status));
    assert.equal(earnings, 1);
    assert.equal(confirmations, 1);
    console.log(JSON.stringify({ check: "sandbox-card-payment", ok: true, verifiedByPaystack: true, amountKobo: payment.amountKobo, bookingStatus: current.status, earnings, confirmationEvents: confirmations }));
  }
} catch (e) {
  process.exitCode = 1;
  console.log(JSON.stringify({ check: "sandbox-card-payment", ok: false, code: e.code || e.name, detail: e instanceof assert.AssertionError ? e.message : "Diagnostic details omitted to protect credentials" }));
} finally { await db.$disconnect(); }
