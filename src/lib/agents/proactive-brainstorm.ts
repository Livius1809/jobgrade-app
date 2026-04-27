/**
 * proactive-brainstorm.ts — Brainstorming integrat în fluxul de obiective
 *
 * Se activează AUTOMAT în 2 momente:
 *
 * Fluxul de decizie (NU se lansează automat, ci condiționat):
 *
 * 1. Manager primește obiectiv
 * 2. Caută în KB echipei → GĂSEȘTE → descompune din experiență (FĂRĂ brainstorm)
 * 3. Caută în KB echipei → NU GĂSEȘTE → încearcă self-complete (L2, Claude targeted)
 * 4. Self-complete → REZOLVĂ → descompune cu cunoașterea completată (FĂRĂ brainstorm)
 * 5. Self-complete → NU REZOLVĂ → teritoriu complet nou →
 *    ACUM lansează brainstorm: "Cum abordăm asta?"
 *    → Echipa explorează colectiv → idei evaluate pe 6 criterii
 *    → Abordarea câștigătoare devine planul de descompunere
 *
 * La COMPUNEREA SOLUȚIEI (inductiv):
 * - Dacă rezultatele de la subordonați sunt convergente → sinteză directă
 * - Dacă sunt divergente/contradictorii → brainstorm de integrare
 *
 * NU se activează pe taskuri atomice.
 * NU se activează dacă KB-ul echipei acoperă deja subiectul.
 */

import { prisma } from "@/lib/prisma"
import { createBrainstormSession, generateIdeas, evaluateIdeas, aggregateToParent } from "./brainstorm-engine"

export type BrainstormTrigger = "new-objective" | "compose-solution"

export interface ProactiveBrainstormInput {
  /** Cine inițiază (managerul) */
  managerRole: string
  /** Trigger: la primire obiectiv sau la compunere soluție */
  trigger: BrainstormTrigger
  /** Titlul obiectivului / soluției */
  title: string
  /** Context suplimentar */
  context: string
  /** ID-ul task-ului care a declanșat (opțional) */
  taskId?: string
}

export interface ProactiveBrainstormResult {
  triggered: boolean
  sessionId?: string
  ideasGenerated?: number
  topIdea?: string
  reason: string
}

/**
 * Verifică dacă trebuie declanșat brainstorming și îl lansează.
 *
 * SE LANSEAZĂ DOAR când obiectivul este NOU — nu se regăsește
 * în experiența anterioară a nivelului ierarhic imediat inferior.
 * Dacă echipa a mai făcut ceva similar → descompunere din KB, fără brainstorm.
 */
