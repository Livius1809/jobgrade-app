/**
 * KB Self-Completion — Mecanism de auto-completare L2
 *
 * Când un agent (L4 sau L2) detectează un gap de cunoaștere:
 *   1. Caută în KB propriu (semantic search)
 *   2. Caută în KB-ul consultanților L2 relevanți
 *   3. Dacă nu găsește → Claude generează entry targeted
 *   4. Dacă nici Claude nu poate → escalează la Owner prin Inbox
 *
 * Folosit de:
 *   - self-cycle (agent detectează gap față de obiectiv)
 *   - team-cycle (manager detectează gap la subordonat)
 *   - orice agent care primește task și nu are cunoașterea necesară
 */

import { prisma } from "@/lib/prisma"
import { searchKB } from "@/lib/kb/search"
import Anthropic from "@anthropic-ai/sdk"

export interface KBGap {
  agentRole: string        // cine are nevoie
  topic: string            // ce cunoaștere lipsește
  objectiveCode?: string   // în raport cu ce obiectiv
  context?: string         // context suplimentar
}

export interface SelfCompleteResult {
  gap: KBGap
  resolved: boolean
  source: "kb-own" | "kb-l2" | "claude-generated" | "escalated-owner"
  entriesCreated: number
  message: string
}

// Consultanți L2 care pot fi interogați
const L2_ROLES = ["PPA", "PSE", "PSYCHOLINGUIST", "SCA", "PPMO", "MGA", "SVHA", "SOC", "STA", "ACEA", "NSA", "PCM", "PTA"]

/**
 * Încearcă să rezolve un gap de cunoaștere automat.
 * Escalează la Owner doar dacă nu poate.
 */
