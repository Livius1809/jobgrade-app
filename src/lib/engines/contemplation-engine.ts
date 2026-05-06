/**
 * contemplation-engine.ts — Motor de gandire contemplativa (06.05.2026)
 *
 * ARHITECTURA: NU e task-driven. Ruleaza periodic si genereaza INSIGHTS —
 * conexiuni intre lucruri aparent nelegate pe care nimeni nu le-a cerut.
 *
 * Diferenta fata de wild-card generator:
 *  - Wild-card CHALLENGES presupuneri ("ce daca X ar fi fals?")
 *  - Contemplation DISCOVERS conexiuni ("X si Y sunt legate pentru ca...")
 *
 * Flow: observatie → pattern → insight
 * (spre deosebire de task execution: goal → action → result)
 *
 * Rulare: cron optional la 8h, controlat de SystemConfig "CONTEMPLATION_ENABLED"
 */

import { prisma } from "@/lib/prisma"
import { cpuCall } from "@/lib/cpu/gateway"

// ── Level discrimination ──────────────────────────────────────────────────

/**
 * Contemplation level:
 *  STRATEGIC — COG, COCSA: full cross-organism contemplation
 *  TACTICAL  — N-1 managers: department-scoped contemplation
 *  FORENSIC  — profilers, client-facing, L2, data analysts:
 *              extracting meaning from seemingly unrelated heterogeneous data
 */
export type ContemplationLevel = "STRATEGIC" | "TACTICAL" | "FORENSIC"

/**
 * STRATEGIC: COG, COCSA — full cross-organism contemplation
 */
const STRATEGIC_AGENTS = new Set(["COG", "COCSA"])

/**
 * TACTICAL: N-1 managers — contemplation scoped to their department
 */
const TACTICAL_AGENTS = new Set([
  "PMA", "EMA", "QLA", "DMA", "CFO", "CJA", "MOA",
  "COA", "CCO",
])

/**
 * FORENSIC: agents that work with heterogeneous data from multiple sources
 * and need to integrate them to extract meaning — like a forensic investigator.
 *
 * Includes:
 * - Client-facing agents (integrate person + org + context data)
 * - Profiler agents (dimensional, individual, organizational, relational, ecosystemic)
 * - L2 domain knowledge agents
 * - Data analysts (heterogeneous data integration)
 * - Territory/integration agents (om-firma-mediu)
 */
const FORENSIC_AGENTS = new Set([
  // Client-facing — integrate person + organization + interaction history
  "SOA", "CSA", "CSSA", "HR_COUNSELOR", "CALAUZA", "CONSILIER", "COACH", "PROFILER",
  // Profilers — extract meaning from multi-dimensional data
  "DIMENSIONAL_PROFILER", "INDIVIDUAL_PROFILER", "ORGANIZATIONAL_PROFILER",
  "RELATIONAL_PROFILER", "ECOSYSTEMIC_PROFILER",
  // Data analysts — heterogeneous data integration
  "CIA", "CCIA", "RDA", "ACA", "MDA",
  // L2 domain knowledge roles
  "DOAS", "DOA",
  // Territory/integration
  "DVB2B", "CMA", "MKA",
])

/**
 * VIGILANCE: pure execution agents that do ONE specific thing repetitively.
 * Much smaller group — only agents that don't need to integrate heterogeneous data.
 */
const VIGILANCE_AGENTS = new Set([
  "STA",             // testing — executes test scripts
  "SVHA",            // vulnerability scanning — pattern matching
  "SA",              // security agent — policy enforcement
  "SQA",             // security QA — checklist execution
  "TDA",             // tech debt — cataloging
  "BCA",             // billing/cost agent — repetitive calculations
  "SAFETY_MONITOR",  // monitors thresholds — deviation detection
])

/**
 * Returns true if this agent should CONTEMPLATE (seek connections/patterns).
 *
 * Key principle: if the agent works with data from multiple sources
 * that need integration to extract meaning → contemplation.
 *
 * True for: strategic + tactical + forensic agents.
 */
