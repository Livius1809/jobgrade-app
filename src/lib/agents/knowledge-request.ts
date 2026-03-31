/**
 * knowledge-request.ts — Cerere de cunoaștere cu cascadare inteligentă
 *
 * Orice agent poate iniția o cerere. Fluxul:
 * 1. INIȚIATOR trimite cerere la cel pe care-l crede competent
 * 2. RECEPTORUL analizează — dacă e la el, procesează top-down în structura lui
 * 3. Dacă NU e la el → DECLINĂ + distribuie LATERAL la toți peerii
 * 4. Fiecare PEER evaluează relevanța structurii sale
 * 5. Cei relevanți generează mini-procese TOP-DOWN în structurile lor
 * 6. SOLUȚIA se recompune la cel cu ponderea cea mai mare
 * 7. LIVRARE la inițiator + INFORMARE intermediar (dacă a declinat)
 *
 * Procesul e de ÎNVĂȚARE — fiecare participare adaugă experiență în KB.
 */

import Anthropic from "@anthropic-ai/sdk"
import type { PrismaClient } from "@/generated/prisma"

const MODEL = "claude-sonnet-4-20250514"

// ── Types ────────────────────────────────────────────────────────────────────

export interface KnowledgeRequest {
  id: string
  initiator: string        // cine cere
  sentTo: string           // cui a trimis inițial
  question: string         // ce vrea să știe
  context?: string
}

export interface PeerEvaluation {
  peerRole: string
  isRelevant: boolean
  relevanceScore: number   // 0-100
  reason: string
  contribution?: string    // dacă a generat mini top-down
}

export interface KnowledgeResponse {
  request: KnowledgeRequest
  declinedBy?: string                   // cine a declinat (dacă e cazul)
  peerEvaluations: PeerEvaluation[]     // evaluări de la peeri
  leadContributor: string               // cel cu ponderea cea mai mare
  integratedAnswer: string              // soluția finală
  deliveredTo: string                   // inițiatorul
  informedAlso: string[]                // intermediarii informați
  kbEntriesAdded: number
  durationMs: number
}

// ── Pasul 1: Receptorul analizează dacă e la el ──────────────────────────────

