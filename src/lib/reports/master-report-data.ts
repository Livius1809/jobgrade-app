/**
 * master-report-data.ts — Sursă unificată de date pentru Raportul Master
 *
 * Un singur artefact care servește:
 * - Demo (date fictive AgroVision SRL)
 * - Raport real (date client din DB)
 *
 * Structura concentrică:
 * BAZA → LAYER 1 (Conformitate) → LAYER 2 (Competitivitate) → LAYER 3 (Dezvoltare)
 */

import { prisma } from "@/lib/prisma"
import { buildPitariuGrades, autoDetectClassCount } from "@/lib/evaluation/pitariu-grades"

// ─── Tipuri ───────────────────────────────────────────────────────────────

export interface MasterCompany {
  name: string
  cui: string
  industry: string
  employees: number
  positions: number
  departments: string[]
  mission?: string
  vision?: string
  values?: string[]
}

export interface MasterJobEvaluation {
  position: string
  department: string
  score: number
  grade: string
  salary: string
  /** Litere pe cele 6 scale JobGrade (secret: corespondența punctaj→literă) */
  letters?: {
    Knowledge: string
    Communications: string
    ProblemSolving: string
    DecisionMaking: string
    BusinessImpact: string
    WorkingConditions: string
  }
}

export interface MasterJobDescription {
  title: string
  department: string
  grade: string
  reportsTo: string
  purpose: string
  responsibilities: string[]
  criteria: Record<string, { level: string; score: number }>
}

export interface MasterSalaryGrade {
  grade: string
  min: string
  mid: string
  max: string
  positions: string
  steps: Array<{ step: number; name: string; salary: string }>
  /** Posturi cu salariu curent, clasă, treaptă aliniată, flag */
  jobDetails?: Array<{
    position: string
    currentSalary: number
    step?: number
    stepFlag?: "OK" | "BELOW" | "ABOVE" | "BETWEEN"
    adjustedSalary?: number
    adjustedStep?: number
  }>
}

export interface MasterPayGapCategory {
  category: string
  women: string
  men: string
  gap: string
  flag: "OK" | "ATENȚIE" | "SEMNIFICATIV"
  justification: string
}

export interface MasterBenchmark {
  position: string
  internal: string
  marketP25: string
  marketP50: string
  marketP75: string
  index: string
  status: string
}

export interface MasterLayerStatus {
  unlocked: boolean
  reason?: string // "plătit" | "demo" | "neplătit"
}

export interface MasterReportData {
  isDemo: boolean
  company: MasterCompany
  layers: {
    baza: MasterLayerStatus & {
      jobEvaluations: MasterJobEvaluation[]
      jobDescriptions: MasterJobDescription[]
    }
    layer1: MasterLayerStatus & {
      salaryGrades: MasterSalaryGrade[]
      payGapCategories: MasterPayGapCategory[]
      jointAssessment?: string
    }
    layer2: MasterLayerStatus & {
      benchmarks: MasterBenchmark[]
      budgetImpact?: {
        currentMonthly: number
        proposedMonthly: number
        delta: number
      }
    }
    layer3: MasterLayerStatus & {
      // Dezvoltare — conținut generat la cerere
      available: string[]
    }
  }
  generatedAt: string
  /** Metadate validare — populate din DB la producție */
  validation?: {
    validatedAt: string
    validatedBy: string
    validatorRole: string
    evaluationType: string
    evaluationDate: string
    committee?: Array<{ name: string; role: string }>
  }
  /** Company Profiler — coerență organizațională */
  profiler?: {
    maturity: string
    maturityScore: number
    coherenceScore: number
    coherenceSummary: string
    deviations: Array<{ pair: string; gap: string; suggestion: string }>
    /** Secțiuni narrative injectabile per layer */
    sections: {
      baza: Array<{ title: string; narrative: string; recommendations: string[] }>
      layer1: Array<{ title: string; narrative: string; recommendations: string[] }>
      layer2: Array<{ title: string; narrative: string; recommendations: string[] }>
      layer3: Array<{ title: string; narrative: string; recommendations: string[] }>
    }
  }
}

