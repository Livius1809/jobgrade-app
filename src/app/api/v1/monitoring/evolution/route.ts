/**
 * /api/v1/monitoring/evolution
 *
 * C4 F7 — Monitorizare evoluție (organismul clientului)
 * POST — Înregistrează o măsurătoare de monitorizare
 * GET  — Dashboard monitorizare cu trenduri
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"

export const dynamic = "force-dynamic"

const monitoringSchema = z.object({
  type: z.enum(["PULSE", "MATURITY", "IMPACT", "RECALIBRATION", "CA_REPORT"]),
  data: z.record(z.string(), z.unknown()),
})

// Tipuri interne
interface PulseEntry {
  type: "PULSE"
  date: string
  responses: Record<string, number>
  averageScore: number
  participationRate?: number
}

interface MaturityEntry {
  type: "MATURITY"
  date: string
  capacities: {
    execution: number
    adaptation: number
    learning: number
    decisionQuality: number
    cohesion: number
  }
  overallScore: number
}

interface ImpactEntry {
  type: "IMPACT"
  date: string
  actions: Array<{
    name: string
    status: "IMPLEMENTED" | "PARTIAL" | "NOT_STARTED"
    kpiDelta?: number
  }>
  effectivenessRate: number
}

interface RecalibrationEntry {
  type: "RECALIBRATION"
  date: string
  newF3A: Record<string, unknown>
  adjustedPlan: Record<string, unknown>
  reason: string
}

interface CAReportEntry {
  type: "CA_REPORT"
  date: string
  executiveSummary: string
  yearInReview: Record<string, unknown>
  recommendations: string[]
}

type MonitoringEntry = PulseEntry | MaturityEntry | ImpactEntry | RecalibrationEntry | CAReportEntry

/**
 * POST — Înregistrează o măsurătoare de monitorizare
 * Fiecare tip are structura proprie de date
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const body = await req.json()
    const { type, data } = monitoringSchema.parse(body)

    const now = new Date()
    const dateKey = now.toISOString().slice(0, 10) // YYYY-MM-DD
    const timestamp = now.toISOString()

    // Construiește intrarea specifică tipului
    let entry: MonitoringEntry

    switch (type) {
      case "PULSE": {
        // Sondaj lunar scurt (10-15 itemi), fiecare item 1-5
        const responses = data.responses as Record<string, number> ?? {}
        const values = Object.values(responses).filter((v): v is number => typeof v === "number")
        const averageScore = values.length > 0
          ? Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100
          : 0
        entry = {
          type: "PULSE",
          date: timestamp,
          responses,
          averageScore,
          participationRate: typeof data.participationRate === "number" ? data.participationRate : undefined,
        }
        break
      }

      case "MATURITY": {
        // Evaluare trimestrială — 5 capacități, fiecare 0-100
        const caps = data.capacities as Record<string, number> ?? {}
        const capacities = {
          execution: Math.min(100, Math.max(0, caps.execution ?? 0)),
          adaptation: Math.min(100, Math.max(0, caps.adaptation ?? 0)),
          learning: Math.min(100, Math.max(0, caps.learning ?? 0)),
          decisionQuality: Math.min(100, Math.max(0, caps.decisionQuality ?? 0)),
          cohesion: Math.min(100, Math.max(0, caps.cohesion ?? 0)),
        }
        const overallScore = Math.round(
          Object.values(capacities).reduce((s, v) => s + v, 0) / 5
        )
        entry = {
          type: "MATURITY",
          date: timestamp,
          capacities,
          overallScore,
        }
        break
      }

      case "IMPACT": {
        // Verificare la 3 luni — per acțiune din planul de intervenție
        const actions = (data.actions as Array<{ name: string; status: string; kpiDelta?: number }> ?? []).map(a => ({
          name: a.name ?? "",
          status: (["IMPLEMENTED", "PARTIAL", "NOT_STARTED"].includes(a.status) ? a.status : "NOT_STARTED") as "IMPLEMENTED" | "PARTIAL" | "NOT_STARTED",
          kpiDelta: typeof a.kpiDelta === "number" ? a.kpiDelta : undefined,
        }))
        const implemented = actions.filter(a => a.status === "IMPLEMENTED").length
        const effectivenessRate = actions.length > 0
          ? Math.round((implemented / actions.length) * 100)
          : 0
        entry = {
          type: "IMPACT",
          date: timestamp,
          actions,
          effectivenessRate,
        }
        break
      }

      case "RECALIBRATION": {
        // Actualizare plan la 6 luni — F3A nou + plan ajustat
        entry = {
          type: "RECALIBRATION",
          date: timestamp,
          newF3A: (data.newF3A as Record<string, unknown>) ?? {},
          adjustedPlan: (data.adjustedPlan as Record<string, unknown>) ?? {},
          reason: typeof data.reason === "string" ? data.reason : "Recalibrare periodică",
        }
        break
      }

      case "CA_REPORT": {
        // Raport anual executiv pentru Consiliul de Administrație
        entry = {
          type: "CA_REPORT",
          date: timestamp,
          executiveSummary: typeof data.executiveSummary === "string" ? data.executiveSummary : "",
          yearInReview: (data.yearInReview as Record<string, unknown>) ?? {},
          recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
        }
        break
      }
    }

    // Salvează cu cheie unică: MONITORING_{tenantId}_{type}_{date}
    const storageKey = `MONITORING_${tenantId}_${type}_${dateKey}`
    await setTenantData(tenantId, storageKey, entry)

    return NextResponse.json({
      saved: true,
      type,
      timestamp,
      key: storageKey,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[MONITORING EVOLUTION POST]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}

/**
 * GET — Dashboard monitorizare
 * Returnează toate măsurătorile grupate pe tip + trenduri calculate
 */
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId

    // Încarcă toate intrările de monitorizare pentru acest tenant
    // Cheia urmează pattern-ul: TENANT_{tenantId}_MONITORING_{tenantId}_{type}_{date}
    const prefix = `TENANT_${tenantId}_MONITORING_${tenantId}_`
    const allEntries = await prisma.systemConfig.findMany({
      where: {
        key: { startsWith: prefix },
      },
      orderBy: { updatedAt: "desc" },
      select: {
        key: true,
        value: true,
        updatedAt: true,
      },
    })

    // Grupare pe tip
    const pulse: PulseEntry[] = []
    const maturity: MaturityEntry[] = []
    const impact: ImpactEntry[] = []
    const recalibrations: RecalibrationEntry[] = []
    const caReports: CAReportEntry[] = []

    for (const entry of allEntries) {
      let data: Record<string, unknown>
      try {
        data = JSON.parse(entry.value) as Record<string, unknown>
      } catch {
        continue // Ignoră intrări cu JSON invalid
      }
      const entryType = data.type as string

      switch (entryType) {
        case "PULSE":
          pulse.push(data as unknown as PulseEntry)
          break
        case "MATURITY":
          maturity.push(data as unknown as MaturityEntry)
          break
        case "IMPACT":
          impact.push(data as unknown as ImpactEntry)
          break
        case "RECALIBRATION":
          recalibrations.push(data as unknown as RecalibrationEntry)
          break
        case "CA_REPORT":
          caReports.push(data as unknown as CAReportEntry)
          break
      }
    }

    // Calculează trenduri
    const pulseAvg = pulse.length > 0
      ? Math.round((pulse.reduce((s, p) => s + p.averageScore, 0) / pulse.length) * 100) / 100
      : null

    // Trend maturitate: diferența între ultimele 2 evaluări
    let maturityTrend: string = "INSUFICIENT_DATE"
    if (maturity.length >= 2) {
      const latest = maturity[0].overallScore
      const previous = maturity[1].overallScore
      const diff = latest - previous
      maturityTrend = diff > 5 ? "CREȘTERE" : diff < -5 ? "SCĂDERE" : "STABIL"
    }

    // Eficacitate intervenții: media ratei de implementare
    const interventionEffectiveness = impact.length > 0
      ? Math.round(impact.reduce((s, i) => s + i.effectivenessRate, 0) / impact.length)
      : null

    return NextResponse.json({
      pulse: pulse.slice(0, 12),         // ultimele 12 luni
      maturity: maturity.slice(0, 4),     // ultimele 4 trimestre
      impact,
      recalibrations,
      caReports,
      trends: {
        pulseAvg,
        maturityTrend,
        interventionEffectiveness,
      },
      totalMeasurements: allEntries.length,
    })
  } catch (error) {
    console.error("[MONITORING EVOLUTION GET]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
