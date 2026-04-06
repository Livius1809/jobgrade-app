import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  aggregateSituations,
  summarizeSituations,
  type EventInput,
} from "@/lib/disfunctions/situation-aggregator"

export const dynamic = "force-dynamic"

/**
 * GET /api/v1/disfunctions/daily-summary
 *
 * Sumar al disfuncțiilor din ultimele 24h pentru raport zilnic 09:00 către Owner
 * (FLUX-046, un singur ntfy).
 *
 * Format=text (05.04.2026 Sprint 3 Block 2 extins): migrat de la evenimente brute
 * la **situații contextualizate** produse de situation-aggregator. Owner primește
 * 3-5 situații cu context și acțiune cerută în loc de listă brută.
 *
 * Format=json: rămâne pe agregări brute (backward-compat) PLUS câmp nou
 * `situations` cu output-ul aggregatorului.
 *
 * Query params:
 *  - hours: fereastra de agregare (default 24, max 168)
 *  - format: "json" (default) | "text" (plain-text pentru ntfy)
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
  const hours = Math.min(
    Math.max(parseInt(url.searchParams.get("hours") ?? "24", 10) || 24, 1),
    168,
  )
  const format = url.searchParams.get("format") ?? "json"

  const since = new Date(Date.now() - hours * 60 * 60 * 1000)

  const events = await prisma.disfunctionEvent.findMany({
    where: { detectedAt: { gte: since } },
    orderBy: { detectedAt: "desc" },
  })

  // Agregări
  const byClass = { D1_TECHNICAL: 0, D2_FUNCTIONAL_MGMT: 0, D3_BUSINESS_PROCESS: 0 }
  const byStatus = { OPEN: 0, REMEDIATING: 0, RESOLVED: 0, ESCALATED: 0 }
  const bySeverity = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }
  const openByTargetType = { SERVICE: 0, WORKFLOW: 0, ROLE: 0, FLUX_STEP: 0 }

  for (const e of events) {
    byClass[e.class] = (byClass[e.class] ?? 0) + 1
    byStatus[e.status] = (byStatus[e.status] ?? 0) + 1
    bySeverity[e.severity] = (bySeverity[e.severity] ?? 0) + 1
    if (e.status === "OPEN") {
      openByTargetType[e.targetType] = (openByTargetType[e.targetType] ?? 0) + 1
    }
  }

  // Top 5 cele mai vechi OPEN cu severity ≥ HIGH
  const topOldOpen = events
    .filter((e) => e.status === "OPEN" && (e.severity === "HIGH" || e.severity === "CRITICAL"))
    .sort((a, b) => a.detectedAt.getTime() - b.detectedAt.getTime())
    .slice(0, 5)
    .map((e) => ({
      id: e.id,
      class: e.class,
      severity: e.severity,
      targetType: e.targetType,
      targetId: e.targetId,
      signal: e.signal,
      ageMinutes: Math.round((Date.now() - e.detectedAt.getTime()) / 60000),
    }))

  // Auto-remedieri ultimele 24h (indicator de sănătate sistem)
  const autoResolved = events.filter(
    (e) => e.status === "RESOLVED" && e.resolvedBy === "auto",
  ).length

  const summary = {
    windowHours: hours,
    since,
    total: events.length,
    byClass,
    byStatus,
    bySeverity,
    openByTargetType,
    autoResolved,
    topOldOpen,
  }

  // Situations — agregat contextualizat.
  // Filtrează la OPEN/REMEDIATING/ESCALATED + RESOLVED auto-remediate.
  // Închiderile administrative (mass-resolve, recalibration) sunt arhivă, nu situații.
  const eventsForSituations: EventInput[] = events
    .filter(
      (e) =>
        e.status === "OPEN" ||
        e.status === "REMEDIATING" ||
        e.status === "ESCALATED" ||
        (e.status === "RESOLVED" && e.remediationOk === true),
    )
    .map((e) => ({
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
  const situations = aggregateSituations(eventsForSituations)
  const situationsSummary = summarizeSituations(situations)

  if (format === "text") {
    // Format plain-text pentru ntfy — livrat ca situații contextualizate.
    // Owner primește 3-5 situații cu acțiune cerută în loc de listă brută.
    const lines: string[] = []
    lines.push(`=== JobGrade — Raport ${hours}h ===`)
    lines.push(
      `${situationsSummary.total} situații | ` +
        `Decizie: ${situationsSummary.decisionRequired} | ` +
        `Auto: ${situationsSummary.autoRemediating} | ` +
        `Known gap: ${situationsSummary.knownGap}`,
    )
    lines.push(`Auto-reparate stack (${hours}h): ${autoResolved}`)
    lines.push(``)

    if (situations.length === 0) {
      lines.push(`✓ Nicio situație activă. Cockpit curat.`)
    } else {
      // Grupăm pe clasificare pentru lizibilitate
      const byClass = {
        DECISION_REQUIRED: situations.filter((s) => s.classification === "DECISION_REQUIRED"),
        AUTO_REMEDIATING: situations.filter((s) => s.classification === "AUTO_REMEDIATING"),
        KNOWN_GAP_ACCEPTED: situations.filter((s) => s.classification === "KNOWN_GAP_ACCEPTED"),
        CONFIG_NOISE: situations.filter((s) => s.classification === "CONFIG_NOISE"),
      }

      if (byClass.DECISION_REQUIRED.length > 0) {
        lines.push(`━━━ CERE DECIZIE (${byClass.DECISION_REQUIRED.length}) ━━━`)
        for (const s of byClass.DECISION_REQUIRED) {
          lines.push(``)
          lines.push(`▸ [${s.severity}] ${s.title}`)
          lines.push(`  Cauza: ${s.cause}`)
          lines.push(`  Impact: ${s.impact}`)
          lines.push(`  → ${s.actionRequired}`)
        }
        lines.push(``)
      }

      if (byClass.AUTO_REMEDIATING.length > 0) {
        lines.push(`━━━ ÎN AUTO-REMEDIERE (${byClass.AUTO_REMEDIATING.length}) — info ━━━`)
        for (const s of byClass.AUTO_REMEDIATING) {
          lines.push(`▸ ${s.title} — ${s.scope.entities.join(", ")}`)
        }
        lines.push(``)
      }

      if (byClass.KNOWN_GAP_ACCEPTED.length > 0) {
        lines.push(`━━━ GAP-URI CUNOSCUTE ACCEPTATE (${byClass.KNOWN_GAP_ACCEPTED.length}) ━━━`)
        for (const s of byClass.KNOWN_GAP_ACCEPTED) {
          lines.push(`▸ ${s.title}`)
          lines.push(`  (${s.actionRequired})`)
        }
        lines.push(``)
      }

      if (byClass.CONFIG_NOISE.length > 0) {
        lines.push(
          `━━━ Zgomot config (${byClass.CONFIG_NOISE.length}) — ignorat, verifică săptămânal ━━━`,
        )
      }
    }

    return new Response(lines.join("\n"), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  }

  return NextResponse.json({ ...summary, situations, situationsSummary })
}
