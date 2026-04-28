/**
 * task-executor.ts — Execută AgentTask-uri ASSIGNED cu Claude.
 *
 * Livrat: 10.04.2026, Increment E2E-1 — "metabolism" organismului viu.
 *
 * Responsabilitate:
 *  - Ia un AgentTask status=ASSIGNED
 *  - Load context: obiectiv părinte + KB entries + agent identity
 *  - Build prompt cu identitatea agentului + descrierea taskului + constrângeri output
 *  - Invocă Claude sonnet-4 cu structured output
 *  - Parsează răspuns: {status, result, subtasks?, blockers?}
 *  - Aplică efecte: creează sub-tasks, update task status, scrie lifecycle
 *
 * V1 scope:
 *  - Zero tool use (Claude produce text structurat)
 *  - Zero retry la erori
 *  - Fără aggregare automată (sub-tasks executate independent în rulări viitoare)
 *
 * Tipuri de taskuri:
 *  - "decompose" → taskul produce sub-tasks, own task COMPLETED cu listă ID-uri
 *  - "execute"   → taskul produce un artefact text, own task COMPLETED cu result
 *  - "blocked"   → taskul nu poate fi executat acum, BLOCKED cu motiv
 */

import Anthropic from "@anthropic-ai/sdk"
import { prisma } from "@/lib/prisma"
import { buildAgentPrompt } from "./agent-prompt-builder"
import { getManagerConfig } from "./agent-registry"

// Model selection: Sonnet for CRITICAL tasks, Haiku for the rest (4-5x cheaper)
const MODEL_SONNET = "claude-sonnet-4-20250514"
const MODEL_HAIKU = "claude-haiku-4-5-20251001"

function selectModel(priority: string | null): string {
  return priority === "CRITICAL" ? MODEL_SONNET : MODEL_HAIKU
}

// ── Strategic roles get live system status injected into their prompt ──────────
const STRATEGIC_ROLES = new Set(["COG", "COA", "COCSA", "PMA"])

async function getSystemStatusForPrompt(): Promise<string> {
  try {
    const now = new Date()
    const h24 = new Date(now.getTime() - 24 * 3600000)

    const [tasksByStatus, kbTotal, kbLast24h, disfOpen, cycleCount, agentCount, signalsPending] =
      await Promise.all([
        prisma.agentTask.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.kBEntry.count(),
        prisma.kBEntry.count({ where: { createdAt: { gte: h24 } } }),
        prisma.disfunctionEvent.count({ where: { status: { in: ["OPEN", "REMEDIATING", "ESCALATED"] } } }),
        prisma.cycleLog.count({ where: { createdAt: { gte: h24 } } }),
        prisma.agentDefinition.count({ where: { isActive: true } }),
        prisma.externalSignal.count({ where: { processedAt: null } }),
      ])

    const statusMap: Record<string, number> = {}
    for (const s of tasksByStatus) statusMap[s.status] = s._count._all
    const total = Object.values(statusMap).reduce((a, b) => a + b, 0)
    const completed = statusMap["COMPLETED"] || 0
    const failed = statusMap["FAILED"] || 0
    const blocked = statusMap["BLOCKED"] || 0
    const rate = total > 0 ? Math.round((completed / (completed + failed + blocked || 1)) * 100) : 0

    return `
═══ STARE REALĂ ORGANISM (live din DB — ${now.toISOString().slice(0, 16)}) ═══
Platform: OPERATIONAL | https://jobgrade.ro
Agenți activi: ${agentCount}
Tasks: ${total} total | COMPLETED ${completed} | FAILED ${failed} | BLOCKED ${blocked} | Succes rate: ${rate}%
KB entries: ${kbTotal} (${kbLast24h > 0 ? "+" + kbLast24h : "0"} ultimele 24h)
Cicluri proactive/24h: ${cycleCount}
Disfuncții OPEN: ${disfOpen}
Signals pending: ${signalsPending}
IMPORTANT: Aceste date sunt LIVE din DB, nu din KB static. Folosește-le ca sursă de adevăr.

BUGET OPERAȚIONAL:
${await getBudgetSummary()}

ACȚIUNI OPERAȚIONALE DISPONIBILE (doar COG/COA/COCSA):
Dacă decizi că un parametru operațional trebuie ajustat, include în output:
  ACTION: SET_CONFIG key=SIGNAL_FILTER_LEVEL value=critical reason="prea multe semnale irelevante"
  ACTION: SET_CONFIG key=EXECUTOR_BATCH_SIZE value=3 reason="reducem încărcarea API"
  ACTION: SET_CONFIG key=PROACTIVE_CYCLE_INTERVAL value=30 reason="interval mai mare pentru economie"
Valori valide: SIGNAL_FILTER_LEVEL (critical/focused/broad/full), EXECUTOR_BATCH_SIZE (1-10), PROACTIVE_CYCLE_INTERVAL (5-120 min).
Acțiunile sunt executate AUTOMAT după completarea task-ului. NU poți opri executorul (doar Owner).
NOTIFICĂRI OWNER: Poți trimite mesaje direct Owner-ului care vor apărea pe dashboard-ul său:
  ACTION: NOTIFY_OWNER title="Subiectul mesajului" body="Conținutul complet al mesajului"
Folosește pentru: rapoarte, propuneri care necesită aprobare, alerte importante, întrebări strategice.
BUGET: Poți actualiza cheltuielile reale pe categorii:
  ACTION: ADJUST_BUDGET category=API_AI month=2026-07 actual=1500 reason="consum Claude API luna iulie"
Categorii valide: INFRA, API_AI, MARKETING, PERSONAL, REVENUE, DIVERSE.
ACCES COD SURSĂ (doar COA/COG): Poți interoga codul platformei direct:
  ACTION: CODE_QUERY action="capabilities"
  ACTION: CODE_QUERY action="check-route" routePath="/api/v1/jobs"
  ACTION: CODE_QUERY action="search" pattern="evaluare" directory="src/lib"
  ACTION: CODE_QUERY action="read-file" filePath="src/lib/pricing.ts"
  ACTION: CODE_QUERY action="schema-model" modelName="Job"
  ACTION: CODE_QUERY action="list-files" directory="src/app/api/v1"
Folosește pentru: verificare fezabilitate, existență feature, configurare, răspuns la întrebări tehnice.
TESTARE API (COA/QAA/QLA/SQA): Poți testa endpoint-urile platformei direct:
  ACTION: API_TEST method="GET" path="/api/v1/jobs" expectedStatus=200
  ACTION: API_TEST method="POST" path="/api/v1/sessions" body="{}" expectedStatus=400
  ACTION: API_TEST method="GET" path="/api/v1/company/maturity" expectedStatus=200 expectedContains="level"
Rezultatul include: status, timp răspuns, verificări (status/contains/JSON/time), preview body.
Dacă testul FAIL → creează ticket cu detalii. Folosește pentru E2E testing, smoke tests, verificare după deploy.
═══════════════════════════════════════════════════════════════════════════════
`
  } catch {
    return "\n[System status unavailable — DB query failed]\n"
  }
}
async function getBudgetSummary(): Promise<string> {
  try {
    const now = new Date()
    const year = now.getFullYear()
    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year + 1, 0, 1)

    const lines = await (prisma as any).budgetLine.findMany({
      where: { businessId: "biz_jobgrade", month: { gte: startDate, lt: endDate } },
      orderBy: [{ month: "asc" }],
    })

    if (lines.length === 0) return "Nicio linie bugetară definită pentru " + year + ". Propune un buget Owner-ului prin ACTION: NOTIFY_OWNER."

    // Revenue tracking
    const revenueCount = await (prisma as any).revenueEntry.count().catch(() => 0)
    const revenueTotal = revenueCount > 0
      ? await (prisma as any).revenueEntry.aggregate({ _sum: { amount: true } }).then((r: any) => Number(r._sum?.amount || 0)).catch(() => 0)
      : 0

    let totalPlanned = 0, totalActual = 0
    const byCat: Record<string, { p: number; a: number }> = {}
    for (const l of lines) {
      const p = Number(l.planned), a = Number(l.actual)
      totalPlanned += p; totalActual += a
      if (!byCat[l.category]) byCat[l.category] = { p: 0, a: 0 }
      byCat[l.category].p += p; byCat[l.category].a += a
    }

    const variance = totalPlanned > 0 ? Math.round((totalActual - totalPlanned) / totalPlanned * 100) : 0
    const catLines = Object.entries(byCat).map(([c, v]) => `  ${c}: planificat ${v.p} RON, realizat ${v.a} RON`).join("\n")

    const revenueInfo = revenueTotal > 0 ? `\nVenituri totale: ${revenueTotal} RON (${revenueCount} tranzacții)` : ""
    const alert = Math.abs(variance) > 10 ? `\n⚠️ ALERTĂ: Variance ${variance}% depășește pragul de 10%! Notifică Owner-ul.` : ""

    return `Buget ${year}: planificat ${totalPlanned} RON, realizat ${totalActual} RON, variance ${variance}%\n${catLines}${revenueInfo}${alert}`
  } catch {
    return "Buget: date indisponibile"
  }
}

