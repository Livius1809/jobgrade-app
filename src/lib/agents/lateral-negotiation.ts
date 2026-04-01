/**
 * lateral-negotiation.ts — Protocol de negociere între agenți de același nivel
 *
 * Când doi agenți au poziții diferite pe aceeași temă:
 * 1. Fiecare își expune poziția + argumente (din KB-ul propriu)
 * 2. Claude mediază: identifică puncte comune, diferențe reale, compromis
 * 3. Dacă se ajunge la acord → se loguiește + KB update bilateral
 * 4. Dacă eșuează (3 runde fără acord) → escaladare automată la superior comun
 *
 * Cost: 2-4 apeluri Claude per negociere
 * Trigger: manual (API), sau automat din ciclul proactiv când 2 agenți raportează conflicting actions
 */

import Anthropic from "@anthropic-ai/sdk"
import type { PrismaClient } from "@/generated/prisma"
import { createEscalation } from "./escalation-chain"

const MODEL = "claude-sonnet-4-20250514"
const MAX_ROUNDS = 3

// ── Types ────────────────────────────────────────────────────────────────────

export interface NegotiationPosition {
  agentRole: string
  position: string
  arguments: string[]
  priority: "HIGH" | "MEDIUM" | "LOW"
}

export interface NegotiationRound {
  round: number
  agentAResponse: string
  agentBResponse: string
  mediatorAnalysis: string
  convergenceScore: number // 0-100, how close to agreement
}

export interface NegotiationResult {
  id: string
  agentA: string
  agentB: string
  topic: string
  status: "AGREED" | "COMPROMISED" | "ESCALATED"
  rounds: NegotiationRound[]
  resolution: string
  kbEntriesAdded: number
  escalationId?: string
  durationMs: number
}

// ── Find Common Superior ─────────────────────────────────────────────────────

async function findCommonSuperior(
  roleA: string,
  roleB: string,
  prisma: PrismaClient
): Promise<string> {
  const p = prisma as any
  const rels = await p.agentRelationship.findMany({
    where: { isActive: true, relationType: "REPORTS_TO" },
    select: { childRole: true, parentRole: true },
  })

  const parentMap = new Map<string, string>(rels.map((r: any) => [r.childRole, r.parentRole]))

  // Walk up from A
  const ancestorsA = new Set<string>()
  let current = roleA
  while (parentMap.has(current)) {
    current = parentMap.get(current)!
    ancestorsA.add(current)
  }

  // Walk up from B, find first common
  current = roleB
  while (parentMap.has(current)) {
    current = parentMap.get(current)!
    if (ancestorsA.has(current)) return current
  }

  return "COG" // fallback
}

// ── Run Negotiation ──────────────────────────────────────────────────────────

