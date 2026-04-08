/**
 * pattern-sentinel.ts — Detecție semnale slabe ("intuiție" simulată)
 *
 * Scanează KB-ul, metricile și escalările recente pentru a detecta
 * corelații neobvioase care individual par benigne dar împreună
 * indică o problemă emergentă.
 *
 * Echivalent: "gut feeling" al unui manager experimentat.
 *
 * Semnale slabe monitorizate:
 * 1. Acumulare — mai mulți agenți raportează probleme similare independent
 * 2. Tendință — scădere graduală care nu triggerează threshold-uri
 * 3. Absență — ceva care ar trebui să se întâmple dar nu se întâmplă
 * 4. Contradicție — date care se contrazic între surse diferite
 * 5. Timing — coincidențe suspecte
 *
 * Cost: 1 apel Claude per manager per rulare
 */

import Anthropic from "@anthropic-ai/sdk"
import type { PrismaClient } from "@/generated/prisma"

const MODEL = "claude-sonnet-4-20250514"

export interface WeakSignal {
  type: "ACCUMULATION" | "TREND" | "ABSENCE" | "CONTRADICTION" | "TIMING"
  severity: "ALERT" | "WATCH" | "NOTE"
  description: string
  evidence: string[]
  suggestedAction: string
}

export interface SentinelResult {
  agentRole: string
  signals: WeakSignal[]
  kbEntriesAdded: number
  durationMs: number
}

