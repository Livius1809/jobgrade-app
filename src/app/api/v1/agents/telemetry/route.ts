import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getOrganismTelemetryOverview } from "@/lib/agents/execution-telemetry"
import { getLearningStats } from "@/lib/agents/learning-pipeline"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/**
 * GET /api/v1/agents/telemetry?hours=24
 *
 * Dashboard COG: telemetry internă organism.
 * Necesită autentificare (Owner/SUPER_ADMIN).
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: "auth" }, { status: 401 })

  // Doar Owner/SUPER_ADMIN pot vedea telemetry intern
  if (session.user.role !== "OWNER" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ message: "Acces restricționat" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const hours = parseInt(searchParams.get("hours") ?? "24", 10)

  try {
    const [telemetry, learning] = await Promise.all([
      getOrganismTelemetryOverview(hours),
      getLearningStats(),
    ])

    return NextResponse.json({ telemetry, learning })
  } catch (e) {
    return NextResponse.json(
      { message: e instanceof Error ? e.message : "Eroare" },
      { status: 500 }
    )
  }
}
