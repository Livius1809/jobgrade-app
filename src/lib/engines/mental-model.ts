/**
 * mental-model.ts — Graf semantic relational al organismului (06.05.2026)
 *
 * ARHITECTURA: Graful mental reprezinta CUM se leaga lucrurile,
 * nu doar CE lucruri exista.
 *
 * Spre deosebire de KB (fragmente izolate), modelul mental e RELATIONAL:
 *  - "Agent COG produces objectives" (PRODUCES)
 *  - "Missing KPIs block culture audit" (BLOCKS)
 *  - "High appliedCount correlates with high effectiveness" (CORRELATES)
 *
 * Un agent poate INTREBA modelul: "ce blocheaza X?" sau "ce cauzeaza Y?"
 *
 * Stocare: SystemConfig key="MENTAL_MODEL" (JSON serializat)
 * Rebuild: periodic sau la cerere prin API
 */

import { prisma } from "@/lib/prisma"
import { cpuCall } from "@/lib/cpu/gateway"

// ── Types ──────────────────────────────────────────────────────────────────

export interface MentalModelNode {
  id: string
  type: "CONCEPT" | "AGENT" | "PROCESS" | "METRIC" | "PRINCIPLE" | "CONSTRAINT"
  label: string
  description: string
  strength: number // 0-1: cat de bine stabilit e nodul
  lastUpdated: Date
}

export interface MentalModelEdge {
  from: string // node id
  to: string // node id
  relationship:
    | "CAUSES"
    | "ENABLES"
    | "BLOCKS"
    | "CORRELATES"
    | "CONTRADICTS"
    | "REQUIRES"
    | "PRODUCES"
  weight: number // 0-1: increderea in aceasta relatie
  evidence: string // de ce credem ca exista aceasta relatie
}

export interface MentalModel {
  nodes: MentalModelNode[]
  edges: MentalModelEdge[]
  lastRebuilt: Date
  version: number
  scope: "ORGANIZATIONAL" | "AGENT"
  agentRole?: string // set when scope === "AGENT"
}

export interface QueryResult {
  answer: string
  relevantNodes: MentalModelNode[]
  relevantEdges: MentalModelEdge[]
}

export interface UpdateResult {
  nodesAdded: number
  edgesAdded: number
  edgesUpdated: number
}

// ── System prompts ─────────────────────────────────────────────────────────

const REBUILD_SYSTEM_PROMPT = `Esti un analist de sisteme. Primesti cunostinte din baza de date a unui organism organizational.

Misiunea ta: EXTRAGE ENTITATI si RELATII ca sa construiesti un GRAF MENTAL.

Tipuri de noduri:
- CONCEPT: idee abstracta, domeniu, termen ("evaluare posturi", "grading", "cultura organizationala")
- AGENT: rol functional in organism ("COG", "SOA", "COCSA", "HR_COUNSELOR")
- PROCESS: flux de lucru, procedura ("onboarding", "evaluare psihometrica", "ciclu evolutie")
- METRIC: indicator masurabil ("NPS", "maturity_score", "kb_validity_avg")
- PRINCIPLE: regula sau principiu de functionare ("GDPR", "pricing per pozitie", "dialog-centric")
- CONSTRAINT: limitare sau blocaj ("lipsa date client", "buget limitat", "reglementare AI Act")

Tipuri de relatii:
- CAUSES: A provoaca/genereaza B
- ENABLES: A face posibil B
- BLOCKS: A blocheaza/impiedica B
- CORRELATES: A si B variaza impreuna (fara cauzalitate dovedita)
- CONTRADICTS: A si B se contrazic
- REQUIRES: A are nevoie de B
- PRODUCES: A produce/genereaza B

Returneaza JSON valid (fara markdown fences):
{
  "nodes": [
    {
      "id": "slug_unic",
      "type": "CONCEPT|AGENT|PROCESS|METRIC|PRINCIPLE|CONSTRAINT",
      "label": "Eticheta scurta",
      "description": "Descriere (1-2 propozitii)",
      "strength": 0.0-1.0
    }
  ],
  "edges": [
    {
      "from": "node_id_sursa",
      "to": "node_id_destinatie",
      "relationship": "CAUSES|ENABLES|BLOCKS|CORRELATES|CONTRADICTS|REQUIRES|PRODUCES",
      "weight": 0.0-1.0,
      "evidence": "de ce credem asta"
    }
  ]
}

REGULI:
- Maxim 100 noduri si 200 relatii (fii selectiv)
- Strength/weight > 0.7 doar daca evidenta e puternica
- Fiecare edge trebuie sa aiba evidence (nu inventezi)
- ID-urile nodurilor sunt slug-uri unice, consistente`

