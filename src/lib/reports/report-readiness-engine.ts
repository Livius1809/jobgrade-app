/**
 * Report Readiness Engine
 *
 * Verifică per tenant ce rapoarte pot fi generate pe baza datelor disponibile.
 * Fiecare raport are un set de date necesare (prerequisites).
 * Engine-ul returnează status ACTIVE/INACTIVE + lista datelor lipsă.
 *
 * Concept: rapoartele se activează prin date, nu prin buton.
 * Upsell organic: cardurile superioare deblochează rapoarte suplimentare.
 */

import { prisma } from "@/lib/prisma"
import { getTenantData } from "@/lib/tenant-storage"

// ── Types ──────────────────────────────────────────────────────────────────

export type ReportStatus = "ACTIVE" | "INACTIVE"

export interface ReportPrerequisite {
  key: string
  label: string
  available: boolean
  /** Hint: ce trebuie completat pentru a debloca */
  hint?: string
}

export interface ReportReadiness {
  reportId: string
  name: string
  description: string
  status: ReportStatus
  /** Card minim necesar (C1-C4) */
  minCard: "C1" | "C2" | "C3" | "C4"
  /** Procentaj completare prerequisites (0-100) */
  readinessPercent: number
  prerequisites: ReportPrerequisite[]
  /** Endpoint-ul API pentru generare */
  endpoint: string
}

// ── Report Definitions ────────────────────────────────────────────────────

interface ReportDefinition {
  reportId: string
  name: string
  description: string
  minCard: "C1" | "C2" | "C3" | "C4"
  endpoint: string
  prerequisites: Array<{
    key: string
    label: string
    hint: string
    check: (ctx: TenantContext) => boolean
  }>
}

interface TenantContext {
  hasCompanyProfile: boolean
  hasDepartments: boolean
  hasJobs: boolean
  hasEmployees: boolean
  hasClimateData: boolean
  hasCultureAudit: boolean
  has3CReport: boolean
  hasInterventionPlan: boolean
  hasWIFSimulation: boolean
  hasKBEntries: boolean
  hasObjectives: boolean
  hasPsychometricData: boolean
  hasLeadershipData: boolean
  hasMatchingRequests: boolean
  hasPIEData: boolean
  hasROICalculation: boolean
  /** Card-ul maxim deblocat de tenant */
  maxCard: number
}

