/**
 * cultural-calibration-ro.ts — Calibrare culturală România
 *
 * Bazat pe "Psihologia poporului român" (Daniel David, 2015)
 * și cercetarea de psihologie culturală aplicată.
 *
 * Infuzat în Layer 2 (Resurse Suport) pentru ca TOATE interacțiunile
 * cu piața românească să fie cultural calibrate:
 * - Chat, mesaje, landing pages, email-uri, social media
 * - Comunicare B2B (HR Directors, CEO, C&B Specialists)
 * - Tonul, registrul, apelurile emoționale, construcțiile argumentative
 *
 * PRINCIPIU: Nu exploatăm vulnerabilitățile culturale — le înțelegem
 * pentru a comunica AUTENTIC și EFICIENT, în spiritul BINELUI.
 */

// ── Profilul cognitiv-emoțional al românului (Daniel David) ─────────────────

export const ROMANIAN_PSYCHOLOGY = {
  source: "Psihologia poporului român — Daniel David (2015), cercetare empirică",

  // ── Dimensiuni culturale ──────────────────────────────────────────────────

  dimensions: {
    collectivismVsIndividualism: {
      finding: "România are un profil colectivist moderat — important grupul de referință (familie, echipă, comunitate), dar cu aspirații individualiste crescânde în urban",
      implication: "Comunicarea trebuie să echilibreze: apel la grup ('compania ta', 'echipa voastră') + empowerment individual ('tu decizi', 'tu transformi')",
    },

    distantaPutere: {
      finding: "Distanță mare față de putere (Hofstede ~90) — respectul pentru autoritate e înrădăcinat, dar coexistă cu neîncrederea în instituții",
      implication: "Comunicăm cu autoritate expertă (nu instituțională). Validarea vine din competență, nu din titlu. Expertul e respectat, birocratul e suspectat.",
    },

    evitareaIncertitudinii: {
      finding: "Nivel foarte ridicat de evitare a incertitudinii (~90 Hofstede) — anxietate în fața necunoscutului, preferință pentru reguli clare, teamă de risc",
      implication: "Oferim CERTITUDINE: pași clari, garanții, conformitate, securitate. Reducem anxietatea prin structură. 'Vei ști exact ce faci la fiecare pas.'",
    },

    masculinitate: {
      finding: "Scor moderat spre masculin (~42) — competiția e prezentă dar moderată de valorile relaționale. Succesul se măsoară și prin relații, nu doar prin bani.",
      implication: "Nu vindem doar ROI — vindem și relația, încrederea, echitatea. 'Nu doar numere corecte — oameni tratați corect.'",
    },

    orientareTermenLung: {
      finding: "Orientare predominant pe termen scurt (~52) — pragmatism, rezultate imediate, scepticism față de planuri pe 10 ani",
      implication: "Comunicăm beneficii imediate + deadline-uri concrete. 'Rezultate în 24h', 'Conformitate din prima zi', nu 'viziune pe 5 ani'.",
    },
  },

  // ── Profilul cognitiv (Daniel David — cercetare empirică) ─────────────────

  cognitivProfile: {
    catastrophizing: {
      finding: "Tendință ridicată spre catastrofizare — anticiparea celui mai rău scenariu. 'Ce se întâmplă dacă nu merge?'",
      doNot: "NU exploata frica (ar fi UMBRA — manipulare). NU amenința cu amenzi ca principal argument.",
      do: "RECUNOAȘTE îngrijorarea legitimă. Oferă soluția ca rețea de siguranță: 'Înțelegem că e mult de procesat. De aceea am construit pași simpli.'",
    },

    selfEfficacy: {
      finding: "Auto-eficacitate relativ scăzută la nivel de grup — 'noi nu putem', 'la noi nu merge', 'România e diferită'",
      doNot: "NU ignora acest sentiment. NU spune 'e simplu' (invalidezi experiența lor de dificultate).",
      do: "VALIDEAZĂ dificultatea, apoi arată că soluția e construită SPECIFIC pentru contextul lor: 'Am construit JobGrade pentru realitățile din România, nu am tradus o soluție vestică.'",
    },

    externalLocusOfControl: {
      finding: "Tendință spre locus extern al controlului — 'depinde de legi', 'depinde de piață', 'nu depinde de mine'",
      doNot: "NU îi vorbești ca și cum are control total. NU spune 'doar depinde de tine.'",
      do: "RECUNOAȘTE constrângerile externe, apoi arată unde ARE control: 'Legea se schimbă, da. Dar cum te pregătești — asta depinde de tine. Noi te ajutăm.'",
    },

    socialDesirability: {
      finding: "Dezirabilitate socială crescută — dorința de a părea bine, de a fi aprobat, teamă de judecată",
      doNot: "NU pune clientul în poziție de vulnerabilitate publică. NU cere testimoniale care expun probleme.",
      do: "Oferă confidențialitate. Mesajul: 'Datele tale sunt ale tale. Nimeni nu vede ce nu vrei să fie văzut.'",
    },
  },

  // ── Relația cu autoritatea și încrederea ──────────────────────────────────

  trustPatterns: {
    institutionalDistrust: {
      finding: "Neîncredere profundă în instituții (stat, justiție, administrație) — dar încredere ridicată în relații personale și experți recunoscuți",
      implication: "Nu ne poziționăm ca instituție — ci ca EXPERT DE ÎNCREDERE. Comunicarea e personală, nu corporatistă.",
    },

    wordOfMouth: {
      finding: "Încrederea vine prin recomandare personală (rețea de încredere), nu prin publicitate",
      implication: "Testimonialele și referral-urile sunt mai puternice decât orice campanie. Construim încredere prin relație, nu prin reclamă.",
    },

    skepticismVsHope: {
      finding: "Coexistă un scepticism funcțional ('am mai auzit promisiuni') cu o speranță persistentă ('poate de data asta e diferit')",
      implication: "Recunoaștem scepticismul: 'Știm că ai mai auzit promisiuni de AI care rezolvă tot. Noi nu promitem magie — promitem metodologie.'",
    },
  },

  // ── Comunicare și limbaj ──────────────────────────────────────────────────

  communicationStyle: {
    indirectness: {
      finding: "Comunicare adesea indirectă — mesajul important e sugerat, nu spus direct. Context > conținut explicit.",
      implication: "Nu fi brutal direct (incomod). Construiește contextul, apoi concluzia vine natural.",
    },

    humor: {
      finding: "Umorul auto-deprecativ e semn de inteligență și accesibilitate. Umorul arată că 'ești de-al nostru'.",
      implication: "Un ton ușor auto-ironic (nu despre client!) dezarmează și construiește raport. Dar profesionalismul rămâne dominant.",
    },

    formalityGradient: {
      finding: "Formalitatea depinde MULT de context și relație: primul contact = formal; după încredere = informal rapid",
      implication: "Începem formal-profesional. Pe măsură ce relația se construiește, tonul se relaxează natural. PSYCHOLINGUIST calibrează.",
    },

    storytelling: {
      finding: "Românii răspund puternic la povești și exemple concrete. Abstractul e suspectat, concretul e de încredere.",
      implication: "Arătăm CAZURI, nu teorii. 'O companie din Cluj cu 200 de angajați a redus diferențele salariale cu 23% în 3 luni.'",
    },
  },

  // ── Valori operaționale în muncă ──────────────────────────────────────────

  workValues: {
    fairness: {
      finding: "Sensibilitate extremă la nedreptate și la tratament inechitabil — 'de ce EL da și EU nu?'",
      implication: "ECHITATEA e argument puternic. JobGrade rezolvă exact asta. Mesaj: 'Fiecare angajat evaluat cu aceleași criterii. Fără favoritism.'",
    },

    pragmatism: {
      finding: "Pragmatism funcțional — 'merge?' e mai important decât 'e frumos?'. Rezultatele contează, nu estetica.",
      implication: "Comunicăm FUNCȚIONAL: 'Import fișele → primești ierarhia în 24h.' Nu 'experiență utilizator premium.'",
    },

    resourcefulness: {
      finding: "Descurcăreală și adaptabilitate — 'ne descurcăm noi cumva'. Poate fi și barieră la adoptarea de soluții formale.",
      implication: "Respectăm descurcăreala dar arătăm unde nu e suficientă: 'Te descurci cu Excel? Sigur. Dar Directiva EU cere audit trail, iar Excel nu oferă asta.'",
    },

    relationshipFirst: {
      finding: "Decizia de cumpărare e influențată mai mult de relație decât de features. 'Cumpăr de la cine am încredere.'",
      implication: "Construim relația ÎNAINTE de vânzare: demo personalizat, dialog real, răspunsuri la întrebări, nu pitch automat.",
    },
  },
}

