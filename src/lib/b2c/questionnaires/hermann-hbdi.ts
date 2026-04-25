/**
 * Chestionar Herrmann HBDI — Preferință emisferică acțională
 *
 * 72 întrebări, Likert 1-5 (foarte puțin → foarte mult)
 * 4 cadrane: CoS (Cortical Stâng), CoD (Cortical Drept),
 *            LiS (Limbic Stâng), LiD (Limbic Drept)
 *
 * Mapare cadrane → profiler B2C:
 *   CoS = A (Analitic)
 *   LiS = B (Secvențial)
 *   LiD = C (Interpersonal)
 *   CoD = D (Imaginativ)
 *
 * Formulă scorare:
 *   scor_cadran = (suma_18_itemi / 90) * 100
 *
 * Scoruri derivate:
 *   Raționalitate    = (CoS + CoD) / 2
 *   Emoționalitate   = (LiS + LiD) / 2
 *   Mod stâng        = (CoS + LiS) / 2
 *   Mod drept        = (CoD + LiD) / 2
 */

import type {
  HermannQuestion,
  HermannQuadrant,
  HermannAnswers,
  HermannResult,
} from "./types"

// ── Întrebările (72 items) ──────────────────────────────────
// Items 1-18 → CoS, 19-36 → CoD, 37-54 → LiS, 55-72 → LiD

function q(id: number, text: string): HermannQuestion {
  let quadrant: HermannQuadrant
  if (id <= 18) quadrant = "CoS"
  else if (id <= 36) quadrant = "CoD"
  else if (id <= 54) quadrant = "LiS"
  else quadrant = "LiD"
  return { id, text, quadrant }
}