export async function negotiate(
  topic: string,
  positionA: NegotiationPosition,
  positionB: NegotiationPosition,
  prisma: PrismaClient
): Promise<NegotiationResult> {
  const start = Date.now()
  const p = prisma as any
  const client = new Anthropic()

  // Load KB context for both agents
  const kbA = await p.kBEntry.findMany({
    where: { agentRole: positionA.agentRole, status: "PERMANENT" },
    orderBy: { confidence: "desc" },
    take: 3,
    select: { content: true },
  })

  const kbB = await p.kBEntry.findMany({
    where: { agentRole: positionB.agentRole, status: "PERMANENT" },
    orderBy: { confidence: "desc" },
    take: 3,
    select: { content: true },
  })

  // Load agent descriptions
  const agentA = await p.agentDefinition.findUnique({
    where: { agentRole: positionA.agentRole },
    select: { displayName: true, description: true },
  })
  const agentB = await p.agentDefinition.findUnique({
    where: { agentRole: positionB.agentRole },
    select: { displayName: true, description: true },
  })

  const rounds: NegotiationRound[] = []
  let finalStatus: "AGREED" | "COMPROMISED" | "ESCALATED" = "ESCALATED"
  let resolution = ""

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const previousRounds = rounds.map((r) =>
      `Runda ${r.round}: convergență ${r.convergenceScore}% — ${r.mediatorAnalysis}`
    ).join("\n")

    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: `NEGOCIERE LATERALĂ — Runda ${round}/${MAX_ROUNDS}

TOPIC: ${topic}

AGENT A: ${agentA?.displayName || positionA.agentRole} (${agentA?.description || ""})
Poziția A: ${positionA.position}
Argumente A: ${positionA.arguments.join("; ")}
Experiența A: ${kbA.map((e: any) => e.content.substring(0, 80)).join(" | ") || "limitată"}

AGENT B: ${agentB?.displayName || positionB.agentRole} (${agentB?.description || ""})
Poziția B: ${positionB.position}
Argumente B: ${positionB.arguments.join("; ")}
Experiența B: ${kbB.map((e: any) => e.content.substring(0, 80)).join(" | ") || "limitată"}

${previousRounds ? "RUNDE ANTERIOARE:\n" + previousRounds : ""}

Ca mediator, fă 3 lucruri:
1. Formulează răspunsul lui A la argumentele lui B (empatic, constructiv)
2. Formulează răspunsul lui B la argumentele lui A (empatic, constructiv)
3. Analizează: puncte comune, diferențe reale, și propune un compromis

Răspunde STRICT JSON:
{
  "agentAResponse": "Ce ar spune A în această rundă",
  "agentBResponse": "Ce ar spune B în această rundă",
  "mediatorAnalysis": "Analiză + compromis propus",
  "convergenceScore": 0-100,
  "hasAgreement": true/false,
  "resolution": "Dacă hasAgreement=true, formularea acordului"
}`,
        }],
      })

      const text = response.content[0].type === "text" ? response.content[0].text : "{}"
      const match = text.match(/\{[\s\S]*\}/)
      if (!match) continue

      const parsed = JSON.parse(match[0])

      rounds.push({
        round,
        agentAResponse: parsed.agentAResponse || "",
        agentBResponse: parsed.agentBResponse || "",
        mediatorAnalysis: parsed.mediatorAnalysis || "",
        convergenceScore: parsed.convergenceScore || 0,
      })

      if (parsed.hasAgreement && parsed.convergenceScore >= 70) {
        finalStatus = parsed.convergenceScore >= 90 ? "AGREED" : "COMPROMISED"
        resolution = parsed.resolution || parsed.mediatorAnalysis
        break
      }
    } catch (e: any) {
      console.warn(`[NEGOTIATION] Round ${round} failed: ${e.message}`)
    }
  }

  // Store results
  let kbEntriesAdded = 0
  let escalationId: string | undefined

  if (finalStatus === "AGREED" || finalStatus === "COMPROMISED") {
    // KB entries for both agents — they learned from the negotiation
    for (const role of [positionA.agentRole, positionB.agentRole]) {
      try {
        await p.kBEntry.create({
          data: {
            agentRole: role,
            kbType: "SHARED_DOMAIN",
            content: `[Negociere cu ${role === positionA.agentRole ? positionB.agentRole : positionA.agentRole}] ` +
              `Topic: "${topic}". Rezoluție (${finalStatus}): ${resolution}`,
            source: "DISTILLED_INTERACTION",
            confidence: finalStatus === "AGREED" ? 0.8 : 0.65,
            status: "PERMANENT",
            tags: ["negotiation", finalStatus.toLowerCase(), topic.substring(0, 25)],
            usageCount: 0,
            validatedAt: new Date(),
          },
        })
        kbEntriesAdded++
      } catch { /* duplicate */ }
    }
  } else {
    // Escalate to common superior
    const superior = await findCommonSuperior(positionA.agentRole, positionB.agentRole, prisma)

    try {
      const esc = await createEscalation({
        sourceRole: positionA.agentRole,
        targetRole: superior,
        aboutRole: positionB.agentRole,
        reason: `Negociere eșuată pe "${topic}" între ${positionA.agentRole} și ${positionB.agentRole}. ${MAX_ROUNDS} runde, convergență maximă: ${Math.max(...rounds.map(r => r.convergenceScore), 0)}%.`,
        details: `Poziția A: ${positionA.position}\nPoziția B: ${positionB.position}\nUltima analiză: ${rounds[rounds.length - 1]?.mediatorAnalysis || "N/A"}`,
        priority: positionA.priority === "HIGH" || positionB.priority === "HIGH" ? "HIGH" : "MEDIUM",
      }, prisma)
      escalationId = esc.id
    } catch (e: any) {
      console.warn(`[NEGOTIATION] Escalation failed: ${e.message}`)
    }

    resolution = `Escalat la ${superior} pentru decizie.`
  }

  // Log the negotiation
  try {
    await p.cycleLog.create({
      data: {
        managerRole: positionA.agentRole,
        targetRole: positionB.agentRole,
        actionType: "NEGOTIATE",
        description: `Negociere laterală: "${topic}" — ${finalStatus}`,
        details: JSON.stringify({ rounds: rounds.length, convergence: rounds[rounds.length - 1]?.convergenceScore, resolution }),
        escalationId,
        resolved: finalStatus !== "ESCALATED",
      },
    })
  } catch { /* log fail is non-blocking */ }

  return {
    id: `NEG-${Date.now()}`,
    agentA: positionA.agentRole,
    agentB: positionB.agentRole,
    topic,
    status: finalStatus,
    rounds,
    resolution,
    kbEntriesAdded,
    escalationId,
    durationMs: Date.now() - start,
  }
}
