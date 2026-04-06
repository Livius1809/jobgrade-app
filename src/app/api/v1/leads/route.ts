import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { createTenantFromLead } from "@/lib/leads/onboarding"
import { createOnboardingSequence } from "@/lib/leads/onboarding-sequence"
import { measurePipelineOutcome } from "@/lib/leads/outcome-tracker"
import {
  validateTransition,
  calculateBANTScore,
  checkTransitionRequirements,
  getNextAction,
  getFollowUpIntervalDays,
  type LeadStage,
} from "@/lib/leads/pipeline"

export const dynamic = "force-dynamic"

/**
 * /api/v1/leads
 *
 * Sales pipeline — Lead tracking B2B.
 *
 * GET                          — listare cu filtre
 * POST                         — creare lead
 * PATCH ?id=...&action=transition  — tranziție pipeline
 * PATCH ?id=...                    — update câmpuri
 */

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

// ── GET ────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const stage = url.searchParams.get("stage")
  const assignedAgent = url.searchParams.get("assignedAgent")
  const source = url.searchParams.get("source")
  const followUpDue = url.searchParams.get("followUpDue") === "true"

  const where: Record<string, unknown> = {}
  if (stage) where.stage = stage
  if (assignedAgent) where.assignedAgent = assignedAgent
  if (source) where.source = source
  if (followUpDue) {
    where.nextFollowUpAt = { lte: new Date() }
    where.stage = { notIn: ["CLOSED_WON", "ONBOARDING", "ACTIVE", "CLOSED_LOST"] }
    where.emailSequenceStep = { lt: 3 }
  }

  const leads = await (prisma as any).lead.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 100,
  })

  const byStage: Record<string, number> = {}
  for (const l of leads) {
    byStage[l.stage] = (byStage[l.stage] ?? 0) + 1
  }

  return NextResponse.json({
    leads,
    total: leads.length,
    byStage,
  })
}

// ── POST ───────────────────────────────────────────────────────────────────────

const createSchema = z.object({
  companyName: z.string().min(2),
  contactName: z.string().min(2),
  contactEmail: z.string().email(),
  contactRole: z.string().optional(),
  contactPhone: z.string().optional(),
  companySize: z.string().optional(),
  industry: z.string().optional(),
  website: z.string().optional(),
  source: z.enum(["OUTBOUND_EMAIL", "INBOUND_WEBSITE", "REFERRAL", "LINKEDIN", "EVENT", "MANUAL"]).optional(),
  assignedAgent: z.string().optional(),
  bantBudget: z.boolean().optional(),
  bantAuthority: z.boolean().optional(),
  bantNeed: z.boolean().optional(),
  bantTimeline: z.boolean().optional(),
  bantNotes: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const input = parsed.data
    const score = calculateBANTScore(input)

    const lead = await (prisma as any).lead.create({
      data: {
        companyName: input.companyName,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactRole: input.contactRole,
        contactPhone: input.contactPhone,
        companySize: input.companySize,
        industry: input.industry,
        website: input.website,
        source: input.source ?? "MANUAL",
        assignedAgent: input.assignedAgent ?? "SOA",
        bantBudget: input.bantBudget,
        bantAuthority: input.bantAuthority,
        bantNeed: input.bantNeed,
        bantTimeline: input.bantTimeline,
        bantNotes: input.bantNotes,
        notes: input.notes,
        score,
      },
    })

    return NextResponse.json({
      lead,
      nextAction: getNextAction(lead.stage as LeadStage),
    }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: "create_failed", message }, { status: 500 })
  }
}

