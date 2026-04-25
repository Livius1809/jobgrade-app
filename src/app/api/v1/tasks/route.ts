import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { AgentTaskType, AgentTaskPriority, AgentTaskStatus } from "@/generated/prisma"
import { normalizePriority } from "@/lib/tasks/priority"
import {
  convertInterventionsToTasks,
  computeTaskQueueStats,
  type InterventionAction,
  type TaskInput,
} from "@/lib/agents/task-delegation"

export const dynamic = "force-dynamic"

/**
 * /api/v1/tasks
 *
 * Calea 1 — Task Delegation & Queue.
 *
 * GET    ?assignedTo=... | ?assignedBy=... | ?businessId=...  — listare
 * GET    ?view=queue&businessId=...                            — queue stats per agent
 * POST   ?action=delegate                                      — delegate din INTERVENE actions
 * POST                                                         — creare manuală task
 * PATCH  ?id=...&action=accept|start|complete|fail|cancel|review — lifecycle
 * POST   ?action=expire-check                                  — expire overdue tasks
 */

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

// ── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const view = url.searchParams.get("view")
  const businessId = url.searchParams.get("businessId")

  // Queue stats view
  if (view === "queue" && businessId) {
    const tasks = await prisma.agentTask.findMany({
      where: { businessId },
      select: { assignedTo: true, status: true, createdAt: true, completedAt: true, startedAt: true },
    })

    const agents = await prisma.agentDefinition.findMany({
      where: { activityMode: { in: ["DORMANT_UNTIL_DELEGATED", "PROACTIVE_CYCLIC", "HYBRID"] } },
      select: { agentRole: true, activityMode: true },
    })

    const taskInputs: TaskInput[] = tasks.map((t) => ({
      assignedTo: t.assignedTo,
      status: t.status,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
      startedAt: t.startedAt,
    }))

    const stats = computeTaskQueueStats(taskInputs, agents.map((a) => a.agentRole))

    return NextResponse.json({
      stats,
      totalAgents: agents.length,
      dormantAgents: agents.filter((a) => a.activityMode === "DORMANT_UNTIL_DELEGATED").length,
      activeQueues: stats.filter((s) => s.assigned + s.inProgress > 0).length,
    })
  }

  // Regular listing
  const where: Record<string, unknown> = {}
  if (businessId) where.businessId = businessId

  const assignedTo = url.searchParams.get("assignedTo")
  const assignedBy = url.searchParams.get("assignedBy")
  const status = url.searchParams.get("status")

  if (assignedTo) where.assignedTo = assignedTo
  if (assignedBy) where.assignedBy = assignedBy
  if (status) where.status = status

  const tasks = await prisma.agentTask.findMany({
    where,
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    take: 100,
  })

  return NextResponse.json({
    tasks,
    total: tasks.length,
    byStatus: {
      ASSIGNED: tasks.filter((t) => t.status === "ASSIGNED").length,
      ACCEPTED: tasks.filter((t) => t.status === "ACCEPTED").length,
      IN_PROGRESS: tasks.filter((t) => t.status === "IN_PROGRESS").length,
      COMPLETED: tasks.filter((t) => t.status === "COMPLETED").length,
      FAILED: tasks.filter((t) => t.status === "FAILED").length,
      REVIEW_PENDING: tasks.filter((t) => t.status === "REVIEW_PENDING").length,
    },
  })
}

// ── POST ─────────────────────────────────────────────────────────────────────

const createSchema = z.object({
  businessId: z.string().min(1),
  assignedBy: z.string().min(1),
  assignedTo: z.string().min(1),
  title: z.string().min(3).max(200),
  description: z.string().min(10),
  taskType: z.enum(["KB_RESEARCH", "KB_VALIDATION", "DATA_ANALYSIS", "CONTENT_CREATION", "PROCESS_EXECUTION", "REVIEW", "INVESTIGATION", "OUTREACH"]),
  priority: z.enum(["IMPORTANT_URGENT", "URGENT", "IMPORTANT", "NECESAR", "CRITICAL", "HIGH", "MEDIUM", "LOW"]).optional().default("NECESAR"),
  objectiveId: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  deadlineAt: z.string().datetime().optional(),
  estimatedMinutes: z.number().int().min(1).optional(),
})

