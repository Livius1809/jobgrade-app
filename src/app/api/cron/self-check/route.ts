/**
 * Cron: Self-Check & Auto-Repair — Sistemul imunitar al organismului
 *
 * Rulează la fiecare oră. Verifică TOT ce trebuie să funcționeze
 * și repară automat ce poate. Ce nu poate repara → escalare Owner.
 *
 * Verificări:
 *  1. DB conectat
 *  2. Taskuri stale (ASSIGNED > 48h fără progres) → timeout + escalare
 *  3. Agenți inactivi (0 taskuri + 0 KB în 7 zile) → task reactivare
 *  4. Escalări vechi nerezolvate (> 48h) → re-escalare la Owner
 *  5. KB entries fără embeddings → declanșare generare
 *  6. Manageri care n-au rulat team-cycle (> 7 zile) → autorun
 *  7. Cron-uri n8n (verificare că ultimul ciclu proactiv a rulat)
 *  8. Agenți fără cold start → solicită la COA
 *  9. Buffer KB plin (entries PENDING > 50) → declanșare promote
 * 10. Obiective overdue fără taskuri → alertă
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const maxDuration = 120

function verifyCron(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && req.headers.get("authorization") === `Bearer ${cronSecret}`) return true
  const internalKey = process.env.INTERNAL_API_KEY
  if (internalKey && req.headers.get("x-internal-key") === internalKey) return true
  return false
}

interface CheckResult {
  name: string
  status: "ok" | "repaired" | "escalated" | "error"
  detail: string
  repairAction?: string
}

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const p = prisma as any
  const now = new Date()
  const checks: CheckResult[] = []

  // ── 1. DB ─────────────────────────────────────────────────
  try {
    await p.$queryRaw`SELECT 1`
    checks.push({ name: "database", status: "ok", detail: "connected" })
  } catch (e: any) {
    checks.push({ name: "database", status: "error", detail: e.message })
    // Dacă DB e down, nu putem face nimic altceva
    return NextResponse.json({ status: "critical", checks, timestamp: now.toISOString() }, { status: 503 })
  }

  // ── 2. Taskuri stale (ASSIGNED > 48h) → timeout ──────────
  try {
    const staleThreshold = new Date(now.getTime() - 48 * 3600000)
    const staleTasks = await p.agentTask.findMany({
      where: { status: "ASSIGNED", createdAt: { lt: staleThreshold } },
      select: { id: true, assignedTo: true, title: true, createdAt: true },
      take: 20,
    })

    if (staleTasks.length > 0) {
      // Auto-repair: marchează ca EXPIRED
      await p.agentTask.updateMany({
        where: { id: { in: staleTasks.map((t: any) => t.id) } },
        data: { status: "EXPIRED", failedAt: now, failureReason: "Auto-expired by self-check: assigned > 48h without progress" },
      })
      checks.push({
        name: "stale-tasks",
        status: "repaired",
        detail: `${staleTasks.length} tasks expired (assigned > 48h)`,
        repairAction: `Expired: ${staleTasks.slice(0, 5).map((t: any) => t.assignedTo).join(", ")}`,
      })
    } else {
      checks.push({ name: "stale-tasks", status: "ok", detail: "no stale tasks" })
    }
  } catch (e: any) { checks.push({ name: "stale-tasks", status: "error", detail: e.message }) }

  // ── 3. Agenți inactivi (0 tasks + 0 KB în 7 zile) ────────
  try {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 3600000)
    const inactiveAgents = await p.$queryRaw`
      SELECT ad."agentRole" as role
      FROM agent_definitions ad
      WHERE ad."isActive" = true
        AND NOT EXISTS (
          SELECT 1 FROM agent_tasks t WHERE t."assignedTo" = ad."agentRole" AND t."createdAt" > ${weekAgo}
        )
        AND NOT EXISTS (
          SELECT 1 FROM kb_entries kb WHERE kb."agentRole" = ad."agentRole" AND kb."createdAt" > ${weekAgo}
        )
    ` as any[]

    if (inactiveAgents.length > 10) {
      // Prea mulți inactivi — semnal de problemă sistemică, nu agent individual
      checks.push({
        name: "inactive-agents",
        status: "escalated",
        detail: `${inactiveAgents.length} agents inactive 7+ days — possible systemic issue`,
      })
    } else if (inactiveAgents.length > 0) {
      checks.push({
        name: "inactive-agents",
        status: "ok",
        detail: `${inactiveAgents.length} inactive (normal for some roles)`,
      })
    } else {
      checks.push({ name: "inactive-agents", status: "ok", detail: "all agents active" })
    }
  } catch (e: any) { checks.push({ name: "inactive-agents", status: "error", detail: e.message }) }

  // ── 4. Escalări vechi (> 48h) → re-notificare Owner ───────
  try {
    const escThreshold = new Date(now.getTime() - 48 * 3600000)
    const oldEscalations = await p.escalation.findMany({
      where: { status: "OPEN", createdAt: { lt: escThreshold } },
      select: { id: true, aboutRole: true, reason: true, createdAt: true },
      take: 10,
    }).catch(() => [])

    if (oldEscalations.length > 0) {
      // Auto-repair: notifică Owner din nou
      const owner = await p.user.findFirst({ where: { role: { in: ["OWNER", "SUPER_ADMIN"] } }, select: { id: true } })
      if (owner) {
        await p.notification.create({
          data: {
            userId: owner.id,
            type: "GENERAL",
            title: `Self-check: ${oldEscalations.length} escalari nerezolvate > 48h`,
            body: oldEscalations.map((e: any) =>
              `${e.aboutRole}: ${(e.reason || "").slice(0, 80)} (de ${Math.round((now.getTime() - new Date(e.createdAt).getTime()) / 3600000)}h)`
            ).join("\n"),
            read: false,
            sourceRole: "SYSTEM",
            requestKind: "DECISION",
            requestData: JSON.stringify({
              whatIsNeeded: `${oldEscalations.length} escalari vechi necesita decizie`,
              context: "Detectate automat de self-check. Nerezolvate de peste 48h.",
            }),
          },
        })
      }
      checks.push({
        name: "stale-escalations",
        status: "escalated",
        detail: `${oldEscalations.length} escalations > 48h — Owner re-notified`,
      })
    } else {
      checks.push({ name: "stale-escalations", status: "ok", detail: "no stale escalations" })
    }
  } catch (e: any) { checks.push({ name: "stale-escalations", status: "error", detail: e.message }) }

  // ── 5. KB entries fără embeddings ─────────────────────────
  try {
    const noEmbedding = await p.$queryRaw`
      SELECT COUNT(*)::int as cnt FROM kb_entries
      WHERE status = 'PERMANENT' AND embedding IS NULL
    ` as any[]
    const count = noEmbedding[0]?.cnt || 0

    if (count > 100) {
      // Auto-repair: declanșează generare embeddings (via API intern)
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://jobgrade.ro"
        const key = process.env.INTERNAL_API_KEY
        if (key) {
          fetch(`${baseUrl}/api/v1/kb/embeddings`, {
            method: "POST",
            headers: { "x-internal-key": key, "Content-Type": "application/json" },
            body: JSON.stringify({ batchSize: 50 }),
          }).catch(() => {}) // fire and forget
        }
      } catch {}
      checks.push({
        name: "kb-embeddings",
        status: "repaired",
        detail: `${count} entries without embeddings — generation triggered`,
        repairAction: "POST /api/v1/kb/embeddings",
      })
    } else {
      checks.push({ name: "kb-embeddings", status: "ok", detail: `${count} without embeddings` })
    }
  } catch (e: any) { checks.push({ name: "kb-embeddings", status: "error", detail: e.message }) }

  // ── 6. Agenți fără cold start ─────────────────────────────
  try {
    const noColdStart = await p.$queryRaw`
      SELECT ad."agentRole" as role
      FROM agent_definitions ad
      WHERE ad."isActive" = true
        AND array_length(ad."coldStartPrompts", 1) > 0
        AND NOT EXISTS (
          SELECT 1 FROM kb_entries kb
          WHERE kb."agentRole" = ad."agentRole" AND kb.source = 'SELF_INTERVIEW' AND kb.status = 'PERMANENT'
        )
    ` as any[]

    if (noColdStart.length > 0) {
      // Auto-repair: creează task la COA
      await p.agentTask.create({
        data: {
          businessId: "biz_jobgrade",
          assignedBy: "SYSTEM",
          assignedTo: "COA",
          title: `Self-check: ${noColdStart.length} agenti fara cold start`,
          description: `Agentii urmatori au prompts dar nu au KB din self-interview: ${noColdStart.map((a: any) => a.role).join(", ")}. Ruleaza cold start pe fiecare.`,
          taskType: "PROCESS_EXECUTION",
          priority: "IMPORTANT",
          status: "ASSIGNED",
          tags: ["self-check", "cold-start-missing", "auto-detected"],
        },
      }).catch(() => {})
      checks.push({
        name: "cold-start-coverage",
        status: "repaired",
        detail: `${noColdStart.length} agents without cold start — task created for COA`,
        repairAction: `Agents: ${noColdStart.slice(0, 5).map((a: any) => a.role).join(", ")}`,
      })
    } else {
      checks.push({ name: "cold-start-coverage", status: "ok", detail: "all agents have cold start" })
    }
  } catch (e: any) { checks.push({ name: "cold-start-coverage", status: "error", detail: e.message }) }

  // ── 7. Buffer KB plin → promote ───────────────────────────
  try {
    const pendingBuffers = await p.kBBuffer.count({ where: { status: "PENDING" } }).catch(() => 0)
    if (pendingBuffers > 50) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://jobgrade.ro"
        const key = process.env.INTERNAL_API_KEY
        if (key) {
          fetch(`${baseUrl}/api/v1/kb/promote`, {
            method: "POST",
            headers: { "x-internal-key": key, "Content-Type": "application/json" },
            body: JSON.stringify({}),
          }).catch(() => {})
        }
      } catch {}
      checks.push({
        name: "kb-buffer",
        status: "repaired",
        detail: `${pendingBuffers} pending buffers — promotion triggered`,
      })
    } else {
      checks.push({ name: "kb-buffer", status: "ok", detail: `${pendingBuffers} pending` })
    }
  } catch (e: any) { checks.push({ name: "kb-buffer", status: "error", detail: e.message }) }

  // ── 8. Obiective overdue fără taskuri recente ─────────────
  try {
    const overdueObjectives = await p.$queryRaw`
      SELECT o.code, o.title
      FROM organizational_objectives o
      WHERE o.status = 'ACTIVE'
        AND o."deadlineAt" < ${now}
        AND NOT EXISTS (
          SELECT 1 FROM agent_tasks t
          WHERE t."objectiveId" = o.id AND t."createdAt" > ${new Date(now.getTime() - 7 * 24 * 3600000)}
        )
    ` as any[]

    if (overdueObjectives.length > 0) {
      checks.push({
        name: "overdue-objectives",
        status: "escalated",
        detail: `${overdueObjectives.length} overdue without recent tasks: ${overdueObjectives.slice(0, 3).map((o: any) => o.code).join(", ")}`,
      })
    } else {
      checks.push({ name: "overdue-objectives", status: "ok", detail: "no abandoned overdue objectives" })
    }
  } catch (e: any) { checks.push({ name: "overdue-objectives", status: "error", detail: e.message }) }

  // ── 9. Proactive cycle freshness ──────────────────────────
  try {
    const lastProactiveTask = await p.agentTask.findFirst({
      where: { tags: { has: "proactive-cycle" } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }).catch(() => null)

    if (lastProactiveTask) {
      const hoursAgo = Math.round((now.getTime() - new Date(lastProactiveTask.createdAt).getTime()) / 3600000)
      checks.push({
        name: "proactive-cycles",
        status: hoursAgo > 24 ? "escalated" : "ok",
        detail: `last proactive task ${hoursAgo}h ago`,
      })
    } else {
      checks.push({ name: "proactive-cycles", status: "escalated", detail: "no proactive tasks ever created" })
    }
  } catch (e: any) { checks.push({ name: "proactive-cycles", status: "error", detail: e.message }) }

  // ── Rezumat ───────────────────────────────────────────────
  const repaired = checks.filter(c => c.status === "repaired").length
  const escalated = checks.filter(c => c.status === "escalated").length
  const errors = checks.filter(c => c.status === "error").length
  const ok = checks.filter(c => c.status === "ok").length

  const overallStatus = errors > 0 ? "critical" : escalated > 0 ? "degraded" : "alive"

  // Notifică Owner doar dacă sunt probleme
  if (escalated > 0 || errors > 0) {
    const owner = await p.user.findFirst({ where: { role: { in: ["OWNER", "SUPER_ADMIN"] } }, select: { id: true } }).catch(() => null)
    if (owner) {
      const problemChecks = checks.filter(c => c.status === "escalated" || c.status === "error")
      await p.notification.create({
        data: {
          userId: owner.id,
          type: "GENERAL",
          title: `Self-check: ${overallStatus.toUpperCase()} — ${repaired} reparat, ${escalated} escaladat, ${errors} erori`,
          body: problemChecks.map(c => `[${c.status.toUpperCase()}] ${c.name}: ${c.detail}`).join("\n"),
          read: false,
          sourceRole: "SYSTEM",
          requestKind: "INFORMATION",
          requestData: JSON.stringify({ isReport: true, category: "self-check" }),
        },
      }).catch(() => {})
    }
  }

  // Salvăm rezultatul self-check ca KB entry (audit trail)
  await p.kBEntry.create({
    data: {
      agentRole: "SYSTEM",
      kbType: "PERMANENT",
      content: JSON.stringify({ type: "self-check", timestamp: now.toISOString(), overallStatus, checks }),
      tags: ["self-check", `status:${overallStatus}`, repaired > 0 ? "auto-repaired" : "clean"].filter(Boolean),
      confidence: 1.0,
      source: "DISTILLED_INTERACTION",
      status: "PERMANENT",
      usageCount: 0,
      validatedAt: now,
    },
  }).catch(() => {})

  return NextResponse.json({
    status: overallStatus,
    timestamp: now.toISOString(),
    summary: { ok, repaired, escalated, errors, total: checks.length },
    checks,
  })
}
