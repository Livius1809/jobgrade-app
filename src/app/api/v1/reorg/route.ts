import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { ReorgStatus } from "@/generated/prisma"

export const dynamic = "force-dynamic"

/**
 * GET  /api/v1/reorg — Listare evenimente de reorganizare
 * POST /api/v1/reorg — Acțiuni: redistribute | revert
 *
 * Principiu: reorganizările ating DOAR structura temporară (canal/ritm), NICIODATĂ fond.
 */

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

export async function GET(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const statusParam = url.searchParams.get("status")
  const roleCode = url.searchParams.get("roleCode")

  const events = await prisma.reorganizationEvent.findMany({
    where: {
      ...(statusParam && { status: statusParam as ReorgStatus }),
      ...(roleCode && { triggeredByRole: roleCode }),
    },
    orderBy: { appliedAt: "desc" },
    take: 100,
  })

  const summary = {
    total: events.length,
    byStatus: {
      ACTIVE: events.filter((e) => e.status === "ACTIVE").length,
      REVERTED: events.filter((e) => e.status === "REVERTED").length,
      ESCALATED: events.filter((e) => e.status === "ESCALATED").length,
      CONFLICTED: events.filter((e) => e.status === "CONFLICTED").length,
    },
  }

  return NextResponse.json({ summary, events })
}

/**
 * POST /api/v1/reorg
 *
 * Body: { action: "redistribute" | "revert", params: any }
 *
 * redistribute — reassign employees from a removed department to target departments.
 *   params: { sourceDepartment: string, targetDepartment: string, tenantId: string }
 *
 * revert — undo last reorganization event (mark as REVERTED, restore original state).
 *   params: { eventId: string }
 */
export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { action, params } = body as { action: string; params: Record<string, unknown> }

  if (!action || !params) {
    return NextResponse.json(
      { error: "action ('redistribute' | 'revert') and params are required" },
      { status: 400 },
    )
  }

  // ── Redistribute ────────────────────────────────────────────────────────
  if (action === "redistribute") {
    const { sourceDepartment, targetDepartment, tenantId } = params as {
      sourceDepartment?: string
      targetDepartment?: string
      tenantId?: string
    }

    if (!sourceDepartment || !targetDepartment || !tenantId) {
      return NextResponse.json(
        { error: "params: sourceDepartment, targetDepartment, tenantId required" },
        { status: 400 },
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      // Find employees in the source department
      const affected = await tx.employeeSalaryRecord.findMany({
        where: { tenantId, department: sourceDepartment },
        select: { id: true, employeeCode: true },
      })

      if (affected.length === 0) {
        return { moved: 0, message: "No employees found in source department" }
      }

      // Reassign to target department
      await tx.employeeSalaryRecord.updateMany({
        where: { tenantId, department: sourceDepartment },
        data: { department: targetDepartment },
      })

      // Record as reorganization event
      const event = await tx.reorganizationEvent.create({
        data: {
          triggeredByRole: "SYSTEM",
          reorgType: "SUBORDINATE_REASSIGN",
          originalConfig: { sourceDepartment, employees: affected.map((e) => e.id) },
          newConfig: { targetDepartment, employeeCount: affected.length },
          status: "ACTIVE",
          autoRevertAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // +24h
        },
      })

      return { moved: affected.length, eventId: event.id }
    })

    return NextResponse.json({ ok: true, action: "redistribute", ...result })
  }

  // ── Revert ──────────────────────────────────────────────────────────────
  if (action === "revert") {
    const { eventId } = params as { eventId?: string }

    if (!eventId) {
      return NextResponse.json({ error: "params: eventId required" }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const event = await tx.reorganizationEvent.findUnique({ where: { id: eventId } })

      if (!event) {
        throw new Error(`Event ${eventId} not found`)
      }
      if (event.status === "REVERTED") {
        throw new Error(`Event ${eventId} is already reverted`)
      }

      // Restore original state from event metadata
      const original = event.originalConfig as Record<string, unknown>
      const employeeIds = (original.employees as string[] | undefined) ?? []
      const sourceDepartment = original.sourceDepartment as string | undefined

      if (sourceDepartment && employeeIds.length > 0) {
        // Restore department assignment for each employee
        await tx.employeeSalaryRecord.updateMany({
          where: { id: { in: employeeIds } },
          data: { department: sourceDepartment },
        })
      }

      // Mark event as reverted
      await tx.reorganizationEvent.update({
        where: { id: eventId },
        data: {
          status: "REVERTED",
          revertedAt: new Date(),
          revertReason: "owner_override",
        },
      })

      return { reverted: true, restoredEmployees: employeeIds.length }
    })

    return NextResponse.json({ ok: true, action: "revert", ...result })
  }

  return NextResponse.json(
    { error: `Unknown action: ${action}. Use 'redistribute' or 'revert'.` },
    { status: 400 },
  )
}
