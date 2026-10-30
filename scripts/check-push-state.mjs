import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient({ log: [] });
try {
  const users = await db.user.findMany({ where: { googleId: { not: null } }, select: { pushSubscriptions: { select: { endpoint: true } }, notificationPreferencesJson: true } });
  console.log(JSON.stringify({ check: "google-user-push-state", users: users.map((u) => ({ subscriptionCount: u.pushSubscriptions.length, services: u.pushSubscriptions.map((s) => new URL(s.endpoint).hostname), preferences: JSON.parse(u.notificationPreferencesJson) })) }));
  if (process.argv.includes("--send-test")) {
    const recipients = await db.user.findMany({ where: { googleId: { not: null }, status: "active" }, select: { id: true } });
    if (recipients.length !== 1) throw new Error("Exactly one Google test account required");
    const session = await db.session.findFirst({ where: { userId: recipients[0].id, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
    if (!session) throw new Error("Sign in first");
    const base = process.env.APP_URL || "http://localhost:3000";
    if (!["localhost", "127.0.0.1"].includes(new URL(base).hostname)) throw new Error("Local app required");
    const response = await fetch(`${base}/api/account/push/test`, { method: "POST", headers: { Cookie: `naijaspa_session=${session.token}` }, signal: AbortSignal.timeout(30000) });
    const data = await response.json();
    console.log(JSON.stringify({ check: "push-test", status: response.status, ...data }));
  }
} catch { process.exitCode = 1; console.log(JSON.stringify({ check: "push-state", ok: false })); }
finally { await db.$disconnect(); }