const MAX_SUB_TASKS = 5  // reduced de la 10 — previne cascada
const MAX_TASKS_PER_AGENT_PER_HOUR = 10 // rate limit generare task-uri

async function checkTaskRateLimit(agentRole: string): Promise<boolean> {
  try {
    const oneHourAgo = new Date(Date.now() - 3600000)
    const recentCount = await (prisma as any).agentTask.count({
      where: { assignedBy: agentRole, createdAt: { gte: oneHourAgo } },
    })
    if (recentCount >= MAX_TASKS_PER_AGENT_PER_HOUR) {
      console.log(`[executor] Rate limit: ${agentRole} a creat ${recentCount} task-uri in ultima ora (max ${MAX_TASKS_PER_AGENT_PER_HOUR})`)
      return false // blocat
    }
    return true // ok
  } catch {
    return true // fallback permisiv
  }
}

// Mapping pentru blocker types returnate de LLM → enum BlockerType valid în DB
const BLOCKER_TYPE_MAP: Record<string, string> = {
  DEPENDENCY: "DEPENDENCY",
  WAITING_INPUT: "WAITING_INPUT",
  WAITING_OWNER: "WAITING_OWNER",
  EXTERNAL: "EXTERNAL",
  RESOURCE: "RESOURCE",
  TECHNICAL: "TECHNICAL",
  UNCLEAR_SCOPE: "UNCLEAR_SCOPE",
  // Aliasuri comune returnate de LLM
  MISSING_INFO: "WAITING_INPUT",
  MISSING_RESOURCE: "RESOURCE",
  MISSING_CAPABILITY: "TECHNICAL",
  CAPABILITY: "TECHNICAL",
  CLARIFICATION: "UNCLEAR_SCOPE",
  INPUT: "WAITING_INPUT",
  OWNER: "WAITING_OWNER",
}

function normalizeBlockerType(raw?: string): string {
  if (!raw) return "UNCLEAR_SCOPE"
  const up = raw.toUpperCase().replace(/\s+/g, "_")
  return BLOCKER_TYPE_MAP[up] || "UNCLEAR_SCOPE"
}

export interface ExecutorResult {
  taskId: string
  outcome: "COMPLETED" | "BLOCKED" | "FAILED"
  result?: string
  subTasksCreated?: number
  subTaskIds?: string[]
  blockerDescription?: string
  failureReason?: string
  durationMs: number
  tokensUsed?: { input: number; output: number }
  webSearchCount?: number
}

interface ExecutorPayload {
  status: "completed" | "blocked" | "needs-subtasks"
  summary: string
  result?: string
  subTasks?: Array<{
    assignedTo: string
    title: string
    description: string
    taskType: string
    priority?: string
    tags?: string[]
    estimatedMinutes?: number
  }>
  blocker?: {
    type: string
    description: string
  }
}

// ─── Context loading ──────────────────────────────────────────────────────────

async function loadTaskContext(taskId: string) {
  const task = await (prisma as any).agentTask.findUnique({
    where: { id: taskId },
  })
  if (!task) throw new Error(`Task ${taskId} not found`)
  if (task.status !== "ASSIGNED" && task.status !== "ACCEPTED") {
    throw new Error(`Task ${taskId} has status ${task.status}, nu ASSIGNED/ACCEPTED`)
  }

  let objective: any = null
  if (task.objectiveId) {
    objective = await (prisma as any).organizationalObjective.findUnique({
      where: { id: task.objectiveId },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        metricName: true,
        targetValue: true,
        deadlineAt: true,
        ownerRoles: true,
        contributorRoles: true,
        tags: true,
      },
    })
  }

  // KB entries relevante — top 5 ultimele pentru rolul agentului
  const kbEntries = await (prisma as any).kBEntry
    .findMany({
      where: { agentRole: task.assignedTo, status: "PERMANENT" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { content: true, tags: true, kbType: true },
    })
    .catch(() => [])

  // Sibling tasks — alte taskuri COMPLETED din același obiectiv.
  // Esențial pentru dependențe: CWA are nevoie de output-ul MKA/CIA.
  let siblingResults: Array<{
    assignedTo: string
    title: string
    result: string
  }> = []
  if (task.objectiveId) {
    const siblings = await (prisma as any).agentTask
      .findMany({
        where: {
          objectiveId: task.objectiveId,
          status: "COMPLETED",
          id: { not: task.id },
          result: { not: null },
        },
        orderBy: { completedAt: "asc" },
        select: { assignedTo: true, title: true, result: true },
      })
      .catch(() => [])
    siblingResults = siblings
  }

  return { task, objective, kbEntries, siblingResults }
}

// ─── Prompt building ──────────────────────────────────────────────────────────

async function buildSystemForExecutor(
  role: string,
  description: string,
  taskId?: string,
  taskTitle?: string,
  taskDescription?: string,
): Promise<string> {
  const liveStatus = STRATEGIC_ROLES.has(role) ? await getSystemStatusForPrompt() : ""

  // ── CONȘTIINȚĂ DE SINE — context cognitiv injectat per agent ──
  let cognitiveSection = ""
  try {
    const { buildCognitiveContext, formatCognitivePromptSection } = await import("./cognitive-injection")
    const ctx = await buildCognitiveContext(role, taskId || "", taskTitle || "", taskDescription || "")
    cognitiveSection = formatCognitivePromptSection(ctx)
  } catch {
    // Fallback graceful — agentul funcționează și fără conștiință
  }

  return buildAgentPrompt(role, description, {
    includeSystemPrompt: true,
    additionalContext: `${liveStatus}${cognitiveSection}
═══ MOD EXECUȚIE TASK ═══

Ești invocat pentru a EXECUTA un task concret. Foloseşte tool-ul "submit_task_result" pentru a returna rezultatul.

CUM ALEGI STATUS:
- "needs-subtasks" — dacă taskul e de decompunere (conține "DECOMPUNE + DELEGĂ" sau similar). Returnează array subTasks (3-${MAX_SUB_TASKS} intrări). NU încerca tu munca sub-taskurilor.
- "completed" — dacă poți produce artefactul cerut. Pune output-ul complet în câmpul "result" (markdown permis, text lung permis, caractere speciale permise).
- "blocked" — dacă NU ai destul context sau resurse. Completează "blocker.type" și "blocker.description" explicit. NU inventa.

REGULI DE CALITATE:
1. result-ul trebuie să fie COMPLET, autonom, review-abil de Owner — nu "schiță", "draft preliminar" etc.
2. Output în română (limba de lucru a platformei).
3. Ton natural RO — fără superlative americane ("amazing", "perfect", "incredible", etc.).
4. Pentru sub-taskuri de decompunere: minim 3, maxim ${MAX_SUB_TASKS}. Fiecare sub-task trebuie să fie concret, atomic, executabil independent cu output clar.
5. Dacă primești rezultate din "taskuri sibling" în context, FOLOSEȘTE-le ca input real — nu le ignora, nu le redupli.
6. Fără virgulă înainte de "și" în română.

REGULI ABSOLUTE (încălcarea = task REJECTED):
7. ZERO ENGLEZISME — scrie TOTUL în română. NU folosi: stakeholders (→ părți interesate), quick wins (→ câștiguri rapide), pipeline (→ flux/canal), ROI (→ randament), framework (→ cadru), engagement (→ implicare), awareness (→ notorietate), outreach (→ contactare), feedback (→ reacție/evaluare), benchmark (→ reper), deadline (→ termen limită), follow-up (→ urmărire), onboarding (→ integrare). Dacă un termen tehnic nu are echivalent RO consacrat, pune-l între ghilimele la prima folosire cu explicație.
8. ZERO INFORMAȚII INVENTATE — NU inventa credențiale, CV-uri, studii de caz, testimoniale, cifre statistice sau nume de companii/persoane. Dacă nu ai date REALE din KB, spune explicit "date necunoscute" sau "de completat cu date reale". MAI BINE o propoziție onestă decât un paragraf inventat. Compania noastră e Psihobusiness Consulting SRL — NU inventa experiențe de la McKinsey, Deloitte sau alte firme.
9. TON ONEST, PAS CU PAS — nu vorbe umflate. Nu promitem "transformare completă" sau "rezultate garantate". Promitem: "încercați și vedeți". Filozofia: "foamea vine mâncând" — invităm clientul să testeze, nu îl copleșim cu superlative. Construim reputația pe fapte, nu pe afirmații.

Apelează ÎNTOTDEAUNA tool-ul submit_task_result. Niciun răspuns text în afara tool-ului.
`,
  })
}

