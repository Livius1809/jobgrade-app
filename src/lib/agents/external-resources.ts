/**
 * external-resources.ts — Tracking resurse externe dependente de Owner
 *
 * Monitorizează: API keys, plăți furnizori, domenii, certificate, subscriptions.
 * Alertează Owner cu X zile înainte de expirare/plată.
 * Raport zilnic cu status resurse + upcoming deadlines.
 */

import type { PrismaClient } from "@/generated/prisma"

const NTFY_URL = "https://ntfy.sh"
const NTFY_TOPIC = "jobgrade-owner-liviu-2026"

export interface ResourceAlert {
  resourceName: string
  category: string
  alertType: "EXPIRING" | "PAYMENT_DUE" | "EXPIRED" | "MISSING"
  daysUntil: number
  details: string
  priority: "urgent" | "high" | "default"
}

export interface ResourceReport {
  date: string
  totalResources: number
  activeResources: number
  alerts: ResourceAlert[]
  upcomingPayments: Array<{ name: string; amount: number; dueDate: string; daysUntil: number }>
  monthlyCostTotal: number
  summary: string
}

// ── Seed initial resources ───────────────────────────────────────────────────

export async function seedInitialResources(prisma: PrismaClient): Promise<number> {
  const p = prisma as any
  const resources = [
    {
      name: "Anthropic API (Claude)",
      category: "API_SERVICE",
      provider: "Anthropic",
      monthlyCost: 50,
      billingCycle: "monthly",
      notes: "Pay-as-you-go. Cheia: sk-ant-api03-... Monitorizare consum pe console.anthropic.com",
    },
    {
      name: "Neon.tech PostgreSQL",
      category: "INFRASTRUCTURE",
      provider: "Neon.tech",
      monthlyCost: 0,
      billingCycle: "monthly",
      notes: "Free tier. DB: neondb. Upgrade necesar la 100+ clienți.",
    },
    {
      name: "Domeniu jobgrade.ro",
      category: "DOMAIN",
      provider: "Registrar RO",
      monthlyCost: 0,
      billingCycle: "annual",
      expiresAt: new Date("2027-03-01"),
      alertDaysBefore: 30,
      notes: "Reînnoire anuală. Verificare WHOIS.",
    },
    {
      name: "Resend (Email tranzacțional)",
      category: "API_SERVICE",
      provider: "Resend",
      monthlyCost: 0,
      billingCycle: "monthly",
      notes: "Free tier 100 emails/day. Upgrade la scale.",
    },
    {
      name: "Docker Desktop",
      category: "INFRASTRUCTURE",
      provider: "Docker Inc.",
      monthlyCost: 0,
      billingCycle: "monthly",
      notes: "Personal free. Business license necesară pentru echipă >5.",
    },
    {
      name: "Google OAuth Credentials",
      category: "API_SERVICE",
      provider: "Google Cloud",
      monthlyCost: 0,
      billingCycle: "none",
      notes: "Client ID: 11548... Verificare periodic pe console.cloud.google.com",
    },
    {
      name: "LinkedIn OAuth Credentials",
      category: "API_SERVICE",
      provider: "LinkedIn",
      monthlyCost: 0,
      billingCycle: "none",
      notes: "Client ID: 77qaui... Verificare pe linkedin.com/developers",
    },
    {
      name: "Vercel Deployment (viitor)",
      category: "INFRASTRUCTURE",
      provider: "Vercel",
      monthlyCost: 20,
      billingCycle: "monthly",
      status: "SUSPENDED",
      notes: "Necesar pentru producție. Pro plan $20/mo.",
    },
    {
      name: "Stripe (Billing)",
      category: "API_SERVICE",
      provider: "Stripe",
      monthlyCost: 0,
      billingCycle: "none",
      status: "SUSPENDED",
      notes: "Chei test. Necesar activare cont live + KYC pentru producție.",
    },
    {
      name: "Sentry (Monitoring)",
      category: "SUBSCRIPTION",
      provider: "Sentry.io",
      monthlyCost: 0,
      billingCycle: "monthly",
      status: "SUSPENDED",
      notes: "DSN lipsește. Free tier 5K events. Necesar înainte de producție.",
    },
  ]

  let created = 0
  for (const r of resources) {
    const existing = await p.externalResource.findFirst({ where: { name: r.name } })
    if (!existing) {
      await p.externalResource.create({
        data: {
          name: r.name,
          category: r.category,
          provider: r.provider,
          status: (r as any).status || "ACTIVE",
          monthlyCost: r.monthlyCost,
          billingCycle: r.billingCycle,
          expiresAt: (r as any).expiresAt || null,
          alertDaysBefore: (r as any).alertDaysBefore || 14,
          notes: r.notes,
        },
      })
      created++
    }
  }
  return created
}

// ── Check alerts ─────────────────────────────────────────────────────────────

