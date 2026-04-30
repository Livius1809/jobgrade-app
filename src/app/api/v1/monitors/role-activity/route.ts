import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { AgentLevel } from "@/generated/prisma"

export const dynamic = "force-dynamic"

/**
 * GET /api/v1/monitors/role-activity
 *
 * Pentru fiecare rol din organigramă (AgentDefinition.isActive = true), măsoară
 * dacă rolul e FUNCȚIONAL activ în ritmul așteptat pentru nivelul său.
 *
 * Sursă date (toate funcționale, zero semantice):
 *  - CycleLog — cicluri executate per managerRole
 *  - Escalation — escaladări emise de rol
 *  - AgentMetric — metrici agregate perioadă
 *
 * Praguri D2 (principiu canonic 05.04.2026):
 *  - STRATEGIC: 0 cicluri în 48h SAU 0 acțiuni în 7 zile
 *  - TACTICAL:  0 cicluri în 24h SAU 0 acțiuni în 7 zile
 *  - OPERATIONAL: 0 activitate în 48h (fallback: tasksCompleted din AgentMetric)
 *
 * Flag secundar MONOTONY: ≥7 cicluri în 7 zile DAR un singur actionType (manager
 * mecanic — nu judecăm dacă e corect, doar că nu diferențiază).
 *
 * Principiu: nu judecăm *ce* decide agentul, doar *dacă* și *cu ce ritm + variație*.
 *
 * Query params:
 *  - sinceHours: fereastra "active" (default 72)
 */

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

// Praguri în minute — configurabile via env pentru tuning
const THRESHOLDS = {
  STRATEGIC: {
    cycleWindowH: 48,
    activityWindowD: 7,
  },
  TACTICAL: {
    cycleWindowH: 48,
    activityWindowD: 7,
  },
  OPERATIONAL: {
    cycleWindowH: 48,
    activityWindowD: 7,
  },
} as const

const MONOTONY_MIN_CYCLES = 7
const MONOTONY_WINDOW_DAYS = 7

