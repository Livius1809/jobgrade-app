export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import {
  validateAgent,
  validateManager,
  validateOrganism,
  validateCPU,
} from "@/lib/engines/self-validation-engine"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * GET /api/v1/agents/self-validation
 *
 * Internal mirror — each level uses this to see itself and adjust.
 * NOT a dashboard for Owner — consumed by agents themselves.
 *
 * Query params:
 *   level=agent&role=EMA      -> agent validation
 *   level=manager&role=PMA    -> manager validation
 *   level=organism            -> organism validation (COG level)
 *   level=cpu                 -> CPU cross-business validation
 *   periodDays=7              -> optional, defaults per level
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const level = url.searchParams.get("level")
  const role = url.searchParams.get("role")
  const periodDaysParam = url.searchParams.get("periodDays")
  const periodDays = periodDaysParam ? parseInt(periodDaysParam, 10) : undefined

  try {
    switch (level) {
      case "agent": {
        if (!role) {
          return NextResponse.json(
            { error: "Missing 'role' query param for agent-level validation" },
            { status: 400 }
          )
        }
        const result = await validateAgent(role, periodDays ?? 7)
        return NextResponse.json({ level: "agent", validation: result })
      }

      case "manager": {
        if (!role) {
          return NextResponse.json(
            { error: "Missing 'role' query param for manager-level validation" },
            { status: 400 }
          )
        }
        const result = await validateManager(role, periodDays ?? 7)
        return NextResponse.json({ level: "manager", validation: result })
      }

      case "organism": {
        const result = await validateOrganism(periodDays ?? 30)
        return NextResponse.json({ level: "organism", validation: result })
      }

      case "cpu": {
        const result = await validateCPU()
        return NextResponse.json({ level: "cpu", validation: result })
      }

      default:
        return NextResponse.json(
          {
            error: "Invalid 'level' param. Use: agent, manager, organism, cpu",
            usage: {
              agent: "?level=agent&role=EMA&periodDays=7",
              manager: "?level=manager&role=PMA&periodDays=7",
              organism: "?level=organism&periodDays=30",
              cpu: "?level=cpu",
            },
          },
          { status: 400 }
        )
    }
  } catch (e: any) {
    console.error(`[self-validation] Error for level=${level} role=${role}:`, e.message)
    return NextResponse.json(
      { error: e.message, level, role },
      { status: 500 }
    )
  }
}
