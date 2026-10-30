// Synthetic signed events exercise subscription fulfillment against real local DB transactions.
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import crypto from "node:crypto";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
assert(process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_test_"), "Paystack TEST key required");
assert(["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL).hostname));
const m = JSON.parse(await readFile(process.argv[2], "utf8"));
assert(/^integration-[a-f0-9]{12}$/.test(m.run));
assert.equal(m.vendorId, `${m.run}-vendor`);
assert(["localhost", "127.0.0.1"].includes(new URL(m.base).hostname));
const db = new PrismaClient({ log: [] });
const reference = `${m.run}-subscription-${crypto.randomBytes(4).toString("hex")}`;
try {
  assert.equal(await db.vendorSubscription.count({ where: { vendorId: m.vendorId } }), 0, "Fixture already has a subscription");
  const plan = await db.subscriptionPlan.findFirstOrThrow({ where: { code: { not: "FREE" }, active: true, priceKobo: { gt: 0 } } });
  await db.payment.create({ data: {
    provider: "integration_fixture", purpose: "subscription", amountKobo: plan.priceKobo, currency: "NGN", status: "pending",
    reference, idempotencyKey: reference, rawPayload: JSON.stringify({ metadata: { vendorId: m.vendorId, planCode: plan.code } })
  } });
  const raw = JSON.stringify({ event: "charge.success", data: { reference, id: "synthetic-subscription-provider", amount: plan.priceKobo, currency: "NGN" } });
  const signature = crypto.createHmac("sha512", process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY).update(raw).digest("hex");
  const send = () => fetch(`${m.base}/api/payments/webhook`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-paystack-signature": signature }, body: raw, signal: AbortSignal.timeout(30000)
  });
  const deliveries = await Promise.all([send(), send()]);
  assert(deliveries.every((r) => r.status === 200), "Subscription webhook failed");
  const payment = await db.payment.findUniqueOrThrow({ where: { reference } });
  assert.equal(payment.status, "success");
  assert(payment.subscriptionId);
  assert.equal(await db.vendorSubscription.count({ where: { vendorId: m.vendorId } }), 1);
  const sub = await db.vendorSubscription.findUniqueOrThrow({ where: { id: payment.subscriptionId } });
  assert.equal(sub.planId, plan.id);
  assert.equal(sub.status, "active");
  assert.equal(sub.endsAt.getTime() - sub.startsAt.getTime(), plan.durationDays * 86400000);
  console.log(JSON.stringify({ check: "real-db-subscription-fulfillment", ok: true, syntheticEvent: true, gatewayCharge: false, duplicateDeliveries: 2, subscriptionsCreated: 1, paymentLinked: true }));
} catch (e) {
  process.exitCode = 1;
  console.log(JSON.stringify({ check: "real-db-subscription-fulfillment", ok: false, code: e.code || e.name, detail: e instanceof assert.AssertionError ? e.message : "Diagnostic details omitted to protect credentials" }));
} finally {
  await db.payment.deleteMany({ where: { reference } });
  // Only the isolated fixture vendor can have been changed by this script.
  await db.vendorSubscription.deleteMany({ where: { vendorId: m.vendorId, source: "paystack" } });
  await db.$disconnect();
}
