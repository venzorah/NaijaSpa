import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
if (process.getuid?.() !== 0) throw new Error("Run as root on the target VPS");
const url = new URL(process.env.DATABASE_URL);
if (url.hostname !== "127.0.0.1" || url.port !== "5432" || url.pathname !== "/naijaspa") throw new Error("Unexpected target database");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const db = new PrismaClient({ log: [] });
const filename = "/srv/naijaspa/shared/seeded-login-credentials.json";
try {
  if (fs.existsSync(filename)) throw new Error("Credential handoff already exists; no passwords changed");
  const emails = ["super.admin", "ops", "verify", "support", "finance", "content", "marketing", "moderator", "analyst", "customer", "paid.vendor", "free.vendor"].map((name) => `${name}@naijaspa.com`);
  const users = await db.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true, role: true, passwordHash: true } });
  const credentials = [];
  const updates = [];
  const backup = [];
  for (const user of users) {
    if (!user.passwordHash || !await bcrypt.compare("NaijaSpa!dev", user.passwordHash)) continue;
    const password = `${randomBytes(20).toString("base64url")}!9aZ`;
    credentials.push({ email: user.email, role: user.role, password });
    backup.push({ id: user.id, passwordHash: user.passwordHash });
    updates.push({ id: user.id, passwordHash: await bcrypt.hash(password, 12) });
  }
  fs.writeFileSync(filename, JSON.stringify(credentials, null, 2), { mode: 0o600, flag: "wx" });
  fs.writeFileSync("/srv/naijaspa/shared/seeded-password-hash-backup.json", JSON.stringify(backup), { mode: 0o600, flag: "wx" });
  await db.$transaction(updates.map((user) => db.user.update({ where: { id: user.id }, data: { passwordHash: user.passwordHash } })));
  console.log(JSON.stringify({ seededAccountsSecured: updates.length, personalAccountsChanged: 0, credentialsPrinted: false }));
} finally { await db.$disconnect(); }
