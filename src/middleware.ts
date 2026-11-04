import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Provjeravamo postojanje NextAuth kolačića sesije
  const sessionCookie = 
    request.cookies.get("authjs.session-token") ||
    request.cookies.get("__Secure-authjs.session-token") ||
    request.cookies.get("next-auth.session-token") ||
    request.cookies.get("__Secure-next-auth.session-token");

  const { pathname } = request.nextUrl;

  // Ako pokušava pristupiti portalu ili izradi, a nema sesije -> preusmjeri na /login
  if ((pathname.startsWith("/portal") || pathname.startsWith("/izdavanje")) && !sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/portal/:path*", "/izdavanje/:path*"],
};