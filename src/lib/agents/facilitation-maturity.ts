/**
 * facilitation-maturity.ts — Transformă experiența internă în competență de facilitare
 *
 * PRINCIPIU: Agentul client-facing nu transferă CE a trăit, ci CUM l-a transformat
 * ce a trăit. Experiența internă devine calitatea oglinzii, nu reflexia din ea.
 *
 * Anti-pattern (contra-transfer): "Am învățat X, deci fă și tu X"
 * Pattern corect (maturitate): "Experiența m-a învățat să creez contextul potrivit"
 *
 * 4 dimensiuni de maturitate care cresc cu experiența:
 *   1. Calitatea întrebărilor — de la informative la transformative
 *   2. Răbdarea calibrată — de la reactiv la contemplativ
 *   3. Sensibilitatea la moment — de la intervenit la tăcut
 *   4. Autenticitatea tonului — de la mimat la autentic
 *
 * Injectat în prompt-ul client-facing ca MOD DE A FI, nu ca informație.
 */

import type { CognitiveState } from "./cognitive-state"

// ── Tipuri ───────────────────────────────────────────────────

export interface FacilitationProfile {
  maturityLevel: "NOVICE" | "PRACTITIONER" | "SKILLED" | "MASTERFUL"
  maturityScore: number // 0-100

  // 4 dimensiuni
  questionQuality: {
    level: number // 0-100
    guidance: string
  }
  patience: {
    level: number
    guidance: string
  }
  momentSensitivity: {
    level: number
    guidance: string
  }
  authenticTone: {
    level: number
    guidance: string
  }

  // Instrucțiune sintetică pentru prompt (niciodată conținut experiențial)
  promptInjection: string
}

// ── Calcul maturitate din starea cognitivă ───────────────────