// ─── Date fictive AgroVision SRL ──────────────────────────────────────────

const DEMO_COMPANY: MasterCompany = {
  name: "AgroVision SRL",
  cui: "RO12345678",
  industry: "Agricultură și producție alimentară",
  employees: 45,
  positions: 12,
  departments: ["Management", "Producție", "Comercial", "Administrativ"],
  mission: "Producem alimente sănătoase și accesibile, respectând natura și comunitățile locale.",
  vision: "Lider regional în agricultură sustenabilă până în 2030.",
  values: ["Sustenabilitate", "Calitate", "Respect", "Inovație"],
}

const DEMO_JE: MasterJobEvaluation[] = [
  { position: "Director General", department: "Management", score: 2710, grade: "—", salary: "28.500 RON",
    letters: { Knowledge: "G", Communications: "E", ProblemSolving: "G", DecisionMaking: "G", BusinessImpact: "D", WorkingConditions: "A" } },
  { position: "Director Producție", department: "Management", score: 2430, grade: "—", salary: "18.200 RON",
    letters: { Knowledge: "F", Communications: "D", ProblemSolving: "F", DecisionMaking: "F", BusinessImpact: "D", WorkingConditions: "B" } },
  { position: "Director Comercial", department: "Comercial", score: 2310, grade: "—", salary: "17.800 RON",
    letters: { Knowledge: "F", Communications: "E", ProblemSolving: "E", DecisionMaking: "E", BusinessImpact: "D", WorkingConditions: "A" } },
  { position: "Inginer Agronom Șef", department: "Producție", score: 2090, grade: "—", salary: "14.500 RON",
    letters: { Knowledge: "F", Communications: "C", ProblemSolving: "E", DecisionMaking: "E", BusinessImpact: "C", WorkingConditions: "C" } },
  { position: "Contabil Șef", department: "Administrativ", score: 1760, grade: "—", salary: "13.200 RON",
    letters: { Knowledge: "E", Communications: "C", ProblemSolving: "D", DecisionMaking: "D", BusinessImpact: "C", WorkingConditions: "A" } },
  { position: "Inginer Agronom", department: "Producție", score: 1545, grade: "—", salary: "9.500 RON",
    letters: { Knowledge: "E", Communications: "B", ProblemSolving: "D", DecisionMaking: "C", BusinessImpact: "B", WorkingConditions: "C" } },
  { position: "Specialist Vânzări", department: "Comercial", score: 1465, grade: "—", salary: "9.800 RON",
    letters: { Knowledge: "D", Communications: "D", ProblemSolving: "C", DecisionMaking: "C", BusinessImpact: "B", WorkingConditions: "A" } },
  { position: "Specialist HR", department: "Administrativ", score: 1380, grade: "—", salary: "8.500 RON",
    letters: { Knowledge: "D", Communications: "C", ProblemSolving: "C", DecisionMaking: "C", BusinessImpact: "B", WorkingConditions: "A" } },
  { position: "Tehnician Laborator", department: "Producție", score: 1305, grade: "—", salary: "7.800 RON",
    letters: { Knowledge: "D", Communications: "B", ProblemSolving: "C", DecisionMaking: "B", BusinessImpact: "B", WorkingConditions: "C" } },
  { position: "Operator Linie", department: "Producție", score: 840, grade: "—", salary: "6.200 RON",
    letters: { Knowledge: "B", Communications: "A", ProblemSolving: "B", DecisionMaking: "B", BusinessImpact: "A", WorkingConditions: "C" } },
  { position: "Șofer Distribuție", department: "Comercial", score: 775, grade: "—", salary: "5.800 RON",
    letters: { Knowledge: "B", Communications: "A", ProblemSolving: "A", DecisionMaking: "A", BusinessImpact: "B", WorkingConditions: "B" } },
  { position: "Muncitor Depozit", department: "Producție", score: 555, grade: "—", salary: "5.200 RON",
    letters: { Knowledge: "A", Communications: "A", ProblemSolving: "A", DecisionMaking: "A", BusinessImpact: "A", WorkingConditions: "B" } },
]