// ── PATCH ──────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  const action = url.searchParams.get("action")

  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 })
  }

  const lead = await (prisma as any).lead.findUnique({ where: { id } })
  if (!lead) {
    return NextResponse.json({ error: "lead_not_found" }, { status: 404 })
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>

  // ── Pipeline transition ──
  if (action === "transition") {
    const toStage = body.stage as LeadStage
    if (!toStage) {
      return NextResponse.json({ error: "missing_stage" }, { status: 400 })
    }

    const fromStage = lead.stage as LeadStage
    const validation = validateTransition(fromStage, toStage)
    if (!validation.valid) {
      return NextResponse.json({ error: "invalid_transition", reason: validation.reason }, { status: 422 })
    }

    // Merge body updates for requirement checking
    const mergedLead = {
      score: (body.score as number) ?? lead.score,
      demoAt: (body.demoAt as string) ?? lead.demoAt,
      proposalSentAt: (body.proposalSentAt as string) ?? lead.proposalSentAt,
      lostReason: (body.lostReason as string) ?? lead.lostReason,
    }

    // Recalculate BANT if provided
    if (body.bantBudget !== undefined || body.bantAuthority !== undefined || body.bantNeed !== undefined || body.bantTimeline !== undefined) {
      mergedLead.score = calculateBANTScore({
        bantBudget: (body.bantBudget ?? lead.bantBudget) as boolean,
        bantAuthority: (body.bantAuthority ?? lead.bantAuthority) as boolean,
        bantNeed: (body.bantNeed ?? lead.bantNeed) as boolean,
        bantTimeline: (body.bantTimeline ?? lead.bantTimeline) as boolean,
      })
    }

    const requirements = checkTransitionRequirements(fromStage, toStage, mergedLead)
    if (!requirements.met) {
      return NextResponse.json({ error: "requirements_not_met", missing: requirements.missing }, { status: 422 })
    }

    // Build update data
    const data: Record<string, unknown> = { stage: toStage }

    // BANT fields
    if (body.bantBudget !== undefined) data.bantBudget = body.bantBudget
    if (body.bantAuthority !== undefined) data.bantAuthority = body.bantAuthority
    if (body.bantNeed !== undefined) data.bantNeed = body.bantNeed
    if (body.bantTimeline !== undefined) data.bantTimeline = body.bantTimeline
    if (mergedLead.score !== lead.score) data.score = mergedLead.score

    // Timestamps per stage
    if (toStage === "QUALIFIED") data.qualifiedAt = new Date()
    if (toStage === "DEMO_SCHEDULED" && body.demoAt) data.demoAt = new Date(body.demoAt as string)
    if (toStage === "PROPOSAL") data.proposalSentAt = new Date()
    if (toStage === "CLOSED_WON" || toStage === "CLOSED_LOST") data.closedAt = new Date()
    if (toStage === "CLOSED_LOST" && body.lostReason) data.lostReason = body.lostReason

    // Clear follow-up on terminal stages
    if (["CLOSED_WON", "CLOSED_LOST", "ACTIVE"].includes(toStage)) {
      data.nextFollowUpAt = null
    }

    if (body.notes !== undefined) data.notes = body.notes

    const updated = await (prisma as any).lead.update({ where: { id }, data })

    // ── Triggers pe tranziții speciale ──
    const triggers: Record<string, unknown> = {}

    // CLOSED_WON → auto-create Tenant + onboarding sequence
    if (toStage === "CLOSED_WON") {
      try {
        const tenantResult = await createTenantFromLead(id)
        triggers.tenant = tenantResult

        const business = await prisma.business.findFirst({ where: { code: "jobgrade" } })
        if (business) {
          const onboardingResult = await createOnboardingSequence(id, business.id)
          triggers.onboarding = onboardingResult
        }
      } catch (err) {
        triggers.tenantError = err instanceof Error ? err.message : String(err)
      }
    }

    // ACTIVE → measure pipeline outcome
    if (toStage === "ACTIVE") {
      try {
        const outcomeResult = await measurePipelineOutcome(id)
        triggers.outcome = outcomeResult
      } catch (err) {
        triggers.outcomeError = err instanceof Error ? err.message : String(err)
      }
    }

    return NextResponse.json({
      lead: updated,
      transition: { from: fromStage, to: toStage },
      nextAction: getNextAction(toStage),
      triggers: Object.keys(triggers).length > 0 ? triggers : undefined,
    })
  }

  // ── Regular update ──
  const data: Record<string, unknown> = {}
  const fields = ["contactName", "contactRole", "contactPhone", "companySize", "industry", "website", "notes", "assignedAgent", "threadId", "tenantId"]
  for (const f of fields) {
    if (body[f] !== undefined) data[f] = body[f]
  }

  // Email sequence tracking
  if (body.emailSequenceStep !== undefined) {
    data.emailSequenceStep = body.emailSequenceStep
    data.lastEmailSentAt = new Date()
    const interval = getFollowUpIntervalDays(body.emailSequenceStep as number)
    if (interval > 0) {
      data.nextFollowUpAt = new Date(Date.now() + interval * 86400000)
    } else {
      data.nextFollowUpAt = null
    }
  }

  // BANT update
  if (body.bantBudget !== undefined) data.bantBudget = body.bantBudget
  if (body.bantAuthority !== undefined) data.bantAuthority = body.bantAuthority
  if (body.bantNeed !== undefined) data.bantNeed = body.bantNeed
  if (body.bantTimeline !== undefined) data.bantTimeline = body.bantTimeline
  if (body.bantBudget !== undefined || body.bantAuthority !== undefined || body.bantNeed !== undefined || body.bantTimeline !== undefined) {
    data.score = calculateBANTScore({
      bantBudget: (body.bantBudget ?? lead.bantBudget) as boolean,
      bantAuthority: (body.bantAuthority ?? lead.bantAuthority) as boolean,
      bantNeed: (body.bantNeed ?? lead.bantNeed) as boolean,
      bantTimeline: (body.bantTimeline ?? lead.bantTimeline) as boolean,
    })
  }

  const updated = await (prisma as any).lead.update({ where: { id }, data })
  return NextResponse.json({ lead: updated })
}
