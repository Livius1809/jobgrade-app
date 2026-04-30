/**
 * GET  /api/v1/salary-grades — Lista gradelor salariale per tenant
 * POST /api/v1/salary-grades — Creează grade salariale (wizard sau bulk)
 */
import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Neautorizat" }, { status: 401 })

  const grades = await prisma.salaryGrade.findMany({
    where: { tenantId: session.user.tenantId },
    include: { jobResults: { select: { id: true } } },
    orderBy: { order: "asc" },
  })

  return NextResponse.json({
    grades: grades.map(g => ({
      id: g.id,
      name: g.name,
      order: g.order,
      scoreMin: g.scoreMin,
      scoreMax: g.scoreMax,
      salaryMin: g.salaryMin,
      salaryMax: g.salaryMax,
      salaryMedian: g.salaryMin && g.salaryMax ? Math.round((g.salaryMin + g.salaryMax) / 2) : null,
      currency: g.currency,
      jobCount: g.jobResults.length,
      sessionId: g.sessionId,
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Neautorizat" }, { status: 401 })

  const { grades, sessionId } = await req.json()
  if (!grades || !Array.isArray(grades)) {
    return NextResponse.json({ error: "grades[] obligatoriu" }, { status: 400 })
  }

  // Dacă nu avem sessionId, folosim ultima sesiune sau creăm una dummy
  let sid = sessionId
  if (!sid) {
    const lastSession = await prisma.evaluationSession.findFirst({
      where: { tenantId: session.user.tenantId },
      orderBy: { createdAt: "desc" },
    })
    sid = lastSession?.id
    if (!sid) {
      // Creăm o sesiune minimală pentru a asocia gradele
      const newSession = await prisma.evaluationSession.create({
        data: {
          tenantId: session.user.tenantId,
          name: "Grilă salarială",
          status: "COMPLETED",
          createdById: session.user.id,
        },
      })
      sid = newSession.id
    }
  }

  // Ștergem gradele existente pentru sesiunea aceasta
  await prisma.salaryGrade.deleteMany({
    where: { tenantId: session.user.tenantId, sessionId: sid },
  })

  // Creăm noile grade
  const created = await prisma.salaryGrade.createMany({
    data: grades.map((g: any, i: number) => ({
      tenantId: session.user.tenantId,
      sessionId: sid,
      name: g.name || `Grad ${i + 1}`,
      order: g.order ?? i + 1,
      scoreMin: g.scoreMin ?? 0,
      scoreMax: g.scoreMax ?? 0,
      salaryMin: g.salaryMin,
      salaryMax: g.salaryMax,
      currency: g.currency || "RON",
    })),
  })

  return NextResponse.json({ created: created.count, sessionId: sid })
}