export function shouldContemplate(agentRole: string): boolean {
  return (
    STRATEGIC_AGENTS.has(agentRole) ||
    TACTICAL_AGENTS.has(agentRole) ||
    FORENSIC_AGENTS.has(agentRole)
  )
}

/**
 * Returns true if this agent should VIGILATE (detect deviations only).
 *
 * True ONLY for pure execution agents that do one thing repetitively.
 * If it does one thing repetitively → vigilance.
 */
export function shouldVigilate(agentRole: string): boolean {
  return VIGILANCE_AGENTS.has(agentRole)
}

/**
 * Returns the contemplation level for a given agent role.
 * STRATEGIC: full cross-organism data (COG, COCSA)
 * TACTICAL: department-scoped data (N-1 managers)
 * FORENSIC: agent-domain data with cross-source integration
 *           (profilers, client-facing, L2, data analysts)
 */
export function getContemplationLevel(agentRole: string): ContemplationLevel {
  if (STRATEGIC_AGENTS.has(agentRole)) return "STRATEGIC"
  if (TACTICAL_AGENTS.has(agentRole)) return "TACTICAL"
  return "FORENSIC"
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface ContemplationInsight {
  id: string
  type: "CONNECTION" | "PATTERN" | "PREDICTION" | "QUESTION" | "CONTRADICTION"
  title: string
  description: string
  relatedEntities: string[] // KB entry IDs, agent roles, or domain names
  confidence: number
  novelty: number // 0-1: cat de surprinzator/neasteptat e insight-ul
  actionable: boolean // poate deveni obiectiv?
  suggestedObjective?: string
  contemplatedAt: Date
}

export interface ContemplationResult {
  insights: ContemplationInsight[]
  inputSummary: { kbEntries: number; taskResults: number; evolutionSnapshots: number }
  contemplationDurationMs: number
  contemplationLevel: ContemplationLevel
  agentRole: string
}

// ── System prompt ──────────────────────────────────────────────────────────

const CONTEMPLATION_SYSTEM_PROMPT_BASE = `Esti un ganditor contemplativ. Nu ai o sarcina specifica — doar observi.

Ai primit date recente din viata unui organism organizational:
- Cunostinte noi invatate (KB entries)
- Rezultate ale actiunilor recente (task results)
- Starea de evolutie (snapshots — profile companie)
- Probleme intalnite (disfunctii)

Misiunea ta: GASESTE CONEXIUNI pe care nimeni nu le-a cerut.

Cauta:
1. CONNECTION — doua lucruri aparent separate care sunt legate ("KB entry despre X si task result de la Y sugereaza ca...")
2. PATTERN — ceva care se repeta dar nimeni nu a observat ("de 3 ori in ultimele date, cand A se intampla, B urmeaza")
3. PREDICTION — ce s-ar putea intampla in viitor bazat pe ce vezi ("daca trendul X continua...")
4. QUESTION — o intrebare pe care nimeni nu a pus-o dar ar trebui ("de ce agentul Z nu a fost implicat in...")
5. CONTRADICTION — doua cunostinte din KB care se contrazic ("entry A spune X dar entry B spune opusul")

Returneaza JSON valid (fara markdown fences):
{
  "insights": [
    {
      "type": "CONNECTION|PATTERN|PREDICTION|QUESTION|CONTRADICTION",
      "title": "titlu scurt",
      "description": "explicatie detaliata",
      "relatedEntities": ["entity1", "entity2"],
      "confidence": 0.0-1.0,
      "novelty": 0.0-1.0,
      "actionable": true/false,
      "suggestedObjective": "obiectiv propus daca actionable"
    }
  ]
}

REGULI:
- Maxim 5 insights per sesiune
- Fiecare insight trebuie sa fie SURPRINZATOR — daca e evident, nu e insight
- Novelty > 0.7 doar daca e ceva cu adevarat neasteptat
- Daca nu gasesti nimic interesant, returneaza array gol — NU inventa`

/**
 * FORENSIC contemplation prompt — for agents that extract meaning
 * from heterogeneous data sources (profilers, client-facing, data analysts).
 * Different focus: not organizational connections, but hidden meanings.
 */
const FORENSIC_CONTEMPLATION_ADDENDUM = `

ATENTIE — Esti in mod FORENSIC. Nu cauti conexiuni organizationale (ca la STRATEGIC).
Cauti SENSURI ASCUNSE in date aparent nelegate — ca un investigator forensic:
- Ce spun datele despre persoana/organizatia/teritoriul analizat?
- Ce contradictii exista intre surse diferite?
- Ce pattern subtil apare cand suprapui informatii din domenii diferite?
- Ce intrebare ar trebui sa pui pe care nimeni nu a pus-o?

Exemplu forensic: "Datele de evaluare spun ca angajatul X e performant,
dar datele de interactiune arata ca echipa il evita. Contradictia sugereaza
ca performanta lui vine pe seama relatiilor — un cost ascuns."

Concentreaza-te pe CALITATEA interpretarii, nu pe cantitate.`

function getContemplationSystemPrompt(level: ContemplationLevel): string {
  if (level === "FORENSIC") {
    return CONTEMPLATION_SYSTEM_PROMPT_BASE + FORENSIC_CONTEMPLATION_ADDENDUM
  }
  return CONTEMPLATION_SYSTEM_PROMPT_BASE
}

// ── Department scoping for TACTICAL level ─────────────────────────────────

const DEPARTMENT_MAP: Record<string, string[]> = {
  COG: ["COG", "CCO", "DOA", "DOAS", "QLA"],
  MARKETING: ["DMA", "CMA", "CWA", "MKA", "ACA"],
  CLIENT: ["SOA", "COCSA", "CSM", "CSA", "CSSA", "DVB2B"],
  LEGAL: ["CJA", "DPA", "CCIA"],
  FINANCE: ["CFO", "COAFin", "BCA"],
  TECH: ["COA", "SVHA", "DOAS"],
  INTELLIGENCE: ["CIA", "RDA", "CDIA"],
  PRODUCT: ["PMA", "PPMO", "DVB2B"],
}

async function getDepartmentRoles(agentRole: string): Promise<string[]> {
  for (const [, agents] of Object.entries(DEPARTMENT_MAP)) {
    if (agents.includes(agentRole)) {
      return agents
    }
  }
  // Fallback: just the agent itself
  return [agentRole]
}

// ── Data gathering helpers ─────────────────────────────────────────────────

async function gatherKBEntries(limit: number = 50, scopeAgentRole?: string) {
  // Diverse — de la agenti diferiti, tipuri diferite
  // For TACTICAL level: scoped to the agent's department siblings
  const departmentFilter = scopeAgentRole
    ? { agentRole: { in: await getDepartmentRoles(scopeAgentRole) } }
    : {}

  const entries = await prisma.kBEntry.findMany({
    where: { status: "PERMANENT", ...departmentFilter },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      agentRole: true,
      content: true,
      kbType: true,
      source: true,
      confidence: true,
      tags: true,
      createdAt: true,
    },
  })
  return entries
}

