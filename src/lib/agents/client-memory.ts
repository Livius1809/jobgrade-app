/**
 * client-memory.ts — Memorie per client (tenant)
 *
 * Simulează "relația personală" dintr-o companie cu oameni:
 * - Preferințe de comunicare
 * - Context situațional (restructurare, buget, urgențe)
 * - Puncte dureroase și oportunități
 * - Istoric interacțiuni
 * - Stil (formal/informal, detaliat/sumar)
 *
 * Alimentare:
 * 1. Automată — din sesiuni evaluare, tickete suport, facturare
 * 2. Manuală — agenți client-facing notează observații
 * 3. Distilare — Claude extrage insight-uri din interacțiuni
 *
 * Consum:
 * - Orice agent client-facing consultă memoria înainte de interacțiune
 * - Continuitate: SOA vinde, CSSA preia, CSA răspunde — toți "cunosc" clientul
 */

import Anthropic from "@anthropic-ai/sdk"
import type { PrismaClient } from "@/generated/prisma"

const MODEL = "claude-sonnet-4-20250514"

// ── Types ────────────────────────────────────────────────────────────────────

export interface ClientProfile {
  tenantId: string
  tenantName: string
  memories: Array<{
    category: string
    content: string
    importance: number
    source: string
    age: string
  }>
  summary: string
}

// ── Record a memory ──────────────────────────────────────────────────────────

export async function recordClientMemory(
  tenantId: string,
  category: string,
  content: string,
  source: string,
  prisma: PrismaClient,
  options?: { importance?: number; tags?: string[]; expiresAt?: Date }
): Promise<string> {
  const p = prisma as any

  const memory = await p.clientMemory.create({
    data: {
      tenantId,
      category,
      content,
      source,
      importance: options?.importance || 0.5,
      tags: options?.tags || [],
      expiresAt: options?.expiresAt || null,
    },
  })

  return memory.id
}

// ── Get client profile (for agent context injection) ─────────────────────────

export async function getClientProfile(
  tenantId: string,
  prisma: PrismaClient
): Promise<ClientProfile> {
  const p = prisma as any

  const tenant = await p.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true },
  })

  // Get active memories (not expired), sorted by importance
  const now = new Date()
  const memories = await p.clientMemory.findMany({
    where: {
      tenantId,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    orderBy: { importance: "desc" },
    take: 20,
  })

  const profile: ClientProfile = {
    tenantId,
    tenantName: tenant?.name || "Unknown",
    memories: memories.map((m: any) => ({
      category: m.category,
      content: m.content,
      importance: m.importance,
      source: m.source,
      age: getAge(m.createdAt),
    })),
    summary: "",
  }

  // Generate summary if enough memories
  if (memories.length >= 3) {
    profile.summary = buildClientSummary(memories)
  }

  return profile
}

// ── Format profile for prompt injection ──────────────────────────────────────

export function formatClientProfileForPrompt(profile: ClientProfile): string {
  if (profile.memories.length === 0) {
    return `CLIENT: ${profile.tenantName} — Primul contact, nu avem istoric.`
  }

  const lines = [`CLIENT: ${profile.tenantName}`]

  // Group by category
  const groups = new Map<string, string[]>()
  for (const m of profile.memories) {
    const existing = groups.get(m.category) || []
    existing.push(`${m.content} (${m.age}, via ${m.source})`)
    groups.set(m.category, existing)
  }

  const categoryLabels: Record<string, string> = {
    PREFERENCE: "Preferințe",
    RELATIONSHIP: "Persoane cheie",
    CONTEXT: "Context actual",
    PAIN_POINT: "Puncte sensibile",
    OPPORTUNITY: "Oportunități",
    HISTORY: "Istoric",
    STYLE: "Stil comunicare",
  }

  for (const [cat, items] of groups) {
    lines.push(`  ${categoryLabels[cat] || cat}:`)
    for (const item of items.slice(0, 3)) {
      lines.push(`    - ${item}`)
    }
  }

  if (profile.summary) {
    lines.push(`  Rezumat: ${profile.summary}`)
  }

  return lines.join("\n")
}

// ── Auto-distill from evaluation session ─────────────────────────────────────

export async function distillFromSession(
  tenantId: string,
  sessionId: string,
  prisma: PrismaClient
): Promise<number> {
  const p = prisma as any

  // Get session details
  const session = await p.evaluationSession.findUnique({
    where: { id: sessionId },
    include: {
      sessionJobs: { include: { job: true } },
      participants: { include: { user: true } },
    },
  })
  if (!session) return 0

  const client = new Anthropic()
  const jobTitles = session.sessionJobs?.map((sj: any) => sj.job?.title).filter(Boolean)
  const participantNames = session.participants?.map((p: any) => `${p.user?.firstName} ${p.user?.lastName} (${p.role})`).filter(Boolean)

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `Dintr-o sesiune de evaluare joburi, extrage observații despre client.

Sesiune: "${session.name}" (status: ${session.status})
Joburi evaluate: ${jobTitles?.join(", ") || "N/A"}
Participanți: ${participantNames?.join(", ") || "N/A"}
Creat: ${session.createdAt}

Ce putem deduce despre acest client? Extrage maxim 3 observații concrete.

Răspunde JSON:
[
  {
    "category": "PREFERENCE|RELATIONSHIP|CONTEXT|PAIN_POINT|OPPORTUNITY|STYLE",
    "content": "Observație concretă",
    "importance": 0.3-0.9
  }
]

Doar observații UTILE pentru viitoare interacțiuni. Dacă nu poți deduce nimic, returnează [].`,
      }],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : "[]"
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return 0

    const observations: any[] = JSON.parse(match[0])
    let added = 0

    for (const obs of observations) {
      try {
        await p.clientMemory.create({
          data: {
            tenantId,
            category: obs.category || "HISTORY",
            content: obs.content,
            source: "HR_COUNSELOR",
            importance: obs.importance || 0.5,
            tags: ["auto-distilled", "session", sessionId.substring(0, 8)],
          },
        })
        added++
      } catch { /* duplicate */ }
    }

    return added
  } catch {
    return 0
  }
}

// ── Auto-distill from support ticket ─────────────────────────────────────────

export async function recordSupportInteraction(
  tenantId: string,
  issue: string,
  resolution: string,
  agentRole: string,
  prisma: PrismaClient
): Promise<string> {
  return recordClientMemory(
    tenantId,
    "HISTORY",
    `Suport: "${issue}" → Rezolvat: "${resolution}"`,
    agentRole,
    prisma,
    { importance: 0.4, tags: ["support", "interaction"] }
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getAge(date: Date): string {
  const ms = Date.now() - new Date(date).getTime()
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  if (days === 0) return "azi"
  if (days === 1) return "ieri"
  if (days < 7) return `${days} zile`
  if (days < 30) return `${Math.floor(days / 7)} săpt.`
  return `${Math.floor(days / 30)} luni`
}

function buildClientSummary(memories: any[]): string {
  const preferences = memories.filter((m: any) => m.category === "PREFERENCE")
  const painPoints = memories.filter((m: any) => m.category === "PAIN_POINT")
  const style = memories.filter((m: any) => m.category === "STYLE")

  const parts: string[] = []
  if (style.length > 0) parts.push(`Stil: ${style[0].content}`)
  if (preferences.length > 0) parts.push(`Preferă: ${preferences[0].content}`)
  if (painPoints.length > 0) parts.push(`Atenție: ${painPoints[0].content}`)

  return parts.join(". ") || ""
}
