import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { refineIdea } from "@/lib/agents/idea-refinery"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * POST /api/v1/agents/refine
 * Rafinare iterativă a unei idei de business.
 * Body: { idea: string, maxIterations?: number }
 *
 * Procesul: idea → 7 evaluatori → sinteză → repeat (max 3 iterații)
 * Output: idee rafinată + action plan + readiness score
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { idea, maxIterations } = body

    if (!idea) {
      return NextResponse.json({ error: "Required: idea" }, { status: 400 })
    }

    // Notify Owner that refinery started
    try {
      await fetch("https://ntfy.sh/jobgrade-owner-liviu-2026", {
        method: "POST",
        headers: { Title: "Rafinare idee in curs...", Priority: "default", Tags: "hourglass" },
        body: `Ideea: "${idea.substring(0, 100)}..."\nProces: 7 dimensiuni × max ${maxIterations || 3} iteratii`,
      })
    } catch {}

    const result = await refineIdea(idea, prisma, maxIterations || 3)

    // Notify Owner with result
    try {
      await fetch("https://ntfy.sh/jobgrade-owner-liviu-2026", {
        method: "POST",
        headers: { Title: `Idee rafinata! Score: ${result.readinessScore}/100`, Priority: "high", Tags: "bulb,sparkles" },
        body: `${result.iterations.length} iteratii, ${result.actionPlan.length} actiuni.\nScore: ${result.readinessScore}/100\n${result.finalIdea.substring(0, 200)}`,
      })
    } catch {}

    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
