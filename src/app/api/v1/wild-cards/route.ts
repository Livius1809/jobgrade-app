import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { WildCardType } from "@/generated/prisma"
import {
  generateWeeklyWildCards,
  summarizeWildCards,
  type WildCardEvalInput,
} from "@/lib/agents/wild-card-generator"

export const dynamic = "force-dynamic"

/**
 * /api/v1/wild-cards
 *
 * G2 — Wild Cards (Rhythm Layer).
 * Provocări săptămânale per agent.
 *
 * POST   ?action=generate&businessId=...  — generează wild cards pentru săptămâna curentă
 * GET    ?businessId=...&weekOf=...       — listare wild cards
 * PATCH  ?id=...                          — răspuns agent sau review COG
 */

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

export async function GET(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const businessId = url.searchParams.get("businessId")
  if (!businessId) {
    return NextResponse.json({ error: "missing_businessId" }, { status: 400 })
  }

  const weekOf = url.searchParams.get("weekOf")
  const where: Record<string, unknown> = { businessId }
  if (weekOf) where.weekOf = new Date(weekOf)

  const cards = await prisma.wildCard.findMany({
    where,
    orderBy: [{ weekOf: "desc" }, { targetRole: "asc" }],
    take: 100,
  })

  const evalInputs: WildCardEvalInput[] = cards.map((c) => ({
    id: c.id,
    targetRole: c.targetRole,
    prompt: c.prompt,
    response: c.response,
    cogScore: c.cogScore,
    promotedToIdea: c.promotedToIdea,
  }))

  const summary = summarizeWildCards(evalInputs)

  return NextResponse.json({ cards, summary, total: cards.length })
}

export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const action = url.searchParams.get("action")
  const businessId = url.searchParams.get("businessId")

  if (action !== "generate" || !businessId) {
    return NextResponse.json({ error: "required: action=generate&businessId=..." }, { status: 400 })
  }

  // Fetch agenți cu cicluri active (PROACTIVE_CYCLIC + HYBRID)
  const agents = await prisma.agentDefinition.findMany({
    where: { activityMode: { in: ["PROACTIVE_CYCLIC", "HYBRID"] } },
    select: { agentRole: true },
  })

  const roles = agents.map((a) => a.agentRole)
  const generated = generateWeeklyWildCards(roles)

  let created = 0
  let skipped = 0

  for (const card of generated) {
    const weekOfDate = new Date(card.weekOf)

    const existing = await prisma.wildCard.findUnique({
      where: { targetRole_weekOf: { targetRole: card.targetRole, weekOf: weekOfDate } },
    })

    if (existing) {
      skipped++
      continue
    }

    await prisma.wildCard.create({
      data: {
        businessId,
        targetRole: card.targetRole,
        weekOf: weekOfDate,
        prompt: card.prompt,
        promptType: card.promptType as WildCardType,
      },
    })
    created++
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    roles: roles.length,
    created,
    skipped,
    weekOf: generated[0]?.weekOf ?? null,
  })
}

export async function PATCH(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 })

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const data: Record<string, unknown> = {}

  // Agent response
  if (body.response !== undefined) {
    data.response = body.response
    data.respondedAt = new Date()
  }

  // COG review
  if (body.cogReview !== undefined) data.cogReview = body.cogReview
  if (body.cogScore !== undefined) data.cogScore = body.cogScore
  if (body.promotedToIdea !== undefined) data.promotedToIdea = body.promotedToIdea
  if (body.brainstormIdeaId !== undefined) data.brainstormIdeaId = body.brainstormIdeaId

  const updated = await prisma.wildCard.update({ where: { id }, data })

  // Alimentam learning — wild card response = explorare creativa
  if (body.response) {
    try {
      const { learningFunnel } = await import("@/lib/agents/learning-funnel")
      await learningFunnel({
        agentRole: (updated as any).targetRole || "COG", type: "FEEDBACK",
        input: `Wild card: ${(updated as any).prompt || ""}`.slice(0, 500),
        output: String(body.response).slice(0, 1000),
        success: true, metadata: { source: "wild-card", cardId: id },
      })
    } catch {}
  }

  return NextResponse.json({ card: updated })
}
