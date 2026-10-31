// Run as root only against the newly staged NaijaSpa deployment.
// Secrets are written to protected files, never printed or passed on command lines.
import fs from "node:fs";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { parseEnv } from "node:util";
if (process.getuid?.() !== 0) throw new Error("Run as root on the target VPS");
const shared = "/srv/naijaspa/shared";
const original = fs.readFileSync(`${shared}/source.env`, "utf8");
const source = parseEnv(original);
const local = new URL(source.DATABASE_URL);
if (!["localhost", "127.0.0.1"].includes(local.hostname) || local.pathname !== "/naijaspa") throw new Error("Unexpected source database; migration stopped");
const pg = (sql) => {
  const result = spawnSync("runuser", ["-u", "postgres", "--", "psql", "-X", "-qAt", "-v", "ON_ERROR_STOP=1"], { input: sql, encoding: "utf8" });
  if (result.status !== 0) throw new Error("PostgreSQL preparation failed; inspect protected deployment logs");
  return result.stdout.trim();
};
if (fs.existsSync(`${shared}/prepared.json`)) {
  console.log("Existing NaijaSpa preparation preserved");
  process.exit(0);
}
if (pg("SELECT count(*) FROM pg_database WHERE datname='naijaspa';") !== "0" || pg("SELECT count(*) FROM pg_roles WHERE rolname='naijaspa';") !== "0") throw new Error("NaijaSpa database/role already exists; no changes made");
const password = crypto.randomBytes(36).toString("base64url");
let env = original;
const set = (key, value) => {
  const line = `${key}=${JSON.stringify(value)}`;
  const pattern = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=.*$`, "m");
  env = pattern.test(env) ? env.replace(pattern, () => line) : `${env}\n${line}\n`;
};
const url = `postgresql://naijaspa:${password}@127.0.0.1:5432/naijaspa?connection_limit=5`;
for (const [key, value] of Object.entries({ DATABASE_URL: url, DIRECT_URL: url, APP_URL: "https://naijaspa.com", NODE_ENV: "production", USE_DEMO_LISTINGS: "false", AUTH_SECRET: crypto.randomBytes(48).toString("base64url"), REDIS_URL: "redis://127.0.0.1:6379/15" })) set(key, value);
fs.writeFileSync(`${shared}/.env`, env, { mode: 0o600, flag: "wx" });
const esc = (value) => value.replaceAll("\\", "\\\\").replaceAll(":", "\\:");
fs.writeFileSync(`${shared}/source.pgpass`, `127.0.0.1:15433:${esc(local.pathname.slice(1))}:${esc(decodeURIComponent(local.username))}:${esc(decodeURIComponent(local.password))}\n`, { mode: 0o600, flag: "wx" });
pg(`CREATE ROLE naijaspa LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '${password}';\nCREATE DATABASE naijaspa OWNER naijaspa;`);
fs.writeFileSync(`${shared}/prepared.json`, JSON.stringify({ database: "naijaspa", role: "naijaspa", sourceUser: decodeURIComponent(local.username), preparedAt: new Date().toISOString() }), { mode: 0o600, flag: "wx" });
console.log(JSON.stringify({ prepared: true, separateDatabase: "naijaspa", secretsPrinted: false, paymentMode: source.PAYSTACK_SECRET_KEY?.startsWith("sk_test_") ? "test" : "other" }));