function buildUserMessage(ctx: {
  task: any
  objective: any
  kbEntries: any[]
  siblingResults: Array<{ assignedTo: string; title: string; result: string }>
}): string {
  const lines: string[] = []
  lines.push(`# TASK DE EXECUTAT`)
  lines.push(``)
  lines.push(`**ID:** ${ctx.task.id}`)
  lines.push(`**Titlu:** ${ctx.task.title}`)
  lines.push(`**Asignat de:** ${ctx.task.assignedBy}`)
  lines.push(`**Tip:** ${ctx.task.taskType}`)
  lines.push(`**Prioritate:** ${ctx.task.priority}`)
  if (ctx.task.deadlineAt) lines.push(`**Deadline:** ${new Date(ctx.task.deadlineAt).toISOString()}`)
  lines.push(`**Tags:** ${(ctx.task.tags || []).join(", ") || "—"}`)
  lines.push(``)
  lines.push(`## Descriere completă`)
  lines.push(ctx.task.description)

  if (ctx.objective) {
    lines.push(``)
    lines.push(`## Obiectiv părinte`)
    lines.push(`**Code:** ${ctx.objective.code}`)
    lines.push(`**Titlu:** ${ctx.objective.title}`)
    lines.push(`**Metric:** ${ctx.objective.metricName} (target: ${ctx.objective.targetValue})`)
    if (ctx.objective.deadlineAt) {
      lines.push(`**Deadline obiectiv:** ${new Date(ctx.objective.deadlineAt).toISOString()}`)
    }
    lines.push(`**Owners:** ${(ctx.objective.ownerRoles || []).join(", ")}`)
    lines.push(`**Contributors:** ${(ctx.objective.contributorRoles || []).join(", ")}`)
    lines.push(``)
    lines.push(`### Context obiectiv`)
    lines.push(ctx.objective.description)
  }

  if (ctx.kbEntries && ctx.kbEntries.length > 0) {
    lines.push(``)
    lines.push(`## KB entries relevante (top ${ctx.kbEntries.length})`)
    for (const e of ctx.kbEntries) {
      const preview = (e.content || "").slice(0, 300)
      lines.push(`- [${e.kbType || "?"}] tags=${(e.tags || []).join(",") || "—"}`)
      lines.push(`  ${preview}${(e.content || "").length > 300 ? "..." : ""}`)
    }
  }

  if (ctx.siblingResults && ctx.siblingResults.length > 0) {
    lines.push(``)
    lines.push(`## Rezultate din taskuri sibling (același obiectiv)`)
    lines.push(`Acestea sunt outputuri COMPLETATE de alți agenți pe același obiectiv. Folosește-le ca input real.`)
    lines.push(``)
    for (const s of ctx.siblingResults) {
      lines.push(`### [${s.assignedTo}] ${s.title}`)
      lines.push("```")
      // Limit per sibling ca să nu explodăm context (4000 chars ≈ ~1000 tokens per sibling)
      lines.push(s.result.slice(0, 4000))
      if (s.result.length > 4000) lines.push(`... [truncated from ${s.result.length} chars]`)
      lines.push("```")
      lines.push(``)
    }
  }

  lines.push(``)
  lines.push(`Execută taskul conform instrucțiunilor din system prompt. Returnează JSON valid.`)

  return lines.join("\n")
}

// ─── LLM invocation + parse ───────────────────────────────────────────────────

// JSON schema pentru tool — garantează output structurat valid fără riscuri de parsing
const SUBMIT_TASK_RESULT_SCHEMA = {
  type: "object" as const,
  properties: {
    status: {
      type: "string",
      enum: ["completed", "blocked", "needs-subtasks"],
      description:
        "completed = task executat cu success, result obligatoriu. blocked = nu poți continua, blocker obligatoriu. needs-subtasks = taskul cere decompunere, subTasks obligatoriu.",
    },
    summary: {
      type: "string",
      description: "1-2 propoziții — ce ai făcut sau ce blochează",
    },
    result: {
      type: "string",
      description:
        "Artefactul complet produs (obligatoriu dacă status=completed). Markdown permis, fără restricții de caractere speciale.",
    },
    subTasks: {
      type: "array",
      description: "Sub-taskuri de delegat (obligatoriu dacă status=needs-subtasks). Între 3 și 10.",
      items: {
        type: "object",
        properties: {
          assignedTo: { type: "string", description: "Rolul executor (ex: CIA, MKA, CWA)" },
          title: { type: "string", description: "Titlu scurt imperativ" },
          description: { type: "string", description: "Descriere completă cu criterii acceptare" },
          taskType: {
            type: "string",
            enum: [
              "KB_RESEARCH",
              "KB_VALIDATION",
              "DATA_ANALYSIS",
              "CONTENT_CREATION",
              "PROCESS_EXECUTION",
              "REVIEW",
              "INVESTIGATION",
              "OUTREACH",
            ],
          },
          priority: { type: "string", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
          tags: { type: "array", items: { type: "string" } },
          estimatedMinutes: { type: "number" },
        },
        required: ["assignedTo", "title", "description", "taskType"],
      },
    },
    blocker: {
      type: "object",
      description: "Detalii blocaj (obligatoriu dacă status=blocked)",
      properties: {
        type: {
          type: "string",
          enum: [
            "DEPENDENCY",
            "WAITING_INPUT",
            "WAITING_OWNER",
            "EXTERNAL",
            "RESOURCE",
            "TECHNICAL",
            "UNCLEAR_SCOPE",
          ],
        },
        description: { type: "string" },
      },
      required: ["type", "description"],
    },
  },
  required: ["status", "summary"],
}

// Decide dacă un task are nevoie de web search activat.
// Opt-in pe taskType + tags, nu pe toate (cost control).
function needsWebSearch(task: any): boolean {
  const researchTypes = ["KB_RESEARCH", "INVESTIGATION", "DATA_ANALYSIS", "OUTREACH"]
  if (researchTypes.includes(task.taskType)) return true
  const tags = task.tags || []
  if (tags.some((t: string) => /research|web|external|outreach|decision.?maker|firm/i.test(t))) return true
  // Keywords în title/description
  const text = `${task.title || ""} ${task.description || ""}`.toLowerCase()
  if (/research|identific|găs|web|online|linkedin|site|extern|firme|decision maker/.test(text)) return true
  return false
}

async function invokeLLM(
  system: string,
  userMessage: string,
  task: any,
): Promise<{
  payload: ExecutorPayload
  tokensUsed: { input: number; output: number }
  webSearchCount: number
}> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const useWebSearch = needsWebSearch(task)
  const tools: any[] = [
    {
      name: "submit_task_result",
      description:
        "Submit the final result of executing this task. Call this when you have produced the artefact, identified a blocker, or decomposed into sub-tasks.",
      input_schema: SUBMIT_TASK_RESULT_SCHEMA as any,
    },
  ]
  if (useWebSearch) {
    tools.push({
      type: "web_search_20250305",
      name: "web_search",
      max_uses: 5,
    })
  }

  // Multi-turn: Claude poate face web_search server-side (transparent în același call),
  // dar dacă nu apelează submit_task_result în primul răspuns, loop cu prompt follow-up.
  const messages: any[] = [{ role: "user", content: userMessage }]
  let totalInput = 0
  let totalOutput = 0
  let webSearchCount = 0

  for (let turn = 0; turn < 3; turn++) {
    const response = await client.messages.create({
      model: selectModel(task.priority),
      max_tokens: 8192,
      system,
      tools,
      // Primul turn: auto (Claude decide). Turele următoare: forțează submit.
      tool_choice:
        turn === 0
          ? ({ type: "auto" } as any)
          : ({ type: "tool", name: "submit_task_result" } as any),
      messages,
    })

    totalInput += response.usage?.input_tokens || 0
    totalOutput += response.usage?.output_tokens || 0

    // Numără web searches efectuate (visible în content blocks)
    for (const b of response.content as any[]) {
      if (b.type === "server_tool_use" && b.name === "web_search") webSearchCount++
    }

    // Caută submit_task_result tool_use (client-side tool, apărut în content)
    const submitBlock = (response.content as any[]).find(
      (b: any) => b.type === "tool_use" && b.name === "submit_task_result",
    )
    if (submitBlock && submitBlock.input) {
      const payload = submitBlock.input as ExecutorPayload
      if (!payload.status) throw new Error(`Payload fără 'status'`)
      return {
        payload,
        tokensUsed: { input: totalInput, output: totalOutput },
        webSearchCount,
      }
    }

    // Claude nu a apelat submit — poate a răspuns doar text sau doar web_search fără submit.
    // Adaugă răspunsul în messages și cere explicit submit_task_result.
    messages.push({ role: "assistant", content: response.content })
    messages.push({
      role: "user",
      content:
        "Te rog apelează acum tool-ul submit_task_result cu rezultatul final al taskului. " +
        "Dacă nu ai găsit suficiente date după căutare, folosește status=blocked cu blocker.type=WAITING_INPUT sau EXTERNAL.",
    })
  }

  throw new Error("Claude nu a apelat submit_task_result după 3 ture")
}

