/**
 * GET /api/v1/budget — citește bugetul per lună (Owner + COG)
 * POST /api/v1/budget — upsert linie bugetară (Owner only)
 *
 * Query params: ?businessId=biz_jobgrade&year=2026
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  // Auth: Owner sau CRON_SECRET (pentru COG via executor)
  const authHeader = request.headers.get("authorization")
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`

  if (!isCron) {
    const session = await auth()
    if (!session?.user || !["OWNER", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 403 })
    }
  }

  const { searchParams } = new URL(request.url)
  const businessId = searchParams.get("businessId") || "biz_jobgrade"
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString())

  const startDate = new Date(year, 0, 1)
  const endDate = new Date(year + 1, 0, 1)

  const lines = await (prisma as any).budgetLine.findMany({
    where: {
      businessId,
      month: { gte: startDate, lt: endDate },
    },
    orderBy: [{ month: "asc" }, { category: "asc" }],
  })

  // Calculate totals
  const totals = {
    totalPlanned: 0,
    totalActual: 0,
    byCategory: {} as Record<string, { planned: number; actual: number }>,
    byMonth: {} as Record<string, { planned: number; actual: number }>,
  }

  for (const line of lines) {
    const planned = Number(line.planned)
    const actual = Number(line.actual)
    totals.totalPlanned += planned
    totals.totalActual += actual

    if (!totals.byCategory[line.category]) totals.byCategory[line.category] = { planned: 0, actual: 0 }
    totals.byCategory[line.category].planned += planned
    totals.byCategory[line.category].actual += actual

    const monthKey = new Date(line.month).toISOString().slice(0, 7)
    if (!totals.byMonth[monthKey]) totals.byMonth[monthKey] = { planned: 0, actual: 0 }
    totals.byMonth[monthKey].planned += planned
    totals.byMonth[monthKey].actual += actual
  }

  const variance = totals.totalPlanned > 0
    ? Math.round((totals.totalActual - totals.totalPlanned) / totals.totalPlanned * 100)
    : 0

  return NextResponse.json({
    year,
    businessId,
    lines,
    totals,
    variance,
  })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user || !["OWNER", "SUPER_ADMIN"].includes(session.user.role)) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 })
  }

  const body = await request.json()
  const { businessId = "biz_jobgrade", category, month, planned, actual, notes } = body

  if (!category || !month) {
    return NextResponse.json({ error: "category și month sunt obligatorii" }, { status: 400 })
  }

  const monthDate = new Date(month)
  monthDate.setDate(1)
  monthDate.setHours(0, 0, 0, 0)

  const line = await (prisma as any).budgetLine.upsert({
    where: {
      businessId_category_month: {
        businessId,
        category,
        month: monthDate,
      },
    },
    update: {
      ...(planned !== undefined && { planned }),
      ...(actual !== undefined && { actual }),
      ...(notes !== undefined && { notes }),
      approvedBy: session.user.id,
    },
    create: {
      businessId,
      category,
      month: monthDate,
      planned: planned || 0,
      actual: actual || 0,
      notes,
      approvedBy: session.user.id,
    },
  })

  return NextResponse.json({ ok: true, line })
}
