import { SignJWT, jwtVerify } from "jose";
import { appUrl } from "./payments";
import { isAdminRole, isVendorRole, portalHome, ROLES, type Role } from "./rbac";
import { prisma } from "./db";
import { createSession } from "./auth";

export const GOOGLE_OAUTH_COOKIE = "naijaspa_oauth";

export type GooglePortal = "customer" | "vendor" | "admin";

type OauthState = {
  portal: GooglePortal;
  next: string;
  n: string;
};

function secret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me");
}

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleCallbackUrl() {
  return `${appUrl()}/api/auth/google/callback`;
}

export function googleStartUrl() {
  return `${appUrl()}/api/auth/google`;
}

export function safeNext(raw: string | null | undefined, fallback: string) {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("://")) return fallback;
  return raw;
}

export function loginPath(portal: GooglePortal) {
  if (portal === "vendor") return "/login/vendor";
  if (portal === "admin") return "/login/admin";
  return "/login";
}

export async function signOauthState(state: OauthState) {
  return new SignJWT(state)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(secret());
}

export async function verifyOauthState(token: string): Promise<OauthState> {
  const { payload } = await jwtVerify(token, secret());
  const portal = payload.portal;
  if (portal !== "customer" && portal !== "vendor" && portal !== "admin") {
    throw new Error("Invalid OAuth state");
  }
  return {
    portal,
    next: typeof payload.next === "string" ? payload.next : "/",
    n: typeof payload.n === "string" ? payload.n : ""
  };
}

export function googleAuthorizeUrl(state: string) {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) throw Object.assign(new Error("Google sign-in is not configured"), { status: 503 });
  const params = new URLSearchParams({
    client_id: id,
    redirect_uri: googleCallbackUrl(),
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account",
    state
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(code: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw Object.assign(new Error("Google sign-in is not configured"), { status: 503 });
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: googleCallbackUrl(),
      grant_type: "authorization_code"
    })
  });
  const json = (await res.json()) as { access_token?: string; error?: string };
  if (!res.ok || !json.access_token) {
    throw Object.assign(new Error("Google did not return an access token"), { status: 401 });
  }
  const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${json.access_token}` }
  });
  const profile = (await profileRes.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    given_name?: string;
  };
  if (!profileRes.ok || !profile.sub || !profile.email) {
    throw Object.assign(new Error("Could not read your Gmail profile"), { status: 401 });
  }
  if (profile.email_verified === false) {
    throw Object.assign(new Error("Verify this Gmail address with Google first"), { status: 403 });
  }
  return {
    googleId: profile.sub,
    email: profile.email.toLowerCase(),
    name: (profile.name || profile.given_name || "NaijaSpa guest").trim()
  };
}

async function createVendorFor(userId: string, name: string) {
  await prisma.vendor.create({
    data: {
      ownerId: userId,
      slug: `vendor-${userId.slice(-8)}`,
      businessName: `${name}'s studio`,
      city: "Lagos",
      neighbourhood: "",
      address: "",
      applicationStatus: "draft"
    }
  });
}

export async function signInWithGoogle(profile: { googleId: string; email: string; name: string }, portal: GooglePortal) {
  let isNew = false;
  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId: profile.googleId }, { email: profile.email }] },
    include: { vendorOwned: true, staffMemberships: true }
  });

  if (!user) {
    isNew = true;
    if (portal === "admin") {
      throw Object.assign(new Error("No admin account exists for this Gmail. Ask an owner to invite you."), { status: 403 });
    }
    const role = portal === "vendor" ? ROLES.VENDOR_OWNER : ROLES.CUSTOMER;
    user = await prisma.user.create({
      data: {
        email: profile.email,
        name: profile.name,
        googleId: profile.googleId,
        emailVerifiedAt: new Date(),
        role,
        locale: "en",
        theme: "light",
        customerProfile: role === ROLES.CUSTOMER ? { create: {} } : undefined
      },
      include: { vendorOwned: true, staffMemberships: true }
    });
    if (role === ROLES.VENDOR_OWNER) await createVendorFor(user.id, profile.name);
  } else {
    if (user.status !== "active") {
      throw Object.assign(new Error("This account is not active"), { status: 403 });
    }
    if (portal === "vendor" && !isVendorRole(user.role)) {
      throw Object.assign(new Error("This is not a vendor account. Use customer or admin login."), { status: 403 });
    }
    if (portal === "admin" && !isAdminRole(user.role)) {
      throw Object.assign(new Error("This is not an admin account. Use customer or vendor login."), { status: 403 });
    }
    if (!user.googleId || !user.emailVerifiedAt) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId || profile.googleId,
          emailVerifiedAt: user.emailVerifiedAt || new Date(),
          name: user.name || profile.name
        },
        include: { vendorOwned: true, staffMemberships: true }
      });
    }
  }

  await createSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as Role,
    locale: user.locale,
    theme: user.theme,
    vendorId: user.vendorOwned?.id ?? user.staffMemberships[0]?.vendorId
  });

  const home = isNew && portal === "vendor" ? "/vendor/onboarding" : portalHome(user.role);
  return { home, isNew };
}
