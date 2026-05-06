/**
 * idle-reflection.ts — Reflecție zilnică per agent
 *
 * Fiecare agent revizuiește KB-ul propriu și identifică:
 * - Lacune (ce nu știu dar ar trebui)
 * - Contradicții (entries care se contrazic)
 * - Oportunități (conexiuni neexplorate cu alte domenii)
 * - Acțiuni (brainstorm, propunere, sau actualizare KB)
 *
 * Cost: 1 apel Claude per agent per rulare (~$0.01-0.02/agent)
 * Frecvență: zilnic (cron 03:00)
 * Pregătit pentru extensie ulterioară cu triggere reflexive condiționale.
 */

import { cpuCall } from "@/lib/cpu/gateway"
import { getDailyMoralReflection } from "./moral-core"
import { buildAgentPrompt } from "./agent-prompt-builder"
import type { PrismaClient } from "@/generated/prisma"

const MODEL = "claude-sonnet-4-20250514"
const MAX_KB_ENTRIES_TO_REVIEW = 10
const MIN_CONFIDENCE_FOR_ACTION = 0.6

// ── Types ─────────────────────────────────────────────��──────────────────────

export interface ReflectionInsight {
  type: "GAP" | "CONTRADICTION" | "OPPORTUNITY" | "IMPROVEMENT"
  description: string
  suggestedAction: "BRAINSTORM" | "KB_UPDATE" | "PROPOSAL" | "NONE"
  priority: "HIGH" | "MEDIUM" | "LOW"
}

export interface ReflectionResult {
  agentRole: string
  insights: ReflectionInsight[]
  actionsCreated: number
  kbEntriesAdded: number
  durationMs: number
}

// ── Single Agent Reflection ──────────────────────────────��────────���──────────