// ─── Effects application ──────────────────────────────────────────────────────

async function applyEffects(task: any, payload: ExecutorPayload): Promise<{
  outcome: "COMPLETED" | "BLOCKED" | "FAILED"
  subTaskIds: string[]
}> {
  const now = new Date()
  const subTaskIds: string[] = []

  if (payload.status === "blocked") {
    await (prisma as any).agentTask.update({
      where: { id: task.id },
      data: {
        status: "BLOCKED",
        acceptedAt: task.acceptedAt || now,
        startedAt: task.startedAt || now,
        blockerType: normalizeBlockerType(payload.blocker?.type) as any,
        blockerDescription: payload.blocker?.description || payload.summary,
        blockedAt: now,
      },
    })
    // Colaborare laterală automată: dacă blocajul e de competență lipsă
    const blockerDesc = payload.blocker?.description || payload.summary || ""
    const blockerType = normalizeBlockerType(payload.blocker?.type)
    const needsLateral = blockerType === "WAITING_INPUT" || blockerType === "RESOURCE" ||
      /competență|competenta|nu am date|nu am informați|alt departament|altă echipă|nu e în atribuți/i.test(blockerDesc)

    if (needsLateral && !task.tags?.includes("lateral-collaboration")) {
      try {
        const { requestLateralHelp } = await import("./lateral-collaboration")
        const lateral = await requestLateralHelp({
          requestingAgent: task.assignedTo,
          taskId: task.id,
          whatIsNeeded: blockerDesc,
          context: task.title || "",
        })
        console.log(`[executor] Lateral help: ${lateral.action} → ${lateral.routedTo || "none"} via ${lateral.mediatedBy || "none"}`)
      } catch {}
    }

    // Bucla de feedback: inainte de Owner, structura se rezolva singura
    const blockerRoleName = ROLE_LABELS[task.assignedTo] || task.assignedTo
    const cleanBlockerDesc = stripTechJargon(blockerDesc)
    const cleanTaskTitle = stripTechJargon(task.title)

    // Verificare: daca agentul blocat e SUPERIOR celui de care depinde → delegheaza direct, nu se blocheaza
    // Un sef nu se blocheaza asteptand un subordonat — ii da direct instructiuni
    const blockerMention = blockerDesc.match(/de la\s+(\w+)|input.*de la\s+(\w+)|cerere.*(\w+)/i)
    if (blockerMention) {
      const dependsOn = (blockerMention[1] || blockerMention[2] || blockerMention[3] || "").toUpperCase()
      if (dependsOn) {
        try {
          const { getDirectSubordinates } = await import("./hierarchy-enforcer")
          const subordinates = await getDirectSubordinates(task.assignedTo)
          if (subordinates.includes(dependsOn)) {
            // Agentul blocat E SEFUL celui de care depinde — delegheaza direct
            await (prisma as any).agentTask.create({
              data: {
                businessId: task.businessId || "biz_jobgrade",
                assignedBy: task.assignedTo,
                assignedTo: dependsOn,
                title: `[Delegat de ${blockerRoleName}] ${cleanTaskTitle}`,
                description: `${blockerRoleName} are nevoie de: ${cleanBlockerDesc}\n\nLivrabil asteptat: raspuns structurat cu informatiile solicitate.`,
                taskType: task.taskType || "INVESTIGATION",
                priority: task.priority || "URGENT",
                status: "ASSIGNED",
                tags: ["delegated-by-superior", `parent:${task.id}`],
              },
            })
            // Deblocheaza task-ul original — va fi completat cand subordonatul livreaza
            await (prisma as any).agentTask.update({
              where: { id: task.id },
              data: { blockerDescription: `Delegat la ${dependsOn}. Asteptam livrare.` },
            })
            console.log(`[executor] Superior ${task.assignedTo} delegheaza direct la subordonat ${dependsOn} (nu se blocheaza)`)
            return { outcome: "BLOCKED", subTaskIds }
          }
        } catch {}
      }
    }

    // CIRCUIT BREAKER: daca un task similar a fost CANCELLED de 2+ ori in 7 zile, nu-l mai recrea
    const titleSlug = cleanTaskTitle.slice(0, 40)
    try {
      const cancelledCount = await (prisma as any).agentTask.count({
        where: {
          title: { contains: titleSlug },
          status: "CANCELLED",
          updatedAt: { gte: new Date(Date.now() - 7 * 24 * 3600000) },
        },
      })
      if (cancelledCount >= 2) {
        console.log(`[executor] CIRCUIT BREAKER: "${titleSlug}" anulat de ${cancelledCount}x in 7 zile — NU mai recreez`)
        return { outcome: "BLOCKED", subTaskIds }
      }
    } catch {}

    // Pas 1: Returneaza task-ul la agentul care l-a creat (assignedBy) cu feedback clar
    // NU escaladam la Owner — structura trebuie sa se rezolve singura
    if (task.assignedBy && task.assignedBy !== "OWNER" && task.assignedBy !== "SYSTEM") {
      try {
        await (prisma as any).agentTask.create({
          data: {
            businessId: task.businessId || "biz_jobgrade",
            assignedBy: task.assignedTo,
            assignedTo: task.assignedBy,
            title: `[Returnat] ${cleanTaskTitle} — necesita reformulare`,
            description: `Task-ul returnat de ${blockerRoleName} deoarece: ${cleanBlockerDesc}\n\nActiune necesara: reformuleaza cererea structurat si retrimite.`,
            taskType: task.taskType || "INVESTIGATION",
            priority: task.priority || "NECESAR",
            status: "ASSIGNED",
            tags: ["feedback-loop", "returned-task", `original:${task.id}`],
          },
        })
        console.log(`[executor] Feedback loop: ${task.assignedTo} returneaza task la ${task.assignedBy}`)
      } catch {}
    }

    // Escalare la Owner DOAR daca:
    // 1. Task-ul a fost creat de OWNER sau SYSTEM (nu exista bucla de feedback)
    // 2. SAU blocajul e explicit strategic/buget (Owner e singurul care poate decide)
    const isOwnerTask = !task.assignedBy || task.assignedBy === "OWNER" || task.assignedBy === "SYSTEM"
    const isStrategicBlock = /buget.*aprobat|alocare.*fonduri|decizie.*proprietar|schimbare.*strateg/i.test(blockerDesc)

    if (isOwnerTask || isStrategicBlock) {
      try {
        const ownerUser = await (prisma as any).user.findFirst({
          where: { role: { in: ["OWNER", "SUPER_ADMIN"] } },
          select: { id: true },
        })
        if (ownerUser) {
          await (prisma as any).notification.create({
            data: {
              userId: ownerUser.id,
              type: "AGENT_MESSAGE",
              title: `${blockerRoleName}: necesita decizie strategica`,
              body: `${blockerRoleName} lucreaza la: ${cleanTaskTitle}.\nMotivul: ${cleanBlockerDesc}`,
              read: false,
              sourceRole: task.assignedTo,
              requestKind: "DECISION",
              requestData: JSON.stringify({
                whatIsNeeded: `${blockerRoleName} necesita o decizie strategica pentru a continua`,
                context: `Lucreaza la: ${cleanTaskTitle}. Motivul: ${cleanBlockerDesc}`,
                resourceLabel: cleanTaskTitle,
              }),
            },
          })
        }
      } catch {}
    }

    return { outcome: "BLOCKED", subTaskIds }
  }

  if (payload.status === "needs-subtasks") {
    const subs = (payload.subTasks || []).slice(0, MAX_SUB_TASKS)
    if (subs.length === 0) {
      await (prisma as any).agentTask.update({
        where: { id: task.id },
        data: {
          status: "FAILED",
          acceptedAt: task.acceptedAt || now,
          startedAt: task.startedAt || now,
          failedAt: now,
          failureReason: "needs-subtasks dar array sub-tasks gol",
        },
      })
      return { outcome: "FAILED", subTaskIds }
    }

    // Creează fiecare sub-task linked la același obiectiv
    for (const s of subs) {
      const created = await (prisma as any).agentTask.create({
        data: {
          businessId: task.businessId,
          assignedBy: task.assignedTo, // managerul care decompune devine assignedBy
          assignedTo: s.assignedTo,
          title: s.title,
          description: s.description,
          taskType: s.taskType as any,
          priority: (s.priority as any) || "MEDIUM",
          objectiveId: task.objectiveId,
          tags: [...(s.tags || []), "spawned-by-executor"],
          deadlineAt: task.deadlineAt, // moștenește deadline de la parent
          estimatedMinutes: s.estimatedMinutes,
          status: "ASSIGNED",
        },
      })
      subTaskIds.push(created.id)
    }

    // Parent task → COMPLETED cu rezultat = lista sub-taskurilor create
    await (prisma as any).agentTask.update({
      where: { id: task.id },
      data: {
        status: "COMPLETED",
        acceptedAt: task.acceptedAt || now,
        startedAt: task.startedAt || now,
        completedAt: now,
        result: [
          `[DECOMPUNERE] ${payload.summary}`,
          ``,
          `Sub-taskuri create (${subTaskIds.length}):`,
          ...subTaskIds.map((id, i) => `  ${i + 1}. ${subs[i].assignedTo} — ${subs[i].title} (${id})`),
        ].join("\n"),
      },
    })
    return { outcome: "COMPLETED", subTaskIds }
  }

  // status === "completed"
  if (!payload.result) {
    await (prisma as any).agentTask.update({
      where: { id: task.id },
      data: {
        status: "FAILED",
        acceptedAt: task.acceptedAt || now,
        startedAt: task.startedAt || now,
        failedAt: now,
        failureReason: "Executor a raportat completed fără result field",
      },
    })
    return { outcome: "FAILED", subTaskIds }
  }

  // ── QC Gate: verificare pre-COMPLETED ──
  // Conținut client-facing (media-book, copywriting, outreach) trece prin validare
  const isClientFacing = task.tags?.some((t: string) =>
    ["media-book", "copywriting", "outreach-messages", "content-creation", "memorable-experience"].includes(t)
  )

  if (isClientFacing && payload.result) {
    const qcIssues = runQualityCheck(payload.result, task.assignedTo)
    if (qcIssues.length > 0) {
      await (prisma as any).agentTask.update({
        where: { id: task.id },
        data: {
          status: "BLOCKED",
          blockerType: "QUALITY_CHECK",
          blockerDescription: `QC gate a detectat ${qcIssues.length} probleme:\n${qcIssues.join("\n")}`,
          blockedAt: now,
          acceptedAt: task.acceptedAt || now,
          startedAt: task.startedAt || now,
          result: payload.result,
          tags: [...(task.tags || []), "qc-blocked"],
        },
      })
      return { outcome: "BLOCKED", subTaskIds }
    }
  }

  // Execute operational actions embedded in output (COG/COA/COCSA only)
  const actions = await executeOperationalActions(payload.result, task.assignedTo)
  const resultWithActions = actions.length > 0
    ? `${payload.result}\n\n--- ACȚIUNI EXECUTATE AUTOMAT ---\n${actions.join("\n")}`
    : payload.result

  // ═══ REVIEW GATE: ȘTIU vs FAC ═══
  // Task-urile de ACȚIUNE trec prin REVIEW_PENDING — managerul verifică rezultatul.
  // Task-urile de CUNOAȘTERE (KB_RESEARCH, KB_VALIDATION) → direct COMPLETED.
  // Decompuneri (needs-subtasks) → direct COMPLETED (managerul vede sub-task-urile).
  const KNOWLEDGE_TYPES = new Set(["KB_RESEARCH", "KB_VALIDATION"])
  const requiresReview = !KNOWLEDGE_TYPES.has(task.taskType)

  if (requiresReview) {
    await (prisma as any).agentTask.update({
      where: { id: task.id },
      data: {
        status: "REVIEW_PENDING",
        acceptedAt: task.acceptedAt || now,
        startedAt: task.startedAt || now,
        completedAt: now,
        result: resultWithActions,
      },
    })
    // Învățare și din task-uri REVIEW_PENDING — nu așteptăm aprobarea managerului
    await autoExtractLearning(task, resultWithActions)
    return { outcome: "COMPLETED", subTaskIds }
  }

  // Cunoaștere pură → direct COMPLETED (fără review)
  await (prisma as any).agentTask.update({
    where: { id: task.id },
    data: {
      status: "COMPLETED",
      acceptedAt: task.acceptedAt || now,
      startedAt: task.startedAt || now,
      completedAt: now,
      result: resultWithActions,
    },
  })

  // ── FIX #1: Învățare automată din ORICE task COMPLETED ──
  await autoExtractLearning(task, resultWithActions)

  // ── Integrare laterală: dacă acest task era cerere de la omolog, deblochează originalul ──
  await checkAndIntegrateLateralResponse(task, resultWithActions)

  return { outcome: "COMPLETED", subTaskIds }
}

