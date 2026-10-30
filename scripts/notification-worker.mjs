// Run alongside the local app, or call /api/jobs/notifications every minute from
// your deployment's scheduler. Authentication values are never printed.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const base = process.env.APP_URL || "http://localhost:3000";
const secret = process.env.CRON_SECRET || process.env.INTERNAL_JOB_SECRET;
if (!secret) throw new Error("Configure CRON_SECRET or INTERNAL_JOB_SECRET");
async function tick() {
  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/api/jobs/notifications`, { method: "POST", headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(55000) });
    const data = await response.json();
    console.log(JSON.stringify({ check: "notification-worker", status: response.status, configured: data.configured, processed: data.processed, queued: data.queued }));
  } catch { console.log(JSON.stringify({ check: "notification-worker", ok: false, message: "Could not reach the notification job" })); }
}
await tick();
if (!process.argv.includes("--once")) { setInterval(() => void tick(), 60000); }
