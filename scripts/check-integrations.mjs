// Read-only diagnostics. Never prints credentials or sends mail/charges/transfers.
import { createRequire } from "node:module";
import { readdir } from "node:fs/promises";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient, Prisma } = require("@prisma/client");
const only = process.argv.find((a) => a.startsWith("--only="))?.split("=")[1];
const selected = (name) => !only || only === name;
const configured = (key) => Boolean(process.env[key]?.trim());
function emit(check, result) { console.log(JSON.stringify({ check, ...result })); }
function failure(check, error) {
  process.exitCode = 1;
  emit(check, { ok: false, error: error?.code || error?.cause?.code || error?.name || "UnknownError",
    ...(check === "smtp" && Number.isInteger(error?.responseCode) ? { smtpResponseCode: error.responseCode } : {}) });
}

if (selected("config")) {
  const secret = process.env.PAYSTACK_SECRET_KEY || "";
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || process.env.PAYSTACK_PUBLIC_KEY || "";
  const mode = (key, prefix) => key.startsWith(`${prefix}_test_`) ? "test" : key.startsWith(`${prefix}_live_`) ? "live" : key ? "unrecognized" : "missing";
  emit("config", {
    database: configured("DATABASE_URL"), directDatabase: configured("DIRECT_URL"),
    demoListings: process.env.USE_DEMO_LISTINGS === "true",
    authSecret: configured("AUTH_SECRET") && !/replace|dev-secret/i.test(process.env.AUTH_SECRET),
    paystackSecretMode: mode(secret, "sk"), paystackPublicMode: mode(publicKey, "pk"),
    googleOAuth: configured("GOOGLE_CLIENT_ID") && configured("GOOGLE_CLIENT_SECRET"),
    smtp: configured("SMTP_HOST") && configured("SMTP_USER") && configured("SMTP_PASS"),
    resend: configured("RESEND_API_KEY"), openai: configured("OPENAI_API_KEY"), gemini: configured("GEMINI_API_KEY"),
    push: configured("VAPID_PUBLIC_KEY") && configured("VAPID_PRIVATE_KEY"),
    jobSecret: ["CRON_SECRET", "INTERNAL_JOB_SECRET"].some((k) => configured(k) && !/replace/i.test(process.env[k]))
  });
}

const checks = [];
if (selected("database")) checks.push((async () => {
  const db = new PrismaClient({ log: [] });
  try {
    await db.$queryRaw`SELECT 1`;
    const tables = await db.$queryRaw`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`;
    const columns = new Set(tables.map((r) => `${r.table_name}.${r.column_name}`));
    const missing = Prisma.dmmf.datamodel.models.flatMap((m) => m.fields
      .filter((f) => f.kind !== "object" && !columns.has(`${m.dbName || m.name}.${f.dbName || f.name}`))
      .map((f) => `${m.name}.${f.name}`));
    const migrations = await db.$queryRaw`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"`;
    const local = (await readdir("prisma/migrations", { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
    const applied = new Set(migrations.filter((m) => m.finished_at && !m.rolled_back_at).map((m) => m.migration_name));
    const pending = local.filter((m) => !applied.has(m));
    emit("database", { ok: !missing.length && !pending.length, connected: true, missingColumns: missing, pendingMigrations: pending });
    if (missing.length || pending.length) process.exitCode = 1;
    const [users, vendors, services, bookings, payments] = await Promise.all([
      db.user.count(), db.vendor.count(), db.service.count(), db.booking.count(), db.payment.count()
    ]);
    emit("database-record-counts", { users, vendors, services, bookings, payments });
  } catch (e) { failure("database", e); } finally { await db.$disconnect(); }
})());

if (selected("paystack")) checks.push((async () => {
  if (!configured("PAYSTACK_SECRET_KEY")) return emit("paystack", { skipped: "Secret key missing" });
  try {
    const response = await fetch("https://api.paystack.co/bank?currency=NGN&country=nigeria", {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }, signal: AbortSignal.timeout(15000)
    });
    const body = await response.json();
    emit("paystack", { ok: response.ok && body.status === true, httpStatus: response.status, banks: Array.isArray(body.data) ? body.data.length : 0 });
    if (!response.ok || body.status !== true) process.exitCode = 1;
  } catch (e) { failure("paystack", e); }
})());

if (selected("smtp")) checks.push((async () => {
  if (!["SMTP_HOST", "SMTP_USER", "SMTP_PASS"].every(configured)) return emit("smtp", { skipped: "SMTP credentials incomplete" });
  let transport;
  try {
    transport = require("nodemailer").createTransport({
      host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 465),
      secure: process.env.SMTP_SECURE !== "false", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 15000
    });
    await transport.verify();
    emit("smtp", { ok: true, authenticated: true, emailSent: false });
  } catch (e) { failure("smtp", e); } finally { transport?.close(); }
})());
await Promise.all(checks);
