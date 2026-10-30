import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
assert(process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_test_"), "Paystack TEST key required");
assert(["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL).hostname), "Local database required");
const m = JSON.parse(await readFile(process.argv[2], "utf8"));
if (process.env.TEST_APP_URL) m.base = process.env.TEST_APP_URL;
assert(/^integration-[a-f0-9]{12}$/.test(m.run));
assert.equal(m.vendorId, `${m.run}-vendor`);
assert(["localhost", "127.0.0.1"].includes(new URL(m.base).hostname));
const db = new PrismaClient({ log: [] });
// Paystack's sandbox API instructs using code 001 for test bank resolution.
const bankCode = "001";
const accountNumber = "0000000000";
try {
  const booking = await db.booking.findUniqueOrThrow({ where: { id: m.bookingId }, include: { payments: true } });
  assert.equal(booking.vendorId, m.vendorId);
  assert(booking.payments.some((p) => p.status === "success" && p.reference === m.reference), "Complete card payment first");
  const session = await db.session.findFirst({ where: { userId: `${m.run}-owner`, expiresAt: { gt: new Date() } } });
  assert(session, "Test vendor session expired");
  const call = async (path, body) => {
    const response = await fetch(`${m.base}${path}`, {
      method: body ? "POST" : "GET", headers: { Cookie: `naijaspa_session=${session.token}`, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000)
    });
    const data = await response.json();
    return { status: response.status, data };
  };
  const account = await call("/api/vendor/payout-account");
  assert.equal(account.status, 200);
  assert(account.data.banks.length > 0);
  const resolved = await call("/api/vendor/payout-account", { bankCode, accountNumber, verifyOnly: true });
  const canResolve = resolved.status === 200 && Boolean(resolved.data.accountName);
  console.log(JSON.stringify({ check: "paystack-sandbox-bank-resolution", ok: canResolve, bankCode,
    ...(canResolve ? { accountResolved: true } : { providerMessage: resolved.data.error || "No provider detail" }) }));
  if (canResolve && (!account.data.account.ready || account.data.account.accountNumber !== accountNumber || account.data.account.bankCode !== bankCode)) {
    if (process.argv.includes("--provider-recipient-fixture")) {
      // A separate gateway test: Paystack's published Zenith transfer sample.
      // This intentionally bypasses the app's account-verification step for this
      // isolated fixture, so it does not count as an onboarding pass.
      const response = await fetch("https://api.paystack.co/transferrecipient", {
        method: "POST", headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ type: "nuban", name: "Integration sandbox fixture", bank_code: "057", account_number: "0000000000", currency: "NGN" }),
        signal: AbortSignal.timeout(20000)
      });
      const recipient = await response.json();
      assert(response.ok && recipient.status && recipient.data?.recipient_code, `Gateway sample recipient failed: ${recipient.message || response.status}`);
      await db.vendor.update({ where: { id: m.vendorId }, data: {
        payoutBankCode: "057", payoutBankName: "Zenith Bank", payoutAccountNumber: "0000000000",
        payoutAccountName: "Integration sandbox fixture", payoutRecipientCode: recipient.data.recipient_code
      } });
      console.log(JSON.stringify({ check: "direct-gateway-sandbox-recipient-fixture", ok: true, appOnboardingBypassed: true }));
    } else {
      const saved = await call("/api/vendor/payout-account", { bankCode, accountNumber });
      assert.equal(saved.status, 200, `Recipient creation failed: ${saved.status}`);
      assert(saved.data.account.ready);
    }
  }
  if (canResolve) console.log(JSON.stringify({ check: "paystack-sandbox-recipient", ok: true }));
  else {
    // Exercise the safe queue while provider resolution is unavailable.
    await db.vendor.update({ where: { id: m.vendorId }, data: {
      payoutAccountNumber: null, payoutRecipientCode: null, payoutAccountName: null, payoutBankCode: null, payoutBankName: null
    } });
  }
  const response = await fetch(`${m.base}/api/vendor/bookings/${booking.id}`, {
    method: "PATCH", headers: { Cookie: `naijaspa_session=${session.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ status: "completed" }), signal: AbortSignal.timeout(30000)
  });
  assert.equal(response.status, 200, `Visit completion failed: ${response.status}`);
  const earning = await db.vendorEarning.findUniqueOrThrow({ where: { bookingId: booking.id }, include: { payout: true } });
  assert(earning.payout, "Payout was not created");
  if (!canResolve) assert.equal(earning.payout.status, "needs_account");
  console.log(JSON.stringify({ check: canResolve ? "paystack-sandbox-transfer" : "payout-safe-queue-without-bank-account", ok: canResolve ? ["paid", "pending", "otp"].includes(earning.payout.status) : earning.payout.status === "needs_account", bookingCompleted: true,
    paid: earning.payout.status === "paid", approvalRequired: earning.payout.status === "otp",
    payoutStatus: earning.payout.status, earningStatus: earning.status, amountKobo: earning.payout.amountKobo,
    ...(earning.payout.status === "failed" ? { providerMessage: earning.payout.note } : {}) }));
  if (earning.payout.status === "failed") process.exitCode = 1;
} catch (e) {
  process.exitCode = 1;
  console.log(JSON.stringify({ check: "sandbox-payout", ok: false, code: e.code || e.name,
    detail: e instanceof assert.AssertionError ? e.message : "Diagnostic details omitted to protect credentials" }));
} finally { await db.$disconnect(); }
