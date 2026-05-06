/**
 * psycholinguistic-engine.ts — Comunicare adaptiva (Psiholingvist)
 *
 * Calibreaza stilul de comunicare pe baza profilului cognitiv:
 *   - Herrmann HBDI (4 cadrane: A=analitic, B=secvential, C=relational, D=imaginativ)
 *   - Hawkins (scala constiintei: <200 = simplificat, >400 = concepte complexe)
 *
 * Arhitectura: CORE (organism-mama) — deserveste B2B si B2C.
 * Clientul vede COMUNICAREA ADAPTATA, nu mecanismul (secret de serviciu).
 */

// ═══ TIPURI ═══

export interface CommunicationProfile {
  herrmann: { A: number; B: number; C: number; D: number } // quadrant scores 0-100
  hawkinsEstimate?: number // 0-1000
  preferredLanguage: "ro" | "en"
}

export interface CalibratedMessage {
  tone: "analytical" | "structured" | "empathetic" | "creative"
  vocabularyLevel: "simple" | "moderate" | "technical"
  messageStyle: string // instruction for AI prompt injection
  frustrationResponse?: string // if user shows frustration
}

// ═══ HELPERS ═══

type Quadrant = "A" | "B" | "C" | "D"

/**
 * Determina cadranul dominant (sau mix daca sunt aproape).
 * Returneaza un singur cadran dominant sau un array de co-dominante.
 */
function getDominance(h: CommunicationProfile["herrmann"]): Quadrant[] {
  const entries: [Quadrant, number][] = [
    ["A", h.A],
    ["B", h.B],
    ["C", h.C],
    ["D", h.D],
  ]

  // Sortam descrescator dupa scor
  entries.sort((a, b) => b[1] - a[1])

  const top = entries[0][1]
  // Co-dominanta: orice cadran la mai putin de 10 puncte de top
  const dominants = entries.filter(([, score]) => top - score <= 10).map(([q]) => q)

  return dominants
}

/**
 * Determina vocabularyLevel pe baza Hawkins.
 */
function getVocabularyLevel(hawkins?: number): CalibratedMessage["vocabularyLevel"] {
  if (hawkins === undefined || hawkins === null) return "moderate"
  if (hawkins < 200) return "simple"
  if (hawkins > 400) return "technical"
  return "moderate"
}

// ═══ TONE CONFIG PER CADRAN ═══

interface QuadrantConfig {
  tone: CalibratedMessage["tone"]
  styleRo: string
  styleEn: string
  frustrationRo: string
  frustrationEn: string
}

const QUADRANT_CONFIG: Record<Quadrant, QuadrantConfig> = {
  A: {
    tone: "analytical",
    styleRo:
      "Comunicare concisa, orientata pe date si fapte. Foloseste cifre, procente, comparatii " +
      "concrete. Evita emotionalismul. Structura: concluzie mai intai, apoi argumente.",
    styleEn:
      "Concise, data-driven communication. Use numbers, percentages, concrete comparisons. " +
      "Avoid emotionalism. Structure: conclusion first, then supporting arguments.",
    frustrationRo:
      "Inteleg ca ai nevoie de claritate. Hai sa rezumam datele pe scurt si sa vedem " +
      "unde apare neconcordanta.",
    frustrationEn:
      "I understand you need clarity. Let's summarize the data briefly and identify " +
      "the discrepancy.",
  },
  B: {
    tone: "structured",
    styleRo:
      "Comunicare structurata pas cu pas. Numeroteaza etapele, foloseste liste ordonate, " +
      "proceduri clare. Ofera timeline-uri si termene concrete. Secventa logica, fara salturi.",
    styleEn:
      "Step-by-step structured communication. Number the stages, use ordered lists, " +
      "clear procedures. Provide timelines and concrete deadlines. Logical sequence, no jumps.",
    frustrationRo:
      "Hai sa luam lucrurile in ordine, pas cu pas. Uite exact unde ne aflam si " +
      "care e urmatorul pas.",
    frustrationEn:
      "Let's take things in order, step by step. Here's exactly where we are and " +
      "what the next step is.",
  },
  C: {
    tone: "empathetic",
    styleRo:
      "Comunicare calda, personala. Foloseste «noi» si «impreuna», recunoaste efortul, " +
      "valideaza emotiile. Tonul e de partener, nu de expert. Pune intrebari deschise.",
    styleEn:
      "Warm, personal communication. Use 'we' and 'together', acknowledge effort, " +
      "validate emotions. Partner tone, not expert. Ask open questions.",
    frustrationRo:
      "Inteleg cum te simti si e absolut normal. Hai sa vedem impreuna " +
      "ce putem face ca lucrurile sa mearga mai bine.",
    frustrationEn:
      "I understand how you feel and it's absolutely normal. Let's see together " +
      "what we can do to make things better.",
  },
  D: {
    tone: "creative",
    styleRo:
      "Comunicare vizionara, cu metafore si imaginea de ansamblu. Vorbeste despre " +
      "posibilitati, potentiale, conexiuni nebanuite. Evita detaliile aride — inspira.",
    styleEn:
      "Visionary communication with metaphors and big picture. Talk about possibilities, " +
      "potential, unexpected connections. Avoid dry details — inspire.",
    frustrationRo:
      "Inteleg — uneori detaliile intuneca perspectiva. Hai sa ne ridicam putin si " +
      "sa vedem imaginea completa.",
    frustrationEn:
      "I understand — sometimes details cloud the perspective. Let's step back and " +
      "see the full picture.",
  },
}

