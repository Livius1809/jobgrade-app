/**
 * INTEGRATED JOB CONTEXT — Context sinergic per post din TOATE sursele
 *
 * Același pattern fractal ca la profilare psihometrică:
 * - Fiecare sursă păstrată SEPARAT (audit trail)
 * - Coroborare interrelațională → context sinergic
 * - AI-ul evaluează pe context integrat, nu pe fișă singură
 *
 * Surse: fișă post + stat funcții + COR + structură ierarhică + salarii (când vin)
 */

import { prisma } from "@/lib/prisma"
import { getTenantData } from "@/lib/tenant-storage"

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface IntegratedJobContext {
  jobId: string
  jobTitle: string
  tenantId: string

  /** Surse individuale (păstrate separat) */
  sources: {
    jobDescription: {
      text: string
      hasObjective: boolean
      hasResponsibilities: boolean
      hasRequirements: boolean
      completeness: number        // 0-1
    }
    statFunctii?: {
      studies: string             // "S" | "S*" | "M" | "B" | "B/T"
      studiesLabel: string        // "Superioare" | "Postuniversitare" | etc.
      experience: string          // "≥1" | "≥3" | "≥5" | "fără exp"
      workConditions: string      // "T" | "B" | "B/T"
      workConditionsLabel: string  // "Teren" | "Birou" | "Mixt"
      department: string
      subdepartment?: string
    }
    corDescription?: {
      code: string
      standardTitle: string
      standardDuties: string      // Din baza COR (când disponibilă)
    }
    hierarchy: {
      level: number               // 1=top, 5=execuție
      reportsTo?: string
      directReports: string[]
      departmentName: string
    }
    salary?: {
      current?: number
      gradeIfExists?: string
    }
  }

  /** Congruențe și divergențe între surse */
  crossCheck: CrossCheckFinding[]

  /** Contextul integrat (narativ, pentru AI) */
  integratedNarrative: string

  /** Mapare pe cele 6 criterii — ce date avem per criteriu */
  criteriaReadiness: {
    knowledge: { ready: boolean; sources: string[]; gaps: string[] }
    communications: { ready: boolean; sources: string[]; gaps: string[] }
    problemSolving: { ready: boolean; sources: string[]; gaps: string[] }
    decisionMaking: { ready: boolean; sources: string[]; gaps: string[] }
    businessImpact: { ready: boolean; sources: string[]; gaps: string[] }
    workingConditions: { ready: boolean; sources: string[]; gaps: string[] }
  }
}

export interface CrossCheckFinding {
  type: "CONGRUENT" | "ENRICHMENT" | "DIVERGENT" | "COR_MISMATCH"
  source1: string
  source2: string
  finding: string
  severity: "INFO" | "ATTENTION" | "FLAG"
}

// ═══════════════════════════════════════════════════════════════
// BUILDER
// ═══════════════════════════════════════════════════════════════

export async function buildIntegratedContext(
  tenantId: string,
  jobId: string
): Promise<IntegratedJobContext> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { department: true },
  })

  if (!job || job.tenantId !== tenantId) {
    throw new Error(`Job ${jobId} not found for tenant ${tenantId}`)
  }

  // Load stat funcții
  const statFunctii = await getTenantData(tenantId, "STAT_FUNCTII")
  const statRow = findStatRow(job.title, (statFunctii as any)?.rows || [])

  // Load hierarchy (siblings, reports)
  const allJobs = await prisma.job.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, title: true, departmentId: true },
  })

  // Build sources
  const descText = job.description || ""
  const sources: IntegratedJobContext["sources"] = {
    jobDescription: {
      text: descText,
      hasObjective: /obiectiv|scop/i.test(descText),
      hasResponsibilities: /responsabilit|sarcini/i.test(descText),
      hasRequirements: /cerinte|studii|experienta|calific/i.test(descText),
      completeness: calculateCompleteness(descText),
    },
    hierarchy: {
      level: inferHierarchyLevel(job.title, statRow),
      reportsTo: extractReportsTo(descText),
      directReports: inferDirectReports(job.title, allJobs, descText),
      departmentName: job.department?.name || "",
    },
  }

  if (statRow) {
    sources.statFunctii = {
      studies: statRow.studies || "",
      studiesLabel: translateStudies(statRow.studies),
      experience: statRow.experience || "",
      workConditions: statRow.workConditions || "",
      workConditionsLabel: translateConditions(statRow.workConditions),
      department: statRow.department || "",
      subdepartment: statRow.subdepartment || undefined,
    }
  }

  if (job.code) {
    sources.corDescription = {
      code: job.code,
      standardTitle: job.title,
      standardDuties: "", // Populated when COR database available
    }
  }

  // Cross-check findings
  const crossCheck = buildCrossCheck(sources, descText)

  // Criteria readiness
  const criteriaReadiness = assessCriteriaReadiness(sources, descText)

  // Build integrated narrative
  const integratedNarrative = buildNarrative(job.title, sources, crossCheck)

  return {
    jobId: job.id,
    jobTitle: job.title,
    tenantId,
    sources,
    crossCheck,
    integratedNarrative,
    criteriaReadiness,
  }
}

