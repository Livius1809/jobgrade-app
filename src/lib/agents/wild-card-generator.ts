/**
 * G2 — Wild Card Generator (Rhythm Layer)
 *
 * Generează provocări periodice "out of the box" pentru agenți.
 * 1x/săptămână per agent, deterministic (seeded random).
 * COG agregă rezultatele.
 *
 * Diferit de wild-cards.ts (brainstorming LLM) — acesta e funcție PURĂ.
 *
 * Livrat: 06.04.2026, Stratul G2 "Living Organization".
 */

// ── Tipuri ────────────────────────────────────────────────────────────────────

export type WildCardPromptType = "CONTRARIAN" | "CROSS_DOMAIN" | "FUTURE_SELF" | "CONSTRAINT" | "ABSURD"

export interface WildCardTemplate {
  type: WildCardPromptType
  templates: string[]
}

export interface GeneratedWildCard {
  targetRole: string
  prompt: string
  promptType: WildCardPromptType
  weekOf: string  // ISO date, luni
}

// ── Templates ────────────────────────────────────────────────────────────────

const TEMPLATES: WildCardTemplate[] = [
  {
    type: "CONTRARIAN",
    templates: [
      "Ce-ar fi dacă faci exact opusul a ce faci cel mai des? Descrie cum ar arăta o zi în care {role} face contrariul rutinei.",
      "Dacă ar trebui să argumentezi CONTRA celei mai importante reguli pe care o urmezi, ce argument ai aduce?",
      "Imaginează-te că totul ce ai construit până acum e greșit. De unde ai reîncepe?",
    ],
  },
  {
    type: "CROSS_DOMAIN",
    templates: [
      "Cum ar rezolva un bucătar problema principală cu care te confrunți? Dar un pompier? Dar un muzician?",
      "Alege un domeniu complet diferit de al tău. Ce principiu din acel domeniu ar putea revoluționa cum lucrezi?",
      "Dacă echipa ta ar fi o echipă de film (regizor, scenarist, actor, cameraman), ce rol ai juca și de ce?",
    ],
  },
  {
    type: "FUTURE_SELF",
    templates: [
      "Cum va arăta munca ta peste 2 ani? Ce faci acum care nu va mai fi relevant?",
      "Scrie o scrisoare de la {role} din 2028 către {role} de azi. Ce sfat ți-ai da?",
      "Dacă AI-ul ar putea face 90% din ce faci tu, care e acel 10% pe care DOAR tu îl poți face?",
    ],
  },
  {
    type: "CONSTRAINT",
    templates: [
      "Dacă ai avea doar 10% din resurse (timp, date, instrumente), ce ai păstra și ce ai elimina?",
      "Trebuie să livrezi aceeași valoare în jumătate din timp. Ce taie primul?",
      "Imaginează-te că nu mai ai acces la niciun instrument digital timp de o zi. Cum continui să aduci valoare?",
    ],
  },
  {
    type: "ABSURD",
    templates: [
      "Cel mai nebunesc lucru pe care l-ai putea propune pentru îmbunătățirea platformei. Fără cenzură.",
      "Dacă ar trebui să explici ce faci unui copil de 5 ani, cum ar suna? Și dacă copilul ar spune 'de ce?' de 5 ori la rând?",
      "Propune o funcționalitate complet ridicolă. Apoi găsește un nucleu util ascuns în ea.",
    ],
  },
]

// ── Generator ────────────────────────────────────────────────────────────────

function getMonday(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split("T")[0]
}

function seededRandom(seed: string): () => number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b)
    h = (h ^ (h >>> 16)) >>> 0
    return h / 4294967296
  }
}

export function generateWeeklyWildCards(
  roles: string[],
  date: Date = new Date(),
): GeneratedWildCard[] {
  const weekOf = getMonday(date)
  const cards: GeneratedWildCard[] = []

  for (const role of roles) {
    const seed = `${role}-${weekOf}`
    const rng = seededRandom(seed)

    const typeIdx = Math.floor(rng() * TEMPLATES.length)
    const template = TEMPLATES[typeIdx]

    const promptIdx = Math.floor(rng() * template.templates.length)
    let prompt = template.templates[promptIdx]

    prompt = prompt.replace(/\{role\}/g, role)

    cards.push({
      targetRole: role,
      prompt,
      promptType: template.type,
      weekOf,
    })
  }

  return cards
}

// ── Evaluare (pentru COG review) ─────────────────────────────────────────────

export interface WildCardEvalInput {
  id: string
  targetRole: string
  prompt: string
  response: string | null
  cogScore: number | null
  promotedToIdea: boolean
}

export interface WildCardSummary {
  total: number
  responded: number
  avgScore: number | null
  promoted: number
  topScored: Array<{ role: string; score: number }>
}

export function summarizeWildCards(cards: WildCardEvalInput[]): WildCardSummary {
  const responded = cards.filter((c) => c.response)
  const scored = cards.filter((c) => c.cogScore !== null)
  const promoted = cards.filter((c) => c.promotedToIdea)

  return {
    total: cards.length,
    responded: responded.length,
    avgScore: scored.length > 0
      ? Math.round(scored.reduce((s, c) => s + c.cogScore!, 0) / scored.length)
      : null,
    promoted: promoted.length,
    topScored: scored
      .sort((a, b) => b.cogScore! - a.cogScore!)
      .slice(0, 5)
      .map((c) => ({ role: c.targetRole, score: c.cogScore! })),
  }
}
