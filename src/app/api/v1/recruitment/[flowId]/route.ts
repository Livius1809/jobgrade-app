/**
 * /api/v1/recruitment/[flowId]
 *
 * GET   — Get single flow details (with appropriate anonymization)
 * PATCH — Update flow data (e.g., add phone for invitation, add report)
 *
 * Dual auth: B2B via authOrKey, B2C via extractB2CAuth.
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey } from "@/lib/auth-or-key"
import { extractB2CAuth } from "@/lib/security/b2c-auth"
import { getFlow, saveFlow, type RecruitmentFlowState } from "@/lib/matching/recruitment-flow"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ flowId: string }> }

/**
 * GET — Get single flow details with appropriate anonymization
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const { flowId } = await context.params

  const flow = await getFlow(flowId)
  if (!flow) {
    return NextResponse.json({ error: "Flux negasit." }, { status: 404 })
  }

  // Check authorization — must be either the B2C candidate or B2B company
  const b2cAuth = extractB2CAuth(req)
  if (b2cAuth) {
    if (b2cAuth.sub !== flow.candidateId) {
      return NextResponse.json({ error: "Neautorizat." }, { status: 403 })
    }
    return NextResponse.json({ flow: anonymizeForB2C(flow), role: "B2C" })
  }

  const session = await authOrKey()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 })
  }

  if (session.user.tenantId !== flow.companyId) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 403 })
  }

  return NextResponse.json({ flow: anonymizeForB2B(flow), role: "B2B" })
}

/**
 * PATCH — Update flow data (add phone, add report)
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { flowId } = await context.params

    const flow = await getFlow(flowId)
    if (!flow) {
      return NextResponse.json({ error: "Flux negasit." }, { status: 404 })
    }

    const body = await req.json()

    // Check authorization
    const b2cAuth = extractB2CAuth(req)
    if (b2cAuth) {
      if (b2cAuth.sub !== flow.candidateId) {
        return NextResponse.json({ error: "Neautorizat." }, { status: 403 })
      }

      // B2C can update: b2cReport
      if (body.b2cReport) {
        flow.b2cReport = body.b2cReport
      }

      flow.updatedAt = new Date().toISOString()
      await saveFlow(flow)

      return NextResponse.json({ flow: anonymizeForB2C(flow) })
    }

    const session = await authOrKey()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Neautorizat." }, { status: 401 })
    }

    if (session.user.tenantId !== flow.companyId) {
      return NextResponse.json({ error: "Neautorizat." }, { status: 403 })
    }

    // B2B can update: b2bReport, b2bContactPhone
    if (body.b2bReport) {
      flow.b2bReport = body.b2bReport
    }
    if (body.b2bContactPhone) {
      flow.b2bContactPhone = body.b2bContactPhone
    }

    flow.updatedAt = new Date().toISOString()
    await saveFlow(flow)

    return NextResponse.json({ flow: anonymizeForB2B(flow) })
  } catch (error) {
    console.error("[recruitment/flowId PATCH]", error)
    return NextResponse.json({ error: "Eroare interna." }, { status: 500 })
  }
}

// ── Anonymization helpers (same logic as parent route) ────────────────────

function anonymizeForB2B(flow: RecruitmentFlowState): Record<string, unknown> {
  const base: Record<string, unknown> = {
    id: flow.id,
    jobId: flow.jobId,
    candidateAlias: flow.candidateAlias,
    step: flow.step,
    matchScore: flow.matchScore,
    matchDetails: flow.matchDetails,
    createdAt: flow.createdAt,
    updatedAt: flow.updatedAt,
  }

  if (["REPORTS_EXCHANGED", "B2B_INVITED", "IDENTITY_REVEALED", "COMPLETED"].includes(flow.step)) {
    base.b2bReport = flow.b2bReport
  }

  // Reveal candidateId only after identity reveal
  if (["IDENTITY_REVEALED", "COMPLETED"].includes(flow.step)) {
    base.candidateId = flow.candidateId
  }

  return base
}

function anonymizeForB2C(flow: RecruitmentFlowState): Record<string, unknown> {
  const base: Record<string, unknown> = {
    id: flow.id,
    jobId: flow.jobId,
    step: flow.step,
    matchScore: flow.matchScore,
    matchDetails: flow.matchDetails,
    createdAt: flow.createdAt,
    updatedAt: flow.updatedAt,
  }

  if (["REPORTS_EXCHANGED", "B2B_INVITED", "IDENTITY_REVEALED", "COMPLETED"].includes(flow.step)) {
    base.b2cReport = flow.b2cReport
  }

  if (["B2B_INVITED", "IDENTITY_REVEALED", "COMPLETED"].includes(flow.step)) {
    base.b2bContactPhone = flow.b2bContactPhone
  }

  // Reveal companyId only after identity reveal
  if (["IDENTITY_REVEALED", "COMPLETED"].includes(flow.step)) {
    base.companyId = flow.companyId
  }

  return base
}
