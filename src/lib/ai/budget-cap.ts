/**
 * Dynamic Budget Caps for Anthropic API Costs (VUL-029, BUILD-008)
 *
 * Hard cap per client with thresholds proportional to total value.
 * In-memory tracking with daily/monthly reset (same pattern as rate-limiter fallback).
 * Alerts at 70% and 90%. Initial generous thresholds, calibrated after 30 days.
 */

// ── Types ──────────────────────────────────────────────────────────────────

export enum BudgetTier {
  FREE = "FREE",
  STARTER = "STARTER",
  PROFESSIONAL = "PROFESSIONAL",
  ENTERPRISE = "ENTERPRISE",
  B2C_FREE = "B2C_FREE",
  B2C_PAID = "B2C_PAID",
}

export type AlertLevel = "NONE" | "WARNING_70" | "WARNING_90" | "BLOCKED"

export interface BudgetCheckResult {
  allowed: boolean
  currentDaily: number
  dailyLimit: number
  currentMonthly: number
  monthlyLimit: number
  percentUsed: number
  alert: AlertLevel
}

interface BudgetLimits {
  dailyLimit: number   // USD
  monthlyLimit: number // USD
}

interface UsageEntry {
  dailyCost: number
  monthlyCost: number
  lastDailyReset: Date
  lastMonthlyReset: Date
  tier: BudgetTier
}

interface UpgradeTracker {
  /** Number of days where usage exceeded 80% of daily limit */
  daysOver80: number
  /** Date strings (YYYY-MM-DD) already counted */
  countedDates: Set<string>
}

export interface BudgetStatusReport {
  totalPlatformCostToday: number
  totalPlatformCostMonth: number
  usersAbove50Percent: Array<{
    identifier: string
    tier: BudgetTier
    dailyCost: number
    dailyLimit: number
    monthlyCost: number
    monthlyLimit: number
    percentDaily: number
    percentMonthly: number
  }>
  topConsumersToday: Array<{
    identifier: string
    dailyCost: number
  }>
}

// ── Tier Limits ────────────────────────────────────────────────────────────

const TIER_LIMITS: Record<BudgetTier, BudgetLimits> = {
  [BudgetTier.FREE]:         { dailyLimit: 0.50,  monthlyLimit: 5 },
  [BudgetTier.STARTER]:      { dailyLimit: 2,     monthlyLimit: 30 },
  [BudgetTier.PROFESSIONAL]: { dailyLimit: 5,     monthlyLimit: 80 },
  [BudgetTier.ENTERPRISE]:   { dailyLimit: 15,    monthlyLimit: 200 },
  [BudgetTier.B2C_FREE]:     { dailyLimit: 0.30,  monthlyLimit: 3 },
  [BudgetTier.B2C_PAID]:     { dailyLimit: 1,     monthlyLimit: 15 },
}

// ── Plan → Tier mapping ───────────────────────────────────────────────────

/**
 * Maps a Prisma Plan enum value to a BudgetTier.
 * Accepts lowercase or uppercase plan names.
 */
export function planToTier(plan: string): BudgetTier {
  switch (plan.toUpperCase()) {
    case "STARTER":      return BudgetTier.STARTER
    case "PROFESSIONAL": return BudgetTier.PROFESSIONAL
    case "ENTERPRISE":   return BudgetTier.ENTERPRISE
    default:             return BudgetTier.FREE
  }
}

// ── In-memory stores ──────────────────────────────────────────────────────

const usageStore = new Map<string, UsageEntry>()
const upgradeTrackers = new Map<string, UpgradeTracker>()

// Cleanup stale entries every 10 minutes
setInterval(() => {
  const now = new Date()
  for (const [key, entry] of usageStore) {
    // Remove entries with no activity for 48+ hours
    const hoursSinceDaily = (now.getTime() - entry.lastDailyReset.getTime()) / (1000 * 60 * 60)
    if (hoursSinceDaily > 48 && entry.dailyCost === 0) {
      usageStore.delete(key)
      upgradeTrackers.delete(key)
    }
  }
}, 10 * 60_000)

// ── Helpers ───────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function isSameDay(d: Date): boolean {
  return d.toISOString().slice(0, 10) === today()
}

function isSameMonth(d: Date): boolean {
  return d.toISOString().slice(0, 7) === currentMonth()
}

function getOrCreateEntry(identifier: string, tier: BudgetTier): UsageEntry {
  let entry = usageStore.get(identifier)
  const now = new Date()

  if (!entry) {
    entry = {
      dailyCost: 0,
      monthlyCost: 0,
      lastDailyReset: now,
      lastMonthlyReset: now,
      tier,
    }
    usageStore.set(identifier, entry)
    return entry
  }

  // Daily reset
  if (!isSameDay(entry.lastDailyReset)) {
    // Before resetting, track if previous day was over 80%
    trackDailyUsageForUpgrade(identifier, entry)
    entry.dailyCost = 0
    entry.lastDailyReset = now
  }

  // Monthly reset
  if (!isSameMonth(entry.lastMonthlyReset)) {
    entry.monthlyCost = 0
    entry.lastMonthlyReset = now
  }

  // Update tier if changed
  entry.tier = tier

  return entry
}