const delegateSchema = z.object({
  businessId: z.string().min(1),
  managerRole: z.string().min(1),
  actions: z.array(z.object({
    target: z.string().min(1),
    type: z.literal("INTERVENE"),
    description: z.string().min(5),
    details: z.string().optional(),
    priority: z.string().optional(),
  })),
  cycleLogId: z.string().optional(),
  objectiveId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const action = url.searchParams.get("action")
  const body = await req.json().catch(() => null)

  // ── Delegate: batch convert INTERVENE actions to tasks ──
  if (action === "delegate") {
    const parsed = delegateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 })
    }
    const input = parsed.data

    const interventions = input.actions as InterventionAction[]
    const delegated = convertInterventionsToTasks(interventions, input.managerRole)

    let created = 0
    let skipped = 0
    const taskIds: string[] = []

    for (const task of delegated) {
      // Dedup: nu delega dacă există deja un task ASSIGNED/ACCEPTED/IN_PROGRESS pentru același agent
      const existingActive = await prisma.agentTask.findFirst({
        where: {
          businessId: input.businessId,
          assignedTo: task.assignedTo,
          assignedBy: input.managerRole,
          status: { in: ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"] },
        },
      })

      if (existingActive) {
        skipped++
        continue
      }

      const deadlineAt = task.deadlineHours
        ? new Date(Date.now() + task.deadlineHours * 60 * 60 * 1000)
        : null

      const created_task = await prisma.agentTask.create({
        data: {
          businessId: input.businessId,
          assignedBy: input.managerRole,
          cycleLogId: input.cycleLogId,
          assignedTo: task.assignedTo,
          title: task.title,
          description: task.description,
          taskType: task.taskType as AgentTaskType,
          priority: task.priority as AgentTaskPriority,
          objectiveId: input.objectiveId,
          tags: task.tags,
          deadlineAt,
          estimatedMinutes: task.estimatedMinutes,
          status: "ASSIGNED",
        },
      })
      taskIds.push(created_task.id)
      created++
    }

    return NextResponse.json({
      delegated: created,
      skipped,
      taskIds,
      managerRole: input.managerRole,
    })
  }

  // ── Expire-check: mark overdue tasks as EXPIRED + recovery flow ──
  if (action === "expire-check") {
    const now = new Date()
    const overdue = await prisma.agentTask.findMany({
      where: {
        deadlineAt: { lt: now },
        status: { in: ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"] },
      },
    })

    let expired = 0
    let recoveryTasksCreated = 0
    let escalated = 0

    for (const task of overdue) {
      await prisma.agentTask.update({
        where: { id: task.id },
        data: { status: "EXPIRED", failedAt: now, failureReason: "deadline_exceeded" },
      })
      expired++

      // Recovery flow: nu lăsăm taskurile expirate "moarte"
      try {
        // 1. Determină escalation chain (assignedTo → manager)
        const relationship = await prisma.agentRelationship.findFirst({
          where: { childRole: task.assignedTo, relationType: "REPORTS_TO", isActive: true },
          select: { parentRole: true },
        }).catch(() => null)

        const escalateTo = relationship?.parentRole || "COG"

        // 2. Creează task de recovery (INVESTIGATION) către manager
        await prisma.agentTask.create({
          data: {
            businessId: task.businessId,
            assignedBy: "SYSTEM",
            assignedTo: escalateTo,
            title: `RECOVERY: ${task.title}`,
            description: `Task original expirat (id=${task.id}, asignat la ${task.assignedTo}). Decide: (a) reasignare la alt subordonat, (b) extindere deadline cu notificare client, (c) abandon cu lecție învățată. Context original:\n${task.description ?? "(fără descriere)"}`,
            taskType: "INVESTIGATION",
            priority: "URGENT",
            status: "ASSIGNED",
            deadlineAt: new Date(now.getTime() + 4 * 3600000), // 4h
            tags: ["recovery", "task_expired", `original:${task.id}`, `original_assignee:${task.assignedTo}`],
          },
        }).catch((err) => {
          console.warn(`[expire-check] Failed to create recovery task: ${err.message}`)
        })
        recoveryTasksCreated++

        // 3. Pentru taskuri CRITICAL/HIGH, creează și disfunction event (D2 functional management)
        const np = normalizePriority(task.priority)
        if (np === "IMPORTANT_URGENT" || np === "URGENT") {
          await prisma.disfunctionEvent.create({
            data: {
              class: "D2_FUNCTIONAL_MGMT",
              severity: np === "IMPORTANT_URGENT" ? "CRITICAL" : "HIGH",
              status: "OPEN",
              targetType: "ROLE",
              targetId: task.assignedTo,
              signal: "task_expired",
              detectedAt: now,
              detectorSource: "expire-check-cron",
            },
          }).catch((err) => {
            console.warn(`[expire-check] Failed to create disfunction event: ${err.message}`)
          })
          escalated++
        }
      } catch (err) {
        console.warn(`[expire-check] Recovery flow error for task ${task.id}: ${err instanceof Error ? err.message : "unknown"}`)
      }
    }

    return NextResponse.json({
      expired,
      checked: overdue.length,
      recoveryTasksCreated,
      escalated,
    })
  }

  // ── Manual create ──
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input", details: parsed.error.flatten() }, { status: 400 })
  }
  const input = parsed.data

  const task = await prisma.agentTask.create({
    data: {
      businessId: input.businessId,
      assignedBy: input.assignedBy,
      assignedTo: input.assignedTo,
      title: input.title,
      description: input.description,
      taskType: input.taskType as AgentTaskType,
      priority: normalizePriority(input.priority) as AgentTaskPriority,
      objectiveId: input.objectiveId,
      tags: input.tags,
      deadlineAt: input.deadlineAt ? new Date(input.deadlineAt) : null,
      estimatedMinutes: input.estimatedMinutes,
      status: "ASSIGNED",
    },
  })

  return NextResponse.json({ task }, { status: 201 })
}

