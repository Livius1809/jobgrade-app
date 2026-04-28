/**
 * /api/v1/owner/notifications
 *
 * GET  — lista notificări Owner (mesaje de la structură, cu metadata cerere)
 * PATCH — Owner răspunde structurat: informație, acces, decizie, acțiune, validare
 *
 * Răspunsul merge înapoi la agentul solicitant prin:
 * 1. KB entry (OWNER_RESPONSE, confidence 1, PERMANENT)
 * 2. Task pentru agent (HIGH priority)
 * 3. Notificarea se marchează ca răspunsă
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session?.user || !["OWNER", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 })
  }

  // Citim notificările + ierarhia de escalare (o singură interogare)
  const [notifications, hierarchy] = await Promise.all([
    (prisma as any).notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        link: true,
        read: true,
        createdAt: true,
        sourceRole: true,
        requestKind: true,
        requestData: true,
        responseKind: true,
        responseData: true,
        respondedAt: true,
      },
    }),
    (prisma as any).agentRelationship.findMany({
      where: { relationType: "REPORTS_TO", isActive: true },
      select: { childRole: true, parentRole: true },
    }).catch(() => []),
  ])

  // Construim lanțul de escalare per agent: agent → șef → director → Owner
  const escalationChains: Record<string, string[]> = {}
  for (const n of notifications) {
    const role = n.sourceRole || extractSourceRole(n.title, n.body)
    if (role && !escalationChains[role]) {
      escalationChains[role] = buildEscalationChain(role, hierarchy)
    }
  }

  // Atașăm lanțul pe fiecare notificare
  const enriched = notifications.map((n: any) => {
    const role = n.sourceRole || extractSourceRole(n.title, n.body)
    return {
      ...n,
      sourceRole: role,
      escalationChain: escalationChains[role] || [],
    }
  })

  return NextResponse.json({ notifications: enriched })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user || !["OWNER", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 })
  }

  const body = await request.json()
  const { id, responseKind, responseText } = body
  if (!id || !responseKind) {
    return NextResponse.json({ error: "id și responseKind obligatorii" }, { status: 400 })
  }

  // Citim notificarea
  const notification = await (prisma as any).notification.findUnique({
    where: { id },
    select: {
      title: true,
      body: true,
      type: true,
      sourceRole: true,
      requestKind: true,
      requestData: true,
    },
  })

  if (!notification) {
    return NextResponse.json({ error: "Notificare inexistentă" }, { status: 404 })
  }

  // Actualizăm notificarea cu răspunsul
  await (prisma as any).notification.update({
    where: { id },
    data: {
      read: true,
      responseKind,
      responseData: responseText ? JSON.stringify({ text: responseText }) : null,
      respondedAt: new Date(),
    },
  })

  // Determinăm rolul destinatar
  const targetRole = notification.sourceRole || extractSourceRole(notification.title, notification.body)

  // ── Procesare per tip răspuns ────────────────────────────────────────────

  const RESPONSE_LABELS: Record<string, string> = {
    INFO_PROVIDED: "Informație furnizată",
    ACCESS_GRANTED: "Acces acordat",
    ACCESS_DENIED: "Acces refuzat",
    APPROVED: "Aprobat",
    REJECTED: "Respins",
    ADJUSTED: "Aprobat cu ajustări",
    ACTION_DONE: "Acțiune realizată",
    VALIDATED: "Validat",
    DELEGATED: "Delegat",
    CLARIFICATION: "Se solicită lămuriri",
  }

  const responseLabel = RESPONSE_LABELS[responseKind] || responseKind

  // 1. Salvăm în KB-ul agentului solicitant (tot ce nu e cerere de lămuriri)
  if (responseKind !== "CLARIFICATION") {
    const kbContent = [
      `[OWNER_RESPONSE:${responseKind}] La solicitarea: "${notification.title}"`,
      `Decizia Owner: ${responseLabel}`,
      responseText ? `Detalii: ${responseText}` : null,
      `Context original: ${(notification.body || "").slice(0, 300)}`,
      notification.requestKind ? `Tip cerere: ${notification.requestKind}` : null,
    ].filter(Boolean).join("\n")

    await (prisma as any).kBEntry.create({
      data: {
        agentRole: targetRole,
        kbType: "PERMANENT",
        content: kbContent,
        tags: ["owner-response", responseKind.toLowerCase(), targetRole.toLowerCase()],
        confidence: 1,
        status: "PERMANENT",
        source: "EXPERT_HUMAN",
      },
    }).catch(() => {})

    // Alimentam learning funnel — Owner response = eveniment DECISION de maxima incredere
    try {
      const { learningFunnel } = await import("@/lib/agents/learning-funnel")
      await learningFunnel({
        agentRole: targetRole,
        type: "DECISION",
        input: notification.title || "",
        output: `[Owner ${responseLabel}] ${responseText || kbContent}`,
        success: responseKind !== "REJECTED",
        metadata: { source: "owner-response", responseKind, notificationId: id },
      })
    } catch {}
  }

  // 2. Creăm task pentru agentul solicitant
  const taskDescriptions: Record<string, string> = {
    INFO_PROVIDED: `Owner a furnizat informația cerută: ${responseText || "(vezi KB)"}`,
    ACCESS_GRANTED: `Owner a acordat accesul solicitat. Puteți proceda.`,
    ACCESS_DENIED: `Owner a refuzat accesul solicitat. Căutați o alternativă sau justificați din nou.`,
    APPROVED: `Owner a aprobat propunerea. Implementați conform planului.`,
    REJECTED: `Owner a respins propunerea. Revizuiți abordarea.`,
    ADJUSTED: `Owner a aprobat cu ajustări: ${responseText || "(vezi KB)"}. Implementați cu modificările indicate.`,
    ACTION_DONE: `Owner a realizat acțiunea cerută: ${responseText || "finalizat"}. Continuați fluxul.`,
    VALIDATED: `Owner a validat rezultatul. Puteți publica/distribui.`,
    DELEGATED: `Owner a delegat: ${responseText || "(vezi detalii)"}. Contactați persoana/echipa indicată.`,
    CLARIFICATION: responseText || "Owner solicită mai mult context înainte de a răspunde.",
  }

  const taskTitle = responseKind === "CLARIFICATION"
    ? `Owner solicită lămuriri: ${notification.title}`
    : `[${responseLabel}] ${notification.title}`

  await (prisma as any).agentTask.create({
    data: {
      title: taskTitle,
      description: taskDescriptions[responseKind] || responseText || responseLabel,
      assignedTo: targetRole,
      assignedBy: "OWNER",
      priority: responseKind === "CLARIFICATION" ? "HIGH" : "MEDIUM",
      status: "ASSIGNED",
      tags: ["owner-response", responseKind.toLowerCase()],
    },
  }).catch(() => {})

  // 3. Dacă e delegat, creăm task și pentru destinatarul delegării
  if (responseKind === "DELEGATED" && responseText) {
    const delegateRole = extractDelegateTarget(responseText)
    if (delegateRole && delegateRole !== targetRole) {
      await (prisma as any).agentTask.create({
        data: {
          title: `Delegat de Owner: ${notification.title}`,
          description: `Owner a delegat această responsabilitate de la ${targetRole}. Context: ${notification.body?.slice(0, 200) || ""}`,
          assignedTo: delegateRole,
          assignedBy: "OWNER",
          priority: "HIGH",
          status: "ASSIGNED",
          tags: ["owner-delegated", targetRole.toLowerCase()],
        },
      }).catch(() => {})
    }
  }

  return NextResponse.json({ ok: true, responseKind })
}

/**
 * Extrage rolul agentului din titlu/body (fallback pentru notificări fără sourceRole)
 */