export async function maybeTrigerBrainstorm(
  input: ProactiveBrainstormInput
): Promise<ProactiveBrainstormResult> {
  const p = prisma as any

  // Verifică dacă managerul are subordonați
  const subs = await p.agentRelationship.findMany({
    where: { parentRole: input.managerRole, relationType: "REPORTS_TO", isActive: true },
    select: { childRole: true },
  })

  if (subs.length < 2) {
    return { triggered: false, reason: "Echipa prea mica pentru brainstorm (< 2 subordonati)" }
  }

  // ── VERIFICARE CRITICĂ: obiectivul e NOU sau se regăsește în experiența echipei? ──
  // Caută în KB-ul subordonaților direcți dacă au experiență pe acest topic
  const subRoles = subs.map((s: any) => s.childRole)

  try {
    const { searchKB } = await import("@/lib/kb/search")
    let totalRelevantEntries = 0

    for (const subRole of subRoles.slice(0, 5)) {
      const results = await searchKB(subRole, input.title, 3)
      const relevant = results.filter(r => (r.similarity ?? 0) > 0.70)
      totalRelevantEntries += relevant.length
    }

    // Dacă echipa are suficientă experiență (>= 3 entries relevante) → nu brainstorma
    if (totalRelevantEntries >= 3) {
      return {
        triggered: false,
        reason: `Echipa are experienta pe acest topic (${totalRelevantEntries} KB entries relevante). Descompunere din cunoastere existenta, fara brainstorm.`,
      }
    }
  } catch {
    // Semantic search indisponibil — continuăm cu brainstorm ca safety net
  }

  // Verifică sesiune recentă pe același topic
  const recentSession = await p.brainstormSession.findFirst({
    where: {
      initiatedBy: input.managerRole,
      topic: { contains: input.title.slice(0, 50) },
      createdAt: { gte: new Date(Date.now() - 24 * 3600000) },
    },
  }).catch(() => null)

  if (recentSession) {
    return { triggered: false, reason: "Sesiune brainstorm recenta pe acelasi topic (< 24h)" }
  }

  // Construiește contextul per trigger
  let topic: string
  let context: string

  if (input.trigger === "new-objective") {
    topic = `Cum abordăm: ${input.title}`
    context = [
      `Managerul ${input.managerRole} a primit un obiectiv nou și vrea perspectiva echipei ÎNAINTE de a descompune.`,
      `Obiectiv: ${input.title}`,
      input.context,
      ``,
      `ÎNTREBĂRI PENTRU ECHIPĂ:`,
      `1. Cum am aborda cel mai eficient acest obiectiv?`,
      `2. Ce riscuri vedeți din perspectiva rolului vostru?`,
      `3. Ce dependențe avem față de alte echipe?`,
      `4. Ce putem face din KB-ul existent fără efort suplimentar?`,
      `5. Propuneți o ordine de acțiune.`,
    ].join("\n")
  } else {
    topic = `Cum integrăm: ${input.title}`
    context = [
      `Managerul ${input.managerRole} are rezultate de la echipă și vrea perspectiva tuturor ÎNAINTE de a sintetiza.`,
      `Subiect: ${input.title}`,
      input.context,
      ``,
      `ÎNTREBĂRI PENTRU ECHIPĂ:`,
      `1. Cum vedeți voi integrarea acestor rezultate?`,
      `2. Ce lipsește din perspectiva rolului vostru?`,
      `3. Ce contradicții observați între rezultate?`,
      `4. Care e mesajul principal care reiese?`,
      `5. Ce recomandare ați face nivelului superior?`,
    ].join("\n")
  }

  // Lansează brainstorming
  try {
    const sessionId = await createBrainstormSession(
      input.managerRole,
      topic,
      context,
      prisma,
    )

    // Generează idei de la echipă
    const ideasCount = await generateIdeas(sessionId, prisma)

    // Scorează ideile
    await evaluateIdeas(sessionId, prisma)

    // Extrage ideea top
    const topIdea = await p.brainstormIdea.findFirst({
      where: { sessionId },
      orderBy: { compositeScore: "desc" },
      select: { title: true, description: true, compositeScore: true },
    }).catch(() => null)

    return {
      triggered: true,
      sessionId,
      ideasGenerated: ideasCount,
      topIdea: topIdea ? `${topIdea.title}: ${topIdea.description?.slice(0, 100)}` : undefined,
      reason: `Brainstorm ${input.trigger}: ${ideasCount} idei generate, scorare completata`,
    }
  } catch (e: any) {
    return { triggered: false, reason: `Brainstorm failed: ${e.message?.slice(0, 100)}` }
  }
}

/**
 * Hook pentru task executor: la primirea unui task "[Rafinează și delegă]",
 * declanșează brainstorm ÎNAINTE de descompunere.
 */
export async function brainstormBeforeDecomposition(
  managerRole: string,
  taskTitle: string,
  taskDescription: string,
): Promise<string> {
  const result = await maybeTrigerBrainstorm({
    managerRole,
    trigger: "new-objective",
    title: taskTitle.replace("[Rafinează și delegă] ", ""),
    context: taskDescription,
  })

  if (result.triggered && result.topIdea) {
    return `\n\n--- BRAINSTORM ECHIPĂ (${result.ideasGenerated} idei) ---\nAbordarea recomandată de echipă: ${result.topIdea}\nFolosește această direcție la descompunerea obiectivului în sub-taskuri.`
  }

  return ""
}
