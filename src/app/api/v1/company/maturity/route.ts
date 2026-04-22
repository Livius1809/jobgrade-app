/**
 * GET /api/v1/company/maturity
 *
 * Returnează starea de maturitate a firmei + servicii deblocate/aproape gata.
 * Consumat de PackageExplorer pentru badge-uri dinamice.
 *
 * Fallback robust: dacă Company Profiler Engine aruncă eroare,
 * calculăm maturity direct din date DB simple.
 */

import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

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

export async function GET() {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ level: "IMPLICIT", score: 0, services: [], layerReadiness: {} })
  }

  const tenantId = session.user.tenantId

  try {
    // Încercăm engine-ul complet
    const { getCompanyProfile } = await import("@/lib/company-profiler")
    const profile = await getCompanyProfile(tenantId)
    return NextResponse.json(buildResponse(profile))
  } catch (engineErr) {
    console.warn("[MATURITY] Engine failed, using fallback:", (engineErr as Error).message)
  }

  // Fallback: calculăm direct din DB
  try {
    const [company, jobCount, jobsWithDesc, sessionCount, salaryGrades] = await Promise.all([
      prisma.companyProfile.findUnique({
        where: { tenantId },
        select: { cui: true, caenName: true, mission: true, vision: true, values: true, description: true },
      }),
      prisma.job.count({ where: { tenantId, status: "ACTIVE" } }),
      prisma.job.count({ where: { tenantId, status: "ACTIVE", purpose: { not: null } } }),
      prisma.evaluationSession.count({ where: { tenantId, status: { in: ["COMPLETED", "VALIDATED"] } } }).catch(() => 0),
      (prisma as any).salaryGrade?.count({ where: { tenantId } }).catch(() => 0) ?? 0,
    ])

    const hasCaen = !!company?.caenName
    const hasMission = !!company?.mission
    const hasVision = !!company?.vision
    const hasValues = (company?.values as string[] || []).length > 0
    const hasSalary = (salaryGrades || 0) > 0

    // Calculăm servicii deblocate
    const services = [
      { service: "JOB_EVALUATION", layer: 1, ready: jobCount >= 2, missing: jobCount < 2 ? [`Adăugați cel puțin 2 posturi (aveți ${jobCount})`] : [] },
      { service: "JOB_DESCRIPTION_AI", layer: 1, ready: hasCaen && jobCount >= 1, missing: [...(!hasCaen ? ["Completați codul CAEN"] : []), ...(jobCount < 1 ? ["Adăugați cel puțin un post"] : [])] },
      { service: "PAY_GAP_ANALYSIS", layer: 2, ready: sessionCount >= 1 && hasSalary, missing: [...(sessionCount < 1 ? ["Finalizați o sesiune de evaluare"] : []), ...(!hasSalary ? ["Configurați structura salarială"] : [])] },
      { service: "SALARY_BENCHMARK", layer: 3, ready: sessionCount >= 1 && hasSalary, missing: [...(sessionCount < 1 ? ["Finalizați o sesiune de evaluare"] : []), ...(!hasSalary ? ["Configurați structura salarială"] : [])] },
      { service: "PAY_GAP_MEDIATION", layer: 2, ready: false, missing: ["Rulați mai întâi analiza pay gap"] },
      { service: "CULTURE_AUDIT", layer: 4, ready: hasValues && sessionCount >= 1 && jobsWithDesc >= 3, missing: [...(!hasValues ? ["Validați valorile organizației"] : []), ...(sessionCount < 1 ? ["Finalizați o sesiune de evaluare"] : []), ...(jobsWithDesc < 3 ? [`Completați fișe de post (aveți ${jobsWithDesc}, minim 3)`] : [])] },
      { service: "PERFORMANCE_SYSTEM", layer: 4, ready: false, missing: ["Definiți KPI-uri", ...(!hasValues ? ["Validați valorile"] : [])] },
      { service: "DEVELOPMENT_PLAN", layer: 4, ready: hasMission && hasVision && hasValues && sessionCount >= 1, missing: [...(!hasMission ? ["Validați misiunea"] : []), ...(!hasVision ? ["Validați viziunea"] : []), ...(!hasValues ? ["Validați valorile"] : []), ...(sessionCount < 1 ? ["Finalizați o sesiune de evaluare"] : [])] },
    ]

    // Per layer readiness
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

    // Nivel
    const level = hasMission && hasVision && hasValues && sessionCount >= 1 && hasSalary ? "COMPLETE"
      : hasSalary ? "SUBSTANTIAL"
      : sessionCount >= 1 ? "PARTIAL"
      : jobsWithDesc >= 1 || jobCount >= 3 ? "EMERGENT"
      : "IMPLICIT"

    return NextResponse.json({
      level,
      score: 0,
      layerReadiness,
      activationSignals: [],
      services,
      nextLevelRequirements: [],
    })
  } catch (fallbackErr) {
    console.error("[MATURITY] Fallback also failed:", fallbackErr)
    return NextResponse.json({ level: "IMPLICIT", score: 0, services: [], layerReadiness: {} })
  }
}

function buildResponse(profile: any) {
  const services = profile.maturityState.unlockedServices.map((s: any) => ({
    service: s.service,
    layer: SERVICE_TO_LAYER[s.service] || 1,
    ready: s.ready,
    missing: s.missing,
  }))

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

  return {
    level: profile.maturityState.level,
    score: profile.maturityState.score,
    nextLevelRequirements: profile.maturityState.nextLevelRequirements,
    layerReadiness,
    activationSignals: (profile.activationSignals || []).map((s: any) => ({
      service: s.service,
      message: s.clientMessage,
      justUnlocked: s.justUnlocked,
      readinessPercent: s.readinessPercent,
    })),
    services,
  }
}
