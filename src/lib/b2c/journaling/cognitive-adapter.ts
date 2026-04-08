/**
 * cognitive-adapter.ts — Adaptarea jurnalului la sistemul cognitiv al clientului
 *
 * Clientul nu primește un prompt generic. Primește un prompt adaptat la:
 *   1. Profilul Herrmann (CUM gândește — A/B/C/D)
 *   2. Faza pe spirală (UNDE e pe drum)
 *   3. Etapa competenței (CÂT de conștient e)
 *   4. Nivelul Hawkins estimat (DE UNDE privește)
 *   5. Cardul activ (CE explorează)
 *
 * Un client C/D dominant (interpersonal/imaginativ) primește:
 *   "Închide ochii pentru o clipă. Imaginează-ți că ești într-o cameră goală.
 *    Cineva intră pe ușă — cine e? Ce-ți spune?"
 *
 * Un client A/B dominant (analitic/secvențial) primește:
 *   "Scrie 3 momente din ultima săptămână când te-ai simțit autentic.
 *    Ce aveau în comun?"
 *
 * Același scop, limbaj diferit. Clientul receptează prin canalul lui dominant.
 */

// ── Profil Herrmann simplificat ────────────────────────────────────────────

export type HermannDominance =
  | "A"        // Analitic — logic, fapte, date, cantitativ
  | "B"        // Secvențial — organizat, procedural, pas cu pas
  | "C"        // Interpersonal — emoțional, empatic, relațional
  | "D"        // Imaginativ — creativ, holistic, metafore, viziune
  | "AB"       // Stâng dominant
  | "CD"       // Drept dominant
  | "AC"       // Diagonal — analitic + empatic
  | "BD"       // Diagonal — secvențial + creativ
  | "ABCD"     // Integrat (whole brain)
  | "UNKNOWN"  // Profil necunoscut încă

export interface CognitiveProfile {
  herrmann: HermannDominance
  spiralPhase: "CHRYSALIS" | "BUTTERFLY" | "FLIGHT" | "LEAP"
  competenceStage: 1 | 2 | 3 | 4
  hawkinsEstimate: number
  activeCard: string
}

// ── Determinare dominanță Herrmann ─────────────────────────────────────────

export function determineHermannDominance(
  a: number | null, b: number | null, c: number | null, d: number | null
): HermannDominance {
  if (a == null || b == null || c == null || d == null) return "UNKNOWN"
  const scores = { A: a, B: b, C: c, D: d }
  const sorted = Object.entries(scores).sort(([, v1], [, v2]) => v2 - v1)
  const top = sorted[0][1]
  const second = sorted[1][1]
  if (top - second < 10) {
    const pair = [sorted[0][0], sorted[1][0]].sort().join("") as HermannDominance
    if (["AB", "CD", "AC", "BD"].includes(pair)) return pair
  }
  const range = sorted[0][1] - sorted[3][1]
  if (range < 15) return "ABCD"
  return sorted[0][0] as HermannDominance
}

// ── Stil de comunicare per dominanță ───────────────────────────────────────

interface CommunicationStyle {
  receptivity: string
  promptStyle: string
  avoid: string
  format: string
}