// ── Integrare răspuns lateral (post-execuție) ──────────────────────────────────

async function checkAndIntegrateLateralResponse(task: any, result: string): Promise<void> {
  // Dacă task-ul era o cerere laterală (tag "lateral-collaboration" sau "peer-request"),
  // integrează răspunsul în task-ul original care așteaptă
  if (task.tags?.includes("lateral-collaboration") || task.tags?.includes("peer-request")) {
    try {
      const { integrateLateralResponse } = await import("./lateral-collaboration")
      const integration = await integrateLateralResponse(task.id, result)
      if (integration.unblocked) {
        console.log(`[executor] Lateral response integrated → unblocked task ${integration.originalTaskId}`)
      }
    } catch {}
  }
}

// ── Învățare automată post-execuție ────────────────────────────────────────────

async function autoExtractLearning(task: any, result: string): Promise<void> {
  try {
    const { extractPostExecutionLearning } = await import("./learning-pipeline")
    await extractPostExecutionLearning({
      taskId: task.id,
      agentRole: task.assignedTo,
      taskTitle: task.title,
      taskType: task.taskType,
      result,
      wasSuccessful: true,
    })
  } catch {
    // Non-blocking — nu întrerupem task-ul dacă learning eșuează
  }
}

// ─── Action Executor — COG poate executa acțiuni operaționale ────────────────

// Roluri care pot emite acțiuni operaționale
const OPERATIONAL_ROLES = new Set(["COG", "COA", "COCSA", "QAA", "QLA", "SQA"])

// Pattern: ACTION: SET_CONFIG key=SIGNAL_FILTER_LEVEL value=critical reason="prea multe semnale irelevante"
const ACTION_PATTERN = /ACTION:\s*SET_CONFIG\s+key=(\S+)\s+value=(\S+)(?:\s+reason="([^"]*)")?/g

// Pattern: ACTION: CODE_QUERY action="capabilities"
const CODE_QUERY_PATTERN = /ACTION:\s*CODE_QUERY\s+action="([^"]+)"(?:\s+(\w+)="([^"]*)")?(?:\s+(\w+)="([^"]*)")?/g

