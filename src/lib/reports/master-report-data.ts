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
  { position: "Director General", department: "Management", score: 920, grade: "Clasă 10", salary: "28.500 RON" },
  { position: "Director Producție", department: "Management", score: 780, grade: "Clasă 8", salary: "18.200 RON" },
  { position: "Director Comercial", department: "Comercial", score: 760, grade: "Clasă 8", salary: "17.800 RON" },
  { position: "Inginer Agronom Șef", department: "Producție", score: 680, grade: "Clasă 7", salary: "14.500 RON" },
  { position: "Contabil Șef", department: "Administrativ", score: 620, grade: "Clasă 6", salary: "13.200 RON" },
  { position: "Specialist Vânzări", department: "Comercial", score: 480, grade: "Clasă 5", salary: "9.800 RON" },
  { position: "Inginer Agronom", department: "Producție", score: 460, grade: "Clasă 5", salary: "9.500 RON" },
  { position: "Specialist HR", department: "Administrativ", score: 440, grade: "Clasă 4", salary: "8.500 RON" },
  { position: "Tehnician Laborator", department: "Producție", score: 380, grade: "Clasă 4", salary: "7.800 RON" },
  { position: "Operator Linie", department: "Producție", score: 300, grade: "Clasă 3", salary: "6.200 RON" },
  { position: "Șofer Distribuție", department: "Comercial", score: 260, grade: "Clasă 2", salary: "5.800 RON" },
  { position: "Muncitor Depozit", department: "Producție", score: 200, grade: "Clasă 1", salary: "5.200 RON" },
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
  { category: "Management (full-time)", women: "17.800 RON", men: "28.500 RON", gap: "37,5%", flag: "SEMNIFICATIV", justification: "Director General (unic, fondator) vs Director Comercial. Diferență justificată prin senioritate (18 ani vs 6 ani) și responsabilitate decizională." },
  { category: "Producție — ingineri (full-time)", women: "9.500 RON", men: "14.500 RON", gap: "34,5%", flag: "SEMNIFICATIV", justification: "Inginer Agronom vs Inginer Agronom Șef. Diferența reflectă nivelul ierarhic diferit (Clasă 5 vs Clasă 7) și experiență (3 ani vs 12 ani). Poziții non-comparabile conform Art. 9." },
  { category: "Comercial (full-time)", women: "9.800 RON", men: "9.800 RON", gap: "0,0%", flag: "OK", justification: "—" },
  { category: "Administrativ (full-time)", women: "8.500 RON", men: "13.200 RON", gap: "35,6%", flag: "SEMNIFICATIV", justification: "Specialist HR vs Contabil Șef. Funcții diferite, clase diferite (Clasă 4 vs Clasă 6). Nu constituie muncă de valoare egală conform evaluării JE." },
  { category: "Producție — operatori (full-time)", women: "5.200 RON", men: "6.200 RON", gap: "16,1%", flag: "ATENȚIE", justification: "Muncitor Depozit vs Operator Linie. Clase diferite (Clasă 1 vs Clasă 3). Se recomandă analiză suplimentară pentru eventuală ajustare." },
]

const DEMO_BENCHMARK: MasterBenchmark[] = [
  { position: "Director General", internal: "28.500", marketP25: "22.000", marketP50: "30.000", marketP75: "42.000", index: "95%", status: "Competitiv" },
  { position: "Director Producție", internal: "18.200", marketP25: "15.000", marketP50: "19.500", marketP75: "26.000", index: "93%", status: "Competitiv" },
  { position: "Inginer Agronom Șef", internal: "14.500", marketP25: "12.000", marketP50: "15.800", marketP75: "20.000", index: "92%", status: "Competitiv" },
  { position: "Contabil Șef", internal: "13.200", marketP25: "11.000", marketP50: "14.000", marketP75: "18.000", index: "94%", status: "Competitiv" },
  { position: "Specialist Vânzări", internal: "9.800", marketP25: "7.500", marketP50: "9.200", marketP75: "12.000", index: "107%", status: "Peste piață" },
  { position: "Operator Linie", internal: "6.200", marketP25: "5.500", marketP50: "6.800", marketP75: "8.000", index: "91%", status: "Sub piață" },
  { position: "Muncitor Depozit", internal: "5.200", marketP25: "4.800", marketP50: "5.600", marketP75: "6.500", index: "93%", status: "Competitiv" },
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
      where: { tenantId, status: "COMPLETED" },
      include: {
        jobResults: {
          include: {
            job: { include: { department: true } },
            salaryGrade: true,
          },
        },
        salaryGrades: { include: { steps: true } },
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

  // Pay gap simplificat din payroll
  const payGapCategories: MasterPayGapCategory[] = []
  // TODO: calcul real din payroll grouped by job title × work schedule

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
  }
}