const COMMUNICATION_STYLES: Record<HermannDominance, CommunicationStyle> = {
  A: {
    receptivity: "Date, structură, logică. Vrea să înțeleagă ÎNAINTE de a simți.",
    promptStyle: "Întrebări clare cu cadru. Liste. Comparații. Cauze și efecte.",
    avoid: "Metafore vagi, emoții fără context, exerciții fără scop definit.",
    format: "Enumerări, cadre, pași clari.",
  },
  B: {
    receptivity: "Secvențe, rutine, pași. Vrea să știe CE URMEAZĂ.",
    promptStyle: "Pas cu pas. Cronologic.",
    avoid: "Ambiguitate, sarcini deschise fără structură.",
    format: "Pași numerotați, timeline, agendă zilnică.",
  },
  C: {
    receptivity: "Emoții, relații, povești. Vrea să SIMTĂ înainte de a analiza.",
    promptStyle: "Întrebări despre relații, sentimente, oameni. Povești, imagini afective.",
    avoid: "Tabele, statistici, cadre rigide, ton impersonal.",
    format: "Narativ, dialoguri imaginate, scrisori, reflecții despre relații.",
  },
  D: {
    receptivity: "Viziune, metafore, posibilități. Vrea să VADĂ panoramic.",
    promptStyle: "Metafore, scenarii, vizualizări, imaginare liberă.",
    avoid: "Detalii excesive, pași rigizi, rutine repetitive.",
    format: "Vizualizări, colaje mentale, brainstorming liber, scenarii.",
  },
  AB: {
    receptivity: "Structură cu logică. Vrea plan clar bazat pe analiză.",
    promptStyle: "Cadre analitice aplicate pas cu pas.",
    avoid: "Ambiguitate, emoții neancorate.",
    format: "Matrice, cadre decizionale, pași cu justificare logică.",
  },
  CD: {
    receptivity: "Emoție cu viziune. Vrea să simtă și să imagineze simultan.",
    promptStyle: "Povești cu metafore, vizualizări emoționale, călătorii interioare.",
    avoid: "Tabele, liste rigide, ton rece.",
    format: "Narativ liber, imagini mentale, metafore extinse.",
  },
  AC: {
    receptivity: "Analiză + empatie. Vrea să înțeleagă ce simte și de ce.",
    promptStyle: "Întrebări care leagă emoția de cauza rațională.",
    avoid: "Extremele: nici pură logică, nici pură emoție.",
    format: "Reflecție ghidată: ce ai simțit? De ce crezi? Ce date ai?",
  },
  BD: {
    receptivity: "Ordine + creativitate. Vrea proces creativ dar structurat.",
    promptStyle: "Exerciții creative cu pași definiți.",
    avoid: "Haos total sau rigiditate totală.",
    format: "Cadru creativ: 5 minute imaginează, apoi 5 minute organizează.",
  },
  ABCD: {
    receptivity: "Integrat — receptiv la toate stilurile. Preferă varietatea.",
    promptStyle: "Alternează: o zi analitic, o zi emoțional, o zi vizionar.",
    avoid: "Monotonia — același tip de exercițiu repetat.",
    format: "Variază: liste, narativ, vizualizări, dialoguri — în rotație.",
  },
  UNKNOWN: {
    receptivity: "Profil necunoscut — folosim stil echilibrat C/D.",
    promptStyle: "Întrebări deschise, calde, fără presupuneri.",
    avoid: "Presupuneri despre cum gândește. Cadre rigide.",
    format: "Întrebări simple, deschise. Spațiu de răspuns liber.",
  },
}

export function getCommunicationStyle(dominance: HermannDominance): CommunicationStyle {
  return COMMUNICATION_STYLES[dominance]
}

// ── Generator prompt-uri journaling adaptate ───────────────────────────────

export interface JournalPrompt {
  prompt: string
  hint?: string
  suggestedMinutes: number
  internalPurpose: string
  targetDimension: string
}

export function generateJournalPrompt(
  profile: CognitiveProfile,
  topic?: string
): JournalPrompt {
  const { herrmann, spiralPhase, competenceStage, hawkinsEstimate, activeCard } = profile
  if (activeCard === "CARD_1") return generateCard1Prompt(herrmann, spiralPhase, competenceStage, hawkinsEstimate, topic)
  if (activeCard === "CARD_2") return generateCard2Prompt(herrmann, spiralPhase, topic)
  if (activeCard === "CARD_3") return generateCard3Prompt(herrmann, spiralPhase, topic)
  if (activeCard === "CARD_4") return generateCard4Prompt(herrmann, spiralPhase, hawkinsEstimate, topic)
  if (activeCard === "CARD_5") return generateCard5Prompt(herrmann, spiralPhase, topic)
  return generateGenericPrompt(herrmann, spiralPhase, topic)
}

// ── Card 1: Drumul către mine ──────────────────────────────────────────────

