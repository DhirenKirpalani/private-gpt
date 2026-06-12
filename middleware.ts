import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require auth
  const publicRoutes = ["/", "/login", "/signup", "/pricing", "/about", "/disclaimer"]
  const isPublic = publicRoutes.some(route => pathname === route || pathname.startsWith("/api/") || pathname.includes("."))

  if (isPublic) {
    return NextResponse.next()
  }

  // Check for auth session cookie (must match storageKey in lib/supabase.ts)
  const session = request.cookies.get("sb-auth-token")

  if (!session || !session.value) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets/|api/).*)",
  ],
}