export async function selfComplete(gap: KBGap): Promise<SelfCompleteResult> {
  const p = prisma as any

  // ── Pas 1: Caută în KB propriu ──────────────────────────
  try {
    const ownResults = await searchKB(gap.agentRole, gap.topic, 3)
    if (ownResults.length > 0 && (ownResults[0].similarity ?? 0) > 0.75) {
      return {
        gap,
        resolved: true,
        source: "kb-own",
        entriesCreated: 0,
        message: `Gasit in KB propriu (${ownResults.length} entries, relevanta ${Math.round((ownResults[0].similarity ?? 0) * 100)}%)`,
      }
    }
  } catch { /* search indisponibil — continuă */ }

  // ── Pas 2: Caută în KB L2 ──────────────────────────────
  try {
    for (const l2Role of L2_ROLES) {
      const l2Results = await searchKB(l2Role, gap.topic, 3)
      if (l2Results.length > 0 && (l2Results[0].similarity ?? 0) > 0.70) {
        // Propagă entry-ul L2 la agentul solicitant
        const bestEntry = l2Results[0]
        await p.kBEntry.create({
          data: {
            agentRole: gap.agentRole,
            kbType: "SHARED_DOMAIN",
            content: bestEntry.content,
            tags: [...(bestEntry.tags || []), "auto-completed", `from:${l2Role}`],
            confidence: Math.min(0.85, (bestEntry.confidence ?? 0.5) * 0.9),
            source: "PROPAGATED",
            status: "PERMANENT",
            usageCount: 0,
            validatedAt: new Date(),
            propagatedFrom: l2Role,
          },
        })

        return {
          gap,
          resolved: true,
          source: "kb-l2",
          entriesCreated: 1,
          message: `Gasit la ${l2Role} si propagat (relevanta ${Math.round((l2Results[0].similarity ?? 0) * 100)}%)`,
        }
      }
    }
  } catch { /* search L2 indisponibil — continuă */ }

  // ── Pas 3: Generare CREATIVĂ — brainstorm cu resursele adunate ──
  // Se activează doar dacă agentul are subordonați (manager)
  try {
    const { getDirectSubordinates } = await import("@/lib/agents/hierarchy-enforcer")
    const subs = await getDirectSubordinates(gap.agentRole)
    if (subs.length >= 2) {
      const { maybeTrigerBrainstorm } = await import("@/lib/agents/proactive-brainstorm")
      const brainstorm = await maybeTrigerBrainstorm({
        managerRole: gap.agentRole,
        trigger: "new-objective",
        title: gap.topic,
        context: gap.context || "",
      })
      if (brainstorm.triggered && brainstorm.topIdea) {
        // Brainstorm-ul a generat cunoaștere nouă — salvăm în KB
        await p.kBEntry.create({
          data: {
            agentRole: gap.agentRole,
            kbType: "SHARED_DOMAIN",
            content: `[Brainstorm echipă] ${brainstorm.topIdea}`,
            tags: ["brainstorm-generated", "creative-composition", gap.objectiveCode || "general"].filter(Boolean),
            confidence: 0.60,
            source: "DISTILLED_INTERACTION",
            status: "PERMANENT",
            usageCount: 0,
            validatedAt: new Date(),
          },
        })
        return {
          gap,
          resolved: true,
          source: "kb-own" as const,
          entriesCreated: 1,
          message: `Rezolvat prin brainstorm echipa (${brainstorm.ideasGenerated} idei, top: ${brainstorm.topIdea?.slice(0, 80)})`,
        }
      }
    }
  } catch { /* brainstorm indisponibil — continuă */ }

  // ── Pas 4: Identificare GAP — cunoastere sau competenta? ──
  // 4a. Gap cunoastere → agentul are mandatul dar nu stie cum → pas 5
  // 4b. Gap competenta → niciun agent nu are mandatul → reconfigurare fise post
  try {
    const { getDirectSubordinates, getDirectSuperior } = await import("@/lib/agents/hierarchy-enforcer")
    const superior = await getDirectSuperior(gap.agentRole)
    if (superior) {
      const siblings = await getDirectSubordinates(superior)
      let anyPeerHasCompetency = false
      for (const peer of siblings) {
        if (peer === gap.agentRole) continue
        try {
          const peerResults = await searchKB(peer, gap.topic, 2)
          if (peerResults.length > 0 && (peerResults[0].similarity ?? 0) > 0.60) {
            anyPeerHasCompetency = true
            break
          }
        } catch {}
      }
      if (!anyPeerHasCompetency) {
        await p.agentTask.create({
          data: {
            businessId: "biz_jobgrade",
            assignedBy: gap.agentRole,
            assignedTo: superior,
            title: "[Gap competenta] Reconfigurare atributii: " + gap.topic.slice(0, 60),
            description: `Agentul ${gap.agentRole} a identificat gap de COMPETENTA. Nimeni nu are mandatul pentru: ${gap.topic}. Actiune: 1. Identifica agentul potrivit 2. Reconfigureaza fisa post 3. Cold start KB 4. APOI Claude pe filiera specifica.`,
            taskType: "PROCESS_EXECUTION",
            priority: "IMPORTANT",
            status: "ASSIGNED",
            tags: ["competency-gap", "reconfigurare"],
          },
        }).catch(() => {})
      }
    }
  } catch {}

  // ── Pas 5: Claude generează entry targeted (ULTIMUL resort) ��─
  try {
    const client = new Anthropic()
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `Esti consultant expert. Genereaza cunoastere actionabila pe un subiect specific.
Raspunde STRICT cu JSON:
{
  "canAnswer": true/false,
  "confidence": 0.0-1.0,
  "content": "2-4 propozitii concrete, actionabile",
  "tags": ["tag1", "tag2"]
}
Daca nu ai cunoastere suficienta pe acest subiect specific, pune canAnswer: false.`,
      messages: [{
        role: "user",
        content: `Agent: ${gap.agentRole}
Subiect necesar: ${gap.topic}
${gap.objectiveCode ? `Obiectiv: ${gap.objectiveCode}` : ""}
${gap.context ? `Context: ${gap.context}` : ""}

Genereaza cunoastere actionabila pe acest subiect.`,
      }],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""
    const parsed = JSON.parse(text)

    if (parsed.canAnswer && parsed.confidence >= 0.5 && parsed.content?.length > 30) {
      await p.kBEntry.create({
        data: {
          agentRole: gap.agentRole,
          kbType: "SHARED_DOMAIN",
          content: parsed.content,
          tags: [...(parsed.tags || []), "auto-completed", "claude-generated", gap.objectiveCode || "general"].filter(Boolean),
          confidence: Math.min(0.65, parsed.confidence), // cap la 0.65 — e generat, nu validat
          source: "SELF_INTERVIEW",
          status: "PERMANENT",
          usageCount: 0,
          validatedAt: new Date(),
        },
      })

      return {
        gap,
        resolved: true,
        source: "claude-generated",
        entriesCreated: 1,
        message: `Claude a generat cunoastere (conf: ${parsed.confidence})`,
      }
    }
  } catch { /* Claude indisponibil sau parse error */ }

  // ── Pas 5: Claude targeted (ULTIMUL resort, DOAR pe gap cunoastere) ──
  const owner = await p.user.findFirst({
    where: { role: { in: ["OWNER", "SUPER_ADMIN"] } },
    select: { id: true },
  })

  if (owner) {
    await p.notification.create({
      data: {
        userId: owner.id,
        type: "GENERAL",
        title: `Gap cunoastere: ${gap.agentRole} are nevoie de sursa pe "${gap.topic}"`,
        body: [
          `Agentul ${gap.agentRole} a detectat ca nu are cunoastere suficienta pe:`,
          `**${gap.topic}**`,
          gap.objectiveCode ? `In raport cu obiectivul: ${gap.objectiveCode}` : "",
          gap.context || "",
          "",
          "Am cautat in KB propriu, la consultantii L2 si am incercat sa generez cu Claude — fara succes.",
          "Actiune necesara: incarca o sursa (carte, curs, articol) in Biblioteca echipei pe acest subiect.",
        ].filter(Boolean).join("\n"),
        read: false,
        sourceRole: gap.agentRole,
        requestKind: "INFORMATION",
        requestData: JSON.stringify({
          whatIsNeeded: `Sursa de cunoastere pe: ${gap.topic}`,
          context: `Agentul ${gap.agentRole} nu poate avansa pe obiectivul ${gap.objectiveCode || "curent"} fara aceasta cunoastere.`,
        }),
      },
    })
  }

  return {
    gap,
    resolved: false,
    source: "escalated-owner",
    entriesCreated: 0,
    message: `Nu am gasit cunoastere pe "${gap.topic}" — escalat la Owner prin Inbox`,
  }
}

/**
 * Rezolvă multiple gap-uri (batch).
 */
export async function selfCompleteBatch(gaps: KBGap[]): Promise<SelfCompleteResult[]> {
  const results: SelfCompleteResult[] = []
  for (const gap of gaps) {
    results.push(await selfComplete(gap))
  }
  return results
}
