/**
 * intelligent-executor.ts — Sprint 5: Consolidare
 *
 * Wrapper peste task-executor.ts care adaugă pipeline-ul inteligent:
 *   threshold → KB-first → alignment → cost-gate → execute → telemetry → learning
 *
 * NU modifică task-executor original (safety). Înlocuiește doar punctul
 * de intrare din cron route.
 *
 * Principii implementate:
 * P1. Escalare cu învățare (learning pipeline)
 * P2. Cron pe praguri (threshold evaluator)
 * P3. KB-first (kb-first-resolver)
 * P4. Discriminare model (cost gate)
 * P5. Telemetry internă (execution-telemetry)
 * P6. Alignment checker (5 niveluri)
 */

import { prisma } from "@/lib/prisma"
import { executeTask, type ExecutorResult } from "./task-executor"
import { evaluateExecutorThreshold, type ThresholdResult } from "./threshold-evaluator"
import { resolveFromKB, saveToKBAfterExecution } from "./kb-first-resolver"
import { checkAlignment } from "./alignment-checker"
import { evaluateCostGate } from "./cost-gate"
import { logExecutionTelemetry, updateAgentBudget } from "./execution-telemetry"
import { extractPostExecutionLearning } from "./learning-pipeline"
import { learningFunnel } from "./learning-funnel"
import { learnFromImprovisation } from "./improvisation-learner"

// ── WHITELIST AGENȚI AUTORIZAȚI PENTRU EXECUȚIE AUTONOMĂ ─────────────────────
//
// Arhitectura: doar 3 surse comunică cu Claude:
//   COG  — evaluare organism, decizii strategice, delegare
//   L2   — cunoaștere domeniu (learning, distilare, cold start, KB enrichment)
//   L3   — legislație (scanare reglementări, conformitate, AI Act, GDPR)
//
// Restul structurii: muncește din L2 (KB-first). Claude doar la KB miss.
// Cronul nu execută task-uri ale agenților ne-autorizați.
//
// Grupuri autorizate:
// 1. COG — creierul (evaluare + delegare, 1 apel Claude Sonnet/ciclu)
// 2. DIRECTORI COG — execută delegări COG, rezolvă din L2
// 3. L3/VIGILENȚĂ — funcționare independentă, protejează organismul

const CRON_AUTHORIZED_AGENTS = new Set([
  // COG — creierul
  "COG",
  // Directori COG — execută delegări, rezolvă din L2 (KB-first)
  "COA", "COCSA", "CIA", "CCIA",
  // L3 — legislație + conformitate
  "CJA",            // Consilier Juridic (conformitate, Directiva EU, GDPR)
  // Vigilență — funcționare independentă
  "SVHA",           // Vulnerabilități & securitate
  "SA",             // Security Agent
  "TDA",            // Technical Debt Agent
  "SAFETY_MONITOR", // Monitor siguranță B2C
  "SQA",            // Security QA
])

export interface IntelligentRunResult {
  thresholdResult: ThresholdResult
  tasksProcessed: number
  tasksSkippedKB: number
  tasksSkippedMeta: number
  tasksBlockedAlignment: number
  tasksBlockedBudget: number
  tasksExecuted: number
  results: Array<{
    taskId: string
    assignedTo?: string
    title?: string
    outcome?: string
    status?: string
    kbHit: boolean
    reason?: string
    alignmentLevel?: number
    model?: string
    costUSD?: number
    learningCreated?: boolean
  }>
  totalDurationMs: number
}

/**
 * Punct de intrare inteligent — înlocuiește apelul direct la runBatch().
 *
 * Pipeline complet per task:
 * 1. Threshold check (merită să rulez?)
 * 2. Pentru fiecare task ASSIGNED:
 *    a. KB-first (am deja răspunsul?)
 *    b. Alignment check (e aliniat cu Câmpul?)
 *    c. Cost gate (am budget? ce model?)
 *    d. Execute (apel AI)
 *    e. Telemetry (log execuție)
 *    f. Learning (extrage artefact)
 */