export async function runPatternSentinel(
  agentRole: string,
  prisma: PrismaClient
): Promise<SentinelResult> {
  const start = Date.now()
  const p = prisma as any

  // Collect diverse data sources for this manager
  const agent = await p.agentDefinition.findUnique({
    where: { agentRole },
    select: { displayName: true, description: true, objectives: true, isManager: true },
  })
  if (!agent) return { agentRole, signals: [], kbEntriesAdded: 0, durationMs: 0 }

  // Recent KB entries (last 7 days, all subordinates if manager)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  let subordinateRoles: string[] = [agentRole]
  if (agent.isManager) {
    const rels = await p.agentRelationship.findMany({
      where: { parentRole: agentRole, isActive: true },
      select: { childRole: true },
    })
    subordinateRoles = [agentRole, ...rels.map((r: any) => r.childRole)]
  }

  const recentKB = await p.kBEntry.findMany({
    where: { agentRole: { in: subordinateRoles }, createdAt: { gte: sevenDaysAgo } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { agentRole: true, content: true, tags: true, source: true, confidence: true },
  })

  // Recent escalations
  const recentEscalations = await p.escalation.findMany({
    where: {
      OR: [
        { sourceRole: { in: subordinateRoles } },
        { aboutRole: { in: subordinateRoles } },
      ],
      createdAt: { gte: sevenDaysAgo },
    },
    take: 10,
    select: { sourceRole: true, aboutRole: true, reason: true, status: true, priority: true },
  })

  // Recent cycle logs
  const recentCycles = await p.cycleLog.findMany({
    where: {
      OR: [
        { managerRole: agentRole },
        { targetRole: { in: subordinateRoles } },
      ],
      createdAt: { gte: sevenDaysAgo },
    },
    take: 15,
    select: { managerRole: true, targetRole: true, actionType: true, description: true, resolved: true },
  })

  // Recent brainstorm ideas (if any)
  const recentIdeas = await p.brainstormIdea.findMany({
    where: { generatedBy: { in: subordinateRoles }, createdAt: { gte: sevenDaysAgo } },
    take: 10,
    select: { title: true, compositeScore: true, category: true, generatedBy: true },
  })

  // Build context
  const kbSummary = recentKB.map((e: any) => `[${e.agentRole}/${e.source}] ${e.content.substring(0, 100)}`).join("\n")
  const escalSummary = recentEscalations.map((e: any) => `[${e.priority}/${e.status}] ${e.sourceRole}→about:${e.aboutRole}: ${e.reason.substring(0, 80)}`).join("\n")
  const cycleSummary = recentCycles.map((c: any) => `[${c.actionType}${c.resolved ? "/resolved" : ""}] ${c.managerRole}→${c.targetRole}: ${c.description.substring(0, 60)}`).join("\n")
  const ideaSummary = recentIdeas.map((i: any) => `[${i.generatedBy}] "${i.title}" score:${i.compositeScore}`).join("\n")

  if (recentKB.length === 0 && recentEscalations.length === 0 && recentCycles.length === 0) {
    return { agentRole, signals: [], kbEntriesAdded: 0, durationMs: Date.now() - start }
  }

  const client = new Anthropic()

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: `Ești un "pattern sentinel" — detectezi semnale slabe pe care un manager obișnuit le-ar ignora.

AGENT: ${agent.displayName} (${agent.description})
${agent.objectives?.length ? `OBIECTIVE: ${agent.objectives.join("; ")}` : ""}
ECHIPA: ${subordinateRoles.join(", ")}

DATE DIN ULTIMA SĂPTĂMÂNĂ:

KB entries recente (${recentKB.length}):
${kbSummary || "Niciuna"}

Escalări (${recentEscalations.length}):
${escalSummary || "Niciuna"}

Acțiuni ciclu proactiv (${recentCycles.length}):
${cycleSummary || "Niciuna"}

Idei brainstorming (${recentIdeas.length}):
${ideaSummary || "Niciuna"}

Caută SEMNALE SLABE — lucruri care individual par ok dar împreună pot indica:
1. **ACCUMULATION**: mai mulți agenți raportează variante ale aceleiași probleme
2. **TREND**: scădere graduală care nu a declanșat încă alarme
3. **ABSENCE**: ceva care ar trebui să existe dar lipsește
4. **CONTRADICTION**: date care se contrazic între surse
5. **TIMING**: coincidențe care nu par accidentale

Răspunde STRICT JSON:
[
  {
    "type": "ACCUMULATION|TREND|ABSENCE|CONTRADICTION|TIMING",
    "severity": "ALERT|WATCH|NOTE",
    "description": "Ce ai detectat (1-2 propoziții)",
    "evidence": ["dovada 1", "dovada 2"],
    "suggestedAction": "Ce ar trebui făcut"
  }
]

Fii PARANOIC — mai bine un fals pozitiv decât un semnal ratat. Dacă chiar nu detectezi nimic, returnează [].`,
      }],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : "[]"
    const match = text.match(/\[[\s\S]*\]/)
    const signals: WeakSignal[] = match ? JSON.parse(match[0]) : []

    // Store signals as KB entries
    let kbEntriesAdded = 0
    for (const signal of signals) {
      if (signal.severity === "NOTE") continue // only persist ALERT and WATCH

      try {
        await p.kBEntry.create({
          data: {
            agentRole,
            kbType: "METHODOLOGY",
            content: `[INTUIȚIE/${signal.type}/${signal.severity}] ${signal.description}. Dovezi: ${signal.evidence.join("; ")}. Acțiune: ${signal.suggestedAction}`,
            source: "DISTILLED_INTERACTION",
            confidence: signal.severity === "ALERT" ? 0.7 : 0.5,
            status: "PERMANENT",
            tags: ["intuition", signal.type.toLowerCase(), signal.severity.toLowerCase()],
            usageCount: 0,
            validatedAt: new Date(),
          },
        })
        kbEntriesAdded++
      } catch { /* duplicate */ }
    }

    return { agentRole, signals, kbEntriesAdded, durationMs: Date.now() - start }
  } catch (e: any) {
    console.warn(`[SENTINEL] ${agentRole} failed: ${e.message}`)
    return { agentRole, signals: [], kbEntriesAdded: 0, durationMs: Date.now() - start }
  }
}

/**
 * Run sentinel for all managers.
 */
export async function runAllSentinels(prisma: PrismaClient): Promise<{
  totalManagers: number
  totalSignals: number
  alerts: number
  results: SentinelResult[]
}> {
  const p = prisma as any
  const managers = await p.agentDefinition.findMany({
    where: { isManager: true, isActive: true },
    select: { agentRole: true },
  })

  const settled = await Promise.allSettled(
    managers.map((m: { agentRole: string }) => runPatternSentinel(m.agentRole, prisma))
  )

  const results: SentinelResult[] = []
  let totalSignals = 0
  let alerts = 0

  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      const result = outcome.value
      results.push(result)
      totalSignals += result.signals.length
      alerts += result.signals.filter((s: { severity: string }) => s.severity === "ALERT").length
    } else {
      console.warn(`[SENTINEL] Manager failed: ${outcome.reason}`)
    }
  }

  return { totalManagers: managers.length, totalSignals, alerts, results }
}