const DEMO_JOB_DESCRIPTIONS: MasterJobDescription[] = [
  {
    title: "Inginer Agronom",
    department: "Producție",
    grade: "Clasă 5",
    reportsTo: "Inginer Agronom Șef",
    purpose: "Asigură monitorizarea și optimizarea proceselor de producție agricolă, contribuind la creșterea randamentului și conformitatea cu standardele de calitate.",
    responsibilities: [
      "Planifică și coordonează activitățile de cultivare conform calendarului agricol",
      "Monitorizează starea culturilor și recomandă tratamente fitosanitare",
      "Analizează parametrii de sol și apă, propune măsuri de îmbunătățire",
      "Întocmește rapoarte tehnice privind producția și randamentele",
      "Colaborează cu echipa de laborator pentru controlul calității",
      "Asigură conformitatea cu normele de protecția mediului",
    ],
    criteria: {
      education: { level: "Licență în agricultură / agronomie", score: 3 },
      communication: { level: "Comunică cu echipa de producție și management", score: 2 },
      problemSolving: { level: "Probleme tehnice cu variabile multiple", score: 3 },
      decisionMaking: { level: "Decizii operaționale cu impact pe recoltă", score: 2 },
      businessImpact: { level: "Impact direct pe productivitate", score: 3 },
      workConditions: { level: "Teren + laborator, expunere la intemperii", score: 3 },
    },
  },
]

function buildDemoSalaryGrades(): MasterSalaryGrade[] {
  const points = DEMO_JE.map(j => ({
    score: j.score,
    salary: parseInt(j.salary.replace(/[^\d]/g, "")),
  }))
  const grades = buildPitariuGrades(points, 9, 4)

  return grades.map(g => ({
    grade: g.name,
    min: g.salaryMin.toLocaleString("ro-RO"),
    mid: g.salaryMid.toLocaleString("ro-RO"),
    max: g.salaryMax.toLocaleString("ro-RO"),
    positions: DEMO_JE
      .filter(j => j.score >= g.scoreMin && j.score <= g.scoreMax)
      .map(j => j.position)
      .join(", ") || "—",
    steps: g.steps.map(s => ({
      step: s.stepNumber,
      name: s.name,
      salary: s.salary.toLocaleString("ro-RO") + " RON",
    })),
  }))
}

const DEMO_PAY_GAP: MasterPayGapCategory[] = [
  { category: "Operator Linie · normă întreagă", women: "6.000 RON", men: "6.200 RON", gap: "3,2%", flag: "OK", justification: "—" },
  { category: "Inginer Agronom · normă întreagă", women: "9.200 RON", men: "9.500 RON", gap: "3,2%", flag: "OK", justification: "—" },
  { category: "Specialist Vânzări · normă întreagă", women: "9.800 RON", men: "9.800 RON", gap: "0,0%", flag: "OK", justification: "—" },
  { category: "Muncitor Depozit · normă întreagă", women: "4.900 RON", men: "5.200 RON", gap: "5,8%", flag: "ATENȚIE", justification: "Decalaj ușor peste pragul de 5%. Se recomandă verificarea criteriilor obiective (vechime, performanță) și documentarea justificării." },
]

const DEMO_BENCHMARK: MasterBenchmark[] = [
  { position: "Director General", internal: "28.500", marketP25: "22.000", marketP50: "30.000", marketP75: "42.000", index: "95%", status: "P25–P50" },
  { position: "Director Producție", internal: "18.200", marketP25: "15.000", marketP50: "19.500", marketP75: "26.000", index: "93%", status: "P25–P50" },
  { position: "Inginer Agronom Șef", internal: "14.500", marketP25: "12.000", marketP50: "15.800", marketP75: "20.000", index: "92%", status: "P25–P50" },
  { position: "Contabil Șef", internal: "13.200", marketP25: "11.000", marketP50: "14.000", marketP75: "18.000", index: "94%", status: "P25–P50" },
  { position: "Specialist Vânzări", internal: "9.800", marketP25: "7.500", marketP50: "9.200", marketP75: "12.000", index: "107%", status: "P50–P75" },
  { position: "Operator Linie", internal: "6.200", marketP25: "5.500", marketP50: "6.800", marketP75: "8.000", index: "91%", status: "P25–P50" },
  { position: "Muncitor Depozit", internal: "5.200", marketP25: "4.800", marketP50: "5.600", marketP75: "6.500", index: "93%", status: "P25–P50" },
]

