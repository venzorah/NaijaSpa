import { NextResponse, type NextRequest } from "next/server";

// Forward the requested destination to the server layout. This header is always
// overwritten here; authentication and current role checks stay on the server.
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  const dest = request.nextUrl.pathname + request.nextUrl.search;
  headers.set("x-naijaspa-vendor-path", dest);
  headers.set("x-naijaspa-customer-path", dest);
  headers.set("x-naijaspa-admin-path", dest);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/vendor/:path*", "/account/:path*", "/checkout/:path*", "/admin/:path*"] };
