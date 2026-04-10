import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { executeTask, executeQueue } from "@/lib/agents/task-executor"

export const maxDuration = 300 // 5 min — task execution poate fi lent

const schema = z
  .object({
    taskId: z.string().optional(),
    agentRole: z.string().optional(),
    limit: z.number().int().min(1).max(20).optional(),
    cron: z.boolean().optional(), // când true, respectă EXECUTOR_CRON_ENABLED kill-switch
    bypassFilters: z.boolean().optional(), // manual override pentru filtre (istoric, SYSTEM, orphan)
    maxAgeHours: z.number().int().min(1).max(720).optional(),
  })
  .refine((v) => v.taskId || v.agentRole || v.limit || v.cron, {
    message: "Specifică taskId sau agentRole/limit/cron",
  })

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * POST /api/v1/agents/execute-task
 *
 * Execută unul sau mai multe AgentTask-uri cu status ASSIGNED folosind Claude.
 *
 * Body:
 *  - { taskId: "..." }                          → execută un task specific
 *  - { agentRole: "CCO" }                       → execută queue pentru un rol (max 5)
 *  - { agentRole: "CCO", limit: 10 }            → cu limit custom (max 20)
 *  - { limit: 5 }                               → execută queue global (orice rol)
 *
 * Auth: x-internal-key header required.
 */
export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { taskId, agentRole, limit, cron, bypassFilters, maxAgeHours } = parsed.data
  const startTs = Date.now()

  // Kill switch pentru cron
  if (cron && process.env.EXECUTOR_CRON_ENABLED !== "true") {
    console.log(`[execute-task] cron skip — EXECUTOR_CRON_ENABLED=${process.env.EXECUTOR_CRON_ENABLED || "unset"}`)
    return NextResponse.json({
      mode: "cron",
      skipped: true,
      reason: "EXECUTOR_CRON_ENABLED nu e 'true' — kill switch activ",
    })
  }

  try {
    if (taskId) {
      console.log(`[execute-task] single taskId=${taskId}`)
      const result = await executeTask(taskId)
      console.log(
        `[execute-task] single done taskId=${taskId} outcome=${result.outcome} ` +
          `duration=${result.durationMs}ms subTasks=${result.subTasksCreated || 0} ` +
          `tokens=${(result.tokensUsed?.input || 0) + (result.tokensUsed?.output || 0)} ` +
          `webSearches=${result.webSearchCount || 0}`
      )
      return NextResponse.json({ mode: "single", result })
    }

    console.log(
      `[execute-task] queue role=${agentRole || "ANY"} limit=${limit || 5} ` +
        `cron=${!!cron} bypassFilters=${!!bypassFilters}`
    )
    const results = await executeQueue({ agentRole, limit, bypassFilters, maxAgeHours })
    const summary = {
      total: results.length,
      completed: results.filter((r) => r.outcome === "COMPLETED").length,
      blocked: results.filter((r) => r.outcome === "BLOCKED").length,
      failed: results.filter((r) => r.outcome === "FAILED").length,
    }
    console.log(
      `[execute-task] queue done role=${agentRole || "ANY"} ` +
        `total=${summary.total} completed=${summary.completed} ` +
        `blocked=${summary.blocked} failed=${summary.failed} ` +
        `totalDuration=${Date.now() - startTs}ms`
    )
    return NextResponse.json({ mode: "queue", summary, results })
  } catch (e: any) {
    console.error(
      `[execute-task] error taskId=${taskId || "—"} role=${agentRole || "—"}: ${e.message}`
    )
    return NextResponse.json(
      { error: "executor_error", details: e.message },
      { status: 500 },
    )
  }
}