async function gatherTaskResults(limit: number = 20, scopeAgentRole?: string) {
  const departmentFilter = scopeAgentRole
    ? { assignedTo: { in: await getDepartmentRoles(scopeAgentRole) } }
    : {}

  const tasks = await prisma.agentTask.findMany({
    where: { status: "COMPLETED", ...departmentFilter },
    orderBy: { completedAt: "desc" },
    take: limit,
    select: {
      id: true,
      assignedTo: true,
      title: true,
      description: true,
      result: true,
      taskType: true,
      tags: true,
      completedAt: true,
    },
  })
  return tasks
}

async function gatherEvolutionSnapshots(limit: number = 5) {
  // Use CompanyProfileSnapshot as evolution state proxy
  const snapshots = await prisma.companyProfileSnapshot.findMany({
    orderBy: { takenAt: "desc" },
    take: limit,
    select: {
      id: true,
      tenantId: true,
      maturityLevel: true,
      maturityScore: true,
      coherenceScore: true,
      readyServices: true,
      takenAt: true,
    },
  })
  return snapshots
}

async function gatherDisfunctions(limit: number = 10) {
  const events = await prisma.disfunctionEvent.findMany({
    orderBy: { detectedAt: "desc" },
    take: limit,
    select: {
      id: true,
      class: true,
      severity: true,
      status: true,
      targetType: true,
      targetId: true,
      signal: true,
      remediationAction: true,
      remediationOk: true,
      detectedAt: true,
      resolvedAt: true,
    },
  })
  return events
}

