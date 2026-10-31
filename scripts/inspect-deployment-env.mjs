import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const db = new URL(process.env.DATABASE_URL);
console.log(JSON.stringify({ database: { host: db.hostname, port: db.port || "5432", name: db.pathname.slice(1) }, appUrl: process.env.APP_URL,
  paymentMode: process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_test_") ? "test" : process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_live_") ? "live" : "unconfigured",
  configured: Object.fromEntries(["AUTH_SECRET", "OTP_HASH_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "GEMINI_API_KEY", "SMTP_PASS", "VAPID_PRIVATE_KEY", "R2_SECRET_ACCESS_KEY", "CRON_SECRET", "INTERNAL_JOB_SECRET"].map((key) => [key, Boolean(process.env[key])])) }));
