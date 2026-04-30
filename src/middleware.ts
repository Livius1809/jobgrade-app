/**
 * Middleware — controlează ce rute necesită autentificare.
 *
 * Rute publice: /, /sandbox, /b2b/*, /login, /register, /api/*, etc.
 * Rute protejate: /portal/*, /settings/*, /owner/*, /sessions/*
 */

import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

const PUBLIC_PATHS = [
  "/",
  "/sandbox",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/activate",
  "/welcome",
  "/termeni",
  "/privacy",
  "/gdpr",
  "/cookies",
  "/transparenta-ai",
  "/b2b",
  "/media-books",
  "/personal",
  "/demo",
]

const PUBLIC_PREFIXES = [
  "/b2b/",
  "/api/",
  "/_next/",
  "/media-books/",
  "/personal/",
  "/demo/",
]

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true
  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) return true
  // Static files
  if (pathname.includes(".")) return true
  return false
}

export default auth((req) => {
  const { pathname } = req.nextUrl

  // Public routes — no auth needed
  if (isPublic(pathname)) {
    return NextResponse.next()
  }

  // Protected routes — check auth
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip static files and Next.js internals
    "/((?!_next/static|_next/image|favicon|logo|manifest|robots|sitemap).*)",
  ],
}
