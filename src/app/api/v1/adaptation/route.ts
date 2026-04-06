import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  computeAllAdaptationMetrics,
  type AdaptationInput,
} from "@/lib/agents/adaptation-metrics"

export const dynamic = "force-dynamic"

/**
 * /api/v1/adaptation
 *
 * G4 — Adaptation Metrics (Rhythm Layer).
 * Meta-metrici: OODA timing, KB velocity, patch effectiveness, etc.
 *
 * GET    ?businessId=...&windowDays=7     — calcul + istoric
 * POST   ?action=snapshot&businessId=...  — salvează snapshot curent
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
  const businessId = url.searchParams.get("businessId")
  if (!businessId) {
    return NextResponse.json({ error: "missing_businessId" }, { status: 400 })
  }
  const windowDays = parseInt(url.searchParams.get("windowDays") ?? "7", 10)
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)

  // Collect data from multiple sources
  const [signals, patches, kbEntries, violations, homeoTargets, pruneCandidates, wildCards] =
    await Promise.all([
      // Signals (OODA observe)
      prisma.externalSignal.findMany({
        where: { capturedAt: { gte: since } },
        select: { id: true, capturedAt: true },
      }),
      // Patches (OODA act)
      prisma.agentBehaviorPatch.findMany({
        where: { businessId, createdAt: { gte: since } },
        select: { id: true, status: true, createdAt: true },
      }),
      // KB entries (velocity)
      prisma.kBEntry.findMany({
        where: { createdAt: { gte: since } },
        select: { id: true, createdAt: true },
      }),
      // Violations (immune)
      prisma.boundaryViolation.findMany({
        where: { createdAt: { gte: since } },
        select: { id: true, createdAt: true },
      }),
      // Homeostasis (deviation)
      prisma.homeostaticTarget.findMany({
        where: { businessId, isActive: true },
        select: { lastReading: true, optimalValue: true },
      }),
      // Prune candidates (pruning velocity)
      prisma.pruneCandidate.findMany({
        where: { businessId, status: "PRUNED", reviewedAt: { gte: since } },
        select: { id: true },
      }),
      // Wild cards (engagement)
      prisma.wildCard.findMany({
        where: { businessId, createdAt: { gte: since } },
        select: { id: true, response: true },
      }),
    ])

  // Compute homeostatic deviations
  const deviations = homeoTargets
    .filter((t) => t.lastReading !== null && t.optimalValue !== null)
    .map((t) => {
      const opt = t.optimalValue!
      if (opt === 0) return t.lastReading === 0 ? 0 : 100
      return Math.abs(((t.lastReading! - opt) / opt) * 100)
    })

  const input: AdaptationInput = {
    signals: signals.map((s) => ({ type: "signal", id: s.id, timestamp: s.capturedAt })),
    actions: patches.map((p) => ({ type: "patch", id: p.id, timestamp: p.createdAt })),
    kbEntries: kbEntries.map((e) => ({ type: "kb", id: e.id, timestamp: e.createdAt })),
    patches: patches.map((p) => ({ status: p.status })),
    violations: violations.map((v) => ({ type: "violation", id: v.id, timestamp: v.createdAt })),
    homeostaticDeviations: deviations,
    prunedCount: pruneCandidates.length,
    wildCardTotal: wildCards.length,
    wildCardResponded: wildCards.filter((w) => w.response).length,
    windowDays,
  }

  const metrics = computeAllAdaptationMetrics(input)

  // Fetch istoric pentru trend comparison
  const historicMetrics = await prisma.adaptationMetric.findMany({
    where: { businessId },
    orderBy: { measuredAt: "desc" },
    take: 50,
  })

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    businessId,
    windowDays,
    metrics,
    dataSources: {
      signals: signals.length,
      patches: patches.length,
      kbEntries: kbEntries.length,
      violations: violations.length,
      homeoTargets: homeoTargets.length,
      pruneCandidates: pruneCandidates.length,
      wildCards: wildCards.length,
    },
    historic: historicMetrics.slice(0, 20),
  })
}

export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const action = url.searchParams.get("action")
  const businessId = url.searchParams.get("businessId")

  if (action !== "snapshot" || !businessId) {
    return NextResponse.json({ error: "required: action=snapshot&businessId=..." }, { status: 400 })
  }

  // Re-compute current metrics (same as GET)
  const windowDays = 7
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)

  const [signals, patches, kbEntries, violations, homeoTargets, pruneCandidates, wildCards] =
    await Promise.all([
      prisma.externalSignal.findMany({ where: { capturedAt: { gte: since } }, select: { id: true, capturedAt: true } }),
      prisma.agentBehaviorPatch.findMany({ where: { businessId, createdAt: { gte: since } }, select: { id: true, status: true, createdAt: true } }),
      prisma.kBEntry.findMany({ where: { createdAt: { gte: since } }, select: { id: true, createdAt: true } }),
      prisma.boundaryViolation.findMany({ where: { createdAt: { gte: since } }, select: { id: true, createdAt: true } }),
      prisma.homeostaticTarget.findMany({ where: { businessId, isActive: true }, select: { lastReading: true, optimalValue: true } }),
      prisma.pruneCandidate.findMany({ where: { businessId, status: "PRUNED", reviewedAt: { gte: since } }, select: { id: true } }),
      prisma.wildCard.findMany({ where: { businessId, createdAt: { gte: since } }, select: { id: true, response: true } }),
    ])

  const deviations = homeoTargets
    .filter((t) => t.lastReading !== null && t.optimalValue !== null)
    .map((t) => {
      const opt = t.optimalValue!
      if (opt === 0) return t.lastReading === 0 ? 0 : 100
      return Math.abs(((t.lastReading! - opt) / opt) * 100)
    })

  const metrics = computeAllAdaptationMetrics({
    signals: signals.map((s) => ({ type: "signal", id: s.id, timestamp: s.capturedAt })),
    actions: patches.map((p) => ({ type: "patch", id: p.id, timestamp: p.createdAt })),
    kbEntries: kbEntries.map((e) => ({ type: "kb", id: e.id, timestamp: e.createdAt })),
    patches: patches.map((p) => ({ status: p.status })),
    violations: violations.map((v) => ({ type: "violation", id: v.id, timestamp: v.createdAt })),
    homeostaticDeviations: deviations,
    prunedCount: pruneCandidates.length,
    wildCardTotal: wildCards.length,
    wildCardResponded: wildCards.filter((w) => w.response).length,
    windowDays,
  })

  // Persist snapshot
  let saved = 0
  for (const m of metrics) {
    await prisma.adaptationMetric.create({
      data: {
        businessId,
        metricCode: m.metricCode,
        metricName: m.metricName,
        value: m.value,
        unit: m.unit,
        windowDays,
      },
    })
    saved++
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    saved,
    metrics,
  })
}
