import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getBalance } from "@/lib/credits"
import Link from "next/link"
import CompanyIdentityCard from "@/components/company/CompanyIdentityCard"

export const dynamic = "force-dynamic"
export const metadata = { title: "Portal — JobGrade" }

/* ── Data inputs — ce date poate furniza clientul ─────────────────── */

interface DataInput {
  id: string
  label: string
  description: string
  href: string
}

const INPUT_LABELS: Record<string, string> = {
  company_identity: "Identitate firmă (CUI)",
  jobs: "Fișe de post",
  jobs_complete: "Fișe de post complete",
  payroll: "Stat de salarii",
  internal_docs: "Documente interne companie",
  "org-chart": "Organigramă declarată",
  kpis: "Obiective și KPI per post",
  "salary-packages-input": "Pachete salariale extinse",
  "evaluation-committee": "Comitet de evaluare",
  demographics: "Date demografice angajați",
  aspirations: "Aspirații profesionale individuale",
  "org-climate": "Climat organizațional",
  "training-plan": "Plan și buget formare",
  representatives: "Reprezentanți și roluri",
  "company-extended": "Date suplimentare companie",
}

/* ── Servicii — ce poate accesa cu datele respective ──────────────── */

interface Service {
  id: string
  label: string
  href: string
  requiredInputs: string[]
  color: string
  creditCost?: string  // ex: "~5 credite/poziție" sau "—" dacă necalibrat
  optional?: boolean   // opțional, nu e cerut de lege
}

interface ServiceCategory {
  name: string
  color: string
  services: Service[]
}

const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    name: "Profil sectorial (instant cu CUI)",
    color: "emerald",
    services: [
      { id: "sector-overview", label: "Profil sectorial — repere salariale în industrie", href: "/sector-profile", requiredInputs: ["company_identity"], color: "emerald", creditCost: "gratuit" },
      { id: "sector-paygap", label: "Top 5 decalaje salariale specifice sectorului de activitate", href: "/sector-profile#paygap", requiredInputs: ["company_identity"], color: "emerald", creditCost: "gratuit" },
      { id: "mvv-draft", label: "Misiune, Viziune, Valori (MVV) — șablon editabil auto-completat", href: "/company#mvv", requiredInputs: ["company_identity"], color: "emerald", creditCost: "gratuit" },
    ],
  },
  {
    name: "Evaluare",
    color: "indigo",
    services: [
      { id: "je", label: "Evaluarea și ierarhizarea posturilor de lucru", href: "/sessions", requiredInputs: ["jobs"], color: "indigo", creditCost: "credite/poziție" },
      { id: "salary-grades", label: "Structuri salariale (clase și trepte)", href: "/sessions", requiredInputs: ["jobs", "payroll"], color: "indigo", creditCost: "credite/proiect" },
      { id: "performance-eval", label: "Evaluarea performanței (obiective cf. fișei postului, indicatori de performanță)", href: "/performance", requiredInputs: ["jobs_complete", "kpis"], color: "indigo", creditCost: "credite/angajat" },
      { id: "salary-packages", label: "Pachete salariale (compensații, beneficii, scenarii bugetare)", href: "/compensation/packages", requiredInputs: ["jobs", "payroll", "salary-packages-input"], color: "indigo", creditCost: "credite/proiect" },
      { id: "benchmark", label: "Benchmark salarial", href: "/compensation/benchmark", requiredInputs: ["jobs", "payroll"], color: "indigo", creditCost: "credite/proiect" },
    ],
  },
  {
    name: "Recrutare, angajare, perioadă de inducție",
    color: "sky",
    services: [
      { id: "recruit-design", label: "Proiectarea procesului de recrutare", href: "/recruitment/design", requiredInputs: ["company_identity", "jobs"], color: "sky", creditCost: "credite/proiect" },
      { id: "recruit-manage", label: "Gestionarea procesului de recrutare", href: "/recruitment", requiredInputs: ["jobs"], color: "sky", creditCost: "credite/candidat" },
      { id: "pre-hire-docs", label: "Documente pre-angajare (listă scurtă, formular informare condiții, ofertă angajare, documente interne companie — Fișa post, Regulament de ordine interioară, Contract colectiv de muncă, Cod etic etc.)", href: "/recruitment/documents", requiredInputs: ["jobs_complete", "company_identity", "internal_docs"], color: "sky", creditCost: "credite/candidat" },
      { id: "induction-docs", label: "Documente perioadă de inducție — Manualul noului angajat", href: "/recruitment/induction", requiredInputs: ["jobs_complete", "company_identity", "internal_docs"], color: "sky", creditCost: "credite/manual" },
    ],
  },
  {
    name: "Conformitate EU 2023/970",
    color: "violet",
    services: [
      { id: "paygap", label: "Analiza decalajului salarial", href: "/pay-gap", requiredInputs: ["jobs", "payroll"], color: "violet", creditCost: "credite/angajat" },
      { id: "joint", label: "Evaluarea comună (Art. 10)", href: "/pay-gap/assessments", requiredInputs: ["jobs", "payroll", "evaluation-committee"], color: "violet", creditCost: "credite/proiect" },
      { id: "employee-file", label: "Fișa angajatului (atribuții, ierarhie, clasă și treaptă salarială, pachet salarial, plan de dezvoltare)", href: "/employees", requiredInputs: ["jobs_complete", "payroll", "demographics"], color: "violet", creditCost: "credite/angajat", optional: true },
      { id: "hr-development", label: "Dezvoltarea resurselor umane în companie (aspirații profesionale individuale vs. nevoi organizaționale vs. mijloace necesare)", href: "/hr-development", requiredInputs: ["jobs_complete", "payroll", "aspirations"], color: "violet", creditCost: "credite/proiect", optional: true },
    ],
  },
  {
    name: "Dezvoltare organizațională",
    color: "fuchsia",
    services: [
      { id: "eval-personal", label: "Evaluarea personalului", href: "#", requiredInputs: ["jobs_complete", "payroll", "kpis"], color: "fuchsia" },
      { id: "diagnosis", label: "Diagnoză organizațională", href: "#", requiredInputs: ["jobs_complete", "evaluation-committee"], color: "fuchsia" },
      { id: "multigen", label: "Managementul echipelor multigeneraționale", href: "#", requiredInputs: ["jobs_complete", "payroll", "demographics"], color: "fuchsia" },
      { id: "omAI", label: "Managementul structurilor și echipelor mixte om-AI", href: "#", requiredInputs: ["jobs_complete", "internal_docs"], color: "fuchsia" },
      { id: "quality", label: "Procese interne și Manualul calității", href: "#", requiredInputs: ["jobs_complete", "internal_docs"], color: "fuchsia" },
      { id: "culture", label: "Cultură organizațională și performanță", href: "#", requiredInputs: ["jobs_complete", "payroll", "org-climate"], color: "fuchsia" },
    ],
  },
]

/* ── Inputuri detaliate (4 grupe, 12 itemi) + indice relevanță ─────────────
   Pondere per input: A=3, B=3, C=2, D=1 → max total = 27 puncte
   Status per input: EMPTY (0), PARTIAL (½ pondere), COMPLETE (pondere completă)
*/
type InputStatus = "EMPTY" | "PARTIAL" | "COMPLETE"
type InputGroup = "A" | "B" | "C" | "D"

interface InputDef {
  id: string
  group: InputGroup
  label: string
  weight: number
  href?: string // unde merge clientul să-l completeze
  comingSoon?: boolean
  // Sub-itemi opționali. Regula: e suficient UNUL completat ca input să fie 100%.
  // Folosit pentru categorii de documente unde clientul rar le are pe toate.
  subItems?: string[]
}

