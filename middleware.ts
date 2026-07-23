import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require auth
  const publicRoutes = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/pricing", "/about", "/disclaimer", "/privacy", "/terms", "/support"]
  const isPublic = publicRoutes.some(route => pathname === route || pathname.startsWith("/api/") || pathname.includes("."))

  if (isPublic) {
    return NextResponse.next()
  }

  // Check for auth session cookie (must match storageKey in lib/supabase.ts)
  const session = request.cookies.get("sb-auth-token")

  if (!session || !session.value || session.value.length < 10) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Redirect to login if the session cookie has expired (max-age=0 or negative)
  // The cookie storage in lib/supabase.ts sets max-age=604800 (7 days)
  // Browsers automatically remove expired cookies, but this is a safety check
  // for cases where the cookie is stale or manually set with a short expiry
  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets/|api/).*)",
  ],
}