// ─── Funcția principală ───────────────────────────────────────────────────

export async function getMasterReportData(
  tenantId: string | "demo",
): Promise<MasterReportData> {
  if (tenantId === "demo") {
    return getDemoData()
  }
  return getRealData(tenantId)
}

function getDemoData(): MasterReportData {
  return {
    isDemo: true,
    company: DEMO_COMPANY,
    layers: {
      baza: {
        unlocked: true,
        reason: "demo",
        jobEvaluations: DEMO_JE,
        jobDescriptions: DEMO_JOB_DESCRIPTIONS,
      },
      layer1: {
        unlocked: true,
        reason: "demo",
        salaryGrades: buildDemoSalaryGrades(),
        payGapCategories: DEMO_PAY_GAP,
      },
      layer2: {
        unlocked: true,
        reason: "demo",
        benchmarks: DEMO_BENCHMARK,
        budgetImpact: {
          currentMonthly: 144700,
          proposedMonthly: 152300,
          delta: 7600,
        },
      },
      layer3: {
        unlocked: true,
        reason: "demo",
        available: [
          "Design proces recrutare",
          "Management proces recrutare",
          "Manual angajat nou",
          "Evaluare personal",
          "Diagnostic organizațional",
          "Cultură organizațională",
        ],
      },
    },
    generatedAt: new Date().toISOString(),
  }
}

