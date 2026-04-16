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
  // C. Sisteme operaționale (4 × pondere 2)
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
  const [credits, tenant, profile, jobCount, payrollCount, completeJobCount, reports, payrollAggregate, payGapReport, activeSessionsCount, employeeRecords, oldJobsCount] = await Promise.all([
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
  }
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
  const hardKpis = [
    {
      label: "Echitate salarială",
      sub: "pay gap pe gen",
      value: data.payGapPercent !== null ? `${data.payGapPercent}%` : "—",
      tone: data.payGapPercent === null ? "muted" :
            Math.abs(data.payGapPercent) < 5 ? "success" :
            Math.abs(data.payGapPercent) < 15 ? "warn" : "danger",
      hint: data.payGapPercent === null ? "Adaugă date angajați (gen + salariu)" : null,
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
      sub: "raport pay gap recent",
      value: data.payGapLastAt && (Date.now() - new Date(data.payGapLastAt).getTime()) < 365 * 86_400_000 ? "✓" : "⚠",
      tone: data.payGapLastAt && (Date.now() - new Date(data.payGapLastAt).getTime()) < 365 * 86_400_000 ? "success" : "warn",
      hint: data.payGapLastAt ? null : "Generează raportul de pay gap",
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

  return (
    <div className="min-h-[calc(100vh-4rem)] space-y-10">

      {/* ══════════ SNAPSHOT ORGANIZAȚIE (HR view) ══════════ */}
      <OrgSnapshotBar data={data} />

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
                    const available = missingInputs.length === 0
                    const missingLabels = missingInputs.map(id => INPUT_LABELS[id] || id)

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
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              available ? (svc.optional ? "bg-emerald-300" : "bg-emerald-500") : "bg-slate-300"
                            }`} />
                            {available ? (
                              <Link href={svc.href} className={`text-sm hover:underline ${textColorMap[svc.color]} ${svc.optional ? "" : "font-medium"}`}>
                                {svc.label}
                              </Link>
                            ) : (
                              <span className="text-sm text-slate-400">{svc.label}</span>
                            )}
                          </div>
                          {!available && (
                            <span className="text-[10px] text-slate-400 flex-shrink-0">
                              lipsă: {missingLabels.join(", ")}
                            </span>
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
    </div>
  )
}