/** Build integrated context for ALL jobs in a tenant */
export async function buildAllIntegratedContexts(
  tenantId: string
): Promise<IntegratedJobContext[]> {
  const jobs = await prisma.job.findMany({
    where: { tenantId, isActive: true },
    select: { id: true },
  })

  const contexts: IntegratedJobContext[] = []
  for (const job of jobs) {
    try {
      const ctx = await buildIntegratedContext(tenantId, job.id)
      contexts.push(ctx)
    } catch (e) {
      console.error(`Failed to build context for job ${job.id}:`, (e as Error).message)
    }
  }

  return contexts
}

// ═══════════════════════════════════════════════════════════════
// CROSS-CHECK
// ═══════════════════════════════════════════════════════════════

function buildCrossCheck(
  sources: IntegratedJobContext["sources"],
  descText: string
): CrossCheckFinding[] {
  const findings: CrossCheckFinding[] = []
  const stat = sources.statFunctii

  if (!stat) return findings

  // Studies vs job description
  if (stat.studies) {
    const descMentionsStudies = /studii|diploma|universit|licent|master|doctorat/i.test(descText)
    if (descMentionsStudies) {
      findings.push({
        type: "CONGRUENT",
        source1: "Stat funcții",
        source2: "Fișa de post",
        finding: `Studii ${stat.studiesLabel} (${stat.studies}) — confirmate în ambele surse`,
        severity: "INFO",
      })
    } else {
      findings.push({
        type: "ENRICHMENT",
        source1: "Stat funcții",
        source2: "Fișa de post",
        finding: `Statul cere studii ${stat.studiesLabel} (${stat.studies}) — fișa nu menționează explicit cerințe de studii. Informație preluată din stat.`,
        severity: "INFO",
      })
    }
  }

  // Experience
  if (stat.experience && stat.experience !== "fara exp" && stat.experience !== "fara exp.") {
    const descMentionsExp = /experienta|ani.*experienta|experienta.*ani|minim.*an/i.test(descText)
    if (!descMentionsExp) {
      findings.push({
        type: "ENRICHMENT",
        source1: "Stat funcții",
        source2: "Fișa de post",
        finding: `Statul cere experiență ${stat.experience} — fișa nu menționează explicit. Informație preluată din stat.`,
        severity: "INFO",
      })
    }
  }

  // Work conditions
  if (stat.workConditions) {
    const descMentionsTeren = /teren|deplasa|domicili|vizit|zona|regiune/i.test(descText)
    const statSaysTeren = stat.workConditions.includes("T")

    if (statSaysTeren && descMentionsTeren) {
      findings.push({
        type: "CONGRUENT",
        source1: "Stat funcții",
        source2: "Fișa de post",
        finding: `Condiții teren (${stat.workConditionsLabel}) — confirmate: fișa menționează deplasări/activitate pe teren`,
        severity: "INFO",
      })
    } else if (statSaysTeren && !descMentionsTeren) {
      findings.push({
        type: "DIVERGENT",
        source1: "Stat funcții",
        source2: "Fișa de post",
        finding: `Statul indică condiții de teren dar fișa nu menționează deplasări. Verificați dacă postul presupune activitate pe teren.`,
        severity: "ATTENTION",
      })
    }
  }

  // Hierarchy level vs studies
  if (stat.studies && sources.hierarchy.level <= 2) {
    const needsHighStudies = stat.studies === "S" || stat.studies === "S*"
    if (!needsHighStudies) {
      findings.push({
        type: "DIVERGENT",
        source1: "Stat funcții",
        source2: "Ierarhie",
        finding: `Post de management (nivel ${sources.hierarchy.level}) dar statul cere studii ${stat.studiesLabel} (${stat.studies}) — de regulă managementul cere studii superioare.`,
        severity: "FLAG",
      })
    }
  }

  return findings
}

