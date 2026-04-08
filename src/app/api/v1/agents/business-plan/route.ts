import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateBusinessPlan } from "@/lib/agents/business-plan"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

// Read latest business plan from DB instead of in-memory
async function getLatestPlanFromDB(): Promise<any | null> {
  try {
    const p = prisma as any
    const entry = await p.kBEntry.findFirst({
      where: {
        agentRole: "COG",
        kbType: "METHODOLOGY",
        content: { startsWith: "[Business Plan" },
        status: "PERMANENT",
      },
      orderBy: { createdAt: "desc" },
      select: { content: true, tags: true, createdAt: true },
    })
    if (!entry) return null
    // Extract version from content: "[Business Plan v3] ..."
    const vMatch = entry.content.match(/\[Business Plan v(\d+)\]/)
    return {
      version: vMatch ? parseInt(vMatch[1], 10) : 1,
      generatedAt: entry.createdAt,
      sections: { executiveSummary: { content: entry.content.replace(/\[Business Plan v\d+\]\s*/, "") } },
    }
  } catch {
    return null
  }
}

/**
 * GET /api/v1/agents/business-plan
 * Get the latest business plan.
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const plan = await getLatestPlanFromDB()
  if (!plan) {
    return NextResponse.json({
      message: "No business plan generated yet. POST to generate.",
      version: 0,
    })
  }

  return NextResponse.json(plan)
}

/**
 * POST /api/v1/agents/business-plan
 * Generate a new version of the business plan.
 * Uses the previous plan as context for iteration.
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const previousPlan = await getLatestPlanFromDB()
    const plan = await generateBusinessPlan(prisma, previousPlan)

    // Notify Owner
    try {
      await fetch("https://ntfy.sh/jobgrade-owner-liviu-2026", {
        method: "POST",
        headers: {
          Title: `📑 Business Plan v${plan.version} generat`,
          Priority: "high",
          Tags: "page_facing_up,business-plan",
          Click: "http://localhost:3001/dashboard",
        },
        body: `COG a generat Business Plan v${plan.version}.\n${plan.sections.executiveSummary?.content?.substring(0, 200) || ""}`,
      })
    } catch { /* non-blocking */ }

    return NextResponse.json(plan)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