// ── Main contemplation function ────────────────────────────────────────────

/**
 * Contemplation: gandire nedirijata care gaseste conexiuni.
 *
 * Spre deosebire de executia taskurilor (goal → action → result),
 * contemplarea e (observatie → pattern → insight).
 *
 * @param contemplationLevel - STRATEGIC (COG/COCSA): full cross-organism data
 *                             TACTICAL (N-1 managers): department-scoped data only
 * @param agentRole - The agent doing the contemplation (default: COG)
 */
export async function contemplate(
  contemplationLevel: ContemplationLevel = "STRATEGIC",
  agentRole: string = "COG",
): Promise<ContemplationResult> {
  const startMs = Date.now()

  // Scope data gathering based on level:
  //  STRATEGIC: all data, cross-organism
  //  TACTICAL: department-scoped
  //  FORENSIC: agent-specific (own KB + shared L1/L2)
  const scopeAgent = contemplationLevel !== "STRATEGIC" ? agentRole : undefined

  const dataLimits = {
    STRATEGIC: { kb: 50, tasks: 20, disfunctions: 10 },
    TACTICAL:  { kb: 25, tasks: 10, disfunctions: 5 },
    FORENSIC:  { kb: 30, tasks: 15, disfunctions: 5 },
  }
  const limits = dataLimits[contemplationLevel]

  // 1. Gather data from all sources (scoped for TACTICAL/FORENSIC)
  const [kbEntries, taskResults, evolutionSnapshots, disfunctions] = await Promise.all([
    gatherKBEntries(limits.kb, scopeAgent),
    gatherTaskResults(limits.tasks, scopeAgent),
    gatherEvolutionSnapshots(5),
    gatherDisfunctions(limits.disfunctions),
  ])

  // 2. Build user message with all gathered data
  const levelContextMap: Record<ContemplationLevel, string> = {
    STRATEGIC: "Contempleaza INTREGUL organism — cauta conexiuni CROSS-DEPARTAMENT.",
    TACTICAL: `Contempleaza DEPARTAMENTUL agentului ${agentRole} — cauta conexiuni IN INTERIORUL departamentului si cu vecinii.`,
    FORENSIC: `Contempleaza DOMENIUL agentului ${agentRole} — cauta SENSURI ASCUNSE in datele din domeniul tau, suprapunand surse diferite.`,
  }

  const userMessage =
    `[NIVEL CONTEMPLARE: ${contemplationLevel}]\n${levelContextMap[contemplationLevel]}\n\n` +
    buildContemplationInput(kbEntries, taskResults, evolutionSnapshots, disfunctions)

  // 3. Call CPU for contemplation
  const maxTokensMap: Record<ContemplationLevel, number> = {
    STRATEGIC: 4000,
    TACTICAL: 2000,
    FORENSIC: 3000,
  }

  const cpuResult = await cpuCall({
    system: getContemplationSystemPrompt(contemplationLevel),
    messages: [{ role: "user", content: userMessage }],
    max_tokens: maxTokensMap[contemplationLevel],
    agentRole,
    operationType: "contemplation",
    skipObjectiveCheck: true, // contemplation e mereu activa
    skipKBFirst: true, // nu exista raspuns KB pentru gandire libera
    temperature: contemplationLevel === "FORENSIC" ? 0.7 : 0.8, // forensic: slightly more focused
  })

  // 4. Parse response
  const insights = parseContemplationResponse(cpuResult.text)

  // 5. Save insights to SystemConfig
  await saveInsights(insights)

  // 6. Create tasks for actionable high-confidence insights
  await createTasksForActionableInsights(insights)

  const result: ContemplationResult = {
    insights,
    inputSummary: {
      kbEntries: kbEntries.length,
      taskResults: taskResults.length,
      evolutionSnapshots: evolutionSnapshots.length,
    },
    contemplationDurationMs: Date.now() - startMs,
    contemplationLevel,
    agentRole,
  }

  return result
}