async function getRealData(tenantId: string): Promise<MasterReportData> {
  const [tenant, profile, jobs, payroll, sessions] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.companyProfile.findUnique({ where: { tenantId } }),
    prisma.job.findMany({
      where: { tenantId, isActive: true },
      include: { department: true },
    }),
    prisma.payrollEntry.findMany({ where: { tenantId } }),
    prisma.evaluationSession.findMany({
      where: { tenantId, status: { in: ["COMPLETED", "VALIDATED"] } },
      include: {
        jobResults: {
          include: {
            job: { include: { department: true } },
            salaryGrade: true,
          },
        },
        salaryGrades: { include: { steps: true } },
        participants: {
          include: { user: { select: { firstName: true, lastName: true, jobTitle: true } } },
        },
        validator: { select: { firstName: true, lastName: true, jobTitle: true } },
      },
      orderBy: { completedAt: "desc" },
      take: 1,
    }),
  ])

  const latestSession = sessions[0]
  const departments = [...new Set(
    jobs.map(j => j.department?.name).filter((n): n is string => !!n)
  )]

  // Determinăm layere deblocate pe baza creditelor/serviciilor plătite
  // TODO: verificare reală din ServiceActivation sau credit consumption
  const hasPayroll = payroll.length > 0
  const hasEvaluation = !!latestSession
  const hasSalaryGrades = (latestSession?.salaryGrades?.length ?? 0) > 0

  // BAZA: evaluare + fișe de post
  const jobEvaluations: MasterJobEvaluation[] = (latestSession?.jobResults ?? [])
    .sort((a, b) => (b.totalScore) - (a.totalScore))
    .map(jr => ({
      position: jr.job?.title ?? "—",
      department: jr.job?.department?.name ?? "—",
      score: jr.totalScore,
      grade: jr.salaryGrade?.name ?? "—",
      salary: "—",
    }))

  const jobDescriptions: MasterJobDescription[] = jobs.slice(0, 3).map(j => ({
    title: j.title,
    department: j.department?.name ?? "—",
    grade: "—",
    reportsTo: "—",
    purpose: j.purpose ?? "—",
    responsibilities: j.responsibilities ? j.responsibilities.split("\n").filter(Boolean) : [],
    criteria: {},
  }))

  // LAYER 1: clase salariale + pay gap
  const salaryGrades: MasterSalaryGrade[] = (latestSession?.salaryGrades ?? [])
    .sort((a, b) => a.order - b.order)
    .map(sg => ({
      grade: sg.name,
      min: (sg.salaryMin ?? 0).toLocaleString("ro-RO"),
      mid: Math.round(((sg.salaryMin ?? 0) + (sg.salaryMax ?? 0)) / 2).toLocaleString("ro-RO"),
      max: (sg.salaryMax ?? 0).toLocaleString("ro-RO"),
      positions: jobEvaluations
        .filter(je => je.score >= sg.scoreMin && je.score <= sg.scoreMax)
        .map(je => je.position)
        .join(", ") || "—",
      steps: (sg.steps ?? []).sort((a, b) => a.step - b.step).map(s => ({
        step: s.step,
        name: s.name,
        salary: Number(s.salary).toLocaleString("ro-RO") + " RON",
      })),
    }))

  // Pay gap real din payroll — grupat pe poziție × normă de lucru
  let payGapCategories: MasterPayGapCategory[] = []
  try {
    payGapCategories = await buildPayGapCategories(tenantId, payroll)
  } catch (e) {
    console.error("[master-report] buildPayGapCategories failed:", (e as Error).message?.slice(0, 100))
  }

  return {
    isDemo: false,
    company: {
      name: tenant?.name ?? "—",
      cui: profile?.cui ?? "—",
      industry: profile?.industry ?? "—",
      employees: payroll.length,
      positions: jobs.length,
      departments,
      mission: profile?.mission ?? undefined,
      vision: profile?.vision ?? undefined,
      values: profile?.values ?? undefined,
    },
    layers: {
      baza: {
        unlocked: hasEvaluation,
        reason: hasEvaluation ? "plătit" : "neplătit",
        jobEvaluations,
        jobDescriptions,
      },
      layer1: {
        unlocked: hasSalaryGrades && hasPayroll,
        reason: hasSalaryGrades ? "plătit" : "neplătit",
        salaryGrades,
        payGapCategories,
      },
      layer2: {
        unlocked: false,
        reason: "neplătit",
        benchmarks: [],
      },
      layer3: {
        unlocked: false,
        reason: "neplătit",
        available: [],
      },
    },
    generatedAt: new Date().toISOString(),
    profiler: await buildProfilerSection(tenantId),
    validation: latestSession?.validatedAt ? {
      validatedAt: latestSession.validatedAt.toISOString(),
      validatedBy: (latestSession as any).validator
        ? `${(latestSession as any).validator.firstName} ${(latestSession as any).validator.lastName}`
        : "—",
      validatorRole: (latestSession as any).validator?.jobTitle ?? "Director General",
      evaluationType: (latestSession as any).evaluationType ?? "AI_GENERATED",
      evaluationDate: (latestSession.completedAt ?? latestSession.startedAt ?? latestSession.createdAt).toISOString(),
      committee: ((latestSession as any).participants ?? []).map((p: any) => ({
        name: `${p.user.firstName} ${p.user.lastName}`,
        role: p.user.jobTitle ?? "Evaluator",
      })),
    } : undefined,
  }
}

/**
 * Company Profiler — secțiuni coerență MVV pentru raportul master.
 * Generează secțiuni narrative per layer + scor global.
 */
async function buildProfilerSection(tenantId: string): Promise<MasterReportData["profiler"]> {
  try {
    const { getCompanyProfile, getReportSections } = await import("@/lib/company-profiler")
    const profile = await getCompanyProfile(tenantId)

    // Generăm secțiuni per serviciu (mapate pe layere)
    const [bazaSections, l1Sections, l2Sections, l3Sections] = await Promise.all([
      getReportSections(tenantId, "JOB_EVALUATION").catch(() => []),
      getReportSections(tenantId, "PAY_GAP_ANALYSIS").catch(() => []),
      getReportSections(tenantId, "SALARY_BENCHMARK").catch(() => []),
      getReportSections(tenantId, "CULTURE_AUDIT").catch(() => []),
    ])

    const mapSection = (s: any) => ({
      title: s.title,
      narrative: s.narrative,
      recommendations: s.recommendations || [],
    })

    return {
      maturity: profile.mvv.maturity,
      maturityScore: profile.maturityState.score,
      coherenceScore: profile.coherence.overallScore,
      coherenceSummary: profile.coherence.summary,
      deviations: profile.coherence.deviations.map(d => ({
        pair: d.pair,
        gap: d.gap || "",
        suggestion: d.suggestion || "",
      })),
      sections: {
        baza: bazaSections.map(mapSection),
        layer1: l1Sections.map(mapSection),
        layer2: l2Sections.map(mapSection),
        layer3: l3Sections.map(mapSection),
      },
    }
  } catch {
    return undefined
  }
}

