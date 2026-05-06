/**
 * contextual-enrichment.ts — Pre-call prompt enrichment (06.05.2026)
 *
 * ARHITECTURA: INAINTE de a trimite intrebarea catre Claude,
 * agentul isi GANDESTE contextul specific.
 *
 * Analogie umana: inainte sa intrebi expertul, te gandesti la
 * SITUATIA TA specifica ca sa pui intrebarea POTRIVITA, nu una generica.
 *
 * Adauga:
 * - Contextul de domeniu al agentului (ce stie din KB)
 * - Contextul organizational (profilul companiei, starea curenta)
 * - Istoric recent (ce s-a intamplat recent in acest domeniu)
 * - Constrangeri si valori (ce conteaza pentru aceasta organizatie)
 * - Obiective active (ce incercam sa realizam)
 *
 * NU e o corectie a promptului — e o IMBOGATIRE cu context specific.
 * Diferenta: "Ce facem cu angajatul X?" vs
 *   "In contextul firmei Y din industria Z, cu valori A/B/C,
 *    avand obiectivul D activ, ce facem cu angajatul X?"
 */

import { prisma } from "@/lib/prisma"

// ── Types ──────────────────────────────────────────────────────────────────

interface EnrichmentContext {
  agentDescription: string
  objectives: string[]
  kbSummaries: string[]
  companyProfile: {
    industry: string | null
    size: string | null
    values: string[]
    mission: string | null
  } | null
  recentResults: string[]
}

// ── Data loading helpers ──────────────────────────────────────────────────

async function loadAgentContext(agentRole: string): Promise<{
  description: string
  objectives: string[]
}> {
  try {
    const agent = await prisma.agentDefinition.findUnique({
      where: { agentRole },
      select: { description: true, objectives: true },
    })
    return {
      description: agent?.description ?? agentRole,
      objectives: agent?.objectives ?? [],
    }
  } catch {
    return { description: agentRole, objectives: [] }
  }
}

async function loadTopKBEntries(agentRole: string, limit: number = 5): Promise<string[]> {
  try {
    const entries = await prisma.kBEntry.findMany({
      where: {
        agentRole,
        status: "PERMANENT",
      },
      orderBy: { confidence: "desc" },
      take: limit,
      select: { content: true, confidence: true },
    })
    return entries.map(
      (e) => `[conf=${e.confidence.toFixed(2)}] ${e.content.slice(0, 200)}`,
    )
  } catch {
    return []
  }
}

async function loadCompanyProfile(tenantId: string): Promise<EnrichmentContext["companyProfile"]> {
  try {
    const profile = await prisma.companyProfile.findUnique({
      where: { tenantId },
      select: {
        industry: true,
        size: true,
        values: true,
        mission: true,
      },
    })
    if (!profile) return null
    return {
      industry: profile.industry,
      size: profile.size,
      values: profile.values,
      mission: profile.mission,
    }
  } catch {
    return null
  }
}

async function loadRecentTaskResults(agentRole: string, limit: number = 5): Promise<string[]> {
  try {
    const tasks = await prisma.agentTask.findMany({
      where: {
        assignedTo: agentRole,
        status: "COMPLETED",
      },
      orderBy: { completedAt: "desc" },
      take: limit,
      select: {
        title: true,
        result: true,
        completedAt: true,
      },
    })
    return tasks.map(
      (t) =>
        `"${t.title}" → ${(t.result ?? "fara rezultat").slice(0, 150)} (${t.completedAt?.toISOString().slice(0, 10) ?? "?"})`,
    )
  } catch {
    return []
  }
}

// ── Main enrichment function ──────────────────────────────────────────────

/**
 * Enriches a prompt with the agent's specific context before sending to Claude.
 *
 * Human analogy: before asking the expert, you think about YOUR specific situation
 * so you ask the RIGHT question, not a generic one.
 *
 * @param originalPrompt - The original prompt/question
 * @param agentRole - The agent making the call
 * @param tenantId - Optional tenant ID for organizational context
 * @returns Enriched prompt with context prepended
 */
