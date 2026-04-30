/**
 * POST /api/v1/mcp — MCP Tool Execution Endpoint
 *
 * Faza 1: Intern (FW + agenți client-facing)
 * Apelat de: Flying Wheels, SOA, CSA, HR Counselor
 *
 * Body: { tool: "get_pay_gap", params: { tenantId: "xxx", year: 2026 } }
 * Response: { success: true, data: {...} }
 *
 * GET — Manifest tools (lista + schema)
 *
 * Auth: INTERNAL_API_KEY sau session OWNER/SUPER_ADMIN/COMPANY_ADMIN
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { executeMCPTool, getToolManifest, MCP_TOOLS } from "@/lib/mcp/server"

export const dynamic = "force-dynamic"

async function checkAuth(req: NextRequest): Promise<{ authorized: boolean; tenantId?: string }> {
  const key = req.headers.get("x-internal-key")
  if (key === process.env.INTERNAL_API_KEY) return { authorized: true }
  const session = await auth()
  if (session?.user?.role && ["OWNER", "SUPER_ADMIN", "COMPANY_ADMIN"].includes(session.user.role)) {
    return { authorized: true, tenantId: session.user.tenantId }
  }
  return { authorized: false }
}

// GET — Manifest (lista tools disponibile)
export async function GET(req: NextRequest) {
  const { authorized } = await checkAuth(req)
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  return NextResponse.json({
    name: "JobGrade MCP Server",
    version: "1.0.0",
    description: "Acces la datele și instrumentele platformei JobGrade",
    tools: getToolManifest(),
    categories: {
      READ: MCP_TOOLS.filter(t => t.category === "READ").map(t => t.name),
      ACTION: MCP_TOOLS.filter(t => t.category === "ACTION").map(t => t.name),
      PROACTIVE: MCP_TOOLS.filter(t => t.category === "PROACTIVE").map(t => t.name),
    },
  })
}

// POST — Execute tool
export async function POST(req: NextRequest) {
  const { authorized, tenantId: sessionTenantId } = await checkAuth(req)
  if (!authorized) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { tool, params } = body

  if (!tool) {
    return NextResponse.json({ error: "tool obligatoriu. GET /api/v1/mcp pentru lista." }, { status: 400 })
  }

  // Dacă autentificat prin session, forțează tenantId-ul din session
  const effectiveParams = { ...params }
  if (sessionTenantId && !effectiveParams.tenantId) {
    effectiveParams.tenantId = sessionTenantId
  }

  const result = await executeMCPTool(tool, effectiveParams)

  // Learning: fiecare interacțiune MCP = cunoaștere
  if (result.success) {
    try {
      const { learnFromReport } = await import("@/lib/learning-hooks")
      await learnFromReport(`MCP_${tool}`, effectiveParams.tenantId || "system", JSON.stringify(result.data).slice(0, 300))
    } catch {}
  }

  return NextResponse.json(result)
}
