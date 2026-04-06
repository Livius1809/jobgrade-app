import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { runColdStart } from "@/lib/kb/cold-start"
import {
  getAllAgentRoles,
  getSelfInterviewPrompts,
} from "@/lib/agents/agent-registry"

const schema = z.object({
  agentRole: z.string().min(1),
  maxBatches: z.number().int().min(1).max(10).optional().default(5),
  clearExisting: z.boolean().optional().default(false),
})

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

/**
 * POST /api/v1/kb/cold-start
 *
 * Declanșează cold start (self-interview) pentru un agent.
 * Generează KB entries via Claude API și le persistă în DB.
 *
 * Body: { agentRole: string, maxBatches?: number, clearExisting?: boolean }
 * Response: { agentRole, entriesGenerated, persisted, durationMs }
 */
export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
  }

  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)

    if (!parsed.success) {
      const allRoles = await getAllAgentRoles(prisma)
      return NextResponse.json(
        {
          message: "Date invalide.",
          errors: parsed.error.flatten().fieldErrors,
          availableRoles: allRoles,
        },
        { status: 400 }
      )
    }

    const { agentRole, maxBatches, clearExisting } = parsed.data

    const prompts = await getSelfInterviewPrompts(prisma)
    if (!prompts[agentRole]) {
      const allRoles = await getAllAgentRoles(prisma)
      return NextResponse.json(
        {
          message: `Rol "${agentRole}" nu are prompturi de self-interview.`,
          availableRoles: allRoles,
        },
        { status: 400 }
      )
    }

    const result = await runColdStart(agentRole, prisma, {
      maxBatches,
      clearExisting,
    })

    return NextResponse.json({
      agentRole: result.agentRole,
      entriesGenerated: result.entriesGenerated,
      persisted: result.persisted,
      durationMs: result.durationMs,
    })
  } catch (err: any) {
    console.error("[cold-start] Eroare:", err)
    return NextResponse.json(
      { message: "Eroare internă.", error: err.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/kb/cold-start
 *
 * Returnează lista de roluri disponibile și statusul cold start per rol.
 */
export async function GET(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
  }

  try {
    // Numără entries SELF_INTERVIEW per rol
    const counts = await prisma.kBEntry.groupBy({
      by: ["agentRole"],
      where: { source: "SELF_INTERVIEW" },
      _count: { id: true },
    })

    const countMap = new Map(counts.map((c: any) => [c.agentRole, c._count.id]))

    const allRoles = await getAllAgentRoles(prisma)
    const prompts = await getSelfInterviewPrompts(prisma)

    const roles = allRoles.map((role) => ({
      role,
      description: prompts[role]?.description || role,
      promptCount: prompts[role]?.prompts.length || 0,
      existingEntries: countMap.get(role) || 0,
      coldStartDone: (countMap.get(role) || 0) > 0,
    }))

    return NextResponse.json({
      totalRoles: roles.length,
      rolesWithColdStart: roles.filter((r) => r.coldStartDone).length,
      rolesWithoutColdStart: roles.filter((r) => !r.coldStartDone).length,
      roles,
    })
  } catch (err: any) {
    console.error("[cold-start] Eroare GET:", err)
    return NextResponse.json(
      { message: "Eroare internă.", error: err.message },
      { status: 500 }
    )
  }
}
