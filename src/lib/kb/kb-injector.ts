import { searchKB, type KBSearchResult } from "./search"

/**
 * Injectează cunoștințe relevante din KB-ul agentului în system prompt.
 * Caută semantic (pgvector) sau full-text (fallback) pe baza mesajului curent.
 *
 * @returns String formatat gata de injectat în system prompt, sau "" dacă nu găsește nimic
 */
export async function injectKBContext(
  agentRole: string,
  userMessage: string,
  options?: {
    limit?: number
    minSimilarity?: number
    includeTypes?: string[]
  }
): Promise<string> {
  const { limit = 7, includeTypes } = options ?? {}

  try {
    // Search for each KB type if specified, otherwise search all
    let results: KBSearchResult[]

    if (includeTypes && includeTypes.length > 0) {
      const searches = includeTypes.map((t) =>
        searchKB(agentRole, userMessage, limit, t)
      )
      const allResults = await Promise.all(searches)
      results = allResults
        .flat()
        .sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))
        .slice(0, limit)
    } else {
      results = await searchKB(agentRole, userMessage, limit)
    }

    if (results.length === 0) return ""

    const entries = results.map((r, i) => {
      const sim = r.similarity
        ? ` (relevanță: ${(r.similarity * 100).toFixed(0)}%)`
        : ""
      const tags = r.tags.length > 0 ? ` [${r.tags.slice(0, 3).join(", ")}]` : ""
      return `${i + 1}. [${r.kbType}]${tags}${sim}\n${r.content}`
    })

    return [
      "--- CUNOȘTINȚE RELEVANTE (din experiență acumulată) ---",
      ...entries,
      "---",
      "Folosește aceste cunoștințe pentru a-ți calibra răspunsul.",
      "Nu le cita direct — integrează-le natural în conversație.",
    ].join("\n")
  } catch {
    return ""
  }
}
