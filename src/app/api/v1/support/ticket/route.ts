/**
 * /api/v1/support/ticket
 *
 * POST — Client creează ticket de suport
 * GET  — Client vede ticketele sale + statusuri + răspunsuri
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createTicket, refineTicket, routeTicket } from "@/lib/support/ticket-engine"

export const dynamic = "force-dynamic"
export const maxDuration = 30

// POST — Creare ticket
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const body = await req.json()
  const { subject, description, ticketType, source } = body

  if (!subject?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "Subiect si descriere obligatorii" }, { status: 400 })
  }

  // 1. Creare ticket
  const ticketId = await createTicket({
    tenantId: session.user.tenantId,
    createdBy: session.user.id,
    subject: subject.trim(),
    description: description.trim(),
    ticketType: ticketType || "SUPORT",
    source: source || "DIRECT",
  })

  // 2. Rafinare automată FW
  const refinement = await refineTicket(ticketId)

  // 3. Dacă nu are nevoie de info suplimentar → rutare directă
  if (!refinement.needsMoreInfo) {
    const routing = await routeTicket(ticketId)
    return NextResponse.json({
      ticketId,
      status: "ROUTED",
      affectedFlow: refinement.affectedFlow,
      routedTo: routing.routedTo,
      message: "Solicitarea ta a fost inregistrata si directionata. Vei primi raspuns in cel mai scurt timp.",
    })
  }

  // Trebuie info suplimentar
  return NextResponse.json({
    ticketId,
    status: "REFINING",
    followUpQuestion: refinement.followUpQuestion,
    message: "Am nevoie de o clarificare ca sa te pot ajuta mai bine.",
  })
}

// POST cu ticketId — Client răspunde la întrebarea suplimentară
export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const body = await req.json()
  const { ticketId, additionalInfo } = body

  if (!ticketId || !additionalInfo?.trim()) {
    return NextResponse.json({ error: "ticketId si additionalInfo obligatorii" }, { status: 400 })
  }

  const p = prisma as any

  // Actualizăm descrierea cu info suplimentar
  const ticket = await p.supportTicket.findFirst({
    where: { id: ticketId, tenantId: session.user.tenantId },
  })

  if (!ticket) return NextResponse.json({ error: "Ticket negasit" }, { status: 404 })

  await p.supportTicket.update({
    where: { id: ticketId },
    data: {
      description: `${ticket.description}\n\n--- Info suplimentar ---\n${additionalInfo.trim()}`,
    },
  })

  // Re-rafinare + rutare
  await refineTicket(ticketId)
  const routing = await routeTicket(ticketId)

  return NextResponse.json({
    ticketId,
    status: "ROUTED",
    routedTo: routing.routedTo,
    message: "Multumesc. Solicitarea ta a fost directionata.",
  })
}

// GET — Ticketele clientului
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const p = prisma as any

  const tickets = await p.supportTicket.findMany({
    where: { tenantId: session.user.tenantId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      subject: true,
      status: true,
      priority: true,
      affectedFlow: true,
      resolution: true,
      clientResponse: true,
      respondedAt: true,
      clientRating: true,
      clientFeedback: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ tickets })
}

// PATCH — Client evalueaza satisfactia dupa rezolvare
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const body = await req.json()
  const { ticketId, ratings } = body
  // ratings: { rezultat: 1-5, timpRaspuns: 1-5, comunicare: 1-5, comentariu?: string }

  if (!ticketId || !ratings) {
    return NextResponse.json({ error: "ticketId si ratings obligatorii" }, { status: 400 })
  }

  const p = prisma as any
  const ticket = await p.supportTicket.findFirst({
    where: { id: ticketId, tenantId: session.user.tenantId },
  })

  if (!ticket) return NextResponse.json({ error: "Ticket negasit" }, { status: 404 })
  if (!["RESPONDED", "RESOLVED"].includes(ticket.status)) {
    return NextResponse.json({ error: "Ticketul nu e inca rezolvat" }, { status: 400 })
  }

  // Scor mediu din cele 3 criterii
  const avgRating = Math.round(
    ((ratings.rezultat || 3) + (ratings.timpRaspuns || 3) + (ratings.comunicare || 3)) / 3
  )

  const feedbackText = [
    `Rezultat: ${ratings.rezultat}/5`,
    `Timp raspuns: ${ratings.timpRaspuns}/5`,
    `Comunicare: ${ratings.comunicare}/5`,
    ratings.comentariu ? `Comentariu: ${ratings.comentariu}` : "",
  ].filter(Boolean).join(" | ")

  await p.supportTicket.update({
    where: { id: ticketId },
    data: {
      clientRating: avgRating,
      clientFeedback: feedbackText,
      status: "CLOSED",
    },
  })

  // Alimentam palnia de invatare cu feedback-ul clientului
  try {
    const { learningFunnel } = await import("@/lib/agents/learning-funnel")
    await learningFunnel({
      agentRole: ticket.routedToAgent || "COCSA",
      type: "FEEDBACK",
      input: `Ticket: ${ticket.subject}`,
      output: `Rating: ${avgRating}/5. ${feedbackText}`,
      success: avgRating >= 3,
      metadata: { source: "client-satisfaction", ticketId, ratings },
    })
  } catch {}

  return NextResponse.json({
    ok: true,
    message: "Multumim pentru feedback. Apreciem fiecare raspuns.",
  })
}
