/**
 * brainstorm-engine.ts — Motor de brainstorming per celulă funcțională
 *
 * Flow:
 * 1. Manager inițiază sesiune cu topic + context
 * 2. Fiecare subordonat generează idei (via Claude, din perspectiva rolului)
 * 3. Ideile sunt evaluate pe 6 criterii (viabilitate, aliniere, piață, cost/beneficii, ușurință, rapiditate)
 * 4. Cele mai bune idei sunt agregate la nivelul superior
 * 5. COG sintetizează și formulează propuneri strategice/tactice → Owner
 */

import { cpuCall } from "@/lib/cpu/gateway"
import type { PrismaClient } from "@/generated/prisma"
import { generateWildCards, formatWildCardsForPrompt } from "./wild-cards"
import { getCoreInjection } from "./moral-core"
import { buildAgentPrompt } from "./agent-prompt-builder"

const MODEL = "claude-sonnet-4-20250514"

// ── Scoring Weights ──────────────────────────────────────────────────────────

const SCORING_WEIGHTS = {
  viability: 0.20,
  alignment: 0.25,    // cea mai importantă — aliniere cu obiectivele
  marketFit: 0.15,
  costBenefit: 0.15,
  easeOfImpl: 0.15,
  timeToValue: 0.10,
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface GeneratedIdea {
  title: string
  description: string
  category: string
}

export interface ScoredIdea {
  ideaId: string
  viability: number
  alignment: number
  marketFit: number
  costBenefit: number
  easeOfImpl: number
  timeToValue: number
  compositeScore: number
  rationale: string
}

export interface AggregationResult {
  parentSessionId: string
  promotedIdeas: number
  strategicProposals: string[]
}

// ── Step 1: Create Session ───────────────────────────────────────────────────

export async function createBrainstormSession(
  initiatedBy: string,
  topic: string,
  context: string,
  prisma: PrismaClient
): Promise<string> {
  const p = prisma as any

  // Get manager's subordinates
  const relationships = await p.agentRelationship.findMany({
    where: { parentRole: initiatedBy, isActive: true, relationType: "REPORTS_TO" },
    select: { childRole: true },
  })
  const subordinates = relationships.map((r: any) => r.childRole)

  // Get manager's level
  const agent = await p.agentDefinition.findUnique({
    where: { agentRole: initiatedBy },
    select: { level: true },
  })

  const session = await p.brainstormSession.create({
    data: {
      initiatedBy,
      level: agent?.level || "OPERATIONAL",
      topic,
      context,
      status: "GENERATING",
      participantRoles: [initiatedBy, ...subordinates],
    },
  })

  return session.id
}

// ── Step 2: Generate Ideas ───────────────────────────────────────────────────

export async function generateIdeas(
  sessionId: string,
  prisma: PrismaClient
): Promise<number> {
  const p = prisma as any
  const session = await p.brainstormSession.findUnique({ where: { id: sessionId } })
  if (!session) throw new Error("Session not found")

  let totalIdeas = 0

  // Get agent descriptions for context
  const agents = await p.agentDefinition.findMany({
    where: { agentRole: { in: session.participantRoles } },
    select: { agentRole: true, displayName: true, description: true },
  })
  const agentMap = new Map<string, { agentRole: string; displayName: string; description: string }>(
    agents.map((a: any) => [a.agentRole, a])
  )

  // Generate wild cards for disruptive thinking
  let wildCardsPrompt = ""
  try {
    const wildCards = await generateWildCards(session.topic, session.context || "")
    wildCardsPrompt = formatWildCardsForPrompt(wildCards)
    console.log(`[BRAINSTORM] Generated ${wildCards.length} wild cards for session`)
  } catch { /* non-blocking */ }

  for (const role of session.participantRoles) {
    const agent = agentMap.get(role)
    if (!agent) continue

    // KB injection — agentul consultă experiența acumulată
    let kbContext = ""
    try {
      const kbEntries = await p.kBEntry.findMany({
        where: { agentRole: role, status: "PERMANENT" },
        orderBy: { confidence: "desc" },
        take: 5,
        select: { content: true, tags: true },
      })
      if (kbEntries.length > 0) {
        kbContext = `\n\nEXPERIENȚA TA ACUMULATĂ (din KB — folosește-o ca bază):
${kbEntries.map((e: any, i: number) => `${i + 1}. ${e.content}`).join("\n")}`
      }
    } catch { /* KB might not have entries */ }

    // Previous brainstorm learnings
    let prevLearnings = ""
    try {
      const prevIdeas = await p.brainstormIdea.findMany({
        where: { generatedBy: role, compositeScore: { gte: 75 } },
        orderBy: { compositeScore: "desc" },
        take: 3,
        select: { title: true, compositeScore: true, scoringRationale: true },
      })
      if (prevIdeas.length > 0) {
        prevLearnings = `\n\nIDEI ANTERIOARE CU SCOR MARE (>75) — construiește pe ele:
${prevIdeas.map((i: any) => `- "${i.title}" (${i.compositeScore}) — ${i.scoringRationale}`).join("\n")}`
      }
    } catch { /* no previous brainstorms */ }

    try {
      const cpuResult = await cpuCall({
        model: MODEL,
        max_tokens: 2048,
        system: "",
        messages: [{
          role: "user",
          content: `${buildAgentPrompt(role, agent.description, {
            additionalContext: `SESIUNE DE BRAINSTORMING
Topic: ${session.topic}
Context: ${session.context || "Nu e specificat context adițional."}
Participanți: ${session.participantRoles.join(", ")}
${kbContext}${prevLearnings}${wildCardsPrompt}`,
          })}

Din perspectiva rolului tău și a experienței acumulate, generează 3-5 idei concrete și acționabile legate de topic.
Fiecare idee trebuie să fie specifică, nu generală. Construiește pe ce ai învățat.
Ideile trebuie să servească BINELE — atât al clientului cât și al organizației.
Dacă sunt provocări wild card, include minim 1 idee disruptivă cu category "disruptive".

Răspunde STRICT JSON:
[
  {
    "title": "Titlu scurt și clar",
    "description": "Descriere detaliată: ce, cum, de ce, impact estimat (2-3 propoziții)",
    "category": "feature|process|tool|restructure|integration|optimization"
  }
]

Nu include text în afara JSON-ului.`,
        }],
        agentRole: role,
        operationType: "brainstorm-generate",
      })

      const text = cpuResult.text || "[]"
      const match = text.match(/\[[\s\S]*\]/)
      if (!match) continue

      const ideas: GeneratedIdea[] = JSON.parse(match[0])
      for (const idea of ideas) {
        await p.brainstormIdea.create({
          data: {
            sessionId,
            generatedBy: role,
            title: idea.title,
            description: idea.description,
            category: idea.category || "feature",
            status: "PROPOSED",
          },
        })
        totalIdeas++
      }
    } catch (e: any) {
      console.warn(`[BRAINSTORM] Generate failed for ${role}: ${e.message}`)
    }
  }

  // Update session status
  await p.brainstormSession.update({
    where: { id: sessionId },
    data: { status: "EVALUATING" },
  })

  return totalIdeas
}

// ── Step 3: Evaluate Ideas ───────────────────────────────────────────────────

export async function evaluateIdeas(
  sessionId: string,
  prisma: PrismaClient
): Promise<number> {
  const p = prisma as any
  const session = await p.brainstormSession.findUnique({ where: { id: sessionId } })
  if (!session) throw new Error("Session not found")

  const ideas = await p.brainstormIdea.findMany({
    where: { sessionId, status: "PROPOSED" },
  })

  if (ideas.length === 0) return 0

  // Batch evaluate — send all ideas to Claude for scoring
  const ideasText = ideas.map((idea: any, i: number) =>
    `${i + 1}. [${idea.generatedBy}] "${idea.title}": ${idea.description}`
  ).join("\n")

  try {
    const cpuResult = await cpuCall({
      model: MODEL,
      max_tokens: 4096,
      system: "",
      messages: [{
        role: "user",
        content: `Evaluează aceste idei din sesiunea de brainstorming a platformei JobGrade.

TOPIC: ${session.topic}
CONTEXT: ${session.context || "Platformă SaaS HR, piață RO, 42 agenți AI, conformitate EU 2023/970"}

IDEI:
${ideasText}

Pentru FIECARE idee, scorează pe 6 criterii (0-100):
1. **viability** — Viabilitate implementare (tehnic fezabil? avem resursele?)
2. **alignment** — Aliniere cu obiectivele platformei (contribuie la misiunea JobGrade?)
3. **marketFit** — Oportunitate de piață (clienții au nevoie? diferențiere competitivă?)
4. **costBenefit** — Raport cost/beneficii (investiția se justifică?)
5. **easeOfImpl** — Ușurință implementare (cât de complex? dependențe?)
6. **timeToValue** — Rapiditate (cât de repede generează valoare?)

Răspunde STRICT JSON array:
[
  {
    "index": 1,
    "viability": 85,
    "alignment": 90,
    "marketFit": 70,
    "costBenefit": 80,
    "easeOfImpl": 60,
    "timeToValue": 75,
    "rationale": "Explicație scurtă: de ce aceste scoruri (1-2 propoziții)"
  }
]

Fii obiectiv și exigent. Score 100 = excepțional, 50 = mediocru, sub 30 = slab.`,
      }],
      agentRole: "COG",
      operationType: "brainstorm-evaluate",
    })

    const text = cpuResult.text || "[]"
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return 0

    const scores: Array<{
      index: number
      viability: number
      alignment: number
      marketFit: number
      costBenefit: number
      easeOfImpl: number
      timeToValue: number
      rationale: string
    }> = JSON.parse(match[0])

    let scored = 0
    for (const s of scores) {
      const idea = ideas[s.index - 1]
      if (!idea) continue

      const composite =
        s.viability * SCORING_WEIGHTS.viability +
        s.alignment * SCORING_WEIGHTS.alignment +
        s.marketFit * SCORING_WEIGHTS.marketFit +
        s.costBenefit * SCORING_WEIGHTS.costBenefit +
        s.easeOfImpl * SCORING_WEIGHTS.easeOfImpl +
        s.timeToValue * SCORING_WEIGHTS.timeToValue

      await p.brainstormIdea.update({
        where: { id: idea.id },
        data: {
          viability: s.viability,
          alignment: s.alignment,
          marketFit: s.marketFit,
          costBenefit: s.costBenefit,
          easeOfImpl: s.easeOfImpl,
          timeToValue: s.timeToValue,
          compositeScore: Math.round(composite * 10) / 10,
          scoringRationale: s.rationale,
          status: "SCORED",
        },
      })
      scored++
    }

    // Rank ideas by composite score
    const allScored = await p.brainstormIdea.findMany({
      where: { sessionId, status: "SCORED" },
      orderBy: { compositeScore: "desc" },
    })
    for (let i = 0; i < allScored.length; i++) {
      await p.brainstormIdea.update({
        where: { id: allScored[i].id },
        data: { rank: i + 1 },
      })
    }

    // Update session
    await p.brainstormSession.update({
      where: { id: sessionId },
      data: { status: "EVALUATED" },
    })

    return scored
  } catch (e: any) {
    console.error("[BRAINSTORM] Evaluate failed:", e.message)
    return 0
  }
}

// ── Step 4: Aggregate to Parent Level ────────────────────────────────────────

export async function aggregateToParent(
  sessionId: string,
  prisma: PrismaClient,
  topN: number = 5
): Promise<AggregationResult | null> {
  const p = prisma as any
  const session = await p.brainstormSession.findUnique({ where: { id: sessionId } })
  if (!session || session.status !== "EVALUATED") return null

  // Get top N ideas
  const topIdeas = await p.brainstormIdea.findMany({
    where: { sessionId, status: "SCORED" },
    orderBy: { compositeScore: "desc" },
    take: topN,
  })

  if (topIdeas.length === 0) return null

  // Find parent manager
  const parentRel = await p.agentRelationship.findFirst({
    where: { childRole: session.initiatedBy, isActive: true, relationType: "REPORTS_TO" },
  })

  if (!parentRel || parentRel.parentRole === "OWNER") {
    // This is COG level — generate strategic proposals for Owner
    return await generateStrategicProposals(session, topIdeas, prisma)
  }

  // Mark top ideas as shortlisted/promoted
  for (const idea of topIdeas) {
    await p.brainstormIdea.update({
      where: { id: idea.id },
      data: { status: "PROMOTED", promotedToLevel: parentRel.parentRole },
    })
  }

  // Create aggregated session at parent level
  const parentAgent = await p.agentDefinition.findUnique({
    where: { agentRole: parentRel.parentRole },
  })

  const parentSession = await p.brainstormSession.create({
    data: {
      initiatedBy: parentRel.parentRole,
      level: parentAgent?.level || "TACTICAL",
      topic: `[Agregat] ${session.topic}`,
      context: `Idei promovate de la ${session.initiatedBy} (${topIdeas.length} din ${session.participantRoles.length} participanți):\n` +
        topIdeas.map((i: any, idx: number) =>
          `${idx + 1}. "${i.title}" (score: ${i.compositeScore}) — ${i.description}`
        ).join("\n"),
      status: "EVALUATED",
      participantRoles: [parentRel.parentRole],
      aggregatedFromId: sessionId,
    },
  })

  // Copy promoted ideas to parent session
  for (const idea of topIdeas) {
    await p.brainstormIdea.create({
      data: {
        sessionId: parentSession.id,
        generatedBy: idea.generatedBy,
        title: idea.title,
        description: idea.description,
        category: idea.category,
        viability: idea.viability,
        alignment: idea.alignment,
        marketFit: idea.marketFit,
        costBenefit: idea.costBenefit,
        easeOfImpl: idea.easeOfImpl,
        timeToValue: idea.timeToValue,
        compositeScore: idea.compositeScore,
        rank: idea.rank,
        scoringRationale: idea.scoringRationale,
        status: "PROMOTED",
        promotedToLevel: parentRel.parentRole,
      },
    })
  }

  // Update original session
  await p.brainstormSession.update({
    where: { id: sessionId },
    data: { status: "AGGREGATED", aggregatedToId: parentSession.id },
  })

  return {
    parentSessionId: parentSession.id,
    promotedIdeas: topIdeas.length,
    strategicProposals: [],
  }
}

// ── Step 5: COG Strategic Proposals for Owner ────────────────────────────────

async function generateStrategicProposals(
  session: any,
  topIdeas: any[],
  prisma: PrismaClient
): Promise<AggregationResult> {
  const p = prisma as any

  const ideasText = topIdeas.map((i: any, idx: number) =>
    `${idx + 1}. "${i.title}" (score: ${i.compositeScore}/100, by ${i.generatedBy})
   ${i.description}
   Scoruri: viabilitate=${i.viability}, aliniere=${i.alignment}, piață=${i.marketFit}, cost/beneficii=${i.costBenefit}, ușurință=${i.easeOfImpl}, rapiditate=${i.timeToValue}
   Rațional: ${i.scoringRationale}`
  ).join("\n\n")

  try {
    const cpuResult = await cpuCall({
      model: MODEL,
      max_tokens: 3000,
      system: "",
      messages: [{
        role: "user",
        content: `Ca COG (Chief Orchestrator General) al platformei JobGrade, formulează propuneri strategice și tactice pentru Owner bazate pe cele mai bune idei din brainstorming.

TOPIC ORIGINAL: ${session.topic}
CONTEXT: Platformă SaaS HR, piață RO, 42 agenți AI, conformitate EU 2023/970, Q4 2026 target lansare

IDEI TOP (deja evaluate și promovate):
${ideasText}

Formulează 2-4 propuneri concrete pentru Owner, fiecare cu:
1. Titlu clar
2. Descriere acționabilă (ce, cum, când)
3. Impact estimat
4. Tip: STRATEGIC (direcție generală) sau TACTIC (acțiune concretă)
5. Prioritate: HIGH/MEDIUM/LOW
6. Timeline estimat

Răspunde STRICT JSON:
[
  {
    "title": "...",
    "description": "...",
    "impact": "...",
    "type": "STRATEGIC|TACTIC",
    "priority": "HIGH|MEDIUM|LOW",
    "timeline": "...",
    "basedOnIdeas": [1, 3]
  }
]`,
      }],
      agentRole: "COG",
      operationType: "brainstorm-strategic-proposals",
    })

    const text = cpuResult.text || "[]"
    const match = text.match(/\[[\s\S]*\]/)
    const proposals: any[] = match ? JSON.parse(match[0]) : []

    const proposalTitles: string[] = []

    for (const prop of proposals) {
      // Create OrgProposal for each strategic proposal
      await p.orgProposal.create({
        data: {
          proposalType: "MODIFY_OBJECTIVES",
          status: "COG_REVIEWED",
          proposedBy: "COG",
          title: `[BRAINSTORM] ${prop.title}`,
          description: prop.description,
          rationale: `Generat din brainstorming "${session.topic}". Impact: ${prop.impact}. Bazat pe ideile: ${(prop.basedOnIdeas || []).join(", ")}. Timeline: ${prop.timeline}`,
          changeSpec: {
            type: prop.type,
            priority: prop.priority,
            timeline: prop.timeline,
            sourceSessionId: session.id,
            basedOnIdeas: prop.basedOnIdeas,
          },
          reviewedByCog: true,
          cogComment: `Propunere ${prop.type} generată din brainstorming. Prioritate: ${prop.priority}.`,
        },
      })
      proposalTitles.push(prop.title)
    }

    // Update session
    await p.brainstormSession.update({
      where: { id: session.id },
      data: { status: "OWNER_REVIEW" },
    })

    // Mark top ideas as approved
    for (const idea of topIdeas) {
      await p.brainstormIdea.update({
        where: { id: idea.id },
        data: { status: "SHORTLISTED" },
      })
    }

    return {
      parentSessionId: session.id,
      promotedIdeas: topIdeas.length,
      strategicProposals: proposalTitles,
    }
  } catch (e: any) {
    console.error("[BRAINSTORM] Strategic proposals failed:", e.message)
    return { parentSessionId: session.id, promotedIdeas: 0, strategicProposals: [] }
  }
}

// ── Full Pipeline (one call) ─────────────────────────────────────────────────

export async function runBrainstormPipeline(
  initiatedBy: string,
  topic: string,
  context: string,
  prisma: PrismaClient,
  options?: { topN?: number; aggregateUp?: boolean }
): Promise<{
  sessionId: string
  ideasGenerated: number
  ideasScored: number
  aggregation: AggregationResult | null
}> {
  const sessionId = await createBrainstormSession(initiatedBy, topic, context, prisma)
  const ideasGenerated = await generateIdeas(sessionId, prisma)
  const ideasScored = await evaluateIdeas(sessionId, prisma)

  let aggregation: AggregationResult | null = null
  if (options?.aggregateUp !== false && ideasScored > 0) {
    aggregation = await aggregateToParent(sessionId, prisma, options?.topN || 5)
  }

  // Distilare automată: top idei → KB entries
  if (ideasScored > 0) {
    await distillBrainstormToKB(sessionId, prisma)
  }

  return { sessionId, ideasGenerated, ideasScored, aggregation }
}

// ── Step 6: Distilare Brainstorm → KB (ciclu virtuos) ────────────────────────
//
// Ideile cu scor mare devin KB entries → agenții învață din brainstorm
// La următorul brainstorm, KB-ul informează generarea → idei mai bune → ...

export async function distillBrainstormToKB(
  sessionId: string,
  prisma: PrismaClient
): Promise<number> {
  const p = prisma as any
  const session = await p.brainstormSession.findUnique({ where: { id: sessionId } })
  if (!session) return 0

  // Get top ideas (score >= 70)
  const topIdeas = await p.brainstormIdea.findMany({
    where: { sessionId, compositeScore: { gte: 70 } },
    orderBy: { compositeScore: "desc" },
    take: 10,
  })

  if (topIdeas.length === 0) return 0

  let distilled = 0

  for (const idea of topIdeas) {
    // Create KB entry for the agent who generated the idea
    const kbContent = `[Brainstorm insight] "${idea.title}": ${idea.description} ` +
      `(Scoruri: viabilitate=${idea.viability}, aliniere=${idea.alignment}, ` +
      `piață=${idea.marketFit}, cost/beneficii=${idea.costBenefit}, ` +
      `ușurință=${idea.easeOfImpl}, rapiditate=${idea.timeToValue}. ` +
      `Scor compozit: ${idea.compositeScore}/100)`

    try {
      await p.kBEntry.create({
        data: {
          agentRole: idea.generatedBy,
          kbType: "PERMANENT",
          content: kbContent,
          source: "DISTILLED_INTERACTION",
          confidence: Math.min(0.9, (idea.compositeScore || 50) / 100),
          status: "PERMANENT",
          tags: ["brainstorm", idea.category || "general", session.topic.substring(0, 30)],
          usageCount: 0,
          validatedAt: new Date(),
        },
      })
      distilled++
    } catch { /* duplicate or other error */ }

    // Also create KB entry for the manager who initiated the session
    if (idea.generatedBy !== session.initiatedBy) {
      try {
        await p.kBEntry.create({
          data: {
            agentRole: session.initiatedBy,
            kbType: "SHARED_DOMAIN",
            content: `[Brainstorm management] Ideea "${idea.title}" de la ${idea.generatedBy} ` +
              `a primit scor ${idea.compositeScore}/100. ${idea.scoringRationale || ""}`,
            source: "DISTILLED_INTERACTION",
            confidence: 0.7,
            status: "PERMANENT",
            tags: ["brainstorm-management", "team-insight", idea.category || "general"],
            usageCount: 0,
            validatedAt: new Date(),
          },
        })
        distilled++
      } catch { /* duplicate */ }
    }
  }

  // Distill brainstorm meta-learnings for the manager
  // What worked, what didn't — patterns across all ideas
  if (topIdeas.length >= 3) {
    const avgScore = topIdeas.reduce((s: number, i: any) => s + (i.compositeScore || 0), 0) / topIdeas.length
    const topCategories = topIdeas.reduce((acc: Record<string, number>, i: any) => {
      acc[i.category || "general"] = (acc[i.category || "general"] || 0) + 1
      return acc
    }, {})
    const dominantCategory = Object.entries(topCategories).sort((a, b) => (b[1] as number) - (a[1] as number))[0]

    try {
      await p.kBEntry.create({
        data: {
          agentRole: session.initiatedBy,
          kbType: "METHODOLOGY",
          content: `[Brainstorm meta-learning] Sesiune "${session.topic}": ` +
            `${topIdeas.length} idei cu scor >=70 (media ${Math.round(avgScore)}). ` +
            `Categoria dominantă: ${dominantCategory?.[0]} (${dominantCategory?.[1]} idei). ` +
            `Cel mai bun contributor: ${topIdeas[0].generatedBy} (${topIdeas[0].compositeScore}). ` +
            `Pattern: echipa generează cele mai bune idei în zona ${dominantCategory?.[0]}.`,
          source: "DISTILLED_INTERACTION",
          confidence: 0.75,
          status: "PERMANENT",
          tags: ["brainstorm-meta", "learning-pattern", "methodology"],
          usageCount: 0,
          validatedAt: new Date(),
        },
      })
      distilled++
    } catch { /* duplicate */ }
  }

  // Alimenteaza palnia de ingestie cu cele mai bune idei
  if (topIdeas.length > 0) {
    try {
      const { learningFunnel } = await import("./learning-funnel")
      await learningFunnel({
        agentRole: session.initiatedBy,
        type: "DECISION",
        input: `Brainstorm "${session.topic}" — ${topIdeas.length} idei top`,
        output: topIdeas.slice(0, 3).map((i: any) =>
          `${i.title} (scor: ${i.compositeScore}): ${(i.description || "").slice(0, 200)}`
        ).join("\n"),
        success: true,
        metadata: { source: "brainstorm-distill", sessionId },
      })
    } catch {}
  }

  console.log(`[BRAINSTORM→KB] Distilled ${distilled} entries from session ${sessionId}`)
  return distilled
}

// ── Owner Decision Feedback → KB ─────────────────────────────────────────────
//
// Când Owner aprobă/respinge o propunere din brainstorm, feedback-ul
// se distilează înapoi în KB-ul COG și al managerului care a inițiat.

export async function distillOwnerDecision(
  proposalId: string,
  prisma: PrismaClient
): Promise<number> {
  const p = prisma as any
  const proposal = await p.orgProposal.findUnique({ where: { id: proposalId } })
  if (!proposal || !proposal.ownerDecision) return 0

  const decision = proposal.ownerDecision // APPROVED, REJECTED, DEFERRED
  const comment = proposal.ownerComment || ""
  let distilled = 0

  // KB entry for COG
  try {
    await p.kBEntry.create({
      data: {
        agentRole: "COG",
        kbType: "METHODOLOGY",
        content: `[Owner feedback] Propunerea "${proposal.title}" a fost ${decision}. ` +
          `${comment ? "Comentariu Owner: " + comment + ". " : ""}` +
          `Rațional propunere: ${proposal.rationale?.substring(0, 200)}. ` +
          `Tip: ${proposal.proposalType}. ` +
          `Lecție: ${decision === "APPROVED" ? "Acest tip de propunere e bine primit" : decision === "REJECTED" ? "Evită propuneri similare fără date suplimentare" : "Owner are nevoie de mai mult timp/informații pentru acest tip de decizie"}.`,
        source: "DISTILLED_INTERACTION",
        confidence: 0.85,
        status: "PERMANENT",
        tags: ["owner-feedback", decision.toLowerCase(), proposal.proposalType.toLowerCase()],
        usageCount: 0,
        validatedAt: new Date(),
      },
    })
    distilled++
  } catch { /* duplicate */ }

  // KB entry for the proposer
  if (proposal.proposedBy !== "COG") {
    try {
      await p.kBEntry.create({
        data: {
          agentRole: proposal.proposedBy,
          kbType: "METHODOLOGY",
          content: `[Decision feedback] Propunerea mea "${proposal.title}" a fost ${decision} de Owner. ` +
            `${comment ? "Feedback: " + comment : "Fără comentariu explicit."}`,
          source: "DISTILLED_INTERACTION",
          confidence: 0.8,
          status: "PERMANENT",
          tags: ["decision-feedback", decision.toLowerCase()],
          usageCount: 0,
          validatedAt: new Date(),
        },
      })
      distilled++
    } catch { /* duplicate */ }
  }

  return distilled
}