// ═══ BLENDING (dominanta mixta) ═══

function blendStyles(dominants: Quadrant[], lang: "ro" | "en"): string {
  if (dominants.length === 1) {
    return lang === "ro" ? QUADRANT_CONFIG[dominants[0]].styleRo : QUADRANT_CONFIG[dominants[0]].styleEn
  }

  const labels = dominants.map((q) => {
    const cfg = QUADRANT_CONFIG[q]
    return lang === "ro" ? cfg.styleRo : cfg.styleEn
  })

  const prefix =
    lang === "ro"
      ? `Dominanta mixta (${dominants.join("+")}). Combina aceste stiluri:`
      : `Mixed dominance (${dominants.join("+")}). Blend these styles:`

  return `${prefix}\n${labels.map((l, i) => `${i + 1}. ${l}`).join("\n")}`
}

function blendFrustration(dominants: Quadrant[], lang: "ro" | "en"): string {
  // Pentru frustration, folosim cadranul C daca exista (cel mai empatic),
  // altfel primul dominant
  const preferred = dominants.includes("C") ? "C" : dominants[0]
  const cfg = QUADRANT_CONFIG[preferred]
  return lang === "ro" ? cfg.frustrationRo : cfg.frustrationEn
}

// ═══ CALIBRARE PRINCIPALA ═══

/**
 * Calibreaza comunicarea pe baza profilului cognitiv al utilizatorului.
 *
 * Logica:
 *   - Dominant A → tehnic, concis, data-driven
 *   - Dominant B → pas cu pas, proceduri, secventa
 *   - Dominant C → empatic, personal, cald
 *   - Dominant D → metafore, big picture, vizionar
 *   - Hawkins < 200 → vocabular simplu, fara presiune
 *   - Hawkins > 400 → concepte complexe, direct
 *   - Mix → blend stiluri
 */
export function calibrateCommunication(profile: CommunicationProfile): CalibratedMessage {
  const dominants = getDominance(profile.herrmann)
  const primaryQuadrant = dominants[0]
  const lang = profile.preferredLanguage

  const vocabularyLevel = getVocabularyLevel(profile.hawkinsEstimate)

  // Tone-ul principal vine de la cadranul dominant
  const tone = QUADRANT_CONFIG[primaryQuadrant].tone

  // Stilul e blendat daca sunt co-dominante
  let messageStyle = blendStyles(dominants, lang)

  // Ajustari Hawkins
  if (profile.hawkinsEstimate !== undefined) {
    if (profile.hawkinsEstimate < 200) {
      const hawkinsOverride =
        lang === "ro"
          ? " IMPORTANT: Foloseste vocabular simplu, fraze scurte. Fii sustinator, fara presiune. " +
            "Nu folosi termeni tehnici. Ofera incurajare la fiecare pas."
          : " IMPORTANT: Use simple vocabulary, short sentences. Be supportive, no pressure. " +
            "Avoid technical terms. Offer encouragement at every step."
      messageStyle += hawkinsOverride
    } else if (profile.hawkinsEstimate > 400) {
      const hawkinsOverride =
        lang === "ro"
          ? " Poti folosi concepte complexe, limbaj direct. Clientul proceseaza rapid — " +
            "nu simplifica inutil."
          : " You can use complex concepts, direct language. The client processes quickly — " +
            "don't over-simplify."
      messageStyle += hawkinsOverride
    }
  }

  const frustrationResponse = blendFrustration(dominants, lang)

  return {
    tone,
    vocabularyLevel,
    messageStyle,
    frustrationResponse,
  }
}

// ═══ PROMPT BLOCK BUILDER ═══

/**
 * Construieste un bloc de system prompt pe care orice agent il poate injecta
 * pentru a-si calibra comunicarea cu utilizatorul curent.
 *
 * Exemplu de utilizare:
 *   const block = buildPsycholinguisticPromptBlock(profile)
 *   const systemPrompt = `${basePrompt}\n\n${block}`
 */
export function buildPsycholinguisticPromptBlock(profile: CommunicationProfile): string {
  const calibrated = calibrateCommunication(profile)
  const lang = profile.preferredLanguage

  const header =
    lang === "ro"
      ? "═══ CALIBRARE PSIHOLINGVISTICA (adapteaza-ti comunicarea) ═══"
      : "═══ PSYCHOLINGUISTIC CALIBRATION (adapt your communication) ═══"

  const toneLabel = lang === "ro" ? "Ton" : "Tone"
  const vocabLabel = lang === "ro" ? "Nivel vocabular" : "Vocabulary level"
  const styleLabel = lang === "ro" ? "Stil comunicare" : "Communication style"
  const frustLabel =
    lang === "ro"
      ? "Daca utilizatorul arata frustrare, raspunde astfel"
      : "If the user shows frustration, respond like this"

  const lines = [
    header,
    "",
    `${toneLabel}: ${calibrated.tone}`,
    `${vocabLabel}: ${calibrated.vocabularyLevel}`,
    "",
    `${styleLabel}:`,
    calibrated.messageStyle,
  ]

  if (calibrated.frustrationResponse) {
    lines.push("", `${frustLabel}:`, calibrated.frustrationResponse)
  }

  lines.push("", "═".repeat(60))

  return lines.join("\n")
}