export const HERMANN_QUESTIONS: HermannQuestion[] = [
  // ── CoS: Cortical Stâng (Analitic) — Items 1-18 ──────────
  q(1, "Sunteți înclinat să considerați lucrurile sau ideile prin componentele lor, deci analitic, mai curând decât global, luate ca întreguri (ansambluri)?"),
  q(2, "Când stabiliți planul unei excursii (călătorii), vă gândiți la cele mai mici amănunte?"),
  q(3, 'Sunteți genul de om care gândește astfel: „Știu la ce să mă aștept datorită lucrurilor care mi s-au întâmplat până acum"?'),
  q(4, "Percepeți, înțelegeți și manipulați cu ușurință cifrele? Aveți îndemânare în operarea cu cifre sau calcule?"),
  q(5, "Manifestați interes pentru relațiile numerice, pentru măsurarea cantităților, dimensiunilor, proporțiilor?"),
  q(6, "Vă exprimați bine în scris? Preferați să vă exprimați mai mult în scris decât oral?"),
  q(7, "Vedeți lucrurile succesiv, unele în continuarea altora, în șiruri sau în serii?"),
  q(8, "Aveți capacitatea de a înțelege și a utiliza cunoștințele teoretice sau pe cele tehnice?"),
  q(9, "Vă exprimați clar și eficient prin cuvinte? Aveți aptitudini pentru exprimarea orală?"),
  q(10, "În rezolvarea problemelor procedați metodic, din etapă în etapă?"),
  q(11, "Sunteți înclinat să verificați ideile, soluțiile?"),
  q(12, "Sunteți competent în manipularea datelor cantitative referitoare la costuri, bugete, investiții?"),
  q(13, "Pentru realizarea oricărui lucru sau acțiuni, simțiți nevoia unor instrucțiuni cât mai precise și mai complete?"),
  q(14, "Când vă exprimați opiniile, simțiți nevoia să le argumentați?"),
  q(15, "În alegerile pe care le faceți, vă bazați pe rațiune sau pe afectivitate?"),
  q(16, "Când aveți de făcut un lucru important, repetați de mai multe ori modul în care veți proceda?"),
  q(17, "În școală v-a plăcut algebra?"),
  q(18, "Atunci când vă referiți la un lucru văzut sau citit, aveți tendința să o faceți cât mai exact posibil? Nu omiteți și nu adăugați nimic, respectând întru totul ordinea în care s-au produs evenimentele."),

  // ── CoD: Cortical Drept (Imaginativ) — Items 19-36 ───────
  q(19, "În ce măsură folosiți capacitatea dvs. de a concepe idei și de a dezvolta concepte generale plecând de la cazuri particulare?"),
  q(20, "Sunteți apreciat ca un om cu multe idei noi, care vede lucrurile sub unghiuri noi, care le reunește într-un mod imaginativ?"),
  q(21, "Aveți tendința de a reuni elemente, idei noi, într-un tot relativ nou (de a sintetiza)?"),
  q(22, "Sunteți un om care vede lucrurile, ideile, faptele, într-o manieră globală, care înțelege ușor ansamblul, fără să-l reducă la elementele lui?"),
  q(23, "Sunteți predispus să faceți combinații noi, să stabiliți noi asociații sau să găsiți soluții noi? Vă este ușor să elaborați imaginile unor obiecte pe care nu le-ați văzut direct sau ale unor lucruri care nici nu există în realitate?"),
  q(24, "Sunteți considerat ca fiind înclinat spre operarea de schimbări? Vă place și vă străduiți să introduceți metode noi, strategii noi, produse și aparate noi?"),
  q(25, "În ce măsură reușiți să combinați părți ale lucrurilor, elemente ale ideilor sau ale situațiilor în ansambluri armonioase și coerente?"),
  q(26, "Cunoașteți unele lucruri, fenomene fără să apelați la raționament; nu aveți nevoie de evidențe sau dovezi pentru a înțelege imediat (dintr-o dată) un lucru?"),
  q(27, "Sunteți considerat un om original, care are idei inedite, personale, cu totul diferite de cele cunoscute și recunoscute?"),
  q(28, "Reușiți să vă ocupați de două lucruri, de două acțiuni în același timp, indiferent dacă ele sunt diferite (vizuale, verbale, muzicale)?"),
  q(29, "Surprindeți cu ușurință relațiile între obiecte în spațiu, vedeți cum formează ele un ansamblu, le puteți manipula, asambla? Aveți o bună vedere spațială?"),
  q(30, "Vă place sau sunteți dotat pentru a crea în domeniile: pictură, desen, sculptură, muzică?"),
  q(31, "În exprimarea gândurilor, folosiți comparații, analogii, metafore?"),
  q(32, "Vă angajați în acțiuni care implică risc?"),
  q(33, "În școală v-a plăcut geometria?"),
  q(34, "Când ascultați sau vedeți idei diferite sau lucruri diferite sunteți înclinat să stabiliți convergențe, să determinați ce au ele în comun?"),
  q(35, "Vi se întâmplă să visați cu ochii deschiși?"),
  q(36, "Pentru a înțelege o problemă, căutați să vizualizați elementele ei, înlocuiți cuvintele prin imagini?"),

  // ── LiS: Limbic Stâng (Secvențial) — Items 37-54 ─────────
  q(37, "Aveți preferințe pentru ceea ce este tradițional, pentru metode, căi a căror eficiență a fost dovedită?"),
  q(38, "Vă obligați la stăpânire de sine, la controlul emoțiilor și al reacțiilor comportamentale?"),
  q(39, "Judecați atent valoarea sau fezabilitatea unui lucru, analizați defectele?"),
  q(40, "Sunteți mai atent la propriile idei, reacții, decât la cele aparținând lumii exterioare dvs.?"),
  q(41, "Acordați atenție și importanță detaliilor?"),
  q(42, "Aranjați, ordonați, îmbinați lucruri, fapte, idei, persoane, în asociații curente?"),
  q(43, "Vă atrag lucrurile, situațiile care inspiră siguranță?"),
  q(44, 'Vă interesează mai mult „cum" decât „de ce" trebuie făcut un lucru?'),
  q(45, "Vă caracterizează spiritul de contradicție? Vi se întâmplă des să aveți păreri, idei opuse celor pe care le auziți sau le citiți?"),
  q(46, "Sunteți preocupat să vă realizați cât mai repede proiectele?"),
  q(47, "Sunteți de părere că orice instrucțiune, orice regulă trebuie respectată întocmai?"),
  q(48, "Vedeți mai curând deosebirile decât asemănările dintre diverse lucruri, fapte, idei?"),
  q(49, "În cele mai multe dintre situații dați dovadă de fermitate, de hotărâre?"),
  q(50, "Sunteți considerat un bun orator, care stăpânește arta vorbirii?"),
  q(51, "În orice faceți, simțiți nevoia să planificați totul, până la cele mai mici amănunte?"),
  q(52, "Sunteți un om ordonat?"),
  q(53, "Reușiți să vă impuneți unui grup prin ideile, opiniile dv.?"),
  q(54, "Sunteți realist?"),

  // ── LiD: Limbic Drept (Interpersonal) — Items 55-72 ──────
  q(55, "Înțelegeți și împărtășiți sentimentele, reacțiile, suferințele altora; reușiți să exprimați acest lucru?"),
  q(56, "Sunteți predispus la emoții puternice pe care le exprimați prin comportament?"),
  q(57, "Vă interesează lumea exterioară mai mult decât propria persoană? Vă exprimați rapid și ușor ideile, sentimentele față de alții?"),
  q(58, "Utilizați obiecte, figuri, desene, imagini pentru a prezenta idei sau fapte logice?"),
  q(59, "Vă interesează mai mult ceea ce privește spiritul, ceea ce este imaterial, decât ceea ce este material?"),
  q(60, "Vă place mai mult să dați viață proiectelor dvs., decât să le concepeți?"),
  q(61, "Aveți capacitatea de a-i convinge pe ceilalți?"),
  q(62, "În relațiile cu semenii dvs., manifestați afecțiune?"),
  q(63, "Dacă în realizarea unui lucru sunt multe incertitudini, semne de întrebare, porniți la drum?"),
  q(64, "Sunteți meloman, vă place să ascultați sau să interpretați lucrări muzicale?"),
  q(65, "Vă atrag lucrurile noi, experiențele noi?"),
  q(66, "Vă place să dați sfaturi altora?"),
  q(67, "Sunteți sociabil, stabiliți cu ușurință relații cu cei care vă înconjoară?"),
  q(68, "Reușiți să explicați altora concepte, metode, idei, astfel încât să le poată înțelege și folosi?"),
  q(69, "Manifestați încredere în alții?"),
  q(70, "Vi s-a întâmplat ca, privind pentru prima dată locuri, situații, lucruri, să aveți impresia că le-ați mai văzut?"),
  q(71, "Vă place să vă comportați cât mai firesc, mai natural și să nu fiți nevoit să vă controlați cuvintele și reacțiile?"),
  q(72, "Cuvintele sau comportamentul neadecvat al semenilor dvs., vă afectează puternic și pentru mult timp?"),
]

