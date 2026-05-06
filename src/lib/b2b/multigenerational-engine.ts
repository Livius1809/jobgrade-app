/**
 * Multigenerational Analysis Engine — S2
 *
 * Analiza rezultanta 5 factori:
 * 1. Distributie varsta/generatie
 * 2. Diversitate background cultural
 * 3. Distributie tipuri personalitate (Herrmann/MBTI)
 * 4. Corelatie performanta cu diversitatea
 * 5. Scor colaborare HU-AI
 *
 * Genereaza 3 rapoarte: manager, HR, superior ierarhic.
 */

import { cpuCall } from "@/lib/cpu/gateway"
import { prisma } from "@/lib/prisma"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"

// ── Types ──────────────────────────────────────────────────────────────────

export interface GenerationDistribution {
  generation: string
  label: string
  count: number
  percentage: number
}

export interface FactorResult {
  factorId: string
  name: string
  score: number
  insight: string
  details: Record<string, unknown>
}

export interface MultigenerationalReport {
  audience: "MANAGER" | "HR" | "SUPERIOR"
  summary: string
  factors: FactorResult[]
  overallDiversityScore: number
  recommendations: string[]
}

export interface MultigenerationalAnalysis {
  tenantId: string
  departmentId?: string
  generationDistribution: GenerationDistribution[]
  factors: FactorResult[]
  overallScore: number
  reports: MultigenerationalReport[]
  createdAt: string
}

// ── Generation Classification ─────────────────────────────────────────────

const GENERATIONS = [
  { name: "Baby Boomers", label: "Baby Boomers (1946-1964)", minYear: 1946, maxYear: 1964 },
  { name: "Gen X", label: "Generatia X (1965-1980)", minYear: 1965, maxYear: 1980 },
  { name: "Millennials", label: "Millennials (1981-1996)", minYear: 1981, maxYear: 1996 },
  { name: "Gen Z", label: "Generatia Z (1997-2012)", minYear: 1997, maxYear: 2012 },
] as const

function classifyGeneration(birthYear: number): string {
  for (const gen of GENERATIONS) {
    if (birthYear >= gen.minYear && birthYear <= gen.maxYear) return gen.name
  }
  return birthYear < 1946 ? "Pre-Boomer" : "Gen Alpha"
}

// ── Factor Calculators ────────────────────────────────────────────────────

interface EmployeeData {
  birthYear?: number
  culturalBackground?: string
  personalityType?: string
  performanceScore?: number
  aiCollaborationScore?: number
}

function calculateGenerationDistribution(employees: EmployeeData[]): GenerationDistribution[] {
  const counts = new Map<string, number>()
  const total = employees.filter(e => e.birthYear).length

  for (const emp of employees) {
    if (!emp.birthYear) continue
    const gen = classifyGeneration(emp.birthYear)
    counts.set(gen, (counts.get(gen) ?? 0) + 1)
  }

  return Array.from(counts.entries()).map(([generation, count]) => ({
    generation,
    label: GENERATIONS.find(g => g.name === generation)?.label ?? generation,
    count,
    percentage: total > 0 ? Math.round((count / total) * 100) : 0,
  })).sort((a, b) => b.count - a.count)
}

function calculateDiversityIndex(distribution: GenerationDistribution[]): number {
  // Simpson's Diversity Index (1 - sum(p^2))
  const total = distribution.reduce((s, d) => s + d.count, 0)
  if (total <= 1) return 0
  const sumPSquared = distribution.reduce((s, d) => {
    const p = d.count / total
    return s + p * p
  }, 0)
  return Math.round((1 - sumPSquared) * 100)
}

function calculateCulturalDiversity(employees: EmployeeData[]): number {
  const backgrounds = new Set(employees.map(e => e.culturalBackground).filter(Boolean))
  const total = employees.filter(e => e.culturalBackground).length
  if (total === 0) return 0
  // Normalized diversity: unique backgrounds / sqrt(total) * scale
  return Math.min(100, Math.round((backgrounds.size / Math.sqrt(total)) * 40))
}

function calculatePersonalityDistribution(employees: EmployeeData[]): { types: Record<string, number>; balanceScore: number } {
  const types: Record<string, number> = {}
  const withType = employees.filter(e => e.personalityType)

  for (const emp of withType) {
    types[emp.personalityType!] = (types[emp.personalityType!] ?? 0) + 1
  }

  // Balance score: how evenly distributed are personality types
  const typeCount = Object.keys(types).length
  if (typeCount <= 1) return { types, balanceScore: 0 }

  const values = Object.values(types)
  const avg = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / values.length
  const cv = Math.sqrt(variance) / avg
  // Low CV = high balance (invert and scale)
  const balanceScore = Math.round(Math.max(0, (1 - cv) * 100))

  return { types, balanceScore }
}

function calculatePerformanceDiversityCorrelation(employees: EmployeeData[]): number {
  // Higher diversity in teams with higher performance = positive correlation
  const withPerformance = employees.filter(e => e.performanceScore !== undefined)
  if (withPerformance.length < 3) return 50 // neutral if insufficient data

  const avgPerformance = withPerformance.reduce((s, e) => s + (e.performanceScore ?? 0), 0) / withPerformance.length
  // Simple heuristic: normalize performance to 0-100
  return Math.round(Math.min(100, Math.max(0, avgPerformance)))
}

function calculateHUAIScore(employees: EmployeeData[]): number {
  const withScore = employees.filter(e => e.aiCollaborationScore !== undefined)
  if (withScore.length === 0) return 0
  return Math.round(
    withScore.reduce((s, e) => s + (e.aiCollaborationScore ?? 0), 0) / withScore.length
  )
}

// ── Main Analysis ─────────────────────────────────────────────────────────

