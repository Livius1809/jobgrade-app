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

export interface IntelligentRunResult {
  thresholdResult: ThresholdResult
  tasksProcessed: number
  tasksSkippedKB: number
  tasksBlockedAlignment: number
  tasksBlockedBudget: number
  tasksExecuted: number
  results: Array<{
    taskId: string
    outcome: string
    kbHit: boolean
    alignmentLevel?: number
    model?: string
    costUSD?: number
    learningCreated: boolean
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
      tasksBlockedAlignment: 0,
      tasksBlockedBudget: 0,
      tasksExecuted: 0,
      results: [],
      totalDurationMs: Date.now() - startTime,
    }
  }

  // ═══ PAS 2: LOAD TASKS ═══
  const tasks = await prisma.agentTask.findMany({
    where: {
      status: "ASSIGNED",
      blockerType: null,
    },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: maxTasks,
    select: {
      id: true,
      assignedTo: true,
      title: true,
      description: true,
      taskType: true,
      priority: true,
      tags: true,
    },
  })

  let tasksSkippedKB = 0
  let tasksBlockedAlignment = 0
  let tasksBlockedBudget = 0
  let tasksExecuted = 0
  const results: IntelligentRunResult["results"] = []

  for (const task of tasks) {
    let kbHit = false
    let alignmentLevel: number | undefined
    let model: string | undefined
    let costUSD: number | undefined
    let learningCreated = false

    // ═══ PAS 3: KB-FIRST (P3) ═══
    const kbResult = await resolveFromKB(
      task.assignedTo,
      task.title,
      task.description,
      0.85 // threshold aprobat Owner D3
    )

    if (kbResult.hit) {
      // Rezolvat din KB — marcăm COMPLETED fără apel AI
      kbHit = true
      tasksSkippedKB++

      await prisma.agentTask.update({
        where: { id: task.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          result: `[KB-RESOLVED level=${kbResult.level}] ${kbResult.content?.slice(0, 500)}`,
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
    let execResult: ExecutorResult
    try {
      execResult = await executeTask(task.id)
      tasksExecuted++
    } catch (e: any) {
      results.push({
        taskId: task.id,
        outcome: "FAILED",
        kbHit: false,
        alignmentLevel,
        model,
        costUSD,
        learningCreated: false,
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

    // ═══ PAS 8: LEARNING (P1 + P6 inductiv) ═══
    if (execResult.outcome === "COMPLETED" && execResult.result) {
      const artifactId = await extractPostExecutionLearning({
        taskId: task.id,
        agentRole: task.assignedTo,
        taskTitle: task.title,
        taskType: task.taskType,
        result: execResult.result,
        wasSuccessful: true,
      })
      learningCreated = !!artifactId

      // Salvăm în KB pentru viitoare KB-first hits
      await saveToKBAfterExecution(
        task.assignedTo,
        task.title,
        execResult.result,
        0.5
      )
    }

    // ═══ PAS 9: PÂLNIA DE ÎNVĂȚARE ═══
    try {
      await learningFunnel({
        agentRole: task.assignedTo,
        type: "TASK",
        input: `${task.title}: ${task.description.slice(0, 300)}`,
        output: execResult.result?.slice(0, 1000) || execResult.outcome,
        success: execResult.outcome === "COMPLETED",
      })
    } catch (e) {
      // Pâlnia nu trebuie să blocheze execuția
      console.log("[FUNNEL] Error (non-blocking):", (e as Error).message?.slice(0, 80))
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
    tasksBlockedAlignment,
    tasksBlockedBudget,
    tasksExecuted,
    results,
    totalDurationMs: Date.now() - startTime,
  }
}
