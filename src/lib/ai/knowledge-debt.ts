/**
 * knowledge-debt.ts — Datorii de cunoaștere
 *
 * Când KB nu poate răspunde complet în timpul unei căderi Claude,
 * salvează "datoria" — întrebarea la care nu a putut răspunde.
 *
 * Când Claude revine:
 * 1. Procesează datoriile acumulate
 * 2. Generează răspunsuri complete
 * 3. Trimite email: "Îți rămăsesem dator cu răspunsul la..."
 * 4. Salvează cunoașterea nouă în KB (pentru data viitoare)
 *
 * Clientul simte că e îngrijit, nu abandonat.
 */

import { prisma } from "@/lib/prisma"
import { getAppUrl } from "@/lib/get-app-url"
import { Resend } from "resend"

const FROM = process.env.EMAIL_FROM ?? "JobGrade <noreply@jobgrade.ro>"
const APP_URL = getAppUrl()

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface KnowledgeDebt {
  id: string
  tenantId: string
  userId: string
  userEmail: string
  userName: string
  question: string
  context: string       // pagina, card, agent care a primit întrebarea
  partialAnswer: string  // ce a putut oferi KB-ul
  confidence: number     // cât de complet a fost răspunsul KB
  createdAt: string
  resolvedAt?: string
  fullAnswer?: string
}

// ═══════════════════════════════════════════════════════════════
// SAVE DEBT — când KB nu poate răspunde complet
// ═══════════════════════════════════════════════════════════════

/**
 * Salvează o datorie de cunoaștere.
 * Apelat din FW chat sau orice endpoint client-facing când
 * KB răspunde parțial sau deloc.
 */
export async function saveKnowledgeDebt(params: {
  tenantId: string
  userId: string
  question: string
  context: string
  partialAnswer: string
  confidence: number
}): Promise<string> {
  const key = `KNOWLEDGE_DEBT_${Date.now()}_${params.userId.slice(-6)}`

  // Obținem email și nume user
  let userEmail = ""
  let userName = ""
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { email: true, firstName: true, lastName: true },
    })
    userEmail = user?.email || ""
    userName = [user?.firstName, user?.lastName].filter(Boolean).join(" ")
  } catch {}

  // Dacă nu avem email, nu putem trimite follow-up — nu salvăm datoria
  if (!userEmail || userEmail === "system") return ""

  const debt: KnowledgeDebt = {
    id: key,
    tenantId: params.tenantId,
    userId: params.userId,
    userEmail,
    userName,
    question: params.question.slice(0, 1000),
    context: params.context,
    partialAnswer: params.partialAnswer.slice(0, 500),
    confidence: params.confidence,
    createdAt: new Date().toISOString(),
  }

  await prisma.systemConfig.create({
    data: {
      key,
      value: JSON.stringify(debt),
      label: `Datorie cunoaștere: ${params.question.slice(0, 80)}`,
    },
  })

  return key
}

// ═══════════════════════════════════════════════════════════════
// PROCESS DEBTS — când Claude revine
// ═══════════════════════════════════════════════════════════════

/**
 * Procesează datoriile acumulate. Apelat din maintenance cron
 * când detectează că Claude e din nou disponibil.
 *
 * Pentru fiecare datorie:
 * 1. Generează răspuns complet cu Claude
 * 2. Trimite email follow-up
 * 3. Salvează cunoașterea în KB
 * 4. Marchează datoria ca rezolvată
 */