async function analyzeCompetence(
  receiverRole: string,
  question: string,
  prisma: PrismaClient
): Promise<{ isCompetent: boolean; reason: string }> {
  const p = prisma as any
  const client = new Anthropic()

  const receiver = await p.agentDefinition.findUnique({
    where: { agentRole: receiverRole },
    select: { displayName: true, description: true },
  })

  const kb = await p.kBEntry.findMany({
    where: { agentRole: receiverRole, status: "PERMANENT" },
    orderBy: { confidence: "desc" },
    take: 3,
    select: { content: true },
  })

  const response = await client.messages.create({
    model: MODEL, max_tokens: 300,
    messages: [{
      role: "user",
      content: `Ești ${receiver?.displayName || receiverRole} (${receiver?.description || ""}).
Ai primit cererea: "${question}"
Cunoașterea ta: ${kb.map((e: any) => e.content.substring(0, 80)).join("; ") || "generală"}

Întrebare: Această cerere intră în competența TA directă sau a structurii de sub tine?
Răspunde JSON: {"isCompetent": true/false, "reason": "de ce da/nu, 1 propoziție"}`,
    }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : "{}"
  const match = text.match(/\{[\s\S]*?\}/)
  if (!match) return { isCompetent: false, reason: "Nu pot evalua" }
  return JSON.parse(match[0])
}

// ── Pasul 2: Distribuie lateral la peeri ──────────────────────────────────────

async function getPeers(role: string, prisma: PrismaClient): Promise<string[]> {
  const p = prisma as any
  const myParent = await p.agentRelationship.findFirst({
    where: { childRole: role, isActive: true, relationType: "REPORTS_TO" },
    select: { parentRole: true },
  })
  if (!myParent) return []

  const siblings = await p.agentRelationship.findMany({
    where: { parentRole: myParent.parentRole, isActive: true, relationType: "REPORTS_TO", childRole: { not: role } },
    select: { childRole: true },
  })
  return siblings.map((s: any) => s.childRole)
}

// ── Pasul 3: Fiecare peer evaluează relevanța ────────────────────────────────

async function evaluatePeer(
  peerRole: string,
  question: string,
  prisma: PrismaClient
): Promise<PeerEvaluation> {
  const p = prisma as any
  const client = new Anthropic()

  const peer = await p.agentDefinition.findUnique({
    where: { agentRole: peerRole },
    select: { displayName: true, description: true },
  })

  const response = await client.messages.create({
    model: MODEL, max_tokens: 400,
    messages: [{
      role: "user",
      content: `Ești ${peer?.displayName || peerRole} (${peer?.description || ""}).
Un coleg a distribuit lateral cererea: "${question}"
Evaluează: structura ta (tu + subordonații tăi) poate contribui la răspuns?
Răspunde JSON: {"isRelevant": true/false, "relevanceScore": 0-100, "reason": "scurt"}`,
    }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : "{}"
  const match = text.match(/\{[\s\S]*?\}/)
  const parsed = match ? JSON.parse(match[0]) : { isRelevant: false, relevanceScore: 0, reason: "Nu pot evalua" }

  return {
    peerRole,
    isRelevant: parsed.isRelevant,
    relevanceScore: parsed.relevanceScore || 0,
    reason: parsed.reason || "",
  }
}

// ── Pasul 4: Mini top-down în structura relevantă ────────────────────────────

async function miniTopDown(
  managerRole: string,
  question: string,
  prisma: PrismaClient
): Promise<string> {
  const p = prisma as any
  const client = new Anthropic()

  // Get subordinates' KB
  const subs = await p.agentRelationship.findMany({
    where: { parentRole: managerRole, isActive: true },
    select: { childRole: true },
  })
  const subRoles = subs.map((s: any) => s.childRole)

  const subKB = await p.kBEntry.findMany({
    where: { agentRole: { in: [managerRole, ...subRoles] }, status: "PERMANENT" },
    orderBy: { confidence: "desc" },
    take: 10,
    select: { agentRole: true, content: true },
  })

  const response = await client.messages.create({
    model: MODEL, max_tokens: 600,
    messages: [{
      role: "user",
      content: `Ești ${managerRole} cu echipa: ${subRoles.join(", ")}.
Cerere de la alt departament: "${question}"
Cunoașterea echipei tale relevantă:
${subKB.map((e: any) => `[${e.agentRole}] ${e.content.substring(0, 100)}`).join("\n")}

Generează contribuția echipei tale la rezolvarea cererii. Concis, 2-4 propoziții.`,
    }],
  })

  return response.content[0].type === "text" ? response.content[0].text : ""
}

// ── Flow complet ─────────────────────────────────────────────────────────────

export async function processKnowledgeRequest(
  initiator: string,
  sentTo: string,
  question: string,
  context: string | undefined,
  prisma: PrismaClient
): Promise<KnowledgeResponse> {
  const start = Date.now()
  const p = prisma as any
  const requestId = `KR-${Date.now()}`

  const request: KnowledgeRequest = { id: requestId, initiator, sentTo, question, context }

  // Pasul 1: Receptorul analizează competența
  const competence = await analyzeCompetence(sentTo, question, prisma)

  let declinedBy: string | undefined
  let peerEvaluations: PeerEvaluation[] = []
  let contributions: Array<{ role: string; score: number; contribution: string }> = []

  if (competence.isCompetent) {
    // Rezolvă direct — mini top-down în structura lui
    const contribution = await miniTopDown(sentTo, question, prisma)
    contributions.push({ role: sentTo, score: 100, contribution })
  } else {
    // Declină + distribuie lateral
    declinedBy = sentTo

    // Pasul 2: Găsește peeri
    const peers = await getPeers(sentTo, prisma)

    // Pasul 3: Fiecare peer evaluează
    for (const peer of peers) {
      try {
        const evaluation = await evaluatePeer(peer, question, prisma)
        peerEvaluations.push(evaluation)

        // Pasul 4: Dacă relevant, mini top-down
        if (evaluation.isRelevant && evaluation.relevanceScore > 30) {
          const contribution = await miniTopDown(peer, question, prisma)
          evaluation.contribution = contribution
          contributions.push({ role: peer, score: evaluation.relevanceScore, contribution })
        }
      } catch (e: any) {
        console.warn(`[KR] Peer ${peer} failed: ${e.message}`)
      }
      await new Promise(r => setTimeout(r, 500))
    }
  }

  // Pasul 5: Recompunere — liderul = cel cu ponderea cea mai mare
  contributions.sort((a, b) => b.score - a.score)
  const leadContributor = contributions[0]?.role || sentTo

  // Pasul 6: Sinteză finală de către lider
  const client = new Anthropic()
  let integratedAnswer = ""

  if (contributions.length > 0) {
    const contribText = contributions
      .map(c => `[${c.role}, relevantă ${c.score}%]: ${c.contribution}`)
      .join("\n\n")

    const synthResponse = await client.messages.create({
      model: MODEL, max_tokens: 800,
      messages: [{
        role: "user",
        content: `Ești ${leadContributor} și integrezi răspunsul la cererea: "${question}"

Contribuții primite:
${contribText}

Integrează într-un SINGUR RĂSPUNS coerent. Tu ai ponderea cea mai mare.
Concis, acționabil, 3-5 propoziții. O singură voce.`,
      }],
    })
    integratedAnswer = synthResponse.content[0].type === "text" ? synthResponse.content[0].text : ""
  } else {
    integratedAnswer = "Nu s-a identificat nicio contribuție relevantă pentru această cerere."
  }

  // Informare intermediar + inițiator
  const informedAlso: string[] = []
  if (declinedBy && declinedBy !== leadContributor) {
    informedAlso.push(declinedBy)
  }

  // KB learn — toți participanții rețin
  let kbEntriesAdded = 0
  for (const c of contributions) {
    try {
      await p.kBEntry.create({
        data: {
          agentRole: c.role, kbType: "SHARED_DOMAIN",
          content: `[Knowledge Request] Cerere de la ${initiator} via ${sentTo}: "${question.substring(0, 60)}". Am contribuit cu ponderea ${c.score}%.`,
          source: "DISTILLED_INTERACTION", confidence: 0.65, status: "PERMANENT",
          tags: ["knowledge-request", "learning", initiator.toLowerCase()],
          usageCount: 0, validatedAt: new Date(),
        },
      })
      kbEntriesAdded++
    } catch {}
  }

  // KB pentru inițiator — a primit răspuns
  try {
    await p.kBEntry.create({
      data: {
        agentRole: initiator, kbType: "SHARED_DOMAIN",
        content: `[Knowledge Response] Am întrebat "${question.substring(0, 60)}". Răspuns integrat de ${leadContributor}: ${integratedAnswer.substring(0, 150)}`,
        source: "DISTILLED_INTERACTION", confidence: 0.70, status: "PERMANENT",
        tags: ["knowledge-response", "learning"],
        usageCount: 0, validatedAt: new Date(),
      },
    })
    kbEntriesAdded++
  } catch {}

  return {
    request,
    declinedBy,
    peerEvaluations,
    leadContributor,
    integratedAnswer,
    deliveredTo: initiator,
    informedAlso,
    kbEntriesAdded,
    durationMs: Date.now() - start,
  }
}