function trackDailyUsageForUpgrade(identifier: string, entry: UsageEntry): void {
  const limits = TIER_LIMITS[entry.tier]
  const percent = (entry.dailyCost / limits.dailyLimit) * 100

  if (percent >= 80) {
    const dateStr = entry.lastDailyReset.toISOString().slice(0, 10)
    let tracker = upgradeTrackers.get(identifier)

    if (!tracker) {
      tracker = { daysOver80: 0, countedDates: new Set() }
      upgradeTrackers.set(identifier, tracker)
    }

    if (!tracker.countedDates.has(dateStr)) {
      tracker.countedDates.add(dateStr)
      tracker.daysOver80++

      // Keep only last 30 dates to bound memory
      if (tracker.countedDates.size > 30) {
        const sorted = Array.from(tracker.countedDates).sort()
        tracker.countedDates.delete(sorted[0])
      }
    }
  }
}

function resolveAlertLevel(percentUsed: number): AlertLevel {
  if (percentUsed >= 100) return "BLOCKED"
  if (percentUsed >= 90) return "WARNING_90"
  if (percentUsed >= 70) return "WARNING_70"
  return "NONE"
}

function resolveTierForCheck(
  identifier: string,
  tierType: "B2B" | "B2C"
): BudgetTier {
  // If we already track this user, use their stored tier
  const existing = usageStore.get(identifier)
  if (existing) return existing.tier

  // Default tier by type
  return tierType === "B2B" ? BudgetTier.FREE : BudgetTier.B2C_FREE
}

// ── 1. Record API Usage ───────────────────────────────────────────────────

/**
 * Record estimated API cost after a Claude call completes.
 * Call this after each successful Anthropic API invocation.
 *
 * @param identifier - Tenant ID (B2B) or B2CUser ID
 * @param tierType - 'B2B' or 'B2C'
 * @param estimatedCost - Estimated USD cost of the API call
 * @param tier - Optional explicit tier; if omitted, uses stored or default
 */
export function recordAPIUsage(
  identifier: string,
  tierType: "B2B" | "B2C",
  estimatedCost: number,
  tier?: BudgetTier
): void {
  const resolvedTier = tier ?? resolveTierForCheck(identifier, tierType)
  const entry = getOrCreateEntry(identifier, resolvedTier)

  entry.dailyCost += estimatedCost
  entry.monthlyCost += estimatedCost

  // Check thresholds and log
  const limits = TIER_LIMITS[entry.tier]
  const dailyPercent = (entry.dailyCost / limits.dailyLimit) * 100
  const monthlyPercent = (entry.monthlyCost / limits.monthlyLimit) * 100
  const maxPercent = Math.max(dailyPercent, monthlyPercent)

  if (maxPercent >= 100) {
    console.error(
      `[BudgetCap] BLOCKED — ${identifier} (${entry.tier}) exceeded budget: ` +
      `daily=$${entry.dailyCost.toFixed(4)}/$${limits.dailyLimit}, ` +
      `monthly=$${entry.monthlyCost.toFixed(4)}/$${limits.monthlyLimit}`
    )
  } else if (maxPercent >= 90) {
    console.warn(
      `[BudgetCap] WARNING_90 — ${identifier} (${entry.tier}) at ${maxPercent.toFixed(1)}% budget: ` +
      `daily=$${entry.dailyCost.toFixed(4)}/$${limits.dailyLimit}, ` +
      `monthly=$${entry.monthlyCost.toFixed(4)}/$${limits.monthlyLimit}`
    )
  } else if (maxPercent >= 70) {
    console.warn(
      `[BudgetCap] WARNING_70 — ${identifier} (${entry.tier}) at ${maxPercent.toFixed(1)}% budget: ` +
      `daily=$${entry.dailyCost.toFixed(4)}/$${limits.dailyLimit}`
    )
  }
}

// ── 2. Check Budget Before API Call ───────────────────────────────────────

/**
 * Check if a user/tenant is allowed to make an API call.
 * Call this BEFORE each Anthropic API invocation.
 *
 * @param identifier - Tenant ID (B2B) or B2CUser ID
 * @param tierType - 'B2B' or 'B2C'
 * @param estimatedCost - Estimated USD cost of the upcoming call
 * @param tier - Optional explicit tier
 */
export function checkBudget(
  identifier: string,
  tierType: "B2B" | "B2C",
  estimatedCost: number,
  tier?: BudgetTier
): BudgetCheckResult {
  const resolvedTier = tier ?? resolveTierForCheck(identifier, tierType)
  const entry = getOrCreateEntry(identifier, resolvedTier)
  const limits = TIER_LIMITS[resolvedTier]

  const projectedDaily = entry.dailyCost + estimatedCost
  const projectedMonthly = entry.monthlyCost + estimatedCost

  const dailyPercent = (projectedDaily / limits.dailyLimit) * 100
  const monthlyPercent = (projectedMonthly / limits.monthlyLimit) * 100
  const maxPercent = Math.max(dailyPercent, monthlyPercent)

  const alert = resolveAlertLevel(maxPercent)
  const allowed = alert !== "BLOCKED"

  return {
    allowed,
    currentDaily: entry.dailyCost,
    dailyLimit: limits.dailyLimit,
    currentMonthly: entry.monthlyCost,
    monthlyLimit: limits.monthlyLimit,
    percentUsed: Math.round(maxPercent * 100) / 100,
    alert,
  }
}

