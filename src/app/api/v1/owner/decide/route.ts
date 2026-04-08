import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redistributeSubordinates } from "@/lib/disfunctions/reorg-engine"

/**
 * POST /api/v1/owner/decide
 *
 * Owner ia o decizie pe o situație din cockpit.
 * Body: { situationId, optionLabel, affectedRoles }
 */
export async function POST(req: NextRequest) {
  // Try session auth first, then internal key
  const session = await auth().catch(() => null)
  const hasSessionAuth = session?.user?.id
  const hasInternalKey = req.headers.get("x-internal-key") === process.env.INTERNAL_API_KEY

  if (!hasSessionAuth && !hasInternalKey) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  if (hasSessionAuth) {
    const role = (session!.user as any).role
    if (role !== "SUPER_ADMIN" && role !== "OWNER") {
      return NextResponse.json({ error: "Acces restricționat" }, { status: 403 })
    }
  }

  try {
    const { situationId, optionLabel, affectedRoles, eventIds } = await req.json()

    if (!situationId || !optionLabel) {
      return NextResponse.json({ error: "situationId + optionLabel required" }, { status: 400 })
    }

    const p = prisma as any
    const actions: string[] = []

    // Route decision to appropriate action
    if (optionLabel.startsWith("Investighează")) {
      // Delegate to COG via agent task
      const biz = await p.business.findFirst({ select: { id: true } })
      await p.agentTask.create({
        data: {
          businessId: biz?.id ?? "biz_jobgrade",
          assignedTo: "COG",
          assignedBy: "OWNER",
          taskType: "INVESTIGATION",
          title: `Investighează: ${situationId}`,
          description: `Owner decision: investighează cauza comună pentru situația "${situationId}". Roluri afectate: ${(affectedRoles || []).join(", ")}`,
          priority: "HIGH",
          status: "ASSIGNED",
        },
      })
      actions.push("Task delegat la COG")
    }

    if (optionLabel.startsWith("Redistribuie")) {
      for (const role of (affectedRoles || [])) {
        const result = await redistributeSubordinates(role)
        actions.push(`${role}: ${result.reason}`)
      }
    }

    if (optionLabel.startsWith("Reactivează")) {
      const targetRole = optionLabel.replace("Reactivează ", "")
      await p.agentDefinition.updateMany({
        where: { agentRole: targetRole },
        data: { activityMode: "PROACTIVE_CYCLIC" },
      })
      actions.push(`${targetRole} reactivat → PROACTIVE_CYCLIC`)
    }

    if (optionLabel.startsWith("Pauză")) {
      const targetRole = optionLabel.replace("Pauză ", "")
      await p.agentDefinition.updateMany({
        where: { agentRole: targetRole },
        data: { activityMode: "PAUSED_KNOWN_GAP" },
      })
      actions.push(`${targetRole} pauzat → PAUSED_KNOWN_GAP`)
    }

    if (optionLabel.startsWith("Escaladare")) {
      await p.escalation.create({
        data: {
          sourceRole: "OWNER",
          targetRole: "COG",
          aboutRole: (affectedRoles || [])[0] ?? "SYSTEM",
          reason: `Owner escalation: ${situationId}`,
          details: `Decizie Owner: escaladare manuală. Roluri: ${(affectedRoles || []).join(", ")}`,
          priority: "HIGH",
          status: "OPEN",
        },
      })
      actions.push("Escaladare creată la COG")
    }

    if (optionLabel.startsWith("Acceptă risc")) {
      actions.push("Situație acceptată — monitorizare activă")
    }

    if (optionLabel.includes("fals pozitiv")) {
      // Resolve only the specific events for this situation
      if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
        return NextResponse.json(
          { error: "eventIds[] required for false positive marking — cannot resolve all open events" },
          { status: 400 },
        )
      }
      await p.disfunctionEvent.updateMany({
        where: { id: { in: eventIds }, status: "OPEN" },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
          resolvedBy: `owner_decision_${new Date().toISOString().split("T")[0]}`,
        },
      })
      actions.push(`${eventIds.length} evenimente rezolvate ca fals pozitiv`)
    }

    // ── Audit trail ────────────────────────────────────────────────────────
    console.info(JSON.stringify({
      type: "OWNER_DECISION",
      userId: hasSessionAuth ? session!.user.id : "INTERNAL_API",
      action: optionLabel,
      situationId,
      affectedRoles: affectedRoles || [],
      actions,
      timestamp: new Date().toISOString(),
    }))

    return NextResponse.json({
      decision: optionLabel,
      situationId,
      actions,
      decidedAt: new Date().toISOString(),
      decidedBy: hasSessionAuth ? session!.user.id : "INTERNAL_API",
    })
  } catch (error: any) {
    console.error("[OWNER DECIDE]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
