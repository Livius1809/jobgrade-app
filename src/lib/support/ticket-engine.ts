/**
 * ticket-engine.ts — Motorul de suport client
 *
 * Flow complet:
 * 1. Client semnalează (nu diagnostichează)
 * 2. FW rafinează prin interogare suplimentară
 * 3. CSA identifică fluxul afectat + agentul cu atribuțiile potrivite
 * 4. Rezolvare ierarhică normală (agent → manager → departament)
 * 5. Răspuns calibrat L2 (ton adaptat la starea emoțională)
 * 6. Distilare: ce s-a învățat → KB
 *
 * Filtrare: L1 (moral) + L3 (legal) + Trade Secrets (nu se expun)
 */

import { prisma } from "@/lib/prisma"
import Anthropic from "@anthropic-ai/sdk"
import { getDirectSubordinates } from "@/lib/agents/hierarchy-enforcer"

// ── Categorii fluxuri ──────────────────────────────────────

const FLOW_CATEGORIES = [
  { key: "onboarding", label: "Integrare / Configurare", routeTo: "CSM" },
  { key: "evaluare", label: "Evaluare posturi / Sesiuni", routeTo: "HR_COUNSELOR" },
  { key: "rapoarte", label: "Rapoarte / Export", routeTo: "DOA" },
  { key: "plata", label: "Plată / Facturare / Credite", routeTo: "CFO" },
  { key: "tehnic", label: "Eroare tehnică / Nu funcționează", routeTo: "COA" },
  { key: "cont", label: "Cont / Acces / Utilizatori", routeTo: "COA" },
  { key: "metodologie", label: "Întrebare despre metodologie", routeTo: "HR_COUNSELOR" },
  { key: "feedback", label: "Feedback experienta", routeTo: "CSSA" },
  { key: "solicitare", label: "Solicitare / Cerere functionala", routeTo: "PMA" },
  { key: "altceva", label: "Altceva", routeTo: "COCSA" },
]

// ── Pas 1: Creare ticket ──────────────────────────────────

export async function createTicket(input: {
  tenantId: string
  createdBy: string
  subject: string
  description: string
  source?: "DIRECT" | "CHAT_FW" | "CHAT_CSA" // sursa: client direct, FW din chat, CSA din chat
  ticketType?: "SUPORT" | "FEEDBACK" | "SOLICITARE" // tip: suport clasic, feedback experienta, cerere functionala
}): Promise<string> {
  const p = prisma as any

  // Prefix subiect cu tipul pentru tracking
  const prefix = input.ticketType === "FEEDBACK" ? "[Feedback] "
    : input.ticketType === "SOLICITARE" ? "[Solicitare] "
    : ""

  const ticket = await p.supportTicket.create({
    data: {
      tenantId: input.tenantId,
      createdBy: input.createdBy,
      subject: `${prefix}${input.subject}`,
      description: `${input.description}${input.source ? `\n\n[Sursa: ${input.source}]` : ""}`,
      status: "NEW",
    },
  })

  return ticket.id
}

// ── Pas 2: FW rafinare ───────────────────────────────────

