import { loadEnvConfig } from "@next/env";
import { randomBytes, randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import assert from "node:assert/strict";

loadEnvConfig(process.cwd());
assert(["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL!).hostname), "Local database required");
async function main() {
  const { prisma: db } = await import("../src/lib/db");
  const { issuePasswordReset } = await import("../src/lib/password-reset");
  const { persistSessionRecord } = await import("../src/lib/session-store");
  const run = `otp-security-${randomBytes(6).toString("hex")}`;
  const ids = ["race", "attempts", "expired", "resend", "other"].map((name) => `${run}-${name}`);
  const originalPassword = randomBytes(16).toString("hex");
  const passwordHash = await bcrypt.hash(originalPassword, 12);
  const base = "http://127.0.0.1:3000";
  const email = (id: string) => `${id}@example.com`;
  const report = (check: string) => console.log(JSON.stringify({ check, ok: true }));
  const reset = async (id: string, otp: string, password = randomBytes(16).toString("hex")) => {
    const response = await fetch(`${base}/api/auth/reset`, { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.250" }, body: JSON.stringify({ email: email(id), otp, password }), signal: AbortSignal.timeout(60000) });
    return { status: response.status, password };
  };
  const session = async (userId: string) => {
    const token = await new SignJWT({ id: userId }).setProtectedHeader({ alg: "HS256" }).setJti(randomUUID()).setIssuedAt().setExpirationTime("10m").sign(new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me"));
    await db.session.create({ data: { userId, token, expiresAt: new Date(Date.now() + 600_000) } });
    return `naijaspa_session=${token}`;
  };
  const authenticated = async (cookie: string) => (await fetch(`${base}/api/bookings`, { headers: { Cookie: cookie }, signal: AbortSignal.timeout(60000) })).status;
  try {
    for (const id of ids) await db.user.create({ data: { id, email: email(id), name: "OTP security fixture", role: "customer", passwordHash } });
    const oldSession = await session(ids[0]), otherSession = await session(ids[4]);
    assert.equal(await authenticated(oldSession), 200);
    const issued = await Promise.all(Array.from({ length: 3 }, () => issuePasswordReset(ids[0])));
    assert.equal(issued.filter(Boolean).length, 1);
    assert.equal(await db.passwordReset.count({ where: { userId: ids[0], usedAt: null } }), 1);
    report("concurrent-issuance-creates-one-current-challenge");
    const challenge = issued.find((row) => row)!;
    const outcomes = await Promise.all([reset(ids[0], challenge.code), reset(ids[0], challenge.code)]);
    assert.deepEqual(outcomes.map((r) => r.status).sort(), [200, 400]);
    const winner = outcomes.find((r) => r.status === 200)!, loser = outcomes.find((r) => r.status === 400)!;
    const updated = await db.user.findUniqueOrThrow({ where: { id: ids[0] } });
    assert(await bcrypt.compare(winner.password, updated.passwordHash!));
    assert(!await bcrypt.compare(loser.password, updated.passwordHash!));
    assert.equal((await reset(ids[0], challenge.code)).status, 400);
    report("concurrent-reset-consumes-code-once");
    assert.equal(await authenticated(oldSession), 401);
    assert.equal(await authenticated(otherSession), 200);
    assert.equal(await db.session.count({ where: { userId: ids[0] } }), 0);
    report("reset-revokes-only-the-target-accounts-sessions");
    await assert.rejects(persistSessionRecord(ids[0], randomUUID(), new Date(Date.now() + 600_000), passwordHash), (error: unknown) => typeof error === "object" && error !== null && "status" in error && error.status === 401);
    assert.equal(await db.session.count({ where: { userId: ids[0] } }), 0);
    report("stale-password-login-cannot-recreate-a-revoked-session");
    const login = async (password: string) => fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": "203.0.113.250" }, body: JSON.stringify({ email: email(ids[0]), password, expect: "customer" }), signal: AbortSignal.timeout(60000) });
    assert.equal((await login(originalPassword)).status, 401);
    const newLogin = await login(winner.password); assert.equal(newLogin.status, 200);
    const newCookie = newLogin.headers.get("set-cookie")?.split(";")[0]; assert(newCookie);
    assert.equal(await authenticated(newCookie), 200);
    report("new-password-login-works-and-old-password-fails");
    const attempt = (await issuePasswordReset(ids[1]))!;
    const wrong = attempt.code === "000000" ? "111111" : "000000";
    const wrongResults = await Promise.all(Array.from({ length: 5 }, () => reset(ids[1], wrong)));
    assert(wrongResults.every((result) => result.status === 400));
    const exhausted = await db.passwordReset.findUniqueOrThrow({ where: { id: attempt.id } });
    assert.equal(exhausted.failedAttempts, 5); assert(exhausted.usedAt);
    assert.equal((await reset(ids[1], attempt.code)).status, 400);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: ids[1] } })).passwordHash, passwordHash);
    report("five-wrong-guesses-retire-challenge-without-password-change");
    const expired = (await issuePasswordReset(ids[2]))!;
    await db.passwordReset.update({ where: { id: expired.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await reset(ids[2], expired.code)).status, 400);
    report("expired-code-rejected-by-real-api");
    const first = (await issuePasswordReset(ids[3]))!;
    assert.equal(await issuePasswordReset(ids[3]), null);
    await db.passwordReset.update({ where: { id: first.id }, data: { createdAt: new Date(Date.now() - 61_000) } });
    const replacement = await issuePasswordReset(ids[3]); assert(replacement);
    assert((await db.passwordReset.findUniqueOrThrow({ where: { id: first.id } })).usedAt);
    assert.equal(await db.passwordReset.count({ where: { userId: ids[3], usedAt: null } }), 1);
    assert.equal((await reset(ids[3], `${replacement.code}999`)).status, 400);
    assert.equal((await db.passwordReset.findUniqueOrThrow({ where: { id: replacement.id } })).failedAttempts, 0);
    report("resend-cooldown-supersession-and-strict-code-validation");
  } catch (error) {
    process.exitCode = 1;
    console.error(JSON.stringify({ check: "otp-security", ok: false, detail: error instanceof assert.AssertionError ? error.message : "Security check failed; secrets omitted" }));
  } finally {
    await db.auditLog.deleteMany({ where: { actorId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await db.$disconnect();
  }
}
main().catch(() => { console.error("OTP security check could not complete; secrets omitted"); process.exitCode = 1; });