export async function enrichPromptWithContext(
  originalPrompt: string,
  agentRole: string,
  tenantId?: string,
): Promise<string> {
  // Load all context in parallel
  const [agentCtx, kbSummaries, companyProfile, recentResults] = await Promise.all([
    loadAgentContext(agentRole),
    loadTopKBEntries(agentRole, 5),
    tenantId ? loadCompanyProfile(tenantId) : Promise.resolve(null),
    loadRecentTaskResults(agentRole, 5),
  ])

  // Build enrichment context
  const context: EnrichmentContext = {
    agentDescription: agentCtx.description,
    objectives: agentCtx.objectives,
    kbSummaries,
    companyProfile,
    recentResults,
  }

  // If we have no context at all, return original prompt unchanged
  const hasContext =
    context.objectives.length > 0 ||
    context.kbSummaries.length > 0 ||
    context.companyProfile !== null ||
    context.recentResults.length > 0

  if (!hasContext) return originalPrompt

  // Build enriched prompt
  return buildEnrichedPrompt(originalPrompt, agentRole, context)
}

// ── Prompt builder ────────────────────────────────────────────────────────

function buildEnrichedPrompt(
  originalPrompt: string,
  agentRole: string,
  context: EnrichmentContext,
): string {
  const sections: string[] = []

  sections.push("[CONTEXT SPECIFIC]")
  sections.push(`Agent: ${agentRole} — responsabilitate: ${context.agentDescription.slice(0, 300)}`)

  // Organizational context
  if (context.companyProfile) {
    const cp = context.companyProfile
    const parts: string[] = []
    if (cp.industry) parts.push(cp.industry)
    if (cp.size) parts.push(`${cp.size} angajati`)
    if (cp.values.length > 0) parts.push(`valori: ${cp.values.slice(0, 5).join(", ")}`)
    if (parts.length > 0) {
      sections.push(`Organizatie: ${parts.join(", ")}`)
    }
    if (cp.mission) {
      sections.push(`Misiune: ${cp.mission.slice(0, 200)}`)
    }
  }

  // Active objectives
  if (context.objectives.length > 0) {
    sections.push(`Obiective active: ${context.objectives.slice(0, 5).join("; ")}`)
  }

  // KB summaries
  if (context.kbSummaries.length > 0) {
    sections.push(`Cunostinte relevante:\n${context.kbSummaries.map((s) => `  - ${s}`).join("\n")}`)
  }

  // Recent results
  if (context.recentResults.length > 0) {
    sections.push(
      `Istoric recent:\n${context.recentResults.map((r) => `  - ${r}`).join("\n")}`,
    )
  }

  sections.push("")
  sections.push("[INTREBAREA]")
  sections.push(originalPrompt)
  sections.push("")
  sections.push("[INSTRUCTIUNE]")
  sections.push(
    "Raspunsul trebuie sa tina cont de contextul specific de mai sus. " +
      "Nu da sfaturi generice — adapteaza la situatia concreta a acestui agent si a acestei organizatii.",
  )

  return sections.join("\n")
}

/**
 * Enriches a messages array by prepending context to the first user message.
 * Used by criticalCpuCall to enrich before the cpuCall.
 */
export async function enrichMessagesWithContext(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  agentRole: string,
  tenantId?: string,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  if (messages.length === 0) return messages

  // Find the first user message and enrich it
  const enrichedMessages = [...messages]
  const firstUserIdx = enrichedMessages.findIndex((m) => m.role === "user")
  if (firstUserIdx === -1) return messages

  const originalContent = enrichedMessages[firstUserIdx].content
  const enrichedContent = await enrichPromptWithContext(originalContent, agentRole, tenantId)

  enrichedMessages[firstUserIdx] = {
    ...enrichedMessages[firstUserIdx],
    content: enrichedContent,
  }

  return enrichedMessages
}
