import { cpuCall } from "@/lib/cpu/gateway"
import { prisma } from "@/lib/prisma"
import { generateEmbedding } from "./embeddings"

const MODEL = "claude-sonnet-4-20250514"

interface DistillResult {
  agentRole: string
  sessionsProcessed: number
  insightsExtracted: number
  buffersCreated: number
  errors: string[]
}

/**
 * Distilare post-sesiune: extrage pattern-uri generalizabile din conversații recente.
 *
 * Flow:
 * 1. Citește conversații finalizate (ultimele N ore) care nu au fost procesate
 * 2. Trimite transcript-ul la Claude cu prompt de distilare
 * 3. Salvează insight-urile în KB buffer (cu merge dacă existent)
 * 4. Marchează conversația ca procesată
 */
export async function distillRecentSessions(options?: {
  agentRole?: string
  hoursBack?: number
  maxSessions?: number
  dryRun?: boolean
}): Promise<DistillResult[]> {
  const { agentRole, hoursBack = 24, maxSessions = 20, dryRun = false } = options ?? {}
  const p = prisma as any
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000)

  // Find conversation threads with enough messages, not yet distilled
  const whereClause: any = {
    updatedAt: { gte: since },
    messages: { some: {} },
    // Use metadata to track distilled status
    NOT: { title: { startsWith: "[DISTILLED]" } },
  }
  if (agentRole) whereClause.agentRole = agentRole

  const threads = await p.conversationThread.findMany({
    where: whereClause,
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
    take: maxSessions,
    orderBy: { updatedAt: "desc" },
  })

  if (threads.length === 0) return []

  // Group by agent role
  const byRole = new Map<string, typeof threads>()
  for (const t of threads) {
    const role = t.agentRole || "UNKNOWN"
    if (!byRole.has(role)) byRole.set(role, [])
    byRole.get(role)!.push(t)
  }

  const results: DistillResult[] = []

  for (const [role, roleThreads] of byRole) {
    const result: DistillResult = {
      agentRole: role,
      sessionsProcessed: 0,
      insightsExtracted: 0,
      buffersCreated: 0,
      errors: [],
    }

    for (const thread of roleThreads) {
      if (thread.messages.length < 3) continue // skip trivial conversations

      try {
        const transcript = thread.messages
          .map((m: any) => `[${m.role}]: ${m.content}`)
          .join("\n\n")
          .slice(0, 6000) // limit to avoid token overflow

        const cpuResult = await cpuCall({
          model: MODEL,
          max_tokens: 800,
          system: `Ești un sistem de distilare a cunoștințelor. Extragi PATTERN-URI GENERALIZABILE dintr-o conversație agent-client.

REGULI:
- Extrage DOAR insight-uri care pot fi reutilizate în conversații viitoare similare
- NU extrage fapte specifice clientului (nume, date, numere concrete)
- Fiecare insight pe o linie separată, prefixat cu "- "
- Maxim 5 insight-uri per conversație
- Formulează ca regulă/ghid, nu ca observație
- Limba: română

EXEMPLU BUN: "- Când clientul menționează 'nu am buget', reformulează ca investiție cu ROI concret, nu ca cost"
EXEMPLU RĂU: "- Clientul Ion de la Firma X nu avea buget" (prea specific)`,
          messages: [
            {
              role: "user",
              content: `Distilează insight-uri generalizabile din această conversație a agentului ${role}:\n\n${transcript}`,
            },
          ],
          agentRole: role,
          operationType: "kb-distill-session",
        })

        const text = cpuResult.text
        const insights = text
          .split("\n")
          .filter((l) => l.trim().startsWith("- "))
          .map((l) => l.trim().slice(2).trim())
          .filter((l) => l.length > 20)

        result.sessionsProcessed++
        result.insightsExtracted += insights.length

        if (!dryRun && insights.length > 0) {
          for (const insight of insights) {
            // Check for existing similar buffer
            const fingerprint = insight.slice(0, 100).trim()
            const existing = await prisma.kBBuffer.findFirst({
              where: {
                agentRole: role,
                status: "PENDING",
                rawContent: { startsWith: fingerprint },
              },
            })

            if (existing) {
              await prisma.kBBuffer.update({
                where: { id: existing.id },
                data: { occurrences: { increment: 1 } },
              })
            } else {
              await prisma.kBBuffer.create({
                data: {
                  agentRole: role,
                  rawContent: insight,
                  sessionRef: thread.id,
                },
              })
              result.buffersCreated++
            }
          }

          // Mark thread as distilled
          await p.conversationThread.update({
            where: { id: thread.id },
            data: { title: `[DISTILLED] ${(thread.title || "").slice(0, 70)}` },
          })
        }
      } catch (err) {
        result.errors.push(
          `Thread ${thread.id}: ${err instanceof Error ? err.message : "unknown"}`
        )
      }
    }

    results.push(result)
  }

  return results
}

/**
 * Generează embedding pentru un KB entry promovat (post-promote hook).
 * Apelat după ce un buffer e promovat la PERMANENT.
 */
export async function embedNewEntry(entryId: string): Promise<boolean> {
  try {
    const entry = await prisma.kBEntry.findUnique({
      where: { id: entryId },
      select: { content: true },
    })
    if (!entry) return false

    const embedding = await generateEmbedding(entry.content, "document")
    const vecStr = `[${embedding.join(",")}]`

    await prisma.$executeRawUnsafe(
      `UPDATE kb_entries SET embedding = $1::vector WHERE id = $2`,
      vecStr,
      entryId
    )
    return true
  } catch {
    return false
  }
}