function generateCard1Prompt(
  h: HermannDominance, phase: CognitiveProfile["spiralPhase"],
  stage: number, hawkins: number, topic?: string
): JournalPrompt {

  // CHRYSALIS + A (analitic)
  if (phase === "CHRYSALIS" && (h === "A" || h === "AB")) {
    return {
      prompt: topic
        ? `Gândește-te la "${topic}". Adu-ți aminte 3 momente din ultima săptămână în care ai acționat pe pilot automat, fără să alegi tu cu adevărat. Ce crezi că ar fi fost diferit dacă ai fi ales conștient?`
        : "Ce decizii ai luat azi? Alege 3 dintre ele. Pentru fiecare, întreabă-te sincer: a fost decizia ta, sau a fost ceea ce \"trebuia\" să faci? Cum faci diferența între cele două?",
      hint: "Nu există răspuns greșit. Doar observă, fără să te judeci.",
      suggestedMinutes: 10,
      internalPurpose: "Detectare programare externă vs. alegere autentică (cadru analitic)",
      targetDimension: "auto_cunoastere",
    }
  }

  // CHRYSALIS + B (secvențial)
  if (phase === "CHRYSALIS" && (h === "B" || h === "AB")) {
    return {
      prompt: topic
        ? `Pornind de la "${topic}": descrie-ți ziua de azi pas cu pas, de la trezire. La fiecare moment în care ai simțit ceva — orice — oprește-te și notează. Când recitești totul, ce tipar observi?`
        : "Cum a fost ziua de azi pentru tine? Încearcă să-ți amintești oră cu oră și la fiecare oră pune un singur cuvânt care descrie ce ai simțit. Când termini, recitește totul dintr-o privire — ce observi?",
      hint: "Rutina ascunde tipare. Cronologia le scoate la lumină.",
      suggestedMinutes: 10,
      internalPurpose: "Conștientizare emoțională prin structură familiară (B procesează secvențial)",
      targetDimension: "auto_cunoastere",
    }
  }

  // CHRYSALIS + C (interpersonal)
  if (phase === "CHRYSALIS" && (h === "C" || h === "CD" || h === "AC")) {
    return {
      prompt: topic
        ? `Gândește-te la "${topic}". Dacă cel mai bun prieten al tău ar simți exact ce simți tu acum, ce i-ai spune ca să-l ajuți? Scrie-i o scrisoare scurtă.`
        : "Imaginează-ți că te întâlnești cu tine de acum 10 ani. Ce i-ai spune? Acum imaginează-ți că vine la tine cel care vei fi peste 10 ani — ce crezi că ți-ar spune?",
      hint: "Scrie fără să editezi. Primul gând care vine e de obicei cel mai onest.",
      suggestedMinutes: 12,
      internalPurpose: "Auto-cunoaștere prin empatie cu sine (C procesează prin relații)",
      targetDimension: "auto_cunoastere",
    }
  }

  // CHRYSALIS + D (imaginativ)
  if (phase === "CHRYSALIS" && (h === "D" || h === "CD" || h === "BD")) {
    return {
      prompt: topic
        ? `Gândește-te la "${topic}" — închide ochii pentru un minut. Imaginează-ți un loc în care ești complet tu, fără nicio mască pe față. Cum arată locul ăla? Ce culori vezi? Ce auzi? Deschide ochii și descrie ce ai văzut.`
        : "Dacă viața ta ar fi o carte, cum s-ar numi capitolul pe care îl trăiești acum? Dar cel care urmează? Scrie prima pagină a capitolului următor, fără să te cenzurezi.",
      hint: "Nu există greșit. Imaginația e cea mai onestă parte din tine.",
      suggestedMinutes: 15,
      internalPurpose: "Auto-cunoaștere prin metaforă și vizualizare (D procesează holistic)",
      targetDimension: "auto_cunoastere",
    }
  }

  // BUTTERFLY
  if (phase === "BUTTERFLY") {
    if (h === "A" || h === "AB") {
      return {
        prompt: "Gândește-te la cine ești când nu te vede nimeni — și la cine ești în fața celorlalți. Scrie 3 diferențe concrete între cele două versiuni. De unde crezi că vin diferențele astea?",
        suggestedMinutes: 12,
        internalPurpose: "Conștientizare discrepanță identitate publică/privată (analitic)",
        targetDimension: "profunzime_reflectie",
      }
    }
    if (h === "C" || h === "CD") {
      return {
        prompt: "Imaginează-ți că o parte din tine — una pe care nu o arăți nimănui — ar putea vorbi. Scrie o conversație între voi doi. Ce ți-ar spune?",
        suggestedMinutes: 15,
        internalPurpose: "Dialog cu Umbra (empatic/imaginativ)",
        targetDimension: "profunzime_reflectie",
      }
    }
    return {
      prompt: "Ce ai descoperit recent despre tine care te-a surprins? De ce crezi că nu vedeai lucrul ăsta până acum? Ce s-a schimbat de l-ai putut vedea?",
      suggestedMinutes: 12,
      internalPurpose: "Meta-reflecție — observarea procesului de conștientizare",
      targetDimension: "profunzime_reflectie",
    }
  }

  // FLIGHT
  if (phase === "FLIGHT") {
    return {
      prompt: hawkins >= 200
        ? "Ce bine ai făcut azi — nu pentru ca cineva să te aprecieze, nu din obligație, ci pur și simplu pentru că așa ești tu? Povestește."
        : "Când ai fost ultima oară tu, în totalitate, fără să depui vreun efort pentru asta? Ce făceai în momentul ăla? Cu cine erai? Ce lipsea din viața de zi cu zi?",
      suggestedMinutes: 10,
      internalPurpose: "Consolidare autenticitate / explorare binele natural",
      targetDimension: "transfer_practica",
    }
  }

  // LEAP
  if (phase === "LEAP") {
    return {
      prompt: "Există ceva ce ai învățat despre tine pe drumul ăsta, ceva pe care nu l-ai putea explica ușor în cuvinte — dar pe care îl simți clar. Încearcă totuși să-l pui în cuvinte.",
      suggestedMinutes: 15,
      internalPurpose: "Articulare cunoaștere tacită — pregătire pentru următorul nivel",
      targetDimension: "evolutie_constiinta",
    }
  }

  return generateGenericPrompt(h, phase, topic)
}

