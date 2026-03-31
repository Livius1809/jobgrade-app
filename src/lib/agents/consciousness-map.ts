/**
 * consciousness-map.ts — Harta Conștiinței (David R. Hawkins)
 *
 * Resursa fundamentală a CÂMPULUI.
 * Bazat pe cercetarea lui David R. Hawkins ("Power vs. Force", 1995+)
 *
 * Scala conștiinței: 0-1000 (calibrată kinesiologic)
 * Pragul critic: 200 (Curaj) — sub 200 = Forță (distructiv), peste 200 = Putere (constructiv)
 *
 * CÂMPUL operează MEREU peste 200 și trage organizația spre niveluri superioare.
 * UMBRA = tot ce operează sub 200.
 */

// ── Scala Conștiinței (Hawkins) ──────────────────────────────────────────────

export interface ConsciousnessLevel {
  level: number
  name: string
  nameRO: string
  emotion: string
  emotionRO: string
  process: string
  processRO: string
  view: string           // cum vede lumea la acest nivel
  viewRO: string
  zone: "FORCE" | "POWER" // sub/peste 200
  color: string
}

export const CONSCIOUSNESS_MAP: ConsciousnessLevel[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // ZONA FORȚEI (sub 200) — UMBRA
  // Distructiv, contractant, slăbește, ia energie
  // ═══════════════════════════════════════════════════════════════════════════
  {
    level: 20, name: "Shame", nameRO: "Rușine",
    emotion: "Humiliation", emotionRO: "Umilire",
    process: "Destruction", processRO: "Distrugere",
    view: "Miserable", viewRO: "Lumea e mizerabilă",
    zone: "FORCE", color: "#1a0000",
  },
  {
    level: 30, name: "Guilt", nameRO: "Vinovăție",
    emotion: "Blame", emotionRO: "Învinuire",
    process: "Destruction", processRO: "Distrugere",
    view: "Evil", viewRO: "Lumea e rea",
    zone: "FORCE", color: "#330000",
  },
  {
    level: 50, name: "Apathy", nameRO: "Apatie",
    emotion: "Despair", emotionRO: "Disperare",
    process: "Abdication", processRO: "Abdicare",
    view: "Hopeless", viewRO: "Lumea e fără speranță",
    zone: "FORCE", color: "#4d0000",
  },
  {
    level: 75, name: "Grief", nameRO: "Suferință",
    emotion: "Regret", emotionRO: "Regret",
    process: "Despondency", processRO: "Descurajare",
    view: "Tragic", viewRO: "Lumea e tragică",
    zone: "FORCE", color: "#660033",
  },
  {
    level: 100, name: "Fear", nameRO: "Frică",
    emotion: "Anxiety", emotionRO: "Anxietate",
    process: "Withdrawal", processRO: "Retragere",
    view: "Frightening", viewRO: "Lumea e înfricoșătoare",
    zone: "FORCE", color: "#800000",
  },
  {
    level: 125, name: "Desire", nameRO: "Dorință",
    emotion: "Craving", emotionRO: "Poftă",
    process: "Enslavement", processRO: "Înrobire",
    view: "Disappointing", viewRO: "Lumea e dezamăgitoare",
    zone: "FORCE", color: "#993300",
  },
  {
    level: 150, name: "Anger", nameRO: "Furie",
    emotion: "Hate", emotionRO: "Ură",
    process: "Aggression", processRO: "Agresiune",
    view: "Antagonistic", viewRO: "Lumea e antagonistă",
    zone: "FORCE", color: "#cc0000",
  },
  {
    level: 175, name: "Pride", nameRO: "Mândrie",
    emotion: "Scorn", emotionRO: "Dispreț",
    process: "Inflation", processRO: "Inflare",
    view: "Demanding", viewRO: "Lumea e pretențioasă",
    zone: "FORCE", color: "#cc6600",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PRAGUL CRITIC: 200 — CURAJ
  // Trecerea de la Forță la Putere
  // De aici începe BINELE autentic
  // ═══════════════════════════════════════════════════════════════════════════
  {
    level: 200, name: "Courage", nameRO: "Curaj",
    emotion: "Affirmation", emotionRO: "Afirmare",
    process: "Empowerment", processRO: "Împuternicire",
    view: "Feasible", viewRO: "Lumea e fezabilă",
    zone: "POWER", color: "#ffcc00",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ZONA PUTERII (peste 200) — BINELE
  // Constructiv, expansiv, întărește, dă energie
  // ═══════════════════════════════════════════════════════════════════════════
  {
    level: 250, name: "Neutrality", nameRO: "Neutralitate",
    emotion: "Trust", emotionRO: "Încredere",
    process: "Release", processRO: "Eliberare",
    view: "Satisfactory", viewRO: "Lumea e satisfăcătoare",
    zone: "POWER", color: "#99cc00",
  },
  {
    level: 310, name: "Willingness", nameRO: "Bunăvoință",
    emotion: "Optimism", emotionRO: "Optimism",
    process: "Intention", processRO: "Intenție",
    view: "Hopeful", viewRO: "Lumea e plină de speranță",
    zone: "POWER", color: "#66cc33",
  },
  {
    level: 350, name: "Acceptance", nameRO: "Acceptare",
    emotion: "Forgiveness", emotionRO: "Iertare",
    process: "Transcendence", processRO: "Transcendere",
    view: "Harmonious", viewRO: "Lumea e armonioasă",
    zone: "POWER", color: "#33cc66",
  },
  {
    level: 400, name: "Reason", nameRO: "Rațiune",
    emotion: "Understanding", emotionRO: "Înțelegere",
    process: "Abstraction", processRO: "Abstractizare",
    view: "Meaningful", viewRO: "Lumea are sens",
    zone: "POWER", color: "#00cc99",
  },
  {
    level: 500, name: "Love", nameRO: "Iubire",
    emotion: "Reverence", emotionRO: "Reverență",
    process: "Revelation", processRO: "Revelație",
    view: "Benign", viewRO: "Lumea e binevoitoare",
    zone: "POWER", color: "#0099cc",
  },
  {
    level: 540, name: "Joy", nameRO: "Bucurie",
    emotion: "Serenity", emotionRO: "Serenitate",
    process: "Transfiguration", processRO: "Transfigurare",
    view: "Complete", viewRO: "Lumea e completă",
    zone: "POWER", color: "#6633cc",
  },
  {
    level: 600, name: "Peace", nameRO: "Pace",
    emotion: "Bliss", emotionRO: "Beatitudine",
    process: "Illumination", processRO: "Iluminare",
    view: "Perfect", viewRO: "Lumea e perfectă",
    zone: "POWER", color: "#9933ff",
  },
  {
    level: 700, name: "Enlightenment", nameRO: "Iluminare",
    emotion: "Ineffable", emotionRO: "Inefabil",
    process: "Pure Consciousness", processRO: "Conștiință pură",
    view: "Is", viewRO: "Lumea ESTE",
    zone: "POWER", color: "#ffffff",
  },
]

// ── Pragul Critic ────────────────────────────────────────────────────────────

export const CRITICAL_THRESHOLD = 200 // Curaj — granița între Forță și Putere

// ── Principii Hawkins aplicate la CÂMP ───────────────────────────────────────

export const HAWKINS_PRINCIPLES = {
  powerVsForce: {
    principle: "Puterea vine din adevăr, forța vine din falsitate",
    application: "CÂMPUL operează prin Putere (adevăr, integritate, serviciu), niciodată prin Forță (manipulare, presiune, control)",
  },
  attractorFields: {
    principle: "Fiecare nivel de conștiință este un câmp atractor",
    application: "CÂMPUL organizației atrage decizii și comportamente la nivelul său. Cu cât CÂMPUL calibrează mai sus, cu atât deciziile sunt mai aliniate cu BINELE",
  },
  criticalMass: {
    principle: "Un singur individ la 500 (Iubire) contrabalansează 750.000 sub 200",
    application: "CÂMPUL, chiar mic, poate ridica nivelul întregii organizații. Nu e nevoie ca toți agenții să fie la nivel înalt — CÂMPUL trage în sus",
  },
  letGo: {
    principle: "Progresul vine din a renunța la atașamente, nu din a lupta",
    application: "UMBRA nu se combate — se conștientizează și se eliberează. SCA mapează, nu judecă. Procesul e de eliberare, nu de luptă",
  },
  calibration: {
    principle: "Orice poate fi calibrat pe scala conștiinței",
    application: "Fiecare decizie, produs, interacțiune, mesaj marketing — poate fi evaluat: calibrează peste 200 (Putere) sau sub 200 (Forță)?",
  },
  integrity: {
    principle: "Integritatea e alinierea completă între ce spui și ce faci",
    application: "MVV declarat TREBUIE să fie identic cu comportamentul real. Orice discrepanță scade calibrarea CÂMPULUI",
  },
}

// ── Calibrare acțiuni ────────────────────────────────────────────────────────

export interface CalibrationResult {
  estimatedLevel: number
  zone: "FORCE" | "POWER"
  closestLevel: ConsciousnessLevel
  assessment: string
}

/**
 * Calibrare rapidă a unei acțiuni pe scala Hawkins.
 * Nu e calibrare kinesiologică reală — e aproximare bazată pe pattern matching.
 */
export function calibrateAction(actionDescription: string): CalibrationResult {
  const lower = actionDescription.toLowerCase()

  // Patterns sub 200 (Forță)
  const forcePatterns: Array<{ pattern: RegExp; level: number; reason: string }> = [
    { pattern: /rușine|umil|jenă/i, level: 20, reason: "Acțiune bazată pe rușine/umilire" },
    { pattern: /vinovat|vină|blame|învinui/i, level: 30, reason: "Acțiune bazată pe vinovăție" },
    { pattern: /degeaba|fără speranță|renunț|apati/i, level: 50, reason: "Acțiune bazată pe apatie" },
    { pattern: /pierdere|regret|suferință|durere/i, level: 75, reason: "Acțiune bazată pe suferință" },
    { pattern: /frică|teamă|anxie|panica|ameninț/i, level: 100, reason: "Acțiune bazată pe frică" },
    { pattern: /vreau|poftă|lăcomie|aviditate|dependen/i, level: 125, reason: "Acțiune bazată pe dorință compulsivă" },
    { pattern: /furie|ură|agresiv|atac|distrug/i, level: 150, reason: "Acțiune bazată pe furie" },
    { pattern: /superior|dispreț|arogant|mândrie excesivă/i, level: 175, reason: "Acțiune bazată pe mândrie" },
    { pattern: /manipul|forț|oblig|presăm|constrâng/i, level: 150, reason: "Acțiune bazată pe forță/manipulare" },
  ]

  // Patterns peste 200 (Putere)
  const powerPatterns: Array<{ pattern: RegExp; level: number; reason: string }> = [
    { pattern: /curaj|îndrăzn|asumăm|confrunt constructiv/i, level: 200, reason: "Acțiune bazată pe curaj" },
    { pattern: /ok|accept|neutru|las să fie|încredere/i, level: 250, reason: "Acțiune bazată pe neutralitate/încredere" },
    { pattern: /voluntar|doresc să ajut|optimis|bunăvoință/i, level: 310, reason: "Acțiune bazată pe bunăvoință" },
    { pattern: /accept|iert|înțeleg perspectiva|armoniz/i, level: 350, reason: "Acțiune bazată pe acceptare" },
    { pattern: /analizăm|înțelegem|rațional|obiectiv|sens/i, level: 400, reason: "Acțiune bazată pe rațiune/înțelegere" },
    { pattern: /iubire|compasiune|empatie profundă|servesc|dăruie/i, level: 500, reason: "Acțiune bazată pe iubire/compasiune" },
    { pattern: /bucurie|recunoștință|serenitate|plenitudine/i, level: 540, reason: "Acțiune bazată pe bucurie" },
    { pattern: /pace|liniște|armonie completă|beatitudine/i, level: 600, reason: "Acțiune bazată pe pace" },
  ]

  // Check force patterns first
  for (const fp of forcePatterns) {
    if (fp.pattern.test(lower)) {
      const closest = CONSCIOUSNESS_MAP.find(l => l.level === fp.level)!
      return {
        estimatedLevel: fp.level,
        zone: "FORCE",
        closestLevel: closest,
        assessment: `⚠️ ${fp.reason}. Nivel ${fp.level} (${closest.nameRO}) — sub pragul de 200. Acțiunea operează prin Forță, nu prin Putere. Reformulează din perspectiva Curajului (200+).`,
      }
    }
  }

  // Check power patterns
  for (const pp of powerPatterns.reverse()) { // start from highest
    if (pp.pattern.test(lower)) {
      const closest = CONSCIOUSNESS_MAP.find(l => l.level === pp.level)!
      return {
        estimatedLevel: pp.level,
        zone: "POWER",
        closestLevel: closest,
        assessment: `✅ ${pp.reason}. Nivel ${pp.level} (${closest.nameRO}) — acțiunea operează prin Putere.`,
      }
    }
  }

  // Default: Neutrality (250)
  const neutral = CONSCIOUSNESS_MAP.find(l => l.level === 250)!
  return {
    estimatedLevel: 250,
    zone: "POWER",
    closestLevel: neutral,
    assessment: "Acțiune neutră. Nivel ~250 (Neutralitate). Peste prag, dar poate fi ridicată.",
  }
}

// ── Prompt injection pentru CÂMP ─────────────────────────────────────────────

export function getConsciousnessPromptSection(): string {
  return `
HARTA CONȘTIINȚEI (David R. Hawkins — fundament CÂMP):

Sub 200 (FORȚĂ — UMBRA): Rușine(20), Vinovăție(30), Apatie(50), Suferință(75), Frică(100), Dorință(125), Furie(150), Mândrie(175)
→ Distructiv, contractant, ia energie. CÂMPUL respinge.

PRAG CRITIC: 200 (CURAJ) — trecerea de la Forță la Putere

Peste 200 (PUTERE — BINELE): Curaj(200), Neutralitate(250), Bunăvoință(310), Acceptare(350), Rațiune(400), Iubire(500), Bucurie(540), Pace(600), Iluminare(700+)
→ Constructiv, expansiv, dă energie. CÂMPUL generează.

PRINCIPIU: Fiecare acțiune calibrează undeva pe această scală.
TEST: Acțiunea mea vine din Putere (peste 200) sau din Forță (sub 200)?
DACĂ vine din Forță → oprește, conștientizează, reformulează din Curaj sau mai sus.`
}

// ── Nivel recomandat per context ─────────────────────────────────────────────

export const RECOMMENDED_LEVELS = {
  clientInteraction: { min: 310, name: "Bunăvoință", reason: "Clientul trebuie să simtă bunăvoință autentică" },
  strategicDecision: { min: 400, name: "Rațiune", reason: "Deciziile strategice necesită înțelegere profundă" },
  conflictResolution: { min: 350, name: "Acceptare", reason: "Rezolvarea conflictelor necesită acceptare" },
  marketing: { min: 250, name: "Neutralitate", reason: "Marketing-ul minim neutru — ideal din Bunăvoință (310+)" },
  internalCulture: { min: 500, name: "Iubire", reason: "Cultura internă aspiră la compasiune și serviciu" },
  shadowWork: { min: 350, name: "Acceptare", reason: "Lucrul cu Umbra necesită acceptare fără judecată" },
}