export async function GET(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const d1ago = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const d2ago = new Date(now.getTime() - 48 * 60 * 60 * 1000)
  const d7ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Toate rolurile active din registry
  const agents = await prisma.agentDefinition.findMany({
    where: { isActive: true },
    select: {
      agentRole: true,
      displayName: true,
      level: true,
      isManager: true,
      cycleIntervalHours: true,
      activityMode: true,
    },
  })

  if (agents.length === 0) {
    return NextResponse.json({
      window: { d1ago, d2ago, d7ago, now },
      roles: [],
      summary: { total: 0, D2: 0, MONOTONE: 0, ACTIVE: 0 },
      note: "no_agents_in_registry",
    })
  }

  const roleCodes = agents.map((a) => a.agentRole)

  // Cycle logs — activitate managerială (din perspectiva managerului, nu a țintei)
  const cycles24h = await prisma.cycleLog.groupBy({
    by: ["managerRole"],
    where: { managerRole: { in: roleCodes }, createdAt: { gte: d1ago } },
    _count: { _all: true },
    _max: { createdAt: true },
  })
  const cycles48h = await prisma.cycleLog.groupBy({
    by: ["managerRole"],
    where: { managerRole: { in: roleCodes }, createdAt: { gte: d2ago } },
    _count: { _all: true },
  })
  const cycles7d = await prisma.cycleLog.findMany({
    where: { managerRole: { in: roleCodes }, createdAt: { gte: d7ago } },
    select: { managerRole: true, actionType: true },
  })

  // Ultima activitate oricare (max între cycle + escalation + metric)
  const lastCycleByRole = new Map<string, Date>()
  const c24hByRole = new Map<string, number>()
  const c48hByRole = new Map<string, number>()
  for (const r of cycles24h) {
    c24hByRole.set(r.managerRole, r._count._all)
    if (r._max.createdAt) lastCycleByRole.set(r.managerRole, r._max.createdAt)
  }
  for (const r of cycles48h) c48hByRole.set(r.managerRole, r._count._all)

  // Agregate 7d: count + diversitate actionType
  const cycles7dByRole = new Map<string, { total: number; actionTypes: Set<string> }>()
  for (const row of cycles7d) {
    const entry = cycles7dByRole.get(row.managerRole) ?? { total: 0, actionTypes: new Set() }
    entry.total++
    entry.actionTypes.add(row.actionType)
    cycles7dByRole.set(row.managerRole, entry)
  }

  // Escalări emise de rol în 7 zile (alt semnal de activitate)
  const esc7d = await prisma.escalation.groupBy({
    by: ["sourceRole"],
    where: { sourceRole: { in: roleCodes }, createdAt: { gte: d7ago } },
    _count: { _all: true },
    _max: { createdAt: true },
  })
  const escCountByRole = new Map<string, number>()
  const lastEscByRole = new Map<string, Date>()
  for (const e of esc7d) {
    escCountByRole.set(e.sourceRole, e._count._all)
    if (e._max.createdAt) lastEscByRole.set(e.sourceRole, e._max.createdAt)
  }

  // Metrici recente (AgentMetric) — ultima perioadă
  const metrics = await prisma.agentMetric.findMany({
    where: { agentRole: { in: roleCodes }, periodEnd: { gte: d7ago } },
    orderBy: { periodEnd: "desc" },
  })
  const latestMetricByRole = new Map<string, (typeof metrics)[number]>()
  for (const m of metrics) {
    if (!latestMetricByRole.has(m.agentRole)) {
      latestMetricByRole.set(m.agentRole, m)
    }
  }

  // Construim rezultatul per rol
  const roles = agents.map((a) => {
    const role = a.agentRole
    const level = a.level
    const thr = THRESHOLDS[level]

    const lastCycle = lastCycleByRole.get(role) ?? null
    const lastEsc = lastEscByRole.get(role) ?? null
    const lastMetric = latestMetricByRole.get(role)
    const lastMetricAt = lastMetric?.periodEnd ?? null

    // Ultima activitate oricare — max(cycle, escalation, metric)
    const candidates = [lastCycle, lastEsc, lastMetricAt].filter(
      (d): d is Date => d !== null,
    )
    const lastActiveAt: Date | null =
      candidates.length > 0
        ? new Date(Math.max(...candidates.map((d) => d.getTime())))
        : null

    const c24h = c24hByRole.get(role) ?? 0
    const c48h = c48hByRole.get(role) ?? 0
    const c7d = cycles7dByRole.get(role) ?? { total: 0, actionTypes: new Set<string>() }
    const actionTypes7d = Array.from(c7d.actionTypes)
    const escCount7d = escCountByRole.get(role) ?? 0

    // Total "acțiuni" în 7 zile = cicluri + escaladări + tasks completate
    const totalActions7d = c7d.total + escCount7d + (lastMetric?.tasksCompleted ?? 0)

    // Detecție D2 — calibrată pe activityMode
    //
    // PROACTIVE_CYCLIC / HYBRID: detectăm absența ciclurilor / activității.
    // REACTIVE_TRIGGERED: NU raportăm absența — agentul așteaptă trigger extern,
    //   absența e stare normală. (Pe viitor: latență la trigger, nu aici.)
    // DORMANT_UNTIL_DELEGATED: NU raportăm absența — agentul așteaptă mecanism
    //   de delegare funcțională (sprint viitor "orchestrare execuție").
    const cycleWindowMs = thr.cycleWindowH * 60 * 60 * 1000
    const cyclesInWindow = thr.cycleWindowH <= 24 ? c24h : c48h

    let d2 = false
    const d2Reasons: string[] = []
    const detectionApplies =
      a.activityMode === "PROACTIVE_CYCLIC" || a.activityMode === "HYBRID"

    if (detectionApplies) {
      if (a.isManager) {
        if (cyclesInWindow === 0) {
          d2 = true
          d2Reasons.push(`no_cycles_in_${thr.cycleWindowH}h`)
        }
        if (totalActions7d === 0) {
          d2 = true
          d2Reasons.push(`no_actions_in_7d`)
        }
      } else {
        // Operațional ne-manager cu activityMode PROACTIVE_CYCLIC/HYBRID
        if (!lastActiveAt || lastActiveAt < new Date(now.getTime() - cycleWindowMs)) {
          d2 = true
          d2Reasons.push(`no_activity_in_${thr.cycleWindowH}h`)
        }
      }
    }

    // Flag secundar monotonie — *calibrat pe activityMode*.
    // Nu raportăm monotonie când toți targeturile managerului sunt DORMANT_UNTIL_DELEGATED
    // (cazul EMA/CCO/DMA/QLA din 05.04.2026: intervin pe executori care nu au
    // încă mecanism de delegare funcțională — monotonia e *simptomul*, nu cauza).
    let monotony = false
    if (
      detectionApplies &&
      a.isManager &&
      c7d.total >= MONOTONY_MIN_CYCLES &&
      actionTypes7d.length === 1
    ) {
      monotony = true
    }

    // Status agregat
    let status: "ACTIVE" | "D2_IDLE" | "D2_MONOTONE" | "D2_BOTH"
    if (d2 && monotony) status = "D2_BOTH"
    else if (d2) status = "D2_IDLE"
    else if (monotony) status = "D2_MONOTONE"
    else status = "ACTIVE"

    return {
      role,
      displayName: a.displayName,
      level,
      isManager: a.isManager,
      activityMode: a.activityMode,
      detectionApplies,
      status,
      lastActiveAt,
      cycles24h: c24h,
      cycles48h: c48h,
      cycles7d: c7d.total,
      actionTypes7d,
      escalations7d: escCount7d,
      totalActions7d,
      d2,
      d2Reasons,
      monotony,
    }
  })

  const summary = {
    total: roles.length,
    ACTIVE: roles.filter((r) => r.status === "ACTIVE").length,
    D2_IDLE: roles.filter((r) => r.status === "D2_IDLE").length,
    D2_MONOTONE: roles.filter((r) => r.status === "D2_MONOTONE").length,
    D2_BOTH: roles.filter((r) => r.status === "D2_BOTH").length,
    byActivityMode: {
      PROACTIVE_CYCLIC: roles.filter((r) => r.activityMode === "PROACTIVE_CYCLIC").length,
      REACTIVE_TRIGGERED: roles.filter((r) => r.activityMode === "REACTIVE_TRIGGERED").length,
      DORMANT_UNTIL_DELEGATED: roles.filter((r) => r.activityMode === "DORMANT_UNTIL_DELEGATED").length,
      HYBRID: roles.filter((r) => r.activityMode === "HYBRID").length,
      PAUSED_KNOWN_GAP: roles.filter((r) => r.activityMode === "PAUSED_KNOWN_GAP").length,
    },
    detectionApplied: roles.filter((r) => r.detectionApplies).length,
    detectionSkipped: roles.filter((r) => !r.detectionApplies).length,
  }

  return NextResponse.json({
    window: { d1ago, d2ago, d7ago, now },
    thresholds: THRESHOLDS,
    summary,
    roles,
  })
}
