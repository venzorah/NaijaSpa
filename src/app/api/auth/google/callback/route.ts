import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  GOOGLE_OAUTH_COOKIE,
  exchangeGoogleCode,
  loginPath,
  safeNext,
  signInWithGoogle,
  verifyOauthState
} from "@/lib/google-auth";

function fail(origin: string, path: string, message: string) {
  return NextResponse.redirect(new URL(`${path}?error=${encodeURIComponent(message)}`, origin));
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const jar = await cookies();
  const nonce = jar.get(GOOGLE_OAUTH_COOKIE)?.value;
  jar.delete(GOOGLE_OAUTH_COOKIE);

  const stateToken = url.searchParams.get("state");
  let portalPath = "/login";
  if (stateToken) {
    try {
      portalPath = loginPath((await verifyOauthState(stateToken)).portal);
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
    portalPath = loginPath(state.portal);
    if (state.n !== nonce) {
      return fail(origin, portalPath, "Gmail sign-in could not be verified. Try again.");
    }
    const profile = await exchangeGoogleCode(code);
    const result = await signInWithGoogle(profile, state.portal);
    const next =
      result.isNew && state.portal === "vendor" ? "/vendor/onboarding" : safeNext(state.next, result.home);
    return NextResponse.redirect(new URL(next, origin));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gmail sign-in failed.";
    return fail(origin, portalPath, message);
  }
}
