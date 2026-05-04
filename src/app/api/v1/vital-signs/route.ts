/**
 * POST /api/v1/vital-signs
 * Salvează rezultatele vital signs în DB (model dedicat + SystemConfig pentru backward compat).
 * Apelat de GitHub Actions sau self-check cron.
 *
 * GET /api/v1/vital-signs
 * Returnează ultimul raport vital signs.
 *
 * GET /api/v1/vital-signs?history=true&limit=N
 * Returnează istoricul rapoartelor (default 10).
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const VS_KEY = "VITAL_SIGNS_LATEST"

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-internal-key")
  if (key !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()

    // 1. Backward compat — salvăm în SystemConfig
    await prisma.systemConfig.upsert({
      where: { key: VS_KEY },
      update: { value: JSON.stringify(body) },
      create: { key: VS_KEY, value: JSON.stringify(body) },
    })

    // 2. Istoric — salvăm în VitalSignsReport
    const summary = body.summary || {}
    const tests = body.tests || body.checks || []
    const overallStatus = body.overallStatus || body.status || "UNKNOWN"

    const report = await prisma.vitalSignsReport.create({
      data: {
        reportDate: body.reportDate ? new Date(body.reportDate) : new Date(),
        overallStatus: overallStatus.toUpperCase(),
        passCount: summary.pass ?? summary.ok ?? 0,
        warnCount: summary.warn ?? summary.escalated ?? 0,
        failCount: summary.fail ?? summary.errors ?? 0,
        skipCount: summary.skip ?? 0,
        fullReport: body,
        checks: {
          create: tests.map((t: any) => ({
            componentName: t.name || t.component || "unknown",
            status: (t.status || "SKIP").toUpperCase(),
            detail: t.detail || t.notes || "",
            metric: typeof t.metric === "number" ? t.metric : null,
          })),
        },
      },
    })

    return NextResponse.json({ ok: true, reportId: report.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const key = req.headers.get("x-internal-key")
  const session = req.headers.get("authorization")
  if (!key && !session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const history = url.searchParams.get("history") === "true"
  const limit = Math.min(Number(url.searchParams.get("limit")) || 10, 100)

  if (history) {
    // Returnează istoric din VitalSignsReport
    const reports = await prisma.vitalSignsReport.findMany({
      orderBy: { reportDate: "desc" },
      take: limit,
      include: { checks: true },
    })

    if (reports.length === 0) {
      // Fallback la SystemConfig dacă nu sunt rapoarte
      const config = await prisma.systemConfig.findUnique({ where: { key: VS_KEY } })
      if (config) return NextResponse.json({ reports: [JSON.parse(config.value)], source: "legacy" })
      return NextResponse.json({ reports: [] })
    }

    return NextResponse.json({ reports, count: reports.length })
  }

  // Ultimul raport — preferă noul model, fallback la SystemConfig
  const latest = await prisma.vitalSignsReport.findFirst({
    orderBy: { reportDate: "desc" },
    include: { checks: true },
  })

  if (latest) {
    return NextResponse.json(latest.fullReport)
  }

  // Fallback legacy
  const config = await prisma.systemConfig.findUnique({ where: { key: VS_KEY } })
  if (!config) {
    return NextResponse.json({ error: "No vital signs report" }, { status: 404 })
  }

  return NextResponse.json(JSON.parse(config.value))
}
