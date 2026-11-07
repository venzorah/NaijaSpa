import { portalNext } from "@/lib/portal-auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  GOOGLE_OAUTH_COOKIE,
  exchangeGoogleCode,
  googleCallbackUrlFor,
  loginPath,
  requestOrigin,
  safeNext,
  signInWithGoogle,
  verifyOauthState
} from "@/lib/google-auth";

function fail(origin: string, path: string, message: string) {
  const destination = new URL(path, origin);
  destination.searchParams.set("error", message);
  return NextResponse.redirect(destination);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  // Next's request URL can contain the internal listen host behind Nginx.
  // Resolve the public origin through the same allowlist used to start OAuth.
  const origin = new URL(googleCallbackUrlFor(requestOrigin(req))).origin;
  const jar = await cookies();
  const nonce = jar.get(GOOGLE_OAUTH_COOKIE)?.value;
  jar.delete(GOOGLE_OAUTH_COOKIE);

  const stateToken = url.searchParams.get("state");
  let portalPath = "/login";
  if (stateToken) {
    try {
      const early = await verifyOauthState(stateToken);
      portalPath = early.returnPath || loginPath(early.portal);
    } catch {
      /* keep customer login */
    }
  }

  const errorParam = url.searchParams.get("error");
  if (errorParam) {
    return fail(
      origin,
      portalPath,
      errorParam === "access_denied" ? "Gmail sign-in was cancelled." : "Google sign-in failed."
    );
  }

  const code = url.searchParams.get("code");
  if (!code || !stateToken || !nonce) {
    return fail(origin, portalPath, "Gmail sign-in expired. Try again.");
  }

  try {
    const state = await verifyOauthState(stateToken);
    portalPath = state.returnPath || loginPath(state.portal);
    if (state.n !== nonce) {
      return fail(origin, portalPath, "Gmail sign-in could not be verified. Try again.");
    }
    const profile = await exchangeGoogleCode(code, state.redirectUri);
    const result = await signInWithGoogle(profile, state.portal, state.intent);
    const next =
      result.isNew && state.portal === "vendor" ? "/vendor/onboarding" : portalNext(state.next || result.home, state.portal);
    return NextResponse.redirect(new URL(next, origin));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gmail sign-in failed.";
    return fail(origin, portalPath, message);
  }
}