const INPUT_LIBRARY: InputDef[] = [
  // A. Identitate (3 × pondere 3)
  { id: "identity", group: "A", label: "Identitate firmă (CUI → ANAF)", weight: 3, href: "/portal" },
  { id: "company-extended", group: "A", label: "Date suplimentare companie (misiune, viziune, valori, descriere)", weight: 3, href: "/company" },
  { id: "representatives", group: "A", label: "Reprezentanți și roluri (cine semnează, cine validează)", weight: 3, href: "/company#representatives", comingSoon: true },
  // B. Posturi & oameni (3 × pondere 3)
  { id: "payroll", group: "B", label: "Stat de funcții", weight: 3, href: "/compensation/packages" },
  { id: "jobs", group: "B", label: "Fișe de post (atribuții, cerințe, responsabilități)", weight: 3, href: "/jobs" },
  { id: "demographics", group: "B", label: "Date demografice angajați (gen, vârstă, vechime)", weight: 3, href: "/employees", comingSoon: true },
  // C. Sisteme operaționale (5 × pondere 2)
  { id: "org-chart", group: "C", label: "Organigramă declarată (top + subordonări)", weight: 2, href: "/company/structure", comingSoon: true },
  { id: "kpis", group: "C", label: "Obiective și indicatori de performanță (per post)", weight: 2, href: "/performance", comingSoon: true },
  { id: "salary-packages-input", group: "C", label: "Pachete salariale extinse (compensații + beneficii non-monetare)", weight: 2, href: "/compensation/packages" },
  { id: "evaluation-committee", group: "C", label: "Comitet de evaluare (membri + roluri)", weight: 2, href: "/sessions", comingSoon: true },
  {
    id: "internal_docs",
    group: "C",
    label: "Documente interne companie (documente existente)",
    weight: 2,
    href: "/company/documents",
    comingSoon: true,
    subItems: [
      "Regulament de ordine interioară (ROI)",
      "Contract colectiv de muncă (CCM)",
      "Cod etic / cod de conduită",
      "Politici interne (antidiscriminare, anticorupție etc.)",
    ],
  },
  // D. Opționale strategice (3 × pondere 1)
  { id: "aspirations", group: "D", label: "Aspirații profesionale individuale (chestionar angajați)", weight: 1, href: "/hr-development", comingSoon: true },
  { id: "training-plan", group: "D", label: "Plan și buget formare", weight: 1, href: "/training", comingSoon: true },
  { id: "org-climate", group: "D", label: "Climat organizațional (chestionar)", weight: 1, href: "/climate", comingSoon: true },
]

const GROUP_LABELS: Record<InputGroup, string> = {
  A: "A. Identitate (esențial)",
  B: "B. Posturi & oameni (esențial)",
  C: "C. Sisteme operaționale",
  D: "D. Opționale strategice",
}

/* ── Jurnal rapoarte — lista completă a rapoartelor produse de platformă ── */
const REPORT_LIBRARY: Array<{
  id: string
  label: string
  type: string
  group: string
}> = [
  // Profil sectorial (instant cu CUI)
  { id: "sector-profile", label: "Raport profil sectorial — repere salariale în industrie", type: "SECTOR_PROFILE", group: "Profil sectorial" },
  { id: "sector-paygap-top5", label: "Top 5 decalaje salariale specifice sectorului", type: "SECTOR_PAYGAP", group: "Profil sectorial" },
  { id: "mvv-draft", label: "Misiune, Viziune, Valori (MVV) — șablon editabil", type: "MVV_DRAFT", group: "Profil sectorial" },

  // Evaluare
  { id: "hierarchy", label: "Raport ierarhizare posturi", type: "HIERARCHY", group: "Evaluare" },
  { id: "salary-grades", label: "Raport structură salarială (clase și trepte)", type: "SALARY_GRADES", group: "Evaluare" },
  { id: "performance-position", label: "Raport KPI per poziție (obiective și indicatori)", type: "KPI_POSITION", group: "Evaluare" },
  { id: "performance-evaluation", label: "Raport evaluare performanță", type: "PERFORMANCE_EVAL", group: "Evaluare" },
  { id: "salary-packages", label: "Raport pachete salariale (compensații + beneficii)", type: "SALARY_PACKAGES", group: "Evaluare" },
  { id: "benchmark", label: "Raport benchmark salarial", type: "BENCHMARK", group: "Evaluare" },
  { id: "budget", label: "Raport impact bugetar", type: "BUDGET", group: "Evaluare" },
  { id: "kpi", label: "Raport KPI organizație", type: "KPI", group: "Evaluare" },

  // Recrutare & inducție
  { id: "recruit-design", label: "Raport proiectare proces recrutare", type: "RECRUIT_DESIGN", group: "Recrutare & inducție" },
  { id: "recruit-manage", label: "Raport gestionare proces recrutare", type: "RECRUIT_MANAGE", group: "Recrutare & inducție" },
  { id: "job-description", label: "Fișa de post (document tipărit per poziție)", type: "JOB_DESCRIPTION", group: "Recrutare & inducție" },
  { id: "shortlist", label: "Listă scurtă candidați", type: "SHORTLIST", group: "Recrutare & inducție" },
  { id: "info-conditions", label: "Formular informare condiții", type: "INFO_CONDITIONS", group: "Recrutare & inducție" },
  { id: "job-offer", label: "Ofertă de angajare", type: "JOB_OFFER", group: "Recrutare & inducție" },
  { id: "internal-synthesis", label: "Sinteză documente interne (extras relevant per poziție)", type: "INTERNAL_SYNTHESIS", group: "Recrutare & inducție" },
  { id: "employee-manual", label: "Manualul angajatului", type: "EMPLOYEE_MANUAL", group: "Recrutare & inducție" },

  // Conformitate EU 2023/970
  { id: "pay-gap", label: "Raport decalaj salarial (UE 2023/970)", type: "PAY_GAP", group: "Conformitate EU 2023/970" },
  { id: "joint", label: "Raport evaluare comună (Art. 10)", type: "JOINT", group: "Conformitate EU 2023/970" },
  { id: "employee-file", label: "Fișa angajatului (per persoană) — opțional", type: "EMPLOYEE_FILE", group: "Conformitate EU 2023/970" },
  { id: "hr-development", label: "Raport dezvoltare resurse umane — opțional", type: "HR_DEVELOPMENT", group: "Conformitate EU 2023/970" },

  // Dezvoltare organizațională
  { id: "personnel-eval", label: "Raport evaluare personal", type: "PERSONNEL_EVAL", group: "Dezvoltare organizațională" },
  { id: "org-diagnosis", label: "Raport diagnoză organizațională", type: "ORG_DIAGNOSIS", group: "Dezvoltare organizațională" },
  { id: "multigen", label: "Raport echipe multigeneraționale", type: "MULTIGEN", group: "Dezvoltare organizațională" },
  { id: "om-ai", label: "Raport structuri și echipe mixte om-AI", type: "OM_AI", group: "Dezvoltare organizațională" },
  { id: "quality", label: "Raport procese interne și Manualul calității", type: "QUALITY", group: "Dezvoltare organizațională" },
  { id: "culture", label: "Raport cultură organizațională și performanță", type: "CULTURE", group: "Dezvoltare organizațională" },

  // Sinteză
  { id: "full", label: "Raport complet (toate secțiunile)", type: "FULL", group: "Sinteză" },
]

/* ── Data fetching ────────────────────────────────────────────────── */

