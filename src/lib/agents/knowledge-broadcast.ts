/**
 * knowledge-broadcast.ts — Propagare cunoștințe validate la TOATĂ echipa
 *
 * Când o idee din brainstorming e validată (score >= 75) sau o decizie strategică
 * e luată, insight-ul se propagă la TOȚI agenții activi, nu doar la participanți.
 *
 * Scopul: creștere omogenă a echipei. Experiența unora → salt calitativ la toți.
 *
 * Tipuri de broadcast:
 * 1. BRAINSTORM_INSIGHT — idee validată cu scor mare
 * 2. STRATEGIC_DECISION — decizie Owner/COG
 * 3. LESSON_LEARNED — lecție din negociere, reflecție, sentinel
 * 4. MARKET_INTEL — informație piață relevantă pentru toți
 */

import type { PrismaClient } from "@/generated/prisma"

export interface BroadcastItem {
  content: string
  type: "BRAINSTORM_INSIGHT" | "STRATEGIC_DECISION" | "LESSON_LEARNED" | "MARKET_INTEL"
  source: string      // agentRole sau "OWNER"
  importance: number   // 0-1
}

/**
 * Broadcast a piece of knowledge to ALL active agents.
 */
export async function broadcastToAll(
  item: BroadcastItem,
  prisma: PrismaClient
): Promise<number> {
  const p = prisma as any

  const agents = await p.agentDefinition.findMany({
    where: { isActive: true },
    select: { agentRole: true },
  })

  let created = 0
  for (const agent of agents) {
    try {
      await p.kBEntry.create({
        data: {
          agentRole: agent.agentRole,
          kbType: "SHARED_DOMAIN",
          content: `[BROADCAST/${item.type}] ${item.content}`,
          source: "PROPAGATED",
          confidence: item.importance,
          status: "PERMANENT",
          tags: ["broadcast", item.type.toLowerCase(), `from:${item.source.toLowerCase()}`],
          usageCount: 0,
          propagatedFrom: item.source,
          validatedAt: new Date(),
        },
      })
      created++
    } catch { /* duplicate or error — skip */ }
  }

  console.log(`[BROADCAST] KB entry → ${created}/${agents.length} agenți`)
  return created
}

/**
 * Broadcast top ideas from a brainstorm session to all agents.
 * Only ideas with score >= threshold.
 */
export async function broadcastBrainstormResults(
  sessionId: string,
  prisma: PrismaClient,
  scoreThreshold: number = 75
): Promise<{ ideasBroadcast: number; totalReach: number }> {
  const p = prisma as any

  const session = await p.brainstormSession.findUnique({
    where: { id: sessionId },
    select: { topic: true, initiatedBy: true },
  })
  if (!session) return { ideasBroadcast: 0, totalReach: 0 }

  const topIdeas = await p.brainstormIdea.findMany({
    where: { sessionId, compositeScore: { gte: scoreThreshold } },
    orderBy: { compositeScore: "desc" },
    take: 5,
    select: { title: true, description: true, compositeScore: true, generatedBy: true },
  })

  let totalReach = 0
  for (const idea of topIdeas) {
    const reach = await broadcastToAll({
      content: `Idee validata din brainstorming "${session.topic}": "${idea.title}" (score ${idea.compositeScore}/100, by ${idea.generatedBy}). ${idea.description.substring(0, 150)}`,
      type: "BRAINSTORM_INSIGHT",
      source: idea.generatedBy,
      importance: Math.min(0.8, (idea.compositeScore || 50) / 100),
    }, prisma)
    totalReach += reach
  }

  return { ideasBroadcast: topIdeas.length, totalReach }
}

/**
 * Broadcast a strategic decision from Owner/COG.
 */
export async function broadcastDecision(
  decision: string,
  decidedBy: string,
  prisma: PrismaClient
): Promise<number> {
  return broadcastToAll({
    content: decision,
    type: "STRATEGIC_DECISION",
    source: decidedBy,
    importance: 0.85,
  }, prisma)
}

/**
 * Auto-broadcast: scan recent brainstorms and broadcast unbroadcast results.
 */
export async function autoBroadcastRecent(
  prisma: PrismaClient,
  sinceDays: number = 1
): Promise<{ sessions: number; ideas: number; reach: number }> {
  const p = prisma as any
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000)

  // Find sessions with scored ideas that haven't been broadcast yet
  const sessions = await p.brainstormSession.findMany({
    where: {
      createdAt: { gte: since },
      status: { in: ["EVALUATED", "AGGREGATED", "OWNER_REVIEW", "CLOSED"] },
    },
    select: { id: true, topic: true },
  })

  let totalIdeas = 0
  let totalReach = 0

  for (const session of sessions) {
    // Check if already broadcast (look for broadcast KB entries referencing this session topic)
    const alreadyBroadcast = await p.kBEntry.count({
      where: {
        tags: { has: "broadcast" },
        content: { contains: session.topic.substring(0, 30) },
      },
    })

    if (alreadyBroadcast > 0) continue

    const { ideasBroadcast, totalReach: reach } = await broadcastBrainstormResults(session.id, prisma)
    totalIdeas += ideasBroadcast
    totalReach += reach
  }

  return { sessions: sessions.length, ideas: totalIdeas, reach: totalReach }
}
