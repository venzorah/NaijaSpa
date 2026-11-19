import { NextResponse, type NextRequest } from "next/server";
import { lookupPlaceFromRequest, placeLockedByUser } from "@/lib/geo-ip";
import { parsePlaceCookie, PLACE_COOKIE, type LivePlace } from "@/lib/nigeria";
import { inHref, placeHasLocation } from "@/lib/place-urls";
import { publicOriginFromRequest } from "@/lib/public-origin";

function writePlaceCookie(response: NextResponse, place: LivePlace) {
  response.cookies.set(PLACE_COOKIE, encodeURIComponent(JSON.stringify(place)), {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax"
  });
}

function isPublicPlacePath(pathname: string) {
  return pathname === "/" || pathname.startsWith("/in/");
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (isPublicPlacePath(pathname) && !request.cookies.get("naijaspa_session")?.value) {
    let place = parsePlaceCookie(request.cookies.get(PLACE_COOKIE)?.value);
    const locked = placeLockedByUser(place);
    if (!locked) {
      const detected = await lookupPlaceFromRequest(request.headers);
      if (detected) place = detected;
    }
    if (pathname === "/") {
      if (place && placeHasLocation(place)) {
        const dest = inHref(place);
        if (dest !== "/") {
          const response = NextResponse.redirect(new URL(dest, publicOriginFromRequest(request)));
          if (!locked) writePlaceCookie(response, place);
          return response;
        }
      }
    } else if (!locked && place && placeHasLocation(place)) {
      const dest = inHref(place);
      if (dest !== pathname) {
        const response = NextResponse.redirect(new URL(dest, publicOriginFromRequest(request)));
        writePlaceCookie(response, place);
        return response;
      }
    }
  }
  const headers = new Headers(request.headers);
  const dest = request.nextUrl.pathname + request.nextUrl.search;
  headers.set("x-naijaspa-vendor-path", dest);
  headers.set("x-naijaspa-customer-path", dest);
  headers.set("x-naijaspa-admin-path", dest);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/", "/in/:path*", "/vendor/:path*", "/account", "/account/:path*", "/checkout/:path*", "/admin/:path*"]
};
