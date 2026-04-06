/**
 * calibrate.ts — Motor de calibrare comunicare externă
 *
 * TOATE mesajele client-facing trec prin acest modul ÎNAINTE de trimitere.
 * Aplică cele 4 layere de verificare:
 *
 *   L1 — CÂMPUL (moral core): nu expunem metodologie internă, aliniere BINE
 *   L2 — Consultanți (psiholingvistică + DEX + calibrare culturală RO):
 *         no Anglo-Saxon superlatives, ton adaptat la rol, storytelling narativ
 *   L3 — Cadru Legal: GDPR opt-out, nu referențiem info non-primită de la client,
 *         citare articole legale corecte
 *   L4 — Branding & Stil: JobGrade expeditor, Psihobusiness footer,
 *         acord subiect-predicat, stil elegant concis, POVESTE nu fraze
 *
 * Funcție PURĂ — zero I/O. Primește text, returnează verdict + corecții.
 */

// ── Tipuri ──────────────────────────────────────────────────────────────────

export type CalibrationLayer = "L1_MORAL" | "L2_PSYCHOLINGUISTIC" | "L3_LEGAL" | "L4_BRAND_STYLE"

export type CalibrationSeverity = "BLOCK" | "REWRITE" | "WARN"

export interface CalibrationIssue {
  layer: CalibrationLayer
  severity: CalibrationSeverity
  rule: string
  found: string
  suggestion: string
}

export interface CalibrationResult {
  passed: boolean
  issues: CalibrationIssue[]
  layerSummary: Record<CalibrationLayer, { passed: boolean; issueCount: number }>
}

export interface CalibrationContext {
  recipientRole?: "HR_DIRECTOR" | "CEO" | "CFO" | "CONSULTANT" | "GENERAL"
  isFirstContact?: boolean
  language?: "ro" | "en"
  contentType?: "email" | "landing" | "proposal" | "social" | "chat"
  /** Informații primite DIRECT de la client — doar acestea pot fi referențiate */
  clientProvidedInfo?: string[]
}

// ── L1: CÂMPUL — Termeni interni interzis de expus ──────────────────────────

const L1_FORBIDDEN_TERMS = [
  "câmp", "câmpul", "hawkins", "scala conștiinței", "calibrare conștiință",
  "hermann", "profil emisferic", "cortex stâng", "cortex drept",
  "umbra", "shadow", "onion model", "onion levels",
  "terapii scurte", "metodologii interne", "putere vs forță",
  "niveluri de conștiință", "letting go", "nivel hawkins",
  "moral core", "boundary engine", "agent consciousness",
  "layer 1", "layer 2", "layer 3", "layer 4",
  "cog", "soa", "cocsa", "dva", "dvb2b", "cssa", "fda", "bda",
  "organism viu", "celulă organizațională",
]

// ── L2: Superlative anglo-saxone interzise în RO ────────────────────────────

const L2_ANGLO_SUPERLATIVES_RO = [
  "perfect", "absolut", "extraordinar", "fantastic", "minunat",
  "super", "excelent", "incredibil", "uimitor", "fabulos",
  "cu mare plăcere", "ne bucurăm nespus", "cu siguranță absolută",
  "nu e nicio problemă", "să vă fac ziua mai bună",
  "great question", "awesome", "absolutely", "amazing",
]

// Cuvinte care sugerează cunoaștere non-furnizată de client
const L2_SURVEILLANCE_SIGNALS = [
  "am observat că", "am văzut că", "știm că aveți",
  "din câte am aflat", "am identificat", "conform profilului",
  "am analizat activitatea", "din surse publice",
  // Referințe la informații personale non-furnizate
  "studii de psihologie", "background", "experiența dvs. în",
  "cariera dvs.", "parcursul dvs.",
]

// ── L2: Fraze template-uri automate (sună ca robot) ────────────────────────

const L2_TEMPLATE_PHRASES = [
  "vă contactăm pentru a vă prezenta",
  "ne permitem să vă contactăm",
  "dorim să vă prezentăm",
  "avem plăcerea de a vă informa",
  "ne face plăcere să",
  "ne-ar face plăcere să discutăm",
  "soluția noastră inovatoare",
  "suntem lideri în",
  "platforma noastră de ultimă generație",
]

// ── L3: Verificări legale ───────────────────────────────────────────────────

const L3_REQUIRED_IN_COMMERCIAL_EMAIL = [
  { check: "gdpr_optout", pattern: /nu ve[tț]i mai primi|dezabonare|unsubscribe|opriți comunicările/i },
]