const QUERY_SYSTEM_PROMPT = `Esti un expert in navigarea grafurilor de cunostinte. Primesti un graf mental (noduri + relatii) si o intrebare.

Raspunde intrebarea traversand graful. Identifica nodurile si relatiile relevante.

Returneaza JSON valid (fara markdown fences):
{
  "answer": "raspunsul complet la intrebare",
  "relevantNodeIds": ["id1", "id2"],
  "relevantEdges": [{"from": "id1", "to": "id2", "relationship": "CAUSES"}]
}

REGULI:
- Raspunsul trebuie sa fie bazat DOAR pe datele din graf
- Daca graful nu contine informatii suficiente, spune asta explicit
- Identifica CAILE din graf care duc la raspuns (nu doar noduri izolate)`

const UPDATE_SYSTEM_PROMPT = `Esti un analist de sisteme. Primesti un graf mental EXISTENT si o CUNOSTINTA NOUA.

Misiunea ta: ACTUALIZEAZA graful cu informatia noua.

Returneaza JSON valid (fara markdown fences):
{
  "newNodes": [
    {
      "id": "slug_unic",
      "type": "CONCEPT|AGENT|PROCESS|METRIC|PRINCIPLE|CONSTRAINT",
      "label": "Eticheta",
      "description": "Descriere",
      "strength": 0.0-1.0
    }
  ],
  "newEdges": [
    {
      "from": "node_id",
      "to": "node_id",
      "relationship": "CAUSES|ENABLES|BLOCKS|CORRELATES|CONTRADICTS|REQUIRES|PRODUCES",
      "weight": 0.0-1.0,
      "evidence": "motivare"
    }
  ],
  "updatedEdges": [
    {
      "from": "node_id",
      "to": "node_id",
      "relationship": "CAUSES",
      "newWeight": 0.0-1.0,
      "reason": "de ce s-a schimbat ponderea"
    }
  ]
}

REGULI:
- NU reconstrui tot graful — doar adauga/updateaza
- Foloseste ID-uri existente pentru noduri deja in graf
- Maxim 10 noduri noi si 20 relatii noi per update`

// ── Data gathering for rebuild ─────────────────────────────────────────────

async function gatherRebuildData(): Promise<string> {
  const sections: string[] = []

  // 1. Top KB entries by effectiveness
  const kbEntries = await prisma.kBEntry.findMany({
    where: { status: "PERMANENT" },
    orderBy: [{ confidence: "desc" }, { usageCount: "desc" }],
    take: 200,
    select: {
      id: true,
      agentRole: true,
      content: true,
      kbType: true,
      confidence: true,
      tags: true,
    },
  })
  if (kbEntries.length > 0) {
    const lines = kbEntries.map(
      (e) => `[${e.agentRole}/${e.kbType}] (conf=${e.confidence.toFixed(2)}, tags=${e.tags.join(",")}) ${e.content.slice(0, 200)}`,
    )
    sections.push(`=== KB ENTRIES (${kbEntries.length}) ===\n${lines.join("\n")}`)
  }

  // 2. Agent definitions
  try {
    const agents = await (prisma as any).agentDefinition.findMany({
      take: 50,
      select: {
        agentRole: true,
        name: true,
        purpose: true,
        reportsTo: true,
        collaboratesWith: true,
      },
    })
    if (agents.length > 0) {
      const lines = agents.map(
        (a: any) =>
          `${a.agentRole}: ${a.name} — ${(a.purpose ?? "").slice(0, 150)} [reports to: ${a.reportsTo ?? "?"}]`,
      )
      sections.push(`=== AGENTI (${agents.length}) ===\n${lines.join("\n")}`)
    }
  } catch {
    // Model may not exist — skip
  }

  // 3. Organizational objectives
  const objectives = await prisma.organizationalObjective.findMany({
    where: { completedAt: null },
    take: 30,
    select: {
      code: true,
      title: true,
      description: true,
      metricName: true,
      targetValue: true,
      currentValue: true,
      direction: true,
    },
  })
  if (objectives.length > 0) {
    const lines = objectives.map(
      (o) =>
        `${o.code}: "${o.title}" metric=${o.metricName} target=${o.targetValue} current=${o.currentValue ?? "?"} dir=${o.direction}`,
    )
    sections.push(`=== OBIECTIVE ACTIVE (${objectives.length}) ===\n${lines.join("\n")}`)
  }

  // 4. Recent contemplation insights
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "CONTEMPLATION_INSIGHTS" },
    })
    if (config?.value) {
      const insights = JSON.parse(config.value) as Array<{ type: string; title: string; description: string }>
      const recent = insights.slice(0, 10)
      if (recent.length > 0) {
        const lines = recent.map((i) => `[${i.type}] ${i.title}: ${i.description.slice(0, 150)}`)
        sections.push(`=== CONTEMPLATION INSIGHTS (${recent.length}) ===\n${lines.join("\n")}`)
      }
    }
  } catch {
    // No insights yet — fine
  }

  return sections.join("\n\n")
}

