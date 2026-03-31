export interface LinguisticProfile {
  formalityLevel: "VERY_FORMAL" | "FORMAL" | "NEUTRAL" | "INFORMAL" | "CASUAL"
  domainKnowledge: "EXPERT" | "PROFESSIONAL" | "GENERAL" | "NOVICE"
  textComplexity: "HIGH" | "MEDIUM" | "LOW"
  avgSentenceLength: number
  indicators: string[]
}

// Termeni de specialitate HR/business (RO + EN)
const DOMAIN_TERMS = [
  "evaluare", "performanta", "competente", "obiective", "kpi", "ierarhizare",
  "grad", "salarizare", "fisa postului", "organigrama", "job grading", "hay",
  "evaluation", "performance", "competencies", "objectives", "grading", "salary",
  "benchmark", "pay gap", "bonus", "compensatie", "retributie",
  "metodologie", "subfactor", "punctaj", "criterii", "sesiune de evaluare",
  "mercer", "towers watson", "point factor", "job sizing", "band", "grade salarial",
  "transparenta salariala", "pay equity", "job architecture",
]

// Markeri formali — limbaj de business profesional (nu administrativ)
const FORMAL_MARKERS = [
  "prin urmare", "in consecinta", "conform", "ulterior", "aferent",
  "subsemnatul", "mentionam", "va rugam", "in vederea", "referitor la",
  // business profesional uzual
  "solicit", "necesit", "implementa", "aliniata", "aliniat", "structura",
  "abordare", "strategie", "implementare", "optimiza", "eficienta",
  "context", "obiectiv", "rezultat", "impact", "metodologie",
  "in contextul", "avand in vedere", "tinand cont", "in conformitate",
  "va adresez", "doresc sa", "intentionam", "propunem",
]

// Markeri informali — conversatie relaxata
const INFORMAL_MARKERS = [
  "deci", "ok", "super", "misto", "aia", "ala", "numa", "naspa", "fain",
  "salut", "buna", "hey", "hi", "ciao", "pa", "mersi", "multam", "nush",
  "nu stiu", "vreau sa", "ajuta-ma", "ajutati-ma", "nu ma descurc",
  "habar nu", "adica", "cam asa", "mai ales", "gen", "stii", "da",
  "na", "pai", "uite", "asa ca", "si eu", "sa stii",
]

// Markeri CASUAL expliciți (mai puternici decât informal)
const CASUAL_MARKERS = [
  "lol", "haha", "😊", "😅", "🙏", "💪", "👍", "😢", "😭",
  "wtf", "omg", "tbh", "asap", "fyi",
  "!!!", "???", "...",
]

/**
 * Detectează absența diacriticelor românești — semnal informal puternic.
 * Un text fără diacritice dar cu cuvinte românești (de, la, cu, ca, nu, sau)
 * e scris de cineva în grabă sau de pe mobil → registru informal.
 */
function missingDiacritics(text: string): boolean {
  const romanianWords = ["nu", "sau", "pentru", "care", "sunt", "este", "avem", "aveti", "poate"]
  const hasRomanianWords = romanianWords.filter((w) => text.toLowerCase().includes(w)).length >= 2
  if (!hasRomanianWords) return false
  // Dacă nu conține niciun caracter cu diacritice dar are cuvinte românești
  const hasDiacritics = /[ăâîșțĂÂÎȘȚ]/.test(text)
  return !hasDiacritics
}

/**
 * Analiză euristică a profilului lingvistic din primele 1-3 mesaje.
 * Nu necesită AI — reguli bazate pe frecvență, lungime și pattern-uri de scriere.
 */