// ── Card 2: Eu și ceilalți ────────────────────────────────────────────────

function generateCard2Prompt(
  h: HermannDominance, phase: CognitiveProfile["spiralPhase"], topic?: string
): JournalPrompt {
  if (h === "A" || h === "AB") {
    return {
      prompt: topic || "Gândește-te la 3 relații importante din viața ta. Pentru fiecare, răspunde sincer: ce primești din relația asta? Ce oferi tu? Simți că e echilibru între cele două?",
      suggestedMinutes: 12,
      internalPurpose: "Harta relațiilor prin cadru analitic",
      targetDimension: "auto_cunoastere",
    }
  }
  if (h === "C" || h === "CD") {
    return {
      prompt: topic || "Scrie o scrisoare cuiva care contează pentru tine — una pe care nu o vei trimite niciodată. Ce ai vrea ca omul ăla să înțeleagă despre tine?",
      suggestedMinutes: 15,
      internalPurpose: "Explorare relațională prin expresie emoțională",
      targetDimension: "profunzime_reflectie",
    }
  }
  return {
    prompt: topic || "Adu-ți aminte de ultima dată când te-ai simțit cu adevărat înțeles de cineva. Ce a făcut omul ăla diferit față de ceilalți? Ce anume te-a făcut să simți că te vede cu adevărat?",
    suggestedMinutes: 10,
    internalPurpose: "Identificare nevoi relaționale",
    targetDimension: "auto_cunoastere",
  }
}

// ── Card 3: Rol profesional ───────────────────────────────────────────────

function generateCard3Prompt(
  h: HermannDominance, phase: CognitiveProfile["spiralPhase"], topic?: string
): JournalPrompt {
  if (h === "A" || h === "AB") {
    return {
      prompt: topic || "La ce ești bun în profesie? Alege 5 lucruri. Acum uită-te la fiecare: care dintre ele te fac și fericit? Pe care le faci doar pentru că poți, nu pentru că vrei?",
      suggestedMinutes: 10,
      internalPurpose: "Distincție competență vs. vocație (cadru analitic)",
      targetDimension: "claritate_directie",
    }
  }
  if (h === "D" || h === "CD" || h === "BD") {
    return {
      prompt: topic || "Dacă banii nu ar conta și nimeni nu te-ar judeca — ce ai face luni dimineață? Descrie o zi completă din acea viață.",
      suggestedMinutes: 15,
      internalPurpose: "Explorare vocație prin vizualizare liberă",
      targetDimension: "claritate_directie",
    }
  }
  return {
    prompt: topic || "Ce ai face dacă ai ști sigur că nu poți eșua? Dar dacă eșecul ar fi garantat — ai mai face același lucru?",
    suggestedMinutes: 10,
    internalPurpose: "Testul motivației intrinseci",
    targetDimension: "claritate_directie",
  }
}

