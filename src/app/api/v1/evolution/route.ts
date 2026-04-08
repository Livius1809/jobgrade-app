import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  runEvolutionCycle,
  getLastCycle,
  saveCycle,
  getConfigForContext,
} from "@/lib/evolution-engine"
import type { EvolutionContext } from "@/lib/evolution-engine"

export const maxDuration = 120

/**
 * POST /api/v1/evolution
 *
 * Rulează un ciclu al Evolution Engine.
 * Același endpoint, 4 contexte: OWNER | INTERNAL | B2B | B2C
 *
 * Body: {
 *   context: "OWNER" | "INTERNAL" | "B2B" | "B2C",
 *   subjectId: string,  // "owner" | agentRole | tenantId | b2cUserId
 *   force?: boolean      // forțează rulare chiar dacă nu a expirat ciclul
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { context, subjectId, force } = body as {
      context: EvolutionContext
      subjectId: string
      force?: boolean
    }

    if (!context || !subjectId) {
      return NextResponse.json(
        { error: "context și subjectId sunt obligatorii" },
        { status: 400 }
      )
    }

    const validContexts: EvolutionContext[] = ["OWNER", "INTERNAL", "B2B", "B2C"]
    if (!validContexts.includes(context)) {
      return NextResponse.json(
        { error: `context invalid: ${context}. Valid: ${validContexts.join(", ")}` },
        { status: 400 }
      )
    }

    const config = getConfigForContext(context)

    // Verifică ciclul anterior
    const lastCycle = await getLastCycle(context, subjectId, prisma)

    // Nu rula dacă ciclul anterior nu a expirat (unless force)
    if (lastCycle?.completedAt && !force) {
      const lastCompleted = new Date(lastCycle.completedAt)
      const nextDue = new Date(lastCompleted.getTime() + config.cycleDays * 24 * 60 * 60 * 1000)
      if (new Date() < nextDue) {
        return NextResponse.json({
          message: `Ciclul următor e programat pentru ${nextDue.toISOString()}. Folosește force=true pentru a rula acum.`,
          lastCycle: {
            cycleNumber: lastCycle.cycleNumber,
            completedAt: lastCycle.completedAt,
            compositeScore: lastCycle.newAwareness?.compositeScore || lastCycle.awareness?.compositeScore,
            maturityLevel: lastCycle.newAwareness?.maturityLevel || lastCycle.awareness?.maturityLevel,
          },
          nextDue: nextDue.toISOString(),
        })
      }
    }

    // Rulează ciclul
    const cycle = await runEvolutionCycle(config, subjectId, lastCycle, prisma)

    // Salvează în DB
    await saveCycle(cycle, prisma)

    return NextResponse.json({
      cycleNumber: cycle.cycleNumber,
      context: cycle.context,
      subjectId: cycle.subjectId,
      compositeScore: cycle.newAwareness?.compositeScore || cycle.awareness?.compositeScore,
      maturityLevel: cycle.newAwareness?.maturityLevel || cycle.awareness?.maturityLevel,
      gapsFound: cycle.diagnosis?.length || 0,
      gapsRevealed: cycle.diagnosis?.filter(g => g.revealedBy).length || 0,
      actionsPlanned: cycle.plan?.actions.length || 0,
      narrativeSummary: cycle.narrativeSummary,
      completedAt: cycle.completedAt,
    })
  } catch (e: any) {
    console.error("[EvolutionEngine] Error:", e.message)
    return NextResponse.json(
      { error: "Eroare la rularea ciclului de evoluție", details: e.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/evolution?context=...&subjectId=...&cycles=5
 *
 * Returnează istoricul ciclurilor de evoluție.
 */
export async function GET(req: NextRequest) {
  const context = req.nextUrl.searchParams.get("context") as EvolutionContext | null
  const subjectId = req.nextUrl.searchParams.get("subjectId")
  const cyclesParam = req.nextUrl.searchParams.get("cycles") || "5"
  const maxCycles = Math.min(20, parseInt(cyclesParam, 10) || 5)

  if (!context || !subjectId) {
    return NextResponse.json(
      { error: "context și subjectId sunt obligatorii" },
      { status: 400 }
    )
  }

  try {
    const p = prisma as any
    const entries = await p.kBEntry.findMany({
      where: {
        agentRole: "EVOLUTION_ENGINE",
        tags: {
          hasEvery: ["evolution-cycle", context.toLowerCase(), subjectId],
        },
        status: "PERMANENT",
      },
      orderBy: { createdAt: "desc" },
      take: maxCycles,
      select: { content: true, createdAt: true },
    })

    const cycles = entries.map((e: any) => {
      const cycle = JSON.parse(e.content)
      // Returnează sumar, nu ciclul complet (prea mare)
      return {
        cycleNumber: cycle.cycleNumber,
        compositeScore: cycle.newAwareness?.compositeScore || cycle.awareness?.compositeScore,
        maturityLevel: cycle.newAwareness?.maturityLevel || cycle.awareness?.maturityLevel,
        gapsFound: cycle.diagnosis?.length || 0,
        gapsRevealed: cycle.diagnosis?.filter((g: any) => g.revealedBy)?.length || 0,
        actionsPlanned: cycle.plan?.actions.length || 0,
        narrativeSummary: cycle.narrativeSummary,
        completedAt: cycle.completedAt,
        dimensions: (cycle.newAwareness?.dimensions || cycle.awareness?.dimensions || []).map((d: any) => ({
          code: d.code,
          name: d.name,
          score: d.score,
          trend: d.trend,
        })),
      }
    })

    return NextResponse.json({
      context,
      subjectId,
      totalCycles: cycles.length,
      cycles,
      // Trend global
      trend: cycles.length >= 2
        ? {
            firstScore: cycles[cycles.length - 1]?.compositeScore,
            lastScore: cycles[0]?.compositeScore,
            delta: (cycles[0]?.compositeScore || 0) - (cycles[cycles.length - 1]?.compositeScore || 0),
            direction: (cycles[0]?.compositeScore || 0) > (cycles[cycles.length - 1]?.compositeScore || 0)
              ? "up" : (cycles[0]?.compositeScore || 0) < (cycles[cycles.length - 1]?.compositeScore || 0)
              ? "down" : "stable",
          }
        : null,
    })
  } catch (e: any) {
    console.error("[EvolutionEngine GET] Error:", e.message)
    return NextResponse.json(
      { error: "Eroare la citirea istoricului de evoluție", details: e.message },
      { status: 500 }
    )
  }
}