// ── 3. Set Tier for Identifier ────────────────────────────────────────────

/**
 * Explicitly set the budget tier for an identifier.
 * Use when loading tenant plan from DB or when plan changes.
 */
export function setBudgetTier(identifier: string, tier: BudgetTier): void {
  const entry = getOrCreateEntry(identifier, tier)
  entry.tier = tier
}

// ── 4. Budget Exceeded Response ───────────────────────────────────────────

const EXCEEDED_MESSAGES: Record<"ro" | "en", string> = {
  ro: "Ai atins limita de utilizare pentru ast\u0103zi. Serviciul se va reseta m\u00e2ine. Dac\u0103 ai nevoie de mai mult, contacteaz\u0103-ne pentru upgrade.",
  en: "You have reached the usage limit for today. The service will reset tomorrow. If you need more, contact us for an upgrade.",
}

/**
 * Returns a user-facing message when budget is exceeded.
 */
export function getBudgetExceededResponse(language: "ro" | "en" = "ro"): string {
  return EXCEEDED_MESSAGES[language]
}

// ── 5. Budget Status Report (Owner Dashboard) ─────────────────────────────

/**
 * Returns a status report for monitoring.
 * If identifier is provided, returns only that user's data.
 * Otherwise, returns platform-wide summary: users above 50%, top consumers.
 */
export function getBudgetStatus(identifier?: string): BudgetStatusReport {
  let totalToday = 0
  let totalMonth = 0

  const usersAbove50: BudgetStatusReport["usersAbove50Percent"] = []
  const allToday: Array<{ identifier: string; dailyCost: number }> = []

  for (const [id, entry] of usageStore) {
    // Skip if filtering by identifier
    if (identifier && id !== identifier) continue

    // Ensure entry is current (daily/monthly resets)
    const refreshed = getOrCreateEntry(id, entry.tier)
    const limits = TIER_LIMITS[refreshed.tier]

    totalToday += refreshed.dailyCost
    totalMonth += refreshed.monthlyCost

    const percentDaily = limits.dailyLimit > 0
      ? (refreshed.dailyCost / limits.dailyLimit) * 100
      : 0
    const percentMonthly = limits.monthlyLimit > 0
      ? (refreshed.monthlyCost / limits.monthlyLimit) * 100
      : 0

    if (percentDaily >= 50 || percentMonthly >= 50) {
      usersAbove50.push({
        identifier: id,
        tier: refreshed.tier,
        dailyCost: refreshed.dailyCost,
        dailyLimit: limits.dailyLimit,
        monthlyCost: refreshed.monthlyCost,
        monthlyLimit: limits.monthlyLimit,
        percentDaily: Math.round(percentDaily * 100) / 100,
        percentMonthly: Math.round(percentMonthly * 100) / 100,
      })
    }

    allToday.push({ identifier: id, dailyCost: refreshed.dailyCost })
  }

  // Sort top consumers descending by daily cost, take top 10
  const topConsumersToday = allToday
    .sort((a, b) => b.dailyCost - a.dailyCost)
    .slice(0, 10)

  return {
    totalPlatformCostToday: Math.round(totalToday * 10000) / 10000,
    totalPlatformCostMonth: Math.round(totalMonth * 10000) / 10000,
    usersAbove50Percent: usersAbove50,
    topConsumersToday,
  }
}

// ── 6. Auto-Upgrade Detection ─────────────────────────────────────────────

const UPGRADE_PATH: Partial<Record<BudgetTier, BudgetTier>> = {
  [BudgetTier.FREE]: BudgetTier.STARTER,
  [BudgetTier.STARTER]: BudgetTier.PROFESSIONAL,
  [BudgetTier.PROFESSIONAL]: BudgetTier.ENTERPRISE,
  [BudgetTier.B2C_FREE]: BudgetTier.B2C_PAID,
}

/**
 * Check if a user should be suggested a tier upgrade.
 * Returns the suggested tier if user has exceeded 80% on 5+ distinct days,
 * or null if no upgrade is suggested.
 */
export function suggestTierUpgrade(
  identifier: string,
  currentTier: BudgetTier
): BudgetTier | null {
  const tracker = upgradeTrackers.get(identifier)
  if (!tracker) return null

  if (tracker.daysOver80 >= 5) {
    const nextTier = UPGRADE_PATH[currentTier]
    if (nextTier) {
      console.log(
        `[BudgetCap] Upgrade suggestion for ${identifier}: ` +
        `${currentTier} → ${nextTier} (${tracker.daysOver80} days over 80%)`
      )
      return nextTier
    }
  }

  return null
}

// ── 7. Reset (for testing) ────────────────────────────────────────────────

/**
 * Reset all internal state. For testing only.
 */
export function _resetForTesting(): void {
  usageStore.clear()
  upgradeTrackers.clear()
}
