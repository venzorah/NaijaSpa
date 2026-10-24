import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jsonError, rateLimit } from "@/lib/http";
import {
  GOOGLE_OAUTH_COOKIE,
  googleAuthorizeUrl,
  googleConfigured,
  loginPath,
  safeNext,
  signOauthState,
  type GooglePortal
} from "@/lib/google-auth";
import { portalHome } from "@/lib/rbac";

export async function GET(req: Request) {
  try {
    rateLimit(`google-start:${req.headers.get("x-forwarded-for") || "local"}`, 12, 60_000);
    const url = new URL(req.url);
    const portal = (url.searchParams.get("portal") || "customer") as GooglePortal;
    if (portal !== "customer" && portal !== "vendor" && portal !== "admin") {
      return NextResponse.redirect(new URL("/login?error=Invalid+portal", url.origin));
    }
    if (!googleConfigured()) {
      return NextResponse.redirect(
        new URL(`${loginPath(portal)}?error=${encodeURIComponent("Gmail sign-in is not configured yet.")}`, url.origin)
      );
    }
    const fallback = portal === "vendor" ? "/vendor/onboarding" : portal === "admin" ? portalHome("super_admin") : "/account";
    const next = safeNext(url.searchParams.get("next"), fallback);
    const nonce = crypto.randomUUID();
    const state = await signOauthState({ portal, next, n: nonce });
    const jar = await cookies();
    jar.set(GOOGLE_OAUTH_COOKIE, nonce, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600
    });
    return NextResponse.redirect(googleAuthorizeUrl(state));
  } catch (e) {
    return jsonError(e);
  }
}
