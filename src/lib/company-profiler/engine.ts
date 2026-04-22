/**
 * Company Profiler Engine — Nucleul inteligenței B2B
 *
 * Echivalentul Profiler-ului B2C, dar pentru organizație.
 * Nu ce declară firma, ci ce face — agregat din toate sursele.
 *
 * Un singur apel: getCompanyProfile(tenantId) → tot ce trebuie.
 *
 * Alimentează:
 * - Agenții (JE, Pay Gap, DOA, SOA, Benchmark, Cultură)
 * - Rapoartele (secțiuni injectabile per serviciu/nivel)
 * - Smart Dashboard (servicii deblocate natural)
 * - MVV Progressive Builder (acum parte din engine)
 */

import { prisma } from "@/lib/prisma"
import type {
  CompanyProfile,
  DataPointPresence,
  AgentRole,
  AgentContext,
  ServiceType,
  ReportSection,
  ClientJournal,
  EvolutionTrajectory,
  ServiceEcosystem,
} from "./types"
import { computeMaturityState } from "./maturity"
import { computeCoherence } from "./coherence"
import { buildAgentContext } from "./agent-context"
import { generateReportSections } from "./report-sections"
import { detectActivationSignals } from "./smart-activation"
import { detectProactiveSignals } from "./proactive-signals"
import { detectInconsistencies, buildServiceEcosystem } from "./cross-service"
import { saveMaturitySnapshot, getPreviousState } from "./evolution"

// ── Cache simplu per request ────────────────────────────────────────

const profileCache = new Map<string, { profile: CompanyProfile; at: number }>()
const CACHE_TTL = 60_000 // 1 minut — suficient per request cycle

/**
 * Punctul unic de intrare.
 * Orice agent, raport sau pagină apelează asta.
 */
export async function getCompanyProfile(tenantId: string, forceRefresh = false): Promise<CompanyProfile> {
  // Cache hit?
  if (!forceRefresh) {
    const cached = profileCache.get(tenantId)
    if (cached && Date.now() - cached.at < CACHE_TTL) {
      return cached.profile
    }
  }

  // 1. Adunăm toate datele în paralel
  const [company, jobs, sessions, salaryData, payGapData] = await Promise.all([
    prisma.companyProfile.findUnique({
      where: { tenantId },
      select: {
        mission: true, vision: true, values: true, description: true,
        industry: true, cui: true, caenCode: true, caenName: true,
        missionDraft: true, visionDraft: true, valuesDraft: true,
        mvvMaturity: true, mvvLastBuiltAt: true, mvvCoherenceScore: true,
        mvvCoherenceGaps: true, mvvValidatedAt: true,
        tenant: { select: { name: true } },
      },
    }),
    prisma.job.findMany({
      where: { tenantId, status: "ACTIVE" },
      select: { title: true, purpose: true, responsibilities: true, requirements: true },
    }),
    prisma.evaluationSession.count({
      where: { tenantId, status: { in: ["COMPLETED", "VALIDATED"] } },
    }).catch(() => 0),
    // Structură salarială — verificăm dacă există grade salariale
    prisma.salaryGrade.count({ where: { tenantId } }).catch(() => 0),
    // Pay gap — verificăm dacă s-a rulat
    prisma.payGapReport.count({ where: { tenantId } }).catch(() => 0),
  ])

  if (!company) {
    const emptyMat = computeMaturityState(emptyDataPoints())
    const empty: CompanyProfile = {
      tenantId,
      identity: { name: null, cui: null, caenCode: null, caenName: null, industry: null, description: null },
      mvv: {
        maturity: "IMPLICIT",
        missionDraft: null, missionValidated: null,
        visionDraft: null, visionValidated: null,
        valuesDraft: [], valuesValidated: [],
        lastBuiltAt: null, coherenceScore: null,
      },
      maturityState: emptyMat,
      coherence: { overallScore: 0, checks: [], deviations: [], summary: "Profil necreat." },
      activationSignals: [],
      proactiveSignals: [],
      inconsistencies: [],
      profiledAt: new Date(),
    }
    return empty
  }

  // 2. Construim inventarul datelor
  const dataPoints: DataPointPresence = {
    hasCaen: !!company.caenName,
    hasDescription: !!company.description,
    hasMission: !!(company.mission || company.missionDraft),
    hasVision: !!(company.vision || company.visionDraft),
    hasValues: (company.values || []).length > 0 || (company.valuesDraft || []).length > 0,
    jobCount: jobs.length,
    jobsWithDescriptions: jobs.filter(j => j.purpose || j.responsibilities).length,
    evaluationSessionsCompleted: sessions,
    hasSalaryStructure: (salaryData || 0) > 0,
    hasBenchmark: false, // TODO: verificare reală benchmark
    hasPayGapAnalysis: (payGapData || 0) > 0,
    hasKPIs: false, // TODO: când avem model KPI
  }

  // 3. Maturitate
  const maturityState = computeMaturityState(dataPoints)

  // 4. Coerență (AI + deterministic)
  const coherence = await computeCoherence({
    caenName: company.caenName,
    mission: company.mission || company.missionDraft,
    vision: company.vision || company.visionDraft,
    values: (company.values || company.valuesDraft || []) as string[],
    jobs: jobs.map(j => ({
      title: j.title,
      purpose: j.purpose,
      responsibilities: j.responsibilities,
    })),
    evaluationCriteria: [], // TODO: extrage din sesiuni
    salaryNotes: (salaryData || 0) > 0 ? `${salaryData} grade salariale configurate` : null,
    maturity: maturityState.level,
  }).catch(() => ({
    overallScore: 0,
    checks: [],
    deviations: [],
    summary: "Coerența nu a putut fi calculată.",
  }))

  // 5. Stare anterioară (pentru semnale proactive + activare)
  const previousState = await getPreviousState(tenantId).catch(() => ({
    coherenceScore: null, maturityLevel: null, dataPoints: null, readyServices: [] as string[],
  }))

  // 6. Punct 5: Semnale de activare servicii
  const activationSignals = detectActivationSignals(
    maturityState,
    previousState.maturityLevel,
    previousState.readyServices as ServiceType[],
  )

  // 7. Punct 6: Semnale proactive
  const proactiveSignals = detectProactiveSignals(
    { coherence, maturityLevel: maturityState.level, dataPoints, maturityScore: maturityState.score },
    { coherenceScore: previousState.coherenceScore, maturityLevel: previousState.maturityLevel, dataPoints: previousState.dataPoints },
  )

  // 8. Asamblăm profilul complet
  const profile: CompanyProfile = {
    tenantId,
    identity: {
      name: company.tenant?.name || null,
      cui: company.cui,
      caenCode: company.caenCode,
      caenName: company.caenName,
      industry: company.industry,
      description: company.description,
    },
    mvv: {
      maturity: maturityState.level,
      missionDraft: company.missionDraft,
      missionValidated: company.mission,
      visionDraft: company.visionDraft,
      visionValidated: company.vision,
      valuesDraft: (company.valuesDraft || []) as string[],
      valuesValidated: (company.values || []) as string[],
      lastBuiltAt: company.mvvLastBuiltAt,
      coherenceScore: coherence.overallScore,
    },
    maturityState,
    coherence,
    activationSignals,
    proactiveSignals,
    inconsistencies: [], // Populat lazy mai jos
    profiledAt: new Date(),
  }

  // 9. Punct 9: Inconsistențe (necesită profilul asamblat)
  profile.inconsistencies = detectInconsistencies(profile)

  // 10. Cache
  profileCache.set(tenantId, { profile, at: Date.now() })

  // 11. Salvăm maturitatea + coerența în DB (async, non-blocking)
  prisma.companyProfile.update({
    where: { tenantId },
    data: {
      mvvMaturity: maturityState.level,
      mvvCoherenceScore: coherence.overallScore,
      mvvCoherenceGaps: coherence.deviations as any,
    },
  }).catch(() => {})

  // 12. Punct 7: Snapshot evoluție (non-blocking)
  saveMaturitySnapshot(
    tenantId, maturityState.level, maturityState.score,
    coherence.overallScore, dataPoints,
  ).catch(() => {})

  return profile
}

