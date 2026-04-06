/**
 * GET /api/v1/tasks/report
 *
 * Raport structurat taskuri + blocaje, agregat pe niveluri ierarhice.
 *
 * Query params:
 *   ?level=all         — toate taskurile (doar COG/Owner)
 *   ?level=department   — agregate per departament
 *   ?manager=COA       — doar taskurile delegate de COA
 *   ?agent=FDA         — doar taskurile asignate lui FDA
 *   ?status=BLOCKED    — doar taskurile blocate
 *   ?status=IN_PROGRESS,BLOCKED — multiple statusuri
 *
 * Acces: INTERNAL_API_KEY
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

// Ierarhia: cine raportează la cine
const HIERARCHY: Record<string, string[]> = {
  COG: ["COA", "COCSA", "CJA", "CIA", "CCIA", "PMA"],
  COA: ["EMA", "FDA", "BDA", "SA", "ISA", "DOA", "DOAS"],
  COCSA: ["DVB2B", "MKA", "SOA", "CCO"],
  DVB2B: ["CSSA", "CSM", "BCA"],
  MKA: ["ACA", "CMA", "CWA", "CDIA"],
  PMA: ["RDA"],
}

function getSubordinates(role: string, recursive = true): string[] {
  const direct = HIERARCHY[role] ?? []
  if (!recursive) return direct
  const all = [...direct]
  for (const sub of direct) {
    all.push(...getSubordinates(sub, true))
  }
  return [...new Set(all)]
}

interface TaskReport {
  id: string
  title: string
  assignedTo: string
  assignedBy: string
  status: string
  priority: string
  taskType: string
  deadlineAt: string | null
  createdAt: string
  // Blocker info
  blockerType: string | null
  blockerDescription: string | null
  blockerAgentRole: string | null
  blockerTaskId: string | null
  blockedAt: string | null
  // Duration
  daysOpen: number
  overdue: boolean
}

interface DepartmentSummary {
  manager: string
  subordinates: string[]
  total: number
  byStatus: Record<string, number>
  blocked: number
  blockerBreakdown: Record<string, number>
  overdue: number
  tasks: TaskReport[]
}

export async function GET(req: NextRequest) {
  const apiKey = req.headers.get("x-internal-key")
  if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchParams = await req.nextUrl.searchParams
  const level = searchParams.get("level") ?? "all"
  const manager = searchParams.get("manager")
  const agent = searchParams.get("agent")
  const statusFilter = searchParams.get("status")

  const p = prisma as any
  const now = new Date()

  try {
    // Build where clause
    const where: any = {}

    // Status filter
    if (statusFilter) {
      const statuses = statusFilter.split(",").map(s => s.trim())
      where.status = { in: statuses }
    } else {
      // Default: active tasks only
      where.status = { in: ["ASSIGNED", "ACCEPTED", "IN_PROGRESS", "BLOCKED", "REVIEW_PENDING"] }
    }

    // Agent/manager filter
    if (agent) {
      where.assignedTo = agent
    } else if (manager) {
      const subs = getSubordinates(manager, true)
      where.assignedTo = { in: subs }
    }

    const tasks = await p.agentTask.findMany({
      where,
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    })

    // Transform to report format
    const taskReports: TaskReport[] = tasks.map((t: any) => {
      const daysOpen = Math.floor((now.getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      const overdue = t.deadlineAt ? new Date(t.deadlineAt) < now && !["COMPLETED", "CANCELLED"].includes(t.status) : false

      return {
        id: t.id,
        title: t.title,
        assignedTo: t.assignedTo,
        assignedBy: t.assignedBy,
        status: t.status,
        priority: t.priority,
        taskType: t.taskType,
        deadlineAt: t.deadlineAt?.toISOString() ?? null,
        createdAt: t.createdAt.toISOString(),
        blockerType: t.blockerType,
        blockerDescription: t.blockerDescription,
        blockerAgentRole: t.blockerAgentRole,
        blockerTaskId: t.blockerTaskId,
        blockedAt: t.blockedAt?.toISOString() ?? null,
        daysOpen,
        overdue,
      }
    })

    // Aggregate by department if requested
    if (level === "department" || level === "all") {
      const departments: DepartmentSummary[] = []

      for (const [mgr, subs] of Object.entries(HIERARCHY)) {
        if (manager && mgr !== manager) continue

        const allSubs = getSubordinates(mgr, true)
        const deptTasks = taskReports.filter(t => allSubs.includes(t.assignedTo) || t.assignedBy === mgr)

        if (deptTasks.length === 0 && level === "department") continue

        const byStatus: Record<string, number> = {}
        const blockerBreakdown: Record<string, number> = {}

        for (const t of deptTasks) {
          byStatus[t.status] = (byStatus[t.status] ?? 0) + 1
          if (t.blockerType) {
            blockerBreakdown[t.blockerType] = (blockerBreakdown[t.blockerType] ?? 0) + 1
          }
        }

        departments.push({
          manager: mgr,
          subordinates: subs,
          total: deptTasks.length,
          byStatus,
          blocked: deptTasks.filter(t => t.status === "BLOCKED").length,
          blockerBreakdown,
          overdue: deptTasks.filter(t => t.overdue).length,
          tasks: deptTasks,
        })
      }

      // Global summary
      const globalBlocked = taskReports.filter(t => t.status === "BLOCKED")
      const globalBlockerBreakdown: Record<string, number> = {}
      for (const t of globalBlocked) {
        if (t.blockerType) {
          globalBlockerBreakdown[t.blockerType] = (globalBlockerBreakdown[t.blockerType] ?? 0) + 1
        }
      }

      return NextResponse.json({
        generatedAt: now.toISOString(),
        summary: {
          totalTasks: taskReports.length,
          blocked: globalBlocked.length,
          overdue: taskReports.filter(t => t.overdue).length,
          inProgress: taskReports.filter(t => t.status === "IN_PROGRESS").length,
          waitingOwner: globalBlocked.filter(t => t.blockerType === "WAITING_OWNER").length,
          blockerBreakdown: globalBlockerBreakdown,
        },
        departments: departments.sort((a, b) => b.blocked - a.blocked),
        tasks: level === "all" ? taskReports : undefined,
      })
    }

    // Simple flat list
    return NextResponse.json({
      generatedAt: now.toISOString(),
      total: taskReports.length,
      tasks: taskReports,
    })

  } catch (err) {
    return NextResponse.json({
      error: "report_failed",
      details: err instanceof Error ? err.message : "Unknown",
    }, { status: 500 })
  }
}

/**
 * PATCH /api/v1/tasks/report
 *
 * Permite unui agent să-și raporteze blocajul pe un task.
 *
 * Body:
 *   taskId: string
 *   action: "block" | "unblock"
 *   blockerType?: BlockerType
 *   blockerDescription?: string
 *   blockerAgentRole?: string
 *   blockerTaskId?: string
 */