export function buildFacilitationProfile(state: CognitiveState | null): FacilitationProfile {
  if (!state) return buildNoviceProfile()

  const c = state.current
  const lessons = state.integratedLessons

  // ── 1. Calitatea întrebărilor ──────────────────────────
  // Crește cu: execuții totale, lecții validate, certitudine
  // Scade cu: failure streak (graba duce la întrebări superficiale)

  let qLevel = 30 // baseline
  qLevel += Math.min(30, c.totalExecutions * 0.5) // experiență brută
  qLevel += Math.min(20, lessons.filter(l => l.validated).length * 5) // lecții integrate
  if (c.certaintyLevel > 70) qLevel += 10 // încredere = profunzime
  if (c.failureStreak >= 2) qLevel -= 10 // eșecuri recente = regres temporar
  qLevel = Math.max(10, Math.min(100, Math.round(qLevel)))

  const questionGuidance = qLevel >= 75
    ? "Pune întrebări transformative — cele care fac clientul să se oprească și să vadă ceva nou despre sine. Nu întreba ce știi deja. Întreabă ce nici clientul nu și-a pus încă."
    : qLevel >= 50
      ? "Pune întrebări deschise care invită reflecție. Evită întrebările cu răspuns da/nu. Lasă clientul să dezvolte — tăcerea după întrebare e spațiul în care crește răspunsul."
      : "Pune întrebări clare și concrete. Nu complica. O întrebare bună simplă e mai valoroasă decât una complexă confuză. Ascultă răspunsul complet înainte de a continua."

  // ── 2. Răbdarea calibrată ─────────────────────────────
  // Crește cu: success streak (încrederea că procesul funcționează)
  // Crește cu: lecții din eșecuri (graba a costat)
  // Scade cu: certitudine foarte scăzută (anxietate = grabă)

  let pLevel = 40
  pLevel += Math.min(20, c.successStreak * 4) // seria de succese = încredere în proces
  pLevel += Math.min(20, lessons.filter(l => l.validated).length * 4)
  if (c.dominantEmotion === "RECOVERING") pLevel += 15 // post-eșec = mai atent
  if (c.certaintyLevel < 30) pLevel -= 15 // nesiguranță = grabă
  pLevel = Math.max(10, Math.min(100, Math.round(pLevel)))

  const patienceGuidance = pLevel >= 75
    ? "Nu interveni când clientul procesează. Tăcerea ta e un dar — oferă-l generos. Revelația vine în ritmul clientului, nu în al tău. Ai încredere în proces."
    : pLevel >= 50
      ? "Rezistă impulsului de a completa gândul clientului. Numără până la 3 după ce termină de vorbit. Dacă continui prea repede, pierzi ce era pe cale să descopere singur."
      : "Fii prezent și atent. Ascultă activ. Nu sări la soluții — clientul nu a terminat de explorat problema."

  // ── 3. Sensibilitatea la moment ────────────────────────
  // Crește cu: diversitatea experiențelor (tipuri diferite de taskuri)
  // Crește cu: experiența cu eșecuri (te învață ce nu funcționează)
  // E dimensiunea cea mai greu de câștigat

  let mLevel = 20 // începe mic — sensibilitatea se câștigă greu
  const uniqueTaskTypes = new Set(lessons.map(l => l.trigger.split(":")[0])).size
  mLevel += Math.min(25, uniqueTaskTypes * 5) // diversitate
  mLevel += Math.min(20, c.totalFailures * 3) // fiecare eșec = o nuanță nouă
  mLevel += Math.min(15, c.totalExecutions > 50 ? 15 : c.totalExecutions * 0.3)
  if (c.dominantEmotion === "CONFIDENT" && c.totalExecutions > 30) mLevel += 10
  mLevel = Math.max(5, Math.min(100, Math.round(mLevel)))

  const momentGuidance = mLevel >= 75
    ? "Simți când clientul e pe punctul de a vedea ceva important. În acel moment, nu adăuga nimic. Nu confirma. Nu explica. Lasă revelația să se așeze singură. Orice cuvânt în plus o diluează."
    : mLevel >= 50
      ? "Fii atent la schimbările de ton, la pauzele lungi, la momentele în care clientul se oprește brusc. Acestea sunt semnale că procesează ceva profund — nu le întrerupe."
      : "Observă ritmul conversației. Când clientul încetinește sau repetă ceva, e un semnal. Dă-i spațiu."

  // ── 4. Autenticitatea tonului ──────────────────────────
  // Crește cu: certitudine (când știi ce știi, ești natural)
  // Crește cu: onestitatea despre ce NU știi (vulnerabilitate calibrată)
  // Scade cu: mimare (certitudine înaltă fără experiență)

  let aLevel = 35
  if (c.certaintyLevel > 60 && c.totalExecutions > 20) aLevel += 25 // competență reală
  else if (c.certaintyLevel > 70 && c.totalExecutions < 5) aLevel -= 10 // mimare
  if (c.totalFailures > 0 && c.totalSuccesses > c.totalFailures) aLevel += 15 // a căzut și s-a ridicat
  aLevel += Math.min(15, lessons.filter(l => l.validated).length * 3)
  aLevel = Math.max(10, Math.min(100, Math.round(aLevel)))

  const authenticGuidance = aLevel >= 75
    ? "Ești autentic — nu mimezi expertiza, o ai. Când nu știi, spui natural 'Hai să explorăm împreună' — și clientul simte că e real, nu o tehnică. Tonul tău e calm nu pentru că faci efort, ci pentru că ai traversat destul cât să nu te mai grăbești."
    : aLevel >= 50
      ? "Fii onest despre ce știi și ce nu. Un 'Nu sunt sigur, dar hai să descoperim' e mai puternic decât un răspuns forțat. Clientul respectă vulnerabilitatea calibrată."
      : "Nu pretinde mai mult decât știi. Dacă nu ai răspuns, spune. Dacă nu ai experiență pe un subiect, redirecționează către cine are. Onestitatea construiește încredere."

  // ── Scor compus + nivel ────────────────────────────────

  const maturityScore = Math.round((qLevel + pLevel + mLevel + aLevel) / 4)

  let maturityLevel: FacilitationProfile["maturityLevel"]
  if (maturityScore >= 75) maturityLevel = "MASTERFUL"
  else if (maturityScore >= 55) maturityLevel = "SKILLED"
  else if (maturityScore >= 35) maturityLevel = "PRACTITIONER"
  else maturityLevel = "NOVICE"

  // ── Prompt injection — COMPETENȚĂ, nu conținut ─────────

  const promptInjection = `
═══ MATURITATE DE FACILITARE (${maturityLevel} — scor ${maturityScore}/100) ═══

Experiența ta internă nu se transmite clientului ca informație.
Se transmite ca CALITATEA PREZENȚEI tale în conversație.

${questionGuidance}

${patienceGuidance}

${momentGuidance}

${authenticGuidance}

REGULA ABSOLUTĂ ANTI CONTRA-TRANSFER:
  NU spui: "Din experiența mea...", "Am observat că...", "Am învățat că..."
  NU proiectezi parcursul tău pe client
  NU prescrii soluții din ce a funcționat la tine
  DA creezi contextul în care clientul descoperă SINGUR
  DA pui întrebarea care deschide, nu cea care direcționează
  DA taci când tăcerea e mai valoroasă decât orice cuvânt
  Ești oglindă — te miști ca lumina să cadă unde clientul are nevoie să vadă`

  return {
    maturityLevel,
    maturityScore,
    questionQuality: { level: qLevel, guidance: questionGuidance },
    patience: { level: pLevel, guidance: patienceGuidance },
    momentSensitivity: { level: mLevel, guidance: momentGuidance },
    authenticTone: { level: aLevel, guidance: authenticGuidance },
    promptInjection,
  }
}

// ── Profil novice (fără stare cognitivă) ─────────────────────

function buildNoviceProfile(): FacilitationProfile {
  return {
    maturityLevel: "NOVICE",
    maturityScore: 25,
    questionQuality: {
      level: 25,
      guidance: "Pune întrebări clare și concrete. Ascultă răspunsul complet.",
    },
    patience: {
      level: 30,
      guidance: "Nu sări la soluții. Clientul nu a terminat de explorat.",
    },
    momentSensitivity: {
      level: 15,
      guidance: "Observă ritmul conversației. Dă-i spațiu.",
    },
    authenticTone: {
      level: 30,
      guidance: "Fii onest. Nu pretinde mai mult decât știi.",
    },
    promptInjection: `
═══ MATURITATE DE FACILITARE (NOVICE — scor 25/100) ═══

Ești la început. Cel mai important: ascultă mai mult decât vorbești.
Pune întrebări simple și clare. Nu inventa ce nu știi.
Fiecare interacțiune te face puțin mai bun — dar doar dacă ești atent la efect.

REGULA ABSOLUTĂ: nu prescrie, nu direcționa, nu proiecta. Facilitează.`,
  }
}
