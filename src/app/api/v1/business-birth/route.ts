/**
 * /api/v1/business-birth
 *
 * GET  — Verificare readiness organism-mama (poate naste?)
 * POST — Nastere business nou din organism-mama
 *
 * Auth: x-internal-key (doar Owner/Claude)
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { checkBirthReadiness, birthNewBusiness, type BirthConfig } from "@/lib/engines/business-birth"

export const dynamic = "force-dynamic"

async function checkAuth(req: NextRequest): Promise<boolean> {
  // Internal key (cron, Claude)
  if (req.headers.get("x-internal-key") === process.env.INTERNAL_API_KEY) return true
  // Session Owner/SUPER_ADMIN
  const session = await auth()
  return session?.user?.role === "OWNER" || session?.user?.role === "SUPER_ADMIN"
}

// GET — Readiness check
export async function GET(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const readiness = await checkBirthReadiness()
  return NextResponse.json(readiness)
}

// POST — Nastere business
export async function POST(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const config: BirthConfig = {
    businessName: body.businessName,
    businessSlug: body.businessSlug,
    description: body.description || "",
    targetMarket: body.targetMarket || "",
    lifecyclePhase: "GROWTH",
    l3Config: body.l3Config || { jurisdiction: "RO", industry: "", specificRegulations: [] },
    initialAgents: body.initialAgents || [],
  }

  if (!config.businessName || !config.businessSlug) {
    return NextResponse.json({ error: "businessName si businessSlug obligatorii" }, { status: 400 })
  }

  const result = await birthNewBusiness(config)
  return NextResponse.json(result)
}
