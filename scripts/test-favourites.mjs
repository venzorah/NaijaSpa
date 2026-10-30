import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { SignJWT } from "jose";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
assert(["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL).hostname));
const db = new PrismaClient({ log: [] });
const manifest = ".integration-tests/favourites-check.json";
const base = "http://127.0.0.1:3000";
let m;
let cleanup = false;
function report(check) { console.log(JSON.stringify({ check, ok: true })); }
try {
  if (process.argv.includes("--prepare-migration")) {
    const exists = await readFile(manifest, "utf8").then(() => true).catch(() => false);
    assert(!exists, "Verify or clean up the previous favourites fixture first");
    const run = `favourites-${randomBytes(6).toString("hex")}`;
    m = { run, user: `${run}-customer`, other: `${run}-other`, owner: `${run}-owner`, vendor: `${run}-vendor`, category: `${run}-category`, service: `${run}-service`, secondService: `${run}-second`, preferred: `${run}-preferred` };
    await mkdir(".integration-tests", { recursive: true });
    await writeFile(manifest, JSON.stringify(m));
    for (const id of [m.user, m.other, m.owner]) await db.user.create({ data: { id, email: `${id}@example.com`, name: "Favourites fixture", role: id === m.owner ? "vendor_owner" : "customer" } });
    await db.vendor.create({ data: { id: m.vendor, ownerId: m.owner, slug: m.vendor, businessName: "Favourites fixture", city: "Lagos", neighbourhood: "Test", address: "Test" } });
    await db.category.create({ data: { id: m.category, slug: m.category, name: "Favourites fixture" } });
    for (const id of [m.service, m.secondService]) await db.service.create({ data: { id, vendorId: m.vendor, categoryId: m.category, slug: id, name: "Favourites fixture", durationMin: 60, basePriceKobo: 10000 } });
    await db.favourite.createMany({ data: [
      { userId: m.user }, { userId: m.user, serviceId: m.service }, { userId: m.user, serviceId: m.service },
      { id: m.preferred, userId: m.user, serviceId: m.service, vendorId: m.vendor },
      { userId: m.user, vendorId: m.vendor }, { userId: m.user, vendorId: m.vendor }
    ] });
    report("prepared-old-duplicate-and-empty-favourites");
  } else {
    m = JSON.parse(await readFile(manifest, "utf8"));
    assert(/^favourites-[a-f0-9]{12}$/.test(m.run));
    for (const field of ["user", "other", "owner", "vendor", "category", "service", "secondService", "preferred"]) assert(m[field].startsWith(`${m.run}-`));
    cleanup = true;
    assert.equal(await db.favourite.count({ where: { userId: m.user } }), 2);
    assert(await db.favourite.findUnique({ where: { id: m.preferred } }));
    report("migration-removes-empty-and-duplicate-targets");
    const cookie = async (userId) => {
      const token = await new SignJWT({ id: userId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("10m").sign(new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me"));
      await db.session.create({ data: { userId, token, expiresAt: new Date(Date.now() + 600_000) } }); return `naijaspa_session=${token}`;
    };
    const own = await cookie(m.user), other = await cookie(m.other);
    const save = async (body, auth = own) => {
      const response = await fetch(`${base}/api/favourites`, { method: "POST", headers: { Cookie: auth, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000) });
      return { status: response.status, data: await response.json() };
    };
    for (const body of [{}, { vendorId: "" }, { serviceId: " " }, { serviceId: null }, { serviceId: m.service, vendorId: "mismatch" }]) assert.equal((await save(body)).status, 400);
    for (const body of [{ serviceId: "missing" }, { vendorId: "missing" }]) assert.equal((await save(body)).status, 404);
    report("api-rejects-empty-missing-and-mismatched-targets");
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) => save({ serviceId: m.secondService, ...(i % 2 ? { vendorId: m.vendor } : {}) })));
    assert(results.every((r) => r.status === 200)); assert.equal(new Set(results.map((r) => r.data.item.id)).size, 1);
    assert.equal(await db.favourite.count({ where: { userId: m.user, serviceId: m.secondService } }), 1);
    report("concurrent-service-saves-create-one-favourite");
    await db.favourite.deleteMany({ where: { userId: m.user, vendorId: m.vendor, serviceId: null } });
    const providers = await Promise.all(Array.from({ length: 4 }, () => save({ vendorId: m.vendor })));
    assert(providers.every((r) => r.status === 200)); assert.equal(new Set(providers.map((r) => r.data.item.id)).size, 1);
    assert.equal(await db.favourite.count({ where: { userId: m.user, vendorId: m.vendor } }), 3);
    report("provider-only-saves-stay-distinct-from-two-treatment-saves");
    assert.equal((await save({ serviceId: m.service }, other)).status, 200);
    assert.equal(await db.favourite.count({ where: { userId: m.other, serviceId: m.service } }), 1);
    assert.equal((await save({ serviceId: m.service }, "")).status, 401);
    report("favourites-remain-account-scoped");
    for (const data of [{ userId: m.user, serviceId: m.service }, { userId: m.user, vendorId: m.vendor }]) {
      let blocked = false;
      try { await db.favourite.create({ data }); } catch (error) { blocked = error.code === "P2002"; }
      assert(blocked, "Database must reject duplicate targets");
    }
    let emptyBlocked = false;
    try { await db.favourite.create({ data: { userId: m.user } }); } catch { emptyBlocked = true; }
    assert(emptyBlocked, "Database must reject empty targets");
    report("database-enforces-target-and-uniqueness-rules");
  }
} catch (error) {
  process.exitCode = 1;
  console.error(JSON.stringify({ check: "favourites", ok: false, detail: error instanceof assert.AssertionError ? error.message : "Favourites check failed; credentials omitted" }));
} finally {
  if (cleanup && m) {
    await db.favourite.deleteMany({ where: { userId: { in: [m.user, m.other] } } });
    await db.user.deleteMany({ where: { id: { in: [m.user, m.other, m.owner] } } });
    await db.category.deleteMany({ where: { id: m.category } });
    await unlink(manifest);
  }
  await db.$disconnect();
}