export async function reflectAgent(
  agentRole: string,
  prisma: PrismaClient
): Promise<ReflectionResult> {
  const start = Date.now()
  const p = prisma as any

  // Load agent definition
  const agent = await p.agentDefinition.findUnique({
    where: { agentRole },
    select: { agentRole: true, displayName: true, description: true, objectives: true, isManager: true },
  })
  if (!agent) return { agentRole, insights: [], actionsCreated: 0, kbEntriesAdded: 0, durationMs: 0 }

  // Load recent KB entries (most recent + highest confidence)
  const recentKB = await p.kBEntry.findMany({
    where: { agentRole, status: "PERMANENT" },
    orderBy: { createdAt: "desc" },
    take: MAX_KB_ENTRIES_TO_REVIEW,
    select: { content: true, tags: true, confidence: true, source: true, createdAt: true },
  })

  // Load recent propagated entries (knowledge received from others)
  const propagatedKB = await p.kBEntry.findMany({
    where: { agentRole, source: "PROPAGATED", status: "PERMANENT" },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { content: true, propagatedFrom: true, confidence: true },
  })

  // Load recent brainstorm performance
  const recentIdeas = await p.brainstormIdea.findMany({
    where: { generatedBy: agentRole },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { title: true, compositeScore: true, status: true },
  })

  // Build reflection prompt
  const kbSummary = recentKB.length > 0
    ? recentKB.map((e: any, i: number) => `${i + 1}. [${e.source}, conf=${e.confidence}] ${e.content.substring(0, 150)}`).join("\n")
    : "KB gol — nu am experiență acumulată."

  const propagatedSummary = propagatedKB.length > 0
    ? propagatedKB.map((e: any) => `- De la ${e.propagatedFrom}: ${e.content.substring(0, 100)}`).join("\n")
    : "Nicio cunoaștere primită recent de la alți agenți."

  const ideaSummary = recentIdeas.length > 0
    ? recentIdeas.map((i: any) => `- "${i.title}" (score: ${i.compositeScore}, ${i.status})`).join("\n")
    : "Nicio participare la brainstorming recent."

  try {
    const cpuResult = await cpuCall({
      model: MODEL,
      max_tokens: 1500,
      system: "",
      messages: [{
        role: "user",
        content: `${buildAgentPrompt(agentRole, agent.description, {
          additionalContext: agent.objectives?.length ? `Obiectivele tale: ${agent.objectives.join("; ")}` : "",
        })}

${getDailyMoralReflection(agentRole, ["SOA", "CSSA", "CSA", "HR_COUNSELOR", "BCA"].includes(agentRole))}

REFLECȚIE ZILNICĂ — revizuiește ce știi și identifică ce lipsește.

KB-UL TĂU RECENT (top ${recentKB.length} entries):
${kbSummary}

CUNOAȘTERE PRIMITĂ DE LA ALȚII:
${propagatedSummary}

IDEI RECENTE DIN BRAINSTORMING:
${ideaSummary}

Analizează critic și identifică maxim 3 insight-uri:
1. **LACUNE** — ce ar trebui să știi dar nu știi? Ce ți-ar fi util?
2. **CONTRADICȚII** — entries din KB care se contrazic sau sunt depășite?
3. **OPORTUNITĂȚI** — conexiuni neexplorate, idei noi din combinarea cunoștințelor?
4. **ÎMBUNĂTĂȚIRI** — ce s-ar putea face mai bine în domeniul tău?

Pentru fiecare insight, sugerează o acțiune: BRAINSTORM (inițiez sesiune), KB_UPDATE (actualizez cunoștințele), PROPOSAL (propun schimbare structurală), NONE (doar notez).

Răspunde STRICT JSON:
[
  {
    "type": "GAP|CONTRADICTION|OPPORTUNITY|IMPROVEMENT",
    "description": "descriere concretă",
    "suggestedAction": "BRAINSTORM|KB_UPDATE|PROPOSAL|NONE",
    "priority": "HIGH|MEDIUM|LOW"
  }
]

Fii critic și specific. Dacă totul e ok, returnează array gol.`,
      }],
      agentRole: agentRole,
      operationType: "idle-reflection",
    })

    const text = cpuResult.text || "[]"
    const match = text.match(/\[[\s\S]*\]/)
    const insights: ReflectionInsight[] = match ? JSON.parse(match[0]) : []

    // Act on insights
    let actionsCreated = 0
    let kbEntriesAdded = 0

    for (const insight of insights) {
      // Store reflection as KB entry
      try {
        await p.kBEntry.create({
          data: {
            agentRole,
            kbType: "METHODOLOGY",
            content: `[Reflecție ${insight.type}] ${insight.description}`,
            source: "DISTILLED_INTERACTION",
            confidence: MIN_CONFIDENCE_FOR_ACTION,
            status: "PERMANENT",
            tags: ["reflection", insight.type.toLowerCase(), "auto-generated"],
            usageCount: 0,
            validatedAt: new Date(),
          },
        })
        kbEntriesAdded++
      } catch { /* duplicate */ }

      // Create brainstorm session for HIGH priority BRAINSTORM actions
      if (insight.suggestedAction === "BRAINSTORM" && insight.priority === "HIGH" && agent.isManager) {
        try {
          await p.brainstormSession.create({
            data: {
              initiatedBy: agentRole,
              level: agent.level || "OPERATIONAL",
              topic: `[Auto-reflecție] ${insight.description}`,
              context: `Generat automat din reflecția zilnică a ${agentRole}. Tip: ${insight.type}. Prioritate: ${insight.priority}.`,
              status: "GENERATING",
              participantRoles: [agentRole],
            },
          })
          actionsCreated++
        } catch { /* error creating session */ }
      }

      // Create proposal for HIGH priority PROPOSAL actions
      if (insight.suggestedAction === "PROPOSAL" && insight.priority === "HIGH") {
        try {
          await p.orgProposal.create({
            data: {
              proposalType: "MODIFY_OBJECTIVES",
              status: "DRAFT",
              proposedBy: agentRole,
              title: `[Reflecție] ${insight.description.substring(0, 80)}`,
              description: insight.description,
              rationale: `Identificat în reflecția zilnică a ${agentRole}. Tip: ${insight.type}.`,
              changeSpec: { source: "reflection", type: insight.type, agentRole },
            },
          })
          actionsCreated++
        } catch { /* error */ }
      }
    }

    return {
      agentRole,
      insights,
      actionsCreated,
      kbEntriesAdded,
      durationMs: Date.now() - start,
    }
  } catch (e: any) {
    console.warn(`[REFLECTION] ${agentRole} failed: ${e.message}`)
    return { agentRole, insights: [], actionsCreated: 0, kbEntriesAdded: 0, durationMs: Date.now() - start }
  }
}

// ── Batch Reflection (all agents) ────────────────────────���───────────────────

export async function runDailyReflection(
  prisma: PrismaClient,
  options?: { managersOnly?: boolean; roles?: string[] }
): Promise<{
  totalAgents: number
  totalInsights: number
  totalActions: number
  totalKBEntries: number
  results: ReflectionResult[]
}> {
  const p = prisma as any

  const where: any = { isActive: true }
  if (options?.managersOnly) where.isManager = true
  if (options?.roles?.length) where.agentRole = { in: options.roles }

  const agents = await p.agentDefinition.findMany({
    where,
    select: { agentRole: true },
    orderBy: { agentRole: "asc" },
  })

  const results: ReflectionResult[] = []
  let totalInsights = 0
  let totalActions = 0
  let totalKBEntries = 0

  for (const agent of agents) {
    const result = await reflectAgent(agent.agentRole, prisma)
    results.push(result)
    totalInsights += result.insights.length
    totalActions += result.actionsCreated
    totalKBEntries += result.kbEntriesAdded

    // Rate limit: 1s between agents
    await new Promise((r) => setTimeout(r, 1000))
  }

  console.log(`[REFLECTION] Daily: ${agents.length} agents, ${totalInsights} insights, ${totalActions} actions, ${totalKBEntries} KB entries`)

  return { totalAgents: agents.length, totalInsights, totalActions, totalKBEntries, results }
}