// ── Rebuild ────────────────────────────────────────────────────────────────

/**
 * Rebuilds the mental model from all knowledge sources.
 * Expensive operation — should run periodically, not per-request.
 */
export async function rebuildMentalModel(): Promise<MentalModel> {
  const inputData = await gatherRebuildData()

  if (!inputData.trim()) {
    const empty: MentalModel = { nodes: [], edges: [], lastRebuilt: new Date(), version: 1, scope: "ORGANIZATIONAL" }
    await saveMentalModel(empty)
    return empty
  }

  const cpuResult = await cpuCall({
    system: REBUILD_SYSTEM_PROMPT,
    messages: [{ role: "user", content: inputData }],
    max_tokens: 8000,
    agentRole: "COG",
    operationType: "mental-model-rebuild",
    skipObjectiveCheck: true,
    skipKBFirst: true,
    temperature: 0.3, // mai deterministic pentru structura
  })

  const parsed = parseModelResponse(cpuResult.text)

  // Determine version
  const existing = await loadMentalModel()
  const version = (existing?.version ?? 0) + 1

  const model: MentalModel = {
    nodes: parsed.nodes,
    edges: parsed.edges,
    lastRebuilt: new Date(),
    version,
    scope: "ORGANIZATIONAL",
  }

  await saveMentalModel(model)
  return model
}

// ── Query ──────────────────────────────────────────────────────────────────

/**
 * Query the mental model — answers "de ce?" not just "ce?"
 */
export async function queryMentalModel(
  question: string,
  model?: MentalModel,
): Promise<QueryResult> {
  const currentModel = model ?? (await loadMentalModel())
  if (!currentModel || currentModel.nodes.length === 0) {
    return {
      answer: "Modelul mental nu a fost inca construit. Ruleaza rebuild mai intai.",
      relevantNodes: [],
      relevantEdges: [],
    }
  }

  // Compact representation for the prompt
  const modelCompact = buildCompactModelRepresentation(currentModel)

  const cpuResult = await cpuCall({
    system: QUERY_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `GRAF MENTAL:\n${modelCompact}\n\nINTREBARE: ${question}`,
      },
    ],
    max_tokens: 2000,
    agentRole: "COG",
    operationType: "mental-model-query",
    skipObjectiveCheck: true,
    skipKBFirst: true,
    temperature: 0.2,
  })

  return parseQueryResponse(cpuResult.text, currentModel)
}

// ── Incremental update ─────────────────────────────────────────────────────

/**
 * Update model incrementally (after new learning, without full rebuild).
 */