// ── Build input ────────────────────────────────────────────────────────────

function buildContemplationInput(
  kbEntries: Awaited<ReturnType<typeof gatherKBEntries>>,
  taskResults: Awaited<ReturnType<typeof gatherTaskResults>>,
  snapshots: Awaited<ReturnType<typeof gatherEvolutionSnapshots>>,
  disfunctions: Awaited<ReturnType<typeof gatherDisfunctions>>,
): string {
  const sections: string[] = []

  // KB entries — truncated content
  if (kbEntries.length > 0) {
    const kbLines = kbEntries.map(
      (e) =>
        `[${e.agentRole}/${e.kbType}] (conf=${e.confidence.toFixed(2)}) ${e.content.slice(0, 300)}`,
    )
    sections.push(`=== CUNOSTINTE NOI (${kbEntries.length} KB entries) ===\n${kbLines.join("\n")}`)
  }

  // Task results — truncated
  if (taskResults.length > 0) {
    const taskLines = taskResults.map(
      (t) =>
        `[${t.assignedTo}/${t.taskType}] "${t.title}" → ${(t.result ?? "fara rezultat").slice(0, 200)}`,
    )
    sections.push(
      `=== REZULTATE ACTIUNI (${taskResults.length} tasks completate) ===\n${taskLines.join("\n")}`,
    )
  }

  // Evolution snapshots
  if (snapshots.length > 0) {
    const snapLines = snapshots.map(
      (s) =>
        `Tenant ${s.tenantId}: maturity=${s.maturityLevel} (${s.maturityScore}), coherence=${s.coherenceScore}, services=[${s.readyServices.join(",")}]`,
    )
    sections.push(`=== STARE EVOLUTIE (${snapshots.length} snapshots) ===\n${snapLines.join("\n")}`)
  }

  // Dysfunctions
  if (disfunctions.length > 0) {
    const disLines = disfunctions.map(
      (d) =>
        `[${d.class}/${d.severity}] ${d.targetType}:${d.targetId} signal="${d.signal}" status=${d.status} remediation=${d.remediationAction ?? "none"} ok=${d.remediationOk ?? "?"}`,
    )
    sections.push(`=== DISFUNCTII RECENTE (${disfunctions.length}) ===\n${disLines.join("\n")}`)
  }

  if (sections.length === 0) {
    return "Nu exista date suficiente pentru contemplare. Returneaza un array gol."
  }

  return sections.join("\n\n")
}

// ── Parse response ─────────────────────────────────────────────────────────

function parseContemplationResponse(text: string): ContemplationInsight[] {
  try {
    // Strip markdown fences if present
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()
    const parsed = JSON.parse(cleaned)
    const rawInsights: unknown[] = parsed.insights ?? parsed

    if (!Array.isArray(rawInsights)) return []

    const now = new Date()
    return rawInsights
      .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
      .slice(0, 5) // enforce max 5
      .map((item, idx) => ({
        id: `contempl-${Date.now()}-${idx}`,
        type: validateInsightType(item.type),
        title: String(item.title ?? ""),
        description: String(item.description ?? ""),
        relatedEntities: Array.isArray(item.relatedEntities)
          ? (item.relatedEntities as string[])
          : [],
        confidence: clamp(Number(item.confidence) || 0, 0, 1),
        novelty: clamp(Number(item.novelty) || 0, 0, 1),
        actionable: Boolean(item.actionable),
        suggestedObjective: item.suggestedObjective ? String(item.suggestedObjective) : undefined,
        contemplatedAt: now,
      }))
  } catch (err) {
    console.error("[CONTEMPLATION] Failed to parse response:", err)
    return []
  }
}