// ── L4: Verificări branding ─────────────────────────────────────────────────

const L4_TEAM_SIZE_MENTIONS = [
  "echipă de 2", "echipa de doi", "2 persoane", "doi oameni",
  "echipă mică", "startup mic", "suntem doi",
]

const L4_GRAMMAR_CHECKS = [
  {
    rule: "acord_subiect_predicat_persoana_1_sg",
    // "vă scriu" (eu) e greșit dacă expeditorul e echipa/compania
    pattern: /\bvă scriu\b|\bvă contactez\b|\bvă propun\b|\bîmi permit\b/i,
    suggestion: "Expeditorul e echipa JobGrade → plural: 'vă scriem', 'vă contactăm', 'vă propunem'",
  },
]

// ── Engine ──────────────────────────────────────────────────────────────────

function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics for fuzzy matching
}

function checkL1(text: string): CalibrationIssue[] {
  const issues: CalibrationIssue[] = []
  const normalized = normalizeForSearch(text)

  for (const term of L1_FORBIDDEN_TERMS) {
    const termNorm = normalizeForSearch(term)
    if (normalized.includes(termNorm)) {
      issues.push({
        layer: "L1_MORAL",
        severity: "BLOCK",
        rule: "no_internal_methodology_exposed",
        found: term,
        suggestion: `Termen intern "${term}" detectat. NU expunem metodologia. Reformulează în limbaj accesibil clientului.`,
      })
    }
  }

  return issues
}

function checkL2(text: string, ctx: CalibrationContext): CalibrationIssue[] {
  const issues: CalibrationIssue[] = []
  const lower = text.toLowerCase()
  const normalized = normalizeForSearch(text)

  // Anglo-Saxon superlatives
  for (const sup of L2_ANGLO_SUPERLATIVES_RO) {
    if (normalized.includes(normalizeForSearch(sup))) {
      issues.push({
        layer: "L2_PSYCHOLINGUISTIC",
        severity: "REWRITE",
        rule: "no_anglo_saxon_superlatives",
        found: sup,
        suggestion: `Superlativ anglo-saxon "${sup}" → înlocuiește cu formulare descriptivă, fără entuziasm performativ.`,
      })
    }
  }

  // Surveillance signals — referencing info not provided by client
  for (const signal of L2_SURVEILLANCE_SIGNALS) {
    if (lower.includes(signal.toLowerCase())) {
      // Check if it's about client-provided info
      const isClientProvided = ctx.clientProvidedInfo?.some(info =>
        lower.includes(info.toLowerCase())
      )
      if (!isClientProvided) {
        issues.push({
          layer: "L2_PSYCHOLINGUISTIC",
          severity: "BLOCK",
          rule: "no_surveillance_signals",
          found: signal,
          suggestion: `"${signal}" sugerează că am cercetat clientul. Clientul NU trebuie să se simtă supravegheat. Referențiază DOAR informațiile primite direct de la client.`,
        })
      }
    }
  }

  // Template/robot phrases
  for (const tmpl of L2_TEMPLATE_PHRASES) {
    if (lower.includes(tmpl.toLowerCase())) {
      issues.push({
        layer: "L2_PSYCHOLINGUISTIC",
        severity: "REWRITE",
        rule: "no_template_phrases",
        found: tmpl,
        suggestion: `Formulare template "${tmpl}" → rescrie narativ, ca o poveste, nu ca un script automat.`,
      })
    }
  }

  // Narrative check — simplistic heuristic: if text has many short disconnected sentences
  // without conjunctions/transitions, it's likely "phrases not story"
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)
  if (sentences.length >= 4) {
    const transitions = [
      "pentru că", "de aceea", "iar", "astfel", "în plus",
      "prin urmare", "ca urmare", "tocmai de aceea", "motiv pentru care",
      "în acest context", "pe de altă parte", "mai mult",
      "și", "dar", "însă", "totuși", "cu toate acestea",
    ]
    const hasTransitions = transitions.some(t => lower.includes(t))
    if (!hasTransitions) {
      issues.push({
        layer: "L2_PSYCHOLINGUISTIC",
        severity: "WARN",
        rule: "narrative_flow",
        found: "[text fără conectori narativi]",
        suggestion: "Textul pare o înșiruire de fraze, nu o poveste. Adaugă fir narativ: context → tensiune → soluție.",
      })
    }
  }

  return issues
}