// ── Injection section for agent prompts ─────────────────────────────────────

export function getCulturalCalibrationSection(): string {
  return `
═══ CALIBRARE CULTURALĂ — PIAȚA ROMÂNEASCĂ ═══
(sursa: Psihologia poporului român — Daniel David + cercetare empirică)

PRINCIPIU: Înțelegem psihologia culturală pentru a comunica AUTENTIC, nu manipulativ.

DIMENSIUNI CHEIE:
• Evitare incertitudine RIDICATĂ → oferă certitudine, pași clari, garanții
• Distanță putere MARE → comunicăm cu autoritate expertă, nu birocratică
• Colectivism moderat → echilibrează apelul la grup cu empowerment individual
• Orientare termen SCURT → beneficii imediate, deadline-uri concrete

PROFIL COGNITIV:
• Catastrofizare → NU exploata frica; recunoaște îngrijorarea + oferă rețea siguranță
• Auto-eficacitate scăzută → NU spune "e simplu"; validează dificultatea + arată că soluția e pt contextul lor
• Locus extern control → recunoaște constrângerile + arată unde AU control
• Dezirabilitate socială → oferă confidențialitate, nu expune vulnerabilități

ÎNCREDERE:
• Neîncredere instituțională → nu te poziționa ca instituție, ci ca expert de încredere
• Word-of-mouth > publicitate → recomandarea personală e regele
• Scepticism + speranță → recunoaște scepticismul direct: "Știm că ai mai auzit promisiuni."

COMUNICARE:
• Indirectă → construiește context, concluzia vine natural
• Storytelling > abstractizare → arată cazuri concrete, nu teorii
• Formală inițial → relaxează pe măsură ce se construiește relația
• Echitate ca valoare profundă → "Fiecare angajat evaluat cu aceleași criterii"
• Pragmatism → "Merge?" > "E frumos?" — comunică funcțional
• Relația > features → construiește relația ÎNAINTE de vânzare`
}
