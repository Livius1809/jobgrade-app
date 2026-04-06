/**
 * client-context-engine.ts — Aggregator de context din TOATE sursele
 *
 * Construiește un profil complet al clientului din:
 * - ClientMemory (preferințe, relații, istoric, stil)
 * - ConversationThread (conversații anterioare, întrebări puse)
 * - InteractionLog (ce pagini a vizitat, ce a descărcat, cât a stat)
 * - Session history (la ce sesiuni a participat, cum a evaluat)
 * - Company profile (dimensiune, industrie, MVV)
 * - Evaluations & reports generated
 *
 * Principiu: platforma achiziționează informație din fiecare interacțiune
 * și o folosește pentru a ghida clientul spre întrebarea potrivită.
 */

import type { PrismaClient } from "@/generated/prisma"

// ── Types ────────────────────────────────────────────────────────────────────

export interface ClientContext {
  /** Who is this user */
  identity: {
    userId: string
    tenantId: string
    firstName: string
    lastName: string
    role: string
    jobTitle?: string
  }
  /** Company context */
  company: {
    name: string
    industry?: string
    size?: string
    mission?: string
    vision?: string
    values: string[]
  }
  /** What they've been doing recently */
  recentActivity: {
    pagesVisited: string[]
    featuresUsed: string[]
    lastActive: Date | null
    totalInteractions: number
  }
  /** What they've asked before */
  conversationHistory: {
    recentQuestions: string[]
    topicsDiscussed: string[]
    lastConversation: { agentRole: string; summary: string } | null
  }
  /** What we know about them from ClientMemory */
  memory: {
    preferences: string[]
    painPoints: string[]
    opportunities: string[]
    style: string | null
    context: string[]
  }
  /** Their evaluation experience */
  evaluationContext: {
    sessionsParticipated: number
    evaluationsSubmitted: number
    lastSessionDate: Date | null
  }
  /** What they haven't explored (blind spots) */
  blindSpots: string[]
  /** Current page context */
  currentPage: string | null
}

// ── Main Engine ──────────────────────────────────────────────────────────────

export async function buildClientContext(
  userId: string,
  tenantId: string,
  prisma: PrismaClient,
  currentPage?: string
): Promise<ClientContext> {
  const p = prisma as any

  // Run all queries in parallel
  const [
    user,
    company,
    memories,
    recentInteractions,
    recentConversations,
    sessionCount,
    evalCount,
    lastSession,
  ] = await Promise.all([
    // User identity
    p.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true, role: true, jobTitle: true, tenantId: true },
    }),
    // Company profile
    p.companyProfile.findFirst({
      where: { tenantId },
      select: { name: true, industry: true, size: true, mission: true, vision: true, values: true },
    }),
    // ClientMemory
    p.clientMemory.findMany({
      where: { tenantId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      orderBy: { importance: "desc" },
      take: 30,
    }),
    // Recent interactions (last 7 days)
    p.interactionLog.findMany({
      where: { userId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }).catch(() => []),
    // Recent conversations (last 5)
    p.conversationThread.findMany({
      where: { userId, isActive: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { messages: { orderBy: { createdAt: "desc" }, take: 3, where: { role: "USER" } } },
    }).catch(() => []),
    // Session participation count
    p.sessionParticipant.count({ where: { userId } }).catch(() => 0),
    // Evaluations submitted count
    p.evaluation.count({
      where: { assignment: { userId } },
    }).catch(() => 0),
    // Last session
    p.sessionParticipant.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { session: { select: { name: true, completedAt: true } } },
    }).catch(() => null),
  ])

  // Process memories by category
  const memoryByCategory = groupMemories(memories)

  // Extract recent activity patterns
  const pagesVisited: string[] = Array.from(new Set<string>(recentInteractions
    .filter((i: any) => i.eventType === "PAGE_VIEW" && i.pageRoute)
    .map((i: any) => String(i.pageRoute))))
  const featuresUsed: string[] = Array.from(new Set<string>(recentInteractions
    .filter((i: any) => i.eventType === "FEATURE_USE" && i.detail)
    .map((i: any) => String(i.detail))))

  // Extract conversation patterns
  const recentQuestions: string[] = recentConversations
    .flatMap((t: any) => t.messages.map((m: any) => m.content as string))
    .slice(0, 10)
  const topicsDiscussed: string[] = recentConversations.map((t: any) => String(t.agentRole))
  const lastConvo = recentConversations[0]

  // Detect blind spots — features available but never used
  const allFeatures = [
    "jobs", "sessions", "compensation", "pay-gap", "reports",
    "ai-tools", "settings", "employee-portal",
  ]
  const visitedFeatures = new Set(pagesVisited.map((p: string) => p.split("/")[1] || p))
  const blindSpots = allFeatures.filter(f => !visitedFeatures.has(f))

  return {
    identity: {
      userId,
      tenantId,
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      role: user?.role || "USER",
      jobTitle: user?.jobTitle || undefined,
    },
    company: {
      name: company?.name || "",
      industry: company?.industry || undefined,
      size: company?.size || undefined,
      mission: company?.mission || undefined,
      vision: company?.vision || undefined,
      values: company?.values || [],
    },
    recentActivity: {
      pagesVisited: pagesVisited.slice(0, 15),
      featuresUsed: featuresUsed.slice(0, 10),
      lastActive: recentInteractions[0]?.createdAt || null,
      totalInteractions: recentInteractions.length,
    },
    conversationHistory: {
      recentQuestions,
      topicsDiscussed: [...new Set(topicsDiscussed)],
      lastConversation: lastConvo
        ? { agentRole: lastConvo.agentRole, summary: lastConvo.title || "Conversație recentă" }
        : null,
    },
    memory: {
      preferences: memoryByCategory.PREFERENCE || [],
      painPoints: memoryByCategory.PAIN_POINT || [],
      opportunities: memoryByCategory.OPPORTUNITY || [],
      style: (memoryByCategory.STYLE || [])[0] || null,
      context: memoryByCategory.CONTEXT || [],
    },
    evaluationContext: {
      sessionsParticipated: sessionCount,
      evaluationsSubmitted: evalCount,
      lastSessionDate: lastSession?.createdAt || null,
    },
    blindSpots,
    currentPage: currentPage || null,
  }
}