// Pattern: ACTION: API_TEST method="GET" path="/api/v1/jobs" expectedStatus=200
const API_TEST_PATTERN = /ACTION:\s*API_TEST\s+method="([^"]+)"\s+path="([^"]+)"(?:\s+body="([^"]*)")?(?:\s+expectedStatus=(\d+))?(?:\s+expectedContains="([^"]*)")?/g

// Pattern: ACTION: NOTIFY_OWNER title="Titlul" body="Mesajul complet"
const NOTIFY_PATTERN = /ACTION:\s*NOTIFY_OWNER\s+title="([^"]+)"\s+body="([^"]+)"/g

// Pattern: ACTION: ADJUST_BUDGET category=API_AI month=2026-07 actual=1500 reason="consum real Claude API"
const BUDGET_PATTERN = /ACTION:\s*ADJUST_BUDGET\s+category=(\S+)\s+month=(\S+)\s+actual=(\d+)(?:\s+reason="([^"]*)")?/g

// Allowlist — aceleași chei ca în adjust-config endpoint
const ALLOWED_CONFIG_KEYS = new Set([
  "SIGNAL_FILTER_LEVEL",
  "EXECUTOR_BATCH_SIZE",
  "PROACTIVE_CYCLE_INTERVAL",
])

const CONFIG_VALIDATORS: Record<string, (v: string) => boolean> = {
  SIGNAL_FILTER_LEVEL: (v) => ["critical", "focused", "broad", "full"].includes(v),
  EXECUTOR_BATCH_SIZE: (v) => { const n = parseInt(v); return !isNaN(n) && n >= 1 && n <= 10 },
  PROACTIVE_CYCLE_INTERVAL: (v) => { const n = parseInt(v); return !isNaN(n) && n >= 5 && n <= 120 },
}

async function executeOperationalActions(result: string, agentRole: string): Promise<string[]> {
  if (!OPERATIONAL_ROLES.has(agentRole)) return []

  const actions: string[] = []
  let match: RegExpExecArray | null

  while ((match = ACTION_PATTERN.exec(result)) !== null) {
    const [, key, value, reason] = match

    if (!ALLOWED_CONFIG_KEYS.has(key)) {
      actions.push(`[REJECTED] ${key} — nu e în allowlist`)
      continue
    }

    const validator = CONFIG_VALIDATORS[key]
    if (validator && !validator(value)) {
      actions.push(`[REJECTED] ${key}=${value} — valoare invalidă`)
      continue
    }

    try {
      await prisma.systemConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
      actions.push(`[EXECUTED] ${key}=${value} (${reason || "fără motiv"})`)
      console.log(`[ACTION] ${agentRole} SET_CONFIG ${key}=${value} reason="${reason || ""}"`)
    } catch (e: any) {
      actions.push(`[FAILED] ${key}=${value} — ${e.message}`)
    }
  }

  // ADJUST_BUDGET actions
  let budgetMatch: RegExpExecArray | null
  while ((budgetMatch = BUDGET_PATTERN.exec(result)) !== null) {
    const [, category, monthStr, actualStr, reason] = budgetMatch
    const validCategories = ["INFRA", "API_AI", "MARKETING", "PERSONAL", "REVENUE", "DIVERSE"]
    if (!validCategories.includes(category)) {
      actions.push(`[REJECTED] ADJUST_BUDGET ${category} — categorie invalidă`)
      continue
    }
    try {
      const monthDate = new Date(monthStr + "-01")
      await (prisma as any).budgetLine.upsert({
        where: {
          businessId_category_month: {
            businessId: "biz_jobgrade",
            category,
            month: monthDate,
          },
        },
        update: { actual: parseInt(actualStr), notes: reason || null },
        create: {
          businessId: "biz_jobgrade",
          category,
          month: monthDate,
          actual: parseInt(actualStr),
          notes: reason || null,
        },
      })
      actions.push(`[EXECUTED] ADJUST_BUDGET ${category} ${monthStr} actual=${actualStr}`)
      console.log(`[ACTION] ${agentRole} ADJUST_BUDGET ${category} ${monthStr}=${actualStr} reason="${reason || ""}"`)
    } catch (e: any) {
      actions.push(`[FAILED] ADJUST_BUDGET — ${e.message}`)
    }
  }

  // NOTIFY_OWNER actions
  let notifyMatch: RegExpExecArray | null
  while ((notifyMatch = NOTIFY_PATTERN.exec(result)) !== null) {
    const [, rawTitle, rawBody] = notifyMatch
    try {
      // Find Owner user
      const owner = await (prisma as any).user.findFirst({
        where: { role: { in: ["OWNER", "SUPER_ADMIN"] } },
        select: { id: true },
      })
      if (owner) {
        // Traducere din limbaj tehnic în limbaj Owner
        const translated = translateAgentMessageForOwner(agentRole, rawTitle, rawBody)

        await (prisma as any).notification.create({
          data: {
            userId: owner.id,
            type: "COG_MESSAGE",
            title: translated.title,
            body: translated.body,
            read: false,
            sourceRole: agentRole,
            requestKind: translated.requestKind,
            requestData: JSON.stringify({
              whatIsNeeded: translated.whatIsNeeded,
              context: translated.context,
              options: translated.options,
            }),
          },
        })
        actions.push(`[NOTIFIED] Owner: ${translated.title}`)
        console.log(`[ACTION] ${agentRole} NOTIFY_OWNER: ${rawTitle} → translated`)
      }
    } catch (e: any) {
      actions.push(`[NOTIFY_FAILED] ${rawTitle} — ${e.message}`)
    }
  }

  // API_TEST actions (QAA/QLA/SQA/COA/COG)
  if (OPERATIONAL_ROLES.has(agentRole)) {
    let apiTestMatch: RegExpExecArray | null
    while ((apiTestMatch = API_TEST_PATTERN.exec(result)) !== null) {
      const [, method, testPath, body, expectedStatus, expectedContains] = apiTestMatch
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        const res = await fetch(`${baseUrl}/api/v1/coa/api-test`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-key": process.env.INTERNAL_API_KEY || "",
          },
          body: JSON.stringify({
            method,
            path: testPath,
            body: body ? JSON.parse(body) : undefined,
            expectedStatus: expectedStatus ? Number(expectedStatus) : undefined,
            expectedContains,
          }),
        })

        const data = await res.json()
        const summary = `${data.test} ${method} ${testPath} → ${data.status} (${data.durationMs}ms)`

        if (data.test === "FAIL") {
          // Creează ticket bug automat
          await (prisma as any).agentTask.create({
            data: {
              businessId: "biz_jobgrade",
              taskType: "REVIEW",
              title: `[BUG] API test FAIL: ${method} ${testPath}`,
              description: `Test automat eșuat:\n${JSON.stringify(data.checks, null, 2)}\nPreview: ${data.responsePreview?.slice(0, 200)}`,
              assignedTo: "COA",
              assignedBy: agentRole,
              priority: "HIGH",
              status: "ASSIGNED",
              tags: ["bug", "api-test", "auto-detected"],
            },
          }).catch(() => {})
          actions.push(`[API_TEST] ${summary} → TICKET CREAT`)
        } else {
          actions.push(`[API_TEST] ${summary}`)
        }

        // Salvăm rezultatul în KB
        await (prisma as any).kBEntry.create({
          data: {
            agentRole,
            kbType: "PERMANENT",
            content: `[API_TEST] ${summary}\nChecks: ${JSON.stringify(data.checks)}`,
            tags: ["api-test", data.test.toLowerCase(), testPath.replace(/\//g, "-")],
            confidence: 1,
            status: "PERMANENT",
            source: "SELF_INTERVIEW",
          },
        }).catch(() => {})
      } catch (e: any) {
        actions.push(`[API_TEST_FAILED] ${method} ${testPath}: ${e.message}`)
      }
    }
  }

  // CODE_QUERY actions (COA/COG)
  if (OPERATIONAL_ROLES.has(agentRole)) {
    let cqMatch: RegExpExecArray | null
    while ((cqMatch = CODE_QUERY_PATTERN.exec(result)) !== null) {
      const [, action, key1, val1, key2, val2] = cqMatch
      try {
        const body: Record<string, string> = { action }
        if (key1 && val1) body[key1] = val1
        if (key2 && val2) body[key2] = val2

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        const res = await fetch(`${baseUrl}/api/v1/coa/code-query`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-key": process.env.INTERNAL_API_KEY || "",
          },
          body: JSON.stringify(body),
        })

        if (res.ok) {
          const data = await res.json()
          // Salvăm rezultatul în KB agentului
          const summary = JSON.stringify(data).slice(0, 2000)
          await (prisma as any).kBEntry.create({
            data: {
              agentRole,
              kbType: "PERMANENT",
              content: `[CODE_QUERY:${action}] ${key1 ? key1 + "=" + val1 : ""}\n${summary}`,
              tags: ["code-query", action, agentRole.toLowerCase()],
              confidence: 1,
              status: "PERMANENT",
              source: "SELF_INTERVIEW",
            },
          }).catch(() => {})
          actions.push(`[CODE_QUERY] ${action}: OK (${summary.length} chars)`)
        } else {
          actions.push(`[CODE_QUERY] ${action}: ${res.status}`)
        }
      } catch (e: any) {
        actions.push(`[CODE_QUERY_FAILED] ${action}: ${e.message}`)
      }
    }
  }

  return actions
}

// ─── QC Gate — verificare automată conținut client-facing ────────────────────

