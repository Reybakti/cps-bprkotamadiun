import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = new Set(["/", "/login"]);
// Rute internal NextAuth (/api/auth/*) harus selalu bisa diakses tanpa sesi,
// jika tidak proses login/signout akan ter-redirect ke /login dan gagal.
const AUTH_API_PREFIX = "/api/auth";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const isAuthApi = pathname.startsWith(AUTH_API_PREFIX);
  // publik: halaman landing ("/") dan login boleh diakses tanpa sesi
  const isPublicPage = PUBLIC_PATHS.has(pathname);

  // API NextAuth (/api/auth/*) selalu diteruskan apa adanya.
  if (isAuthApi) {
    return NextResponse.next();
  }

  // user belum login dan mencoba ke halaman khusus → lempar ke /login
  if (!isLoggedIn && !isPublicPage) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // user sudah login: jangan biarkan lihat landing/login, langsung ke dashboard
  if (isLoggedIn && isPublicPage) {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