const REPORT_DEFINITIONS: ReportDefinition[] = [
  // ── C1 Reports ──────────────────────────────────────────────────────────
  {
    reportId: "org-structure",
    name: "Structura organizatorica",
    description: "Harta departamente, pozitii, niveluri ierarhice",
    minCard: "C1",
    endpoint: "/api/v1/reports/strategic-metrics",
    prerequisites: [
      { key: "company", label: "Profil companie", hint: "Completati profilul companiei", check: ctx => ctx.hasCompanyProfile },
      { key: "departments", label: "Departamente", hint: "Adaugati cel putin un departament", check: ctx => ctx.hasDepartments },
      { key: "jobs", label: "Pozitii active", hint: "Adaugati pozitii in structura", check: ctx => ctx.hasJobs },
    ],
  },

  // ── C2 Reports ──────────────────────────────────────────────────────────
  {
    reportId: "climate-report",
    name: "Climat organizational",
    description: "Rezultate chestionar CO pe 8 dimensiuni",
    minCard: "C2",
    endpoint: "/api/v1/culture/audit",
    prerequisites: [
      { key: "company", label: "Profil companie", hint: "Completati profilul companiei", check: ctx => ctx.hasCompanyProfile },
      { key: "climate", label: "Chestionar climat", hint: "Completati chestionarul de climat organizational (CO)", check: ctx => ctx.hasClimateData },
    ],
  },
  {
    reportId: "culture-audit",
    name: "Audit cultural",
    description: "Analiza AI pe 7 dimensiuni culturale",
    minCard: "C2",
    endpoint: "/api/v1/culture/audit",
    prerequisites: [
      { key: "company", label: "Profil companie", hint: "Completati profilul companiei", check: ctx => ctx.hasCompanyProfile },
      { key: "departments", label: "Departamente", hint: "Adaugati departamente", check: ctx => ctx.hasDepartments },
      { key: "employees", label: "Date angajati", hint: "Importati date salariale/angajati", check: ctx => ctx.hasEmployees },
    ],
  },

  // ── C3 Reports ──────────────────────────────────────────────────────────
  {
    reportId: "learning-capacity",
    name: "Capacitate de invatare",
    description: "Rata crestere KB, artefacte, knowledge debt per organizatie",
    minCard: "C3",
    endpoint: "/api/v1/reports/learning-capacity",
    prerequisites: [
      { key: "company", label: "Profil companie", hint: "Completati profilul companiei", check: ctx => ctx.hasCompanyProfile },
      { key: "kb", label: "Baza de cunostinte", hint: "Sistemul acumuleaza cunostinte din interactiuni", check: ctx => ctx.hasKBEntries },
      { key: "objectives", label: "Obiective organizationale", hint: "Definiti obiective in platforma", check: ctx => ctx.hasObjectives },
    ],
  },
  {
    reportId: "adaptation-capacity",
    name: "Capacitate de adaptare",
    description: "Simulari WIF, schimbari audit cultural, progres interventii",
    minCard: "C3",
    endpoint: "/api/v1/reports/adaptation-capacity",
    prerequisites: [
      { key: "culture-audit", label: "Audit cultural", hint: "Rulati auditul cultural (C2)", check: ctx => ctx.hasCultureAudit },
      { key: "wif", label: "Simulari WIF", hint: "Rulati cel putin o simulare What-If", check: ctx => ctx.hasWIFSimulation },
      { key: "intervention", label: "Plan interventie", hint: "Generati un plan de interventie culturala", check: ctx => ctx.hasInterventionPlan },
    ],
  },
  {
    reportId: "leadership-profile",
    name: "Profil leadership",
    description: "18 trasaturi leadership, integrare PIE, rapoarte echipa",
    minCard: "C3",
    endpoint: "/api/v1/reports/leadership-profile",
    prerequisites: [
      { key: "psychometric", label: "Date psihometrice", hint: "Completati evaluarile psihometrice (Herrmann/MBTI)", check: ctx => ctx.hasPsychometricData },
      { key: "pie", label: "Integrare PIE", hint: "Datele PIE (om x post x organizatie) sunt necesare", check: ctx => ctx.hasPIEData },
      { key: "leadership", label: "Evaluari leadership", hint: "Completati evaluarea pe 18 trasaturi", check: ctx => ctx.hasLeadershipData },
    ],
  },
  {
    reportId: "strategic-metrics",
    name: "Metrici strategice",
    description: "Rata completare obiective, time-to-complete, eficacitate cascada",
    minCard: "C3",
    endpoint: "/api/v1/reports/strategic-metrics",
    prerequisites: [
      { key: "objectives", label: "Obiective organizationale", hint: "Definiti obiective", check: ctx => ctx.hasObjectives },
      { key: "company", label: "Profil companie", hint: "Completati profilul companiei", check: ctx => ctx.hasCompanyProfile },
    ],
  },

  // ── C4 Reports ──────────────────────────────────────────────────────────
  {
    reportId: "culture-manual",
    name: "Manual cultura organizationala",
    description: "Manual generat AI: audit + 3C + interventii",
    minCard: "C4",
    endpoint: "/api/v1/culture/manual",
    prerequisites: [
      { key: "culture-audit", label: "Audit cultural", hint: "Rulati auditul cultural", check: ctx => ctx.hasCultureAudit },
      { key: "3c", label: "Raport 3C", hint: "Generati raportul 3C", check: ctx => ctx.has3CReport },
      { key: "intervention", label: "Plan interventie", hint: "Generati planul de interventie", check: ctx => ctx.hasInterventionPlan },
    ],
  },
  {
    reportId: "business-plan",
    name: "Plan operational de business",
    description: "Sinteza C1-C4: simulari WIF, calcule ROI, recomandari",
    minCard: "C4",
    endpoint: "/api/v1/reports/business-plan",
    prerequisites: [
      { key: "culture-audit", label: "Audit cultural", hint: "Rulati auditul cultural", check: ctx => ctx.hasCultureAudit },
      { key: "wif", label: "Simulari WIF", hint: "Rulati simulari What-If", check: ctx => ctx.hasWIFSimulation },
      { key: "roi", label: "Calcul ROI", hint: "Efectuati calcule ROI", check: ctx => ctx.hasROICalculation },
      { key: "objectives", label: "Obiective", hint: "Definiti obiective organizationale", check: ctx => ctx.hasObjectives },
    ],
  },
]

// ── Card number helper ────────────────────────────────────────────────────

function cardToNumber(card: "C1" | "C2" | "C3" | "C4"): number {
  return parseInt(card.replace("C", ""), 10)
}

// ── Context Builder ───────────────────────────────────────────────────────

