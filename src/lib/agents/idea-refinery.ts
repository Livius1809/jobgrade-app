/**
 * idea-refinery.ts — Rafinare progresivă a unei idei de business
 *
 * Proces iterativ inspirat din brainstorming skill (curs Silviu Popescu):
 * 1. DESCOMPUNERE — ideea brută → componente (piață, produs, legal, tehnic, financiar, marketing)
 * 2. EVALUARE MULTI-PERSPECTIVĂ — fiecare agent expert evaluează din unghiul lui
 * 3. IDENTIFICARE PUNCTE SLABE — gaps, riscuri, asumpții nevalidate
 * 4. ÎMBUNĂTĂȚIRE — propuneri concrete per componentă
 * 5. RE-SINTEZĂ — ideea rafinată, mai completă și mai coerentă
 * 6. REPEAT — până converge (max 3 iterații)
 *
 * Output: idee rafinată + plan de acțiune + document pentru Owner
 */

import Anthropic from "@anthropic-ai/sdk"
import type { PrismaClient } from "@/generated/prisma"

const MODEL = "claude-sonnet-4-20250514"

// ── Types ────────────────────────────────────────────────────────────────────

export interface IdeaComponent {
  dimension: string       // "PIAȚĂ" | "PRODUS" | "LEGAL" | "TEHNIC" | "FINANCIAR" | "MARKETING" | "OPERAȚIONAL"
  currentState: string    // ce avem acum
  gaps: string[]          // ce lipsește
  improvements: string[]  // propuneri concrete
  evaluatedBy: string     // agentRole
  score: number           // 0-100
}

export interface RefineryIteration {
  iteration: number
  components: IdeaComponent[]
  synthesis: string       // ideea re-sintetizată
  overallScore: number    // medie ponderată
  convergenceDelta: number // diferența față de iterația anterioară
}

export interface RefineryResult {
  originalIdea: string
  iterations: RefineryIteration[]
  finalIdea: string
  actionPlan: Array<{
    priority: number
    action: string
    responsible: string
    timeline: string
  }>
  readinessScore: number  // 0-100 — cât de pregătită e ideea pentru execuție
  kbEntriesAdded: number
  durationMs: number
}

// ── Evaluator Roles per Dimension ────────────────────────────────────────────

const DIMENSION_EVALUATORS: Record<string, { roles: string[]; prompt: string }> = {
  "PIAȚĂ": {
    roles: ["CIA", "RDA", "SOA"],
    prompt: "Evaluează din perspectiva pieței: dimensiune, segmente, competiție, timing, bariere de intrare, diferențiatori.",
  },
  "PRODUS": {
    roles: ["PMA", "FDA", "BDA"],
    prompt: "Evaluează din perspectiva produsului: ce funcționalități sunt necesare, ce există deja, ce lipsește, UX, scalabilitate.",
  },
  "LEGAL": {
    roles: ["CJA", "CAA"],
    prompt: "Evaluează din perspectiva legală: conformitate GDPR, Directiva EU 2023/970, Codul Muncii RO, AI Act, licențe, contracte.",
  },
  "TEHNIC": {
    roles: ["COA", "DPA", "MAA"],
    prompt: "Evaluează din perspectiva tehnică: arhitectură, stack, integrări, performanță, securitate, deployment.",
  },
  "FINANCIAR": {
    roles: ["COAFin", "BCA"],
    prompt: "Evaluează din perspectiva financiară: costuri, pricing, revenue model, break-even, cash flow, investiții necesare.",
  },
  "MARKETING": {
    roles: ["ACA", "CMA", "CWA"],
    prompt: "Evaluează din perspectiva marketing: poziționare, canale, content strategy, campanii, buget, KPIs, go-to-market.",
  },
  "OPERAȚIONAL": {
    roles: ["COCSA", "CSSA", "CSA"],
    prompt: "Evaluează din perspectiva operațională: delivery, suport, onboarding clienți, SLA, procese, echipă necesară.",
  },
}

// ── Run Refinery ─────────────────────────────────────────────────────────────

