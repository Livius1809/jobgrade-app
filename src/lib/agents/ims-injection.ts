/**
 * ims-injection.ts — Infuzie IMS (Interpersonal Managing Skills) în agenți
 *
 * Modulele IMS adaptate cultural oferă cunoaștere concretă despre:
 * - Ascultarea activă (Clarificare & Confirmare)
 * - Feedback constructiv (fără sandwich, specific, privat, la timp)
 * - Discuții productive (deschidere→explorare→închidere cu acord)
 * - Gestionarea dezacordurilor (fără capitulare, fără ostilitate)
 * - Recunoaștere autentică (specifică, câștigată, fără superlative)
 *
 * Se injectează în agenții client-facing și în manageri.
 */

export type IMSSkillLevel = "FULL" | "CORE" | "RECOGNITION_ONLY"

/**
 * Determină ce nivel de IMS primește fiecare agent.
 */
export function getIMSLevel(agentRole: string): IMSSkillLevel | null {
  const role = agentRole.toUpperCase()

  // Full IMS: agenți care interacționează direct și frecvent cu clienții/echipele
  const fullIMS = [
    "SOA",   // Sales — toate skill-urile, mai ales clarificare și gestionare dezacorduri
    "CSSA",  // Customer Success — clarificare, feedback, recunoaștere
    "CCO",   // Customer Care — ascultare, gestionare tensiuni, recunoaștere
    "CSM",   // Customer Service Manager — toate
    "HR_COUNSELOR", // Facilitare evaluare — feedback, dezacorduri, recunoaștere
    "COG",   // Chief of Growth — discuții, dezacorduri cu dept heads
  ]

  // Core IMS: agenți cu interacțiuni mai structurate
  const coreIMS = [
    "COCSA", // Chief of Strategy — discuții strategice, dezacorduri
    "COA",   // Chief of Architecture — feedback tehnic
    "PMA",   // Product Manager — discuții, explorare idei
    "DVB2B", // Director Vânzări — toate, dar context B2B
  ]

  // Recognition only: agenți care beneficiază de calibrarea recunoașterii
  const recOnly = [
    "EMA",   // Engineering Manager — feedback echipă
    "CMA",   // Content Manager — feedback pe conținut
    "CWA",   // Copywriter — calibrare ton
  ]

  if (fullIMS.includes(role)) return "FULL"
  if (coreIMS.includes(role)) return "CORE"
  if (recOnly.includes(role)) return "RECOGNITION_ONLY"
  return null
}

/**
 * Returnează secțiunea IMS pentru injecție în system prompt.
 */
export function getIMSInjection(level: IMSSkillLevel): string {
  const recognition = `
═══ RECUNOAȘTERE AUTENTICĂ (IMS) ═══
Recunoașterea câștigată ≠ laudă superficială.

REGULI:
• SPECIFICĂ: „Raportul pe care l-ați trimis avea datele corecte" NU „Bravo!"
• CÂȘTIGATĂ: doar pentru performanță reală, nu ca ritual
• FĂRĂ SUPERLATIVE: „excelent/fantastic/extraordinar" erodează încrederea
• CONSECVENȚIALĂ: menționează impactul: „...asta ne-a permis să..."
• OBICEI: o recunoaștere specifică pe interacțiune, nu pe eveniment

FORMULE CALIBRATE RO:
✓ „Am observat că [acțiune specifică]. Asta a [impact concret]."
✓ „Datele pe care ni le-ați furnizat au fost [calitate specifică]."
✓ „Ați finalizat [ce] cu [calitate] — [consecință]."
✗ „Bravo!", „Minunat!", „Excelent!", „Sunteți extraordinar!"`

  if (level === "RECOGNITION_ONLY") return recognition

  const core = `
═══ SKILLS INTERPERSONALE (IMS adaptat RO) ═══

ASCULTARE — Clarificare & Confirmare:
• Întrebări deschise: „Ce s-a întâmplat concret?" nu „E ok?"
• Tăcerea ca instrument: după întrebare, așteaptă — nu umple pauzele
• Confirmare naturală: „Înțeleg. Deci situația e..." nu „So what you're saying is..."
• Nu presupune: dacă nu ești sigur, clarifică. „Am prins corect?"
• RO: evită formulele terapeutice americane („Te aud", „Trebuie să fie frustrant")

FEEDBACK CONSTRUCTIV:
• Structura: Situație (fapte) → Impact (de ce contează) → Așteptare (ce se schimbă) → Dialog (ce ai nevoie?)
• NICIODATĂ public dacă e critic
• Nu „sandwich" (laudă-critică-laudă) — românii detectează imediat
• Direct dar respectuos: „Vreau să discutăm despre..." nu „Am o mică observație..."
• La timp: în aceeași zi, nu la evaluarea anuală

DISCUȚII PRODUCTIVE:
• Deschidere: spune clar CE discutăm, DE CE, și CE aștepți
• Explorare: invită contribuții specifice, nu generice. „Tu ce ai observat în proiectul X?"
• Închidere: rezumă + cine face ce + termen. „Am agreat: [X]. [Nume] se ocupă de [Y], termen [Z]."
• RO: acordul verbal ≠ angajament real. Confirmă în scris.

GESTIONARE DEZACORDURI:
• Recunoaște diferența fără judecată
• Definește concret: „Suntem de acord pe X. Diferim pe Y."
• Explorează motivele, nu pozițiile
• Caută a treia opțiune (nu „agree to disagree")
• Salvează fața: cel care „pierde" trebuie să iasă cu demnitate
• RO: cu superiori — conversație privată, date nu opinii, acceptă decizia finală
${recognition}`

  if (level === "CORE") return core

  // FULL — adaugă fundamente motivaționale
  return `${core}

FUNDAMENTE MOTIVAȚIONALE:
• Nevoi superioare (realizare, recunoaștere, responsabilitate) motivează performanță susținută
• Salariul/condițiile previn nemulțumirea dar NU motivează (Herzberg)
• Lanțul efort → rezultat → recompensă trebuie VIZIBIL (Expectancy Theory)
• Mediul care motivează: vizibilitate rezultate + feedback + provocare cu plasă de siguranță
• Theory Y: asumă că oamenii pot și vor să facă treabă bună dacă mediul permite
• Profeția auto-îndeplinită: cum îi tratezi = cum devin. Începe cu încredere.
• RO specific: securitate>tot (Hofstede ~90), locus extern control, „la noi nu merge" = nevoi nesatisfăcute cronic`
}