/**
 * Construiește categorii pay gap reale din payroll.
 * Grupare pe jobCategory (poziție) — compară F vs M pe aceeași poziție.
 * K-anonymity: minim 2 persoane per gen (altfel suprimă).
 */
async function buildPayGapCategories(
  tenantId: string,
  payroll: Array<{ jobTitle?: string | null; salary?: number | null; gender?: string | null; name?: string | null }>
): Promise<MasterPayGapCategory[]> {
  // Încercăm și din EmployeeSalaryRecord (sursa preferată, are gender explicit)
  const records = await prisma.employeeSalaryRecord.findMany({
    where: { tenantId },
    orderBy: { periodYear: "desc" },
  })

  type Entry = { gender: string; salary: number; category: string }
  const entries: Entry[] = []

  if (records.length > 0) {
    // Sursă 1: EmployeeSalaryRecord (import stat salarii)
    for (const r of records) {
      if (r.gender && r.baseSalary > 0) {
        entries.push({
          gender: r.gender,
          salary: r.baseSalary,
          category: r.jobCategory || r.department || "General",
        })
      }
    }
  } else if (payroll.length > 0) {
    // Sursă 2: PayrollEntry (import vechi)
    for (const p of payroll) {
      if (p.gender && p.salary && p.salary > 0) {
        entries.push({
          gender: p.gender,
          salary: p.salary,
          category: p.jobTitle || "General",
        })
      }
    }
  }

  if (entries.length === 0) return []

  // Grupare pe categorie
  const groups = new Map<string, { male: number[]; female: number[] }>()
  for (const e of entries) {
    const key = e.category
    if (!groups.has(key)) groups.set(key, { male: [], female: [] })
    const g = groups.get(key)!
    if (e.gender === "MALE") g.male.push(e.salary)
    else if (e.gender === "FEMALE") g.female.push(e.salary)
  }

  const categories: MasterPayGapCategory[] = []
  for (const [cat, g] of groups) {
    // K-anonymity: minim 2 per gen
    if (g.male.length < 2 || g.female.length < 2) continue

    const avgM = g.male.reduce((a, b) => a + b, 0) / g.male.length
    const avgF = g.female.reduce((a, b) => a + b, 0) / g.female.length
    const gapPct = avgM > 0 ? ((avgM - avgF) / avgM) * 100 : 0

    let flag: "OK" | "ATENȚIE" | "SEMNIFICATIV"
    let justification = "—"

    if (Math.abs(gapPct) < 5) {
      flag = "OK"
    } else if (Math.abs(gapPct) < 10) {
      flag = "ATENȚIE"
      justification = `Decalaj de ${Math.abs(gapPct).toFixed(1)}% depășește pragul de 5%. Se recomandă verificarea criteriilor obiective (vechime, performanță) și documentarea justificării.`
    } else {
      flag = "SEMNIFICATIV"
      justification = `Decalaj semnificativ de ${Math.abs(gapPct).toFixed(1)}%. Impune evaluare comună conform Art. 10 din Directiva EU 2023/970. Plan de corecție obligatoriu.`
    }

    categories.push({
      category: `${cat} · normă întreagă`,
      women: `${Math.round(avgF).toLocaleString("ro-RO")} RON`,
      men: `${Math.round(avgM).toLocaleString("ro-RO")} RON`,
      gap: `${Math.abs(gapPct).toFixed(1)}%`,
      flag,
      justification,
    })
  }

  return categories.sort((a, b) => {
    const order = { SEMNIFICATIV: 0, "ATENȚIE": 1, OK: 2 }
    return (order[a.flag] ?? 2) - (order[b.flag] ?? 2)
  })
}