export async function PATCH(req: NextRequest) {
  const apiKey = req.headers.get("x-internal-key")
  if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.taskId || !body?.action) {
    return NextResponse.json({ error: "taskId and action required" }, { status: 400 })
  }

  const p = prisma as any
  const now = new Date()

  try {
    if (body.action === "block") {
      if (!body.blockerType) {
        return NextResponse.json({ error: "blockerType required for block action" }, { status: 400 })
      }

      const updated = await p.agentTask.update({
        where: { id: body.taskId },
        data: {
          status: "BLOCKED",
          blockerType: body.blockerType,
          blockerDescription: body.blockerDescription ?? null,
          blockerAgentRole: body.blockerAgentRole ?? null,
          blockerTaskId: body.blockerTaskId ?? null,
          blockedAt: now,
          unblockedAt: null,
        },
      })

      return NextResponse.json({ success: true, task: updated })
    }

    if (body.action === "unblock") {
      const updated = await p.agentTask.update({
        where: { id: body.taskId },
        data: {
          status: "IN_PROGRESS",
          blockerType: null,
          blockerDescription: null,
          blockerAgentRole: null,
          blockerTaskId: null,
          unblockedAt: now,
        },
      })

      return NextResponse.json({ success: true, task: updated })
    }

    return NextResponse.json({ error: "action must be 'block' or 'unblock'" }, { status: 400 })
  } catch (err) {
    return NextResponse.json({
      error: "update_failed",
      details: err instanceof Error ? err.message : "Unknown",
    }, { status: 500 })
  }
}
