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

export function shopRewritePath(pathname: string) {
  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) return null;
  if (pathname.startsWith(SHOP_PREFIX)) return pathname;
  if (pathname === "/") return SHOP_PREFIX;
  return `${SHOP_PREFIX}${pathname}`;
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