// ═══════════════════════════════════════════════════════════════
// CRITERIA READINESS
// ═══════════════════════════════════════════════════════════════

function assessCriteriaReadiness(
  sources: IntegratedJobContext["sources"],
  descText: string
): IntegratedJobContext["criteriaReadiness"] {
  const desc = descText.toLowerCase()
  const stat = sources.statFunctii

  return {
    knowledge: {
      ready: sources.jobDescription.hasResponsibilities || !!stat?.studies,
      sources: [
        ...(sources.jobDescription.hasResponsibilities ? ["Fișa: responsabilități"] : []),
        ...(stat?.studies ? [`Stat: studii ${stat.studies}`] : []),
        ...(stat?.experience ? [`Stat: experiență ${stat.experience}`] : []),
      ],
      gaps: [
        ...(!sources.jobDescription.hasRequirements && !stat?.studies ? ["Lipsă cerințe studii/experiență"] : []),
      ],
    },
    communications: {
      ready: /comunic|raport|client|echip|coordon|relatii/i.test(desc),
      sources: [
        ...(desc.includes("client") ? ["Fișa: interacțiune clienți"] : []),
        ...(desc.includes("raport") ? ["Fișa: raportare"] : []),
        ...(desc.includes("echip") ? ["Fișa: lucru în echipă"] : []),
      ],
      gaps: [
        ...(!(/comunic|raport|client/i.test(desc)) ? ["Fișa nu descrie explicit comunicarea"] : []),
      ],
    },
    problemSolving: {
      ready: /analiz|solutii|decide|verific|evalueaz|diagnostic/i.test(desc),
      sources: [
        ...(desc.includes("analiz") ? ["Fișa: analiză"] : []),
        ...(desc.includes("verific") ? ["Fișa: verificare/control"] : []),
      ],
      gaps: [],
    },
    decisionMaking: {
      ready: /aprob|decizi|coordon|raspunde|autoritat|manag/i.test(desc),
      sources: [
        ...(desc.includes("coordon") ? ["Fișa: coordonare"] : []),
        ...(desc.includes("raspunde") ? ["Fișa: responsabilitate"] : []),
        ...([1, 2, 3].includes(sources.hierarchy.level) ? [`Ierarhie: nivel ${sources.hierarchy.level}`] : []),
      ],
      gaps: [],
    },
    businessImpact: {
      ready: /buget|profit|kpi|obiectiv|strateg|venit|cost|performan/i.test(desc),
      sources: [
        ...(desc.includes("kpi") || desc.includes("obiectiv") ? ["Fișa: obiective/KPI"] : []),
        ...(desc.includes("buget") ? ["Fișa: responsabilitate buget"] : []),
      ],
      gaps: [
        ...(!(/buget|profit|kpi|obiectiv|strateg/i.test(desc)) ? ["Impact business neexplicit — se inferă din nivel ierarhic"] : []),
      ],
    },
    workingConditions: {
      ready: !!(stat?.workConditions) || /teren|deplasa|birou|program|risc|noapte/i.test(desc),
      sources: [
        ...(stat?.workConditions ? [`Stat: ${stat.workConditionsLabel} (${stat.workConditions})`] : []),
        ...(desc.includes("teren") || desc.includes("deplasa") ? ["Fișa: activitate teren/deplasări"] : []),
      ],
      gaps: [
        ...(!stat?.workConditions && !(/teren|deplasa|birou/i.test(desc)) ? ["Lipsă informații condiții muncă — se inferă din tipul postului"] : []),
      ],
    },
  }
}

// ═══════════════════════════════════════════════════════════════
// NARRATIVE BUILDER
// ═══════════════════════════════════════════════════════════════

