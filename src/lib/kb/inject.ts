import { searchKB } from "./search"

export interface KBInjectOptions {
  agentRole: string
  context: string   // contextul curent: primul mesaj al clientului, descrierea sesiunii etc.
  limit?: number    // default 10
  kbType?: string   // filtrare opțională după tip (METHODOLOGY, PERMANENT etc.)
}

/**
 * Returnează un bloc de text gata de injectat în system prompt-ul unui agent.
 * Dacă nu există intrări relevante, returnează string gol.
 *
 * Utilizare:
 *   const kbContext = await buildKBContext({ agentRole: "HR_COUNSELOR", context: userMessage })
 *   const systemPrompt = `${baseSystemPrompt}\n\n${kbContext}`
 */
export async function buildKBContext(options: KBInjectOptions): Promise<string> {
  const { agentRole, context, limit = 10, kbType } = options

  const entries = await searchKB(agentRole, context, limit, kbType)

  if (entries.length === 0) return ""

  const formatted = entries
    .map(
      (e, i) =>
        `${i + 1}. [${e.kbType}${e.tags.length ? ` | ${e.tags.slice(0, 3).join(", ")}` : ""}]\n${e.content}`
    )
    .join("\n\n")

  return `## Experiență anterioară relevantă

Acestea sunt cunoștințe validate din KB-ul tău, relevante pentru contextul curent.
Folosește-le ca referință — nu le cita literal, ci integrează-le în raționament:

${formatted}

---`
}
