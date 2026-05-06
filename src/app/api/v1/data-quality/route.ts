/**
 * GET /api/v1/data-quality
 * Rulează data quality check și returnează raportul.
 *
 * POST /api/v1/data-quality
 * Rezolvă o problemă (clientul răspunde la o întrebare de clarificare).
 * Body: { issueId: string, response: string, selectedOption?: string }
 */

export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { runDataQualityCheck } from "@/lib/data-quality"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const report = await runDataQualityCheck(session.user.tenantId)

  // Persist report for tracking resolutions
  await setTenantData(session.user.tenantId, "DATA_QUALITY_REPORT", report)

  return NextResponse.json(report)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const body = await req.json()
  const { issueId, response, selectedOption } = body

  if (!issueId || !response) {
    return NextResponse.json({ error: "issueId și response sunt obligatorii" }, { status: 400 })
  }

  // Load existing report
  const report = await getTenantData(session.user.tenantId, "DATA_QUALITY_REPORT") as any
  if (!report?.issues) {
    return NextResponse.json({ error: "Nu există raport de calitate. Rulați GET mai întâi." }, { status: 404 })
  }

  // Find and resolve issue
  const issue = report.issues.find((i: any) => i.id === issueId)
  if (!issue) {
    return NextResponse.json({ error: `Issue ${issueId} nu există` }, { status: 404 })
  }

  issue.resolved = true
  issue.clientResponse = selectedOption || response

  // Update summary
  report.summary.resolved = report.issues.filter((i: any) => i.resolved).length

  // Recalculate readiness
  const unresolvedBlockers = report.issues.filter((i: any) => i.severity === "BLOCKER" && !i.resolved).length
  report.readyForEvaluation = unresolvedBlockers === 0

  // Persist updated report
  await setTenantData(session.user.tenantId, "DATA_QUALITY_REPORT", report)

  // Execute autoFixAction based on response
  let autoFixResult: string | null = null
  try {
    if (issue.autoFixAction === "merge_jobs" && selectedOption === "Același post (unificăm)") {
      // Merge: keep first job, reassign references from second, deactivate second
      const [keepId, removeId] = issue.affectedItems
      if (keepId && removeId) {
        // Reassign any employees/KPIs referencing the duplicate
        await prisma.kpiDefinition.updateMany({
          where: { jobId: removeId },
          data: { jobId: keepId },
        }).catch(() => {})
        // Deactivate the duplicate (soft delete)
        await prisma.job.update({
          where: { id: removeId },
          data: { isActive: false, status: "ARCHIVED" as any },
        }).catch(() => {})
        autoFixResult = `Post "${removeId}" dezactivat, referințe mutate pe "${keepId}".`
      }
    } else if (issue.autoFixAction === "remove_duplicate" && selectedOption === "Duplicat (ștergem pe al doilea)") {
      // Deactivate second duplicate
      const removeId = issue.affectedItems[1]
      if (removeId) {
        await prisma.job.update({
          where: { id: removeId },
          data: { isActive: false, status: "ARCHIVED" as any },
        }).catch(() => {})
        autoFixResult = `Post duplicat "${removeId}" dezactivat.`
      }
    } else if (issue.autoFixAction === "remove_duplicate" && selectedOption === "Fuzionăm într-una singură") {
      // Merge: keep first, move references, deactivate second
      const [keepId, removeId] = issue.affectedItems
      if (keepId && removeId) {
        await prisma.kpiDefinition.updateMany({
          where: { jobId: removeId },
          data: { jobId: keepId },
        }).catch(() => {})
        await prisma.job.update({
          where: { id: removeId },
          data: { isActive: false, status: "ARCHIVED" as any },
        }).catch(() => {})
        autoFixResult = `Posturi fuzionate. "${removeId}" dezactivat, referințe pe "${keepId}".`
      }
    }
    // Store autofix result on the issue for audit trail
    if (autoFixResult) {
      issue.autoFixResult = autoFixResult
      await setTenantData(session.user.tenantId, "DATA_QUALITY_REPORT", report)
    }
  } catch (e: any) {
    console.error("[data-quality] Auto-fix error:", e.message)
  }

  return NextResponse.json({
    ok: true,
    issueId,
    resolved: true,
    autoFixResult,
    remainingBlockers: unresolvedBlockers,
    readyForEvaluation: report.readyForEvaluation,
  })
}
