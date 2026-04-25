/**
 * POST /api/v1/owner/request-report
 *
 * Owner cere un raport punctual de la un agent.
 * Creează un task HIGH priority pentru agentul destinatar.
 * Când agentul termină, depune rezultatul în Inbox Owner via /api/v1/owner/report.
 *
 * Body: { targetRole: "COG", subject: "Ce vrei să afli" }
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !["OWNER", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Acces rezervat Owner" }, { status: 401 })
  }

  const body = await req.json()
  const { targetRole, subject } = body

  if (!targetRole || !subject?.trim()) {
    return NextResponse.json({ error: "targetRole si subject sunt obligatorii" }, { status: 400 })
  }

  const p = prisma as any

  // Verifică că agentul există
  const agent = await p.agentDefinition.findFirst({
    where: { agentRole: targetRole, isActive: true },
    select: { agentRole: true, displayName: true },
  })

  if (!agent) {
    return NextResponse.json({ error: `Agentul ${targetRole} nu exista sau nu e activ` }, { status: 404 })
  }

  // Creează task pentru agent
  const task = await p.agentTask.create({
    data: {
      assignedTo: targetRole,
      title: `Raport cerut de Owner: ${subject.trim().slice(0, 150)}`,
      description: `Owner-ul a cerut un raport punctual.\n\nSubiect: ${subject.trim()}\n\nInstructiuni:\n- Analizeaza datele disponibile si genereaza un raport structurat\n- Depune raportul in Inbox Owner cand e gata (POST /api/v1/owner/report)\n- Foloseste sectiuni clare: situatie curenta, constatari, recomandari\n- Fii concis dar complet\n- Prioritate: HIGH`,
      taskType: "CONTENT_CREATION",
      priority: "HIGH",
      status: "PENDING",
      createdBy: "OWNER",
    },
  })

  // Notifică Owner-ul că cererea a fost trimisă
  await p.notification.create({
    data: {
      userId: session.user.id,
      type: "GENERAL",
      title: `Cerere raport trimisa catre ${agent.displayName || targetRole}`,
      body: `Subiect: ${subject.trim()}.\n\nTask #${task.id} creat cu prioritate HIGH. Raportul va fi depus in Inbox cand este gata.`,
      read: true, // Owner-ul tocmai a trimis-o, nu e nevoie să o vadă ca necitită
      sourceRole: "OWNER",
      requestKind: "INFORMATION",
      requestData: JSON.stringify({ isReport: true, category: "la-cerere", targetRole }),
      respondedAt: new Date(), // marcată ca "răspunsă" (owner a inițiat-o)
      responseKind: "INFO_PROVIDED",
    },
  })

  return NextResponse.json({
    ok: true,
    taskId: task.id,
    targetRole,
    message: `Cerere trimisa catre ${agent.displayName || targetRole}. Task #${task.id} creat.`,
  })
}
