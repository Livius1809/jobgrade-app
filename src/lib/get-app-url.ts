/**
 * Returns the canonical URL for the current deployment.
 *
 * Resolution order:
 * 1. `NEXT_PUBLIC_APP_URL` — explicit override. On Vercel Production this is
 *    set to `https://jobgrade.ro`. Intentionally NOT set on Preview so the
 *    fallback kicks in and each preview deploy uses its own unique URL.
 * 2. `VERCEL_URL` / `NEXT_PUBLIC_VERCEL_URL` — auto-provisioned by Vercel for
 *    every deployment (Preview and Production). Example value:
 *    `jobgrade-v2-abc123-psihobusiness-consulting-srl.vercel.app`.
 *    Used so email links, OAuth callbacks, meta tags, and Stripe return URLs
 *    point back to the exact preview deployment the user is testing, rather
 *    than leaking them to production.
 * 3. `http://localhost:3000` — local dev fallback.
 *
 * NOTE: `NEXT_PUBLIC_VERCEL_URL` is baked at build time for client-side code.
 * `VERCEL_URL` is read at runtime on the server. Both resolve to the same
 * deployment hostname on Vercel.
 */
export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  const vercelHost =
    process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL
  if (vercelHost) {
    return `https://${vercelHost}`
  }
  return "http://localhost:3000"
}
