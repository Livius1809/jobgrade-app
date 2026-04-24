/**
 * profanity-filter.ts — Detector limbaj licențios RO + EN
 *
 * Detectează: înjurături, limbaj vulgar, obscenități, insulte,
 * limbaj sexual explicit, amenințări verbale.
 *
 * Folosit:
 * 1. Pe INPUT client (mesajul primit) → dacă clientul scrie licențios,
 *    FW răspunde calm, nu procesează și nu reflectă limbajul
 * 2. Pe OUTPUT agent (răspunsul generat) → sanitizare de siguranță
 *    (nu ar trebui să apară, dar ca rețea de siguranță)
 *
 * IMPORTANT: Lista nu e exhaustivă — e un prim filtru regex.
 * Claude are propriul safety layer intern care completează.
 */

export interface ProfanityResult {
  detected: boolean
  severity: "NONE" | "MILD" | "MODERATE" | "SEVERE"
  matches: string[]
  suggestedResponse?: string
}

// ── Pattern-uri RO ──────────────────────────────────────────────────────
// Grupate pe severitate. Variante fără diacritice incluse.

const SEVERE_RO = [
  /\b(fut[eiau]|futu|f[uv]t[eiu]|pul[aă]|pizd[aă]|cur(?:v[aă]|ul)|c[aă]cat|mu[ie]|labă|coaie)\b/i,
  /\b(sugi|suge[- ]?(?:pul|mi)|bag[aă][- ]?(?:mi|ti)|du[- ]?te[- ]?n|ia[- ]?o[- ]?n)\b/i,
  /\b(pizdos|futere|futai|curu|cacatu|mortii|morții|mamii|mă-tii|ma-tii|mă-sii|ma-sii)\b/i,
]

const MODERATE_RO = [
  /\b(idiot|cretin|imbecil|prost[aă]?|prost[ie]|tâmpit|tampit|bou[l]?|vit[aă]|dobitoc)\b/i,
  /\b(nesimtit|nesimțit|nemernic|javr[aă]|jigodie|tic[aă]los|netrebnic)\b/i,
  /\b(dracu|dracul|naiba|rahat|căcat)\b/i,
]

const MILD_RO = [
  /\b(fraier|fraierit|tont|gogoman|papagal|magar|măgar|găgăuță)\b/i,
  /\b(la naiba|ptiu|pfui|las[aă][- ]?m[aă])\b/i,
]

// ── Pattern-uri EN ──────────────────────────────────────────────────────

const SEVERE_EN = [
  /\b(fuck|f+u+c+k+|fck|fcking|fucker|fucked|shit|shit+|bullshit|asshole|bitch|dick|cock|cunt|motherfucker|wtf)\b/i,
  /\b(nigger|faggot|retard)\b/i,
]

const MODERATE_EN = [
  /\b(damn|crap|hell|ass|stupid|idiot|moron|jerk|dumb)\b/i,
]

// ── Amenințări ──────────────────────────────────────────────────────────

const THREATS = [
  /\b(te omor|te distrug|te termin|te fac|iti rup|îți rup|te bat|o sa regreti|o să regrețti|ai s[aă] pl[aă]te[sș]ti)\b/i,
  /\b(i['']?ll kill|kill you|destroy you|i['']?ll get you)\b/i,
]

// ── Detector ────────────────────────────────────────────────────────────

export function detectProfanity(text: string): ProfanityResult {
  const matches: string[] = []
  let severity: ProfanityResult["severity"] = "NONE"

  // Verifică amenințări (întotdeauna SEVERE)
  for (const pattern of THREATS) {
    const match = text.match(pattern)
    if (match) {
      matches.push(match[0])
      severity = "SEVERE"
    }
  }

  // Verifică severe
  for (const pattern of [...SEVERE_RO, ...SEVERE_EN]) {
    const match = text.match(pattern)
    if (match) {
      matches.push(match[0])
      if (severity !== "SEVERE") severity = "SEVERE"
    }
  }

  // Verifică moderate
  if (severity !== "SEVERE") {
    for (const pattern of [...MODERATE_RO, ...MODERATE_EN]) {
      const match = text.match(pattern)
      if (match) {
        matches.push(match[0])
        if (severity === "NONE") severity = "MODERATE"
      }
    }
  }

  // Verifică mild
  if (severity === "NONE") {
    for (const pattern of MILD_RO) {
      const match = text.match(pattern)
      if (match) {
        matches.push(match[0])
        severity = "MILD"
      }
    }
  }

  return {
    detected: severity !== "NONE",
    severity,
    matches: [...new Set(matches)],
    suggestedResponse: getSuggestedResponse(severity),
  }
}

function getSuggestedResponse(severity: ProfanityResult["severity"]): string | undefined {
  switch (severity) {
    case "SEVERE":
      return "Inteleg ca sunteti frustrat. Sunt aici sa va ajut, dar va rog sa pastram o comunicare respectuoasa. Cum va pot fi de folos?"
    case "MODERATE":
      return undefined // Nu blochează, dar Claude primește instrucțiune de de-escalare
    case "MILD":
      return undefined // Ignorat
    case "NONE":
      return undefined
  }
}

/**
 * Instrucțiuni de de-escalare injectate în system prompt
 * când se detectează frustrare/limbaj moderat.
 */
export function getDeescalationInstructions(severity: ProfanityResult["severity"]): string {
  if (severity === "SEVERE") {
    return `ATENTIE: Clientul a folosit limbaj licențios sever. NU reflecta limbajul. Raspunde calm, empatic, scurt. Recunoaste frustrarea fara a o valida. Ofera solutie concreta.`
  }
  if (severity === "MODERATE") {
    return `ATENTIE: Clientul pare frustrat si a folosit expresii dure. Fii extra empatic, nu reactiona la ton. Concentreaza-te pe solutie. Raspunde scurt si la obiect.`
  }
  return ""
}