export async function refineTicket(ticketId: string): Promise<{
  refinedDescription: string
  affectedFlow: string
  needsMoreInfo: boolean
  followUpQuestion?: string
}> {
  const p = prisma as any
  const ticket = await p.supportTicket.findUnique({ where: { id: ticketId } })
  if (!ticket) throw new Error("Ticket negăsit")

  const client = new Anthropic()
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    system: `Esti front desk suport. Rafineaza semnalarea clientului.
Identifică: ce flux e afectat, ce simptom descrie, ce așteptare are.
NU diagnostica tehnic. NU sugera soluții. Doar clarifică.

Raspunde JSON:
{
  "refinedDescription": "Descriere rafinata clara",
  "affectedFlow": "onboarding|evaluare|rapoarte|plata|tehnic|cont|metodologie|feedback|solicitare|altceva",
  "needsMoreInfo": true/false,
  "followUpQuestion": "intrebare suplimentara daca needsMoreInfo=true"
}`,
    messages: [{ role: "user", content: `Subiect: ${ticket.subject}\nDescriere: ${ticket.description}` }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : "{}"
  const parsed = JSON.parse(text)

  await p.supportTicket.update({
    where: { id: ticketId },
    data: {
      refinedDescription: parsed.refinedDescription || ticket.description,
      affectedFlow: parsed.affectedFlow || "altceva",
      status: parsed.needsMoreInfo ? "REFINING" : "NEW",
    },
  })

  return parsed
}

// ── Pas 3: CSA rutare ─────────────────────────────────────

export async function routeTicket(ticketId: string): Promise<{
  routedTo: string
  department: string
  reason: string
}> {
  const p = prisma as any
  const ticket = await p.supportTicket.findUnique({ where: { id: ticketId } })
  if (!ticket) throw new Error("Ticket negăsit")

  const flow = FLOW_CATEGORIES.find(f => f.key === ticket.affectedFlow) || FLOW_CATEGORIES[FLOW_CATEGORIES.length - 1]

  // Verifică L3: solicitarea are implicații legale?
  const legalKeywords = /gdpr|date personale|ștergere cont|conformitate|directiva|reclamație/i
  const isLegal = legalKeywords.test(ticket.description) || legalKeywords.test(ticket.refinedDescription || "")

  const routedTo = isLegal ? "CJA" : flow.routeTo
  const department = isLegal ? "Legal" : flow.label

  // Verifică L1: solicitarea implică TRADE SECRETS?
  const tradeSecretKeywords = /algoritm|formula|scor.*intern|cum.*calculat|pret.*intern|marja|cost.*real/i
  const touchesTradeSecret = tradeSecretKeywords.test(ticket.description)

  // Creează task intern de rezolvare
  const task = await p.agentTask.create({
    data: {
      businessId: "biz_jobgrade",
      assignedBy: "CSA",
      assignedTo: routedTo,
      title: `[Ticket suport #${ticketId.slice(0, 8)}] ${ticket.subject}`,
      description: [
        `Client: tenant ${ticket.tenantId}`,
        `Semnalare: ${ticket.refinedDescription || ticket.description}`,
        `Flux afectat: ${department}`,
        touchesTradeSecret ? `\n⚠ ATENȚIE: Solicitarea atinge SECRETE DE SERVICIU. NU expune mecanisme interne, formule, algoritmi sau costuri reale. Răspunde cu valoarea pentru client, nu cu mecanismul intern.` : "",
        `\nRezolvă conform procedurii ierarhice. Dacă nu e în atribuțiile tale, escalează la managerul tău.`,
      ].filter(Boolean).join("\n"),
      taskType: "INVESTIGATION",
      priority: "URGENT",
      status: "ASSIGNED",
      tags: ["support-ticket", `ticket:${ticketId}`, `flow:${ticket.affectedFlow}`, touchesTradeSecret ? "trade-secret-guard" : ""].filter(Boolean),
    },
  })

  await p.supportTicket.update({
    where: { id: ticketId },
    data: {
      status: "ROUTED",
      routedToAgent: routedTo,
      routedToDept: department,
      routedByCSA: true,
      resolutionTaskId: task.id,
      priority: isLegal ? "IMPORTANT_URGENT" : "URGENT",
    },
  })

  return { routedTo, department, reason: isLegal ? "Implicații legale detectate → CJA" : `Flux ${department} → ${routedTo}` }
}

// ── Pas 5: Formulare răspuns client (calibrat L2) ────────

export async function formulateResponse(ticketId: string, internalResolution: string): Promise<string> {
  const p = prisma as any
  const ticket = await p.supportTicket.findUnique({ where: { id: ticketId } })
  if (!ticket) throw new Error("Ticket negăsit")

  const client = new Anthropic()
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    system: `Esti agent suport client. Formuleaza raspunsul catre client pe baza rezolvarii interne.

REGULI:
- Ton cald, profesional, empatic
- NU expune mecanisme interne, algoritmi, formule, costuri reale
- NU folosi jargon tehnic (API, DB, endpoint, deploy)
- Daca rezolvarea implica o actiune a clientului, descrie EXACT ce sa faca (pasi concreti)
- Daca a fost bug tehnic: "Am identificat si rezolvat problema. Te rugam sa..."
- Daca e frustrare: recunoaste, empatie, solutie concreta
- Romana naturala, fara superlative americane

Raspunde cu textul pentru client (direct, nu JSON).`,
    messages: [{
      role: "user",
      content: `Semnalarea clientului: ${ticket.subject}\n${ticket.refinedDescription || ticket.description}\n\nRezolvare interna: ${internalResolution}`,
    }],
  })

  const clientResponse = response.content[0].type === "text" ? response.content[0].text : ""

  await p.supportTicket.update({
    where: { id: ticketId },
    data: {
      status: "RESPONDED",
      resolution: internalResolution,
      clientResponse,
      respondedAt: new Date(),
    },
  })

  return clientResponse
}

// ── Pas 6: Distilare învățare ────────────────────────────

export async function distillTicketLearning(ticketId: string): Promise<void> {
  const p = prisma as any
  const ticket = await p.supportTicket.findUnique({ where: { id: ticketId } })
  if (!ticket || ticket.distilled) return

  // Extrage pattern: ce a semnalat clientul + cum s-a rezolvat
  if (ticket.resolution && ticket.routedToAgent) {
    const { extractPostExecutionLearning } = await import("@/lib/agents/learning-pipeline")
    const artifactId = await extractPostExecutionLearning({
      taskId: ticket.resolutionTaskId || ticketId,
      agentRole: ticket.routedToAgent,
      taskTitle: `Suport: ${ticket.subject}`,
      taskType: "INVESTIGATION",
      result: `Semnalare: ${ticket.refinedDescription || ticket.description}\nRezolvare: ${ticket.resolution}`,
      wasSuccessful: true,
    })

    await p.supportTicket.update({
      where: { id: ticketId },
      data: { distilled: true, learningArtifactId: artifactId },
    })
  }
}
