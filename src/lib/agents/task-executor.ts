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

const MAX_SUB_TASKS = 10

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

async function buildSystemForExecutor(role: string, description: string): Promise<string> {
  const liveStatus = STRATEGIC_ROLES.has(role) ? await getSystemStatusForPrompt() : ""

  return buildAgentPrompt(role, description, {
    includeSystemPrompt: true,
    additionalContext: `${liveStatus}
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
  return { outcome: "COMPLETED", subTaskIds }
}

// ─── Action Executor — COG poate executa acțiuni operaționale ────────────────

// Roluri care pot emite acțiuni operaționale
const OPERATIONAL_ROLES = new Set(["COG", "COA", "COCSA"])

// Pattern: ACTION: SET_CONFIG key=SIGNAL_FILTER_LEVEL value=critical reason="prea multe semnale irelevante"
const ACTION_PATTERN = /ACTION:\s*SET_CONFIG\s+key=(\S+)\s+value=(\S+)(?:\s+reason="([^"]*)")?/g

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
    const [, title, body] = notifyMatch
    try {
      // Find Owner user
      const owner = await (prisma as any).user.findFirst({
        where: { role: { in: ["OWNER", "SUPER_ADMIN"] } },
        select: { id: true },
      })
      if (owner) {
        await (prisma as any).notification.create({
          data: {
            userId: owner.id,
            type: "COG_MESSAGE",
            title: `[${agentRole}] ${title}`,
            body,
            read: false,
          },
        })
        actions.push(`[NOTIFIED] Owner: ${title}`)
        console.log(`[ACTION] ${agentRole} NOTIFY_OWNER: ${title}`)
      }
    } catch (e: any) {
      actions.push(`[NOTIFY_FAILED] ${title} — ${e.message}`)
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
    const system = await buildSystemForExecutor(task.assignedTo, description)
    const userMessage = buildUserMessage(ctx)

    const { payload, tokensUsed, webSearchCount } = await invokeLLM(system, userMessage, task)
    const { outcome, subTaskIds } = await applyEffects(task, payload)

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
