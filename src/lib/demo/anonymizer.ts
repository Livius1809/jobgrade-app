/**
 * anonymizer.ts — Stratul de translație pentru demo/prezentări
 *
 * Ia date REALE din JG_itself și le anonimizează pe 3 niveluri:
 * 1. Structural — rebotează departamente, posturi, coduri
 * 2. Numeric — perturbă salarii/scoruri (păstrează proporțiile)
 * 3. Conținut — blurează text sensibil
 *
 * Principiu: demo-ul arată AUTENTIC dar nu expune date reale.
 * Structura, proporțiile și pattern-urile rămân — valorile se schimbă.
 */

// ═══════════════════════════════════════════════════════════════
// DICȚIONAR TRANSLAȚIE — mapări stabile per sesiune
// ═══════════════════════════════════════════════════════════════

// Departamente demo (industrii variate — clientul se recunoaște)
const DEMO_DEPARTMENTS = [
  "Producție",
  "Vânzări și Marketing",
  "Resurse Umane",
  "Financiar-Contabil",
  "IT & Digitalizare",
  "Logistică",
  "Calitate și Conformitate",
  "Cercetare-Dezvoltare",
]

// Posturi demo per nivel
const DEMO_JOBS: Record<string, string[]> = {
  STRATEGIC: [
    "Director General",
    "Director Executiv",
    "Administrator",
  ],
  TACTICAL: [
    "Director Comercial",
    "Director Producție",
    "Director HR",
    "Director Financiar",
    "Director IT",
    "Director Calitate",
    "Director Logistică",
    "Director R&D",
  ],
  OPERATIONAL: [
    "Inginer Senior Producție",
    "Specialist Vânzări B2B",
    "Specialist HR",
    "Contabil Principal",
    "Analist Programator",
    "Specialist Calitate",
    "Coordonator Logistică",
    "Inginer Proiect",
    "Specialist Achiziții",
    "Specialist Marketing Digital",
    "Analist Business",
    "Operator CNC Senior",
    "Specialist Conformitate",
    "Administrator Baze de Date",
    "Specialist Salarizare",
    "Tehnician Mentenanță",
    "Specialist Export",
    "Analist Date",
    "Specialist SSM",
    "Specialist Control Calitate",
    "Asistent Manager",
    "Referent Resurse Umane",
    "Specialist ERP",
    "Planificator Producție",
    "Specialist Relații Clienți",
    "Designer Industrial",
    "Specialist Mediu",
    "Tehnolog Principal",
    "Specialist Aprovizionare",
    "Inspector Calitate",
  ],
  EXPERT: [
    "Expert Tehnic Principal",
    "Consultant Senior Procese",
  ],
}

// Nume companie demo
const DEMO_COMPANIES = [
  "TechProd Industries SRL",
  "Meridian Manufacturing SA",
  "Carpați Solutions SRL",
  "Dunărea Logistics SA",
  "Praxis Engineering SRL",
]

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface AnonymizationConfig {
  /** Seed pentru randomizare deterministă (același seed = aceleași transformări) */
  seed?: string
  /** Nivel de perturbație salarii (0-1, default 0.1 = ±10%) */
  salaryNoise?: number
  /** Adaugă watermark DEMO */
  watermark?: boolean
  /** Numele companiei demo (default: random din listă) */
  companyName?: string
  /** Blur text sensibil (default: true) */
  blurContent?: boolean
}

export interface AnonymizedSnapshot {
  company: string
  departments: Array<{ original: string; demo: string }>
  jobs: Array<{
    originalTitle: string
    demoTitle: string
    demoDepartment: string
    structureType: string
    demoSalary?: number
    originalSalary?: number
  }>
  salaryRecords: Array<{
    code: string
    gender: string
    demoBaseSalary: number
    demoVariableComp: number
    demoDepartment: string
    demoJobCategory: string
    evaluationScore?: number
  }>
  stats: {
    totalJobs: number
    totalDepartments: number
    totalEmployees: number
    humanJobs: number
    aiJobs: number
    mixedJobs: number
    payGapPct: number | null
  }
  watermark: boolean
  generatedAt: string
}

// ═══════════════════════════════════════════════════════════════
// SEEDED RANDOM — deterministă per sesiune
// ═══════════════════════════════════════════════════════════════

function seededRandom(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  let state = hash
  return () => {
    state = (state * 1664525 + 1013904223) & 0x7fffffff
    return state / 0x7fffffff
  }
}

// ═══════════════════════════════════════════════════════════════
// ANONYMIZER
// ═══════════════════════════════════════════════════════════════

/**
 * Anonimizează un set de date organizaționale.
 * Deterministă: același seed produce aceleași rezultate.
 */
