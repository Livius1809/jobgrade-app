/**
 * GET /api/v1/territory/trends?territory=MEDGIDIA&months=6
 *
 * Trenduri teritoriale — compară datele crawlate la momente diferite.
 * Direcția contează mai mult decât starea.
 *
 * Returnează: variații per indicator (populație, firme, angajați, entități)
 * între cel mai vechi și cel mai recent crawl.
 */

export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const territory = req.nextUrl.searchParams.get("territory")
  if (!territory) {
    return NextResponse.json({ error: "territory parameter required" }, { status: 400 })
  }

  const months = parseInt(req.nextUrl.searchParams.get("months") || "6")

  const sinceDate = new Date()
  sinceDate.setMonth(sinceDate.getMonth() - months)

  // Toate datele teritoriale cu timestamp-uri
  const allData = await prisma.territorialData.findMany({
    where: { territory },
    orderBy: { updatedAt: "asc" },
  })

  // Crawl results pentru timeline
  const crawlResults = await prisma.crawlResult.findMany({
    where: {
      source: { territory: { in: [territory, null as any] } },
      crawledAt: { gte: sinceDate },
      status: "SUCCESS",
    },
    include: { source: { select: { name: true, displayName: true } } },
    orderBy: { crawledAt: "asc" },
  })

  // Grupăm datele pe perioade (periodYear + periodMonth)
  const byPeriod: Record<string, Array<{ key: string; category: string; value: number }>> = {}
  for (const d of allData) {
    if (!d.periodYear || !d.numericValue) continue
    const period = d.periodMonth
      ? `${d.periodYear}-${String(d.periodMonth).padStart(2, "0")}`
      : `${d.periodYear}`
    if (!byPeriod[period]) byPeriod[period] = []
    byPeriod[period].push({ key: d.key, category: d.category, value: d.numericValue })
  }

  const periods = Object.keys(byPeriod).sort()
  const firstPeriod = periods[0]
  const lastPeriod = periods[periods.length - 1]

  // Calculăm trenduri per indicator cheie
  const keyIndicators = [
    { key: "total", category: "POPULATION", label: "Populație totală" },
    { key: "firms_total", category: "BUSINESS", label: "Firme active" },
    { key: "employees_total", category: "BUSINESS", label: "Angajați total" },
    { key: "revenue_total", category: "ECONOMY", label: "Cifră de afaceri totală" },
    { key: "unemployment_rate", category: "LABOR", label: "Rata șomajului" },
    { key: "monuments_total", category: "CULTURE", label: "Monumente inventariate" },
  ]

  const trends = keyIndicators.map(ind => {
    const first = byPeriod[firstPeriod]?.find(d => d.key === ind.key && d.category === ind.category)
    const last = byPeriod[lastPeriod]?.find(d => d.key === ind.key && d.category === ind.category)

    if (!first || !last) {
      return {
        indicator: ind.label,
        key: ind.key,
        firstValue: first?.value || null,
        lastValue: last?.value || null,
        firstPeriod,
        lastPeriod,
        change: null,
        changePct: null,
        trend: "INSUFICIENT_DATE" as const,
      }
    }

    const change = last.value - first.value
    const changePct = first.value > 0 ? Math.round((change / first.value) * 1000) / 10 : 0

    return {
      indicator: ind.label,
      key: ind.key,
      firstValue: first.value,
      lastValue: last.value,
      firstPeriod,
      lastPeriod,
      change,
      changePct,
      trend: (changePct > 2 ? "CRESTERE" : changePct < -2 ? "SCADERE" : "STABIL") as "CRESTERE" | "SCADERE" | "STABIL",
    }
  })

  // Trenduri per sector CAEN
  const sectorTrends: Array<{ sector: string; change: string }> = []
  const sectorData = allData.filter(d => d.subcategory === "SECTORS")
  // Grupăm per CAEN și comparăm periodYear
  const caenByYear: Record<string, Record<number, number>> = {}
  for (const d of sectorData) {
    if (!d.periodYear || !d.numericValue) continue
    const caen = d.key.replace("caen_", "")
    if (!caenByYear[caen]) caenByYear[caen] = {}
    caenByYear[caen][d.periodYear] = d.numericValue
  }

  for (const [caen, years] of Object.entries(caenByYear)) {
    const sortedYears = Object.keys(years).map(Number).sort()
    if (sortedYears.length < 2) continue
    const first = years[sortedYears[0]]
    const last = years[sortedYears[sortedYears.length - 1]]
    const pct = first > 0 ? Math.round(((last - first) / first) * 100) : 0
    if (Math.abs(pct) > 5) {
      sectorTrends.push({
        sector: `CAEN ${caen}`,
        change: `${pct > 0 ? "+" : ""}${pct}% (${sortedYears[0]}→${sortedYears[sortedYears.length - 1]})`,
      })
    }
  }

  // Timeline crawl-uri
  const crawlTimeline = crawlResults.map(r => ({
    date: r.crawledAt.toISOString().split("T")[0],
    source: (r as any).source.displayName || (r as any).source.name,
    records: r.recordsFound,
    newRecords: r.recordsNew,
    updated: r.recordsUpdated,
  }))

  // Alertele: schimbări semnificative
  const alerts = trends
    .filter(t => t.changePct !== null && Math.abs(t.changePct) > 5)
    .map(t => ({
      indicator: t.indicator,
      change: `${t.changePct! > 0 ? "+" : ""}${t.changePct}%`,
      severity: Math.abs(t.changePct!) > 15 ? "HIGH" : "MEDIUM",
      interpretation: interpretChange(t.key, t.changePct!),
    }))

  return NextResponse.json({
    territory,
    periodsAvailable: periods,
    periodRange: { from: firstPeriod, to: lastPeriod },
    trends,
    sectorTrends,
    crawlTimeline,
    alerts,
    timestamp: new Date().toISOString(),
  })
}

function interpretChange(key: string, changePct: number): string {
  if (key === "total" && changePct < -3) return "Populație în scădere — risc de depopulare, cerere scăzută"
  if (key === "total" && changePct > 3) return "Populație în creștere — cerere crescută, oportunități"
  if (key === "firms_total" && changePct > 5) return "Firme noi — economie în expansiune"
  if (key === "firms_total" && changePct < -5) return "Firme închise — economie în contracție"
  if (key === "employees_total" && changePct > 5) return "Angajare în creștere — piață sănătoasă"
  if (key === "employees_total" && changePct < -5) return "Pierdere locuri de muncă — atenție"
  if (key === "revenue_total" && changePct > 10) return "CA în creștere semnificativă"
  if (key === "unemployment_rate" && changePct > 10) return "Șomaj în creștere — urgență formare profesională"
  return `Variație ${changePct > 0 ? "pozitivă" : "negativă"} de ${Math.abs(changePct)}%`
}