export async function processKnowledgeDebts(): Promise<{
  processed: number
  emailed: number
  errors: number
}> {
  const stats = { processed: 0, emailed: 0, errors: 0 }

  // Găsim toate datoriile nerezolvate
  const debtConfigs = await prisma.systemConfig.findMany({
    where: { key: { startsWith: "KNOWLEDGE_DEBT_" } },
  })

  for (const config of debtConfigs) {
    try {
      const debt: KnowledgeDebt = JSON.parse(config.value)

      // Skip deja rezolvate
      if (debt.resolvedAt) continue

      // Skip datorii mai vechi de 7 zile — nu mai sunt relevante
      const ageMs = Date.now() - new Date(debt.createdAt).getTime()
      if (ageMs > 7 * 24 * 3600000) {
        debt.resolvedAt = new Date().toISOString()
        debt.fullAnswer = "(expirat — datorie mai veche de 7 zile)"
        await prisma.systemConfig.update({
          where: { key: config.key },
          data: { value: JSON.stringify(debt) },
        })
        continue
      }

      // Generăm răspuns complet cu Claude
      const { cpuCall } = await import("@/lib/cpu/gateway")

      const cpuResult = await cpuCall({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `Ești ghidul platformei JobGrade. Un client a întrebat ceva când sistemul era temporar indisponibil. Acum revii cu răspunsul complet.

CONTEXT: ${debt.context}
RĂSPUNS PARȚIAL OFERIT ANTERIOR: ${debt.partialAnswer || "(nu s-a putut oferi răspuns)"}

Răspunde complet, profesional, în limba română. Fii direct și util.
NU menționa că a fost o cădere sau o indisponibilitate — pur și simplu oferi informația.
NU folosi superlative americane. Tonul e natural, profesional, cald.`,
        messages: [{ role: "user", content: debt.question }],
        agentRole: "SOA",
        operationType: "knowledge-debt-resolve",
      })

      const fullAnswer = cpuResult.text.trim()

      if (!fullAnswer) {
        stats.errors++
        continue
      }

      // Trimitem email follow-up
      if (debt.userEmail) {
        try {
          const resend = new Resend(process.env.RESEND_API_KEY)
          const firstName = debt.userName?.split(" ")[0] || ""

          await resend.emails.send({
            from: FROM,
            to: debt.userEmail,
            subject: "Răspunsul la întrebarea dumneavoastră — JobGrade",
            html: buildDebtEmail(firstName, debt.question, fullAnswer),
          })

          stats.emailed++
        } catch (e) {
          console.error("[KNOWLEDGE-DEBT] Email failed:", e)
        }
      }

      // Salvăm cunoașterea nouă în KB
      try {
        const { learnFrom } = await import("@/lib/learning-hooks")
        await learnFrom("SOA", "CONVERSATION", debt.question, fullAnswer, {
          source: "knowledge-debt-recovery",
        })
      } catch {}

      // Marcăm datoria ca rezolvată
      debt.resolvedAt = new Date().toISOString()
      debt.fullAnswer = fullAnswer
      await prisma.systemConfig.update({
        where: { key: config.key },
        data: { value: JSON.stringify(debt) },
      })

      stats.processed++
    } catch (e: any) {
      console.error(`[KNOWLEDGE-DEBT] Error processing ${config.key}:`, e.message)
      stats.errors++
    }
  }

  return stats
}

// ═══════════════════════════════════════════════════════════════
// EMAIL TEMPLATE — "Îți rămăsesem dator..."
// ═══════════════════════════════════════════════════════════════

function buildDebtEmail(firstName: string, question: string, answer: string): string {
  const greeting = firstName
    ? `Bună ziua${firstName ? `, ${firstName}` : ""},`
    : "Bună ziua,"

  // Convertim answer in paragraphs HTML
  const answerHtml = answer
    .split("\n\n")
    .filter(p => p.trim())
    .map(p => `<p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 12px;">${p.trim().replace(/\n/g, "<br>")}</p>`)
    .join("")

  return `
<!DOCTYPE html>
<html lang="ro">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:Georgia,'Times New Roman',serif;">
  <div style="max-width:580px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="background:#4F46E5;padding:18px 32px;">
      <h1 style="margin:0;color:#ffffff;font-size:17px;font-weight:700;font-family:Arial,sans-serif;">JobGrade</h1>
      <p style="margin:4px 0 0;color:#C7D2FE;font-size:11px;font-family:Arial,sans-serif;">Evaluare și ierarhizare posturi</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 16px;">
        ${greeting}
      </p>
      <p style="color:#374151;font-size:14px;line-height:1.7;margin:0 0 20px;">
        V-am rămas dator cu un răspuns complet la întrebarea dumneavoastră.
        Iată informațiile solicitate:
      </p>

      <div style="background:#F0F0FF;border-left:4px solid #4F46E5;padding:12px 16px;margin:0 0 20px;border-radius:0 8px 8px 0;">
        <p style="margin:0;font-size:13px;color:#6B7280;font-style:italic;">
          „${question.slice(0, 200)}${question.length > 200 ? "..." : ""}"
        </p>
      </div>

      ${answerHtml}

      <div style="margin:28px 0 0;">
        <a href="${APP_URL}/portal"
           style="display:inline-block;background:#4F46E5;color:#ffffff;text-decoration:none;
                  padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;font-family:Arial,sans-serif;">
          Continuă pe platformă
        </a>
      </div>

      <p style="margin:28px 0 0;font-size:14px;color:#374151;">
        Cu stimă,<br>
        <strong>Echipa JobGrade</strong>
      </p>
    </div>
    <div style="padding:16px 32px;background:#F9FAFB;border-top:1px solid #E5E7EB;font-family:Arial,sans-serif;">
      <p style="margin:0;color:#9CA3AF;font-size:11px;line-height:1.6;">
        Psihobusiness Consulting SRL — servicii de consultanță organizațională<br>
        <a href="https://jobgrade.ro" style="color:#4F46E5;">jobgrade.ro</a>
      </p>
    </div>
  </div>
</body>
</html>`
}
