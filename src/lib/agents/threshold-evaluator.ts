/**
 * threshold-evaluator.ts — Componenta A: Cron-uri pe praguri, nu pe frecvență
 *
 * Principiul P2: Cron-ul se declanșează DOAR când sunt detectate praguri
 * de "need-to-know" legate de obiective active. Fără prag → fără execuție
 * → fără cost.
 *
 * Înlocuiește logica de "rulează tot la 15 min" cu "verifică dacă merită
 * să ruleze" — cost zero dacă nu merită.
 */

import { prisma } from "@/lib/prisma"

export interface ThresholdResult {
  shouldExecute: boolean
  reason: string
  taskIds?: string[]
  urgencyScore: number // 0-100
}

/**
 * Evaluează dacă cron-ul executor ar trebui să ruleze.
 * Returnează false dacă nu există task-uri care justifică execuția.
 */
export async function evaluateExecutorThreshold(): Promise<ThresholdResult> {
  // 1. Verifică task-uri ASSIGNED cu deadline apropiat sau prioritate CRITICAL/HIGH
  const urgentTasks = await prisma.agentTask.findMany({
    where: {
      status: "ASSIGNED",
      OR: [
        { priority: "CRITICAL" },
        { priority: "HIGH" },
        { deadlineAt: { lte: new Date(Date.now() + 4 * 60 * 60 * 1000) } }, // deadline < 4h
      ],
    },
    select: { id: true, priority: true, title: true },
    take: 10,
  })

  if (urgentTasks.length > 0) {
    return {
      shouldExecute: true,
      reason: `${urgentTasks.length} task-uri urgente (CRITICAL/HIGH/deadline <4h)`,
      taskIds: urgentTasks.map((t) => t.id),
      urgencyScore: urgentTasks.some((t) => t.priority === "CRITICAL") ? 100 : 70,
    }
  }

  // 2. Verifică dacă există ORICE task ASSIGNED (non-urgent)
  const pendingCount = await prisma.agentTask.count({
    where: { status: "ASSIGNED" },
  })

  if (pendingCount === 0) {
    return {
      shouldExecute: false,
      reason: "Zero task-uri ASSIGNED — nimic de executat",
      urgencyScore: 0,
    }
  }

  // 3. Verifică dacă ultimul executor run a fost recent (evită spam)
  const lastTelemetry = await prisma.executionTelemetry.findFirst({
    where: { isInternal: true },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  })

  if (lastTelemetry) {
    const minsSinceLastRun = (Date.now() - lastTelemetry.createdAt.getTime()) / 60000
    // Dacă am rulat în ultimele 30 min și nu sunt urgente → skip
    if (minsSinceLastRun < 30) {
      return {
        shouldExecute: false,
        reason: `Ultima execuție acum ${Math.round(minsSinceLastRun)} min — prea recent pentru task-uri non-urgente`,
        urgencyScore: 10,
      }
    }
  }

  // 4. Verifică dacă task-urile pending au dependențe neblocate
  const readyTasks = await prisma.agentTask.findMany({
    where: {
      status: "ASSIGNED",
      blockerType: null,
    },
    select: { id: true },
    take: 5,
  })

  if (readyTasks.length === 0) {
    return {
      shouldExecute: false,
      reason: `${pendingCount} task-uri ASSIGNED dar toate blocate`,
      urgencyScore: 5,
    }
  }

  return {
    shouldExecute: true,
    reason: `${readyTasks.length} task-uri ready (din ${pendingCount} total)`,
    taskIds: readyTasks.map((t) => t.id),
    urgencyScore: 40,
  }
}

/**
 * Evaluează dacă cron-ul de semnale ar trebui să ruleze.
 */
export async function evaluateSignalsThreshold(): Promise<ThresholdResult> {
  // Verifică semnale externe neprocesate
  const unprocCount = await (prisma as any).externalSignal
    ?.count({ where: { processedAt: null } })
    .catch(() => 0) as number

  if (unprocCount === 0) {
    return {
      shouldExecute: false,
      reason: "Zero semnale neprocesate",
      urgencyScore: 0,
    }
  }

  return {
    shouldExecute: true,
    reason: `${unprocCount} semnale de procesat`,
    urgencyScore: Math.min(unprocCount * 10, 80),
  }
}

/**
 * Evaluează dacă cron-ul de retry/escaladare ar trebui să ruleze.
 */
export async function evaluateRetryThreshold(): Promise<ThresholdResult> {
  const blockedCount = await prisma.agentTask.count({
    where: { status: { in: ["BLOCKED", "FAILED"] } },
  })

  if (blockedCount === 0) {
    return {
      shouldExecute: false,
      reason: "Zero task-uri BLOCKED/FAILED",
      urgencyScore: 0,
    }
  }

  return {
    shouldExecute: true,
    reason: `${blockedCount} task-uri necesită retry/escaladare`,
    urgencyScore: Math.min(blockedCount * 15, 90),
  }
}