// ── Etichete Likert ─────────────────────────────────────────

export const LIKERT_LABELS: Record<number, string> = {
  1: "Foarte puțin",
  2: "Puțin",
  3: "Moderat",
  4: "Mult",
  5: "Foarte mult",
}

// ── Descrieri cadrane ───────────────────────────────────────

export const QUADRANT_DESCRIPTIONS: Record<HermannQuadrant, { label: string; short: string; description: string; learningStyle: string }> = {
  CoS: {
    label: "Cortical Stâng (A)",
    short: "Analitic",
    description: "Apreciază lucrurile prin componentele lor, analitic. Preferă rațiunea logică, înțelege concepte tehnice și științifice, măsoară cu precizie, manipulează cifre cu ușurință. Reflecție riguroasă, adună faptele înainte de a decide.",
    learningStyle: "Preferă manualul, apreciază cuvântul și discursul, avid de cunoștințe, analizează, raționează, învață reflectând. Are nevoie de fapte, cifre, și teorii.",
  },
  CoD: {
    label: "Cortical Drept (D)",
    short: "Imaginativ",
    description: "Gândește vizualizând, rezolvă prin intuiție. Imaginație pentru a ieși din situații problematice. Acceptă ambiguitatea, sintetizează elemente disparate pentru a crea ceva nou. Percepe lucrurile global.",
    learningStyle: "Individualist în dobândirea cunoștințelor, învață prin descoperire personală. Favorizeaza experimentarea, înțelege prin scheme și desene. Imaginativ, vizual, depășește cadrul expunerii.",
  },
  LiS: {
    label: "Limbic Stâng (B)",
    short: "Secvențial",
    description: "Controlează emoțiile, urmează obișnuințele pentru siguranță. Planifică, organizează, aranjează, ordonează, clasifică. Grijă pentru detaliu, stabilește proceduri, trăiește după orar precis.",
    learningStyle: "Preferă pedagogie structurată, ordonată, în care fiecare etapă se justifică. Vrea să cunoască procesualitatea pentru aptitudini practice. Dorește atmosferă de încredere.",
  },
  LiD: {
    label: "Limbic Drept (C)",
    short: "Interpersonal",
    description: "Dorește să stabilească contacte, se simte bine împreună cu alții. Simte reacțiile celorlalți intuitiv, surprinde semnele non-verbale. Comunicare empatică. Acceptă emoțiile, se entuziasmează pentru un ideal.",
    learningStyle: "Viața de grup, relațiile, ambiența bună sunt criteriile esențiale. Preferă pedagogie emoțională, dobândește cunoștințe ascultând, împărtășind idei cu alții. Sensibil, preferă play-rol.",
  },
}

