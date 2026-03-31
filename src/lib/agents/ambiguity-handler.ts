/**
 * ambiguity-handler.ts — Toleranță la ambiguitate
 *
 * Permite agenților să ia decizii cu informații incomplete:
 * 1. Identifică ce știu, ce nu știu, și ce presupun
 * 2. Iau decizia cea mai bună cu ce au
 * 3. Notează explicit asumările și riscurile
 * 4. Marchează puncte de revenire (checkpoints) pentru revizuire
 *
 * Injectabil în orice prompt de decizie.
 */

export interface AmbiguityAssessment {
  known: string[]        // ce știm sigur
  unknown: string[]      // ce nu știm
  assumptions: string[]  // ce presupunem
  decision: string       // decizia luată
  confidence: number     // 0-100 cât de siguri suntem
  revisitWhen: string[]  // când trebuie revizuită decizia
  risks: string[]        // ce se poate întâmpla dacă asumările sunt greșite
}

/**
 * Format ambiguity handling instructions for any prompt.
 */
export function getAmbiguityPromptSection(context?: string): string {
  return `
PROTOCOL AMBIGUITATE — Dacă informațiile sunt incomplete:
1. Listează CE ȘTII SIGUR (fapte verificate)
2. Listează CE NU ȘTII (informații lipsă)
3. Listează CE PRESUPUI (asumări pe care le faci)
4. IA DECIZIA cea mai bună cu ce ai — nu amâna
5. Notează CÂND TREBUIE REVIZUITĂ decizia (ce informație nouă ar schimba-o)
6. Estimează RISCURILE dacă asumările sunt greșite
${context ? `\nCONTEXT SPECIFIC: ${context}` : ""}

Format răspuns suplimentar (adaugă la finalul oricărei decizii):
{
  "ambiguity": {
    "known": ["fapt 1", "fapt 2"],
    "unknown": ["lipsă 1"],
    "assumptions": ["presupun că..."],
    "confidence": 0-100,
    "revisitWhen": ["dacă aflăm X", "peste Y zile"],
    "risks": ["risc dacă greșim"]
  }
}

PRINCIPIU: O decizie imperfectă azi > o decizie perfectă peste o lună.`
}

/**
 * Quick assess — parse ambiguity section from AI response.
 */
export function parseAmbiguityFromResponse(text: string): AmbiguityAssessment | null {
  try {
    const match = text.match(/"ambiguity"\s*:\s*(\{[\s\S]*?\})\s*\}/)
    if (!match) return null
    const parsed = JSON.parse(match[1] + "}")
    return {
      known: parsed.known || [],
      unknown: parsed.unknown || [],
      assumptions: parsed.assumptions || [],
      decision: "",
      confidence: parsed.confidence || 50,
      revisitWhen: parsed.revisitWhen || [],
      risks: parsed.risks || [],
    }
  } catch {
    return null
  }
}