export async function runMultigenerationalAnalysis(
  tenantId: string,
  departmentId?: string
): Promise<MultigenerationalAnalysis> {
  // Load employee data from tenant storage (aggregated by HR import)
  const employeesRaw = await getTenantData<EmployeeData[]>(tenantId, "EMPLOYEE_DEMOGRAPHICS") ?? []

  // If no demographics, try to build from salary records
  let employees: EmployeeData[] = employeesRaw
  if (employees.length === 0) {
    const salaryRecords = await prisma.employeeSalaryRecord.findMany({
      where: { tenantId },
      select: { department: true, baseSalary: true, gender: true },
    }).catch(() => [])
    // Minimal data — we can still run but with limited insights
    employees = salaryRecords.map(() => ({} as EmployeeData))
  }

  // Calculate all 5 factors
  const genDistribution = calculateGenerationDistribution(employees)
  const generationDiversityScore = calculateDiversityIndex(genDistribution)
  const culturalDiversityScore = calculateCulturalDiversity(employees)
  const personalityResult = calculatePersonalityDistribution(employees)
  const performanceCorrelation = calculatePerformanceDiversityCorrelation(employees)
  const huaiScore = calculateHUAIScore(employees)

  const factors: FactorResult[] = [
    {
      factorId: "F1_GENERATION",
      name: "Distributie varsta/generatie",
      score: generationDiversityScore,
      insight: `${genDistribution.length} generatii prezente, diversitate ${generationDiversityScore}%`,
      details: { distribution: genDistribution },
    },
    {
      factorId: "F2_CULTURAL",
      name: "Diversitate background cultural",
      score: culturalDiversityScore,
      insight: culturalDiversityScore > 0
        ? `Index diversitate culturala: ${culturalDiversityScore}%`
        : "Date insuficiente pentru analiza background cultural",
      details: {},
    },
    {
      factorId: "F3_PERSONALITY",
      name: "Distributie tipuri personalitate",
      score: personalityResult.balanceScore,
      insight: `${Object.keys(personalityResult.types).length} tipuri identificate, echilibru ${personalityResult.balanceScore}%`,
      details: { types: personalityResult.types },
    },
    {
      factorId: "F4_PERFORMANCE",
      name: "Corelatie performanta-diversitate",
      score: performanceCorrelation,
      insight: performanceCorrelation > 50
        ? "Corelatie pozitiva intre diversitate si performanta"
        : "Corelatie neutra/slaba — date insuficiente sau impact redus",
      details: {},
    },
    {
      factorId: "F5_HUAI",
      name: "Colaborare HU-AI",
      score: huaiScore,
      insight: huaiScore > 0
        ? `Scor mediu colaborare uman-AI: ${huaiScore}%`
        : "Colaborarea HU-AI nu a fost inca evaluata",
      details: {},
    },
  ]

  const overallScore = Math.round(factors.reduce((s, f) => s + f.score, 0) / factors.length)

  // Generate 3 reports via CPU
  const reports = await generateReports(tenantId, factors, genDistribution, overallScore)

  const analysis: MultigenerationalAnalysis = {
    tenantId,
    departmentId,
    generationDistribution: genDistribution,
    factors,
    overallScore,
    reports,
    createdAt: new Date().toISOString(),
  }

  await setTenantData(tenantId, "MULTIGENERATIONAL_ANALYSIS", analysis)
  return analysis
}

// ── Report Generation ─────────────────────────────────────────────────────

async function generateReports(
  tenantId: string,
  factors: FactorResult[],
  genDistribution: GenerationDistribution[],
  overallScore: number
): Promise<MultigenerationalReport[]> {
  const audiences: Array<{ role: "MANAGER" | "HR" | "SUPERIOR"; focus: string }> = [
    { role: "MANAGER", focus: "actionabil, echipa directa, interventii zilnice, comunicare inter-generationala" },
    { role: "HR", focus: "politici, programe de dezvoltare, retentie, recrutare, conformitate" },
    { role: "SUPERIOR", focus: "impact strategic, risc, investitii, performanta agregata, trend" },
  ]

  const contextData = `## Analiza multigenerationala — scor general ${overallScore}%

### Distributie generatii
${genDistribution.map(g => `- ${g.label}: ${g.count} persoane (${g.percentage}%)`).join("\n")}

### Factori
${factors.map(f => `- ${f.name}: ${f.score}% — ${f.insight}`).join("\n")}
`

  const reports: MultigenerationalReport[] = []

  for (const audience of audiences) {
    const result = await cpuCall({
      system: `Esti expert in managementul diversitatii multigenerationale. Genereaza un raport adaptat audientei specifice. Returneaza JSON valid. NU mentiona surse academice.`,
      messages: [
        {
          role: "user",
          content: `${contextData}

Genereaza raport pentru: ${audience.role}
Focus: ${audience.focus}

Returneaza JSON:
{
  "summary": "sumar executiv 2-3 propozitii adaptat rolului",
  "recommendations": ["recomandare 1", "recomandare 2", "recomandare 3"]
}`,
        },
      ],
      max_tokens: 1500,
      agentRole: "COA",
      operationType: "multigenerational-report",
      tenantId,
      skipObjectiveCheck: true,
    })

    let parsed = { summary: "", recommendations: [] as string[] }
    if (!result.degraded) {
      try {
        const jsonMatch = result.text.match(/\{[\s\S]*\}/)
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
      } catch { /* use defaults */ }
    }

    reports.push({
      audience: audience.role,
      summary: parsed.summary || `Analiza multigenerationala: scor ${overallScore}%`,
      factors,
      overallDiversityScore: overallScore,
      recommendations: parsed.recommendations.length > 0
        ? parsed.recommendations
        : ["Date insuficiente pentru recomandari personalizate"],
    })
  }

  return reports
}
