import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkResourceAlerts, sendResourceAlerts, seedInitialResources } from "@/lib/agents/external-resources"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * GET /api/v1/agents/resources
 * Resource report with alerts.
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const report = await checkResourceAlerts(prisma)
    return NextResponse.json(report)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * POST /api/v1/agents/resources
 * Check alerts + send notifications + optionally seed.
 * Body: { seed?: boolean, notify?: boolean }
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))

    if (body.seed) {
      const seeded = await seedInitialResources(prisma)
      if (seeded > 0) console.log(`[RESOURCES] Seeded ${seeded} resources`)
    }

    const report = await checkResourceAlerts(prisma)

    if (body.notify !== false && report.alerts.length > 0) {
      await sendResourceAlerts(report)
    }

    return NextResponse.json(report)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