export function analyzeLinguisticProfile(messages: string[]): LinguisticProfile {
  const combined = messages.join(" ")
  // Normalizăm diacriticele pentru matching markeri (fără a pierde informația originală)
  const lower = combined.toLowerCase()
  const lowerNorm = lower
    .replace(/[ăâ]/g, "a")
    .replace(/î/g, "i")
    .replace(/[șş]/g, "s")
    .replace(/[țţ]/g, "t")
  const words = combined.split(/\s+/).filter(Boolean)
  const sentences = combined.split(/[.!?]+/).filter((s) => s.trim().length > 3)
  const avgSentenceLength =
    sentences.length > 0 ? Math.round(words.length / sentences.length) : words.length

  const indicators: string[] = []

  // ── Domeniu ─────────────────────────────────────────────────────
  // Normalizăm și termenii de domeniu pentru matching fără diacritice
  const normalizedDomainTerms = DOMAIN_TERMS.map((t) =>
    t.replace(/[ăâ]/g, "a").replace(/î/g, "i").replace(/[șşțţ]/g, (c) => (c.match(/[șş]/) ? "s" : "t"))
  )
  const domainCount = normalizedDomainTerms.filter((t) => lowerNorm.includes(t)).length
  let domainKnowledge: LinguisticProfile["domainKnowledge"] = "GENERAL"
  if (domainCount >= 3) {
    domainKnowledge = "EXPERT"
    indicators.push("terminologie HR avansată")
  } else if (domainCount >= 1) {
    domainKnowledge = "PROFESSIONAL"
    indicators.push("terminologie HR de bază")
  } else if (domainCount === 0 && words.length > 8) {
    domainKnowledge = "NOVICE"
    indicators.push("fără terminologie de specialitate")
  }

  // ── Formalitate ──────────────────────────────────────────────────
  const normalizedFormalMarkers = FORMAL_MARKERS.map((m) =>
    m.replace(/[ăâ]/g, "a").replace(/î/g, "i").replace(/[șşțţ]/g, (c) => (c.match(/[șş]/) ? "s" : "t"))
  )
  const normalizedInformalMarkers = INFORMAL_MARKERS.map((m) =>
    m.replace(/[ăâ]/g, "a").replace(/î/g, "i").replace(/[șşțţ]/g, (c) => (c.match(/[șş]/) ? "s" : "t"))
  )

  const formalCount = normalizedFormalMarkers.filter((m) => lowerNorm.includes(m)).length
  const informalCount = normalizedInformalMarkers.filter((m) => lowerNorm.includes(m)).length
  const casualCount = CASUAL_MARKERS.filter((m) => lower.includes(m)).length
  const noDialects = missingDiacritics(combined)

  // Scor agregat: fiecare semnal contribuie cu o greutate
  // Pozitiv = formal, Negativ = informal
  let formalityScore = 0
  formalityScore += formalCount * 2
  formalityScore += avgSentenceLength >= 15 ? 2 : 0
  formalityScore += avgSentenceLength >= 20 ? 2 : 0      // fraze foarte lungi = foarte formal
  formalityScore -= informalCount * 2
  formalityScore -= casualCount * 3
  formalityScore -= noDialects ? 2 : 0                   // fără diacritice = informal
  formalityScore -= words.length < 15 && sentences.length <= 2 ? 1 : 0 // mesaj scurt

  let formalityLevel: LinguisticProfile["formalityLevel"]
  if (formalityScore >= 6) {
    formalityLevel = "VERY_FORMAL"
    indicators.push("vocabular academic și structură elaborată")
  } else if (formalityScore >= 2) {
    formalityLevel = "FORMAL"
    indicators.push("ton profesional, propoziții structurate")
  } else if (formalityScore <= -5 || casualCount >= 1) {
    formalityLevel = "CASUAL"
    indicators.push("limbaj colocvial, fără formule de politețe")
  } else if (formalityScore <= -2 || noDialects) {
    formalityLevel = "INFORMAL"
    indicators.push("registru relaxat, fără diacritice")
  } else {
    formalityLevel = "NEUTRAL"
  }

  // ── Complexitate ─────────────────────────────────────────────────
  let textComplexity: LinguisticProfile["textComplexity"] = "MEDIUM"
  if (avgSentenceLength >= 15 || (words.length >= 30 && sentences.length >= 2)) {
    textComplexity = "HIGH"
    indicators.push("fraze complexe, detaliate")
  } else if (avgSentenceLength < 7 || words.length < 10) {
    textComplexity = "LOW"
    indicators.push("mesaje scurte, directe")
  }

  return { formalityLevel, domainKnowledge, textComplexity, avgSentenceLength, indicators }
}

/**
 * Transformă profilul lingvistic într-un query KB pentru agentul Psiholingvist.
 * Rezultatele căutării se injectează în system prompt-ul agentului de conversație.
 */
export function profileToKBQuery(profile: LinguisticProfile): string {
  const parts: string[] = []

  if (profile.formalityLevel === "FORMAL" || profile.formalityLevel === "VERY_FORMAL") {
    parts.push("comunicare formală registru profesional academic")
  } else if (profile.formalityLevel === "CASUAL" || profile.formalityLevel === "INFORMAL") {
    parts.push("comunicare informală limbaj accesibil simplu")
  }

  if (profile.domainKnowledge === "NOVICE") {
    parts.push("explicații fără jargon analogii simple")
  } else if (profile.domainKnowledge === "EXPERT") {
    parts.push("terminologie avansată expert HR detalii tehnice")
  }

  if (profile.textComplexity === "HIGH") {
    parts.push("răspunsuri detaliate structurate argumentate")
  } else if (profile.textComplexity === "LOW") {
    parts.push("răspunsuri scurte directe esențiale")
  }

  return parts.join(" ") || "comunicare standard profesional echilibrat"
}
