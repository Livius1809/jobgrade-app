/**
 * Critical Email Alerting (4.5)
 *
 * Sends email alerts via Resend for critical system events:
 * - Server down
 * - SafetyMonitor CRITICAL
 * - Budget exceeded
 * - Security breach
 *
 * Rate limited: max 1 email per alert type per hour (in-memory dedup).
 */

import { Resend } from "resend"

// ── Config ──────────────────────────────────────────────────────────────────

const FROM = process.env.ALERT_EMAIL_FROM ?? "JobGrade Alerts <alerts@jobgrade.ro>"
const TO = process.env.ALERT_EMAIL ?? "liviu@psihobusiness.ro"
const RATE_LIMIT_MS = 60 * 60 * 1000 // 1 hour

// ── Alert Types ─────────────────────────────────────────────────────────────

export type AlertType =
  | "SERVER_DOWN"
  | "SAFETY_MONITOR_CRITICAL"
  | "BUDGET_EXCEEDED"
  | "SECURITY_BREACH"
  | "CLAUDE_API_DOWN"
  | "DATABASE_DOWN"

// ── Rate Limiting (in-memory dedup) ─────────────────────────────────────────

const lastSentByType = new Map<string, number>()

function isRateLimited(alertType: AlertType): boolean {
  const lastSent = lastSentByType.get(alertType)
  if (!lastSent) return false
  return Date.now() - lastSent < RATE_LIMIT_MS
}

function recordSent(alertType: AlertType): void {
  lastSentByType.set(alertType, Date.now())
}

// ── Resend client (lazy init) ───────────────────────────────────────────────

let resend: Resend | null = null

function getResend(): Resend | null {
  if (resend) return resend
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn("[EmailAlert] RESEND_API_KEY not configured — alerts will only be logged")
    return null
  }
  resend = new Resend(apiKey)
  return resend
}

// ── Main Function ───────────────────────────────────────────────────────────

/**
 * Send a critical alert email to the Owner.
 *
 * @param subject - Email subject line
 * @param body - Plain text or HTML body describing the issue
 * @param alertType - Type of alert for rate limiting dedup
 * @returns true if sent, false if rate limited or failed
 */
export async function sendCriticalAlert(
  subject: string,
  body: string,
  alertType: AlertType = "SERVER_DOWN"
): Promise<boolean> {
  // Rate limit check
  if (isRateLimited(alertType)) {
    console.log(`[EmailAlert] Rate limited — skipping ${alertType} (max 1/hour)`)
    return false
  }

  const client = getResend()

  const html = `
<!DOCTYPE html>
<html lang="ro">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#FEF2F2;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #FCA5A5;">
    <div style="background:#DC2626;padding:20px 32px;">
      <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:700;">JobGrade Alert</h1>
      <p style="margin:4px 0 0;color:#FECACA;font-size:12px;">${alertType}</p>
    </div>
    <div style="padding:24px 32px;">
      <h2 style="margin:0 0 12px;font-size:16px;color:#111827;">${subject}</h2>
      <div style="color:#4B5563;font-size:14px;line-height:1.6;white-space:pre-wrap;">${body}</div>
      <p style="margin:20px 0 0;color:#9CA3AF;font-size:11px;">
        Timestamp: ${new Date().toISOString()}
      </p>
    </div>
    <div style="padding:12px 32px;background:#FEF2F2;border-top:1px solid #FCA5A5;">
      <p style="margin:0;color:#9CA3AF;font-size:10px;">
        Acest email a fost trimis automat de sistemul de monitorizare JobGrade.
        Max 1 email per tip de alerta pe ora.
      </p>
    </div>
  </div>
</body>
</html>`

  if (!client) {
    // Log to console as fallback
    console.error(`[EmailAlert] CRITICAL — ${alertType}: ${subject}\n${body}`)
    recordSent(alertType)
    return false
  }

  try {
    await client.emails.send({
      from: FROM,
      to: TO,
      subject: `[ALERT] ${subject}`,
      html,
    })

    recordSent(alertType)
    console.log(`[EmailAlert] Sent ${alertType} alert to ${TO}`)
    return true
  } catch (err) {
    console.error(
      `[EmailAlert] Failed to send ${alertType} alert:`,
      err instanceof Error ? err.message : err
    )
    // Still record to avoid spamming retries
    recordSent(alertType)
    return false
  }
}

// ── Convenience Functions ───────────────────────────────────────────────────

export async function alertServerDown(details: string): Promise<boolean> {
  return sendCriticalAlert("Server Down", details, "SERVER_DOWN")
}

export async function alertSafetyMonitorCritical(details: string): Promise<boolean> {
  return sendCriticalAlert("SafetyMonitor CRITICAL", details, "SAFETY_MONITOR_CRITICAL")
}

export async function alertBudgetExceeded(details: string): Promise<boolean> {
  return sendCriticalAlert("Budget Exceeded", details, "BUDGET_EXCEEDED")
}

export async function alertSecurityBreach(details: string): Promise<boolean> {
  return sendCriticalAlert("Security Breach Detected", details, "SECURITY_BREACH")
}

export async function alertClaudeAPIDown(details: string): Promise<boolean> {
  return sendCriticalAlert("Claude API Down", details, "CLAUDE_API_DOWN")
}

export async function alertDatabaseDown(details: string): Promise<boolean> {
  return sendCriticalAlert("Database Down", details, "DATABASE_DOWN")
}

// ── Testing ─────────────────────────────────────────────────────────────────

export function _resetRateLimitsForTesting(): void {
  lastSentByType.clear()
}