export async function updateMentalModel(newKnowledge: {
  content: string
  source: string
  agentRole: string
}): Promise<UpdateResult> {
  const currentModel = await loadMentalModel()
  if (!currentModel || currentModel.nodes.length === 0) {
    // No model yet — need full rebuild first
    return { nodesAdded: 0, edgesAdded: 0, edgesUpdated: 0 }
  }

  const modelCompact = buildCompactModelRepresentation(currentModel)

  const cpuResult = await cpuCall({
    system: UPDATE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `GRAF MENTAL CURENT:\n${modelCompact}\n\nCUNOSTINTA NOUA (sursa: ${newKnowledge.source}, agent: ${newKnowledge.agentRole}):\n${newKnowledge.content}`,
      },
    ],
    max_tokens: 3000,
    agentRole: "COG",
    operationType: "mental-model-update",
    skipObjectiveCheck: true,
    skipKBFirst: true,
    temperature: 0.3,
  })

  const delta = parseUpdateResponse(cpuResult.text)
  const now = new Date()

  // Merge new nodes
  for (const nn of delta.newNodes) {
    const existing = currentModel.nodes.find((n) => n.id === nn.id)
    if (!existing) {
      currentModel.nodes.push({ ...nn, lastUpdated: now })
    }
  }

  // Merge new edges
  for (const ne of delta.newEdges) {
    const existing = currentModel.edges.find(
      (e) => e.from === ne.from && e.to === ne.to && e.relationship === ne.relationship,
    )
    if (!existing) {
      currentModel.edges.push(ne)
    }
  }

  // Update edge weights
  for (const ue of delta.updatedEdges) {
    const edge = currentModel.edges.find(
      (e) => e.from === ue.from && e.to === ue.to && e.relationship === ue.relationship,
    )
    if (edge) {
      edge.weight = ue.newWeight
      edge.evidence = `${edge.evidence} | Updated: ${ue.reason}`
    }
  }

  currentModel.version++
  currentModel.lastRebuilt = now

  await saveMentalModel(currentModel)

  return {
    nodesAdded: delta.newNodes.length,
    edgesAdded: delta.newEdges.length,
    edgesUpdated: delta.updatedEdges.length,
  }
}

// ── Persistence ────────────────────────────────────────────────────────────

async function saveMentalModel(model: MentalModel): Promise<void> {
  const serialized = JSON.stringify(model)

  await prisma.systemConfig.upsert({
    where: { key: "MENTAL_MODEL" },
    create: {
      key: "MENTAL_MODEL",
      value: serialized,
      label: `Mental Model v${model.version} (${model.nodes.length} nodes, ${model.edges.length} edges)`,
    },
    update: {
      value: serialized,
      label: `Mental Model v${model.version} (${model.nodes.length} nodes, ${model.edges.length} edges)`,
    },
  })
}

/**
 * Load current organizational mental model from DB.
 */
export async function loadMentalModel(): Promise<MentalModel | null> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "MENTAL_MODEL" },
    })
    if (!config?.value) return null
    const model = JSON.parse(config.value) as MentalModel
    // Backward compat: old models may not have scope
    if (!model.scope) model.scope = "ORGANIZATIONAL"
    return model
  } catch {
    return null
  }
}

// ── Helper: compact representation ─────────────────────────────────────────

function buildCompactModelRepresentation(model: MentalModel): string {
  const nodeLines = model.nodes.map(
    (n) => `${n.id} [${n.type}] "${n.label}" (str=${n.strength.toFixed(2)}) — ${n.description.slice(0, 100)}`,
  )
  const edgeLines = model.edges.map(
    (e) => `${e.from} --${e.relationship}(w=${e.weight.toFixed(2)})--> ${e.to} | ${e.evidence.slice(0, 80)}`,
  )
  return `NODURI (${model.nodes.length}):\n${nodeLines.join("\n")}\n\nRELATII (${model.edges.length}):\n${edgeLines.join("\n")}`
}

// ── Parsers ────────────────────────────────────────────────────────────────

