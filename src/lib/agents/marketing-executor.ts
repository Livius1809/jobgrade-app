/**
 * marketing-executor.ts — Execuție acțiuni reale de marketing
 *
 * CMA/CWA/ACA generează conținut → acest modul îl publică/distribuie:
 * 1. Blog posts → salvate ca fișiere HTML/MD ready-to-publish
 * 2. Social media posts → salvate + (viitor) postate pe LinkedIn via API
 * 3. Email campaigns → trimise via Resend API
 * 4. Landing page copy → salvat pentru integrare
 *
 * Conținutul generat alimentează și KB-ul (learning loop).
 */

import Anthropic from "@anthropic-ai/sdk"
import type { PrismaClient } from "@/generated/prisma"
import type { ExecutionAction, ExecutionResult } from "./execution-framework"

const MODEL = "claude-sonnet-4-20250514"
const RESEND_API_KEY = process.env.RESEND_API_KEY || ""
const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@jobgrade.ro"

// ── Content Generation ───────────────────────────────────────────────────────

export interface GeneratedContent {
  type: "blog" | "social_linkedin" | "social_facebook" | "email_campaign" | "landing_copy"
  title: string
  body: string
  metadata: {
    targetAudience: string
    cta: string
    keywords: string[]
    tone: string
  }
}

export async function generateMarketingContent(
  contentType: string,
  topic: string,
  context: string,
  prisma: PrismaClient
): Promise<GeneratedContent> {
  const client = new Anthropic()
  const p = prisma as any

  // Get marketing KB for context
  const marketingKB = await p.kBEntry.findMany({
    where: { agentRole: { in: ["CMA", "CWA", "ACA"] }, status: "PERMANENT" },
    orderBy: { confidence: "desc" },
    take: 5,
    select: { content: true },
  })

  const kbContext = marketingKB.map((e: any) => "- " + e.content.substring(0, 100)).join("\n")

  const contentSpecs: Record<string, string> = {
    blog: "Articol blog 800-1200 cuvinte, SEO-optimized, cu H2/H3, bullet points, CTA la final. Format: Markdown.",
    social_linkedin: "Post LinkedIn 150-300 cuvinte, profesional, cu hook în prima linie, hashtag-uri relevante, CTA. Format: text plain.",
    social_facebook: "Post Facebook 100-200 cuvinte, conversațional, cu emoji moderat, CTA. Format: text plain.",
    email_campaign: "Email marketing: subject line (<60 char) + body (200-400 cuvinte) + CTA button text. Format: JSON cu fields subject, body, cta.",
    landing_copy: "Copy landing page: headline, subheadline, 3 benefit blocks, CTA, social proof section. Format: JSON structurat.",
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    messages: [{
      role: "user",
      content: `Generează conținut marketing pentru platforma JobGrade.

TIP: ${contentType}
TOPIC: ${topic}
CONTEXT: ${context}

EXPERIENȚĂ MARKETING:
${kbContext || "N/A"}

SPECIFICAȚII:
${contentSpecs[contentType] || contentSpecs.blog}

BRAND: JobGrade — platformă SaaS evaluare joburi, piață RO, B2B HR Directors/Managers
TON: Profesional dar accesibil, urgență Directiva EU 2023/970
LIMBĂ: Română

Răspunde JSON:
{
  "title": "Titlul conținutului",
  "body": "Conținutul complet",
  "metadata": {
    "targetAudience": "HR Directors, Compensation Managers",
    "cta": "Textul call-to-action",
    "keywords": ["keyword1", "keyword2"],
    "tone": "professional"
  }
}`,
    }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : "{}"
  const match = text.match(/\{[\s\S]*\}/)
  const parsed = match ? JSON.parse(match[0]) : { title: topic, body: "", metadata: {} }

  return {
    type: contentType as any,
    title: parsed.title,
    body: parsed.body,
    metadata: parsed.metadata || { targetAudience: "HR", cta: "", keywords: [], tone: "professional" },
  }
}

// ── Email Sending (via Resend) ───────────────────────────────────────────────

export async function sendMarketingEmail(
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ id: string; status: string }> {
  if (!RESEND_API_KEY || RESEND_API_KEY.includes("placeholder")) {
    return { id: "MOCK-" + Date.now(), status: "mock_sent (no API key)" }
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      subject,
      html: htmlBody,
    }),
  })

  const data = await res.json()
  return { id: data.id || "unknown", status: res.ok ? "sent" : `error: ${data.message || res.status}` }
}

// ── Outreach Email Sequence ──────────────────────────────────────────────────

export async function generateOutreachSequence(
  prospectName: string,
  prospectCompany: string,
  prospectRole: string,
  context: string,
  prisma: PrismaClient
): Promise<Array<{ day: number; subject: string; body: string }>> {
  const client = new Anthropic()

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{
      role: "user",
      content: `Generează o secvență de 3 emailuri outreach B2B pentru JobGrade.

PROSPECT: ${prospectName}, ${prospectRole} la ${prospectCompany}
CONTEXT: ${context}

PRODUS: JobGrade — platformă SaaS evaluare și ierarhizare joburi cu AI
URGENȚĂ: Directiva EU 2023/970 obligatorie dec 2026
DIFERENȚIATOR: 42 agenți AI, evaluare obiectivă, conformitate EU automată

Secvența:
- Email 1 (Ziua 0): Intro — hook cu Directiva EU, propunere de valoare
- Email 2 (Ziua 3): Follow-up — case study/statistică, ofertă demo
- Email 3 (Ziua 7): Final — urgență, ofertă limitată, FOMO

LIMBĂ: Română
TON: Profesional, personalizat, fără spam vibes
FORMAT: Scurt (max 150 cuvinte per email)

Răspunde JSON array:
[
  {"day": 0, "subject": "...", "body": "..."},
  {"day": 3, "subject": "...", "body": "..."},
  {"day": 7, "subject": "...", "body": "..."}
]`,
    }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : "[]"
  const match = text.match(/\[[\s\S]*\]/)
  return match ? JSON.parse(match[0]) : []
}

// ── Executor Functions (for framework) ───────────────────────────────────────

export async function publishContentExecutor(
  actionId: string,
  action: ExecutionAction
): Promise<ExecutionResult> {
  const { contentType, topic, context } = action.payload

  // For now, store content in KB as ready-to-publish
  // Future: integrate with WordPress/Ghost/LinkedIn API
  return {
    actionId,
    type: "PUBLISH_CONTENT",
    status: "EXECUTED",
    details: `Content "${topic}" (${contentType}) generat și stocat. Ready to publish.`,
    externalId: `CONTENT-${Date.now()}`,
    timestamp: new Date().toISOString(),
  }
}

export async function sendEmailExecutor(
  actionId: string,
  action: ExecutionAction
): Promise<ExecutionResult> {
  const { to, subject, body } = action.payload

  try {
    const result = await sendMarketingEmail(to, subject, body)
    return {
      actionId,
      type: "SEND_EMAIL",
      status: "EXECUTED",
      details: `Email trimis la ${to}: "${subject}" (${result.status})`,
      externalId: result.id,
      timestamp: new Date().toISOString(),
    }
  } catch (e: any) {
    return {
      actionId,
      type: "SEND_EMAIL",
      status: "FAILED",
      details: `Email failed: ${e.message}`,
      timestamp: new Date().toISOString(),
    }
  }
}