// ── Card 4: Succes vs. Valoare ────────────────────────────────────────────

function generateCard4Prompt(
  h: HermannDominance, phase: CognitiveProfile["spiralPhase"],
  hawkins: number, topic?: string
): JournalPrompt {
  if (hawkins < 200 || phase === "CHRYSALIS") {
    if (h === "A" || h === "AB") {
      return {
        prompt: topic || "Care sunt cele mai mari 3 realizări ale tale din viață? Acum gândește-te: cui ai povestit despre ele? De ce simțeai nevoia să le spui tocmai acelor oameni?",
        suggestedMinutes: 10,
        internalPurpose: "Detectare motivație exterioară (demonstrație vs. satisfacție)",
        targetDimension: "profunzime_reflectie",
      }
    }
    return {
      prompt: topic || "Cum te-ai simți dacă nimeni nu ar ști vreodată ce ai realizat în viață? Te-ai simți la fel ca acum? Sau diferit? În ce fel?",
      suggestedMinutes: 12,
      internalPurpose: "Piatra de încercare Card 4 — detașarea de validare externă",
      targetDimension: "evolutie_constiinta",
    }
  }

  return {
    prompt: topic || "Cui ai făcut bine săptămâna asta — nu pentru că trebuia, nu pentru că te vedea cineva, ci pentru că așa ai simțit? Cum te-ai simțit după?",
    suggestedMinutes: 10,
    internalPurpose: "Explorare bine natural — acțiune din firescul a ceea ce ești",
    targetDimension: "transfer_practica",
  }
}

// ── Card 5: Antreprenoriat transformațional ───────────────────────────────

function generateCard5Prompt(
  h: HermannDominance, phase: CognitiveProfile["spiralPhase"], topic?: string
): JournalPrompt {
  if (h === "A" || h === "AB") {
    return {
      prompt: topic || "Dacă ai construi ceva care lasă lumea mai bună, ce problemă ai rezolva? Pentru cine? Cum ai măsura dacă ai reușit?",
      suggestedMinutes: 15,
      internalPurpose: "Cristalizare viziune — cadru analitic pentru integrare",
      targetDimension: "transfer_practica",
    }
  }
  if (h === "D" || h === "CD") {
    return {
      prompt: topic || "Închide ochii pentru o clipă. Imaginează-ți că au trecut 20 de ani și te uiți înapoi la ceea ce ai construit. Ce vezi? Cine e lângă tine? Ce spun oamenii cărora le-ai schimbat viața?",
      suggestedMinutes: 15,
      internalPurpose: "Vizualizare impact pe termen lung",
      targetDimension: "claritate_directie",
    }
  }
  return {
    prompt: topic || "Gândește-te la o undiță pe care ai putea-o construi — ceva care îi învață pe alții să pescuiască singuri, nu care le dă peștele gata. Nu contează produsul în sine, ci capacitatea pe care o creezi în oameni. Cum ar arăta?",
    suggestedMinutes: 12,
    internalPurpose: "Explorare impact transformațional — undița, nu peștele",
    targetDimension: "transfer_practica",
  }
}

// ── Generic (Card 6 sau profil necunoscut) ────────────────────────────────

function generateGenericPrompt(
  h: HermannDominance, phase: CognitiveProfile["spiralPhase"], topic?: string
): JournalPrompt {
  if (h === "UNKNOWN") {
    return {
      prompt: topic || "Ce-ți trece prin minte chiar acum? Timp de 5 minute, lasă gândurile să curgă fără să le oprești, fără să corectezi nimic. Apoi recitește ce ai scris — ce te surprinde?",
      hint: "Nu contează ce scrii. Contează că scrii.",
      suggestedMinutes: 7,
      internalPurpose: "Free writing — detectare stil cognitiv din output (profil necunoscut)",
      targetDimension: "auto_cunoastere",
    }
  }
  return {
    prompt: topic || "Ce ai descoperit despre tine în ultima perioadă care simți că a meritat să afli? Dar ce ai descoperit și ai fi preferat să nu afli?",
    suggestedMinutes: 10,
    internalPurpose: "Reflecție generală — deschidere și onestitate",
    targetDimension: "profunzime_reflectie",
  }
}
