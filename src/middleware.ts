import { NextResponse, type NextRequest } from "next/server";
import { lookupPlaceFromRequest, placeLockedByUser } from "@/lib/geo-ip";
import { parsePlaceCookie, PLACE_COOKIE, type LivePlace } from "@/lib/nigeria";
import { inHref, placeHasLocation } from "@/lib/place-urls";
import { publicOriginFromRequest } from "@/lib/public-origin";
import { shopHostFromHeaders, shopHostSpaPath, shopRewritePath } from "@/lib/shop-host";

function writePlaceCookie(response: NextResponse, place: LivePlace) {
  response.cookies.set(PLACE_COOKIE, encodeURIComponent(JSON.stringify(place)), {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax"
  });
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const headers = new Headers(request.headers);
  const dest = request.nextUrl.pathname + request.nextUrl.search;
  headers.set("x-naijaspa-vendor-path", dest);
  headers.set("x-naijaspa-customer-path", dest);
  headers.set("x-naijaspa-admin-path", dest);
  headers.set("x-naijaspa-pathname", pathname);
  if (shopHostFromHeaders(request.headers)) {
    if (shopHostSpaPath(pathname)) {
      const dest = new URL(publicOriginFromRequest(request));
      dest.hostname = dest.hostname.replace(/^shop\./i, "");
      dest.pathname = pathname;
      dest.search = request.nextUrl.search;
      return NextResponse.redirect(dest);
    }
    const rewritten = shopRewritePath(pathname);
    if (rewritten && rewritten !== pathname) {
      // Next runs behind Nginx. Keep this rewrite on the internal HTTP hop:
      // cloning nextUrl would inherit the public HTTPS scheme and create an
      // unreachable https://localhost:3100 rewrite.
      const url = new URL(rewritten, "http://localhost:3100");
      url.search = request.nextUrl.search;
      if (pathname === "/login/vendor" && url.searchParams.get("asShop") !== "1") {
        url.searchParams.set("asVendor", "1");
      }
      return NextResponse.rewrite(url, { request: { headers } });
    }
    return NextResponse.next({ request: { headers } });
  }
  if (pathname === "/" && !request.cookies.get("naijaspa_session")?.value) {
    let place = parsePlaceCookie(request.cookies.get(PLACE_COOKIE)?.value);
    const locked = placeLockedByUser(place);
    if (!locked) {
      const detected = await lookupPlaceFromRequest(request.headers);
      if (detected) place = detected;
    }
    if (place && placeHasLocation(place)) {
      const dest = inHref(place);
      if (dest !== "/") {
        const response = NextResponse.redirect(new URL(dest, publicOriginFromRequest(request)));
        if (!locked) writePlaceCookie(response, place);
        return response;
      }
    }
  }
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|manifest.webmanifest|sw-register.js|brand/|photos/|fonts/).*)"]
};