export async function runIntelligentBatch(
  maxTasks: number = 5
): Promise<IntelligentRunResult> {
  const startTime = Date.now()

  // ═══ PAS 1: THRESHOLD CHECK (P2) ═══
  const threshold = await evaluateExecutorThreshold()

  if (!threshold.shouldExecute) {
    return {
      thresholdResult: threshold,
      tasksProcessed: 0,
      tasksSkippedKB: 0,
      tasksSkippedMeta: 0,
      tasksBlockedAlignment: 0,
      tasksBlockedBudget: 0,
      tasksExecuted: 0,
      results: [],
      totalDurationMs: Date.now() - startTime,
    }
  }

  // ═══ PAS 2: DELIBERARE COMPROMIS + LOAD TASKS ═══
  // Arbitrul decide câte sloturi extern vs intern
  let compromise: { externalSlots: number; internalSlots: number; externalTags: string[]; internalTags: string[] } | null = null
  try {
    const { deliberate, getTaskSelectionCriteria } = await import("@/lib/agents/resource-arbitrator")
    const { calculateCognitiveHealth } = await import("@/lib/agents/cognitive-health")
    const health = await calculateCognitiveHealth()
    const comp = await deliberate(maxTasks, health.overallScore)
    compromise = getTaskSelectionCriteria(comp)
  } catch {}

  // ═══ FILTRU FUNDAMENTAL: doar agenți autorizați pentru execuție autonomă ═══
  // COG + vigilență + directori COG. Restul structurii primește task-uri prin delegare.
  const authorizedFilter = { assignedTo: { in: [...CRON_AUTHORIZED_AGENTS] } }

  // Selectăm taskuri cu prioritizare extern/intern
  let tasks: any[]
  if (compromise) {
    const [externalTasks, internalTasks] = await Promise.all([
      prisma.agentTask.findMany({
        where: { status: "ASSIGNED", blockerType: null, ...authorizedFilter, tags: { hasSome: compromise.externalTags } },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        take: compromise.externalSlots,
        select: { id: true, assignedTo: true, title: true, description: true, taskType: true, priority: true, tags: true },
      }),
      prisma.agentTask.findMany({
        where: { status: "ASSIGNED", blockerType: null, ...authorizedFilter, tags: { hasSome: compromise.internalTags } },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        take: compromise.internalSlots,
        select: { id: true, assignedTo: true, title: true, description: true, taskType: true, priority: true, tags: true },
      }),
    ])
    const seen = new Set<string>()
    tasks = []
    for (const t of [...externalTasks, ...internalTasks]) {
      if (!seen.has(t.id)) { tasks.push(t); seen.add(t.id) }
    }
    if (tasks.length < maxTasks) {
      const filler = await prisma.agentTask.findMany({
        where: { status: "ASSIGNED", blockerType: null, ...authorizedFilter, id: { notIn: [...seen] } },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        take: maxTasks - tasks.length,
        select: { id: true, assignedTo: true, title: true, description: true, taskType: true, priority: true, tags: true },
      })
      tasks.push(...filler)
    }
  } else {
    // Fallback: selecție clasică — tot cu filtru autorizat
    tasks = await prisma.agentTask.findMany({
      where: { status: "ASSIGNED", blockerType: null, ...authorizedFilter },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      take: maxTasks,
      select: { id: true, assignedTo: true, title: true, description: true, taskType: true, priority: true, tags: true },
    })
  }

  // Prioritizare adaptiva bazata pe maturitate (citeste snapshot-ul)
  try {
    const maturityConfig = await prisma.systemConfig.findUnique({
      where: { key: "AGENT_MATURITY_SNAPSHOT" },
    })
    if (maturityConfig) {
      const snapshot = JSON.parse(maturityConfig.value)
      const seedAgents = new Set(
        (snapshot.agents || [])
          .filter((a: any) => a.level === "SEED")
          .map((a: any) => a.agent)
      )
      // SEED agents: deprioritizeaza taskuri CRITICAL (nu sunt pregatiti)
      // Muta taskurile CRITICAL ale SEED agents la sfarsit
      if (seedAgents.size > 0) {
        const critical = tasks.filter(t => t.priority === "CRITICAL" && seedAgents.has(t.assignedTo))
        const rest = tasks.filter(t => !(t.priority === "CRITICAL" && seedAgents.has(t.assignedTo)))
        tasks = [...rest, ...critical]
      }
    }
  } catch {}

  let tasksSkippedKB = 0
  let tasksBlockedAlignment = 0
  let tasksBlockedBudget = 0
  let tasksExecuted = 0
  let tasksSkippedMeta = 0
  const results: IntelligentRunResult["results"] = []

  // Import straturi cognitive (1, 12, 13)
  let metaEvaluateTask: ((id: string) => Promise<{ verdict: string; reason: string }>) | null = null
  let assessTaskImpact: ((id: string) => Promise<{ netAssessment: string; negativeEffects: any[] }>) | null = null
  let assessCertainty: ((id: string) => Promise<{ score: number; recommendation: string }>) | null = null
  try {
    const cogLayers = await import("@/lib/agents/cognitive-layers")
    metaEvaluateTask = cogLayers.metaEvaluateTask
  } catch {}
  try {
    const advLayers = await import("@/lib/agents/cognitive-layers-advanced")
    assessTaskImpact = advLayers.assessTaskImpact
    assessCertainty = advLayers.assessCertainty
  } catch {}

  // Import hierarchical critical thinking (agent→manager contestation)
  let evalManagerDirective: ((
    directive: string, agentRole: string, managerRole: string, ctx: any
  ) => Promise<{ verdict: string; reasoning: string; contestPoints?: string[]; suggestedAlternative?: string }>) | null = null
  let buildAgentCtx: ((role: string) => Promise<any>) | null = null
  try {
    const hct = await import("@/lib/agents/hierarchical-critical-thinking")
    evalManagerDirective = hct.evaluateManagerDirective
    buildAgentCtx = hct.buildAgentContext
  } catch {}

  for (const task of tasks) {
    // ═══ STRAT 0: HIERARCHICAL CRITICAL THINKING — "Does this directive make sense?" ═══
    // Before executing, if the task was assigned by a manager (not OWNER/SYSTEM/CONTEMPLATION),
    // the agent THINKS about the directive and may contest it.
    if (evalManagerDirective && buildAgentCtx && task.assignedTo) {
      try {
        // Load full task to check assignedBy
        const fullTask = await prisma.agentTask.findUnique({
          where: { id: task.id },
          select: { assignedBy: true },
        })
        const assignedBy = fullTask?.assignedBy
        const isManagerDirective = assignedBy &&
          assignedBy !== "OWNER" &&
          assignedBy !== "SYSTEM" &&
          assignedBy !== "CONTEMPLATION_ENGINE" &&
          assignedBy !== task.assignedTo // not self-assigned

        if (isManagerDirective) {
          const agentCtx = await buildAgentCtx(task.assignedTo)
          const contestResult = await evalManagerDirective(
            `${task.title}\n${task.description}`,
            task.assignedTo,
            assignedBy,
            agentCtx,
          )

          if (contestResult.verdict === "CONTEST" || contestResult.verdict === "SUGGEST_ALTERNATIVE") {
            // Create a response task back to the manager with the contestation
            const biz = await prisma.systemConfig.findUnique({ where: { key: "DEFAULT_BUSINESS_ID" } })
            const businessId = biz?.value ?? "biz_jobgrade"

            const contestDescription = [
              `[CONTESTARE DE LA ${task.assignedTo}]`,
              `Directiva originala: "${task.title}"`,
              `\nMotivare: ${contestResult.reasoning}`,
              ...(contestResult.contestPoints ?? []).map((p, i) => `\n${i + 1}. ${p}`),
              contestResult.suggestedAlternative
                ? `\nAlternativa propusa: ${contestResult.suggestedAlternative}`
                : "",
            ].join("\n")

            await prisma.agentTask.create({
              data: {
                businessId,
                assignedBy: task.assignedTo,
                assignedTo: assignedBy,
                title: `[Contestare] Re: ${task.title.slice(0, 80)}`,
                description: contestDescription,
                taskType: "REVIEW",
                priority: task.priority,
                tags: ["contestation", "hierarchical-critical-thinking", `ref:${task.id}`],
                status: "ASSIGNED",
              },
            })

            // Block the original task pending manager review
            await prisma.agentTask.update({
              where: { id: task.id },
              data: {
                status: "BLOCKED",
                blockerType: "DEPENDENCY",
                blockerDescription: `[HCT:${contestResult.verdict}] ${task.assignedTo} contesta directiva. Asteptare decizie ${assignedBy}.`,
                blockedAt: new Date(),
              },
            })

            results.push({
              taskId: task.id,
              assignedTo: task.assignedTo,
              title: task.title,
              status: "BLOCKED",
              kbHit: false,
              reason: `Hierarchical contestation: ${contestResult.verdict} — ${contestResult.reasoning.slice(0, 200)}`,
            })
            continue
          }
          // ACCEPT → proceed normally
        }
      } catch {
        // Critical thinking evaluation failed — proceed with execution (fail-open)
      }
    }

    // ═══ STRAT COGNITIV 1: META-EVALUATOR — "Mai are sens acest task?" ═══
    if (metaEvaluateTask) {
      try {
        const meta = await metaEvaluateTask(task.id)
        if (meta.verdict !== "PROCEED") {
          // Task-ul nu mai are sens — skip fără apel Claude
          await prisma.agentTask.update({
            where: { id: task.id },
            data: {
              status: "COMPLETED",
              completedAt: new Date(),
              result: `[META-SKIP:${meta.verdict}] ${meta.reason}`,
              kbHit: true, // nu a consumat Claude
            },
          })
          tasksSkippedMeta++
          results.push({
            taskId: task.id,
            assignedTo: task.assignedTo,
            title: task.title,
            status: "COMPLETED" as const,
            kbHit: true,
            reason: `Meta-evaluator: ${meta.verdict} — ${meta.reason}`,
          })
          continue
        }
      } catch {}
    }

    // ═══ STRAT 12+13: Impact + Certitudine (doar CRITICAL/HIGH) ═══
    if (task.priority === "CRITICAL" || task.priority === "HIGH") {
      try {
        if (assessTaskImpact) {
          const impact = await assessTaskImpact(task.id)
          if (impact.netAssessment === "ESCALATE") {
            // Prea multe efecte negative — skip, Owner decide
            await prisma.agentTask.update({
              where: { id: task.id },
              data: { status: "BLOCKED", blockerType: "DEPENDENCY", blockerDescription: `[IMPACT-ESCALATE] ${impact.negativeEffects.map((e: any) => e.risk).join("; ")}`, blockedAt: new Date() },
            })
            results.push({ taskId: task.id, assignedTo: task.assignedTo, title: task.title, status: "BLOCKED", kbHit: false, reason: "Impact simulator: ESCALATE" })
            continue
          }
        }
        if (assessCertainty) {
          const certainty = await assessCertainty(task.id)
          if (certainty.recommendation === "ESCALATE_TO_OWNER") {
            await prisma.agentTask.update({
              where: { id: task.id },
              data: { status: "BLOCKED", blockerType: "WAITING_OWNER", blockerDescription: `[UNCERTAINTY] Score ${certainty.score}/100 — insuficientă certitudine`, blockedAt: new Date() },
            })
            results.push({ taskId: task.id, assignedTo: task.assignedTo, title: task.title, status: "BLOCKED", kbHit: false, reason: `Uncertainty: ${certainty.score}/100 → ESCALATE` })
            continue
          }
        }
      } catch {}
    }

    let kbHit = false
    let alignmentLevel: number | undefined
    let model: string | undefined
    let costUSD: number | undefined
    let learningCreated = false

    // ═══ PAS 3: KB-FIRST (P3) — DISTINCȚIE ȘTIU vs FAC ═══
    //
    // PRINCIPIU: "Știu că știu să fac" ≠ "Am făcut"
    //
    // KB poate REZOLVA (înlocui execuția) DOAR pentru task-uri de CUNOAȘTERE:
    //   - KB_RESEARCH: "Ce zice Art. 9?" → KB e răspunsul
    //   - KB_VALIDATION: "E corect acest SOP?" → KB e răspunsul
    //   - DATA_ANALYSIS cu tag "lookup": "Ce date avem despre X?" → KB e răspunsul
    //
    // Pentru ORICE task de ACȚIUNE, KB devine CONTEXT (injectat în prompt),
    // nu RĂSPUNS (marcat COMPLETED):
    //   - CONTENT_CREATION: trebuie să producă conținut NOU
    //   - PROCESS_EXECUTION: trebuie să execute un proces
    //   - OUTREACH: trebuie să contacteze pe cineva
    //   - REVIEW: trebuie să verifice ceva CONCRET
    //   - INVESTIGATION: trebuie să cerceteze și să raporteze FAPTE
    //
    const KNOWLEDGE_TASK_TYPES = ["KB_RESEARCH", "KB_VALIDATION"]
    const isKnowledgeTask = KNOWLEDGE_TASK_TYPES.includes(task.taskType) ||
      (task.taskType === "DATA_ANALYSIS" && (task.tags ?? []).some((t: string) => t === "lookup"))

    // Căutăm în KB — pragul scade organic cu experiența agentului
    // Mai multe taskuri similare rezolvate cu succes = mai multă încredere în KB
    let kbThreshold = 0.85 // baseline strict
    try {
      const { loadCognitiveState } = await import("@/lib/agents/cognitive-state")
      const agentState = await loadCognitiveState(task.assignedTo)
      if (agentState) {
        const c = agentState.current
        // Cu cât agentul are mai multă experiență, cu atât se încrede mai mult în KB
        // 0 execuții → 0.85, 20 execuții → 0.75, 50+ execuții → 0.65
        const experienceDiscount = Math.min(0.20, c.totalExecutions * 0.004)
        // Success rate ridicat = încredere că KB-ul e bun
        const successBonus = c.totalExecutions > 5 && c.totalSuccesses / c.totalExecutions > 0.7 ? 0.05 : 0
        kbThreshold = Math.max(0.60, 0.85 - experienceDiscount - successBonus)
      }
    } catch {}

    const kbResult = await resolveFromKB(
      task.assignedTo,
      task.title,
      task.description,
      kbThreshold
    )

    // KB ca context pentru task-uri de acțiune (injectat în prompt la PAS 6)
    const kbContext = kbResult.hit ? kbResult.content?.slice(0, 1000) : undefined

    // ═══ KB-FIRST PENTRU ORICE TASK (nu doar KB_RESEARCH) ═══
    // Principiu: L2 (cunoașterea) e sursa primară. Claude doar la KB miss.
    // Dacă KB-ul dă hit cu confidence ridicat, task-ul se rezolvă fără Claude.
    // Threshold mai strict pentru task-uri de acțiune vs cunoaștere.
    const kbConfidenceOk = isKnowledgeTask
      ? kbResult.hit  // knowledge: orice hit e suficient
      : kbResult.hit && (kbResult.confidence ?? 0) >= 0.80  // acțiune: confidence >80%

    if (kbConfidenceOk) {
      kbHit = true
      tasksSkippedKB++

      await prisma.agentTask.update({
        where: { id: task.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          result: `[KB-RESOLVED level=${kbResult.level}] ${kbResult.content?.slice(0, 500)}`,
          kbHit: true,
        },
      })

      await logExecutionTelemetry({
        taskId: task.id,
        agentRole: task.assignedTo,
        taskType: task.taskType,
        modelUsed: "kb-cached",
        tokensInput: 0,
        tokensOutput: 0,
        estimatedCostUSD: 0,
        kbHit: true,
        kbSimilarityScore: kbResult.confidence,
        thresholdPassed: true,
        durationMs: 0,
        isInternal: true,
      })

      results.push({
        taskId: task.id,
        outcome: "KB_RESOLVED",
        kbHit: true,
        learningCreated: false,
      })
      continue
    }
    // KB miss sau confidence insuficientă → continuă la Claude (PAS 4+)

    // ═══ PAS 4: ALIGNMENT CHECK (P6) — SIMPLIFICAT ═══
    // Doar Nivel 1 (pattern-uri interzise). Task creat de COG/Owner/Claude = deja validat.
    // Alignment AI complet DOAR pentru taguri sensibile explicite.
    const hasSensitiveTag = (task.tags ?? []).some((t: string) =>
      ["legal", "client-facing", "strategy", "financial", "hr-decision"].includes(t)
    )

    let alignment: { allowed: boolean; level: number; result: string; reasoning: string; artifactCreated: boolean }

    if (!hasSensitiveTag) {
      // Nivel 1 rapid: doar pattern-uri interzise
      const { BLOCKED_PATTERNS } = await import("./alignment-checker")
      const hasBlockedPattern = BLOCKED_PATTERNS.some((p: RegExp) =>
        p.test(task.title) || p.test(task.description)
      )
      alignment = hasBlockedPattern
        ? { allowed: false, level: 1, result: "MISALIGNED", reasoning: "Pattern interzis detectat", artifactCreated: false }
        : { allowed: true, level: 1, result: "ALIGNED", reasoning: "Task operațional — bypass alignment", artifactCreated: false }
    } else {
      // Alignment complet doar pentru task-uri sensibile
      alignment = await checkAlignment(task.assignedTo, task.title, task.description, task.tags ?? [], false)
    }

    alignmentLevel = alignment.level

    if (!alignment.allowed) {
      tasksBlockedAlignment++
      await prisma.agentTask.update({
        where: { id: task.id },
        data: {
          status: "BLOCKED",
          blockerType: "TECHNICAL",
          blockerDescription: `Alignment check: ${alignment.result} (Nivel ${alignment.level}). ${alignment.reasoning}`,
        },
      })
      results.push({
        taskId: task.id,
        outcome: `ALIGNMENT_${alignment.result}`,
        kbHit: false,
        alignmentLevel: alignment.level,
        learningCreated: alignment.artifactCreated,
      })
      continue
    }

    // ═══ PAS 5: COST GATE (P4 + P5) ═══
    const costGate = await evaluateCostGate(
      task.assignedTo,
      task.taskType,
      task.priority,
      task.tags ?? []
    )

    if (!costGate.allowed) {
      tasksBlockedBudget++

      await prisma.agentTask.update({
        where: { id: task.id },
        data: {
          status: "BLOCKED",
          blockerType: "RESOURCE",
          blockerDescription: `Budget depășit: ${costGate.reason}`,
        },
      })

      results.push({
        taskId: task.id,
        outcome: "BUDGET_BLOCKED",
        kbHit: false,
        alignmentLevel,
        learningCreated: false,
      })
      continue
    }

    model = costGate.recommendedModel
    costUSD = costGate.estimatedCostUSD

    // ═══ PAS 6: EXECUTE (task-executor original) ═══
    // Injectăm KB context în descrierea taskului (agentul știe ce știe, dar FACE)
    if (kbContext) {
      await prisma.agentTask.update({
        where: { id: task.id },
        data: {
          description: task.description + `\n\n[CONTEXT DIN CUNOȘTINȚELE EXISTENTE — folosește ca referință, NU ca răspuns final]\n${kbContext}`,
        },
      })
    }

    let execResult: ExecutorResult
    try {
      execResult = await executeTask(task.id)
      tasksExecuted++
    } catch (e: any) {
      // ═══ IMPROVISATION — Before giving up, try improvisation ═══
      // Instead of immediately marking as FAILED, the organism TRIES SOMETHING.
      // Analogy: the plumber's tool is broken — he doesn't go home, he finds another way.
      let improvResult: { strategy: string; output: string; confidence: number; reasoning: string; isImprovised: true } | null = null
      try {
        const { improvise } = await import("@/lib/engines/improvisation-engine")
        const kbFragments = kbContext ? [kbContext] : []
        improvResult = await improvise({
          taskTitle: task.title,
          taskDescription: task.description,
          agentRole: task.assignedTo,
          failureReason: e.message ?? "Unknown execution failure",
          availableKB: kbFragments,
        })

        if (improvResult && improvResult.confidence > 0.4) {
          // Use improvised result instead of blocking
          tasksExecuted++
          await prisma.agentTask.update({
            where: { id: task.id },
            data: {
              status: "COMPLETED",
              completedAt: new Date(),
              result: `[IMPROVISED:${improvResult.strategy}] ${improvResult.output.slice(0, 2000)}`,
              kbHit: false,
            },
          })

          // ═══ IMPROVISATION LEARNING — extract learning regardless of quality ═══
          try {
            await learnFromImprovisation(
              {
                strategy: improvResult.strategy,
                context: {
                  taskTitle: task.title,
                  taskDescription: task.description,
                  agentRole: task.assignedTo,
                  failureReason: e.message ?? "Unknown execution failure",
                },
                output: improvResult.output,
                confidence: improvResult.confidence,
              },
              {
                resultQuality: improvResult.confidence, // Use confidence as initial quality proxy
              },
            )
          } catch {
            // Learning extraction is non-blocking
          }

          results.push({
            taskId: task.id,
            outcome: "IMPROVISED",
            kbHit: false,
            alignmentLevel,
            model,
            costUSD,
            learningCreated: true,
            reason: `Improvisation strategy: ${improvResult.strategy} (confidence: ${improvResult.confidence.toFixed(2)})`,
          })
          continue
        }
      } catch {
        // Improvisation itself failed — fall through to FAILED
      }

      // ═══ IMPROVISATION LEARNING FROM FAILURE — even more valuable ═══
      if (improvResult) {
        try {
          await learnFromImprovisation(
            {
              strategy: improvResult.strategy,
              context: {
                taskTitle: task.title,
                taskDescription: task.description,
                agentRole: task.assignedTo,
                failureReason: e.message ?? "Unknown execution failure",
              },
              output: improvResult.output,
              confidence: improvResult.confidence,
            },
            {
              resultQuality: Math.min(0.2, improvResult.confidence), // Low quality — it was rejected
            },
          )
        } catch {
          // Learning extraction is non-blocking
        }
      }

      results.push({
        taskId: task.id,
        outcome: "FAILED",
        kbHit: false,
        alignmentLevel,
        model,
        costUSD,
        learningCreated: !!improvResult,
      })
      continue
    }

    // ═══ PAS 7: TELEMETRY (P5) ═══
    const tokensUsed = execResult.tokensUsed ?? { input: 0, output: 0 }
    const actualCost = (tokensUsed.input / 1_000_000) * 3 + (tokensUsed.output / 1_000_000) * 15 // estimate Sonnet

    await logExecutionTelemetry({
      taskId: task.id,
      agentRole: task.assignedTo,
      taskType: task.taskType,
      modelUsed: model ?? "claude-sonnet-4-6",
      tokensInput: tokensUsed.input,
      tokensOutput: tokensUsed.output,
      estimatedCostUSD: actualCost,
      kbHit: false,
      alignmentResult: alignment.result,
      alignmentLevel: alignment.level,
      thresholdPassed: true,
      durationMs: execResult.durationMs,
      webSearchCount: execResult.webSearchCount ?? 0,
      isInternal: true,
    })

    await updateAgentBudget(task.assignedTo, tokensUsed.input + tokensUsed.output)

    // ═══ PAS 8: LEARNING — AMÂNAT PÂNĂ LA REVIEW ═══
    // NU salvăm learning la execuție. Learning se extrage DOAR când
    // managerul APROBĂ rezultatul (în proactive-loop reviewCompletedTasks).
    // Motivul: dacă managerul respinge (Q30 "nu ai făcut ce trebuia"),
    // nu vrem să învățăm din greșeală. Învățăm doar din succes validat.
    //
    // Task-uri KB_RESEARCH/KB_VALIDATION (fără review) salvează learning
    // imediat — sunt cunoaștere pură, nu acțiuni verificabile.
    const KNOWLEDGE_TYPES_LEARN = new Set(["KB_RESEARCH", "KB_VALIDATION"])
    if (KNOWLEDGE_TYPES_LEARN.has(task.taskType) && execResult.outcome === "COMPLETED" && execResult.result) {
      const artifactId = await extractPostExecutionLearning({
        taskId: task.id,
        agentRole: task.assignedTo,
        taskTitle: task.title,
        taskType: task.taskType,
        result: execResult.result,
        wasSuccessful: true,
      })
      learningCreated = !!artifactId

      await saveToKBAfterExecution(
        task.assignedTo,
        task.title,
        execResult.result,
        0.5
      )
    }

    results.push({
      taskId: task.id,
      outcome: execResult.outcome,
      kbHit: false,
      alignmentLevel,
      model,
      costUSD: actualCost,
      learningCreated,
    })
  }

  return {
    thresholdResult: threshold,
    tasksProcessed: tasks.length,
    tasksSkippedKB,
    tasksSkippedMeta,
    tasksBlockedAlignment,
    tasksBlockedBudget,
    tasksExecuted,
    results,
    totalDurationMs: Date.now() - startTime,
  }
}