function checkL3(text: string, ctx: CalibrationContext): CalibrationIssue[] {
  const issues: CalibrationIssue[] = []

  // Commercial emails need GDPR opt-out
  if (ctx.contentType === "email" && ctx.isFirstContact) {
    const hasOptOut = L3_REQUIRED_IN_COMMERCIAL_EMAIL[0].pattern.test(text)
    if (!hasOptOut) {
      issues.push({
        layer: "L3_LEGAL",
        severity: "BLOCK",
        rule: "gdpr_optout_required",
        found: "[lipsă mențiune dezabonare]",
        suggestion: "Email comercial fără opțiune de opt-out GDPR. Adaugă: 'Dacă nu doriți să mai primiți mesaje, vă rugăm să ne anunțați.'",
      })
    }
  }

  // Check for wrong indicator count (6 criterii instead of 4 indicatori)
  if (/\b6\s*(criterii|indicatori|factori)\b/i.test(text)) {
    issues.push({
      layer: "L3_LEGAL",
      severity: "REWRITE",
      rule: "correct_indicator_count",
      found: "6 criterii/indicatori",
      suggestion: "JobGrade folosește 4 indicatori, nu 6. Corectează și citează articolele legale relevante.",
    })
  }

  return issues
}

function checkL4(text: string, ctx: CalibrationContext): CalibrationIssue[] {
  const issues: CalibrationIssue[] = []
  const lower = text.toLowerCase()

  // Team size mentions
  for (const mention of L4_TEAM_SIZE_MENTIONS) {
    if (lower.includes(mention)) {
      issues.push({
        layer: "L4_BRAND_STYLE",
        severity: "REWRITE",
        rule: "no_team_size_mention",
        found: mention,
        suggestion: `Nu menționa dimensiunea echipei. Comunică prin prisma brandului JobGrade / psihobusiness.ro.`,
      })
    }
  }

  // Grammar: subject-predicate agreement
  for (const gc of L4_GRAMMAR_CHECKS) {
    if (gc.pattern.test(text)) {
      issues.push({
        layer: "L4_BRAND_STYLE",
        severity: "REWRITE",
        rule: gc.rule,
        found: text.match(gc.pattern)?.[0] ?? "",
        suggestion: gc.suggestion,
      })
    }
  }

  // Sender identity: should be JobGrade, not personal name
  if (/\bcu stimă,?\s*\n?\s*[A-ZĂÎÂȘȚ][a-zăîâșțéè]+\s+[A-ZĂÎÂȘȚ]/m.test(text)) {
    // Has personal signature — check it's followed by JobGrade context
    if (!lower.includes("jobgrade") && !lower.includes("job grade")) {
      issues.push({
        layer: "L4_BRAND_STYLE",
        severity: "WARN",
        rule: "brand_identity_jobgrade",
        found: "[semnătură personală fără context JobGrade]",
        suggestion: "Comunicăm în numele JobGrade. Semnătura personală e ok dar trebuie însoțită de identitatea JobGrade.",
      })
    }
  }

  // Footer should mention Psihobusiness as parent
  if (ctx.contentType === "email") {
    const hasPsihobusinessFooter = lower.includes("psihobusiness") ||
      lower.includes("psihobusiness consulting")
    if (!hasPsihobusinessFooter) {
      issues.push({
        layer: "L4_BRAND_STYLE",
        severity: "WARN",
        rule: "psihobusiness_footer",
        found: "[lipsă Psihobusiness în footer]",
        suggestion: "Footer-ul emailului trebuie să conțină: 'Psihobusiness Consulting SRL — servicii de consultanță organizațională | JobGrade.ro'",
      })
    }
  }

  return issues
}

// ── Export principal ─────────────────────────────────────────────────────────

