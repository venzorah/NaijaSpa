// Functional audit against a local app/database. Only this run's fixture rows
// are changed or removed. Mail delivery and real financial transfers are excluded.
import { createRequire } from "node:module";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { chromium } from "playwright";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const sharp = require("sharp");
const base = process.env.FEATURE_TEST_URL || "http://localhost:3000";
assert(["localhost", "127.0.0.1"].includes(new URL(base).hostname), "Local app required");
assert(["localhost", "127.0.0.1"].includes(new URL(process.env.DATABASE_URL).hostname), "Local database required");
const db = new PrismaClient({ log: [] });
const run = `feature-${crypto.randomBytes(6).toString("hex")}`;
const id = (s) => `${run}-${s}`;
const roles = { customer: "customer", other: "customer", owner: "vendor_owner", second: "vendor_owner", admin: "super_admin", analyst: "analyst" };
const userIds = Object.keys(roles).map(id);
const vendors = [id("vendor"), id("second-vendor")];
const results = [], imageFiles = [], cookies = {};
const output = path.resolve(".integration-tests", run);
const password = crypto.randomBytes(20).toString("hex");
let category, service, booking, gallery, browser, livePage;
let bookingUser = id("customer");
const day = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
function clean(value) {
  let text = String(value || "");
  text = text.split(password).join("[redacted]");
  for (const name of ["AUTH_SECRET", "SMTP_PASS", "GOOGLE_CLIENT_SECRET", "GEMINI_API_KEY", "OPENAI_API_KEY", "PAYSTACK_SECRET_KEY"]) {
    if (process.env[name]) text = text.split(process.env[name]).join("[redacted]");
  }
  return text.replace(/([?&](?:code|state|token)=)[^&\s]+/gi, "$1[redacted]").slice(0, 500);
}
function record(name, status, detail = "") {
  const result = { name, status, detail: clean(detail) }; results.push(result);
  console.log(JSON.stringify(result));
}
async function check(name, fn) {
  try { const detail = await fn(); record(name, "PASS", detail || ""); }
  catch (e) {
    record(name, "FAIL", e.message || e.code || e.name || "Request failed");
    if (livePage) await livePage.screenshot({ path: path.join(output, `${name.replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 90)}.png`), fullPage: true, timeout: 5000 }).catch(() => {});
  }
}
async function api(url, who, body, method = body ? "POST" : "GET") {
  const response = await fetch(`${base}${url}`, {
    method, redirect: "manual", signal: AbortSignal.timeout(60000),
    headers: { ...(cookies[who] ? { Cookie: cookies[who] } : {}), ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}) },
    ...(body !== undefined ? { body: body instanceof FormData || typeof body === "string" ? body : JSON.stringify(body) } : {})
  });
  const text = await response.text();
  let data = null; try { data = JSON.parse(text); } catch { /* HTML/media */ }
  return { status: response.status, data, text, headers: response.headers };
}
function ok(result) { assert.equal(result.status, 200, `${result.status}: ${result.data?.error || "Unexpected response"}`); return result.data; }
async function pageStatus(url, who) {
  let next = url, result;
  for (let hop = 0; hop < 6; hop++) {
    result = await api(next, who);
    if (![301, 302, 303, 307, 308].includes(result.status)) break;
    const target = new URL(result.headers.get("location"), base);
    assert.equal(target.origin, new URL(base).origin);
    next = target.pathname + target.search;
  }
  assert.equal(result.status, 200, `Page ${url} returned ${result.status}`);
  assert(!/Application error: a (server|client)-side exception/.test(result.text));
  return result;
}
async function cleanup() {
  await browser?.close();
  await db.favourite.deleteMany({ where: { userId: { in: userIds } } });
  await db.review.deleteMany({ where: { userId: { in: userIds } } });
  const bookingIds = (await db.booking.findMany({ where: { vendorId: { in: vendors } }, select: { id: true } })).map((b) => b.id);
  await db.refund.deleteMany({ where: { bookingId: { in: bookingIds } } });
  await db.payout.deleteMany({ where: { vendorId: { in: vendors } } });
  await db.vendorEarning.deleteMany({ where: { vendorId: { in: vendors } } });
  await db.payment.deleteMany({ where: { OR: [{ bookingId: { in: bookingIds } }, { reference: { startsWith: run } }] } });
  await db.booking.deleteMany({ where: { id: { in: bookingIds } } });
  await db.supportTicket.deleteMany({ where: { authorId: { in: userIds } } });
  await db.timeOff.deleteMany({ where: { staffId: { startsWith: run } } });
  await db.availabilitySlot.deleteMany({ where: { vendorId: { in: vendors } } });
  await db.aiSearchLog.deleteMany({ where: { userId: { in: userIds } } });
  await db.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
  await db.user.deleteMany({ where: { id: { in: userIds } } });
  await db.category.deleteMany({ where: { slug: id("category") } });
  await db.cmsBlock.deleteMany({ where: { key: id("page") } });
  for (const file of imageFiles) {
    const root = path.resolve("uploads", "galleries");
    const target = path.resolve(root, vendors[0], file);
    assert(target.startsWith(root + path.sep));
    await unlink(target).catch(() => {});
  }
}