function buildNarrative(
  title: string,
  sources: IntegratedJobContext["sources"],
  crossCheck: CrossCheckFinding[]
): string {
  const parts: string[] = []
  const stat = sources.statFunctii

  parts.push(`Post: ${title}.`)

  if (sources.hierarchy.departmentName) {
    parts.push(`Departament: ${sources.hierarchy.departmentName}.`)
  }

  parts.push(`Nivel ierarhic: ${sources.hierarchy.level} (${hierarchyLabel(sources.hierarchy.level)}).`)

  if (sources.hierarchy.reportsTo) {
    parts.push(`Raportează la: ${sources.hierarchy.reportsTo}.`)
  }

  if (sources.hierarchy.directReports.length > 0) {
    parts.push(`Coordonează: ${sources.hierarchy.directReports.join(", ")}.`)
  }

  if (stat) {
    parts.push(`Cerințe din statul de funcții: studii ${stat.studiesLabel}, experiență ${stat.experience}, condiții ${stat.workConditionsLabel}.`)
  }

  if (sources.corDescription?.code) {
    parts.push(`Cod COR: ${sources.corDescription.code}.`)
  }

  // Add enrichments from cross-check
  const enrichments = crossCheck.filter(f => f.type === "ENRICHMENT")
  if (enrichments.length > 0) {
    parts.push(`Informații suplimentare din coroborare: ${enrichments.map(e => e.finding).join("; ")}.`)
  }

  // Add flags
  const flags = crossCheck.filter(f => f.severity === "FLAG")
  if (flags.length > 0) {
    parts.push(`⚠️ Atenție: ${flags.map(f => f.finding).join("; ")}.`)
  }

  return parts.join(" ")
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function findStatRow(jobTitle: string, rows: any[]): any | null {
  const normalized = jobTitle.toLowerCase().trim()
  return rows.find((r: any) =>
    r.title?.toLowerCase().trim() === normalized ||
    r.title?.toLowerCase().includes(normalized) ||
    normalized.includes(r.title?.toLowerCase()?.trim())
  ) || null
}

function calculateCompleteness(text: string): number {
  if (!text) return 0
  let score = 0
  if (text.length > 100) score += 0.2
  if (/obiectiv|scop/i.test(text)) score += 0.2
  if (/responsabilit|sarcini/i.test(text)) score += 0.3
  if (/cerinte|studii|experienta/i.test(text)) score += 0.15
  if (/raport.*catre|raporteaza/i.test(text)) score += 0.15
  return Math.min(1, score)
}

function inferHierarchyLevel(title: string, statRow: any): number {
  const t = title.toLowerCase()
  if (t.includes("director general")) return 1
  if (t.includes("director")) return 2
  if (t.includes("manager national") || t.includes("manager regional")) return 2
  if (t.includes("manager departament") || t.includes("manager")) return 3
  if (t.includes("coordonator") || t.includes("sef")) return 4
  if (t.includes("specialist") || t.includes("consilier") || t.includes("analist")) return 4
  if (t.includes("ofiter")) return 4
  if (t.includes("operator") || t.includes("functionar") || t.includes("contabil")) return 5
  if (t.includes("colector") || t.includes("consultant")) return 5
  return 4 // default
}

function extractReportsTo(text: string): string | undefined {
  const match = text.match(/[Rr]aporteaz[aă]\s+(?:catre)?\s*(?:\(titlul\s+postului\))?\s*([A-Z][a-zA-ZăâîșțĂÂÎȘȚ\s]+?)(?:\s+Anexa|\s+Obiectiv|\s+•|\s+Scopul)/i)
  return match ? match[1].trim() : undefined
}

function inferDirectReports(title: string, allJobs: any[], descText: string): string[] {
  // Simple inference based on known hierarchy patterns
  const reports: string[] = []
  const t = title.toLowerCase()

  // Extract from text "coordoneaza echipa de..."
  const coordMatch = descText.match(/coordoneaz[aă]\s+(.+?)(?:\s+si\s+|,|\.|;)/i)
  if (coordMatch) {
    // Not returning raw match - too noisy from OCR
  }

  return reports
}

function translateStudies(code: string): string {
  const map: Record<string, string> = {
    "S*": "Postuniversitare",
    "S": "Superioare",
    "S/M": "Superioare sau Medii",
    "M": "Medii",
    "M*": "Medii cu specializare",
    "B": "Bacalaureat",
    "B/T": "Bacalaureat sau Tehnice",
  }
  return map[code] || code
}

function translateConditions(code: string): string {
  const map: Record<string, string> = {
    "T": "Teren (deplasări)",
    "B": "Birou",
    "B/T": "Mixt (birou + teren)",
  }
  return map[code] || code
}

function hierarchyLabel(level: number): string {
  const labels: Record<number, string> = {
    1: "top management",
    2: "director/management superior",
    3: "manager departament",
    4: "coordonator/specialist",
    5: "execuție",
  }
  return labels[level] || `nivel ${level}`
}
