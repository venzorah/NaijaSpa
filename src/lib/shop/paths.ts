export function shopClientPath(path: string) {
  const next = path.startsWith("/") ? path : `/${path}`;
  if (typeof window !== "undefined" && window.location.hostname.startsWith("shop.")) {
    return next.replace(/^\/shop(?=\/|$)/, "") || "/";
  }
  return next.startsWith("/shop") ? next : `/shop${next === "/" ? "" : next}`;
}
