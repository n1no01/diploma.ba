import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Pročitamo puni token iz kolačića (automatski prepoznaje HTTPS i HTTP kolačiće)
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  });

  // 2. Zaštita za /portal i /izdavanje (bilo koji ulogovani korisnik)
  if ((pathname.startsWith("/portal") || pathname.startsWith("/izdavanje") || pathname.startsWith("/profil")) && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 3. Zaštita za /admin (SAMO korisnici sa ulogom ADMIN)
  if (pathname.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    
    // Ako nije admin, šaljemo ga na počeotak ili na portal
    if (token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/portal/:path*", "/izdavanje/:path*", "/profil/:path*", "/admin/:path*"],
};