try {
  await mkdir(output, { recursive: true });
  const hash = await bcrypt.hash(password, 12);
  for (const [name, role] of Object.entries(roles)) await db.user.create({ data: { id: id(name), email: `${id(name)}@example.com`, name: `Feature ${name}`, passwordHash: hash, role } });
  for (const [index, owner] of ["owner", "second"].entries()) await db.vendor.create({ data: {
    id: vendors[index], ownerId: id(owner), slug: vendors[index], businessName: `Feature Studio ${run}`, city: "Lagos", neighbourhood: "Lekki",
    address: "Feature test address", applicationStatus: index ? "draft" : "approved", visibility: index ? "hidden" : "public",
    privatePhone: "PRIVATE-FEATURE-PHONE", privateWhatsapp: "PRIVATE-FEATURE-WHATSAPP"
  } });
  for (const name of Object.keys(roles)) {
    const login = await api("/api/auth/login", null, { email: `${id(name)}@example.com`, password });
    ok(login); cookies[name] = login.headers.get("set-cookie")?.split(";")[0]; assert(cookies[name]);
  }
  record("Password login and sessions for customer, vendor, admin and analyst", "PASS");

  await check("Invalid password rejected", async () => assert.equal((await api("/api/auth/login", null, { email: `${id("customer")}@example.com`, password: "incorrect-password" })).status, 401));
  await check("Registration rejects malformed email and weak password", async () => assert.equal((await api("/api/auth/register", null, { name: "Feature", email: "invalid", password: "short" })).status, 400));
  await check("Expired/incorrect password-reset code rejected", async () => assert.equal((await api("/api/auth/reset", null, { email: `${id("customer")}@example.com`, otp: "123456", password: "New-feature-password-123" })).status, 400));
  await check("Customer cannot access admin or vendor APIs", async () => {
    assert.equal((await api("/api/admin/ai", "customer")).status, 403);
    assert.equal((await api("/api/vendor/availability", "customer")).status, 403);
  });
  await check("Admin creates and publishes category", async () => {
    category = ok(await api("/api/admin/categories", "admin", { name: `Feature category ${run}`, slug: id("category") })).category;
    ok(await api(`/api/admin/categories/${category.id}`, "admin", { active: true }, "PATCH"));
  });
  assert(category, "Category setup failed");
  await check("Vendor creates and edits a service", async () => {
    service = ok(await api("/api/vendor/services", "owner", { name: `Feature Massage ${run}`, categoryId: category.id, basePriceKobo: 1000000, durationMin: 60, hotelAddonKobo: 200000, homeAddonKobo: 300000 })).service;
    ok(await api("/api/vendor/services", "owner", { id: service.id, description: "Feature-test treatment" }, "PATCH"));
    assert((await db.service.findUnique({ where: { id: service.id } })).description.includes("Feature-test"));
  });
  assert(service, "Service setup failed");
  await check("Another vendor cannot edit this service", async () => assert.equal((await api("/api/vendor/services", "second", { id: service.id, basePriceKobo: 1 }, "PATCH")).status, 404));
  await check("Vendor staff creation and deactivation", async () => {
    const staff = ok(await api("/api/vendor/staff", "owner", { name: "Feature therapist", title: "Therapist" })).staff;
    ok(await api("/api/vendor/staff", "owner", { id: staff.id, active: false }, "PATCH"));
    assert.equal((await db.vendorStaff.findUnique({ where: { id: staff.id } })).active, false);
  });
  await check("Vendor saves weekly availability", async () => {
    const slots = Array.from({ length: 7 }, (_, weekday) => ({ weekday, startMin: 540, endMin: 1080, bufferMin: 15 }));
    ok(await api("/api/vendor/availability", "owner", { slots }, "PUT"));
    assert.equal(ok(await api("/api/vendor/availability", "owner")).slots.length, 7);
  });
  if (!process.argv.includes("--browser-only")) {
  await check("Vendor onboarding draft submits successfully", async () => {
    ok(await api("/api/vendor/onboarding", "second", { providerType: "spa", businessName: "Feature submitted spa", state: "Lagos", city: "Lagos", neighbourhood: "Lekki", address: "Feature address", submit: true }, "PATCH"));
    assert.equal((await db.vendor.findUnique({ where: { id: vendors[1] } })).applicationStatus, "submitted");
  });
  for (const route of ["/", "/explore", "/login", "/register", "/forgot", "/install", "/offline", `/category/${category.slug}`, `/providers/${vendors[0]}`, `/services/${service.slug}`]) {
    await check(`Public page ${route.replace(run, "fixture")}`, () => pageStatus(route).then(() => "Rendered successfully"));
  }
  await check("Live public provider profile hides Free-plan private contacts", async () => {
    const result = await pageStatus(`/providers/${vendors[0]}`);
    assert(!result.text.includes("PRIVATE-FEATURE-PHONE")); assert(!result.text.includes("PRIVATE-FEATURE-WHATSAPP"));
  });
  await check("Service quote includes the correct home add-on", async () => {
    const quote = ok(await api(`/api/quote?serviceId=${service.id}&location=home`));
    assert.equal(quote.basePriceKobo, 1000000); assert.equal(quote.surchargeKobo, 300000); assert.equal(quote.customerTotalKobo, 1300000);
  });
  await check("Favourite saves and appears in account list", async () => {
    ok(await api("/api/favourites", "customer", { serviceId: service.id }));
    assert.equal(ok(await api("/api/favourites", "customer")).items.filter((f) => f.serviceId === service.id).length, 1);
  });
  await check("Saving the same favourite twice does not create duplicates", async () => {
    await api("/api/favourites", "customer", { serviceId: service.id });
    assert.equal(await db.favourite.count({ where: { userId: id("customer"), serviceId: service.id } }), 1, "Repeated save created duplicate favourite rows");
  });
  await check("Favourite requires a service or provider target", async () => assert.equal((await api("/api/favourites", "customer", {})).status, 400, "Empty favourite was accepted"));
  const body = { serviceId: service.id, locationType: "spa", locationDetails: "", startsAt: `${day}T10:00:00+01:00`, idempotencyKey: id("reservation") };
  await check("Concurrent booking requests reserve a slot once", async () => {
    const attempts = await Promise.all([api("/api/bookings", "customer", body), api("/api/bookings", "other", { ...body, idempotencyKey: id("competing") })]);
    assert.deepEqual(attempts.map((a) => a.status).sort(), [200, 409]);
    booking = attempts.find((a) => a.status === 200).data;
    if (booking.customerId !== id("customer")) { const old = cookies.customer; cookies.customer = cookies.other; cookies.other = old; }
  });
  assert(booking, "Booking setup failed");
  bookingUser = booking.customerId;
  await check("Unpaid booking cannot be confirmed or completed by vendor", async () => {
    for (const status of ["confirmed", "completed"]) assert([400, 409].includes((await api(`/api/vendor/bookings/${booking.id}`, "owner", { status }, "PATCH")).status));
  });
  await check("Another customer cannot cancel this booking", async () => assert.equal((await api("/api/bookings", "other", { id: booking.id, action: "cancel", reason: "Feature test" }, "PATCH")).status, 403));
  await check("Paystack test checkout initialization and ownership guards", async () => {
    assert(process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_test_"), "Test key required");
    const payment = ok(await api("/api/payments/init", "customer", { bookingId: booking.id }));
    assert(payment.authorizationUrl?.startsWith("https://checkout.paystack.com/"));
    assert.equal((await api(`/api/payments/verify?reference=${payment.reference}`, "other")).status, 403);
  });
  await check("Review rejected before service completion", async () => assert.equal((await api("/api/account/reviews", "customer", { bookingId: booking.id, rating: 5, body: "Feature test review" })).status, 400));
  await check("Signed synthetic payment confirms booking exactly once", async () => {
    const reference = id("synthetic-charge");
    await db.payment.create({ data: { bookingId: booking.id, provider: "integration_fixture", purpose: "booking", amountKobo: booking.customerTotalKobo, currency: "NGN", status: "pending", reference, idempotencyKey: reference } });
    const raw = JSON.stringify({ event: "charge.success", data: { reference, id: "feature-fixture", amount: booking.customerTotalKobo, currency: "NGN" } });
    const signature = crypto.createHmac("sha512", process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY).update(raw).digest("hex");
    for (let i = 0; i < 2; i++) {
      const response = await fetch(`${base}/api/payments/webhook`, { method: "POST", headers: { "Content-Type": "application/json", "x-paystack-signature": signature }, body: raw }); assert.equal(response.status, 200);
    }
    assert.equal(await db.vendorEarning.count({ where: { bookingId: booking.id } }), 1);
    return "Synthetic event only; no gateway charge";
  });
  await check("Customer completes service and payout queues without bank details", async () => {
    ok(await api(`/api/account/bookings/${booking.id}/complete`, "customer", {}));
    const earning = await db.vendorEarning.findUnique({ where: { bookingId: booking.id }, include: { payout: true } });
    assert.equal(earning.payout.status, "needs_account");
  });
  await check("Completed service can be reviewed and updates vendor rating", async () => {
    ok(await api("/api/account/reviews", "customer", { bookingId: booking.id, rating: 5, body: "Feature test completed-service review" }));
    const vendor = await db.vendor.findUnique({ where: { id: vendors[0] } }); assert.equal(vendor.reviewCount, 1); assert.equal(vendor.ratingAvg, 5);
  });
  await check("Duplicate review rejected", async () => assert.equal((await api("/api/account/reviews", "customer", { bookingId: booking.id, rating: 5, body: "Feature duplicate review" })).status, 409));
  await check("Vendor gallery create and edit", async () => {
    ok(await api("/api/vendor/galleries", "owner"));
    gallery = ok(await api("/api/vendor/galleries", "owner", { title: "Feature therapist photos" })).gallery;
    ok(await api("/api/vendor/galleries", "owner", { id: gallery.id, caption: "Feature caption" }, "PATCH"));
  });
  await check("Gallery image upload, database storage and public delivery", async () => {
    const bytes = await sharp({ create: { width: 16, height: 16, channels: 3, background: "#064e3b" } }).png().toBuffer();
    const form = new FormData(); form.set("galleryId", gallery.id); form.set("file", new Blob([bytes], { type: "image/png" }), "feature.png");
    const image = ok(await api("/api/vendor/galleries/images", "owner", form)).image;
    imageFiles.push(path.basename(image.url));
    const stored = await db.therapistGalleryImage.findUnique({ where: { id: image.id } }); assert(stored.payload?.byteLength > 0);
    const media = await fetch(`${base}${image.url}`); assert.equal(media.status, 200); assert(media.headers.get("content-type").includes("image/png"));
    assert.equal((await api(`/api/vendor/galleries/images?id=${image.id}`, "second", undefined, "DELETE")).status, 404);
    ok(await api(`/api/vendor/galleries/images?id=${image.id}`, "owner", undefined, "DELETE"));
  });
  await check("Free vendor cannot add paid-plan video links", async () => assert([400, 403].includes((await api("/api/vendor/videos", "owner", { url: "https://www.youtube.com/watch?v=feature-test", title: "Feature video" })).status)));
  await check("Paid subscription enables vendor videos and public-contact eligibility", async () => {
    const plan = await db.subscriptionPlan.findFirstOrThrow({ where: { code: { not: "FREE" }, active: true, publicDirectContact: true } });
    await db.vendorSubscription.create({ data: { vendorId: vendors[0], planId: plan.id, status: "active", source: "feature_fixture", startsAt: new Date(), endsAt: new Date(Date.now() + 30 * 86400000) } });
    const link = ok(await api("/api/vendor/videos", "owner", { url: "https://www.youtube.com/watch?v=feature-test", title: "Feature video" })).link;
    assert.equal(ok(await api("/api/vendor/listing-contact", "owner")).public, true);
    ok(await api(`/api/vendor/videos?id=${link.id}`, "owner", undefined, "DELETE"));
  });
  await check("Vendor support ticket, admin reply and resolution", async () => {
    const ticket = ok(await api("/api/vendor/tickets", "owner", { subject: "Feature test support", message: "Feature test request" })).ticket;
    ok(await api(`/api/admin/tickets/${ticket.id}`, "admin", { reply: "Feature test response", status: "resolved" }, "PATCH"));
    const loaded = ok(await api("/api/vendor/tickets", "owner")).tickets.find((t) => t.id === ticket.id);
    assert.equal(loaded.status, "resolved"); assert.equal(loaded.messages.length, 2);
  });
  await check("Admin CMS create, publish and public page rendering", async () => {
    const block = ok(await api("/api/admin/cms", "admin", { key: id("page"), title: "Feature published page", body: "Feature published content" })).block;
    ok(await api("/api/admin/cms", "admin", { id: block.id, published: true }, "PATCH"));
    assert((await pageStatus(`/${block.key}`)).text.includes("Feature published content"));
  });
  for (const route of ["dashboard", "bookings", "favourites", "payments", "reviews", "settings", "support"]) await check(`Customer page /account/${route}`, () => pageStatus(`/account/${route}`, "customer").then(() => "Rendered successfully"));
  for (const route of ["dashboard", "services", "staff", "availability", "galleries", "bookings", "earnings", "subscriptions", "support", "analytics", "settings"]) await check(`Vendor page /vendor/${route}`, () => pageStatus(`/vendor/${route}`, "owner").then(() => "Rendered successfully"));
  for (const route of ["dashboard", "applications", "vendors", "users", "categories", "services", "bookings", "finance", "commercial", "cms", "support", "ai", "roles", "audit", "settings"]) await check(`Admin page /admin/${route}`, () => pageStatus(`/admin/${route}`, "admin").then(() => "Rendered successfully"));
  await check("PWA manifest, icons, service worker and offline page assets", async () => {
    const manifest = ok(await api("/manifest.webmanifest")); assert.equal(manifest.display, "standalone");
    for (const asset of [...manifest.icons.map((i) => i.src), "/sw.js", "/sw-register.js", "/offline.html"]) assert.equal((await api(asset)).status, 200, `Missing PWA asset ${asset}`);
  });
  }

  browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await context.addInitScript(() => { sessionStorage.setItem("naijaspa-splash", "1"); localStorage.setItem("naijaspa_place", JSON.stringify({ state: "Lagos", city: "Lagos", neighbourhood: "" })); });
  const page = await context.newPage(); livePage = page; page.setDefaultTimeout(45000); page.setDefaultNavigationTimeout(60000);
  const jsErrors = []; page.on("pageerror", (e) => jsErrors.push(clean(e.message)));
  await check("Browser customer login and dashboard navigation", async () => {
    await page.goto(`${base}/login`); await page.getByLabel("Email Address", { exact: true }).fill(`${bookingUser}@example.com`);
    await page.locator('input[name="password"]').fill(password); await page.getByRole("button", { name: "Sign in as Client", exact: true }).click();
    await page.waitForURL("**/account/dashboard");
  });
  await check("Browser profile changes persist", async () => {
    await page.goto(`${base}/account/settings`); await page.getByLabel("First name", { exact: true }).fill("Browser"); await page.getByLabel("Last name", { exact: true }).fill("Feature");
    await page.getByRole("button", { name: "Save changes", exact: true }).click(); await page.getByText("Profile saved", { exact: true }).waitFor();
    assert.equal((await db.user.findUnique({ where: { id: bookingUser } })).name, "Browser Feature");
  });
  await check("Browser theme persists after reload", async () => {
    await page.getByRole("radio", { name: "Dark", exact: true }).click(); await page.reload();
    assert(await page.locator("html").evaluate((el) => el.classList.contains("dark")));
  });
  await check("Notification preferences persist after reload", async () => {
    const toggle = page.getByLabel("Offers & promotions", { exact: false }); await toggle.check(); await page.reload();
    assert(await toggle.isChecked(), "Offers preference reset after reload; switches only update local component state");
  });
  await check("Browser booking form creates reservation and opens checkout", async () => {
    await page.goto(`${base}/book/${service.id}`); await page.locator('input[type="datetime-local"]').fill(`${day}T14:00`);
    await page.getByRole("button", { name: "Continue to payment", exact: true }).click(); await page.waitForURL("**/checkout/*");
    await page.getByRole("button", { name: /Pay.*Paystack/i }).waitFor();
    assert(await page.getByRole("button", { name: /Pay|Paystack/i }).count() > 0);
  });
  await check("Mobile browsing has no horizontal overflow", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ["/explore", `/services/${service.slug}`, "/account/settings"]) {
      await page.goto(base + route); await page.locator("h1").first().waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `Horizontal overflow on ${route}`);
    }
    await page.screenshot({ path: path.join(output, "mobile-settings.png"), fullPage: true });
  });
  await check("Browser runtime does not throw JavaScript errors", async () => assert.equal(jsErrors.length, 0, jsErrors.join("; ")));
  await check("Deletion request cancels upcoming bookings as promised by UI", async () => {
    const upcoming = await db.booking.findFirst({ where: { customerId: bookingUser, status: "awaiting_payment" } });
    assert(upcoming, "No upcoming fixture reservation to test");
    ok(await api("/api/account/profile", "customer", { deleteAccount: true }));
    assert((await db.user.findUnique({ where: { id: bookingUser } })).deletionRequestedAt);
    assert.equal((await db.booking.findUnique({ where: { id: upcoming.id } })).status, "cancelled", "Deletion was requested but upcoming booking was not cancelled");
  });
  await check("Logout revokes the database session", async () => { ok(await api("/api/auth/logout", "customer", {})); assert.equal((await api("/api/bookings", "customer")).status, 401); });
  record("Email-backed signup and password-reset delivery", "BLOCKED", "Requires authenticated email delivery and an explicitly chosen test recipient; no email sent by this audit");
  record("Push notification delivery", "NOT IMPLEMENTED", "VAPID keys exist; subscription registration, push handling and sender are not implemented");
  record("External payout transfer", "BLOCKED", "Previously rejected by Paystack sandbox recipient validation; safe local payout queue checked here");
  record("Contact form delivery", "PARTIAL", "Opens a mailto link and displays Message sent; the app cannot verify external mail delivery");
  record("Customer membership purchases", "DISABLED", "Feature intentionally disabled in membership configuration");
} catch (e) {
  record("Audit infrastructure/setup", "FAIL", e instanceof assert.AssertionError ? e.message : e.code || e.name);
} finally {
  try { await cleanup(); record("Isolated test-data cleanup", "PASS"); } catch (e) { record("Isolated test-data cleanup", "FAIL", e.code || e.name); }
  await db.$disconnect();
  if (process.argv.includes("--browser-only")) {
    try {
      const previous = JSON.parse(await readFile(".integration-tests/feature-audit-latest.json", "utf8"));
      const merged = new Map(previous.results.map((r) => [r.name, r]));
      for (const result of results) merged.set(result.name, result);
      results.splice(0, results.length, ...merged.values());
    } catch { /* A standalone browser-only run has no earlier API results. */ }
  }
  const counts = Object.fromEntries([...new Set(results.map((r) => r.status))].map((status) => [status, results.filter((r) => r.status === status).length]));
  const report = `# NaijaSpa feature audit — 30 October 2026\n\nLocal app: ${base}. Run: ${run}.\n\nCounts: ${JSON.stringify(counts)}\n\nAPI checks use real local PostgreSQL. Browser checks use headless Edge. Payment confirmation events in this audit are synthetic; no new card charge or transfer was made. Public page render checks do not prove every button works.\n\n| Check | Result | Detail |\n|---|---|---|\n${results.map((r) => `| ${r.name.replaceAll("|", "/")} | ${r.status} | ${r.detail.replaceAll("|", "/").replaceAll("\n", " ")} |`).join("\n")}\n`;
  await mkdir("docs", { recursive: true }); await writeFile("docs/FEATURE-AUDIT.md", report);
  await writeFile(path.join(output, "results.json"), JSON.stringify({ run, counts, results }, null, 2));
  await writeFile(".integration-tests/feature-audit-latest.json", JSON.stringify({ run, counts, results }, null, 2));
  console.log(JSON.stringify({ report: "docs/FEATURE-AUDIT.md", counts }));
  if (results.some((r) => r.status === "FAIL")) process.exitCode = 1;
}
