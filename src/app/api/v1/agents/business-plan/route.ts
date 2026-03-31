import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateBusinessPlan } from "@/lib/agents/business-plan"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

// In-memory store for latest plan (will be replaced by DB storage later)
let latestPlan: any = null

/**
 * GET /api/v1/agents/business-plan
 * Get the latest business plan.
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!latestPlan) {
    return NextResponse.json({
      message: "No business plan generated yet. POST to generate.",
      version: 0,
    })
  }

  return NextResponse.json(latestPlan)
}

/**
 * POST /api/v1/agents/business-plan
 * Generate a new version of the business plan.
 * Uses the previous plan as context for iteration.
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const plan = await generateBusinessPlan(prisma, latestPlan)
    latestPlan = plan

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
