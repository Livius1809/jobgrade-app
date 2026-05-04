/**
 * GET /api/v1/support/analytics
 *
 * Returnează metrici agregate despre satisfacția clienților.
 * Acces: Owner, Super Admin, sau cheie internă.
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Neautorizat" }, { status: 401 })

  const { role } = session.user
  if (!["OWNER", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Acces interzis" }, { status: 403 })
  }

  const p = prisma as any
  const now = new Date()
  const d7 = new Date(now.getTime() - 7 * 86400000)
  const d30 = new Date(now.getTime() - 30 * 86400000)

  // 1. Total tickete + per status
  const statusCounts = await p.supportTicket.groupBy({
    by: ["status"],
    _count: true,
  }) as { status: string; _count: number }[]

  const totalTickets = statusCounts.reduce((s: number, r: { _count: number }) => s + r._count, 0)
  const statusMap = Object.fromEntries(statusCounts.map((r: { status: string; _count: number }) => [r.status, r._count]))

  // 2. Rating-uri agregate (doar tickete cu rating)
  const ratedTickets = await p.supportTicket.findMany({
    where: { clientRating: { not: null } },
    select: { clientRating: true, clientFeedback: true, affectedFlow: true, routedToAgent: true, createdAt: true },
  }) as { clientRating: number; clientFeedback: string | null; affectedFlow: string | null; routedToAgent: string | null; createdAt: Date }[]

  const totalRated = ratedTickets.length
  const avgRating = totalRated > 0
    ? Math.round(ratedTickets.reduce((s: number, t: { clientRating: number }) => s + t.clientRating, 0) / totalRated * 10) / 10
    : 0

  // Parse feedback-urile individuale (format: "Rezultat: X/5 | Timp raspuns: Y/5 | Comunicare: Z/5")
  let sumRezultat = 0, sumTimp = 0, sumComunicare = 0, parsedCount = 0
  for (const t of ratedTickets) {
    if (!t.clientFeedback) continue
    const rezultat = t.clientFeedback.match(/Rezultat:\s*(\d)/)?.[1]
    const timp = t.clientFeedback.match(/Timp raspuns:\s*(\d)/)?.[1]
    const comunicare = t.clientFeedback.match(/Comunicare:\s*(\d)/)?.[1]
    if (rezultat && timp && comunicare) {
      sumRezultat += Number(rezultat)
      sumTimp += Number(timp)
      sumComunicare += Number(comunicare)
      parsedCount++
    }
  }

  const criteriaAvg = parsedCount > 0 ? {
    rezultat: Math.round(sumRezultat / parsedCount * 10) / 10,
    timpRaspuns: Math.round(sumTimp / parsedCount * 10) / 10,
    comunicare: Math.round(sumComunicare / parsedCount * 10) / 10,
  } : { rezultat: 0, timpRaspuns: 0, comunicare: 0 }

  // Distribuție rating-uri (1-5)
  const ratingDistribution = [0, 0, 0, 0, 0]
  for (const t of ratedTickets) {
    if (t.clientRating >= 1 && t.clientRating <= 5) ratingDistribution[t.clientRating - 1]++
  }

  // 3. Trend 7 zile + 30 zile
  const rated7d = ratedTickets.filter((t: { createdAt: Date }) => new Date(t.createdAt) >= d7)
  const rated30d = ratedTickets.filter((t: { createdAt: Date }) => new Date(t.createdAt) >= d30)
  const avg7d = rated7d.length > 0
    ? Math.round(rated7d.reduce((s: number, t: { clientRating: number }) => s + t.clientRating, 0) / rated7d.length * 10) / 10 : null
  const avg30d = rated30d.length > 0
    ? Math.round(rated30d.reduce((s: number, t: { clientRating: number }) => s + t.clientRating, 0) / rated30d.length * 10) / 10 : null

  // 4. Per flow
  const flowMap = new Map<string, { count: number; sum: number }>()
  for (const t of ratedTickets) {
    const flow = t.affectedFlow || "nespecificat"
    const entry = flowMap.get(flow) || { count: 0, sum: 0 }
    entry.count++
    entry.sum += t.clientRating
    flowMap.set(flow, entry)
  }
  const perFlow = Array.from(flowMap.entries()).map(([flow, data]) => ({
    flow,
    count: data.count,
    avg: Math.round(data.sum / data.count * 10) / 10,
  })).sort((a, b) => b.count - a.count)

  // 5. Per agent
  const agentMap = new Map<string, { count: number; sum: number }>()
  for (const t of ratedTickets) {
    const agent = t.routedToAgent || "neatribuit"
    const entry = agentMap.get(agent) || { count: 0, sum: 0 }
    entry.count++
    entry.sum += t.clientRating
    agentMap.set(agent, entry)
  }
  const perAgent = Array.from(agentMap.entries()).map(([agent, data]) => ({
    agent,
    count: data.count,
    avg: Math.round(data.sum / data.count * 10) / 10,
  })).sort((a, b) => b.avg - a.avg)

  // 6. Funnel statusuri
  const funnel = {
    new: statusMap.NEW || 0,
    refining: statusMap.REFINING || 0,
    routed: statusMap.ROUTED || 0,
    inProgress: statusMap.IN_PROGRESS || 0,
    resolved: statusMap.RESOLVED || 0,
    responded: statusMap.RESPONDED || 0,
    closed: statusMap.CLOSED || 0,
    escalated: statusMap.ESCALATED || 0,
  }

  // 7. Timp mediu de răspuns (tickete cu respondedAt)
  const respondedTickets = await p.supportTicket.findMany({
    where: { respondedAt: { not: null } },
    select: { createdAt: true, respondedAt: true },
  }) as { createdAt: Date; respondedAt: Date }[]

  const avgResponseHours = respondedTickets.length > 0
    ? Math.round(respondedTickets.reduce((s: number, t: { createdAt: Date; respondedAt: Date }) =>
        s + (new Date(t.respondedAt).getTime() - new Date(t.createdAt).getTime()) / 3600000, 0
      ) / respondedTickets.length * 10) / 10
    : null

  // 8. Tickete recente cu rating scăzut (<=2)
  const lowRated = await p.supportTicket.findMany({
    where: { clientRating: { lte: 2 } },
    select: { id: true, subject: true, clientRating: true, clientFeedback: true, routedToAgent: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  })

  return NextResponse.json({
    totalTickets,
    totalRated,
    avgRating,
    criteriaAvg,
    ratingDistribution,
    trend: { avg7d, count7d: rated7d.length, avg30d, count30d: rated30d.length },
    perFlow,
    perAgent,
    funnel,
    avgResponseHours,
    lowRated,
    satisfactionRate: totalRated > 0
      ? Math.round(ratedTickets.filter((t: { clientRating: number }) => t.clientRating >= 4).length / totalRated * 100) : 0,
  })
}
