/**
 * POST /api/v1/evaluate/recalculate
 *
 * Recalculează scorul total din literele furnizate.
 * NU expune tabelul de scorare — returnează doar scorul total.
 *
 * Body: { letters: { Knowledge: "G", Communications: "E", ... } }
 * Response: { score: 2710 }
 */

import { NextRequest, NextResponse } from "next/server"
import { SCORING_TABLE, type CriterionKey } from "@/lib/evaluation/scoring-table"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { letters } = await req.json()

    if (!letters || typeof letters !== "object") {
      return NextResponse.json({ error: "letters required" }, { status: 400 })
    }

    let score = 0
    for (const [criterion, level] of Object.entries(letters)) {
      const table = SCORING_TABLE[criterion as CriterionKey]
      if (table && typeof level === "string" && level in table) {
        score += table[level as keyof typeof table]
      }
    }

    return NextResponse.json({ score })
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 })
  }
}
