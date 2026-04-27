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
  const { subject, description } = body

  if (!subject?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "Subiect si descriere obligatorii" }, { status: 400 })
  }

  // 1. Creare ticket
  const ticketId = await createTicket({
    tenantId: session.user.tenantId,
    createdBy: session.user.id,
    subject: subject.trim(),
    description: description.trim(),
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
    take: 20,
    select: {
      id: true,
      subject: true,
      status: true,
      priority: true,
      affectedFlow: true,
      clientResponse: true,
      respondedAt: true,
      clientRating: true,
      createdAt: true,
    },
  })

  return NextResponse.json({ tickets })
}