function extractSourceRole(title: string, body: string): string {
  const combined = `${title} ${body}`

  const bracketMatch = combined.match(/\[([A-Z_]{2,15})\]/)
  if (bracketMatch) return bracketMatch[1]

  const fromMatch = combined.match(/(?:de la|solicitat de|trimis de|generat de)\s+([A-Z_]{2,15})/i)
  if (fromMatch) return fromMatch[1].toUpperCase()

  const prefixMatch = combined.match(/^([A-Z_]{2,10})\s*[:\u2014\-]/)
  if (prefixMatch) return prefixMatch[1]

  const knownRoles = ["COG", "COA", "COCSA", "DOA", "DOAS", "SOA", "PMA", "CJA", "CIA", "MKA", "CMA", "HR_COUNSELOR", "MEDIATOR", "DMA", "CFO", "CCO", "COSO"]
  for (const role of knownRoles) {
    if (combined.includes(role)) return role
  }

  return "COG"
}

/**
 * Extrage rolul destinatarului delegării din textul Owner-ului
 */
function extractDelegateTarget(text: string): string | null {
  const knownRoles = ["COG", "COA", "COCSA", "DOA", "DOAS", "SOA", "PMA", "CJA", "CIA", "MKA", "CMA", "HR_COUNSELOR", "MEDIATOR", "DMA", "CFO", "CCO", "COSO"]
  const upper = text.toUpperCase()
  for (const role of knownRoles) {
    if (upper.includes(role)) return role
  }
  return null
}

/**
 * Construiește lanțul de escalare: agent → șef direct → director → Owner
 * Parcurge ierarhia REPORTS_TO de la agentul solicitant în sus.
 */
function buildEscalationChain(role: string, hierarchy: { childRole: string; parentRole: string }[]): string[] {
  const chain: string[] = []
  let current = role
  const visited = new Set<string>()

  while (current && !visited.has(current)) {
    visited.add(current)
    const parent = hierarchy.find(h => h.childRole === current)
    if (parent) {
      chain.push(parent.parentRole)
      current = parent.parentRole
    } else {
      break
    }
  }

  // Adăugăm OWNER la capăt dacă nu e deja acolo
  if (chain.length === 0 || chain[chain.length - 1] !== "OWNER") {
    chain.push("OWNER")
  }

  return chain
}
