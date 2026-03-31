/**
 * owner-notify.ts — Notificări push către Owner
 *
 * Folosește ntfy (http://localhost:8090) pentru notificări push.
 * Owner se abonează la topic-ul "jobgrade-owner" în app-ul ntfy.
 *
 * Triggers:
 * - OrgProposal ajunge la OWNER_PENDING sau COG_REVIEWED
 * - Escaladare ajunge la OWNER
 * - Brainstorm propuneri strategice generate
 * - Pattern Sentinel detectează ALERT
 */

const NTFY_URL = "https://ntfy.sh"
const NTFY_TOPIC = "jobgrade-owner-liviu-2026"

export type NotifyPriority = "urgent" | "high" | "default" | "low" | "min"

interface NotifyOptions {
  title: string
  message: string
  priority?: NotifyPriority
  tags?: string[]
  click?: string // URL to open on click
}

async function sendNotification(opts: NotifyOptions): Promise<boolean> {
  try {
    const res = await fetch(`${NTFY_URL}/${NTFY_TOPIC}`, {
      method: "POST",
      headers: {
        Title: opts.title,
        Priority: opts.priority || "default",
        Tags: (opts.tags || []).join(","),
        ...(opts.click ? { Click: opts.click } : {}),
      },
      body: opts.message,
    })
    return res.ok
  } catch (e: any) {
    console.warn(`[NTFY] Failed: ${e.message}`)
    return false
  }
}

// ── Specific notification types ──────────────────────────────────────────────

export async function notifyProposalForOwner(
  proposalTitle: string,
  proposedBy: string,
  proposalId: string
): Promise<boolean> {
  return sendNotification({
    title: "📋 Propunere nouă pentru aprobare",
    message: `${proposedBy} propune: "${proposalTitle}".\nDeschide dashboard-ul pentru a aproba/respinge.`,
    priority: "high",
    tags: ["clipboard", "proposal"],
    click: `http://localhost:3001/dashboard`,
  })
}

export async function notifyEscalationToOwner(
  aboutRole: string,
  reason: string,
  sourceRole: string
): Promise<boolean> {
  return sendNotification({
    title: "🔴 Escaladare la Owner",
    message: `${sourceRole} escaladează despre ${aboutRole}: ${reason.substring(0, 200)}`,
    priority: "urgent",
    tags: ["warning", "escalation"],
    click: `http://localhost:3001/dashboard`,
  })
}

export async function notifyStrategicProposals(
  sessionTopic: string,
  proposalCount: number,
  titles: string[]
): Promise<boolean> {
  return sendNotification({
    title: `💡 ${proposalCount} propuneri strategice din brainstorming`,
    message: `Topic: "${sessionTopic}"\n${titles.map((t, i) => `${i + 1}. ${t}`).join("\n")}`,
    priority: "high",
    tags: ["bulb", "brainstorm"],
    click: `http://localhost:3001/dashboard`,
  })
}

export async function notifySentinelAlert(
  agentRole: string,
  signalCount: number,
  topSignal: string
): Promise<boolean> {
  return sendNotification({
    title: `⚠️ Pattern Sentinel: ${signalCount} semnale de la ${agentRole}`,
    message: topSignal.substring(0, 300),
    priority: signalCount >= 3 ? "urgent" : "high",
    tags: ["eye", "sentinel"],
  })
}