// ── Format Context for System Prompt ─────────────────────────────────────────

export function formatContextForPrompt(ctx: ClientContext): string {
  const sections: string[] = []

  // Identity
  sections.push(`UTILIZATOR: ${ctx.identity.firstName} ${ctx.identity.lastName} (${ctx.identity.role})${ctx.identity.jobTitle ? `, ${ctx.identity.jobTitle}` : ""}`)

  // Company
  if (ctx.company.name) {
    sections.push(`COMPANIE: ${ctx.company.name}${ctx.company.industry ? ` (${ctx.company.industry})` : ""}${ctx.company.size ? `, ${ctx.company.size}` : ""}`)
    if (ctx.company.mission) sections.push(`  Misiune: ${ctx.company.mission}`)
    if (ctx.company.values.length > 0) sections.push(`  Valori: ${ctx.company.values.join(", ")}`)
  }

  // What they've been doing
  if (ctx.recentActivity.totalInteractions > 0) {
    sections.push(`ACTIVITATE RECENTĂ (7 zile): ${ctx.recentActivity.totalInteractions} interacțiuni`)
    if (ctx.recentActivity.pagesVisited.length > 0) {
      sections.push(`  Pagini: ${ctx.recentActivity.pagesVisited.slice(0, 8).join(", ")}`)
    }
    if (ctx.recentActivity.featuresUsed.length > 0) {
      sections.push(`  Funcționalități: ${ctx.recentActivity.featuresUsed.join(", ")}`)
    }
  }

  // What they've asked before
  if (ctx.conversationHistory.recentQuestions.length > 0) {
    sections.push(`ÎNTREBĂRI ANTERIOARE:`)
    ctx.conversationHistory.recentQuestions.slice(0, 5).forEach((q, i) => {
      sections.push(`  ${i + 1}. "${q.substring(0, 120)}"`)
    })
  }

  // Memory insights
  if (ctx.memory.style) sections.push(`STIL COMUNICARE: ${ctx.memory.style}`)
  if (ctx.memory.preferences.length > 0) sections.push(`PREFERINȚE: ${ctx.memory.preferences.join("; ")}`)
  if (ctx.memory.painPoints.length > 0) sections.push(`FRUSTRĂRI CUNOSCUTE: ${ctx.memory.painPoints.join("; ")}`)
  if (ctx.memory.context.length > 0) sections.push(`CONTEXT BUSINESS: ${ctx.memory.context.join("; ")}`)

  // Evaluation experience
  if (ctx.evaluationContext.sessionsParticipated > 0) {
    sections.push(`EXPERIENȚĂ EVALUARE: ${ctx.evaluationContext.sessionsParticipated} sesiuni, ${ctx.evaluationContext.evaluationsSubmitted} evaluări`)
  } else {
    sections.push(`EXPERIENȚĂ EVALUARE: Niciuna — utilizator nou în evaluări`)
  }

  // Blind spots — what they haven't explored
  if (ctx.blindSpots.length > 0) {
    sections.push(`FUNCȚIONALITĂȚI NEEXPLORATE: ${ctx.blindSpots.join(", ")}`)
  }

  // Current page
  if (ctx.currentPage) {
    sections.push(`PAGINA CURENTĂ: ${ctx.currentPage}`)
  }

  return sections.join("\n")
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function groupMemories(memories: any[]): Record<string, string[]> {
  const grouped: Record<string, string[]> = {}
  for (const m of memories) {
    if (!grouped[m.category]) grouped[m.category] = []
    grouped[m.category].push(m.content)
  }
  return grouped
}