function validateInsightType(
  raw: unknown,
): "CONNECTION" | "PATTERN" | "PREDICTION" | "QUESTION" | "CONTRADICTION" {
  const valid = ["CONNECTION", "PATTERN", "PREDICTION", "QUESTION", "CONTRADICTION"] as const
  const str = String(raw).toUpperCase()
  return valid.includes(str as (typeof valid)[number])
    ? (str as (typeof valid)[number])
    : "CONNECTION"
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// ── Persistence ────────────────────────────────────────────────────────────

async function saveInsights(insights: ContemplationInsight[]): Promise<void> {
  if (insights.length === 0) return

  try {
    // Load existing insights (keep last 50)
    const existing = await loadInsightsFromDB()
    const combined = [...insights, ...existing].slice(0, 50)

    await prisma.systemConfig.upsert({
      where: { key: "CONTEMPLATION_INSIGHTS" },
      create: {
        key: "CONTEMPLATION_INSIGHTS",
        value: JSON.stringify(combined),
        label: "Contemplation Engine insights (last 50)",
      },
      update: {
        value: JSON.stringify(combined),
      },
    })
  } catch (err) {
    console.error("[CONTEMPLATION] Failed to save insights:", err)
  }
}

async function loadInsightsFromDB(): Promise<ContemplationInsight[]> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "CONTEMPLATION_INSIGHTS" },
    })
    if (!config?.value) return []
    return JSON.parse(config.value) as ContemplationInsight[]
  } catch {
    return []
  }
}

/**
 * Returns recent contemplation insights from DB.
 */
export async function getRecentInsights(limit: number = 20): Promise<ContemplationInsight[]> {
  const all = await loadInsightsFromDB()
  return all.slice(0, limit)
}

// ── Actionable insight → AgentTask ─────────────────────────────────────────

async function createTasksForActionableInsights(insights: ContemplationInsight[]): Promise<void> {
  const actionable = insights.filter((i) => i.actionable && i.confidence >= 0.7)
  if (actionable.length === 0) return

  // Find the default business ID
  const biz = await prisma.systemConfig.findUnique({ where: { key: "DEFAULT_BUSINESS_ID" } })
  const businessId = biz?.value ?? "biz_jobgrade"

  for (const insight of actionable) {
    try {
      await prisma.agentTask.create({
        data: {
          businessId,
          assignedBy: "CONTEMPLATION_ENGINE",
          assignedTo: "COG",
          title: `[Contemplation] ${insight.title}`,
          description: `Insight de tip ${insight.type} descoperit prin contemplare:\n\n${insight.description}\n\nEntitati relevante: ${insight.relatedEntities.join(", ")}\nConfidence: ${insight.confidence}\nNovelty: ${insight.novelty}\n\nObiectiv sugerat: ${insight.suggestedObjective ?? "N/A"}`,
          taskType: "INVESTIGATION",
          priority: insight.confidence >= 0.9 ? "URGENT" : "NECESAR",
          tags: ["contemplation", insight.type.toLowerCase()],
          status: "ASSIGNED",
        },
      })
    } catch (err) {
      console.error("[CONTEMPLATION] Failed to create task for insight:", insight.title, err)
    }
  }
}

// ── Check if contemplation is enabled ──────────────────────────────────────

export async function isContemplationEnabled(): Promise<boolean> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "CONTEMPLATION_ENABLED" },
    })
    return config?.value === "true"
  } catch {
    return false
  }
}
