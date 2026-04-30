/**
 * auth-or-key.ts — Autentificare prin sesiune SAU x-internal-key
 *
 * Folosit de rutele API care trebuie accesate atât din browser (sesiune)
 * cât și din scripturi/teste (internal key + x-tenant-id).
 */

import { NextRequest } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"

/**
 * Returnează un obiect compatibil cu NextAuth session:
 * { user: { id, tenantId, role } }
 * Astfel rutele existente nu trebuie modificate — doar import-ul.
 */
interface FakeSession {
  user: {
    id: string
    tenantId: string
    role: string
    [key: string]: any
  }
}

export async function authOrKey(req?: NextRequest | null): Promise<FakeSession | null> {
  // 1. Verificare x-internal-key (scripturi, teste, cron, COG)
  // Citim din req explicit SAU din Next.js headers() (funcționează fără req)
  let key: string | null = null
  let tenantIdFromHeader = ""
  if (req) {
    key = req.headers.get("x-internal-key")
    tenantIdFromHeader = req.headers.get("x-tenant-id") || ""
  } else {
    try {
      const h = await headers()
      key = h.get("x-internal-key")
      tenantIdFromHeader = h.get("x-tenant-id") || ""
    } catch {}
  }
  if (key && key === process.env.INTERNAL_API_KEY) {
    const tenantId = tenantIdFromHeader
    return {
      user: {
        id: "system",
        tenantId,
        role: "SUPER_ADMIN",
      },
    }
  }

  // 2. Verificare sesiune NextAuth (browser)
  try {
    const session = await auth()
    if (session?.user) return session as any
  } catch {}

  return null
}
