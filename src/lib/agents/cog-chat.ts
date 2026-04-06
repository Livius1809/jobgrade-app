/**
 * cog-chat.ts — Conversație Owner ↔ COG (via Claude ca facilitator)
 *
 * COG răspunde din perspectiva sa strategică, informată de:
 * - KB propriu (experiență acumulată)
 * - Org analysis (gaps, redundanțe, coverage)
 * - Metrici echipă (performance scores)
 * - Business plan curent
 * - Raportul zilnic
 * - Client memory
 *
 * Claude facilitează: traduce business ↔ tehnic, clarifică ambiguități.
 */

import Anthropic from "@anthropic-ai/sdk"
import { buildAgentPrompt } from "./agent-prompt-builder"
import { calibrateOwnerInput, getCalibrationPromptSection } from "./owner-calibration"
import { logOwnerCalibration } from "./owner-calibration-log"
import type { PrismaClient } from "@/generated/prisma"
import { BINE } from "./moral-core"
import { searchKB } from "@/lib/kb/search"

const MODEL = "claude-sonnet-4-20250514"

export interface CogResponse {
  cogAnswer: string
  dataSources: string[]
  suggestedActions: Array<{ action: string; priority: string }>
  questionsForOwner: string[]
  internalNotes: string  // ce a gândit COG dar nu e relevant pentru Owner
}

