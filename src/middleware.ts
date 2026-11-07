import { NextResponse, type NextRequest } from "next/server";

// Forward the requested destination to the server layout. This header is always
// overwritten here; authentication and current role checks stay on the server.
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-naijaspa-vendor-path", request.nextUrl.pathname + request.nextUrl.search);
  headers.set("x-naijaspa-customer-path", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/vendor/:path*", "/account/:path*", "/checkout/:path*"] };