// ── PATCH (lifecycle transitions) ────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  const action = url.searchParams.get("action")
  if (!id || !action) {
    return NextResponse.json({ error: "missing_id_or_action" }, { status: 400 })
  }

  const task = await prisma.agentTask.findUnique({ where: { id } })
  if (!task) {
    return NextResponse.json({ error: "not_found" }, { status: 404 })
  }

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const now = new Date()

  // Valid transitions
  const transitions: Record<string, { from: string[]; data: Record<string, unknown> }> = {
    accept: { from: ["ASSIGNED"], data: { status: "ACCEPTED", acceptedAt: now } },
    start: { from: ["ASSIGNED", "ACCEPTED"], data: { status: "IN_PROGRESS", startedAt: now, acceptedAt: task.acceptedAt ?? now } },
    complete: {
      from: ["IN_PROGRESS", "ACCEPTED"],
      data: {
        status: "REVIEW_PENDING",
        completedAt: now,
        result: body.result ?? null,
      },
    },
    fail: {
      from: ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"],
      data: {
        status: "FAILED",
        failedAt: now,
        failureReason: body.reason ?? "unknown",
      },
    },
    cancel: {
      from: ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"],
      data: { status: "CANCELLED" },
    },
    review: {
      from: ["REVIEW_PENDING"],
      data: {
        status: "COMPLETED",
        reviewedBy: body.reviewedBy ?? task.assignedBy,
        reviewedAt: now,
        reviewNote: body.note ?? null,
        resultQuality: body.quality ?? null,
      },
    },
  }

  const transition = transitions[action]
  if (!transition) {
    return NextResponse.json({ error: "invalid_action", valid: Object.keys(transitions) }, { status: 400 })
  }

  if (!transition.from.includes(task.status)) {
    return NextResponse.json({
      error: "invalid_transition",
      currentStatus: task.status,
      allowedFrom: transition.from,
    }, { status: 409 })
  }

  const updated = await prisma.agentTask.update({
    where: { id },
    data: transition.data,
  })

  return NextResponse.json({ task: updated })
}