export async function chatWithCOG(
  ownerMessage: string,
  prisma: PrismaClient,
  conversationHistory?: Array<{ role: "owner" | "cog"; content: string }>
): Promise<CogResponse> {
  const p = prisma as any
  const client = new Anthropic()

  // ── Gather COG's context ───────────────────────────────────────────────────

  // KB — semantic search based on owner's message
  const cogKB = await searchKB("COG", ownerMessage, 10).catch(() => [])


  // Org stats
  const agentCount = await p.agentDefinition.count({ where: { isActive: true } })
  const kbTotal = await p.kBEntry.count({ where: { status: "PERMANENT" } })

  // Pending proposals
  const pendingProposals = await p.orgProposal.findMany({
    where: { status: { in: ["DRAFT", "COG_REVIEWED", "APPROVED"] } },
    select: { title: true, status: true, proposedBy: true },
    take: 5,
  })

  // Recent escalations
  const openEscalations = await p.escalation.findMany({
    where: { status: { in: ["OPEN", "TIMEOUT"] } },
    select: { aboutRole: true, reason: true, priority: true },
    take: 5,
  })

  // Latest metrics
  const metrics = await p.agentMetric.findMany({
    orderBy: { periodEnd: "desc" },
    distinct: ["agentRole"],
    take: 5,
    select: { agentRole: true, performanceScore: true },
  })
  const avgScore = metrics.length > 0
    ? Math.round(metrics.reduce((s: number, m: any) => s + (m.performanceScore || 0), 0) / metrics.length)
    : 0

  // Recent brainstorm insights
  const recentIdeas = await p.brainstormIdea.findMany({
    where: { compositeScore: { gte: 75 } },
    orderBy: { compositeScore: "desc" },
    take: 3,
    select: { title: true, compositeScore: true, generatedBy: true },
  })

  // ── Build COG system prompt ────────────────────────────────────────────────

  const historyText = (conversationHistory || [])
    .map(h => `${h.role === "owner" ? "OWNER" : "COG"}: ${h.content}`)
    .join("\n\n")

  const cogContext = `Vorbești DIRECT cu Owner-ul (Liviu Stroie, fondator Psihobusiness Consulting SRL).

ECHIPA TA: ${agentCount} agenți AI activi
KB TOTAL: ${kbTotal} entries (experiență acumulată)
PERFORMANȚĂ MEDIE: ${avgScore}/100

EXPERIENȚA TA (top KB):
${cogKB.map((e: any) => "- " + e.content.substring(0, 150)).join("\n")}

PROPUNERI ACTIVE:
${pendingProposals.length > 0 ? pendingProposals.map((p: any) => `- [${p.status}] ${p.title} (de la ${p.proposedBy})`).join("\n") : "Nicio propunere activă."}

ESCALADĂRI DESCHISE:
${openEscalations.length > 0 ? openEscalations.map((e: any) => `- [${e.priority}] ${e.aboutRole}: ${e.reason.substring(0, 80)}`).join("\n") : "Nicio escaladare."}

IDEI TOP DIN BRAINSTORMING:
${recentIdeas.length > 0 ? recentIdeas.map((i: any) => `- "${i.title}" (${i.compositeScore}, by ${i.generatedBy})`).join("\n") : "Nicio idee recentă."}

REGULI DE COMUNICARE:
1. Vorbești direct, la obiect, fără jargon excesiv
2. Când propui ceva, include: CE, DE CE, CÂT COSTĂ, CÂT DUREAZĂ
3. Dacă nu știi ceva, spune explicit și propune cum să aflăm
4. Dacă Owner-ul cere ceva ce contravine datelor tale, explică respectuos de ce
5. Dacă o propunere nu servește BINELE clientului, semnalează — chiar dacă e profitabilă
6. Sugerează acțiuni concrete cu responsabil (agent) și timeline
7. Limba: română

${historyText ? `ISTORIC CONVERSAȚIE:\n${historyText}\n` : ""}`

  const systemPrompt = buildAgentPrompt("COG", "Chief Orchestrator General — strategie, viziune, KPI business", {
    additionalContext: cogContext,
    includeSystemPrompt: true,
  })

  // ── Calibrare input Owner pe L1 + L2 + L3 ──────────────────────────────────

  const ownerCalibration = calibrateOwnerInput(ownerMessage)
  const calibrationSection = getCalibrationPromptSection(ownerCalibration)

  // Loghează și propagă calibrarea
  logOwnerCalibration(ownerCalibration, "cog-chat", prisma).catch(() => {})

  // Injectează calibrarea în system prompt dacă sunt discrepanțe
  const enrichedSystemPrompt = calibrationSection
    ? systemPrompt + "\n\n" + calibrationSection
    : systemPrompt

  // ── Call Claude as COG ─────────────────────────────────────────────────────

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: enrichedSystemPrompt,
    messages: [{
      role: "user",
      content: `OWNER: ${ownerMessage}

Răspunde ca COG. Include în răspuns:
1. Răspunsul tău direct la ce întreabă/cere Owner-ul
2. Acțiuni sugerate (dacă e cazul) cu format: [AGENT] acțiune — timeline
3. Întrebări pentru Owner (dacă ai nevoie de clarificări)

Răspunde JSON:
{
  "cogAnswer": "Răspunsul tău complet (2-5 paragrafe, conversațional dar profesional)",
  "dataSources": ["ce surse ai folosit: KB, metrici, propuneri, etc."],
  "suggestedActions": [{"action": "ce trebuie făcut", "priority": "HIGH|MEDIUM|LOW"}],
  "questionsForOwner": ["întrebare 1 dacă ai"],
  "internalNotes": "gânduri interne pe care Owner nu trebuie să le vadă dar sunt utile pentru context"
}`,
    }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : "{}"
  const match = text.match(/\{[\s\S]*\}/)

  if (!match) {
    return {
      cogAnswer: text,
      dataSources: ["direct response"],
      suggestedActions: [],
      questionsForOwner: [],
      internalNotes: "",
    }
  }

  const parsed = JSON.parse(match[0])

  // Atașează calibrarea Owner la răspuns (vizibilă pentru Owner)
  if (ownerCalibration.flags.length > 0) {
    parsed.ownerCalibration = {
      flags: ownerCalibration.flags.map(f => ({
        layer: f.layer,
        severity: f.severity,
        message: f.message,
        suggestion: f.suggestion,
      })),
      hawkinsEstimate: ownerCalibration.hawkinsEstimate,
      isAligned: ownerCalibration.isAligned,
    }
  }

  return parsed
}
