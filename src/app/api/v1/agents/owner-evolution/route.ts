import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateOwnerEvolutionReport } from "@/lib/agents/owner-evolution-report"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * POST /api/v1/agents/owner-evolution
 * Generează raportul de evoluție Owner
 * Body opțional: { periodDays: number } (default: 3)
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const periodDays = body.periodDays || 3

    const report = await generateOwnerEvolutionReport(prisma, periodDays)

    // Notificare Owner via ntfy
    try {
      const ntfyUrl = process.env.NTFY_URL || "https://ntfy.sh"
      const ntfyTopic = process.env.NTFY_TOPIC
      if (ntfyTopic) {
        const topDims = report.dimensions
          .sort((a, b) => a.score - b.score)
          .slice(0, 3)
          .map(d => `${d.name}: ${d.score}/100 ${d.trend === "up" ? "↑" : d.trend === "down" ? "↓" : "→"}`)
          .join("\n")

        await fetch(`${ntfyUrl}/${ntfyTopic}`, {
          method: "POST",
          headers: {
            "Title": `Raport Evoluție Owner — ${report.compositeLevel}`,
            "Priority": report.compositeScore < 50 ? "high" : "default",
            "Tags": "mirror,seedling",
          },
          body: [
            `Scor: ${report.compositeScore}/100 (${report.compositeLevel})`,
            `Perioadă: ${report.totalInputs} input-uri, ${report.decisionProfile.totalDecisions} decizii`,
            report.patterns.length > 0 ? `${report.patterns.length} pattern-uri recurente` : "Zero pattern-uri recurente",
            "",
            "Dimensiuni de atenție:",
            topDims,
            "",
            report.narrativeSummary.substring(0, 200),
          ].join("\n"),
        }).catch(() => {})
      }
    } catch { /* non-blocking */ }

    return NextResponse.json(report)
  } catch (error: any) {
    console.error("[OWNER EVOLUTION] Error:", error.message)
    return NextResponse.json(
      { error: "Failed to generate owner evolution report", details: error.message },
      { status: 500 }
    )
  }
}
