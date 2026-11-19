import { NextResponse, type NextRequest } from "next/server";
import { lookupPlaceFromIp, requestClientIp } from "@/lib/geo-ip";
import { DEFAULT_LIVE_PLACE, isDefaultLivePlace, parsePlaceCookie, PLACE_COOKIE, type LivePlace } from "@/lib/nigeria";
import { inHref } from "@/lib/place-urls";
import { publicOriginFromRequest } from "@/lib/public-origin";

function writePlaceCookie(response: NextResponse, place: LivePlace) {
  response.cookies.set(PLACE_COOKIE, encodeURIComponent(JSON.stringify(place)), {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax"
  });
}

// Forward the requested destination to the server layout. This header is always
// overwritten here; authentication and current role checks stay on the server.
export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/" && !request.cookies.get("naijaspa_session")?.value) {
    let place = parsePlaceCookie(request.cookies.get(PLACE_COOKIE)?.value);
    const locked = place?.source === "manual" || place?.source === "gps";
    if (!place || (isDefaultLivePlace(place) && !locked)) {
      const detected = await lookupPlaceFromIp(requestClientIp(request.headers));
      if (detected) place = detected;
    }
    place = place ?? DEFAULT_LIVE_PLACE;
    const dest = inHref(place);
    if (dest !== "/") {
      const response = NextResponse.redirect(new URL(dest, publicOriginFromRequest(request)));
      if (place.source === "ip") writePlaceCookie(response, place);
      return response;
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
  matcher: ["/", "/vendor/:path*", "/account", "/account/:path*", "/checkout/:path*", "/admin/:path*"]
};
