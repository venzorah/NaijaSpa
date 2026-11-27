export const SHOP_PUBLIC_URL = "https://shop.naijaspa.com";
export const SHOP_PREFIX = "/shop";

export function hostnameOf(host: string) {
  return host.split(",")[0]?.trim().toLowerCase().replace(/:\d+$/, "") || "";
}

export function isShopHostname(host: string) {
  const name = hostnameOf(host);
  return name === "shop.naijaspa.com" || name.startsWith("shop.");
}

export function shopHostFromHeaders(headers: Headers) {
  return isShopHostname(headers.get("x-forwarded-host") || headers.get("host") || "");
}

/** Public shop pages on shop.naijaspa.com. Everything else stays on the main app (or is redirected). */
const SHOP_HOST_PATHS = [
  /^\/search(?:\/|$)/,
  /^\/cart(?:\/|$)/,
  /^\/checkout(?:\/|$)/,
  /^\/orders(?:\/|$)/,
  /^\/sell(?:\/|$)/,
  /^\/c(?:\/|$)/,
  /^\/p(?:\/|$)/,
  /^\/store(?:\/|$)/
];

/** Spa marketplace URLs that must not render on the shop host. */
const SHOP_HOST_SPA_PATHS = [
  /^\/explore(?:\/|$)/,
  /^\/in(?:\/|$)/,
  /^\/providers(?:\/|$)/,
  /^\/services(?:\/|$)/,
  /^\/book(?:\/|$)/,
  /^\/category(?:\/|$)/,
  /^\/become-a-vendor(?:\/|$)/,
  /^\/find-bookings(?:\/|$)/,
  /^\/ai(?:\/|$)/,
  /^\/install(?:\/|$)/,
  /^\/account(?:\/|$)/,
  /^\/customer-access(?:\/|$)/,
  /^\/vendor-access(?:\/|$)/,
  /^\/register(?:\/|$)/,
  /^\/login\/(?:vendor|admin)(?:\/|$)/,
  /^\/forgot(?:\/|$)/,
  /^\/reset(?:\/|$)/
];

export function shopRewritePath(pathname: string) {
  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) return null;
  if (pathname.startsWith(SHOP_PREFIX)) return pathname;
  if (pathname === "/") return SHOP_PREFIX;
  if (pathname === "/login") return `${SHOP_PREFIX}/login`;
  if (SHOP_HOST_PATHS.some((re) => re.test(pathname))) return `${SHOP_PREFIX}${pathname}`;
  return null;
}

export function shopHostSpaPath(pathname: string) {
  return SHOP_HOST_SPA_PATHS.some((re) => re.test(pathname));
}

export function shopPublicPath(internalPath: string, shopHost: boolean) {
  const path = internalPath.startsWith("/") ? internalPath : `/${internalPath}`;
  if (!shopHost) return path.startsWith(SHOP_PREFIX) ? path : `${SHOP_PREFIX}${path === "/" ? "" : path}`;
  if (path === SHOP_PREFIX || path === `${SHOP_PREFIX}/`) return "/";
  return path.startsWith(SHOP_PREFIX) ? path.slice(SHOP_PREFIX.length) || "/" : path;
}

export function sessionCookieDomain() {
  const explicit = process.env.AUTH_COOKIE_DOMAIN?.trim();
  if (explicit) return explicit;
  if (process.env.NODE_ENV === "production") return ".naijaspa.com";
  return undefined;
}
