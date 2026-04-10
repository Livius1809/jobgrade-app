/**
 * proactive-loop.ts — Ciclul proactiv de management pentru agenți cu subordonați
 *
 * Fiecare manager, periodic:
 *   1. COLECTARE  — status subordonați (task-uri, blocaje, metrici KB)
 *   2. EVALUARE   — progres vs. obiective, detectare devieri
 *   3. DECIZIE    — TRACK / INTERVENE / ESCALATE
 *   4. ACȚIUNE    — execuție decizie (reasignare, reprioritizare, escaladare)
 *   5. LOG        — audit trail complet
 *
 * Principiu: obiectivele clare se urmăresc până la îndeplinire.
 * Blocajele se rezolvă la cel mai jos nivel posibil.
 * Doar ce nu se poate rezolva se escaladează.
 */

import Anthropic from "@anthropic-ai/sdk"
import { type ManagerConfig } from "./manager-configs"
import { runFullAnalysis, formatAnalysisForPrompt, type OrgAnalysisReport } from "./org-analysis"
import { buildAgentPrompt } from "./agent-prompt-builder"
import {
  createEscalation,
  resolveEscalation,
  getActiveEscalations,
  type Escalation,
} from "./escalation-chain"

// ── Tipuri ────────────────────────────────────────────────────────────────────

export type CycleDecision = "TRACK" | "INTERVENE" | "ESCALATE"

export interface SubordinateStatus {
  agentRole: string
  kbEntriesCount: number
  bufferPending: number
  lastActivity: string | null
  activeTasksCount: number
  blockedTasksCount: number
  healthScore: number // 0-100
}

export interface CycleEvaluation {
  subordinate: string
  status: "ON_TRACK" | "AT_RISK" | "BLOCKED" | "IDLE"
  reason: string
  suggestedAction?: string
}

export interface CycleAction {
  type: CycleDecision
  target: string
  description: string
  details: string
  escalationId?: string
}

export interface CycleResult {
  managerId: string
  managerRole: string
  timestamp: string
  durationMs: number
  subordinatesChecked: number
  evaluations: CycleEvaluation[]
  actions: CycleAction[]
  summary: string
  nextCycleAt: string
}

// ── Constante ─────────────────────────────────────────────────────────────────

const MODEL = "claude-sonnet-4-20250514"

// ── Colectare status subordonați ──────────────────────────────────────────────

