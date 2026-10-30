// Checks OAuth wiring without exposing credentials or signing a user in.
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { jwtVerify } from "jose";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd());
const base = "http://localhost:3000";
try {
  assert(process.env.GOOGLE_CLIENT_ID?.endsWith(".apps.googleusercontent.com"), "Google client ID format is invalid");
  assert(process.env.GOOGLE_CLIENT_SECRET?.trim(), "Google client secret is missing");
  const start = await fetch(`${base}/api/auth/google?portal=customer`, { redirect: "manual", signal: AbortSignal.timeout(60000) });
  assert([302, 307].includes(start.status), "Google start did not redirect");
  const location = new URL(start.headers.get("location"));
  assert.equal(location.origin, "https://accounts.google.com");
  assert.equal(location.searchParams.get("client_id"), process.env.GOOGLE_CLIENT_ID);
  assert.equal(location.searchParams.get("redirect_uri"), `${base}/api/auth/google/callback`);
  assert.equal(location.searchParams.get("scope"), "openid email profile");
  const cookie = start.headers.get("set-cookie");
  assert(cookie?.includes("HttpOnly"), "OAuth nonce cookie must be HTTP-only");
  const { payload } = await jwtVerify(location.searchParams.get("state"), new TextEncoder().encode(process.env.AUTH_SECRET));
  assert.equal(payload.portal, "customer");
  assert.equal(payload.redirectUri, `${base}/api/auth/google/callback`);
  assert.equal(payload.next, "/account/dashboard");
  console.log(JSON.stringify({ check: "google-oauth-start", ok: true, callback: payload.redirectUri, signedState: true, httpOnlyNonce: true }));
  const badCallback = await fetch(`${base}/api/auth/google/callback?code=invalid-test-code`, { redirect: "manual", signal: AbortSignal.timeout(60000) });
  const failed = new URL(badCallback.headers.get("location"));
  assert.equal(failed.pathname, "/login");
  assert(failed.searchParams.get("error"));
  console.log(JSON.stringify({ check: "google-callback-missing-state-guard", ok: true }));
  if (process.argv.includes("--provider-check")) {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${base}/api/auth/google/callback`, grant_type: "authorization_code", code: `invalid-diagnostic-${crypto.randomUUID()}` }),
      signal: AbortSignal.timeout(20000)
    });
    const result = await response.json();
    const expected = result.error === "invalid_grant";
    console.log(JSON.stringify({ check: "google-token-endpoint", ok: expected, httpStatus: response.status,
      response: result.error || "unexpected-response", realBrowserLoginRequired: true }));
    if (!expected) process.exitCode = 1;
  }
} catch (e) {
  process.exitCode = 1;
  console.log(JSON.stringify({ check: "google-login", ok: false, code: e.cause?.code || e.code || e.name,
    detail: e instanceof assert.AssertionError ? e.message : "Credential details omitted" }));
}