export function anonymize(
  data: {
    departments: Array<{ id: string; name: string }>
    jobs: Array<{ id: string; title: string; departmentId?: string | null; structureType: string; purpose?: string }>
    salaryRecords: Array<{
      employeeCode: string; gender: string; baseSalary: number;
      variableComp: number; department?: string | null; jobCategory?: string | null;
      evaluationScore?: number | null
    }>
    companyName?: string
  },
  config: AnonymizationConfig = {}
): AnonymizedSnapshot {
  const rand = seededRandom(config.seed || "demo-2026")
  const noise = config.salaryNoise ?? 0.10
  const watermark = config.watermark ?? true
  const companyName = config.companyName || DEMO_COMPANIES[Math.floor(rand() * DEMO_COMPANIES.length)]

  // ── 1. Mapare departamente ──
  const shuffledDepts = [...DEMO_DEPARTMENTS].sort(() => rand() - 0.5)
  const deptMap = new Map<string, string>()
  const departments = data.departments.map((d, i) => {
    const demoName = shuffledDepts[i % shuffledDepts.length]
    deptMap.set(d.id, demoName)
    deptMap.set(d.name, demoName)
    return { original: d.name, demo: demoName }
  })

  // ── 2. Mapare posturi ──
  const levelCounters: Record<string, number> = { STRATEGIC: 0, TACTICAL: 0, OPERATIONAL: 0, EXPERT: 0 }

  const jobs = data.jobs.map(j => {
    // Deducem nivelul din titlu
    let level = "OPERATIONAL"
    if (j.title.includes("Director") || j.title.includes("Chief") || j.title.includes("COG")) level = "STRATEGIC"
    else if (j.title.includes("Lead") || j.title.includes("Manager") || j.title.includes("COCSA") || j.title.includes("COA")) level = "TACTICAL"
    else if (j.title.includes("Psiholog Principal") || j.title.includes("Expert")) level = "EXPERT"

    const pool = DEMO_JOBS[level] || DEMO_JOBS.OPERATIONAL
    const idx = levelCounters[level]++ % pool.length
    const demoTitle = pool[idx]

    const demoDept = j.departmentId ? (deptMap.get(j.departmentId) || "General") : shuffledDepts[Math.floor(rand() * shuffledDepts.length)]

    return {
      originalTitle: j.title,
      demoTitle,
      demoDepartment: demoDept,
      structureType: j.structureType,
    }
  })

  // ── 3. Anonimizare salarii ──
  const salaryRecords = data.salaryRecords.map((r, i) => {
    const perturbFactor = 1 + (rand() * 2 - 1) * noise // ±noise%
    const demoBase = Math.round(r.baseSalary * perturbFactor / 100) * 100
    const demoVar = Math.round(r.variableComp * perturbFactor / 100) * 100

    const demoDept = r.department ? (deptMap.get(r.department) || "General") : "General"

    // Job category → demo equivalent
    const catMap: Record<string, string> = {
      "Psiholog Principal": "Expert Tehnic Principal",
      "Marketing Specialist": "Specialist Marketing Digital",
      "Sales Specialist": "Specialist Vânzări B2B",
      "Senior Developer": "Analist Programator",
      "Compliance Specialist": "Specialist Conformitate",
      "Financial Analyst": "Analist Business",
      "Customer Support": "Specialist Relații Clienți",
    }
    const demoJobCat = (r.jobCategory && catMap[r.jobCategory]) || "Specialist"

    return {
      code: `EMP-${String(i + 1).padStart(3, "0")}`,
      gender: r.gender,
      demoBaseSalary: demoBase,
      demoVariableComp: demoVar,
      demoDepartment: demoDept,
      demoJobCategory: demoJobCat,
      evaluationScore: r.evaluationScore || undefined,
    }
  })

  // ── 4. Statistici ──
  const males = salaryRecords.filter(r => r.gender === "MALE")
  const females = salaryRecords.filter(r => r.gender === "FEMALE")
  const avgMale = males.length > 0 ? males.reduce((s, r) => s + r.demoBaseSalary, 0) / males.length : 0
  const avgFemale = females.length > 0 ? females.reduce((s, r) => s + r.demoBaseSalary, 0) / females.length : 0
  const payGapPct = avgMale > 0 ? Math.round(((avgMale - avgFemale) / avgMale) * 1000) / 10 : null

  return {
    company: companyName,
    departments,
    jobs,
    salaryRecords,
    stats: {
      totalJobs: jobs.length,
      totalDepartments: departments.length,
      totalEmployees: salaryRecords.length,
      humanJobs: jobs.filter(j => j.structureType === "HUMAN").length,
      aiJobs: jobs.filter(j => j.structureType === "AI").length,
      mixedJobs: jobs.filter(j => j.structureType === "MIXED").length,
      payGapPct,
    },
    watermark,
    generatedAt: new Date().toISOString(),
  }
}

/**
 * Blur text sensibil — înlocuiește date specifice cu placeholder-uri.
 */
export function blurText(text: string, deptMap?: Map<string, string>): string {
  let result = text

  // CUI / cod fiscal
  result = result.replace(/\bRO?\d{6,10}\b/g, "RO00000000")

  // Adrese email
  result = result.replace(/[\w.-]+@[\w.-]+\.\w+/g, "contact@companie-demo.ro")

  // Numere telefon
  result = result.replace(/\b0[237]\d{8}\b/g, "07XX XXX XXX")

  // Sume specifice (>4 cifre cu RON/EUR/lei)
  result = result.replace(/\b\d{4,}\s*(RON|EUR|lei|euro)\b/gi, "X.XXX $1")

  // Nume proprii comune românești (pattern: Capitală + minim 3 litere)
  // Nu le înlocuim automat — risc de false positive prea mare

  // Departamente reale → demo
  if (deptMap) {
    for (const [real, demo] of deptMap) {
      result = result.replace(new RegExp(real.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), demo)
    }
  }

  return result
}
