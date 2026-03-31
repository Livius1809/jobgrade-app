/**
 * pair-learning.ts — Sesiuni de mentoring între agent senior și junior
 *
 * Simulează relația mentor-mentee:
 * 1. Senior-ul prezintă un concept/pattern din experiența sa (KB)
 * 2. Junior-ul pune întrebări din perspectiva rolului său
 * 3. Se extrag insight-uri bilaterale → KB pentru ambii
 *
 * Cost: 2 apeluri Claude per sesiune
 * Trigger: automat din reflecție (când un junior are GAP) sau manual
 */

import Anthropic from "@anthropic-ai/sdk"
import type { PrismaClient } from "@/generated/prisma"

const MODEL = "claude-sonnet-4-20250514"

export interface PairLearningResult {
  senior: string
  junior: string
  topic: string
  seniorTeaching: string
  juniorQuestions: string[]
  insights: Array<{ forAgent: string; content: string }>
  kbEntriesAdded: number
  durationMs: number
}

export async function runPairLearning(
  seniorRole: string,
  juniorRole: string,
  topic: string,
  prisma: PrismaClient
): Promise<PairLearningResult> {
  const start = Date.now()
  const p = prisma as any
  const client = new Anthropic()

  // Load agent definitions
  const senior = await p.agentDefinition.findUnique({ where: { agentRole: seniorRole } })
  const junior = await p.agentDefinition.findUnique({ where: { agentRole: juniorRole } })
  if (!senior || !junior) throw new Error("Agent not found")

  // Load senior's top KB entries on topic
  const seniorKB = await p.kBEntry.findMany({
    where: { agentRole: seniorRole, status: "PERMANENT" },
    orderBy: { confidence: "desc" },
    take: 5,
    select: { content: true, confidence: true },
  })

  // Load junior's KB to understand gaps
  const juniorKB = await p.kBEntry.findMany({
    where: { agentRole: juniorRole, status: "PERMANENT" },
    orderBy: { confidence: "desc" },
    take: 3,
    select: { content: true },
  })

  try {
    // Step 1: Senior teaches, Junior asks
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: `SESIUNE MENTORING în platforma JobGrade.

SENIOR (Mentor): ${senior.displayName} (${senior.description})
Experiența seniorului:
${seniorKB.map((e: any) => "- " + e.content.substring(0, 120)).join("\n") || "- Experiență generală"}

JUNIOR (Mentee): ${junior.displayName} (${junior.description})
Ce știe juniorul:
${juniorKB.map((e: any) => "- " + e.content.substring(0, 120)).join("\n") || "- Începător"}

TOPIC: ${topic}

Simulează o sesiune de mentoring:
1. Seniorul PREDĂ: explică topic-ul din experiența sa, cu exemple concrete și lecții învățate (nu teorie, ci practică)
2. Juniorul ÎNTREABĂ: 2-3 întrebări specifice din perspectiva rolului său
3. Seniorul RĂSPUNDE: răspunsuri practice, actionabile
4. INSIGHT-URI BILATERALE: ce a învățat fiecare din interacțiune

Răspunde STRICT JSON:
{
  "seniorTeaching": "Ce predă seniorul (2-3 paragrafe, concret și practic)",
  "juniorQuestions": ["Întrebare 1", "Întrebare 2"],
  "seniorAnswers": ["Răspuns 1", "Răspuns 2"],
  "insights": [
    {"forAgent": "${juniorRole}", "content": "Ce a învățat juniorul"},
    {"forAgent": "${juniorRole}", "content": "Alt insight pentru junior"},
    {"forAgent": "${seniorRole}", "content": "Ce a învățat seniorul din întrebările juniorului"}
  ]
}`,
      }],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : "{}"
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return { senior: seniorRole, junior: juniorRole, topic, seniorTeaching: "", juniorQuestions: [], insights: [], kbEntriesAdded: 0, durationMs: Date.now() - start }

    const parsed = JSON.parse(match[0])

    // Store insights as KB entries
    let kbEntriesAdded = 0
    for (const insight of parsed.insights || []) {
      try {
        await p.kBEntry.create({
          data: {
            agentRole: insight.forAgent,
            kbType: "SHARED_DOMAIN",
            content: `[Mentoring cu ${insight.forAgent === seniorRole ? juniorRole : seniorRole}] ${insight.content}`,
            source: "DISTILLED_INTERACTION",
            confidence: insight.forAgent === juniorRole ? 0.7 : 0.6, // junior learns more
            status: "PERMANENT",
            tags: ["mentoring", "pair-learning", topic.substring(0, 25)],
            usageCount: 0,
            validatedAt: new Date(),
          },
        })
        kbEntriesAdded++
      } catch { /* duplicate */ }
    }

    return {
      senior: seniorRole,
      junior: juniorRole,
      topic,
      seniorTeaching: parsed.seniorTeaching || "",
      juniorQuestions: parsed.juniorQuestions || [],
      insights: parsed.insights || [],
      kbEntriesAdded,
      durationMs: Date.now() - start,
    }
  } catch (e: any) {
    console.warn(`[PAIR-LEARNING] ${seniorRole}→${juniorRole} failed: ${e.message}`)
    return { senior: seniorRole, junior: juniorRole, topic, seniorTeaching: "", juniorQuestions: [], insights: [], kbEntriesAdded: 0, durationMs: Date.now() - start }
  }
}