export function calibrateCommunication(
  text: string,
  ctx: CalibrationContext = {},
): CalibrationResult {
  const defaults: CalibrationContext = {
    recipientRole: "GENERAL",
    isFirstContact: true,
    language: "ro",
    contentType: "email",
    clientProvidedInfo: [],
    ...ctx,
  }

  // Skip calibration for non-Romanian content
  if (defaults.language !== "ro") {
    return {
      passed: true,
      issues: [],
      layerSummary: {
        L1_MORAL: { passed: true, issueCount: 0 },
        L2_PSYCHOLINGUISTIC: { passed: true, issueCount: 0 },
        L3_LEGAL: { passed: true, issueCount: 0 },
        L4_BRAND_STYLE: { passed: true, issueCount: 0 },
      },
    }
  }

  const l1 = checkL1(text)
  const l2 = checkL2(text, defaults)
  const l3 = checkL3(text, defaults)
  const l4 = checkL4(text, defaults)

  const all = [...l1, ...l2, ...l3, ...l4]
  const hasBlock = all.some(i => i.severity === "BLOCK")

  return {
    passed: !hasBlock,
    issues: all,
    layerSummary: {
      L1_MORAL: { passed: l1.every(i => i.severity !== "BLOCK"), issueCount: l1.length },
      L2_PSYCHOLINGUISTIC: { passed: l2.every(i => i.severity !== "BLOCK"), issueCount: l2.length },
      L3_LEGAL: { passed: l3.every(i => i.severity !== "BLOCK"), issueCount: l3.length },
      L4_BRAND_STYLE: { passed: l4.every(i => i.severity !== "BLOCK"), issueCount: l4.length },
    },
  }
}

// ── Role-adaptive language hints ────────────────────────────────────────────

export function getLanguageHints(role: CalibrationContext["recipientRole"]): {
  register: string
  addressForm: string
  focusOn: string
} {
  switch (role) {
    case "HR_DIRECTOR":
      return {
        register: "specialist — terminologie HR, referințe legislație muncii, conformitate",
        addressForm: "dvs. formal, ton colegial-profesional între specialiști",
        focusOn: "conformitate, simplificare proces, audit trail, echitate internă",
      }
    case "CEO":
      return {
        register: "business — ROI, risc, competitivitate, decizie strategică",
        addressForm: "dvs. formal, ton respectuos dar direct, fără jargon HR",
        focusOn: "risc non-conformitate, avantaj competitiv, cost vs beneficiu, timp",
      }
    case "CFO":
      return {
        register: "financiar — cost, buget, ROI, amortizare, IFRS",
        addressForm: "dvs. formal, cifre concrete, fără cuvinte vagi",
        focusOn: "cost total ownership, ROI demonstrabil, reducere riscuri financiare (amenzi)",
      }
    case "CONSULTANT":
      return {
        register: "tehnic — metodologie, validare, standard internațional",
        addressForm: "dvs. colegial-profesional, terminologie de specialitate acceptată",
        focusOn: "metodologie validată, scalabilitate, integrare cu practici existente",
      }
    default:
      return {
        register: "general — clar, accesibil, fără jargon",
        addressForm: "dvs. formal-prietenos",
        focusOn: "beneficii concrete, pași simpli, siguranță",
      }
  }
}

// ── Narrative structure helper ──────────────────────────────────────────────

export interface NarrativeArc {
  context: string    // Situația în care se află interlocutorul (recunoaștere)
  tension: string    // Problema/provocarea reală (nu amenințare, ci observație)
  bridge: string     // Cum se rezolvă natural (soluția ca parte din poveste)
  resolution: string // Ce urmează concret (un singur pas, nu zece)
}

/**
 * Verifică dacă un text urmează un arc narativ minim.
 * Returnează true dacă textul are cel puțin context + tensiune + rezoluție.
 *
 * PRINCIPIU: Interesul crește cu fiecare paragraf. Clientul vrea să citească
 * următoarea frază — ca o carte bună pe care nu o poți lăsa din mână.
 */
export function hasNarrativeArc(text: string): boolean {
  const lower = text.toLowerCase()

  // Heuristic: un text narativ are cel puțin:
  // 1. O referință la situația actuală (context)
  const contextSignals = [
    "în acest moment", "acum", "anul acesta", "începând cu",
    "odată cu", "pe măsură ce", "în contextul", "din iunie",
    "directiva", "legislația", "piața", "companiile",
  ]
  // 2. O tensiune/provocare
  const tensionSignals = [
    "însă", "dar", "provocarea", "dificultatea", "problema",
    "riscul", "neclar", "complex", "timp", "resurse",
    "întrebarea", "cum", "ce se întâmplă", "fără",
  ]
  // 3. O rezoluție/direcție
  const resolutionSignals = [
    "de aceea", "tocmai", "prin urmare", "soluția",
    "construi", "am creat", "vă propunem", "vă invităm",
    "demo", "discuție", "pas", "concret",
  ]

  const hasContext = contextSignals.some(s => lower.includes(s))
  const hasTension = tensionSignals.some(s => lower.includes(s))
  const hasResolution = resolutionSignals.some(s => lower.includes(s))

  return hasContext && hasTension && hasResolution
}