async function collectSubordinateStatuses(
  subordinates: string[],
  prisma: any
): Promise<SubordinateStatus[]> {
  const statuses: SubordinateStatus[] = []

  for (const role of subordinates) {
    // KB entries count
    const kbCount = await prisma.kBEntry.count({
      where: { agentRole: role, status: "PERMANENT" },
    }).catch(() => 0)

    // Buffer pending
    const bufferCount = await prisma.kBBuffer.count({
      where: { agentRole: role, status: "PENDING" },
    }).catch(() => 0)

    // Last activity (ultima entry KB validată)
    const lastEntry = await prisma.kBEntry.findFirst({
      where: { agentRole: role },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }).catch(() => null)

    // Active tasks (din CycleLog)
    const activeTasks = await prisma.cycleLog.count({
      where: {
        targetRole: role,
        actionType: "INTERVENE",
        resolved: false,
      },
    }).catch(() => 0)

    // Blocked tasks
    const blockedTasks = await prisma.cycleLog.count({
      where: {
        targetRole: role,
        actionType: "ESCALATE",
        resolved: false,
      },
    }).catch(() => 0)

    // Health score calculat
    let healthScore = 50 // baseline
    if (kbCount > 0) healthScore += 15 // are KB
    if (kbCount > 10) healthScore += 10 // KB substanțial
    if (bufferCount > 0) healthScore += 5 // activitate de învățare
    if (lastEntry?.createdAt) {
      const daysSinceActivity = (Date.now() - new Date(lastEntry.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceActivity < 1) healthScore += 15
      else if (daysSinceActivity < 7) healthScore += 10
      else if (daysSinceActivity > 30) healthScore -= 20
    } else {
      healthScore -= 15 // nicio activitate
    }
    if (blockedTasks > 0) healthScore -= 15 * blockedTasks
    healthScore = Math.max(0, Math.min(100, healthScore))

    statuses.push({
      agentRole: role,
      kbEntriesCount: kbCount,
      bufferPending: bufferCount,
      lastActivity: lastEntry?.createdAt?.toISOString() || null,
      activeTasksCount: activeTasks,
      blockedTasksCount: blockedTasks,
      healthScore,
    })
  }

  return statuses
}

// ── Evaluare prin Claude ──────────────────────────────────────────────────────

function buildEvaluationPrompt(config: ManagerConfig): string {
  return `Ești ${config.role} (${config.description}) în platforma JobGrade.

ROLUL TĂU ÎN ACEST CICLU: Evaluezi statusul subordonaților tăi și decizi ce acțiuni sunt necesare.

SUBORDONAȚII TĂI: ${config.subordinates.join(", ")}

OBIECTIVELE ACTIVE:
${config.objectives.map((o, i) => `${i + 1}. ${o}`).join("\n")}

THRESHOLD-URI:
- Health score sub ${config.thresholds.healthScoreCritical}: BLOCAT — necesită intervenție imediată
- Health score sub ${config.thresholds.healthScoreWarning}: LA RISC — monitorizare strânsă
- Zile fără activitate > ${config.thresholds.maxIdleDays}: IDLE — necesită activare
- Buffer pending > ${config.thresholds.maxPendingBuffer}: Bottleneck de procesare

ESCALĂRI ACTIVE (deja raportate la nivelul superior):
{{escalations}}

INSTRUCȚIUNI:
1. Evaluează fiecare subordonat: ON_TRACK, AT_RISK, BLOCKED, sau IDLE
2. Pentru fiecare care NU e ON_TRACK, propune o acțiune concretă
3. Decide: TRACK (monitorizare), INTERVENE (acțiune directă), ESCALATE (nu poți rezolva singur)
4. ESCALATE DOAR dacă nu ai resurse/autoritate să rezolvi — nu pentru orice problemă

FORMAT RĂSPUNS — JSON strict:
{
  "evaluations": [
    {
      "subordinate": "AGENT_ROLE",
      "status": "ON_TRACK|AT_RISK|BLOCKED|IDLE",
      "reason": "explicație scurtă",
      "suggestedAction": "acțiune concretă (dacă nu e ON_TRACK)"
    }
  ],
  "actions": [
    {
      "type": "TRACK|INTERVENE|ESCALATE",
      "target": "AGENT_ROLE",
      "description": "ce faci",
      "details": "detalii acționabile"
    }
  ],
  "summary": "sinteză 1-2 propoziții a stării generale"
}

Nu include text în afara JSON-ului.`
}

async function evaluateSubordinates(
  config: ManagerConfig,
  statuses: SubordinateStatus[],
  activeEscalations: Escalation[],
  apiKey?: string,
  prisma?: any
): Promise<{
  evaluations: CycleEvaluation[]
  actions: CycleAction[]
  summary: string
}> {
  const client = apiKey ? new Anthropic({ apiKey }) : new Anthropic()

  const statusReport = statuses
    .map(
      (s) =>
        `${s.agentRole}: health=${s.healthScore}/100, KB=${s.kbEntriesCount} entries, ` +
        `buffer=${s.bufferPending} pending, tasks=${s.activeTasksCount} active / ${s.blockedTasksCount} blocked, ` +
        `lastActivity=${s.lastActivity || "NICIODATĂ"}`
    )
    .join("\n")

  const escalationReport =
    activeEscalations.length > 0
      ? activeEscalations
          .map((e) => `- [${e.id}] ${e.sourceRole} → ${e.targetRole}: ${e.reason} (${e.status})`)
          .join("\n")
      : "Nicio escalare activă."

  let orgAnalysisSection = ""
  if (config.agentRole === "COG") {
    try {
      // Run org analysis for COG's strategic cycle
      const analysis = await runFullAnalysis(prisma as any)
      orgAnalysisSection = "\n\n" + formatAnalysisForPrompt(analysis) + `

Dacă identifici nevoi structurale (agent lipsă, redundanță, restructurare),
adaugă în actions cu type: "PROPOSE_ORG_CHANGE" și în details include un JSON cu:
{"proposalType": "ADD_AGENT|REMOVE_AGENT|MERGE_AGENTS|MODIFY_HIERARCHY", "spec": {...}}
Generează propuneri DOAR pentru gap-uri sau redundanțe cu severity HIGH.`
    } catch (e: any) {
      console.warn("[PROACTIVE] Org analysis failed for COG:", e.message)
    }
  }

  // Build layered prompt: L1 (CÂMP) + L2 (Support) + L3 (Legal) + evaluation instructions
  const evaluationInstructions = buildEvaluationPrompt(config).replace(
    "{{escalations}}",
    escalationReport
  ) + orgAnalysisSection

  const systemPrompt = buildAgentPrompt(config.agentRole, config.description, {
    additionalContext: evaluationInstructions,
    includeSystemPrompt: true,
  })

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Status subordonați la ${new Date().toISOString()}:\n\n${statusReport}`,
      },
    ],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : "{}"
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    return {
      evaluations: [],
      actions: [],
      summary: "Nu am putut evalua — răspuns invalid de la AI.",
    }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0])
    return {
      evaluations: parsed.evaluations || [],
      actions: parsed.actions || [],
      summary: parsed.summary || "",
    }
  } catch {
    return {
      evaluations: [],
      actions: [],
      summary: "Eroare parsare răspuns AI.",
    }
  }
}

// ── Execuție acțiuni ──────────────────────────────────────────────────────────

async function executeActions(
  config: ManagerConfig,
  actions: CycleAction[],
  prisma: any
): Promise<CycleAction[]> {
  const executedActions: CycleAction[] = []

  for (const action of actions) {
    try {
      if (action.type === "ESCALATE") {
        // Creează escalare formală
        const escalation = await createEscalation(
          {
            sourceRole: config.agentRole,
            targetRole: config.reportsTo,
            aboutRole: action.target,
            reason: action.description,
            details: action.details,
            priority: "HIGH",
          },
          prisma
        )
        action.escalationId = escalation.id
      } else if (action.type === "PROPOSE_ORG_CHANGE" as any) {
        // COG propune modificare structurală → OrgProposal
        try {
          const spec = JSON.parse(action.details || "{}")
          await prisma.orgProposal.create({
            data: {
              proposalType: spec.proposalType || "ADD_AGENT",
              status: "DRAFT",
              proposedBy: config.agentRole,
              title: action.description,
              description: action.description,
              rationale: `Identificat automat de ${config.agentRole} în ciclul proactiv.`,
              changeSpec: spec.spec || spec,
              agentRole: action.target !== config.agentRole ? action.target : null,
            },
          })
          console.log(`   📋 OrgProposal creat: ${action.description}`)
        } catch (e: any) {
          console.warn(`   ⚠ OrgProposal failed: ${e.message}`)
        }
      }

      // Loguiează în CycleLog
      const cycleLog = await prisma.cycleLog.create({
        data: {
          managerRole: config.agentRole,
          targetRole: action.target,
          actionType: action.type,
          description: action.description,
          details: action.details,
          escalationId: action.escalationId || null,
          resolved: action.type === "TRACK",
        },
      }).catch(() => {
        console.log(
          `   [${config.agentRole}] ${action.type} → ${action.target}: ${action.description}`
        )
        return null
      })

      // Calea 1: INTERVENE → AgentTask (delegare downward)
      if (action.type === "INTERVENE") {
        try {
          const { convertInterventionToTask } = await import("./task-delegation")
          const delegated = convertInterventionToTask(
            { target: action.target, type: "INTERVENE", description: action.description, details: action.details },
            config.agentRole,
          )
          // Dedup: nu crea task dacă deja există unul activ
          const existingTask = await prisma.agentTask.findFirst({
            where: {
              assignedTo: action.target,
              assignedBy: config.agentRole,
              status: { in: ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"] },
            },
          }).catch(() => null)

          if (!existingTask) {
            const deadlineAt = delegated.deadlineHours
              ? new Date(Date.now() + delegated.deadlineHours * 60 * 60 * 1000)
              : null
            await prisma.agentTask.create({
              data: {
                businessId: "biz_jobgrade",
                assignedBy: config.agentRole,
                cycleLogId: cycleLog?.id ?? null,
                assignedTo: delegated.assignedTo,
                title: delegated.title,
                description: delegated.description,
                taskType: delegated.taskType,
                priority: delegated.priority,
                tags: delegated.tags,
                deadlineAt,
                estimatedMinutes: delegated.estimatedMinutes,
                status: "ASSIGNED",
              },
            })
            console.log(`   📋 Task delegat: ${config.agentRole} → ${action.target}: ${delegated.title}`)
          }
        } catch (e: any) {
          // agent_tasks table might not exist yet — silent
          console.log(`   [task-delegation] ${e.message}`)
        }
      }

      executedActions.push(action)
    } catch (err: any) {
      console.error(`   ❌ Action failed [${action.target}]: ${err.message}`)
      executedActions.push({ ...action, details: `EROARE: ${err.message}` })
    }
  }

  return executedActions
}

// ── Review taskuri completate de subordonați ─────────────────────────────────

async function reviewCompletedTasks(
  config: ManagerConfig,
  prisma: any,
  dryRun?: boolean
): Promise<void> {
  // Găsește taskuri COMPLETED ale subordonaților care nu au fost încă reviewuite
  const completedTasks = await prisma.agentTask.findMany({
    where: {
      assignedTo: { in: config.subordinates },
      assignedBy: config.agentRole,
      status: "COMPLETED",
      reviewedAt: null,
    },
    orderBy: { completedAt: "asc" },
    take: 10,
  }).catch(() => [])

  if (completedTasks.length === 0) return

  console.log(`   📝 [${config.agentRole}] ${completedTasks.length} taskuri completate de revizuit`)

  const client = new Anthropic()

  for (const task of completedTasks) {
    try {
      // Manager-ul evaluează calitatea rezultatului
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 300,
        system: `Ești ${config.agentRole}, manager. Evaluezi rezultatul unui task completat de subordonatul ${task.assignedTo}.
Răspunde DOAR în format JSON:
{"approved": true/false, "feedback": "mesaj scurt pentru subordonat", "reason": "de ce aprobi sau respingi"}
Dacă task-ul nu are rezultat documentat sau e neclar, respinge cu feedback constructiv.`,
        messages: [
          {
            role: "user",
            content: `Task: "${task.title}"\nDescriere: ${task.description}\nRezultat raportat: ${task.result || "niciun rezultat documentat"}\nDurată: ${task.completedAt && task.startedAt ? Math.round((new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime()) / 60000) + " min" : "necunoscută"}`,
          },
        ],
      })

      const text = response.content[0].type === "text" ? response.content[0].text : ""
      let review: { approved: boolean; feedback: string; reason: string }

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        review = jsonMatch ? JSON.parse(jsonMatch[0]) : { approved: true, feedback: "OK", reason: "parsare eșuată" }
      } catch {
        review = { approved: true, feedback: "Acceptat", reason: "review automat" }
      }

      if (dryRun) {
        console.log(`   [dryRun] ${task.assignedTo}/${task.title}: ${review.approved ? "APPROVED" : "NEEDS_REVISION"} — ${review.feedback}`)
        continue
      }

      if (review.approved) {
        // Aprobat — marchează ca reviewed
        await prisma.agentTask.update({
          where: { id: task.id },
          data: {
            reviewedBy: config.agentRole,
            reviewedAt: new Date(),
            reviewNote: `APPROVED: ${review.feedback}`,
            resultQuality: 80,
          },
        }).catch(async (e: Error) => {
          console.error(`[proactive-loop] Failed to mark task ${task.id} as APPROVED: ${e.message}`)
          try {
            const Sentry = await import("@sentry/nextjs").catch(() => null)
            if (Sentry) {
              Sentry.captureException(e, {
                tags: { module: "proactive-loop", function: "reviewCompletedTasks", action: "approve", taskId: task.id },
                level: "warning",
              })
            }
          } catch {}
        })

        console.log(`   ✅ ${task.assignedTo}/${task.title}: APPROVED — ${review.feedback}`)
      } else {
        // Respins — reasignare cu feedback
        await prisma.agentTask.update({
          where: { id: task.id },
          data: {
            status: "ASSIGNED",
            completedAt: null,
            reviewedBy: config.agentRole,
            reviewedAt: new Date(),
            reviewNote: `NEEDS_REVISION: ${review.feedback}`,
            resultQuality: 30,
          },
        }).catch(async (e: Error) => {
          console.error(`[proactive-loop] Failed to mark task ${task.id} as NEEDS_REVISION: ${e.message}`)
          try {
            const Sentry = await import("@sentry/nextjs").catch(() => null)
            if (Sentry) {
              Sentry.captureException(e, {
                tags: { module: "proactive-loop", function: "reviewCompletedTasks", action: "reject", taskId: task.id },
                level: "warning",
              })
            }
          } catch {}
        })

        console.log(`   🔄 ${task.assignedTo}/${task.title}: NEEDS_REVISION — ${review.feedback}`)
      }
    } catch (err: any) {
      console.error(`   ❌ Review failed [${task.id}]: ${err.message}`)
    }
  }
}

// ── Verificare escalări anterioare rezolvate ──────────────────────────────────

async function checkResolvedEscalations(
  config: ManagerConfig,
  statuses: SubordinateStatus[],
  prisma: any
): Promise<void> {
  const activeEscalations = await getActiveEscalations(config.agentRole, prisma)

  for (const esc of activeEscalations) {
    // Verifică dacă subordonatul escaladat s-a deblocat
    const sub = statuses.find((s) => s.agentRole === esc.aboutRole)
    if (sub && sub.healthScore >= config.thresholds.healthScoreWarning && sub.blockedTasksCount === 0) {
      await resolveEscalation(
        esc.id,
        `Rezolvat automat — ${esc.aboutRole} health score: ${sub.healthScore}, 0 blocaje`,
        prisma
      )
      console.log(`   ✅ Escalare ${esc.id} rezolvată automat (${esc.aboutRole} deblocat)`)
    }
  }
}

// ── Ciclul principal ──────────────────────────────────────────────────────────

export async function runProactiveCycle(
  config: ManagerConfig,
  prisma: any,
  options?: { apiKey?: string; dryRun?: boolean }
): Promise<CycleResult> {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()

  console.log(`\n🔄 [${config.agentRole}] Ciclu proactiv start — ${config.subordinates.length} subordonați`)

  // 1. COLECTARE
  // Filtrăm subordonații după activityMode — nu evaluăm agenți în stări în care
  // evaluarea ar produce bucle de INTERVENE fără efect (05.04.2026, Sprint 3 Block 2):
  //  - DORMANT_UNTIL_DELEGATED: așteaptă Calea 1 (delegare executor funcțională)
  //  - PAUSED_KNOWN_GAP: pauzați explicit de Owner până la rezolvare cunoscută
  //  - REACTIVE_TRIGGERED: absența e starea normală, nu disfuncție
  // Rămân evaluabili: PROACTIVE_CYCLIC + HYBRID.
  const subordinateModes = await prisma.agentDefinition.findMany({
    where: { agentRole: { in: config.subordinates } },
    select: { agentRole: true, activityMode: true },
  }).catch(() => [] as { agentRole: string; activityMode: string }[])
  const EVALUABLE_MODES = new Set(["PROACTIVE_CYCLIC", "HYBRID"])
  const evaluableSubs = config.subordinates.filter((s) => {
    const mode = subordinateModes.find((m: { agentRole: string; activityMode: string }) => m.agentRole === s)?.activityMode ?? "PROACTIVE_CYCLIC"
    return EVALUABLE_MODES.has(mode)
  })
  const skippedSubs = config.subordinates
    .filter((s) => !evaluableSubs.includes(s))
    .map((s) => ({
      role: s,
      mode: subordinateModes.find((m: { agentRole: string; activityMode: string }) => m.agentRole === s)?.activityMode ?? "unknown",
    }))
  if (skippedSubs.length > 0) {
    console.log(
      `   ⤷ Skip evaluare ${skippedSubs.length}/${config.subordinates.length} subordonați (non-evaluable mode): ` +
        skippedSubs.map((s) => `${s.role}(${s.mode})`).join(", "),
    )
  }
  // Dacă nu a rămas niciun subordonat evaluabil, returnăm rezultat gol — fără
  // buclă fără efect, fără cicluri de INTERVENE inutile. Managerul e "ocolit"
  // până când executorii lui migrează din DORMANT la PROACTIVE (post-Calea 1).
  if (evaluableSubs.length === 0) {
    console.log(`   ⤷ Toți subordonații sunt non-evaluable — skip ciclu complet`)
    return {
      managerId: config.agentRole.toLowerCase(),
      managerRole: config.agentRole,
      timestamp,
      durationMs: Date.now() - startTime,
      subordinatesChecked: 0,
      evaluations: [],
      actions: [],
      summary: `skip_all_subs_non_evaluable (${skippedSubs.length} subordonați)`,
      nextCycleAt: new Date(Date.now() + config.cycleIntervalHours * 60 * 60 * 1000).toISOString(),
    }
  }

  // Config "efectiv" — cu subordinates restrânși la cei evaluabili.
  // Fără asta, prompt-ul către Claude ar conține în `SUBORDONAȚII TĂI` lista
  // completă, iar Claude ar genera IDLE/INTERVENE pentru cei fără statuses
  // (bug-ul "8 evaluations la COA cu 1 subordonat real" — 05.04.2026).
  const effectiveConfig: ManagerConfig = { ...config, subordinates: evaluableSubs }

  const statuses = await collectSubordinateStatuses(evaluableSubs, prisma)

  // 2. Verifică escalări anterioare
  await checkResolvedEscalations(effectiveConfig, statuses, prisma).catch(async (e: Error) => {
    console.error(`[proactive-loop] checkResolvedEscalations failed for ${effectiveConfig.agentRole}: ${e.message}`)
    try {
      const Sentry = await import("@sentry/nextjs").catch(() => null)
      if (Sentry) {
        Sentry.captureException(e, {
          tags: { module: "proactive-loop", function: "checkResolvedEscalations", agentRole: effectiveConfig.agentRole },
          level: "warning",
        })
      }
    } catch {}
  })

  // 2b. REVIEW taskuri completate de subordonați
  await reviewCompletedTasks(effectiveConfig, prisma, options?.dryRun).catch(async (e: Error) => {
    console.error(`[proactive-loop] reviewCompletedTasks failed for ${effectiveConfig.agentRole}: ${e.message}`)
    try {
      const Sentry = await import("@sentry/nextjs").catch(() => null)
      if (Sentry) {
        Sentry.captureException(e, {
          tags: { module: "proactive-loop", function: "reviewCompletedTasks", agentRole: effectiveConfig.agentRole },
          level: "warning",
        })
      }
    } catch {}
  })

  // 3. Escalări active (pentru context AI)
  const activeEscalations = await getActiveEscalations(effectiveConfig.agentRole, prisma).catch(
    () => [] as Escalation[]
  )

  // 4. EVALUARE (Claude) — pe config efectiv
  const { evaluations, actions, summary } = await evaluateSubordinates(
    effectiveConfig,
    statuses,
    activeEscalations,
    options?.apiKey,
    prisma
  )

  // 5. ACȚIUNE
  let executedActions: CycleAction[] = []
  if (!options?.dryRun) {
    executedActions = await executeActions(effectiveConfig, actions, prisma)
  } else {
    executedActions = actions
  }

  // 6. LOG
  const nextCycleMs = config.cycleIntervalHours * 60 * 60 * 1000
  const nextCycleAt = new Date(Date.now() + nextCycleMs).toISOString()

  const result: CycleResult = {
    managerId: config.agentRole.toLowerCase(),
    managerRole: config.agentRole,
    timestamp,
    durationMs: Date.now() - startTime,
    subordinatesChecked: statuses.length,
    evaluations,
    actions: executedActions,
    summary,
    nextCycleAt,
  }

  console.log(
    `   📊 [${config.agentRole}] Ciclu complet:` +
      ` ${evaluations.filter((e) => e.status === "ON_TRACK").length} ON_TRACK,` +
      ` ${evaluations.filter((e) => e.status === "AT_RISK").length} AT_RISK,` +
      ` ${evaluations.filter((e) => e.status === "BLOCKED").length} BLOCKED,` +
      ` ${evaluations.filter((e) => e.status === "IDLE").length} IDLE` +
      ` | ${executedActions.filter((a) => a.type === "ESCALATE").length} escalări` +
      ` (${result.durationMs}ms)`
  )

  return result
}

// ── Batch: toți managerii ─────────────────────────────────────────────────────

export async function runAllManagerCycles(
  configs: ManagerConfig[],
  prisma: any,
  options?: { apiKey?: string; dryRun?: boolean; level?: "operational" | "tactical" | "strategic" }
): Promise<CycleResult[]> {
  // Filtrează per nivel dacă specificat
  let targetConfigs = configs
  if (options?.level) {
    const levelMap: Record<string, number[]> = {
      operational: [4], // 4h cycle
      tactical: [12],   // 12h cycle
      strategic: [24],  // 24h cycle
    }
    const intervals = levelMap[options.level] || []
    targetConfigs = configs.filter((c) => intervals.includes(c.cycleIntervalHours))
  }

  console.log(
    `\n🏢 Batch cicluri proactive: ${targetConfigs.length} manageri` +
      (options?.level ? ` (nivel: ${options.level})` : "")
  )

  const results: CycleResult[] = []

  // Rulează secvențial: bottom-up (operațional → tactic → strategic)
  // Astfel managerii de nivel superior au date actualizate de la cei inferiori
  targetConfigs.sort((a, b) => a.cycleIntervalHours - b.cycleIntervalHours)

  for (const config of targetConfigs) {
    const result = await runProactiveCycle(config, prisma, options)
    results.push(result)

    // Pauză între cicluri (evită overload API)
    await new Promise((r) => setTimeout(r, 2000))
  }

  return results
}