// ── Scorare ─────────────────────────────────────────────────

/**
 * Calculează rezultatul Herrmann HBDI din răspunsurile date.
 *
 * Formula: scor_cadran = (suma_18_itemi / 90) * 100
 * Min = 18/90*100 = 20, Max = 90/90*100 = 100
 */
export function scoreHermann(answers: HermannAnswers): HermannResult {
  // Grupăm răspunsurile pe cadrane
  const sums: Record<HermannQuadrant, number> = { CoS: 0, CoD: 0, LiS: 0, LiD: 0 }
  const counts: Record<HermannQuadrant, number> = { CoS: 0, CoD: 0, LiS: 0, LiD: 0 }

  for (const question of HERMANN_QUESTIONS) {
    const answer = answers[question.id]
    if (answer != null) {
      sums[question.quadrant] += answer
      counts[question.quadrant]++
    }
  }

  // Scor cadran: (sumă / 90) * 100
  // Dacă nu toate cele 18 întrebări au fost completate, scalăm proporțional
  const score = (quadrant: HermannQuadrant): number => {
    if (counts[quadrant] === 0) return 0
    const maxPossible = counts[quadrant] * 5
    return Math.round((sums[quadrant] / maxPossible) * 1000) / 10
  }

  const CoS = score("CoS")
  const CoD = score("CoD")
  const LiS = score("LiS")
  const LiD = score("LiD")

  // Scoruri derivate
  const rationalitate = Math.round((CoS + CoD) * 5) / 10
  const emotionalitate = Math.round((LiS + LiD) * 5) / 10
  const modStang = Math.round((CoS + LiS) * 5) / 10
  const modDrept = Math.round((CoD + LiD) * 5) / 10

  // Preferințe: top 2 cadrane = preferă, bottom 2 = respinge
  const sorted = [
    { q: "CoS" as HermannQuadrant, v: CoS },
    { q: "CoD" as HermannQuadrant, v: CoD },
    { q: "LiS" as HermannQuadrant, v: LiS },
    { q: "LiD" as HermannQuadrant, v: LiD },
  ].sort((a, b) => b.v - a.v)

  const preferences: Record<HermannQuadrant, "prefera" | "respinge"> = {
    CoS: "respinge", CoD: "respinge", LiS: "respinge", LiD: "respinge",
  }
  preferences[sorted[0].q] = "prefera"
  preferences[sorted[1].q] = "prefera"

  const dominant = sorted[0].q
  const profile = `${sorted[0].q}-${sorted[1].q}`

  return {
    CoS, CoD, LiS, LiD,
    rationalitate, emotionalitate, modStang, modDrept,
    preferences,
    dominant,
    profile,
  }
}

/**
 * Validează dacă chestionarul e complet (toate 72 de răspunsuri)
 */
export function isHermannComplete(answers: HermannAnswers): boolean {
  return HERMANN_QUESTIONS.every(q => answers[q.id] != null && answers[q.id] >= 1 && answers[q.id] <= 5)
}

/**
 * Câte întrebări au fost completate
 */
export function hermannProgress(answers: HermannAnswers): { answered: number; total: number; percent: number } {
  const answered = HERMANN_QUESTIONS.filter(q => answers[q.id] != null).length
  return { answered, total: 72, percent: Math.round((answered / 72) * 100) }
}