async function buildTenantContext(tenantId: string): Promise<TenantContext> {
  const [
    companyProfile,
    departmentCount,
    jobCount,
    employeeCount,
    climateData,
    cultureAudit,
    report3C,
    interventionPlan,
    wifSimulation,
    kbCount,
    objectiveCount,
    psychometricData,
    leadershipData,
    matchingRequests,
    pieData,
    roiData,
  ] = await Promise.all([
    prisma.companyProfile.findFirst({ where: { tenantId }, select: { id: true } }),
    prisma.department.count({ where: { tenantId, isActive: true } }),
    prisma.job.count({ where: { tenantId, isActive: true } }),
    prisma.employeeSalaryRecord.count({ where: { tenantId } }),
    getTenantData(tenantId, "CLIMATE_CO"),
    getTenantData(tenantId, "CULTURE_AUDIT"),
    getTenantData(tenantId, "3C_REPORT"),
    getTenantData(tenantId, "INTERVENTION_PLAN"),
    getTenantData(tenantId, "WIF_SIMULATION"),
    prisma.kBEntry.count({ where: { tags: { has: tenantId } } }).catch(() => 0),
    prisma.organizationalObjective.count({ where: { businessId: tenantId, completedAt: null } }).catch(() => 0),
    getTenantData(tenantId, "PSYCHOMETRIC_DATA"),
    getTenantData(tenantId, "LEADERSHIP_EVAL"),
    getTenantData(tenantId, "MATCHING_REQUESTS"),
    getTenantData(tenantId, "PIE_RESULTS"),
    getTenantData(tenantId, "ROI_CALCULATION"),
  ])

  // Determine max unlocked card from tenant plan
  let maxCard = 1
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { plan: true },
    })
    if (tenant?.plan) {
      if (tenant.plan === "ENTERPRISE") maxCard = 4
      else if (tenant.plan === "PROFESSIONAL") maxCard = 3
      else maxCard = 2 // STARTER gets C1+C2
    }
  } catch {
    maxCard = 1
  }

  return {
    hasCompanyProfile: companyProfile !== null,
    hasDepartments: departmentCount > 0,
    hasJobs: jobCount > 0,
    hasEmployees: employeeCount > 0,
    hasClimateData: climateData !== null,
    hasCultureAudit: cultureAudit !== null,
    has3CReport: report3C !== null,
    hasInterventionPlan: interventionPlan !== null,
    hasWIFSimulation: wifSimulation !== null,
    hasKBEntries: kbCount > 0,
    hasObjectives: objectiveCount > 0,
    hasPsychometricData: psychometricData !== null,
    hasLeadershipData: leadershipData !== null,
    hasMatchingRequests: matchingRequests !== null,
    hasPIEData: pieData !== null,
    hasROICalculation: roiData !== null,
    maxCard,
  }
}

// ── Main API ──────────────────────────────────────────────────────────────

/**
 * Returnează statusul tuturor rapoartelor pentru un tenant.
 * Folosit de SmartReportsDashboard.
 */
export async function getReportReadiness(tenantId: string): Promise<ReportReadiness[]> {
  const ctx = await buildTenantContext(tenantId)

  return REPORT_DEFINITIONS.map(def => {
    const cardLocked = cardToNumber(def.minCard) > ctx.maxCard
    const prerequisites: ReportPrerequisite[] = def.prerequisites.map(p => ({
      key: p.key,
      label: p.label,
      available: p.check(ctx),
      hint: p.check(ctx) ? undefined : p.hint,
    }))

    const metCount = prerequisites.filter(p => p.available).length
    const totalCount = prerequisites.length
    const readinessPercent = totalCount > 0 ? Math.round((metCount / totalCount) * 100) : 0

    // ACTIVE only if card unlocked AND all prerequisites met
    const allMet = metCount === totalCount
    const status: ReportStatus = (!cardLocked && allMet) ? "ACTIVE" : "INACTIVE"

    // If card is locked, add a special prerequisite
    if (cardLocked) {
      prerequisites.unshift({
        key: "card-unlock",
        label: `Card ${def.minCard} necesar`,
        available: false,
        hint: `Achizitionati cardul ${def.minCard} pentru a debloca acest raport`,
      })
    }

    return {
      reportId: def.reportId,
      name: def.name,
      description: def.description,
      status,
      minCard: def.minCard,
      readinessPercent: cardLocked ? 0 : readinessPercent,
      prerequisites,
      endpoint: def.endpoint,
    }
  })
}
