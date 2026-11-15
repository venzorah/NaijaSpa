export function isCustomerAccountHub(path: string | null | undefined) {
  const clean = (path ?? "").split("?")[0].replace(/\/+$/, "");
  return clean === "/account";
}

export function customerNavActive(path: string, href: string) {
  if (href === "/") return path === "/" || path.startsWith("/in/");
  if (href === "/explore") return path === "/explore" || path.startsWith("/explore/");
  if (href === "/account") {
    if (path === "/account") return true;
    if (!path.startsWith("/account/")) return false;
    return !path.startsWith("/account/bookings") && !path.startsWith("/account/favourites");
  }
  return path === href || path.startsWith(`${href}/`);
}
