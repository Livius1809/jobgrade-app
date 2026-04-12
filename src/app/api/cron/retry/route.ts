/**
 * Vercel Cron endpoint — retry BLOCKED + FAILED tasks.
 *
 * Runs every 30 minutes. For each stuck task:
 * - BLOCKED: enriches description with blocker context, resets to ASSIGNED
 * - FAILED (no result): simple retry, resets to ASSIGNED
 * - Max 3 retries per task (tracked via tags retry:1, retry:2, retry:3)
 * - After 3 retries: escalates to hierarchical manager
 *
 * Architecture (L1+L2+L3 governance):
 * Retry mechanism is L4 infrastructure. The retried task still goes through
 * the same agent prompt pipeline (L1 moral-core + L2 KB lookup + L3 legal).
 * Escalation follows the REPORTS_TO hierarchy from agent_relationships.
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const maxDuration = 120

function getRetryCount(tags: string[]): number {
  for (const tag of tags) {
    const match = tag.match(/^retry:(\d+)$/)
    if (match) return parseInt(match[1], 10)
  }
  return 0
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (process.env.EXECUTOR_CRON_ENABLED !== "true") {
    return NextResponse.json({ ok: false, reason: "EXECUTOR_CRON_ENABLED kill-switch" })
  }

  const now = new Date()
  const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000)

  // Find BLOCKED + FAILED tasks that haven't been touched in 30min (avoid instant retry loops)
  const stuck = await prisma.agentTask.findMany({
    where: {
      status: { in: ["BLOCKED", "FAILED"] },
      updatedAt: { lt: thirtyMinAgo },
    },
    take: 10,
    orderBy: { updatedAt: "asc" },
  })

  if (stuck.length === 0) {
    return NextResponse.json({ ok: true, retried: 0, escalated: 0, message: "No stuck tasks" })
  }

  let retried = 0
  let escalated = 0

  for (const task of stuck) {
    const retryCount = getRetryCount(task.tags)

    if (retryCount >= 3) {
      // Escalate to hierarchical manager
      const relationship = await prisma.agentRelationship.findFirst({
        where: { childRole: task.assignedTo, relationType: "REPORTS_TO", isActive: true },
        select: { parentRole: true },
      })

      const managerRole = relationship?.parentRole || "COG"

      await prisma.agentTask.create({
        data: {
          title: `[ESCALARE] Task blocat repetat: ${task.title.slice(0, 80)}`,
          description: `Task-ul original (${task.id}) assignat la ${task.assignedTo} a eșuat de ${retryCount} ori.\n\n` +
            `**Status:** ${task.status}\n` +
            `**Cauza ultimă:** ${task.status === "BLOCKED" ? task.blockerDescription : task.failureReason}\n\n` +
            `**Descriere originală:**\n${task.description?.slice(0, 500)}\n\n` +
            `Decide: (a) reasignează la alt agent cu spec-uri revizuite, (b) abandonează cu lecție învățată, (c) marchează ca depășit de competența actuală și escalează la Owner.`,
          assignedTo: managerRole,
          assignedBy: "SYSTEM",
          status: "ASSIGNED",
          priority: "HIGH",
          taskType: "INVESTIGATION",
          businessId: task.businessId,
          objectiveId: task.objectiveId,
          tags: ["escalation", `original:${task.id}`, `original_assignee:${task.assignedTo}`],
          deadlineAt: new Date(now.getTime() + 48 * 3600000),
        },
      })

      // Mark original as CANCELLED
      await prisma.agentTask.update({
        where: { id: task.id },
        data: {
          status: "CANCELLED",
          tags: [...task.tags, `escalated_to:${managerRole}`],
        },
      })

      escalated++
      continue
    }

    // Retry: enrich description + reset to ASSIGNED
    const retryTag = `retry:${retryCount + 1}`
    const enrichedTags = task.tags.filter(t => !t.startsWith("retry:")).concat(retryTag)

    let enrichedDescription = task.description || ""

    if (task.status === "BLOCKED" && task.blockerDescription) {
      enrichedDescription += `\n\n---\n**[Iterație ${retryCount + 1}] Context suplimentar (retry automat):**\n` +
        `Task-ul anterior a fost BLOCKED din cauza: "${task.blockerDescription}"\n` +
        `Încearcă un approach diferit. Dacă informația lipsește din KB, folosește cunoașterea ta generală calibrată cu L2 consultanți. ` +
        `Dacă ai nevoie de date specifice de la alt agent, menționează explicit ce lipsește în output.`
    } else if (task.status === "FAILED") {
      enrichedDescription += `\n\n---\n**[Iterație ${retryCount + 1}] Retry automat:**\n` +
        `Încercarea anterioară a eșuat: "${task.failureReason || "fără result field"}"\n` +
        `Asigură-te că produci un result text complet în output.`
    }

    await prisma.agentTask.update({
      where: { id: task.id },
      data: {
        status: "ASSIGNED",
        description: enrichedDescription,
        tags: enrichedTags,
        blockerType: null,
        blockerDescription: null,
        blockerAgentRole: null,
        blockedAt: null,
        failureReason: null,
        failedAt: null,
      },
    })

    retried++
  }

  return NextResponse.json({
    ok: true,
    retried,
    escalated,
    timestamp: now.toISOString(),
  })
}
