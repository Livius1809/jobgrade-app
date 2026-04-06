import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * GET /api/v1/monitors/outcome-health
 *
 * Verifică toate ServiceOutcome-urile active cu măsurători.
 * Emite semnale D3_BUSINESS_PROCESS când:
 *  - currentValue < targetValue × (1 - deviationThreshold)  → UNDERPERFORMING
 *  - currentValue trending down pe ultimele N measurements    → DECLINING_TREND
 *  - Zero measurements în perioada așteptată                 → MEASUREMENT_GAP
 *
 * Query params:
 *  - deviationPct: prag deviere (default 20 = 20% sub target)
 *  - trendWindow: câte measurements pentru trend (default 3)
 *  - dryRun: true = doar raportează, nu emite D3 events
 *  - businessId: filtru opțional (default: toate)
 */

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

interface OutcomeSignal {
  serviceCode: string
  serviceName: string
  signal: "underperforming" | "declining_trend" | "measurement_gap"
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  currentValue: number | null
  targetValue: number
  detail: string
}

// Frecvența așteptată de colectare → zile maxime fără measurement
const FREQUENCY_MAX_DAYS: Record<string, number> = {
  per_session: 7,    // dacă nimeni n-a folosit serviciul în 7 zile, e semnal
  monthly: 45,       // 30 zile + 50% buffer
  quarterly: 120,    // 90 zile + 33% buffer
}

export async function GET(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const deviationPct = Number(url.searchParams.get("deviationPct") ?? "20")
  const trendWindow = Number(url.searchParams.get("trendWindow") ?? "3")
  const dryRun = url.searchParams.get("dryRun") === "true"
  const businessId = url.searchParams.get("businessId")

  const outcomes = await prisma.serviceOutcome.findMany({
    where: {
      isActive: true,
      ...(businessId ? { businessId } : {}),
    },
    include: {
      measurements: {
        orderBy: { measuredAt: "desc" },
        take: trendWindow + 1, // +1 pentru comparare
      },
    },
  })

  const signals: OutcomeSignal[] = []
  const now = Date.now()

  for (const outcome of outcomes) {
    const { serviceCode, serviceName, currentValue, targetValue, collectionFrequency } = outcome
    const measurements = outcome.measurements

    // 1. MEASUREMENT_GAP — fără measurement în perioada așteptată
    const maxDays = FREQUENCY_MAX_DAYS[collectionFrequency] ?? 45
    const lastMeasurement = measurements[0]
    if (!lastMeasurement) {
      // Nicio measurement de la seed — verifică dacă outcome-ul e suficient de vechi
      const ageMs = now - new Date(outcome.createdAt).getTime()
      if (ageMs > maxDays * 24 * 60 * 60 * 1000) {
        signals.push({
          serviceCode, serviceName,
          signal: "measurement_gap",
          severity: "MEDIUM",
          currentValue: null,
          targetValue,
          detail: `Zero measurements de la creare (${Math.round(ageMs / 86400000)} zile). Frecvență așteptată: ${collectionFrequency}.`,
        })
      }
      continue
    }

    const lastMeasuredMs = new Date(lastMeasurement.measuredAt).getTime()
    const gapDays = (now - lastMeasuredMs) / 86400000
    if (gapDays > maxDays) {
      signals.push({
        serviceCode, serviceName,
        signal: "measurement_gap",
        severity: "MEDIUM",
        currentValue,
        targetValue,
        detail: `Ultima measurement acum ${Math.round(gapDays)} zile. Frecvență așteptată: ${collectionFrequency} (maxim ${maxDays} zile).`,
      })
    }

    // 2. UNDERPERFORMING — currentValue sub prag
    if (currentValue !== null) {
      const threshold = targetValue * (1 - deviationPct / 100)
      if (currentValue < threshold) {
        const gap = ((targetValue - currentValue) / targetValue * 100).toFixed(1)
        const sev = currentValue < targetValue * 0.5 ? "HIGH" : "MEDIUM"
        signals.push({
          serviceCode, serviceName,
          signal: "underperforming",
          severity: sev,
          currentValue,
          targetValue,
          detail: `Valoare curentă ${currentValue} e cu ${gap}% sub target ${targetValue} (prag deviere: ${deviationPct}%).`,
        })
      }
    }

    // 3. DECLINING_TREND — ultimele N measurements scad consecutiv
    if (measurements.length >= trendWindow) {
      const recent = measurements.slice(0, trendWindow) // desc order
      let declining = true
      for (let i = 0; i < recent.length - 1; i++) {
        if (recent[i].value >= recent[i + 1].value) {
          declining = false
          break
        }
      }
      // recent e desc (cel mai nou primul) — declining = fiecare e mai mic decât precedentul
      // adică recent[0] < recent[1] < recent[2] → tendință descrescătoare
      if (declining) {
        const values = recent.map(m => m.value).reverse()
        signals.push({
          serviceCode, serviceName,
          signal: "declining_trend",
          severity: "MEDIUM",
          currentValue,
          targetValue,
          detail: `Trend descrescător pe ultimele ${trendWindow} measurements: ${values.join(" → ")}.`,
        })
      }
    }
  }

  // Emit D3 events dacă nu e dryRun
  let emitted = 0
  if (!dryRun && signals.length > 0) {
    const apiKey = process.env.INTERNAL_API_KEY!
    const baseUrl = `http://localhost:${process.env.PORT ?? 3001}`

    for (const sig of signals) {
      try {
        const res = await fetch(`${baseUrl}/api/v1/disfunctions/detect`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-internal-key": apiKey },
          body: JSON.stringify({
            class: "D3_BUSINESS_PROCESS",
            severity: sig.severity,
            targetType: "SERVICE",
            targetId: sig.serviceCode,
            detectorSource: "outcome-health-monitor",
            signal: `outcome_${sig.signal}`,
          }),
        })
        if (res.ok) emitted++
      } catch {
        // best effort — nu blocăm monitorul pentru eșecuri de emit
      }
    }
  }

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    outcomesChecked: outcomes.length,
    signals,
    signalCount: signals.length,
    emitted: dryRun ? "dryRun" : emitted,
    params: { deviationPct, trendWindow, dryRun },
  })
}
