import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateEvolutionReport } from "@/lib/agents/evolution-report"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * POST /api/v1/agents/evolution
 * Generează raportul de evoluție per agent
 * Body opțional: { periodDays: number } (default: 3)
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const periodDays = body.periodDays || 3

    const report = await generateEvolutionReport(prisma, periodDays)

    // Notificare Owner via ntfy
    try {
      const ntfyUrl = process.env.NTFY_URL || "https://ntfy.sh"
      const ntfyTopic = process.env.NTFY_TOPIC
      if (ntfyTopic) {
        const topAgents = report.agents.slice(0, 3).map(a =>
          `${a.agentRole}: ${a.compositeScore}/100 (${a.maturityLevel})`
        ).join("\n")

        const highConcerns = report.concerns
          .filter(c => c.severity === "HIGH")
          .map(c => `⚠ ${c.role}: ${c.issue}`)
          .join("\n")

        await fetch(`${ntfyUrl}/${ntfyTopic}`, {
          method: "POST",
          headers: {
            "Title": `Raport Evoluție Agenți — ${report.generatedAt.split("T")[0]}`,
            "Priority": report.concerns.some(c => c.severity === "HIGH") ? "high" : "default",
            "Tags": "chart_with_upwards_trend",
          },
          body: [
            `${report.agentCount} agenți evaluați | Media: ${report.teamHealth.avgComposite}/100`,
            `Distribuție: ${report.teamHealth.distribution.seed}S ${report.teamHealth.distribution.growing}G ${report.teamHealth.distribution.competent}C ${report.teamHealth.distribution.expert}E ${report.teamHealth.distribution.master}M`,
            "",
            "Top 3:",
            topAgents,
            highConcerns ? `\nPreocupări:\n${highConcerns}` : "",
          ].filter(Boolean).join("\n"),
        }).catch(() => {})
      }
    } catch { /* non-blocking */ }

    return NextResponse.json(report)
  } catch (error: any) {
    console.error("[EVOLUTION REPORT] Error:", error.message)
    return NextResponse.json(
      { error: "Failed to generate evolution report", details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/agents/evolution
 * Returnează ultimul raport generat (din AgentMetric recent)
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const report = await generateEvolutionReport(prisma, 3)
    return NextResponse.json(report)
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to get evolution report", details: error.message },
      { status: 500 }
    )
  }
}
