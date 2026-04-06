import { NextRequest, NextResponse } from "next/server"
import { getResourceAllocations, transferResources, identifyImbalances } from "@/lib/agents/resource-market"

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * GET /api/v1/agents/resource-market — starea resurselor tuturor agenților
 * GET /api/v1/agents/resource-market?imbalances=true — surplus/deficit + sugestii
 * POST /api/v1/agents/resource-market — transfer resurse între agenți
 */
export async function GET(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const showImbalances = new URL(req.url).searchParams.get("imbalances") === "true"

  try {
    if (showImbalances) {
      const result = await identifyImbalances()
      return NextResponse.json(result)
    }

    const allocations = await getResourceAllocations()
    return NextResponse.json({ count: allocations.length, allocations })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const { fromRole, toRole, amount } = await req.json()

    if (!fromRole || !toRole || !amount) {
      return NextResponse.json({ error: "Required: fromRole, toRole, amount" }, { status: 400 })
    }

    const result = await transferResources(fromRole, toRole, amount)
    return NextResponse.json(result, { status: result.success ? 200 : 409 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
