export const PUBLIC_SITE_URL = "https://naijaspa.com";

export function isLoopbackHost(host: string) {
  const value = host.trim().toLowerCase();
  if (!value) return false;
  try {
    const hostname = new URL(value.includes("://") ? value : `http://${value}`).hostname.replace(/^\[|\]$/g, "");
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "0.0.0.0";
  } catch {
    return value === "localhost" || value.startsWith("127.0.0.1") || value.startsWith("localhost:");
  }
}

export function isLoopbackOrigin(value: string) {
  return isLoopbackHost(value);
}

/** Public site origin for emails, Paystack and OAuth. Never localhost in production. */
export function appUrl() {
  const raw = process.env.APP_URL?.replace(/\/$/, "") || "";
  if (raw && !(process.env.NODE_ENV === "production" && isLoopbackOrigin(raw))) return raw;
  const vercel = process.env.VERCEL_URL?.replace(/^https?:\/\//, "").replace(/\/$/, "") || "";
  if (vercel && !isLoopbackHost(vercel)) return `https://${vercel}`;
  if (process.env.NODE_ENV === "production") return PUBLIC_SITE_URL;
  return raw || "http://localhost:3000";
}

export function publicOriginFromRequest(req: { url: string; headers: Headers }) {
  const url = new URL(req.url);
  const xfHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = xfHost || req.headers.get("host") || url.host;
  const proto = (req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || url.protocol.replace(":", "")).replace(
    /:$/,
    ""
  );
  const origin = `${proto}://${host}`.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production" && isLoopbackOrigin(origin)) return appUrl();
  return origin;
}
