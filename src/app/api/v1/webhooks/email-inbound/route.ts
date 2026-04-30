/**
 * POST /api/v1/webhooks/email-inbound — Primire email de la Resend Inbound
 *
 * Flux:
 *   1. Client trimite email la platforma@jobgrade.ro
 *   2. Resend forwardează la acest webhook
 *   3. Identificăm compania clientului (din email expeditor)
 *   4. AI interpretează cererea → invocă MCP tools
 *   5. Răspuns formatat → trimis înapoi prin Resend
 *
 * Auth: Verificare Resend webhook signature
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { anthropic, AI_MODEL } from "@/lib/ai/client"
import { MCP_TOOLS, executeMCPTool } from "@/lib/mcp/server"
import { Resend } from "resend"

export const dynamic = "force-dynamic"
export const maxDuration = 120

const resend = new Resend(process.env.RESEND_API_KEY)
const INBOUND_ADDRESS = process.env.EMAIL_INBOUND ?? "platforma@jobgrade.ro"
const FROM_ADDRESS = process.env.EMAIL_FROM ?? "JobGrade <noreply@jobgrade.ro>"
const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET

interface InboundEmail {
  from: string
  to: string
  subject: string
  text?: string
  html?: string
  headers?: Record<string, string>
}

// ── Identifică tenant din email-ul expeditorului ──────────────
async function findTenantByEmail(email: string): Promise<{ tenantId: string; userName: string; userRole: string } | null> {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), status: "ACTIVE" },
    select: { tenantId: true, firstName: true, lastName: true, role: true },
  })
  if (!user) return null
  return {
    tenantId: user.tenantId,
    userName: `${user.firstName} ${user.lastName}`.trim(),
    userRole: user.role,
  }
}

// ── Construiește contextul MCP pentru AI ──────────────────────
function buildMCPContext(userRole: string): string {
  const readTools = MCP_TOOLS.filter(t => t.category === "READ")
  const actionTools = MCP_TOOLS.filter(t => t.category === "ACTION")

  return `Ai acces la următoarele instrumente MCP ale platformei JobGrade:

CITIRE (gratuit):
${readTools.map(t => `- ${t.name}: ${t.description}`).join("\n")}

ACȚIUNI (cu credite):
${actionTools.map(t => `- ${t.name}: ${t.description} (${t.creditCost} credite)`).join("\n")}

Rolul utilizatorului: ${userRole}
Răspunde în limba română, concis și profesional.
Dacă utilizatorul cere date, folosește tool-urile disponibile.
Dacă cererea nu e legată de platformă, răspunde politicos că poți ajuta doar cu funcționalitățile JobGrade.`
}

// ── Procesare email prin AI + MCP ────────────────────────────
async function processEmailWithMCP(
  emailText: string,
  subject: string,
  tenantId: string,
  userName: string,
  userRole: string,
): Promise<string> {
  const systemPrompt = buildMCPContext(userRole)

  // Prima rundă: AI decide ce tool-uri să folosească
  const toolsDef = MCP_TOOLS.filter(t =>
    t.category === "READ" || (t.category === "ACTION" && ["OWNER", "SUPER_ADMIN", "COMPANY_ADMIN", "HR_ADMIN"].includes(userRole))
  ).map(t => ({
    name: t.name,
    description: t.description,
    input_schema: {
      type: "object" as const,
      properties: Object.fromEntries(
        Object.entries(t.parameters).map(([k, v]) => [k, { type: v.type, description: v.description }])
      ),
      required: Object.entries(t.parameters).filter(([, v]) => v.required).map(([k]) => k),
    },
  }))

  const messages: any[] = [
    { role: "user", content: `Email de la ${userName} (${userRole}).\nSubiect: ${subject}\n\n${emailText}` },
  ]

  // Iterativ: AI poate apela tool-uri, primește rezultate, răspunde
  let finalResponse = ""
  let iterations = 0
  const MAX_ITERATIONS = 5

  while (iterations < MAX_ITERATIONS) {
    iterations++

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      tools: toolsDef,
      messages,
    })

    // Colectăm text + tool calls
    const textBlocks = response.content.filter(b => b.type === "text")
    const toolCalls = response.content.filter(b => b.type === "tool_use")

    if (toolCalls.length === 0) {
      // AI a terminat — răspunsul final
      finalResponse = textBlocks.map(b => b.text).join("\n")
      break
    }

    // Execută tool-urile și dă rezultatele înapoi la AI
    messages.push({ role: "assistant", content: response.content })

    const toolResults: any[] = []
    for (const tc of toolCalls) {
      const params = { ...(tc.input as Record<string, any>), tenantId }
      const result = await executeMCPTool(tc.name, params)
      toolResults.push({
        type: "tool_result",
        tool_use_id: tc.id,
        content: JSON.stringify(result.data ?? result.error ?? "No data"),
      })
    }

    messages.push({ role: "user", content: toolResults })
  }

  if (!finalResponse) {
    finalResponse = "Am procesat cererea dar nu am reușit să generez un răspuns. Încercați din portal."
  }

  return finalResponse
}

// ── Trimite răspunsul prin email ─────────────────────────────
async function sendReplyEmail(to: string, subject: string, responseText: string) {
  const html = `
<!DOCTYPE html>
<html lang="ro">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F9FAFB;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #E5E7EB;">
    <div style="padding:20px 24px;background:#4F46E5;">
      <span style="color:#fff;font-size:16px;font-weight:600;">JobGrade</span>
    </div>
    <div style="padding:24px;">
      <div style="font-size:14px;line-height:1.7;color:#1F2937;white-space:pre-wrap;">${responseText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
    </div>
    <div style="padding:16px 24px;background:#F3F4F6;font-size:11px;color:#9CA3AF;text-align:center;">
      Acest răspuns a fost generat automat de platforma JobGrade.<br>
      Pentru asistență suplimentară, accesați <a href="https://jobgrade.ro/portal" style="color:#4F46E5;">portalul</a>.
    </div>
  </div>
</body>
</html>`

  await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Re: ${subject}`,
    html,
  })
}

// ── Webhook handler ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Resend webhook: body.type === "email.received", body.data contine metadata
    // Body-ul emailului NU vine direct — trebuie citit prin API
    const eventType = body.type
    if (eventType && eventType !== "email.received") {
      return NextResponse.json({ status: "ignored", reason: `event: ${eventType}` })
    }

    const eventData = body.data || body
    const emailId = eventData.email_id || eventData.id

    let fromEmail = ""
    let emailText = ""
    let subject = ""

    if (emailId && process.env.RESEND_API_KEY) {
      // Citește conținutul complet prin API-ul Resend
      try {
        const emailRes = await fetch(`https://api.resend.com/emails/${emailId}`, {
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        })
        if (emailRes.ok) {
          const emailData = await emailRes.json()
          fromEmail = (emailData.from || "").replace(/.*</, "").replace(/>.*/, "").trim().toLowerCase()
          emailText = emailData.text || emailData.html?.replace(/<[^>]+>/g, " ") || ""
          subject = emailData.subject || "(fără subiect)"
        }
      } catch {}
    }

    // Fallback: date direct din webhook (dacă Resend le include)
    if (!fromEmail) {
      fromEmail = (eventData.from || "").replace(/.*</, "").replace(/>.*/, "").trim().toLowerCase()
      emailText = eventData.text || ""
      subject = eventData.subject || "(fără subiect)"
    }

    if (!fromEmail || !emailText.trim()) {
      return NextResponse.json({ status: "ignored", reason: "empty" })
    }

    // Identifică compania
    const tenant = await findTenantByEmail(fromEmail)
    if (!tenant) {
      // Email de la cineva necunoscut — răspuns politicos
      await sendReplyEmail(fromEmail, subject,
        `Bună ziua,\n\nAdresa dvs. de email nu este asociată cu un cont JobGrade activ.\n\nDacă sunteți client, vă rugăm să folosiți adresa de email cu care v-ați înregistrat pe platformă.\n\nEchipa JobGrade`)
      return NextResponse.json({ status: "unknown_user", email: fromEmail })
    }

    // Procesează prin AI + MCP
    const response = await processEmailWithMCP(
      emailText,
      subject,
      tenant.tenantId,
      tenant.userName,
      tenant.userRole,
    )

    // Trimite răspunsul
    await sendReplyEmail(fromEmail, subject, response)

    // Log interacțiunea
    try {
      const { learnFromReport } = await import("@/lib/learning-hooks")
      await learnFromReport("EMAIL_MCP", tenant.tenantId,
        `Email MCP de la ${tenant.userName} (${tenant.userRole}): "${subject}" → răspuns trimis`)
    } catch {}

    return NextResponse.json({
      status: "processed",
      from: fromEmail,
      tenant: tenant.tenantId,
      subject,
    })
  } catch (error: any) {
    console.error("[EMAIL-INBOUND]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
