import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/index.html") {
    return NextResponse.next();
  }
  if (request.nextUrl.pathname.startsWith("/assets/")) {
    return NextResponse.next();
  }
  if (request.nextUrl.pathname.startsWith("/api/v1/")) {
    return NextResponse.next();
  }
  if (request.nextUrl.pathname === "/") {
    return NextResponse.rewrite(new URL("/index.html", request.url));
  }
  if (request.nextUrl.pathname === "/setup/status") {
    return new NextResponse('{"code":0,"data":{"needs_setup":false,"step":"completed"}}', {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  return NextResponse.rewrite(new URL("/index.html", request.url));
}

export const config = {
  matcher: ["/", "/:path*"],
};
