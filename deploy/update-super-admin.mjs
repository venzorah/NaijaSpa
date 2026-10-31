import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
if (process.getuid?.() !== 0) throw new Error("Run as root on the VPS");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const db = new PrismaClient({ log: [] });
const inputPath = "/srv/naijaspa/shared/admin-account-update.json";
const handoffPath = "/srv/naijaspa/shared/seeded-login-credentials.json";
const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || typeof input.password !== "string" || input.password.length < 8) throw new Error("Valid email and password required");
try {
  const previous = await db.user.findUnique({ where: { email: "super.admin@naijaspa.com" } });
  if (!previous || previous.role !== "super_admin") throw new Error("Expected super-admin account not found; no changes made");
  const collision = await db.user.findUnique({ where: { email: input.email.toLowerCase() }, select: { id: true } });
  if (collision && collision.id !== previous.id) throw new Error("That email already belongs to another account; no changes made");
  const passwordHash = await bcrypt.hash(input.password, 12);
  fs.writeFileSync("/srv/naijaspa/shared/super-admin-change-backup.json", JSON.stringify({ id: previous.id, email: previous.email, passwordHash: previous.passwordHash, emailVerifiedAt: previous.emailVerifiedAt }), { mode: 0o600, flag: "wx" });
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${previous.id} FOR NO KEY UPDATE`;
    await tx.user.update({ where: { id: previous.id }, data: { email: input.email.toLowerCase(), passwordHash, emailVerifiedAt: null } });
    await tx.session.deleteMany({ where: { userId: previous.id } });
    await tx.auditLog.create({ data: { actorId: previous.id, action: "admin.credentials.update", entityType: "User", entityId: previous.id,
      beforeJson: JSON.stringify({ email: previous.email, role: previous.role }), afterJson: JSON.stringify({ email: input.email.toLowerCase(), role: "super_admin" }) } });
  });
  const credentials = JSON.parse(fs.readFileSync(handoffPath, "utf8"));
  const record = credentials.find((row) => row.email === previous.email && row.role === "super_admin");
  if (!record) throw new Error("Credential handoff entry missing; inspect protected backup");
  record.email = input.email.toLowerCase(); record.password = input.password;
  fs.writeFileSync(`${handoffPath}.next`, JSON.stringify(credentials, null, 2), { mode: 0o600, flag: "wx" });
  fs.renameSync(`${handoffPath}.next`, handoffPath);
  const login = await fetch("https://naijaspa.com/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: input.email.toLowerCase(), password: input.password, expect: "admin" }), signal: AbortSignal.timeout(20000) });
  if (login.status !== 200) throw new Error(`Login verification returned status ${login.status}`);
  const cookie = login.headers.getSetCookie().find((value) => value.startsWith("naijaspa_session="))?.split(";")[0];
  if (!cookie) throw new Error("Login session was not created");
  try {
    const page = await fetch("https://naijaspa.com/admin/categories", { headers: { Cookie: cookie }, signal: AbortSignal.timeout(20000) });
    if (page.status !== 200 || new URL(page.url).pathname !== "/admin/categories") throw new Error("Admin access verification failed");
    await page.arrayBuffer();
  } finally { await fetch("https://naijaspa.com/api/auth/logout", { method: "POST", headers: { Cookie: cookie }, signal: AbortSignal.timeout(10000) }); }
  fs.unlinkSync(inputPath);
  console.log(JSON.stringify({ updated: true, role: "super_admin", passwordLoginVerified: true, previousSessionsRevoked: true, credentialsPrinted: false }));
} finally { await db.$disconnect(); }
