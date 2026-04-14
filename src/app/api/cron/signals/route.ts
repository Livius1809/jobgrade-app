/**
 * Vercel Cron endpoint — scan unprocessed external signals with intelligent filtering.
 *
 * Runs every 15 minutes. Filters signals by priority tier before creating tasks.
 * Only categories in the ACTIVE tier generate Claude API tasks (cost-bearing).
 * Lower-tier signals are marked as processed and stored for periodic batch review.
 *
 * Filter levels (configurable via SIGNAL_FILTER_LEVEL env var):
 *   "critical"  — only LEGAL_REG (legal compliance, can't miss)
 *   "focused"   — LEGAL_REG + COMPETITIVE (default — launch mode)
 *   "broad"     — adds MARKET, TECHNOLOGY, TALENT
 *   "full"      — all categories processed (high cost, post-revenue)
 *
 * Auth: CRON_SECRET (auto-injected by Vercel for cron invocations).
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const maxDuration = 60

// Category → executor role mapping
const CATEGORY_ROLE_MAP: Record<string, string> = {
  LEGAL_REG: "CIA",
  COMPETITIVE: "MKA",
  TECHNOLOGY: "COG",
  MARKET: "DMA",
  SOCIAL: "COCSA",
  TALENT: "HR_COUNSELOR",
  ECONOMIC: "COAFin",
}

// Filter tiers — which categories generate tasks at each level
const FILTER_TIERS: Record<string, Set<string>> = {
  critical: new Set(["LEGAL_REG"]),
  focused: new Set(["LEGAL_REG", "COMPETITIVE"]),
  broad: new Set(["LEGAL_REG", "COMPETITIVE", "MARKET", "TECHNOLOGY", "TALENT"]),
  full: new Set(Object.keys(CATEGORY_ROLE_MAP)),
}

// Keyword filter per category — signals must contain at least one keyword to generate a task
// Prevents irrelevant signals from consuming API credit (e.g. "film reviews" in LEGAL_REG)
const CATEGORY_KEYWORDS: Record<string, RegExp> = {
  LEGAL_REG: /munc[aăi]|salar|transparen[tț]|discrimin|egal|remunera|angajat|angajator|HR|resurse umane|directiv[aă]|grading|evaluar|post|funct|competen[tț]|GDPR|AI Act|dreptul muncii|codul muncii|concedier|demiter|contract de munc|SSM|securitate.*munc/i,
}

async function getActiveCategories(): Promise<Set<string>> {
  let level = process.env.SIGNAL_FILTER_LEVEL || "focused"
  try {
    const dbConfig = await prisma.systemConfig.findUnique({ where: { key: "SIGNAL_FILTER_LEVEL" } })
    if (dbConfig) level = dbConfig.value
  } catch { /* DB unavailable — use env var */ }
  return FILTER_TIERS[level] || FILTER_TIERS.focused
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const activeCategories = await getActiveCategories()

  try {
    const signals = await prisma.externalSignal.findMany({
      where: { processedAt: null },
      take: 10,
      orderBy: { capturedAt: "asc" },
    })

    if (signals.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, stored: 0, message: "No pending signals" })
    }

    let created = 0
    let stored = 0

    for (const signal of signals) {
      // Mark ALL signals as processed (prevents re-scanning)
      await prisma.externalSignal.update({
        where: { id: signal.id },
        data: { processedAt: new Date() },
      })

      // Only create tasks for active-tier categories
      if (!activeCategories.has(signal.category)) {
        stored++
        continue
      }

      // Keyword relevance filter — drop signals that don't match domain keywords
      const keywordFilter = CATEGORY_KEYWORDS[signal.category]
      if (keywordFilter) {
        const textToCheck = `${signal.title || ""} ${signal.rawContent || ""}`
        if (!keywordFilter.test(textToCheck)) {
          stored++
          continue
        }
      }

      const role = CATEGORY_ROLE_MAP[signal.category] || "COG"

      const objective = await prisma.organizationalObjective.findFirst({
        where: {
          status: "ACTIVE",
          OR: [
            { ownerRoles: { has: role } },
            { contributorRoles: { has: role } },
          ],
        },
        select: { id: true },
      })

      await prisma.agentTask.create({
        data: {
          title: `REACT ${signal.category}: ${(signal.title || "Signal").slice(0, 100)}`,
          description: `Semnal extern detectat în categoria ${signal.category}.\n**Sursă:** ${signal.source || "unknown"}\n**Titlu:** ${signal.title || "?"}\n\nAnalizează impactul și propune acțiuni concrete pentru JobGrade.`,
          assignedTo: role,
          assignedBy: "COSO",
          status: "ASSIGNED",
          priority: signal.category === "LEGAL_REG" ? "CRITICAL" : "HIGH",
          taskType: "INVESTIGATION",
          businessId: "biz_jobgrade",
          objectiveId: objective?.id || null,
          tags: ["signal-reactive", `signal:${signal.id}`, `category:${signal.category}`, "auto-generated"],
          deadlineAt: new Date(Date.now() + 48 * 3600000),
        },
      })

      created++
    }

    return NextResponse.json({
      ok: true,
      level: process.env.SIGNAL_FILTER_LEVEL || "focused",
      activeCategories: [...activeCategories],
      processed: created,
      stored,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error("[cron/signals] Error:", error.message)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
