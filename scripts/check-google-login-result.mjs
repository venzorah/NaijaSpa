// Read-only confirmation that Google login created a verified user and session.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient({ log: [] });
try {
  const since = new Date(Date.now() - 30 * 60_000);
  const linkedAccounts = await db.user.count({ where: { googleId: { not: null }, emailVerifiedAt: { not: null } } });
  const sessions = await db.session.count({ where: {
    createdAt: { gte: since }, expiresAt: { gt: new Date() },
    user: { googleId: { not: null }, emailVerifiedAt: { not: null }, status: "active" }
  } });
  console.log(JSON.stringify({ check: "google-login-database-result", verifiedGoogleAccounts: linkedAccounts,
    recentGoogleAccountSessions: sessions, successfulSessionRecorded: sessions > 0 }));
} catch (error) {
  process.exitCode = 1;
  console.log(JSON.stringify({ check: "google-login-database-result", ok: false, code: error.code || error.name }));
} finally { await db.$disconnect(); }
