/**
 * wild-cards.ts — Provocări deliberate pentru creativitate disruptivă
 *
 * Tehnici de gândire laterală aplicate în brainstorming:
 * 1. Inversiune — "Ce-ar fi dacă am face OPUSUL?"
 * 2. Eliminare — "Ce-ar fi dacă am elimina complet X?"
 * 3. Transfer — "Cum rezolvă industria Y problema asta?"
 * 4. Exagerare — "Ce-ar fi dacă am avea 1000x mai mulți clienți mâine?"
 * 5. Combinare — "Ce-ar fi dacă am combina A cu B?"
 *
 * Wild cards se generează per topic și se injectează în brainstorm.
 * Fiecare participant trebuie să genereze minim 1 idee "disruptivă" pe lângă cele normale.
 */

import Anthropic from "@anthropic-ai/sdk"

const MODEL = "claude-sonnet-4-20250514"

export interface WildCard {
  technique: "INVERSIUNE" | "ELIMINARE" | "TRANSFER" | "EXAGERARE" | "COMBINARE"
  challenge: string
  context: string
}

/**
 * Generate 3 wild cards for a brainstorm topic.
 */
export async function generateWildCards(
  topic: string,
  currentContext: string
): Promise<WildCard[]> {
  const client = new Anthropic()

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `Generează 3 provocări de gândire laterală ("wild cards") pentru acest topic de brainstorming.

TOPIC: ${topic}
CONTEXT: ${currentContext}

Tehnici disponibile:
- INVERSIUNE: "Ce-ar fi dacă am face exact opusul a ce facem acum?"
- ELIMINARE: "Ce-ar fi dacă am elimina complet o componentă esențială?"
- TRANSFER: "Cum rezolvă o industrie complet diferită această problemă?"
- EXAGERARE: "Ce-ar fi dacă am scala cu 1000x mâine?"
- COMBINARE: "Ce-ar fi dacă am combina două lucruri aparent incompatibile?"

Generează provocări SPECIFICE și DERANJANTE — nu confortabile. Scopul e să forțeze idei pe care nimeni nu le-ar propune normal.

Răspunde STRICT JSON:
[
  {
    "technique": "INVERSIUNE|ELIMINARE|TRANSFER|EXAGERARE|COMBINARE",
    "challenge": "Provocarea formulată ca întrebare (1 propoziție)",
    "context": "De ce e relevantă această provocare (1 propoziție)"
  }
]`,
      }],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : "[]"
    const match = text.match(/\[[\s\S]*\]/)
    return match ? JSON.parse(match[0]) : []
  } catch (e: any) {
    console.warn("[WILD-CARDS] Generation failed:", e.message)
    return getDefaultWildCards(topic)
  }
}

/**
 * Format wild cards for injection into brainstorm prompt.
 */
export function formatWildCardsForPrompt(wildCards: WildCard[]): string {
  if (wildCards.length === 0) return ""

  return `\n\nPROVOCĂRI DELIBERATE (wild cards — generează minim 1 idee disruptivă inspirată de acestea):
${wildCards.map((wc, i) => `${i + 1}. [${wc.technique}] ${wc.challenge}\n   Context: ${wc.context}`).join("\n")}

IMPORTANT: Pe lângă ideile normale, generează minim 1 idee "nebună/disruptivă" inspirată de aceste provocări. Ideile disruptive au category: "disruptive".`
}

/**
 * Fallback wild cards if API fails.
 */
function getDefaultWildCards(topic: string): WildCard[] {
  return [
    {
      technique: "INVERSIUNE",
      challenge: `Ce-ar fi dacă am face exact opusul la "${topic.substring(0, 50)}"?`,
      context: "Inversiunea dezvăluie asumpții ascunse.",
    },
    {
      technique: "ELIMINARE",
      challenge: "Ce-ar fi dacă am elimina complet intermediarul uman din acest proces?",
      context: "Eliminarea forțează reinventarea.",
    },
    {
      technique: "TRANSFER",
      challenge: "Cum ar rezolva Netflix/Spotify/Uber această problemă?",
      context: "Transferul aduce perspective din afara domeniului.",
    },
  ]
}
