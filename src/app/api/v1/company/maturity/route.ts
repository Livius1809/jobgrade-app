/**
 * GET /api/v1/company/maturity
 *
 * Returnează starea de maturitate a firmei + servicii deblocate/aproape gata.
 * Consumat de PackageExplorer pentru a arăta badge-uri dinamice.
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getCompanyProfile } from "@/lib/company-profiler"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ level: "IMPLICIT", score: 0, services: [] })
  }

  try {
    const profile = await getCompanyProfile(session.user.tenantId)

    // Mapăm serviciile pe layere (1-4) pentru PackageExplorer
    const SERVICE_TO_LAYER: Record<string, number> = {
      JOB_EVALUATION: 1,
      JOB_DESCRIPTION_AI: 1,
      PAY_GAP_ANALYSIS: 2,
      SALARY_BENCHMARK: 3,
      PAY_GAP_MEDIATION: 2,
      CULTURE_AUDIT: 4,
      PERFORMANCE_SYSTEM: 4,
      DEVELOPMENT_PLAN: 4,
    }

    const services = profile.maturityState.unlockedServices.map(s => ({
      service: s.service,
      layer: SERVICE_TO_LAYER[s.service] || 1,
      ready: s.ready,
      missing: s.missing,
      readinessPercent: s.ready ? 100 : Math.round(
        ((s.missing.length + 1 - s.missing.length) / Math.max(s.missing.length + 1, 1)) * 100
      ),
    }))

    // Per layer: cel mai avansat readiness
    const layerReadiness: Record<number, { ready: boolean; readyCount: number; totalCount: number; missing: string[] }> = {}
    for (const s of services) {
      if (!layerReadiness[s.layer]) {
        layerReadiness[s.layer] = { ready: false, readyCount: 0, totalCount: 0, missing: [] }
      }
      layerReadiness[s.layer].totalCount++
      if (s.ready) {
        layerReadiness[s.layer].readyCount++
        layerReadiness[s.layer].ready = true
      } else {
        layerReadiness[s.layer].missing.push(...s.missing)
      }
    }

    // Semnale de activare (tocmai deblocate)
    const activationSignals = profile.activationSignals.map(s => ({
      service: s.service,
      message: s.clientMessage,
      justUnlocked: s.justUnlocked,
      readinessPercent: s.readinessPercent,
    }))

    return NextResponse.json({
      level: profile.maturityState.level,
      score: profile.maturityState.score,
      nextLevelRequirements: profile.maturityState.nextLevelRequirements,
      layerReadiness,
      activationSignals,
      services,
    })
  } catch {
    return NextResponse.json({ level: "IMPLICIT", score: 0, services: [] })
  }
}
