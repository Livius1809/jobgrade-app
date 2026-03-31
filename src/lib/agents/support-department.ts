/**
 * support-department.ts — Departamentul Suport (7 resurse)
 *
 * Mecanism de triaj + colaborare + sinteză pentru cereri de ajutor.
 *
 * Flow:
 * 1. Agent/HR_COUNSELOR trimite cerere la departament (nu la specialist specific)
 * 2. TRIAJ: fiecare resursă evaluează relevanța sa (0-100)
 * 3. Cei relevanți contribuie din perspectiva lor
 * 4. Liderul = cel cu contribuția cea mai mare — integrează
 * 5. Răspuns unificat, validat CÂMP, livrat solicitantului
 *
 * Resurse suport: PSYCHOLINGUIST, PPMO, STA, SOC, SCA, PPA, PSE
 * Client-facing (NU resursă suport): HR_COUNSELOR
 */

import Anthropic from "@anthropic-ai/sdk"
import type { PrismaClient } from "@/generated/prisma"
import { BINE } from "./moral-core"

const MODEL = "claude-sonnet-4-20250514"

const SUPPORT_RESOURCES = [
  { role: "PSYCHOLINGUIST", domain: "comunicare, limbaj, calibrare ton, registru lingvistic, adaptare mesaj" },
  { role: "PPMO", domain: "psihologie organizationala, cultura, dinamica echipe, climat organizational" },
  { role: "STA", domain: "analiza statistica, date, metrici, validare cantitativa, distributii, corelatii" },
  { role: "SOC", domain: "psiho-sociologie, norme sociale, dinamica grupuri, influenta sociala, conformism, context cultural" },
  { role: "SCA", domain: "umbra, biasuri cognitive, distorsiuni, blocaje, discrepante valori declarate vs traite" },
  { role: "PPA", domain: "psihologie pozitiva, puncte forte, flow, wellbeing, motivatie intrinseca, rezilienta, PERMA" },
  { role: "PSE", domain: "stiintele educatiei, invatare, andragogie, design instructional, transfer cunoastere, competente, Bloom" },
]

// ── Types ────────────────────────────────────────────────────────────────────

export interface SupportRequest {
  fromAgent: string          // cine cere (ex: "SOA", "HR_COUNSELOR", "EMA")
  situation: string          // descrierea situației
  context?: string           // context suplimentar
}

export interface ResourceContribution {
  role: string
  relevanceScore: number     // 0-100 cât de relevant e pentru această cerere
  contribution: string       // input-ul din perspectiva sa
  isLead: boolean            // true dacă e liderul echipei de răspuns
}

export interface SupportResponse {
  request: SupportRequest
  triaj: Array<{ role: string; relevance: number }>
  teamLead: string
  contributions: ResourceContribution[]
  integratedResponse: string  // răspunsul unificat
  campValidation: string      // validare CÂMP
  kbEntriesAdded: number
  durationMs: number
}

// ── Triaj ────────────────────────────────────────────────────────────────────

async function triajRequest(
  request: SupportRequest,
  prisma: PrismaClient
): Promise<Array<{ role: string; relevance: number }>> {
  const client = new Anthropic()

  const resourceList = SUPPORT_RESOURCES
    .map(r => `${r.role}: ${r.domain}`)
    .join("\n")

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    messages: [{
      role: "user",
      content: `TRIAJ cerere suport. Evaluează relevanța fiecărei resurse (0-100).

CERERE de la ${request.fromAgent}: "${request.situation}"
${request.context ? `CONTEXT: ${request.context}` : ""}

RESURSE DISPONIBILE:
${resourceList}

Răspunde STRICT JSON array ordonat descrescător după relevanță:
[{"role":"ROLE","relevance":85}, ...]

Doar resurse cu relevanță > 20. Fii precis — nu toți sunt relevanți pentru orice cerere.`,
    }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : "[]"
  const match = text.match(/\[[\s\S]*\]/)
  return match ? JSON.parse(match[0]) : []
}

// ── Contribuție individuală ──────────────────────────────────────────────────

async function getContribution(
  role: string,
  request: SupportRequest,
  prisma: PrismaClient
): Promise<string> {
  const client = new Anthropic()
  const p = prisma as any

  // Get resource's KB
  const kb = await p.kBEntry.findMany({
    where: { agentRole: role, status: "PERMANENT" },
    orderBy: { confidence: "desc" },
    take: 5,
    select: { content: true },
  })

  const resource = SUPPORT_RESOURCES.find(r => r.role === role)

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    messages: [{
      role: "user",
      content: `Ești ${role} (${resource?.domain || role}) în departamentul suport JobGrade.

CERERE de la ${request.fromAgent}: "${request.situation}"
${request.context ? `CONTEXT: ${request.context}` : ""}

CUNOAȘTEREA TA RELEVANTĂ:
${kb.map((e: any) => "- " + e.content.substring(0, 120)).join("\n") || "KB general"}

Oferă contribuția ta SPECIFICĂ la rezolvarea acestei situații, din perspectiva expertizei tale.
Fii concret, acționabil, 3-5 propoziții. Nu repeta ce ar spune alți colegi — doar ce poți tu aduce unic.`,
    }],
  })

  return response.content[0].type === "text" ? response.content[0].text : ""
}

