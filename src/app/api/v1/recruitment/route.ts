/**
 * /api/v1/recruitment
 *
 * GET  — List active recruitment flows (B2B sees their jobs, B2C sees their matches)
 * POST — Advance a recruitment flow (action: interested, send_report, invite, reveal, decline)
 *
 * Dual auth: B2B via authOrKey, B2C via extractB2CAuth.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authOrKey } from "@/lib/auth-or-key"
import { extractB2CAuth } from "@/lib/security/b2c-auth"
import {
  listFlows,
  advanceRecruitmentFlow,
  type RecruitmentFlowState,
} from "@/lib/matching/recruitment-flow"

export const dynamic = "force-dynamic"

const advanceSchema = z.object({
  flowId: z.string().min(1),
  action: z.enum(["notify", "interested", "send_report", "invite", "reveal", "complete", "decline"]),
  data: z.record(z.string(), z.unknown()).optional(),
})

/**
 * Anonymize flow data based on current step and actor.
 * Before IDENTITY_REVEALED, B2B sees only alias + scores, no personal data.
 */
function anonymizeForB2B(flow: RecruitmentFlowState): Record<string, unknown> {
  const base = {
    id: flow.id,
    jobId: flow.jobId,
    candidateAlias: flow.candidateAlias,
    step: flow.step,
    matchScore: flow.matchScore,
    matchDetails: flow.matchDetails,
    createdAt: flow.createdAt,
    updatedAt: flow.updatedAt,
  }

  // Only include reports after REPORTS_EXCHANGED
  if (["REPORTS_EXCHANGED", "B2B_INVITED", "IDENTITY_REVEALED", "COMPLETED"].includes(flow.step)) {
    return { ...base, b2bReport: flow.b2bReport }
  }

  return base
}

function anonymizeForB2C(flow: RecruitmentFlowState): Record<string, unknown> {
  const base = {
    id: flow.id,
    jobId: flow.jobId,
    step: flow.step,
    matchScore: flow.matchScore,
    matchDetails: flow.matchDetails,
    createdAt: flow.createdAt,
    updatedAt: flow.updatedAt,
  }

  if (["REPORTS_EXCHANGED", "B2B_INVITED", "IDENTITY_REVEALED", "COMPLETED"].includes(flow.step)) {
    return { ...base, b2cReport: flow.b2cReport }
  }

  // Add phone only at B2B_INVITED step or later
  if (["B2B_INVITED", "IDENTITY_REVEALED", "COMPLETED"].includes(flow.step)) {
    return { ...base, b2cReport: flow.b2cReport, b2bContactPhone: flow.b2bContactPhone }
  }

  return base
}

/**
 * GET — List active recruitment flows
 */
export async function GET(req: NextRequest) {
  // Try B2C auth first
  const b2cAuth = extractB2CAuth(req)
  if (b2cAuth) {
    const flows = await listFlows({ candidateId: b2cAuth.sub, activeOnly: true })
    return NextResponse.json({
      flows: flows.map(anonymizeForB2C),
      total: flows.length,
      role: "B2C",
    })
  }

  // Try B2B auth
  const session = await authOrKey()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat." }, { status: 401 })
  }

  const flows = await listFlows({ companyId: session.user.tenantId, activeOnly: true })
  return NextResponse.json({
    flows: flows.map(anonymizeForB2B),
    total: flows.length,
    role: "B2B",
  })
}

/**
 * POST — Advance a recruitment flow
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = advanceSchema.parse(body)

    // Determine actor
    const b2cAuth = extractB2CAuth(req)
    let actor: "B2C" | "B2B"

    if (b2cAuth) {
      actor = "B2C"
    } else {
      const session = await authOrKey()
      if (!session?.user?.tenantId) {
        return NextResponse.json({ error: "Neautorizat." }, { status: 401 })
      }
      actor = "B2B"
    }

    const flow = await advanceRecruitmentFlow(
      data.flowId,
      data.action,
      actor,
      data.data as Record<string, unknown> | undefined,
    )

    const anonymized = actor === "B2C"
      ? anonymizeForB2C(flow)
      : anonymizeForB2B(flow)

    return NextResponse.json({
      flow: anonymized,
      message: `Flux avansat la pasul "${flow.step}".`,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Date invalide.", details: error.issues },
        { status: 400 },
      )
    }
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      )
    }
    console.error("[recruitment POST]", error)
    return NextResponse.json({ error: "Eroare interna." }, { status: 500 })
  }
}
