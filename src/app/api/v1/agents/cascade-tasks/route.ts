import { NextRequest, NextResponse } from "next/server"
import { generateTasksFromObjectives } from "@/lib/agents/objective-task-generator"

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * POST /api/v1/agents/cascade-tasks
 *
 * COG cascadează obiective în taskuri concrete pentru manageri și executori.
 * Rulat automat de ciclul proactiv sau de n8n FLUX-024.
 *
 * Query params:
 *   daysAhead — fereastră de obiective (default 30 zile)
 *   dryRun — true = doar numără, nu creează (default false)
 */
export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const params = new URL(req.url).searchParams
    const daysAhead = params.get("daysAhead") ? parseInt(params.get("daysAhead")!) : 30
    const dryRun = params.get("dryRun") === "true"

    const result = await generateTasksFromObjectives({ daysAhead, dryRun })

    return NextResponse.json({
      ...result,
      message: dryRun
        ? `Dry run: ${result.generated} taskuri ar fi generate, ${result.skipped} skip (existente)`
        : `${result.generated} taskuri generate, ${result.skipped} skip, obiective DRAFT→ACTIVE`,
    })
  } catch (error: any) {
    console.error("[CASCADE-TASKS]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
