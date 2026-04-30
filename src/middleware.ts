/**
 * Middleware Next-Auth — controlează ce rute sunt protejate.
 *
 * Rute PUBLICE (fără autentificare):
 * - / (homepage), /b2b/*, /sandbox, /login, /register, /forgot-password,
 *   /reset-password, /termeni, /privacy, /gdpr, /welcome, /transparenta-ai,
 *   /cookies, /media-books, /personal, /api/auth/*, /api/v1/* (au auth propriu)
 *
 * Rute PROTEJATE (necesită login):
 * - /portal/*, /settings/*, /owner/*, /sessions/*, /onboarding/*,
 *   /admin/*, /reports/*, /simulations/*, /sociogram/*
 */

export { auth as middleware } from "@/lib/auth"

export const config = {
  matcher: [
    // Protejăm doar rutele din (app) group — portal, settings, owner, etc.
    "/portal/:path*",
    "/settings/:path*",
    "/owner/:path*",
    "/sessions/:path*",
    "/onboarding/:path*",
    "/admin/:path*",
    "/reports/:path*",
    "/simulations/:path*",
    "/sociogram/:path*",
    "/team-reports/:path*",
    "/support/:path*",
    "/disfunctions/:path*",
  ],
}