// Lista de certificări/parteneriate aprobate (restul = suspect)
const APPROVED_CREDENTIALS = [
  "colegiul psihologilor", "cpr", "psihologia muncii", "transporturilor", "serviciilor",
  "psihobusiness consulting", "cif ro15790994",
  "directiva eu 2023/970", "gdpr", "regulamentul (ue) 2016/679",
  "ai act", "regulamentul (ue) 2024/1689",
  "legea 53/2003", "codul muncii",
]

function runQualityCheck(content: string, agentRole: string): string[] {
  const issues: string[] = []
  const lower = content.toLowerCase()

  // 1. Cifre/procente fără indicație de sursă
  // Caută pattern-uri: "73%", "14.1:1", "50.000 EUR" etc. fără "(sursă:" sau "(Art." sau "(Considerentul" în apropiere
  const numberPatterns = content.match(/\b\d{2,3}[,.]?\d*\s*%|\b\d+[.:]\d+\s*ROI|\b\d{2,3}\.000\s*(EUR|RON)/g)
  if (numberPatterns) {
    for (const num of numberPatterns) {
      const idx = content.indexOf(num)
      const context = content.substring(Math.max(0, idx - 100), Math.min(content.length, idx + num.length + 100))
      const hasCitation = /\(surs[aă]|\(Art\.|\(Considerentul|\(conform|\(legislat|\(proiect de lege/i.test(context)
      if (!hasCitation) {
        issues.push(`[QC-CIFRĂ] "${num}" fără sursă verificabilă în context`)
      }
    }
  }

  // 2. Certificări/parteneriate suspecte
  const certPatterns = /ISO \d+|partner\s+(microsoft|google|amazon|oracle)|certificar[ei]\s+\w+|membru\s+fondator|acreditar[ei]\s+\w+/gi
  const certMatches = content.match(certPatterns)
  if (certMatches) {
    for (const cert of certMatches) {
      const isApproved = APPROVED_CREDENTIALS.some(a => cert.toLowerCase().includes(a))
      if (!isApproved) {
        issues.push(`[QC-CERTIFICARE] "${cert}" nu e în lista de credențiale aprobate`)
      }
    }
  }

  // 3. Testimoniale fictive — pattern: "ne-a spus", "a declarat", citat cu ghilimele
  const testimonialPatterns = /(?:ne-a spus|a declarat|a menționat|ne-a confirmat)[^.]*['""][^'""]{'|"}/gi
  // Simpler: detect quoted speech patterns
  const hasQuotedSpeech = /'[A-ZĂÎȘȚÂ][^']{20,}'/g.test(content) || /"[A-ZĂÎȘȚÂ][^"]{20,}"/g.test(content)
  if (hasQuotedSpeech) {
    issues.push(`[QC-TESTIMONIAL] Conține citat direct — verifică dacă e real sau fabricat`)
  }

  // 4. Funcționalități inexistente — pattern-uri specifice
  const falseFeatures = [
    /machine learning|ML\s+calibra/i,
    /benchmark.*timp\s+real/i,
    /\b47\s+(de\s+)?criterii/i,
    /200\+\s+implementări/i,
  ]
  for (const pattern of falseFeatures) {
    if (pattern.test(content)) {
      issues.push(`[QC-FUNCȚIONALITATE] Pattern suspect: ${pattern.source}`)
    }
  }

  return issues
}

// ─── KB Pre-resolution: aceeași logică ca self-complete (KB → L2 → Claude → Owner) ──

async function tryResolveFromKB(
  task: any,
  kbEntries: any[]
): Promise<{ result: string; source: string } | null> {
  // Doar task-uri de cunoaștere beneficiază de pre-rezolvare
  const kbResolvableTypes = ["KB_RESEARCH", "KB_VALIDATION", "REVIEW", "INVESTIGATION"]
  if (!kbResolvableTypes.includes(task.taskType)) return null

  try {
    const { selfComplete } = await import("@/lib/kb/self-complete")

    const gap = {
      agentRole: task.assignedTo,
      topic: `${task.title} ${(task.description || "").slice(0, 300)}`,
      objectiveCode: task.objectiveId || undefined,
      context: task.description?.slice(0, 200),
    }

    const result = await selfComplete(gap)

    if (result.resolved && result.source !== "escalated-owner") {
      // Rezolvat din KB propriu, L2 sau Claude targeted — costul e minim
      // Dacă sursa e "claude-generated", a fost un apel mic targeted, nu full task execution
      const sourceLabel = result.source === "kb-own" ? "KB propriu"
        : result.source === "kb-l2" ? "KB L2 consultant"
        : "Claude targeted (entry nou generat)"

      return {
        result: `[Rezolvat prin self-complete: ${sourceLabel}]\n\n${result.message}`,
        source: result.source,
      }
    }
  } catch {
    // Self-complete indisponibil — continuă cu Claude full
  }

  return null
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function executeTask(taskId: string): Promise<ExecutorResult> {
  const startTime = Date.now()

  const ctx = await loadTaskContext(taskId)
  const { task } = ctx

  // Load agent description din registry
  const managerConfig = await getManagerConfig(task.assignedTo, prisma).catch(() => null)
  const description = managerConfig?.description || `Agent ${task.assignedTo}`

  // Marchează ACCEPTED imediat pentru atomicitate vs. concurrent runs
  await (prisma as any).agentTask.update({
    where: { id: taskId, status: "ASSIGNED" },
    data: { status: "ACCEPTED", acceptedAt: new Date() },
  }).catch(() => {
    // Race condition — altcineva a luat taskul
    throw new Error(`Task ${taskId} already picked up by another executor`)
  })

  try {
    // ── Detecție "[Rafinează și delegă]" — forțează descompunere, nu execuție directă ──
    const isRefinementTask = task.title?.startsWith("[Rafinează și delegă]") || task.tags?.includes("hierarchy-redirected")
    if (isRefinementTask) {
      const { getDirectSubordinates } = await import("./hierarchy-enforcer")
      const subs = await getDirectSubordinates(task.assignedTo)
      if (subs.length > 0) {
        // Brainstorm DOAR dacă obiectivul e NOU (echipa nu are experiență)
        let brainstormContext = ""
        try {
          const { brainstormBeforeDecomposition } = await import("./proactive-brainstorm")
          brainstormContext = await brainstormBeforeDecomposition(
            task.assignedTo,
            task.title,
            task.description || "",
          )
        } catch {}

        const refinementInstruction = `\n\nINSTRUCȚIUNE OBLIGATORIE: Acest task TREBUIE descompus în sub-taskuri.
NU executa singur. Descompune în taskuri specifice și alocă-le DOAR subordonaților tăi direcți: ${subs.join(", ")}.
Folosește status "needs-subtasks" și completează array-ul subTasks.
Fiecare sub-task trebuie atât de specific încât subordonatul să-l poată rezolva din KB fără apel Claude.${brainstormContext}`

        ctx.task = { ...ctx.task, description: (ctx.task.description || "") + refinementInstruction }
      }
    }

    // ── Pre-verificare KB: poate fi rezolvat fără apel Claude? ──
    const kbResolution = await tryResolveFromKB(task, ctx.kbEntries)
    if (kbResolution) {
      // Rezolvat din KB — zero cost API
      await (prisma as any).agentTask.update({
        where: { id: taskId },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          result: kbResolution.result,
          kbHit: true,
          startedAt: new Date(),
        },
      })
      console.log(`[executor] ${task.assignedTo}/${taskId}: RESOLVED FROM KB (${kbResolution.source})`)
      return {
        taskId,
        outcome: "COMPLETED",
        result: kbResolution.result,
        durationMs: Date.now() - startTime,
      }
    }

    const system = await buildSystemForExecutor(task.assignedTo, description, taskId, task.title, task.description)
    const userMessage = buildUserMessage(ctx)

    const { payload, tokensUsed, webSearchCount } = await invokeLLM(system, userMessage, task)
    const { outcome, subTaskIds } = await applyEffects(task, payload)

    // ── Post-execuție: actualizare stare cognitivă persistentă ──
    try {
      const { updateStateAfterExecution } = await import("./cognitive-state")
      await updateStateAfterExecution(task.assignedTo, {
        taskId,
        taskTitle: task.title,
        succeeded: outcome !== "FAILED" && outcome !== "BLOCKED",
        costUSD: 0, // se calculează în telemetry
        wasFirstAttempt: !(task.tags || []).some((t: string) => t.startsWith("retry:")),
        taskType: task.taskType,
      })
    } catch (cogErr: any) {
      // FIX #11: Log cognitive state errors instead of silencing
      console.warn(`[executor] Cognitive state update failed for ${task.assignedTo}: ${cogErr.message?.slice(0, 100)}`)
    }

    return {
      taskId,
      outcome,
      result: payload.result,
      subTasksCreated: subTaskIds.length,
      subTaskIds,
      blockerDescription: payload.blocker?.description,
      durationMs: Date.now() - startTime,
      tokensUsed,
      webSearchCount,
    }
  } catch (e: any) {
    // ── Post-eșec: actualizare stare cognitivă persistentă ──
    try {
      const { updateStateAfterExecution } = await import("./cognitive-state")
      await updateStateAfterExecution(task.assignedTo, {
        taskId,
        taskTitle: task.title,
        succeeded: false,
        failureReason: e.message,
        costUSD: 0,
        wasFirstAttempt: !(task.tags || []).some((t: string) => t.startsWith("retry:")),
        taskType: task.taskType,
      })
    } catch {}

    await (prisma as any).agentTask.update({
      where: { id: taskId },
      data: {
        status: "FAILED",
        failedAt: new Date(),
        failureReason: `Executor error: ${e.message}`.slice(0, 500),
      },
    })
    return {
      taskId,
      outcome: "FAILED",
      failureReason: e.message,
      durationMs: Date.now() - startTime,
    }
  }
}

/**
 * Execută toate taskurile ASSIGNED pentru un rol (sau global).
 * Limitare implicită 5 taskuri per rulare pentru control cost + concurrent safety.
 *
 * Filtre implicite (pentru cron safety):
 *  - doar taskuri create în ultimele `maxAgeHours` ore (default 48)
 *  - exclude assignedBy=SYSTEM (taskuri reactive)
 *  - exclude tag "orphan:no-objective" (taskuri fără ancoră strategică)
 * Override cu `bypassFilters: true` pentru execuție manuală explicită.
 */
export async function executeQueue(options: {
  agentRole?: string
  limit?: number
  maxAgeHours?: number
  bypassFilters?: boolean
}): Promise<ExecutorResult[]> {
  const limit = Math.min(options.limit || 5, 20)
  const maxAgeHours = options.maxAgeHours || 48

  const where: any = { status: "ASSIGNED" }
  if (options.agentRole) where.assignedTo = options.agentRole

  if (!options.bypassFilters) {
    where.createdAt = { gte: new Date(Date.now() - maxAgeHours * 60 * 60 * 1000) }
    where.assignedBy = { not: "SYSTEM" }
    where.NOT = { tags: { has: "orphan:no-objective" } }
  }

  const tasks = await (prisma as any).agentTask.findMany({
    where,
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }], // CRITICAL primul, apoi FIFO
    take: limit,
    select: { id: true },
  })

  const results: ExecutorResult[] = []
  for (const t of tasks) {
    try {
      const r = await executeTask(t.id)
      results.push(r)
    } catch (e: any) {
      results.push({
        taskId: t.id,
        outcome: "FAILED",
        failureReason: e.message,
        durationMs: 0,
      })
    }
  }
  return results
}

// ── Traducere mesaje agent → limbaj Owner ──────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  COG: "Directorul General", COA: "Directorul Operațional",
  DOA: "Administratorul Operațional", DOAS: "Administratorul Senior",
  COCSA: "Strategul Comercial", PMA: "Managerul de Produs",
  CJA: "Juristul", CIA: "Analistul de Informații",
  MKA: "Managerul de Marketing", CMA: "Managerul de Conținut",
  SOA: "Agentul de Vânzări", DMA: "Managerul de Date",
  CFO: "Directorul Financiar", CCO: "Directorul de Conformitate",
  COSO: "Observatorul Strategic", HR_COUNSELOR: "Consilierul HR",
  MEDIATOR: "Mediatorul",
}

interface TranslatedMessage {
  title: string
  body: string
  whatIsNeeded: string
  context: string
  requestKind: string
  options?: string[]
}

function translateAgentMessageForOwner(agentRole: string, rawTitle: string, rawBody: string): TranslatedMessage {
  const roleName = ROLE_LABELS[agentRole] || agentRole

  // Curățăm jargon tehnic din titlu și body
  const cleanTitle = stripTechJargon(rawTitle)
  const cleanBody = stripTechJargon(rawBody)

  // Detectăm tipul cerere
  const combined = `${rawTitle} ${rawBody}`.toLowerCase()
  const requestKind = detectRequestKind(combined)

  // Traducem ce anume cere agentul
  const whatIsNeeded = extractOwnerFriendlyRequest(cleanTitle, cleanBody, requestKind)

  // Context tradus
  const context = cleanBody.length > 0 ? cleanBody : cleanTitle

  // Opțiuni dacă e decizie
  const options = requestKind === "DECISION"
    ? extractDecisionOptions(rawBody)
    : undefined

  return {
    title: `${roleName}: ${cleanTitle}`,
    body: cleanBody,
    whatIsNeeded,
    context,
    requestKind,
    options,
  }
}

/**
 * Elimină jargon tehnic: paths, extensii, JSON, variabile, referințe cod
 */
function stripTechJargon(text: string): string {
  if (!text) return ""
  let t = text
  // Elimină JSON inline { ... }
  t = t.replace(/\{[^{}]*\}/g, "(detalii tehnice omise)")
  // Elimină array-uri [...]
  t = t.replace(/\[[^\[\]]*\]/g, "")
  // Elimină path-uri de fișiere
  t = t.replace(/(?:src|docs|scripts|lib|app|api|components)\/[\w\-\/\.]+/g, "")
  t = t.replace(/[A-Za-z]:\\[\w\\\-\.]+/g, "")
  // Elimină extensii fișiere
  t = t.replace(/\b\w+\.(ts|tsx|js|jsx|mjs|json|md|yml|yaml|sql|prisma|env)\b/gi, "")
  // Elimină referințe tehnice comune
  t = t.replace(/\b(FLUX-\d+[a-z]?|route|endpoint|API|DB|cron|webhook|prisma|schema|migration|deploy|build|SSR|ISR|RSC|middleware|runtime)\b/gi, "")
  // Elimină variabile tehnice camelCase/SCREAMING_CASE izolate
  t = t.replace(/\b[A-Z_]{3,30}\b/g, (match) => {
    // Păstrăm rolurile și cuvintele business
    if (ROLE_LABELS[match]) return ROLE_LABELS[match]
    if (/^(ART|RON|EUR|USD|TVA|GDPR|MVV|KPI|SRL|CIF|B2B|B2C|FAQ|PDF|CSV|HR)$/.test(match)) return match
    return ""
  })
  // Elimină backticks și code formatting
  t = t.replace(/`[^`]*`/g, "")
  // Elimină URL-uri
  t = t.replace(/https?:\/\/\S+/g, "")
  // Curățăm spații multiple și punctuație redundantă
  t = t.replace(/\(\s*\)/g, "")
  t = t.replace(/\s+/g, " ")
  t = t.replace(/\s*,\s*,/g, ",")
  t = t.replace(/\s*\.\s*\./g, ".")
  return t.trim()
}

function detectRequestKind(text: string): string {
  if (/aprob|decid|valid|resping|alege|optiune|propunere/i.test(text)) return "DECISION"
  if (/acces|permisiune|drept|deblocare/i.test(text)) return "ACCESS"
  if (/actiune|realiza|execut|implement|furniza|trimite/i.test(text)) return "ACTION"
  if (/valida|verifica|confirma|revizui/i.test(text)) return "VALIDATION"
  return "INFORMATION"
}

function extractOwnerFriendlyRequest(title: string, body: string, kind: string): string {
  const combined = `${title} ${body}`.slice(0, 500)

  switch (kind) {
    case "DECISION":
      return `Este necesara o decizie de la dumneavoastra: ${title}`
    case "ACCESS":
      return `Se solicita acordarea accesului: ${title}`
    case "ACTION":
      return `Este necesara o actiune concreta din partea dumneavoastra: ${title}`
    case "VALIDATION":
      return `Se solicita validarea: ${title}`
    default:
      return `Echipa va informeaza: ${title}`
  }
}

function extractDecisionOptions(body: string): string[] | undefined {
  // Căutăm opțiuni explicite: "1. ...", "a) ...", "- ..."
  const optionLines = body.match(/(?:^|\n)\s*(?:\d+[\.\)]\s*|[a-z]\)\s*|-\s+)(.+)/g)
  if (optionLines && optionLines.length >= 2) {
    return optionLines
      .map(l => stripTechJargon(l.replace(/^\s*(?:\d+[\.\)]\s*|[a-z]\)\s*|-\s+)/, "").trim()))
      .filter(l => l.length > 5)
      .slice(0, 5)
  }
  return undefined
}
