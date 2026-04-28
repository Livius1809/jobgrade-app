/**
 * /api/v1/climate
 *
 * Chestionar Climat Organizational — 40 itemi, 8 dimensiuni.
 * GET  — Stare chestionar + rezultate colective
 * POST — Trimite raspunsuri (individual) sau calculeaza colectiv
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"
import { CO_DIMENSIONS, scoreRespondent, aggregateResults, type COResult } from "@/lib/climate/questionnaire"

export const dynamic = "force-dynamic"

interface ClimateState {
  sessions: Array<{
    id: string
    level: string // nivelul ierarhic
    createdAt: string
    status: "COLLECTING" | "COMPLETED"
  }>
  responses: Array<{
    sessionId: string
    respondentCode: string
    respondentGroup: string
    answers: number[]
    completedAt: string
  }>
  results: COResult[]
}

async function getState(tenantId: string): Promise<ClimateState> {
  return await getTenantData<ClimateState>(tenantId, "CLIMATE_CO") || { sessions: [], responses: [], results: [] }
}

async function saveState(tenantId: string, state: ClimateState): Promise<void> {
  await setTenantData(tenantId, "CLIMATE_CO", state)
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const state = await getState(session.user.tenantId)

  // Agregate per sesiune completata
  const sessionResults = state.sessions.map(s => {
    const sessionResponses = state.responses.filter(r => r.sessionId === s.id)
    const scored = sessionResponses.map(r =>
      scoreRespondent(r.respondentCode, r.respondentGroup, r.answers)
    )
    const aggregate = aggregateResults(scored)
    const byGroup: Record<string, ReturnType<typeof aggregateResults>> = {}
    const groups = [...new Set(scored.map(r => r.respondentGroup))]
    for (const g of groups) byGroup[g] = aggregateResults(scored, g)

    return {
      ...s,
      respondentCount: sessionResponses.length,
      completed: sessionResponses.length,
      aggregate,
      byGroup,
    }
  })

  return NextResponse.json({
    dimensions: CO_DIMENSIONS.map(d => ({ id: d.id, label: d.label, description: d.description, itemCount: d.items.length })),
    sessions: sessionResults,
    totalResponses: state.responses.length,
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const body = await req.json()
  const { action } = body
  const state = await getState(session.user.tenantId)

  // Creaza sesiune noua per nivel ierarhic
  if (action === "create-session") {
    const { level } = body
    if (!level) return NextResponse.json({ error: "level obligatoriu" }, { status: 400 })

    const id = `co_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    state.sessions.push({ id, level, createdAt: new Date().toISOString(), status: "COLLECTING" })
    await saveState(session.user.tenantId, state)
    return NextResponse.json({ ok: true, sessionId: id })
  }

  // Trimite raspuns individual
  if (action === "submit-response") {
    const { sessionId, respondentCode, respondentGroup, answers } = body
    if (!sessionId || !respondentCode || !answers || answers.length !== 40) {
      return NextResponse.json({ error: "sessionId, respondentCode si 40 answers obligatorii" }, { status: 400 })
    }

    // Validare raspunsuri
    for (const a of answers) {
      if (typeof a !== "number" || a < 1 || a > 7) {
        return NextResponse.json({ error: "Fiecare raspuns trebuie sa fie intre 1 si 7" }, { status: 400 })
      }
    }

    // Elimina raspuns anterior al aceluiasi respondent
    state.responses = state.responses.filter(r => !(r.sessionId === sessionId && r.respondentCode === respondentCode))

    state.responses.push({
      sessionId,
      respondentCode,
      respondentGroup: respondentGroup || "NPM",
      answers,
      completedAt: new Date().toISOString(),
    })

    // Scoreaza
    const result = scoreRespondent(respondentCode, respondentGroup || "NPM", answers)

    await saveState(session.user.tenantId, state)

    // Learning
    try {
      const { learnFromClientInput } = await import("@/lib/learning-hooks")
      await learnFromClientInput(session.user.tenantId, "CLIMATE_CO", `Raspuns CO: ${respondentCode} (${respondentGroup}), overall=${result.overallMean} ${result.overallLevel}`)
    } catch {}

    return NextResponse.json({ ok: true, result })
  }

  // Finalizeaza sesiune (calculeaza agregat)
  if (action === "complete-session") {
    const { sessionId } = body
    const idx = state.sessions.findIndex(s => s.id === sessionId)
    if (idx < 0) return NextResponse.json({ error: "Sesiune negasita" }, { status: 404 })

    state.sessions[idx].status = "COMPLETED"

    // Scoreaza toti respondentii din sesiune
    const sessionResponses = state.responses.filter(r => r.sessionId === sessionId)
    const scored = sessionResponses.map(r =>
      scoreRespondent(r.respondentCode, r.respondentGroup, r.answers)
    )
    state.results = [...state.results.filter(r => !scored.find(s => s.respondentCode === r.respondentCode)), ...scored]

    await saveState(session.user.tenantId, state)

    return NextResponse.json({
      ok: true,
      aggregate: aggregateResults(scored),
      respondentCount: scored.length,
    })
  }

  // Returneaza itemii chestionarului (pentru UI completare)
  if (action === "get-items") {
    return NextResponse.json({
      dimensions: CO_DIMENSIONS.map(d => ({
        id: d.id,
        label: d.label,
        description: d.description,
        items: d.items,
      })),
      totalItems: 40,
      scale: { min: 1, max: 7, labels: ["Dezacord total", "Dezacord", "Dezacord partial", "Neutru", "Acord partial", "Acord", "Acord total"] },
    })
  }

  return NextResponse.json({ error: "action necunoscuta" }, { status: 400 })
}
