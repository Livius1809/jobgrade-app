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
  const report = await getTenantData(session.user.tenantId, "DATA_QUALITY_REPORT")
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

  // TODO: Execute autoFixAction based on response
  // Ex: if selectedOption === "Același post (unificăm)" → merge jobs in DB

  return NextResponse.json({
    ok: true,
    issueId,
    resolved: true,
    remainingBlockers: unresolvedBlockers,
    readyForEvaluation: report.readyForEvaluation,
  })
}