// ── Sinteză integrată (liderul face) ─────────────────────────────────────────

async function synthesizeResponse(
  lead: string,
  contributions: ResourceContribution[],
  request: SupportRequest,
  prisma: PrismaClient
): Promise<string> {
  const client = new Anthropic()

  const contribText = contributions
    .map(c => `[${c.role}${c.isLead ? " — LIDER" : ""}, relevanță ${c.relevanceScore}%]: ${c.contribution}`)
    .join("\n\n")

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    messages: [{
      role: "user",
      content: `Ești ${lead} și conduci echipa de răspuns la această cerere. Integrează contribuțiile colegilor într-un RĂSPUNS UNIFICAT.

CERERE de la ${request.fromAgent}: "${request.situation}"

CONTRIBUȚII ECHIPĂ:
${contribText}

INSTRUCȚIUNI:
1. Integrează TOATE perspectivele relevante într-un singur răspuns coerent
2. Prioritizează pe baza relevanței (scorul de lângă fiecare)
3. Nu lista contribuțiile separat — sintetizează într-o narativă unitară
4. Validează prin prisma BINELUI: răspunsul servește VIAȚA?
5. Oferă recomandări concrete, acționabile
6. Limbaj adaptat solicitantului (${request.fromAgent})

Răspunde ca o SINGURĂ VOCE — departamentul suport, nu 7 opinii separate.`,
    }],
  })

  return response.content[0].type === "text" ? response.content[0].text : ""
}

// ── Flow complet ─────────────────────────────────────────────────────────────

export async function handleSupportRequest(
  request: SupportRequest,
  prisma: PrismaClient
): Promise<SupportResponse> {
  const start = Date.now()
  const p = prisma as any

  // 1. TRIAJ
  const triaj = await triajRequest(request, prisma)
  if (triaj.length === 0) {
    return {
      request, triaj: [], teamLead: "", contributions: [],
      integratedResponse: "Nu s-a identificat nicio resursă relevantă pentru această cerere.",
      campValidation: "", kbEntriesAdded: 0, durationMs: Date.now() - start,
    }
  }

  // 2. Liderul = cel cu contribuția cea mai mare
  const teamLead = triaj[0].role

  // 3. Contribuții de la cei relevanți (relevanță > 20)
  const relevantResources = triaj.filter(t => t.relevance > 20)
  const contributions: ResourceContribution[] = []

  for (const res of relevantResources) {
    try {
      const contribution = await getContribution(res.role, request, prisma)
      contributions.push({
        role: res.role,
        relevanceScore: res.relevance,
        contribution,
        isLead: res.role === teamLead,
      })
    } catch (e: any) {
      console.warn(`[SUPPORT] ${res.role} contribution failed: ${e.message}`)
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 500))
  }

  // 4. Sinteză de către lider
  let integratedResponse = ""
  try {
    integratedResponse = await synthesizeResponse(teamLead, contributions, request, prisma)
  } catch (e: any) {
    // Fallback: liderul răspunde singur
    integratedResponse = contributions.find(c => c.isLead)?.contribution || "Răspuns indisponibil."
  }

  // 5. Validare CÂMP
  const campValidation = `Răspuns generat de echipa suport (lider: ${teamLead}, ${contributions.length} contributori). Servește BINELE: ${BINE.essence}.`

  // 6. Store în KB — departamentul învață
  let kbEntriesAdded = 0
  try {
    // KB entry pentru lider (a integrat)
    await p.kBEntry.create({
      data: {
        agentRole: teamLead, kbType: "SHARED_DOMAIN",
        content: `[Suport integrat] Cerere de la ${request.fromAgent}: "${request.situation.substring(0, 80)}". Am coordonat echipa (${contributions.map(c => c.role).join(", ")}). Soluția: ${integratedResponse.substring(0, 200)}`,
        source: "DISTILLED_INTERACTION", confidence: 0.7, status: "PERMANENT",
        tags: ["support-response", "team-lead", request.fromAgent.toLowerCase()],
        usageCount: 0, validatedAt: new Date(),
      },
    })
    kbEntriesAdded++

    // KB entry pentru fiecare contributor
    for (const c of contributions) {
      if (c.role === teamLead) continue
      try {
        await p.kBEntry.create({
          data: {
            agentRole: c.role, kbType: "SHARED_DOMAIN",
            content: `[Suport contribuție] Cerere despre "${request.situation.substring(0, 60)}". Am contribuit cu: ${c.contribution.substring(0, 150)}`,
            source: "DISTILLED_INTERACTION", confidence: 0.6, status: "PERMANENT",
            tags: ["support-contribution", request.fromAgent.toLowerCase()],
            usageCount: 0, validatedAt: new Date(),
          },
        })
        kbEntriesAdded++
      } catch {}
    }
  } catch {}

  return {
    request,
    triaj,
    teamLead,
    contributions,
    integratedResponse,
    campValidation,
    kbEntriesAdded,
    durationMs: Date.now() - start,
  }
}
