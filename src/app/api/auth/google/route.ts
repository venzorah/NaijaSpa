import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jsonError, rateLimit } from "@/lib/http";
import {
  GOOGLE_OAUTH_COOKIE,
  googleAuthorizeUrl,
  googleCallbackUrlFor,
  googleConfigured,
  googleReturnPath,
  requestOrigin,
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
      const back = googleReturnPath(portal, url.searchParams.get("from"));
      const sep = back.includes("?") ? "&" : "?";
      return NextResponse.redirect(
        new URL(`${back}${sep}error=${encodeURIComponent("Gmail sign-in is not configured yet.")}`, url.origin)
      );
    }
    const fallback = portal === "vendor" ? "/vendor/onboarding" : portal === "admin" ? portalHome("super_admin") : "/account";
    const next = safeNext(url.searchParams.get("next"), fallback);
    const nonce = crypto.randomUUID();
    const redirectUri = googleCallbackUrlFor(requestOrigin(req));
    const returnPath = googleReturnPath(portal, url.searchParams.get("from"));
    const state = await signOauthState({ portal, next, n: nonce, redirectUri, returnPath });
    const jar = await cookies();
    jar.set(GOOGLE_OAUTH_COOKIE, nonce, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production" || redirectUri.startsWith("https://"),
      path: "/",
      maxAge: 600
    });
    return NextResponse.redirect(googleAuthorizeUrl(state, redirectUri));
  } catch (e) {
    return jsonError(e);
  }
}
