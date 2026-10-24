import { NextResponse, type NextRequest } from "next/server";
import { isLocale } from "@/lib/i18n";

const indexableHosts = new Set(["ourwayoflifearchive.com", "www.ourwayoflifearchive.com"]);

function finish(response: NextResponse, request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  if (!indexableHosts.has(host)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api") || pathname.startsWith("/studio")) {
    return finish(NextResponse.next(), request);
  }

  const segment = pathname.split("/")[1];
  if (!isLocale(segment)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? "/en" : `/en${pathname}`;
    return finish(NextResponse.redirect(url), request);
  }

  return finish(NextResponse.next(), request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