export async function refineIdea(
  rawIdea: string,
  prisma: PrismaClient,
  maxIterations: number = 3
): Promise<RefineryResult> {
  const start = Date.now()
  const p = prisma as any
  const client = new Anthropic()
  const iterations: RefineryIteration[] = []
  let currentIdea = rawIdea
  let previousScore = 0
  let kbEntriesAdded = 0

  for (let iter = 1; iter <= maxIterations; iter++) {
    console.log(`[REFINERY] Iterația ${iter}/${maxIterations}...`)

    const components: IdeaComponent[] = []

    // Evaluate each dimension
    for (const [dimension, config] of Object.entries(DIMENSION_EVALUATORS)) {
      // Get KB from evaluator agents
      const kbEntries = await p.kBEntry.findMany({
        where: { agentRole: { in: config.roles }, status: "PERMANENT" },
        orderBy: { confidence: "desc" },
        take: 3,
        select: { agentRole: true, content: true },
      })

      const kbContext = kbEntries.map((e: any) => `[${e.agentRole}] ${e.content.substring(0, 120)}`).join("\n")

      try {
        const response = await client.messages.create({
          model: MODEL,
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `RAFINARE IDEE — Dimensiunea ${dimension} (Iterația ${iter})

IDEEA: ${currentIdea}

ROL: ${config.roles.join(", ")}
${config.prompt}

EXPERIENȚĂ RELEVANTĂ:
${kbContext || "Fără experiență anterioară."}

${iter > 1 ? `FEEDBACK ANTERIOR: ${iterations[iter - 2]?.components.find(c => c.dimension === dimension)?.improvements.join("; ") || "N/A"}` : ""}

Evaluează strict și concret. Răspunde JSON:
{
  "currentState": "Ce avem acum pe această dimensiune (1-2 propoziții)",
  "gaps": ["Gap 1", "Gap 2"],
  "improvements": ["Îmbunătățire concretă 1", "Îmbunătățire concretă 2"],
  "score": 0-100
}`,
          }],
        })

        const text = response.content[0].type === "text" ? response.content[0].text : "{}"
        const match = text.match(/\{[\s\S]*\}/)
        if (match) {
          const parsed = JSON.parse(match[0])
          components.push({
            dimension,
            currentState: parsed.currentState || "",
            gaps: parsed.gaps || [],
            improvements: parsed.improvements || [],
            evaluatedBy: config.roles[0],
            score: parsed.score || 50,
          })
        }
      } catch (e: any) {
        console.warn(`[REFINERY] ${dimension} failed: ${e.message}`)
        components.push({
          dimension, currentState: "Evaluare eșuată", gaps: [], improvements: [],
          evaluatedBy: config.roles[0], score: 0,
        })
      }
    }

    // Synthesize improvements into refined idea
    const improvementsSummary = components
      .filter(c => c.improvements.length > 0)
      .map(c => `${c.dimension}: ${c.improvements.join("; ")}`)
      .join("\n")

    try {
      const synthResponse = await client.messages.create({
        model: MODEL,
        max_tokens: 1500,
        messages: [{
          role: "user",
          content: `RE-SINTETIZARE IDEE (Iterația ${iter})

IDEEA CURENTĂ: ${currentIdea}

ÎMBUNĂTĂȚIRI PROPUSE:
${improvementsSummary}

SCORURI PER DIMENSIUNE:
${components.map(c => `${c.dimension}: ${c.score}/100 — ${c.gaps.length} gaps`).join("\n")}

Re-formulează ideea integrând îmbunătățirile propuse. Ideea rafinată trebuie să fie:
- Mai completă (acoperă gaps-urile identificate)
- Mai concretă (numere, date, metrici)
- Mai coerentă (componentele se susțin reciproc)

Răspunde cu ideea rafinată (3-5 paragrafe, concret și acționabil). Fără JSON, doar text.`,
        }],
      })

      currentIdea = synthResponse.content[0].type === "text" ? synthResponse.content[0].text : currentIdea
    } catch { /* keep current idea */ }

    const overallScore = Math.round(
      components.reduce((s, c) => s + c.score, 0) / components.length
    )
    const convergenceDelta = Math.abs(overallScore - previousScore)

    iterations.push({
      iteration: iter,
      components,
      synthesis: currentIdea,
      overallScore,
      convergenceDelta,
    })

    previousScore = overallScore

    // Convergence check: if delta < 5 points, stop
    if (iter > 1 && convergenceDelta < 5) {
      console.log(`[REFINERY] Converged at iteration ${iter} (delta=${convergenceDelta})`)
      break
    }
  }

  // Generate action plan from final iteration
  const finalComponents = iterations[iterations.length - 1]?.components || []
  const actionPlan = finalComponents
    .flatMap((c, idx) => c.improvements.map((imp, i) => ({
      priority: idx * 10 + i + 1,
      action: imp,
      responsible: c.evaluatedBy,
      timeline: c.score < 50 ? "Imediat (Q4 2026)" : c.score < 75 ? "Q1 2027" : "Q2 2027",
    })))
    .slice(0, 15) // max 15 actions

  const readinessScore = iterations[iterations.length - 1]?.overallScore || 0

  // Store final idea in KB
  try {
    await p.kBEntry.create({
      data: {
        agentRole: "COG",
        kbType: "METHODOLOGY",
        content: `[Idee rafinată v${iterations.length}] ${currentIdea.substring(0, 500)}`,
        source: "DISTILLED_INTERACTION",
        confidence: Math.min(0.95, readinessScore / 100),
        status: "PERMANENT",
        tags: ["refined-idea", `v${iterations.length}`, "business-concept"],
        usageCount: 0,
        validatedAt: new Date(),
      },
    })
    kbEntriesAdded++
  } catch {}

  // Store component evaluations
  for (const comp of finalComponents) {
    try {
      await p.kBEntry.create({
        data: {
          agentRole: comp.evaluatedBy,
          kbType: "SHARED_DOMAIN",
          content: `[Evaluare ${comp.dimension}] Score: ${comp.score}/100. Gaps: ${comp.gaps.join("; ")}. Îmbunătățiri: ${comp.improvements.join("; ")}`,
          source: "DISTILLED_INTERACTION",
          confidence: 0.7,
          status: "PERMANENT",
          tags: ["idea-evaluation", comp.dimension.toLowerCase()],
          usageCount: 0,
          validatedAt: new Date(),
        },
      })
      kbEntriesAdded++
    } catch {}
  }

  return {
    originalIdea: rawIdea,
    iterations,
    finalIdea: currentIdea,
    actionPlan,
    readinessScore,
    kbEntriesAdded,
    durationMs: Date.now() - start,
  }
}