async function getPortalData(tenantId: string) {
  const [credits, tenant, profile, jobCount, payrollCount, completeJobCount, reports, payrollAggregate, payGapReport, activeSessionsCount, employeeRecords, oldJobsCount, recentJobs, recentSessions, recentPayrollEntries, allPayroll] = await Promise.all([
    getBalance(tenantId),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    prisma.companyProfile.findUnique({ where: { tenantId } }).catch(() => null),
    prisma.job.count({ where: { tenantId, status: "ACTIVE" } }).catch(() => 0),
    (prisma as any).payrollEntry.count({ where: { tenantId } }).catch(() => 0) as Promise<number>,
    prisma.job.count({ where: { tenantId, status: "ACTIVE", responsibilities: { not: null } } }).catch(() => 0),
    prisma.report.findMany({
      where: { tenantId },
      select: { type: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }).catch(() => [] as Array<{ type: string; createdAt: Date }>),
    (prisma as any).payrollEntry.aggregate({
      where: { tenantId },
      _sum: { baseSalary: true },
    }).catch(() => ({ _sum: { baseSalary: null } })) as Promise<{ _sum: { baseSalary: number | null } }>,
    prisma.report.findFirst({
      where: { tenantId, type: "PAY_GAP" as any },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }).catch(() => null),
    prisma.evaluationSession.count({
      where: { tenantId, status: { notIn: ["COMPLETED", "DRAFT"] } },
    }).catch(() => 0),
    prisma.employeeSalaryRecord.findMany({
      where: { tenantId },
      select: { gender: true, baseSalary: true, variableComp: true },
    }).catch(() => [] as Array<{ gender: string; baseSalary: number; variableComp: number }>),
    prisma.job.count({
      where: {
        tenantId,
        status: "ACTIVE",
        updatedAt: { lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
      },
    }).catch(() => 0),
    prisma.job.findMany({
      where: { tenantId },
      select: { title: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }).catch(() => [] as Array<{ title: string; createdAt: Date }>),
    prisma.evaluationSession.findMany({
      where: { tenantId },
      select: { name: true, createdAt: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }).catch(() => [] as Array<{ name: string; createdAt: Date; status: string }>),
    (prisma as any).payrollEntry.findMany({
      where: { tenantId },
      select: { importBatchId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }).catch(() => [] as Array<{ importBatchId: string; createdAt: Date }>),
    (prisma as any).payrollEntry.findMany({
      where: { tenantId },
      select: {
        department: true,
        hierarchyLevel: true,
        city: true,
        jobTitle: true,
        workSchedule: true,
        gender: true,
        baseSalary: true,
        totalMonthlyGross: true,
      },
    }).catch(() => [] as Array<{
      department: string
      hierarchyLevel: string
      city: string | null
      jobTitle: string
      workSchedule: string
      gender: string
      baseSalary: number
      totalMonthlyGross: number | null
    }>),
  ])

  // Pay gap (UE 2023/970): diferență salariu mediu bărbați vs femei
  let payGapPercent: number | null = null
  let medianSalary: number | null = null
  if (employeeRecords.length > 0) {
    const m = employeeRecords.filter(r => r.gender === "MALE")
    const f = employeeRecords.filter(r => r.gender === "FEMALE")
    if (m.length > 0 && f.length > 0) {
      const avgM = m.reduce((s, r) => s + r.baseSalary + r.variableComp, 0) / m.length
      const avgF = f.reduce((s, r) => s + r.baseSalary + r.variableComp, 0) / f.length
      if (avgM > 0) {
        payGapPercent = Math.round(((avgM - avgF) / avgM) * 1000) / 10 // 1 zecimală
      }
    }
    const totals = employeeRecords.map(r => r.baseSalary + r.variableComp).sort((a, b) => a - b)
    if (totals.length > 0) {
      const mid = Math.floor(totals.length / 2)
      medianSalary = totals.length % 2 === 0
        ? (totals[mid - 1] + totals[mid]) / 2
        : totals[mid]
    }
  }

  const providedInputs = new Set<string>()
  if (jobCount > 0) providedInputs.add("jobs")
  if (completeJobCount > 0) providedInputs.add("jobs_complete")
  if (payrollCount > 0) providedInputs.add("payroll")
  // Identitate firmă completă = avem CUI + industrie sincronizate cu ANAF
  if (profile?.cui && profile?.industry && profile?.anafSyncedAt) {
    providedInputs.add("company_identity")
  }

  const jobsPercent = jobCount === 0 ? 0 : completeJobCount > 0 ? 100 : 60
  const payrollPercent = payrollCount > 0 ? 100 : 0

  // Agregare jurnal rapoarte: count + ultima dată per type
  const reportsByType = new Map<string, { count: number; lastAt: Date }>()
  for (const r of reports) {
    const prev = reportsByType.get(r.type)
    if (!prev) {
      reportsByType.set(r.type, { count: 1, lastAt: r.createdAt })
    } else {
      prev.count += 1
      // reports e ordered desc, deci primul lastAt e cel corect
    }
  }

  // Status per input + indice de relevanță
  const inputStatuses = new Map<string, InputStatus>()

  // A. Identitate firmă
  if (profile?.cui && profile?.industry && profile?.anafSyncedAt) {
    inputStatuses.set("identity", "COMPLETE")
  } else if (profile?.cui) {
    inputStatuses.set("identity", "PARTIAL")
  } else {
    inputStatuses.set("identity", "EMPTY")
  }

  // A. Date suplimentare companie (mission + vision + values complet)
  const hasMV = !!profile?.mission && !!profile?.vision
  const hasValues = (profile?.values?.length ?? 0) > 0
  if (hasMV && hasValues) inputStatuses.set("company-extended", "COMPLETE")
  else if (hasMV || hasValues || profile?.description) inputStatuses.set("company-extended", "PARTIAL")
  else inputStatuses.set("company-extended", "EMPTY")

  // B. Stat de funcții
  inputStatuses.set("payroll", payrollCount > 0 ? "COMPLETE" : "EMPTY")

  // B. Fișe de post (parțial dacă există dar incomplete)
  if (jobCount === 0) inputStatuses.set("jobs", "EMPTY")
  else if (completeJobCount === jobCount) inputStatuses.set("jobs", "COMPLETE")
  else inputStatuses.set("jobs", "PARTIAL")

  // Restul (placeholder coming soon) → EMPTY
  for (const def of INPUT_LIBRARY) {
    if (!inputStatuses.has(def.id)) inputStatuses.set(def.id, "EMPTY")
  }

  // Calcul indice
  let earned = 0
  let maxScore = 0
  for (const def of INPUT_LIBRARY) {
    maxScore += def.weight
    const status = inputStatuses.get(def.id)
    if (status === "COMPLETE") earned += def.weight
    else if (status === "PARTIAL") earned += def.weight / 2
  }
  const relevanceIndex = maxScore > 0 ? Math.round((earned / maxScore) * 100) : 0

  return {
    credits,
    companyName: tenant?.name ?? "Organizația ta",
    profile,
    jobCount,
    payrollCount: payrollCount as number,
    completeJobCount,
    jobsPercent,
    payrollPercent,
    providedInputs,
    reportsByType,
    inputStatuses,
    relevanceIndex,
    monthlyBudget: payrollAggregate._sum.baseSalary ?? 0,
    payGapLastAt: payGapReport?.createdAt ?? null,
    activeSessionsCount,
    payGapPercent,
    medianSalary,
    employeeRecordsCount: employeeRecords.length,
    oldJobsCount,
    recentEvents: buildRecentEvents({
      profile,
      recentJobs,
      recentSessions,
      recentPayrollEntries,
      reports,
    }),
    orgStructure: buildOrgStructure(allPayroll),
    payGapByCategory: buildPayGapByCategory(allPayroll),
  }
}

/* ── Organigramă: Departament → Locație → posturi pe niveluri ierarhice ──── */
type OrgStructure = {
  totalEmployees: number
  departments: Array<{
    name: string
    count: number
    locations: Array<{ city: string; count: number }>
    levels: Array<{ level: string; count: number }>
  }>
  byLevel: Array<{ level: string; count: number }>
}

const HIERARCHY_ORDER = ["N", "N-1", "N-2", "N-3", "N-4", "N-5+"]

function buildOrgStructure(
  payroll: Array<{ department: string; hierarchyLevel: string; city: string | null }>
): OrgStructure | null {
  if (payroll.length === 0) return null

  const deptMap = new Map<string, {
    levels: Map<string, number>
    locations: Map<string, number>
  }>()
  const levelMap = new Map<string, number>()

  for (const p of payroll) {
    const dept = p.department || "—"
    const lvl = p.hierarchyLevel || "—"
    const city = (p.city || "").trim() || "—"

    if (!deptMap.has(dept)) {
      deptMap.set(dept, { levels: new Map(), locations: new Map() })
    }
    const d = deptMap.get(dept)!
    d.levels.set(lvl, (d.levels.get(lvl) ?? 0) + 1)
    d.locations.set(city, (d.locations.get(city) ?? 0) + 1)

    levelMap.set(lvl, (levelMap.get(lvl) ?? 0) + 1)
  }

  const departments = Array.from(deptMap.entries())
    .map(([name, d]) => ({
      name,
      count: Array.from(d.levels.values()).reduce((s, n) => s + n, 0),
      locations: Array.from(d.locations.entries())
        .map(([city, count]) => ({ city, count }))
        .sort((a, b) => b.count - a.count),
      levels: Array.from(d.levels.entries())
        .map(([level, count]) => ({ level, count }))
        .sort((a, b) => HIERARCHY_ORDER.indexOf(a.level) - HIERARCHY_ORDER.indexOf(b.level)),
    }))
    .sort((a, b) => b.count - a.count)

  const byLevel = Array.from(levelMap.entries())
    .map(([level, count]) => ({ level, count }))
    .sort((a, b) => HIERARCHY_ORDER.indexOf(a.level) - HIERARCHY_ORDER.indexOf(b.level))

  return { totalEmployees: payroll.length, departments, byLevel }
}

/* ── Pay gap pe CATEGORII de muncitori (Art. 9 Directiva 2023/970) ─────────
   Comparația se face per (jobTitle × workSchedule), nu global.
   Listăm toate cazurile unde există atât bărbați cât și femei.
*/
type PayGapByCategory = {
  jobTitle: string
  workSchedule: string
  countMale: number
  countFemale: number
  avgMale: number
  avgFemale: number
  diffPercent: number // pozitiv = ♂ peste ♀; negativ = invers
  diffAbs: number // RON
}

function buildPayGapByCategory(
  payroll: Array<{ jobTitle: string; workSchedule: string; gender: string; baseSalary: number; totalMonthlyGross: number | null }>
): PayGapByCategory[] {
  if (payroll.length === 0) return []

  const groups = new Map<string, typeof payroll>()
  for (const p of payroll) {
    const key = `${p.jobTitle}||${p.workSchedule}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(p)
  }

  const results: PayGapByCategory[] = []
  for (const [key, items] of groups) {
    const m = items.filter(i => i.gender === "MALE")
    const f = items.filter(i => i.gender === "FEMALE")
    if (m.length === 0 || f.length === 0) continue

    const salOf = (p: typeof payroll[0]) => p.totalMonthlyGross ?? p.baseSalary
    const avgM = m.reduce((s, p) => s + salOf(p), 0) / m.length
    const avgF = f.reduce((s, p) => s + salOf(p), 0) / f.length
    if (avgM === 0 && avgF === 0) continue

    const ref = Math.max(avgM, avgF)
    const diffPercent = Math.round(((avgM - avgF) / ref) * 1000) / 10
    const diffAbs = Math.round(avgM - avgF)

    const [jobTitle, workSchedule] = key.split("||")
    results.push({
      jobTitle, workSchedule,
      countMale: m.length, countFemale: f.length,
      avgMale: avgM, avgFemale: avgF,
      diffPercent, diffAbs,
    })
  }

  // Sortat după magnitudine absolută a diferenței procentuale
  return results.sort((a, b) => Math.abs(b.diffPercent) - Math.abs(a.diffPercent))
}

/* ── Mini-jurnal activitate: agregă evenimente recente din mai multe surse ── */
type RecentEvent = { at: Date; icon: string; text: string; href?: string }

function buildRecentEvents(args: {
  profile: { anafSyncedAt?: Date | null } | null
  recentJobs: Array<{ title: string; createdAt: Date }>
  recentSessions: Array<{ name: string; createdAt: Date; status: string }>
  recentPayrollEntries: Array<{ importBatchId: string; createdAt: Date }>
  reports: Array<{ type: string; createdAt: Date }>
}): RecentEvent[] {
  const events: RecentEvent[] = []

  // ANAF sync
  if (args.profile?.anafSyncedAt) {
    events.push({
      at: new Date(args.profile.anafSyncedAt),
      icon: "🇷🇴",
      text: "Identitate firmă sincronizată din ANAF",
    })
  }

  // Fișe de post create
  for (const j of args.recentJobs) {
    events.push({
      at: j.createdAt,
      icon: "📋",
      text: `Fișă de post „${j.title}" creată`,
      href: "/jobs",
    })
  }

  // Sesiuni evaluare
  for (const s of args.recentSessions) {
    events.push({
      at: s.createdAt,
      icon: "⚖️",
      text: `Sesiune evaluare „${s.name}" — ${s.status === "COMPLETED" ? "finalizată" : "creată"}`,
      href: "/sessions",
    })
  }

  // Import-uri stat salarii (groupBy importBatchId, count entries)
  const batches = new Map<string, { at: Date; count: number }>()
  for (const e of args.recentPayrollEntries) {
    const prev = batches.get(e.importBatchId)
    if (!prev || e.createdAt > prev.at) {
      batches.set(e.importBatchId, {
        at: prev?.at ?? e.createdAt,
        count: (prev?.count ?? 0) + 1,
      })
    } else {
      prev.count += 1
    }
  }
  for (const [, batch] of batches) {
    events.push({
      at: batch.at,
      icon: "💰",
      text: `Stat salarii actualizat (${batch.count} intrări)`,
      href: "/pay-gap/employees",
    })
  }

  // Rapoarte generate
  for (const r of args.reports.slice(0, 5)) {
    events.push({
      at: r.createdAt,
      icon: "📊",
      text: `Raport „${r.type}" generat`,
      href: `/reports?type=${r.type}`,
    })
  }

  // Sortare DESC, take 10
  events.sort((a, b) => b.at.getTime() - a.at.getTime())
  return events.slice(0, 10)
}

function formatRelativeTime(date: Date): string {
  const now = Date.now()
  const diff = now - new Date(date).getTime()
  const min = Math.floor(diff / 60_000)
  const hr = Math.floor(diff / 3_600_000)
  const day = Math.floor(diff / 86_400_000)
  if (min < 1) return "acum"
  if (min < 60) return `acum ${min} min`
  if (hr < 24) return `acum ${hr}h`
  if (day < 7) return `acum ${day}z`
  return new Date(date).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit", year: "2-digit" })
}

/* ── Calcul „Următorul pas recomandat" ──────────────────────────────────────
   Pentru fiecare input necompletat, simulăm activarea și numărăm câte servicii
   noi devin disponibile. Sugerăm inputul cu impactul cel mai mare.
*/
function computeNextBestStep(
  inputStatuses: Map<string, InputStatus>,
  providedInputs: Set<string>
): { input: InputDef; unlocked: Service[] } | null {
  let bestInput: InputDef | null = null
  let bestUnlocked: Service[] = []

  for (const input of INPUT_LIBRARY) {
    const status = inputStatuses.get(input.id)
    if (status === "COMPLETE") continue

    // Simulez că acest input ar deveni provided
    const simulated = new Set(providedInputs)
    simulated.add(input.id)

    // Număr serviciile care nu erau disponibile dar devin disponibile
    const newlyAvailable: Service[] = []
    for (const cat of SERVICE_CATEGORIES) {
      for (const svc of cat.services) {
        const wasAvail = svc.requiredInputs.every(r => providedInputs.has(r))
        const willBeAvail = svc.requiredInputs.every(r => simulated.has(r))
        if (!wasAvail && willBeAvail) newlyAvailable.push(svc)
      }
    }

    if (newlyAvailable.length > bestUnlocked.length) {
      bestUnlocked = newlyAvailable
      bestInput = input
    }
  }

  if (!bestInput || bestUnlocked.length === 0) return null
  return { input: bestInput, unlocked: bestUnlocked }
}

function NextBestStepCard({
  step,
}: {
  step: ReturnType<typeof computeNextBestStep>
}) {
  if (!step) {
    return (
      <section className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🎉</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-900 mb-1">
              Toate datele esențiale sunt completate
            </p>
            <p className="text-xs text-emerald-700">
              Aveți acces la majoritatea serviciilor. Rulați rapoarte sau
              adăugați date opționale pentru a debloca KPI-urile soft.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50/60 p-5">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⭐</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 mb-1">
            Următorul pas recomandat{" "}
            <span className="font-normal normal-case tracking-normal text-amber-600/80">
              (deblochează cele mai multe servicii simultan)
            </span>
          </p>
          <p className="text-sm text-slate-800 mb-3 leading-relaxed">
            Adăugați{" "}
            <strong className="text-amber-900">
              {step.input.label.replace(/\s*\([^)]*\)\s*$/, "")}
            </strong>{" "}
            și deblocați instant <strong>{step.unlocked.length}</strong>{" "}
            {step.unlocked.length === 1 ? "serviciu nou" : "servicii noi"}:
          </p>
          <ul className="text-xs text-slate-700 mb-4 space-y-0.5">
            {step.unlocked.slice(0, 5).map((svc) => (
              <li key={svc.id} className="flex items-start gap-1.5">
                <span className="text-amber-500 mt-0.5">→</span>
                <span>{svc.label.replace(/\s*\([^)]*\)\s*$/, "")}</span>
              </li>
            ))}
            {step.unlocked.length > 5 && (
              <li className="text-[10px] text-slate-500 italic ml-4">
                ... și încă {step.unlocked.length - 5}
              </li>
            )}
          </ul>
          {step.input.href && !step.input.comingSoon && (
            <Link
              href={step.input.href}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-md text-xs font-medium hover:bg-amber-700 transition-colors"
            >
              Adaugă acum →
            </Link>
          )}
          {step.input.comingSoon && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-md text-xs font-medium">
              În curând disponibil
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

/* ── Vedere de ansamblu: organigramă (Departament → Locație) + decalaj pe
   categorii de muncitori (poziție × normă) — conform Art. 9 Directiva
   2023/970 (NU indicator global, care nu măsoară un fenomen abordabil).
*/
function OrgOverviewSection({
  org,
  payGapByCategory,
}: {
  org: OrgStructure | null
  payGapByCategory: PayGapByCategory[]
}) {
  if (!org && payGapByCategory.length === 0) return null

  const fmt = (n: number) => new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(n)
  const colors = ["bg-indigo-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-sky-500", "bg-fuchsia-500", "bg-coral", "bg-slate-400"]

  // Top decalaje: cele >5% diferență
  const topGaps = payGapByCategory.filter(c => Math.abs(c.diffPercent) >= 5).slice(0, 5)
  const equalCategories = payGapByCategory.length - payGapByCategory.filter(c => Math.abs(c.diffPercent) >= 5).length

  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary/70 mb-4">
        Vedere de ansamblu
      </h2>
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Organigramă — Departament → Locație */}
        {org && (() => {
          // Detect dacă „departamentele" sunt de fapt locații (pattern repetitiv:
          // ex: „Magazin X", „Magazin Y" — același prefix). Atunci propunem grupare.
          const allLocations = new Set<string>(org.departments.flatMap(d => d.locations.map(l => l.city)))
          const looksLikeLocations = (() => {
            if (org.departments.length < 3) return false
            const firstWords = org.departments.map(d => d.name.split(/[\s—-]/)[0].toLowerCase())
            const counts = new Map<string, number>()
            for (const w of firstWords) counts.set(w, (counts.get(w) ?? 0) + 1)
            const maxRepeat = Math.max(...Array.from(counts.values()))
            return maxRepeat >= org.departments.length * 0.5
          })()
          const headerLabel = `${fmt(allLocations.size)} ${allLocations.size === 1 ? "locație" : "locații"} · ${fmt(org.totalEmployees)} angajați`

          return (
          <div className="bg-surface rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-slate-900">Inventarul posturilor de lucru</p>
              <span className="text-[10px] text-slate-400">{headerLabel}</span>
            </div>
            <div className="rounded-lg bg-amber-50/50 border border-amber-100 px-3 py-2 mb-4 space-y-1.5">
              <p className="text-[10px] text-amber-800 leading-snug">
                Imagine aproximativă construită pe baza datelor furnizate,
                potrivit statului de funcții.
              </p>
              <p className="text-[10px] text-amber-800 leading-snug">
                Nu este o organigramă reală deoarece lipsesc relațiile de
                subordonare, rolurile de coordonare, nivelul ierarhic de
                vârf.
              </p>
              <p className="text-[10px] text-indigo-700 leading-snug pt-1 border-t border-amber-200">
                💡 Organigrama reală este utilizată ca input pentru o parte
                din serviciile oferite organizației, în ansamblu.
              </p>
              {looksLikeLocations && (
                <p className="text-[10px] text-coral-dark leading-snug pt-1 border-t border-amber-200">
                  ⚠ Pare că aceste înregistrări sunt locații (același prefix
                  repetat) — recomandat să le grupați sub un departament real
                  în statul de funcții.
                </p>
              )}
            </div>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
              {org.departments.map((d, i) => {
                const color = colors[i % colors.length]
                return (
                  <div key={d.name} className="border border-slate-100 rounded-lg p-3 bg-white/60">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-sm flex-shrink-0 ${color}`} />
                        <span className="text-sm font-medium text-slate-800 truncate">{d.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 flex-shrink-0">
                        {fmt(d.count)} angajați
                      </span>
                    </div>
                    {/* Locațiile sub departament */}
                    <div className="ml-4 space-y-0.5">
                      {d.locations.map((loc) => (
                        <div key={loc.city} className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-600">📍 {loc.city}</span>
                          <span className="text-slate-400">{loc.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Nota explicativă departamente vs locații */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-[10px] text-slate-500 leading-snug italic">
                Departamentele sunt entități funcționale ale organizației
                (Vânzări, Producție etc.); locațiile sunt puncte de lucru
                fizice care aparțin entităților funcționale ale companiei.
              </p>
            </div>
          </div>
          )
        })()}

        {/* Decalaj salarial pe categorii de muncitori */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-900">
              Decalajul salarial pe categorii
            </p>
            <span className="text-[10px] text-slate-400">
              poziție × normă · Art. 9 Directiva 2023/970
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mb-4 italic leading-snug">
            Comparația ♂/♀ se face per categorie de muncitori (aceeași poziție +
            aceeași normă), nu global — singura abordare conformă legal și utilă
            metodologic.
          </p>

          {payGapByCategory.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-slate-400 mb-2">
                Nicio categorie cu reprezentare ♂ și ♀ pe aceeași poziție × normă
              </p>
              <p className="text-[10px] text-slate-400 italic">
                Adăugați date demografice (gen) pentru toți angajații
              </p>
            </div>
          ) : (
            <>
              {topGaps.length === 0 ? (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 mb-3">
                  <p className="text-sm text-emerald-900 font-semibold mb-1">
                    ✓ Toate cele {payGapByCategory.length} categorii sunt sub pragul de 5%
                  </p>
                  <p className="text-xs text-emerald-700">
                    Niciun caz semnificativ de inechitate salarială pe gen.
                  </p>
                </div>
              ) : (
                <>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 font-medium mb-2">
                    Top {topGaps.length} categorii cu decalaj ≥ 5%
                  </div>
                  <div className="space-y-2 mb-3">
                    {topGaps.map((c, i) => {
                      const absGap = Math.abs(c.diffPercent)
                      const tone =
                        absGap >= 15 ? "danger" :
                        absGap >= 10 ? "warn" : "moderate"
                      const bg = tone === "danger" ? "bg-coral/10 border-coral/30" :
                                 tone === "warn" ? "bg-amber-50 border-amber-200" :
                                 "bg-slate-50 border-slate-200"
                      const text = tone === "danger" ? "text-coral-dark" :
                                   tone === "warn" ? "text-amber-700" : "text-slate-700"
                      // Direcție explicită — fără „+/-" care ar putea fi interpretat ca avantaj/dezavantaj
                      const direction = c.diffPercent > 0 ? "♂ > ♀" : "♀ > ♂"
                      return (
                        <div key={i} className={`rounded-lg border p-3 ${bg}`}>
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">
                                {c.jobTitle}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {c.workSchedule} · ♂ {c.countMale} · ♀ {c.countFemale}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className={`text-lg font-bold leading-none ${text}`}>
                                {absGap}%
                              </p>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                {direction} · {fmt(Math.abs(c.diffAbs))} RON
                              </p>
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-600 grid grid-cols-2 gap-2 mt-2">
                            <span>♂ {fmt(c.avgMale)} RON</span>
                            <span>♀ {fmt(c.avgFemale)} RON</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Bloc decizie informată — acționabilitate, conform Art. 9 UE 2023/970 */}
                  <div className="rounded-lg bg-indigo-50/60 border border-indigo-200 p-3 mb-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 mb-1.5">
                      🔍 Decizie informată
                    </p>
                    <p className="text-[11px] text-slate-700 leading-snug mb-2">
                      Conform Directivei UE 2023/970, <strong>toate decalajele
                      ≥ 5%</strong> trebuie analizate și explicate. Pot fi
                      justificabile (rămân) sau nu (trebuie eliminate prin
                      măsuri de corecție).
                    </p>
                    <p className="text-[10px] text-slate-600 mb-1.5 font-medium">
                      Posibile cauze de analizat pe fiecare categorie:
                    </p>
                    <ul className="text-[10px] text-slate-600 space-y-0.5 list-disc pl-4 mb-2">
                      <li>vechime medie diferită pe gen pentru aceeași poziție</li>
                      <li>calificări/certificări extra deținute</li>
                      <li>rezultate evaluare performanță anterioare</li>
                      <li>responsabilități adiționale neformalizate</li>
                      <li>diferențe în pachetul total (variabil, beneficii)</li>
                    </ul>
                    <p className="text-[10px] text-slate-700 leading-snug mb-2">
                      <strong>Dacă diferența e justificabilă</strong> →
                      documentare formală a cauzei pentru audit ITM / ANSPDCP.
                    </p>
                    <p className="text-[10px] text-slate-700 leading-snug mb-2">
                      <strong>Dacă NU e justificabilă</strong> → plan de
                      corecție cu mediere obligatorie a reprezentantului
                      salariaților.
                    </p>
                    <p className="text-[10px] text-indigo-700 leading-snug pt-1.5 border-t border-indigo-200">
                      JobGrade oferă: analiza cauzelor pe fiecare categorie,
                      măsuri de corecție personalizate, gestionarea procesului
                      de mediere cu reprezentantul salariaților, documente
                      pentru audit.
                    </p>
                  </div>
                  {payGapByCategory.filter(c => Math.abs(c.diffPercent) >= 5).length > 5 && (
                    <p className="text-[10px] text-slate-400 italic text-center mb-2">
                      + încă {payGapByCategory.filter(c => Math.abs(c.diffPercent) >= 5).length - 5} categorii cu decalaj
                    </p>
                  )}
                </>
              )}
              <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-100 mb-3">
                <strong>{equalCategories}</strong> din {payGapByCategory.length} categorii sub pragul de 5%
              </div>
              <Link href="/pay-gap" className="inline-block text-xs text-indigo-600 hover:underline">
                Raport complet pe categorii →
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

/* ── Snapshot organizație: KPI-uri „vii" pentru HR (administrator de cont) ──
   Combinație de KPI-uri HARD (din date directe) și SOFT (din rapoarte rulate).
   KPI-urile SOFT apar ca „—" cu hint la serviciul care le calculează —
   se aprind când rulezi serviciul.
*/
function OrgSnapshotBar({ data }: { data: Awaited<ReturnType<typeof getPortalData>> }) {
  const fmt = (n: number) => new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(n)
  const completePercent = data.jobCount > 0 ? Math.round((data.completeJobCount / data.jobCount) * 100) : 0
  const costPerEmployee = data.payrollCount > 0 && data.monthlyBudget > 0
    ? data.monthlyBudget / data.payrollCount
    : null

  const hasReport = (type: string) => (data.reportsByType.get(type)?.count ?? 0) > 0

  // KPI-uri HARD (calculate direct din date)
  // Categorii cu decalaj = nr. cazuri (poziție × normă) cu diferență >5% pe gen
  const categoriesWithGap = data.payGapByCategory.filter(c => Math.abs(c.diffPercent) >= 5).length
  const totalCategories = data.payGapByCategory.length

  const hardKpis = [
    {
      label: "Categorii cu decalaj",
      sub: totalCategories > 0 ? `din ${totalCategories} categorii (≥5%)` : "poziție × normă pe gen",
      value: totalCategories === 0 ? "—" : String(categoriesWithGap),
      tone: totalCategories === 0 ? "muted" :
            categoriesWithGap === 0 ? "success" :
            categoriesWithGap <= 2 ? "warn" : "danger",
      hint: totalCategories === 0 ? "Adăugați date angajați (gen + salariu)" : null,
    },
    {
      label: "Cost mediu / angajat",
      sub: "salariu total / lună",
      value: costPerEmployee ? `${fmt(costPerEmployee)} RON` : "—",
      tone: costPerEmployee ? "primary" : "muted",
      hint: costPerEmployee ? null : "Importă statul de salarii",
    },
    {
      label: "Acoperire fișe de post",
      sub: "complete vs total",
      value: data.jobCount > 0 ? `${completePercent}%` : "—",
      tone: completePercent === 100 ? "success" : completePercent > 0 ? "warn" : "muted",
      hint: completePercent === 100 ? null : "Completează atribuțiile",
    },
  ]

  // KPI-uri SOFT (din rapoarte agregate — apar când serviciile sunt rulate)
  const softKpis = [
    {
      label: "Indicele de performanță",
      sub: "din evaluări de performanță",
      value: hasReport("PERFORMANCE_EVAL") ? "calculat" : "—",
      tone: hasReport("PERFORMANCE_EVAL") ? "primary" : "muted",
      hint: hasReport("PERFORMANCE_EVAL") ? null : `Rulează „Evaluarea performanței"`,
    },
    {
      label: "Indicele cultural",
      sub: "din chestionar climat",
      value: hasReport("CULTURE") ? "calculat" : "—",
      tone: hasReport("CULTURE") ? "primary" : "muted",
      hint: hasReport("CULTURE") ? null : `Rulează „Cultură organizațională"`,
    },
    {
      label: "Maturitatea proceselor",
      sub: "calitate operațională",
      value: hasReport("QUALITY") ? "calculat" : "—",
      tone: hasReport("QUALITY") ? "primary" : "muted",
      hint: hasReport("QUALITY") ? null : `Rulează „Procese & Calitate"`,
    },
    {
      label: "Indice multigenerațional",
      sub: "echilibru pe generații",
      value: hasReport("MULTIGEN") ? "calculat" : "—",
      tone: hasReport("MULTIGEN") ? "primary" : "muted",
      hint: hasReport("MULTIGEN") ? null : `Rulează „Echipe multigeneraționale"`,
    },
    {
      label: "Conformitate UE 2023/970",
      sub: "raport decalaj salarial recent",
      value: data.payGapLastAt && (Date.now() - new Date(data.payGapLastAt).getTime()) < 365 * 86_400_000 ? "✓" : "⚠",
      tone: data.payGapLastAt && (Date.now() - new Date(data.payGapLastAt).getTime()) < 365 * 86_400_000 ? "success" : "warn",
      hint: data.payGapLastAt ? null : "Generează raportul de decalaj salarial",
    },
  ]

  const allKpis = [...hardKpis, ...softKpis]
  const toneClasses: Record<string, string> = {
    primary: "text-indigo-700",
    success: "text-emerald-600",
    warn: "text-amber-600",
    danger: "text-coral",
    muted: "text-slate-400",
  }

  return (
    <section className="rounded-xl border border-border bg-gradient-to-r from-indigo-50/50 to-emerald-50/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary/70">
          Snapshot organizație
        </p>
        <p className="text-[10px] text-slate-400 italic">
          Indicatori vii — se actualizează la fiecare input nou și la fiecare raport rulat
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {allKpis.map((k) => (
          <div key={k.label} className="bg-white/70 rounded-lg px-3 py-2 border border-white/80" title={k.hint ?? undefined}>
            <p className="text-[9px] uppercase tracking-wider text-slate-500 font-medium leading-tight">
              {k.label}
            </p>
            <p className={`text-lg font-semibold mt-1 leading-tight ${toneClasses[k.tone]}`}>
              {k.value}
            </p>
            <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">
              {k.hint ?? k.sub}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── Page ─────────────────────────────────────────────────────────── */

export default async function PortalPage() {
  const session = await auth()
  const data = await getPortalData(session!.user.tenantId)
  const firstName = session!.user.name?.split(" ")[0] ?? ""
  const nextStep = computeNextBestStep(data.inputStatuses, data.providedInputs)

  return (
    <div className="min-h-[calc(100vh-4rem)] space-y-10">

      {/* ══════════ SNAPSHOT ORGANIZAȚIE (HR view) ══════════ */}
      <OrgSnapshotBar data={data} />

      {/* ══════════ VEDERE DE ANSAMBLU — surprize plăcute la upload ══════════ */}
      <OrgOverviewSection
        org={data.orgStructure}
        payGapByCategory={data.payGapByCategory}
      />

      {/* ══════════ GREETING ══════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {firstName ? `Bine ai venit, ${firstName}.` : "Bine ai venit."}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {data.companyName}{" "}
            <Link
              href="/company"
              className="text-xs text-indigo hover:text-indigo-dark hover:underline ml-2"
            >
              Editează profil →
            </Link>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold ${
            data.credits < 20 ? "bg-coral/10 text-coral" : "bg-indigo/10 text-indigo"
          }`}>
            {data.credits} credite disponibile
          </span>
          <Link href="/settings/billing" className="text-xs text-indigo hover:underline">
            Reîncarcă
          </Link>
        </div>
      </div>

      {/* ══════════ URMĂTORUL PAS RECOMANDAT ══════════ */}
      <NextBestStepCard step={nextStep} />

      {/* ══════════ DATELE TALE — 2 coloane ══════════ */}
      <section>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Stânga — Inputuri client */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary/70 mb-4">
              Inputuri client
            </h2>
            <div className="bg-surface rounded-xl border border-border p-5 space-y-5">
              {/* Identitate firmă (NEW — wizard ANAF inline) */}
              <CompanyIdentityCard
                initial={{
                  name: data.profile?.cui ? data.companyName : null,
                  cui: data.profile?.cui ?? null,
                  industry: data.profile?.industry ?? null,
                  caenName: data.profile?.caenName ?? null,
                  isVATPayer: data.profile?.isVATPayer ?? null,
                  address: data.profile?.address ?? null,
                  county: data.profile?.county ?? null,
                  anafSyncedAt: data.profile?.anafSyncedAt
                    ? data.profile.anafSyncedAt.toISOString()
                    : null,
                }}
              />

              {/* Fișe de post */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-900">Fișe de post</p>
                  <span className="text-xs text-slate-400">{data.jobCount} fișe încărcate</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${data.jobsPercent === 100 ? "bg-emerald-500" : data.jobsPercent > 0 ? "bg-amber-400" : "bg-slate-200"}`}
                    style={{ width: `${data.jobsPercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mb-2">
                  {data.jobsPercent === 100 ? "Complete — gata de procesare" : data.jobsPercent > 0 ? "Încărcate — necesită completare atribuții" : "Nicio fișă încărcată"}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/jobs/new" className="text-[11px] px-2.5 py-1 bg-white border border-slate-200 rounded-md hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 transition-colors">
                    + Manual
                  </Link>
                  <Link href="/jobs/import" className="text-[11px] px-2.5 py-1 bg-white border border-slate-200 rounded-md hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 transition-colors">
                    📊 Import Excel
                  </Link>
                  <Link href="/jobs/new?mode=ai" className="text-[11px] px-2.5 py-1 bg-purple-50 border border-purple-200 rounded-md hover:bg-purple-100 text-purple-700 transition-colors">
                    ✨ AI
                  </Link>
                </div>
              </div>

              {/* Stat de salarii */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-900">Stat de salarii</p>
                  <span className="text-xs text-slate-400">{data.payrollCount} intrări importate</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${data.payrollPercent === 100 ? "bg-emerald-500" : "bg-slate-200"}`}
                    style={{ width: `${data.payrollPercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mb-2">
                  {data.payrollPercent === 100 ? "Importat — gata de procesare" : "Niciun stat importat"}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Link href="/pay-gap/employees" className="text-[11px] px-2.5 py-1 bg-white border border-slate-200 rounded-md hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 transition-colors">
                    + Manual
                  </Link>
                  <Link href="/pay-gap/employees#import" className="text-[11px] px-2.5 py-1 bg-white border border-slate-200 rounded-md hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 transition-colors">
                    📊 Import Excel
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Dreapta — Indice de relevanță + lista completă inputuri */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary/70 mb-4">
              Indice de relevanță
            </h2>
            <div className="bg-surface rounded-xl border border-border p-5">
              {/* Indice mare cu progress bar */}
              <div className="flex items-end gap-3 mb-1">
                <span className={`text-4xl font-bold ${
                  data.relevanceIndex >= 70 ? "text-emerald-600" :
                  data.relevanceIndex >= 40 ? "text-amber-500" :
                  "text-slate-400"
                }`}>
                  {data.relevanceIndex}%
                </span>
                <span className="text-xs text-slate-500 mb-1.5">date relevante</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-1">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    data.relevanceIndex >= 70 ? "bg-emerald-500" :
                    data.relevanceIndex >= 40 ? "bg-amber-400" :
                    "bg-slate-300"
                  }`}
                  style={{ width: `${data.relevanceIndex}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mb-1 leading-snug">
                Arată măsura în care puteți utiliza serviciile JobGrade
                și genera documentele necesare.
              </p>
              <p className="text-[10px] text-slate-400 mb-5">
                Cu cât oferiți mai multe date relevante, cu atât
                disponibilitatea serviciilor oferite va fi mai mare.
              </p>

              {/* Lista compactă A-D */}
              <div className="space-y-3">
                {(["A", "B", "C", "D"] as InputGroup[]).map((g) => {
                  const items = INPUT_LIBRARY.filter(i => i.group === g)
                  return (
                    <div key={g}>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                        {GROUP_LABELS[g]}
                      </p>
                      <div className="space-y-1">
                        {items.map((input) => {
                          const status = data.inputStatuses.get(input.id) ?? "EMPTY"
                          const dotColor =
                            status === "COMPLETE" ? "bg-emerald-500" :
                            status === "PARTIAL" ? "bg-amber-400" :
                            "bg-slate-300"
                          const textColor =
                            status === "COMPLETE" ? "text-slate-700" :
                            status === "PARTIAL" ? "text-slate-600" :
                            "text-slate-400"
                          const labelClickable = !input.comingSoon && status !== "COMPLETE"

                          return (
                            <div key={input.id}>
                              <div className="flex items-start justify-between gap-2 group">
                                <div className="flex items-start gap-2 min-w-0">
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${dotColor}`} />
                                  {labelClickable ? (
                                    <Link href={input.href ?? "#"} className={`text-xs ${textColor} hover:text-indigo-600 hover:underline leading-snug`}>
                                      {input.label}
                                    </Link>
                                  ) : (
                                    <span className={`text-xs ${textColor} leading-snug`}>{input.label}</span>
                                  )}
                                </div>
                                <span className="text-[9px] text-slate-400 flex-shrink-0 mt-1">
                                  {input.comingSoon ? "în curând" :
                                   status === "COMPLETE" ? "✓" :
                                   status === "PARTIAL" ? "parțial" :
                                   ""}
                                </span>
                              </div>
                              {input.subItems && input.subItems.length > 0 && (
                                <ul className="ml-6 mt-0.5 mb-1 space-y-0.5">
                                  {input.subItems.map((sub, si) => (
                                    <li key={si} className="text-[10px] text-slate-400 leading-snug flex items-start gap-1.5">
                                      <span className="text-slate-300">•</span>
                                      <span>{sub}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ CE POȚI ACCESA ══════════ */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary/70 mb-4">
          Ce poți accesa
        </h2>
        <div className="space-y-6">
          {SERVICE_CATEGORIES.map((cat) => {
            const colorMap: Record<string, string> = {
              emerald: "border-l-emerald-500",
              indigo: "border-l-indigo-500",
              sky: "border-l-sky-500",
              violet: "border-l-violet-500",
              fuchsia: "border-l-fuchsia-500",
              slate: "border-l-slate-300",
            }
            const textColorMap: Record<string, string> = {
              emerald: "text-emerald-600",
              indigo: "text-indigo-600",
              sky: "text-sky-600",
              violet: "text-violet-600",
              fuchsia: "text-fuchsia-600",
              slate: "text-slate-500",
            }
            const bgMap: Record<string, string> = {
              emerald: "bg-emerald-50/50",
              indigo: "bg-indigo-50/50",
              sky: "bg-sky-50/50",
              violet: "bg-violet-50/50",
              fuchsia: "bg-fuchsia-50/50",
              slate: "bg-slate-50/50",
            }
            return (
              <div
                key={cat.name}
                className={`rounded-xl border border-border ${bgMap[cat.color]} border-l-4 ${colorMap[cat.color]} p-5`}
              >
                <h3 className={`text-xs font-bold uppercase tracking-widest ${textColorMap[cat.color]} mb-3`}>
                  {cat.name}
                </h3>
                <div className="space-y-2">
                  {cat.services.map((svc, idx) => {
                    const missingInputs = svc.requiredInputs.filter(r => !data.providedInputs.has(r))
                    const hasData = missingInputs.length === 0
                    const missingLabels = missingInputs.map(id => INPUT_LABELS[id] || id)

                    // Determinăm statusul. Servicii „gratuit" (Profil sectorial) nu necesită credite.
                    const requiresCredits = svc.creditCost && svc.creditCost !== "gratuit"
                    const hasNoCredits = hasData && requiresCredits && data.credits <= 0
                    const blocked = hasNoCredits
                    const available = hasData && !blocked

                    // Inserăm un separator chiar înainte de primul serviciu opțional
                    const showOptionalSeparator =
                      svc.optional && (idx === 0 || !cat.services[idx - 1].optional)

                    return (
                      <div key={svc.id}>
                        {showOptionalSeparator && (
                          <div className="flex items-center gap-2 pt-2 mt-2 border-t border-dashed border-slate-200">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                              Opțional · transparență suplimentară (nu este cerut de lege)
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Bullet status: verde (available), 🔒 portocaliu (blocked), gri (missing-data) */}
                            {available ? (
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${svc.optional ? "bg-emerald-300" : "bg-emerald-500"}`} />
                            ) : blocked ? (
                              <span className="text-[11px] flex-shrink-0 leading-none">🔒</span>
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-slate-300" />
                            )}
                            {available ? (
                              <Link href={svc.href} className={`text-sm hover:underline ${textColorMap[svc.color]} ${svc.optional ? "" : "font-medium"}`}>
                                {svc.label}
                              </Link>
                            ) : blocked ? (
                              <span className="text-sm text-amber-700">{svc.label}</span>
                            ) : (
                              <span className="text-sm text-slate-400">{svc.label}</span>
                            )}
                          </div>
                          {/* Status info dreapta */}
                          {!hasData && (
                            <span className="text-[10px] text-slate-400 flex-shrink-0">
                              lipsă: {missingLabels.join(", ")}
                            </span>
                          )}
                          {blocked && (
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="text-[10px] text-amber-600">
                                Sold credite insuficient ({data.credits})
                              </span>
                              <Link href="/settings/billing" className="text-[10px] text-amber-700 font-medium hover:underline">
                                Reîncarcă →
                              </Link>
                            </div>
                          )}
                          {available && (
                            <div className="flex items-center gap-3 flex-shrink-0">
                              {svc.creditCost && (
                                <span className="text-[10px] text-slate-400">{svc.creditCost}</span>
                              )}
                              <Link href={svc.href} className="text-[10px] text-indigo-500 hover:underline">
                                Accesează →
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ══════════ JURNAL RAPOARTE GENERATE ══════════ */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary/70 mb-4">
          Jurnal rapoarte generate
        </h2>
        <div className="rounded-xl border border-border bg-slate-50/50 border-l-4 border-l-slate-300 p-5">
          <div className="space-y-5">
            {Array.from(new Set(REPORT_LIBRARY.map(r => r.group))).map((group) => {
              const reportsInGroup = REPORT_LIBRARY.filter(r => r.group === group)
              return (
                <div key={group}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    {group}
                  </p>
                  <div className="space-y-1.5">
                    {reportsInGroup.map((r) => {
                      const stats = data.reportsByType.get(r.type)
                      const generated = !!stats && stats.count > 0
                      const lastAt = stats?.lastAt
                        ? new Date(stats.lastAt).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit" })
                        : null

                      return (
                        <div key={r.id} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              generated ? "bg-emerald-500" : "bg-slate-300"
                            }`} />
                            {generated ? (
                              <Link
                                href={`/reports?type=${r.type}`}
                                className="text-sm text-slate-700 hover:underline font-medium"
                              >
                                {r.label}
                              </Link>
                            ) : (
                              <span className="text-sm text-slate-400">{r.label}</span>
                            )}
                          </div>
                          {generated ? (
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <span className="text-[10px] text-slate-500">
                                {stats!.count}× generate · ultima {lastAt}
                              </span>
                              <Link
                                href={`/reports?type=${r.type}`}
                                className="text-[10px] text-indigo-500 hover:underline"
                              >
                                Vezi jurnal →
                              </Link>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 flex-shrink-0 italic">
                              încă negenerat
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-5 pt-3 border-t border-slate-200 text-right">
            <Link href="/reports" className="text-xs text-indigo-500 hover:underline">
              Toate rapoartele →
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════ ACTIVITATE RECENTĂ ══════════ */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary/70 mb-4">
          Activitate recentă
        </h2>
        <div className="bg-surface rounded-xl border border-border p-5">
          {data.recentEvents.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">
              Nicio activitate înregistrată încă.
            </p>
          ) : (
            <ol className="space-y-2">
              {data.recentEvents.map((ev, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-base flex-shrink-0 mt-0.5">{ev.icon}</span>
                  <div className="flex-1 min-w-0 flex items-baseline justify-between gap-3">
                    {ev.href ? (
                      <Link href={ev.href} className="text-sm text-slate-700 hover:text-indigo-600 hover:underline truncate">
                        {ev.text}
                      </Link>
                    ) : (
                      <span className="text-sm text-slate-700 truncate">{ev.text}</span>
                    )}
                    <span className="text-[10px] text-slate-400 flex-shrink-0">
                      {formatRelativeTime(ev.at)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  )
}
