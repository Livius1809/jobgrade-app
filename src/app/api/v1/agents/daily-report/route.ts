import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateDailyReport, formatReportForNotification } from "@/lib/agents/daily-report"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * GET /api/v1/agents/daily-report
 * Generate and return the daily report.
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const report = await generateDailyReport(prisma)
    return NextResponse.json(report)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * POST /api/v1/agents/daily-report
 * Generate report + send ntfy notification to Owner.
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const report = await generateDailyReport(prisma)

    // Send to Owner via ntfy
    try {
      const ntfyRes = await fetch("https://ntfy.sh/jobgrade-owner-liviu-2026", {
        method: "POST",
        headers: {
          Title: `Raport zilnic ${report.date}`,
          Priority: report.actionItems.length > 0 ? "high" : "default",
          Tags: "bar_chart,daily",
        },
        body: formatReportForNotification(report),
      })
      console.log("[NTFY] Daily report sent:", ntfyRes.status)
    } catch (ntfyErr: any) {
      console.warn("[NTFY] Daily report failed:", ntfyErr.message)
    }

    return NextResponse.json(report)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