function parseModelResponse(text: string): { nodes: MentalModelNode[]; edges: MentalModelEdge[] } {
  try {
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()
    const parsed = JSON.parse(cleaned)
    const now = new Date()

    const nodes: MentalModelNode[] = (parsed.nodes ?? [])
      .filter((n: any) => n?.id && n?.type && n?.label)
      .map((n: any) => ({
        id: String(n.id),
        type: validateNodeType(n.type),
        label: String(n.label),
        description: String(n.description ?? ""),
        strength: clamp(Number(n.strength) || 0.5, 0, 1),
        lastUpdated: now,
      }))

    const nodeIds = new Set(nodes.map((n) => n.id))
    const edges: MentalModelEdge[] = (parsed.edges ?? [])
      .filter((e: any) => e?.from && e?.to && e?.relationship && nodeIds.has(e.from) && nodeIds.has(e.to))
      .map((e: any) => ({
        from: String(e.from),
        to: String(e.to),
        relationship: validateRelationship(e.relationship),
        weight: clamp(Number(e.weight) || 0.5, 0, 1),
        evidence: String(e.evidence ?? ""),
      }))

    return { nodes, edges }
  } catch (err) {
    console.error("[MENTAL MODEL] Failed to parse rebuild response:", err)
    return { nodes: [], edges: [] }
  }
}

function parseQueryResponse(text: string, model: MentalModel): QueryResult {
  try {
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()
    const parsed = JSON.parse(cleaned)

    const relevantNodeIds = new Set<string>(parsed.relevantNodeIds ?? [])
    const relevantNodes = model.nodes.filter((n) => relevantNodeIds.has(n.id))

    const rawEdges: Array<{ from: string; to: string; relationship: string }> =
      parsed.relevantEdges ?? []
    const relevantEdges = model.edges.filter((e) =>
      rawEdges.some(
        (re) => re.from === e.from && re.to === e.to && re.relationship === e.relationship,
      ),
    )

    return {
      answer: String(parsed.answer ?? "Nu am putut formula un raspuns."),
      relevantNodes,
      relevantEdges,
    }
  } catch {
    // If parsing fails, return the raw text as answer
    return {
      answer: text,
      relevantNodes: [],
      relevantEdges: [],
    }
  }
}

function parseUpdateResponse(text: string): {
  newNodes: MentalModelNode[]
  newEdges: MentalModelEdge[]
  updatedEdges: Array<{ from: string; to: string; relationship: string; newWeight: number; reason: string }>
} {
  try {
    const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()
    const parsed = JSON.parse(cleaned)
    const now = new Date()

    const newNodes: MentalModelNode[] = (parsed.newNodes ?? [])
      .filter((n: any) => n?.id && n?.type && n?.label)
      .map((n: any) => ({
        id: String(n.id),
        type: validateNodeType(n.type),
        label: String(n.label),
        description: String(n.description ?? ""),
        strength: clamp(Number(n.strength) || 0.5, 0, 1),
        lastUpdated: now,
      }))

    const newEdges: MentalModelEdge[] = (parsed.newEdges ?? [])
      .filter((e: any) => e?.from && e?.to && e?.relationship)
      .map((e: any) => ({
        from: String(e.from),
        to: String(e.to),
        relationship: validateRelationship(e.relationship),
        weight: clamp(Number(e.weight) || 0.5, 0, 1),
        evidence: String(e.evidence ?? ""),
      }))

    const updatedEdges = (parsed.updatedEdges ?? [])
      .filter((e: any) => e?.from && e?.to && e?.relationship)
      .map((e: any) => ({
        from: String(e.from),
        to: String(e.to),
        relationship: String(e.relationship),
        newWeight: clamp(Number(e.newWeight) || 0.5, 0, 1),
        reason: String(e.reason ?? ""),
      }))

    return { newNodes, newEdges, updatedEdges }
  } catch (err) {
    console.error("[MENTAL MODEL] Failed to parse update response:", err)
    return { newNodes: [], newEdges: [], updatedEdges: [] }
  }
}

// ── Validators ─────────────────────────────────────────────────────────────

function validateNodeType(
  raw: unknown,
): "CONCEPT" | "AGENT" | "PROCESS" | "METRIC" | "PRINCIPLE" | "CONSTRAINT" {
  const valid = ["CONCEPT", "AGENT", "PROCESS", "METRIC", "PRINCIPLE", "CONSTRAINT"] as const
  const str = String(raw).toUpperCase()
  return valid.includes(str as (typeof valid)[number])
    ? (str as (typeof valid)[number])
    : "CONCEPT"
}

