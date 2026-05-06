/**
 * /api/v1/psychometrics/assessment
 *
 * POST — Evaluare psihometrica completa unificata.
 *
 * Conecteaza TOATE componentele:
 *  1. Incarca rezultatele parsate din tenant storage
 *  2. Agregeaza bateria via aggregateBattery()
 *  3. (Optional) Calculeaza gap analysis persoana vs post via calculateGapAnalysis()
 *  4. Genereaza feedback narativ via generateNarrativeFeedback()
 *  5. Returneaza evaluare completa
 *
 * Body JSON:
 *  - employeeCode: string (obligatoriu)
 *  - jobId?: string (optional — daca prezent, se calculeaza gap analysis)
 *  - viewerRole?: "SUBJECT" | "HR_DIRECTOR" | "MANAGER" | "CONSULTANT" (default: "HR_DIRECTOR")
 *
 * Response: { profile, gaps?, narrative, generatedAt }
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { getTenantData } from "@/lib/tenant-storage"
import { prisma } from "@/lib/prisma"
import { aggregateBattery } from "@/lib/psychometrics/battery-aggregator"
import {
  generateNarrativeFeedback,
  type ViewerRole,
} from "@/lib/psychometrics/narrative-generator"
import { calculateGapAnalysis } from "@/lib/cpu/pie/score-normalizer"
import { buildIntegratedTraits } from "@/lib/profiling/score-normalizer"
import type { PersonProfile, PositionProfile } from "@/lib/cpu/pie/types"
import type { PsychometricResult } from "@/lib/psychometrics/parsers/types"
import type { GapAnalysis } from "@/lib/cpu/pie/types"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// ── Tenant storage state (same shape as parse/route.ts) ──────

interface ParsedResultsState {
  results: Array<{
    id: string
    employeeCode: string
    instrumentType: string
    result: PsychometricResult
    uploadedAt: string
    fileName: string
  }>
}

// ── Helpers ──────────────────────────────────────────────────

const VALID_ROLES: ViewerRole[] = ["SUBJECT", "HR_DIRECTOR", "MANAGER", "CONSULTANT"]

async function loadParsedResults(
  tenantId: string,
  employeeCode: string
): Promise<PsychometricResult[]> {
  const state = await getTenantData<ParsedResultsState>(tenantId, "PSYCHOMETRICS_PARSED")
  if (!state?.results) return []

  return state.results
    .filter(r => r.employeeCode === employeeCode)
    .map(r => r.result)
}

async function buildPositionProfile(
  jobId: string,
  tenantId: string
): Promise<PositionProfile | null> {
  try {
    const job = await prisma.job.findFirst({
      where: { id: jobId, tenantId },
      select: {
        id: true,
        title: true,
        departmentId: true,
      },
    })
    if (!job) return null

    return {
      positionId: job.id,
      tenantId,
      title: job.title,
      requiredCompetences: [],
      leadershipRequired: false,
      integrityThreshold: "STANDARD" as const,
    }
  } catch {
    return null
  }
}

// ── POST Handler ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.employeeCode) {
    return NextResponse.json(
      { error: "employeeCode este obligatoriu" },
      { status: 400 }
    )
  }

  const { employeeCode, jobId, viewerRole: roleRaw } = body as {
    employeeCode: string
    jobId?: string
    viewerRole?: string
  }

  const viewerRole: ViewerRole = VALID_ROLES.includes(roleRaw as ViewerRole)
    ? (roleRaw as ViewerRole)
    : "HR_DIRECTOR"

  const tenantId = session.user.tenantId

  // 1. Incarcam rezultatele parsate
  const parsedResults = await loadParsedResults(tenantId, employeeCode)
  if (parsedResults.length === 0) {
    return NextResponse.json(
      {
        error: "Nu exista rezultate psihometrice parsate pentru acest angajat",
        hint: "Uploadati PDF-urile instrumentelor prin /api/v1/psychometrics/parse",
      },
      { status: 404 }
    )
  }

  // 2. Agregam bateria
  const profile = aggregateBattery(parsedResults)

  // 3. Gap analysis (daca avem jobId)
  let gaps: GapAnalysis | null = null
  let jobTitle: string | undefined
  let departmentName: string | undefined

  if (jobId) {
    const positionProfile = await buildPositionProfile(jobId, tenantId)
    if (positionProfile) {
      jobTitle = positionProfile.title

      // Obtinem departamentul
      try {
        const job = await prisma.job.findFirst({
          where: { id: jobId, tenantId },
          select: { department: { select: { name: true } } },
        })
        departmentName = job?.department?.name ?? undefined
      } catch {
        // nu e critic
      }

      // Construim PersonProfile din scorurile normalizate
      const traits = buildIntegratedTraits(profile.normalizedScores)
      const personProfile: PersonProfile = {
        personId: employeeCode,
        source: "B2B",
        scores: profile.normalizedScores,
        traits,
        maturityLevel: "DEVELOPING",
      }

      gaps = calculateGapAnalysis(personProfile, positionProfile)
    }
  }

  // 4. Generam narativ
  const narrative = await generateNarrativeFeedback(
    profile,
    viewerRole,
    { jobTitle, departmentName }
  )

  // 5. Raspuns complet
  return NextResponse.json({
    employeeCode,
    instrumentCount: parsedResults.length,
    instruments: parsedResults.map(r => r.instrumentId),
    profile: {
      integratedTraits: profile.integratedTraits,
      strongAreas: profile.strongAreas,
      developmentAreas: profile.developmentAreas,
      riskFlags: profile.riskFlags,
      motivationProfile: profile.motivationProfile,
      attentionProfile: profile.attentionProfile,
      overallReadiness: profile.overallReadiness,
    },
    gaps: gaps ?? undefined,
    narrative,
    viewerRole,
    generatedAt: new Date().toISOString(),
  })
}
