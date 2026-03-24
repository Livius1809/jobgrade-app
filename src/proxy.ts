import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_ROUTES = ["/", "/pricing", "/contact"]
const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"]
const APP_PREFIX = "/app"

export default auth((req) => {
  const { nextUrl, auth: session } = req as any
  const pathname = nextUrl.pathname

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)
  const isAuthRoute = AUTH_ROUTES.some((r) => pathname.startsWith(r))
  const isAppRoute = pathname.startsWith(APP_PREFIX)
  const isApiRoute = pathname.startsWith("/api/v1")

  // API routes — verificare token în handler
  if (isApiRoute) return NextResponse.next()

  // Dacă e logat și încearcă să acceseze auth routes → redirect la dashboard
  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL("/app/dashboard", nextUrl))
  }

  // Dacă nu e logat și încearcă să acceseze app routes → redirect la login
  if (!session && isAppRoute) {
    const loginUrl = new URL("/login", nextUrl)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