/**
 * Context pentru un agent specific — un singur apel
 */
export async function getAgentContext(tenantId: string, role: AgentRole): Promise<AgentContext> {
  const profile = await getCompanyProfile(tenantId)
  return buildAgentContext(profile, role)
}

/**
 * Secțiuni raport pentru un serviciu — injectabile în raportul existent
 */
export async function getReportSections(
  tenantId: string,
  service: ServiceType,
  serviceData?: Record<string, unknown>,
): Promise<ReportSection[]> {
  const profile = await getCompanyProfile(tenantId)
  return generateReportSections(profile, service, serviceData)
}

/**
 * Punct 7: Traiectorie evoluție client
 */
export async function getEvolution(tenantId: string, months = 6): Promise<EvolutionTrajectory> {
  const { getEvolutionTrajectory } = await import("./evolution")
  return getEvolutionTrajectory(tenantId, months)
}

/**
 * Punct 8: Ecosistem servicii — legături, fluxuri date, servicii izolate
 */
export async function getServiceEcosystem(tenantId: string): Promise<ServiceEcosystem> {
  const profile = await getCompanyProfile(tenantId)
  return buildServiceEcosystem(profile.maturityState.dataPoints)
}

/**
 * Jurnal client complet — traiectorie, credite, acțiuni
 */
export async function getClientJournal(tenantId: string, days = 90): Promise<ClientJournal> {
  const { buildClientJournal } = await import("./client-journal")
  return buildClientJournal(tenantId, days)
}

/**
 * Invalidează cache-ul (după acțiuni semnificative)
 */
export function invalidateProfileCache(tenantId: string): void {
  profileCache.delete(tenantId)
}

/**
 * Hook: apelat la fiecare acțiune semnificativă.
 * Invalidează cache-ul ca la următorul apel să se recalculeze.
 */
export async function onSignificantAction(tenantId: string): Promise<void> {
  invalidateProfileCache(tenantId)
}

function emptyDataPoints(): DataPointPresence {
  return {
    hasCaen: false, hasDescription: false, hasMission: false,
    hasVision: false, hasValues: false, jobCount: 0,
    jobsWithDescriptions: 0, evaluationSessionsCompleted: 0,
    hasSalaryStructure: false, hasBenchmark: false,
    hasPayGapAnalysis: false, hasKPIs: false,
  }
}
