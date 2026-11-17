import { NextResponse, type NextRequest } from "next/server";
import { PLACE_COOKIE, placeFromCookieOrDefault } from "@/lib/nigeria";
import { inHref } from "@/lib/place-urls";
import { publicOriginFromRequest } from "@/lib/public-origin";

// Forward the requested destination to the server layout. This header is always
// overwritten here; authentication and current role checks stay on the server.
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/" && !request.cookies.get("naijaspa_session")?.value) {
    const place = placeFromCookieOrDefault(request.cookies.get(PLACE_COOKIE)?.value);
    const dest = inHref(place);
    if (dest !== "/") {
      return NextResponse.redirect(new URL(dest, publicOriginFromRequest(request)));
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
