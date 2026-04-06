/**
 * sales-executor.ts — Execuție acțiuni reale de vânzare
 *
 * SOA/CSSA pot:
 * 1. Trimite email outreach personalizat la prospects
 * 2. Programa follow-up sequences (day 0, 3, 7)
 * 3. Track răspunsuri și actualizare Client Memory
 * 4. Genera propuneri comerciale personalizate
 */

import Anthropic from "@anthropic-ai/sdk"
import type { PrismaClient } from "@/generated/prisma"
import { sendMarketingEmail, generateOutreachSequence } from "./marketing-executor"
import { recordClientMemory } from "./client-memory"
import { calibrateCommunication, getLanguageHints } from "@/lib/comms/calibrate"
import type { CalibrationContext } from "@/lib/comms/calibrate"

const MODEL = "claude-sonnet-4-20250514"

// ── Prospect Outreach ────────────────────────────────────────────────────────

export async function initiateOutreach(
  prospect: {
    name: string
    email: string
    company: string
    role: string
    context?: string
  },
  prisma: PrismaClient
): Promise<{
  sequenceGenerated: number
  firstEmailSent: { id: string; status: string }
  followUpsScheduled: number
}> {
  // Generate email sequence
  const sequence = await generateOutreachSequence(
    prospect.name,
    prospect.company,
    prospect.role,
    prospect.context || `HR ${prospect.role} la ${prospect.company}, piața RO`,
    prisma
  )

  if (sequence.length === 0) {
    return { sequenceGenerated: 0, firstEmailSent: { id: "", status: "no sequence" }, followUpsScheduled: 0 }
  }

  // Calibrate first email through L1/L2/L3/L4
  const first = sequence[0]
  const calibrationCtx: CalibrationContext = {
    recipientRole: mapRoleToCalibration(prospect.role),
    isFirstContact: true,
    language: "ro",
    contentType: "email",
    clientProvidedInfo: [],
  }

  const calibration = calibrateCommunication(
    `${first.subject}\n${first.body}`,
    calibrationCtx,
  )

  // Log calibration issues (non-blocking — we still send but record issues for learning)
  if (calibration.issues.length > 0) {
    console.warn(
      `[SOA] Calibration: ${calibration.issues.length} issues detected`,
      calibration.issues.map(i => `${i.layer}/${i.rule}: ${i.found}`),
    )
  }

  // Send first email
  const emailResult = await sendMarketingEmail(
    prospect.email,
    first.subject,
    `<div style="font-family: Georgia, serif; max-width: 580px; line-height: 1.75;">
      <p>${first.body.replace(/\n/g, "</p><p>")}</p>
      <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
      <p style="font-size: 11px; color: #9CA3AF; font-family: Arial, sans-serif;">
        Psihobusiness Consulting SRL — servicii de consultanță organizațională<br>
        <a href="https://jobgrade.ro" style="color:#4F46E5;">jobgrade.ro</a>
      </p>
      <p style="font-size: 10px; color: #D1D5DB;">
        Dacă nu doriți să mai primiți mesaje de la noi, vă rugăm să răspundeți cu „dezabonare".
      </p>
    </div>`
  )

  // Record in Client Memory
  try {
    // Create tenant for prospect if doesn't exist
    const p = prisma as any
    let tenant = await p.tenant.findFirst({ where: { name: prospect.company } })
    if (!tenant) {
      tenant = await p.tenant.create({
        data: {
          name: prospect.company,
          slug: prospect.company.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-"),
          plan: "STARTER",
          status: "ACTIVE",
        },
      })
    }

    await recordClientMemory(
      tenant.id,
      "HISTORY",
      `Outreach inițiat: email trimis la ${prospect.name} (${prospect.role}). Subject: "${first.subject}". Status: ${emailResult.status}`,
      "SOA",
      prisma,
      { importance: 0.7, tags: ["outreach", "email-1"] }
    )

    await recordClientMemory(
      tenant.id,
      "RELATIONSHIP",
      `Contact principal: ${prospect.name}, ${prospect.role}. Email: ${prospect.email}`,
      "SOA",
      prisma,
      { importance: 0.9, tags: ["contact", "prospect"] }
    )
  } catch { /* non-blocking */ }

  // Store follow-ups for later sending (via n8n scheduled webhook)
  // For now, store in CycleLog as scheduled actions
  let followUpsScheduled = 0
  const p = prisma as any
  for (const followUp of sequence.slice(1)) {
    try {
      await p.cycleLog.create({
        data: {
          managerRole: "SOA",
          targetRole: prospect.email,
          actionType: "SCHEDULED_EMAIL",
          description: `Follow-up Day ${followUp.day}: "${followUp.subject}"`,
          details: JSON.stringify({
            to: prospect.email,
            subject: followUp.subject,
            body: followUp.body,
            scheduledDay: followUp.day,
            scheduledDate: new Date(Date.now() + followUp.day * 24 * 60 * 60 * 1000).toISOString(),
          }),
          resolved: false,
        },
      })
      followUpsScheduled++
    } catch { /* non-blocking */ }
  }

  return {
    sequenceGenerated: sequence.length,
    firstEmailSent: emailResult,
    followUpsScheduled,
  }
}

// ── Process Scheduled Follow-ups ─────────────────────────────────────────────

export async function processScheduledEmails(prisma: PrismaClient): Promise<number> {
  const p = prisma as any
  const now = new Date()

  const scheduled = await p.cycleLog.findMany({
    where: { actionType: "SCHEDULED_EMAIL", resolved: false },
  })

  let sent = 0
  for (const entry of scheduled) {
    try {
      const details = JSON.parse(entry.details || "{}")
      const scheduledDate = new Date(details.scheduledDate)

      if (scheduledDate <= now) {
        await sendMarketingEmail(details.to, details.subject, details.body)
        await p.cycleLog.update({
          where: { id: entry.id },
          data: { resolved: true, resolvedAt: now },
        })
        sent++
      }
    } catch { /* skip failed */ }
  }

  return sent
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function mapRoleToCalibration(role: string): CalibrationContext["recipientRole"] {
  const r = role.toLowerCase()
  if (r.includes("hr") || r.includes("resurse umane") || r.includes("people")) return "HR_DIRECTOR"
  if (r.includes("ceo") || r.includes("director general") || r.includes("managing")) return "CEO"
  if (r.includes("cfo") || r.includes("financiar") || r.includes("finance")) return "CFO"
  if (r.includes("consultant")) return "CONSULTANT"
  return "GENERAL"
}