export async function checkResourceAlerts(prisma: PrismaClient): Promise<ResourceReport> {
  const p = prisma as any
  const now = new Date()

  const resources = await p.externalResource.findMany({
    orderBy: { nextPaymentDate: "asc" },
  })

  const alerts: ResourceAlert[] = []
  const upcomingPayments: ResourceReport["upcomingPayments"] = []
  let monthlyCostTotal = 0

  for (const r of resources) {
    if (r.status === "CANCELLED") continue
    if (r.monthlyCost) monthlyCostTotal += r.monthlyCost

    // Check expiry
    if (r.expiresAt) {
      const daysUntil = Math.ceil((new Date(r.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntil <= 0) {
        alerts.push({
          resourceName: r.name, category: r.category,
          alertType: "EXPIRED", daysUntil,
          details: `EXPIRAT de ${Math.abs(daysUntil)} zile! Provider: ${r.provider}`,
          priority: "urgent",
        })
        // Update status
        await p.externalResource.update({ where: { id: r.id }, data: { status: "EXPIRED" } })
      } else if (daysUntil <= r.alertDaysBefore) {
        alerts.push({
          resourceName: r.name, category: r.category,
          alertType: "EXPIRING", daysUntil,
          details: `Expiră în ${daysUntil} zile (${new Date(r.expiresAt).toISOString().split("T")[0]}). Provider: ${r.provider}`,
          priority: daysUntil <= 7 ? "urgent" : "high",
        })
        await p.externalResource.update({ where: { id: r.id }, data: { status: "EXPIRING_SOON" } })
      }
    }

    // Check payment
    if (r.nextPaymentDate) {
      const daysUntil = Math.ceil((new Date(r.nextPaymentDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      if (daysUntil <= 14 && daysUntil >= 0) {
        upcomingPayments.push({
          name: r.name, amount: r.monthlyCost || 0,
          dueDate: new Date(r.nextPaymentDate).toISOString().split("T")[0],
          daysUntil,
        })
        if (daysUntil <= 3) {
          alerts.push({
            resourceName: r.name, category: r.category,
            alertType: "PAYMENT_DUE", daysUntil,
            details: `Plată ${r.monthlyCost}€ scadentă în ${daysUntil} zile. Provider: ${r.provider}`,
            priority: "high",
          })
        }
      }
    }

    // Check suspended (missing resources needed for operation)
    if (r.status === "SUSPENDED" && r.notes?.includes("Necesar")) {
      alerts.push({
        resourceName: r.name, category: r.category,
        alertType: "MISSING", daysUntil: -1,
        details: `Resursă necesară dar neactivată. ${r.notes}`,
        priority: "default",
      })
    }

    // Update lastChecked
    await p.externalResource.update({ where: { id: r.id }, data: { lastCheckedAt: now } })
  }

  const activeCount = resources.filter((r: any) => r.status === "ACTIVE").length

  const summary = [
    `${activeCount}/${resources.length} resurse active.`,
    `Cost lunar estimat: ${monthlyCostTotal}€.`,
    alerts.length > 0 ? `⚠ ${alerts.length} alerte (${alerts.filter(a => a.priority === "urgent").length} urgente).` : "✅ Fără alerte.",
    upcomingPayments.length > 0 ? `Plăți upcoming: ${upcomingPayments.length}.` : "",
  ].filter(Boolean).join(" ")

  return {
    date: now.toISOString().split("T")[0],
    totalResources: resources.length,
    activeResources: activeCount,
    alerts,
    upcomingPayments,
    monthlyCostTotal,
    summary,
  }
}

// ── Send alerts to Owner ─────────────────────────────────────────────────────

export async function sendResourceAlerts(report: ResourceReport): Promise<void> {
  const urgentAlerts = report.alerts.filter(a => a.priority === "urgent")
  if (urgentAlerts.length === 0 && report.alerts.length === 0) return

  const body = [
    `🔧 Resurse externe: ${report.activeResources}/${report.totalResources} active, cost ${report.monthlyCostTotal}€/lună`,
    "",
    ...report.alerts.map(a => `${a.priority === "urgent" ? "🔴" : "⚠️"} [${a.alertType}] ${a.resourceName}: ${a.details}`),
    report.upcomingPayments.length > 0 ? `\nPlăți: ${report.upcomingPayments.map(p => `${p.name} ${p.amount}€ (${p.daysUntil}d)`).join(", ")}` : "",
  ].filter(Boolean).join("\n")

  try {
    await fetch(`${NTFY_URL}/${NTFY_TOPIC}`, {
      method: "POST",
      headers: {
        Title: `🔧 Resurse: ${report.alerts.length} alerte`,
        Priority: urgentAlerts.length > 0 ? "urgent" : "high",
        Tags: "wrench,resources",
      },
      body,
    })
  } catch { /* non-blocking */ }
}
