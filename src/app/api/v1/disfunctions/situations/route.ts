import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  aggregateSituations,
  summarizeSituations,
  type EventInput,
} from "@/lib/disfunctions/situation-aggregator"

export const dynamic = "force-dynamic"

/**
 * GET /api/v1/disfunctions/situations
 *
 * Agregă evenimentele brute în situații contextualizate pentru Owner.
 * Vezi src/lib/disfunctions/situation-aggregator.ts pentru reguli.
 *
 * Query params:
 *  - windowHours: fereastra pentru a include RESOLVED-urile (default 1h).
 *    OPEN events sunt mereu incluse indiferent de vârstă.
 *
 * Response:
 *  {
 *    generatedAt: ISO,
 *    windowHours: number,
 *    summary: { total, decisionRequired, autoRemediating, knownGap, configNoise, topDecision },
 *    situations: Situation[]
 *  }
 *
 * Principiu (05.04.2026 Sprint 3 Block 2 extins): **zero conținut semantic**.
 * Aggregatorul lucrează doar pe metadate (class, signal, targetType, targetId).
 */

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

export async function GET(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const windowHours = Math.max(
    1,
    Math.min(48, Number(url.searchParams.get("windowHours") ?? "1")),
  )
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000)

  // Luăm evenimente relevante pentru situații curente.
  // Includem RESOLVED *doar* pe cele auto-remediate de sistem (remediationOk=true).
  // Închiderile administrative (mass-resolve, recalibration, corecții) NU sunt
  // situații — sunt arhivă. Aggregatorul nu trebuie să vadă arhiva ca zgomot.
  const rawEvents = await prisma.disfunctionEvent.findMany({
    where: {
      OR: [
        { status: "OPEN" },
        { status: "REMEDIATING" },
        { status: "ESCALATED" },
        {
          status: "RESOLVED",
          resolvedAt: { gte: since },
          remediationOk: true, // doar auto-remediate; exclude mass-closes administrative
        },
      ],
    },
    orderBy: { detectedAt: "desc" },
    take: 1000, // cap defensiv
  })

  const eventsForAggregator: EventInput[] = rawEvents.map((e) => ({
    id: e.id,
    class: e.class,
    severity: e.severity,
    status: e.status,
    targetType: e.targetType,
    targetId: e.targetId,
    signal: e.signal,
    detectedAt: e.detectedAt,
    resolvedAt: e.resolvedAt,
    remediationOk: e.remediationOk,
    detectorSource: e.detectorSource,
    durationMs: e.durationMs,
  }))

  const situations = aggregateSituations(eventsForAggregator)
  const summary = summarizeSituations(situations)

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    windowHours,
    rawEventsConsidered: rawEvents.length,
    summary,
    situations,
  })
}