function validateRelationship(
  raw: unknown,
): "CAUSES" | "ENABLES" | "BLOCKS" | "CORRELATES" | "CONTRADICTS" | "REQUIRES" | "PRODUCES" {
  const valid = [
    "CAUSES",
    "ENABLES",
    "BLOCKS",
    "CORRELATES",
    "CONTRADICTS",
    "REQUIRES",
    "PRODUCES",
  ] as const
  const str = String(raw).toUpperCase()
  return valid.includes(str as (typeof valid)[number])
    ? (str as (typeof valid)[number])
    : "CORRELATES"
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// ═══════════════════════════════════════════════════════════════════════════
// PER-AGENT MENTAL MODEL
// ═══════════════════════════════════════════════════════════════════════════
//
// Each agent maintains its OWN mental model of their domain.
//
// COG has a model of the organization.
// EMA has a model of evaluation processes.
// SOA has a model of client interactions.
// PROFILER has a model of human psychology.
//
// This is how each agent UNDERSTANDS their domain —
// not just what they know (KB), but HOW things relate.
// ═══════════════════════════════════════════════════════════════════════════

const AGENT_REBUILD_SYSTEM_PROMPT = `Esti un analist de sisteme specializat intr-un DOMENIU SPECIFIC al unui agent.

Primesti cunostinte din baza de date a unui agent al organismului organizational.
Construieste un GRAF MENTAL focusat pe DOMENIUL acestui agent.

Acelasi format ca la modelul organizational — dar focusat pe un singur domeniu:
- Ce concepte sunt centrale in acest domeniu?
- Ce procese conduce/participă acest agent?
- Ce metrici monitorizează?
- Ce principii și constrângeri guvernează domeniul?
- Cum se leagă elementele din domeniu între ele?

Returneaza JSON valid (fara markdown fences):
{
  "nodes": [
    {
      "id": "slug_unic",
      "type": "CONCEPT|AGENT|PROCESS|METRIC|PRINCIPLE|CONSTRAINT",
      "label": "Eticheta scurta",
      "description": "Descriere (1-2 propozitii)",
      "strength": 0.0-1.0
    }
  ],
  "edges": [
    {
      "from": "node_id_sursa",
      "to": "node_id_destinatie",
      "relationship": "CAUSES|ENABLES|BLOCKS|CORRELATES|CONTRADICTS|REQUIRES|PRODUCES",
      "weight": 0.0-1.0,
      "evidence": "de ce credem asta"
    }
  ]
}

REGULI:
- Maxim 50 noduri si 100 relatii (domeniu focusat, nu tot organismul)
- Include si nodurile de INTERACTIUNE cu alte domenii (vecinii acestui agent)
- Strength/weight > 0.7 doar daca evidenta e puternica
- Fiecare edge trebuie sa aiba evidence`

/**
 * Gather data specific to a single agent's domain for its mental model.
 */
async function gatherAgentRebuildData(agentRole: string): Promise<string> {
  const sections: string[] = []

  // 1. Agent's own KB entries
  const kbEntries = await prisma.kBEntry.findMany({
    where: {
      status: "PERMANENT",
      OR: [
        { agentRole },
        // Include shared L1/L2 knowledge
        { agentRole: { in: ["L1", "L2", "SHARED"] } },
      ],
    },
    orderBy: [{ confidence: "desc" }, { usageCount: "desc" }],
    take: 100,
    select: {
      id: true,
      agentRole: true,
      content: true,
      kbType: true,
      confidence: true,
      tags: true,
    },
  })
  if (kbEntries.length > 0) {
    const lines = kbEntries.map(
      (e) => `[${e.agentRole}/${e.kbType}] (conf=${e.confidence.toFixed(2)}) ${e.content.slice(0, 200)}`,
    )
    sections.push(`=== KB ENTRIES pt ${agentRole} (${kbEntries.length}) ===\n${lines.join("\n")}`)
  }

  // 2. Agent's task results (how it performs)
  const taskResults = await prisma.agentTask.findMany({
    where: { assignedTo: agentRole, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    take: 30,
    select: {
      title: true,
      taskType: true,
      result: true,
      tags: true,
      completedAt: true,
    },
  })
  if (taskResults.length > 0) {
    const lines = taskResults.map(
      (t) => `[${t.taskType}] "${t.title}" → ${(t.result ?? "").slice(0, 150)}`,
    )
    sections.push(`=== TASK RESULTS pt ${agentRole} (${taskResults.length}) ===\n${lines.join("\n")}`)
  }

  // 3. Agent's metrics (via ExecutionTelemetry as performance proxy)
  try {
    const telemetry = await prisma.executionTelemetry.findMany({
      where: { agentRole },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        taskType: true,
        modelUsed: true,
        kbHit: true,
        durationMs: true,
        createdAt: true,
      },
    })
    if (telemetry.length > 0) {
      const lines = telemetry.map(
        (t) =>
          `${t.taskType ?? "?"} model=${t.modelUsed} kb=${t.kbHit} dur=${t.durationMs}ms (${t.createdAt.toISOString().slice(0, 10)})`,
      )
      sections.push(`=== TELEMETRIE pt ${agentRole} (${telemetry.length}) ===\n${lines.join("\n")}`)
    }
  } catch {
    // Telemetry model may not exist — skip
  }

  // 4. Agent's learning artifacts
  const artifacts = await prisma.learningArtifact.findMany({
    where: {
      OR: [{ studentRole: agentRole }, { teacherRole: agentRole }],
      validated: true,
    },
    orderBy: { effectivenessScore: "desc" },
    take: 15,
    select: {
      rule: true,
      problemClass: true,
      antiPattern: true,
      effectivenessScore: true,
    },
  })
  if (artifacts.length > 0) {
    const lines = artifacts.map(
      (a) => `[prob=${a.problemClass}] Regula: ${a.rule.slice(0, 150)} ${a.antiPattern ? `Anti: ${a.antiPattern.slice(0, 80)}` : ""}`,
    )
    sections.push(`=== LEARNING ARTIFACTS pt ${agentRole} (${artifacts.length}) ===\n${lines.join("\n")}`)
  }

  // 5. Agent definition (purpose, collaborations)
  try {
    const agentDef = await (prisma as any).agentDefinition.findUnique({
      where: { agentRole },
      select: {
        name: true,
        purpose: true,
        reportsTo: true,
        collaboratesWith: true,
        skills: true,
      },
    })
    if (agentDef) {
      sections.push(
        `=== DEFINITIE AGENT ===\n${agentRole}: ${agentDef.name}\nScop: ${agentDef.purpose ?? "?"}\nRaporteaza la: ${agentDef.reportsTo ?? "?"}\nColaboreaza cu: ${(agentDef.collaboratesWith ?? []).join(", ")}\nSkills: ${(agentDef.skills ?? []).join(", ")}`,
      )
    }
  } catch {
    // Model may not exist
  }

  return sections.join("\n\n")
}

/**
 * Rebuild a per-agent mental model from the agent's own knowledge sources.
 *
 * Uses only:
 * - KB entries for that agent (+ shared L1/L2)
 * - Task results for that agent
 * - Metrics for that agent
 * - Learning artifacts for that agent
 *
 * Produces a focused model of THEIR domain.
 * Stored in SystemConfig with key `MENTAL_MODEL_${agentRole}`.
 */
export async function rebuildAgentMentalModel(agentRole: string): Promise<MentalModel> {
  const inputData = await gatherAgentRebuildData(agentRole)

  if (!inputData.trim()) {
    const empty: MentalModel = {
      nodes: [], edges: [], lastRebuilt: new Date(), version: 1,
      scope: "AGENT", agentRole,
    }
    await saveAgentMentalModel(agentRole, empty)
    return empty
  }

  const cpuResult = await cpuCall({
    system: AGENT_REBUILD_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Construieste modelul mental al agentului ${agentRole}.\n\n${inputData}`,
      },
    ],
    max_tokens: 5000,
    agentRole,
    operationType: "agent-mental-model-rebuild",
    skipObjectiveCheck: true,
    skipKBFirst: true,
    temperature: 0.3,
  })

  const parsed = parseModelResponse(cpuResult.text)

  const existing = await loadAgentMentalModel(agentRole)
  const version = (existing?.version ?? 0) + 1

  const model: MentalModel = {
    nodes: parsed.nodes,
    edges: parsed.edges,
    lastRebuilt: new Date(),
    version,
    scope: "AGENT",
    agentRole,
  }

  await saveAgentMentalModel(agentRole, model)
  return model
}

/**
 * Query the agent's own mental model.
 * Answers domain-specific questions: "de ce?" not just "ce?"
 */
export async function queryAgentMentalModel(
  agentRole: string,
  question: string,
): Promise<QueryResult> {
  const model = await loadAgentMentalModel(agentRole)
  if (!model || model.nodes.length === 0) {
    return {
      answer: `Modelul mental al agentului ${agentRole} nu a fost inca construit. Ruleaza rebuildAgentMentalModel('${agentRole}') mai intai.`,
      relevantNodes: [],
      relevantEdges: [],
    }
  }

  const modelCompact = buildCompactModelRepresentation(model)

  const cpuResult = await cpuCall({
    system: QUERY_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `GRAF MENTAL al agentului ${agentRole}:\n${modelCompact}\n\nINTREBARE: ${question}`,
      },
    ],
    max_tokens: 2000,
    agentRole,
    operationType: "agent-mental-model-query",
    skipObjectiveCheck: true,
    skipKBFirst: true,
    temperature: 0.2,
  })

  return parseQueryResponse(cpuResult.text, model)
}

/**
 * Incrementally update an agent's mental model with new knowledge.
 */
export async function updateAgentMentalModel(
  agentRole: string,
  newKnowledge: { content: string; source: string },
): Promise<UpdateResult> {
  const currentModel = await loadAgentMentalModel(agentRole)
  if (!currentModel || currentModel.nodes.length === 0) {
    return { nodesAdded: 0, edgesAdded: 0, edgesUpdated: 0 }
  }

  const modelCompact = buildCompactModelRepresentation(currentModel)

  const cpuResult = await cpuCall({
    system: UPDATE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `GRAF MENTAL CURENT al agentului ${agentRole}:\n${modelCompact}\n\nCUNOSTINTA NOUA (sursa: ${newKnowledge.source}, agent: ${agentRole}):\n${newKnowledge.content}`,
      },
    ],
    max_tokens: 3000,
    agentRole,
    operationType: "agent-mental-model-update",
    skipObjectiveCheck: true,
    skipKBFirst: true,
    temperature: 0.3,
  })

  const delta = parseUpdateResponse(cpuResult.text)
  const now = new Date()

  for (const nn of delta.newNodes) {
    const existing = currentModel.nodes.find((n) => n.id === nn.id)
    if (!existing) {
      currentModel.nodes.push({ ...nn, lastUpdated: now })
    }
  }

  for (const ne of delta.newEdges) {
    const existing = currentModel.edges.find(
      (e) => e.from === ne.from && e.to === ne.to && e.relationship === ne.relationship,
    )
    if (!existing) {
      currentModel.edges.push(ne)
    }
  }

  for (const ue of delta.updatedEdges) {
    const edge = currentModel.edges.find(
      (e) => e.from === ue.from && e.to === ue.to && e.relationship === ue.relationship,
    )
    if (edge) {
      edge.weight = ue.newWeight
      edge.evidence = `${edge.evidence} | Updated: ${ue.reason}`
    }
  }

  currentModel.version++
  currentModel.lastRebuilt = now

  await saveAgentMentalModel(agentRole, currentModel)

  return {
    nodesAdded: delta.newNodes.length,
    edgesAdded: delta.newEdges.length,
    edgesUpdated: delta.updatedEdges.length,
  }
}

// ── Per-agent persistence ─────────────────────────────────────────────────

async function saveAgentMentalModel(agentRole: string, model: MentalModel): Promise<void> {
  const key = `MENTAL_MODEL_${agentRole}`
  const serialized = JSON.stringify(model)

  await prisma.systemConfig.upsert({
    where: { key },
    create: {
      key,
      value: serialized,
      label: `Mental Model [${agentRole}] v${model.version} (${model.nodes.length} nodes, ${model.edges.length} edges)`,
    },
    update: {
      value: serialized,
      label: `Mental Model [${agentRole}] v${model.version} (${model.nodes.length} nodes, ${model.edges.length} edges)`,
    },
  })
}

/**
 * Load a per-agent mental model from DB.
 */
export async function loadAgentMentalModel(agentRole: string): Promise<MentalModel | null> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: `MENTAL_MODEL_${agentRole}` },
    })
    if (!config?.value) return null
    return JSON.parse(config.value) as MentalModel
  } catch {
    return null
  }
}
