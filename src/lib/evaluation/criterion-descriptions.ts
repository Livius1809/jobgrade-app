/**
 * criterion-descriptions.ts — Descrieri client-facing ale nivelurilor per criteriu
 *
 * FĂRĂ punctaje — doar descrieri textuale.
 * Folosit în simulator pentru dropdown-uri cu fade overlay.
 */

export const CRITERION_DESCRIPTIONS: Record<string, Array<{ letter: string; description: string }>> = {
  Knowledge: [
    { letter: "A", description: "Pregătire minimă, fără experiență profesională relevantă" },
    { letter: "B", description: "Studii medii, 6-12 luni experiență în domeniu" },
    { letter: "C", description: "Studii medii cu specializare, 1-2 ani experiență relevantă" },
    { letter: "D", description: "Studii superioare sau colegiu, 2-3 ani experiență" },
    { letter: "E", description: "Studii universitare, 4-6 ani experiență relevantă" },
    { letter: "F", description: "Studii universitare, 8-10 ani experiență, expertiză avansată" },
    { letter: "G", description: "Studii postuniversitare, peste 10 ani experiență, expert recunoscut" },
  ],
  Communications: [
    { letter: "A", description: "Comunicare de bază — informații simple, conversație curentă" },
    { letter: "B", description: "Comunicare moderată — anumite abilități de convingere" },
    { letter: "C", description: "Comunicare dezvoltată — persuasiune, influențare, negociere" },
    { letter: "D", description: "Comunicare avansată — relații complexe, influențare comportament" },
    { letter: "E", description: "Comunicare la nivel strategic — toate nivelurile organizației, confidențialitate ridicată" },
  ],
  ProblemSolving: [
    { letter: "A", description: "Probleme identice, repetitive — supervizare directă" },
    { letter: "B", description: "Probleme similare — analiză de bază, supervizare disponibilă" },
    { letter: "C", description: "Probleme variate — analiză moderată, consultare la nevoie" },
    { letter: "D", description: "Probleme diverse — creativitate, latitudine în abordare" },
    { letter: "E", description: "Probleme complexe — gândire abstractă, rezolvare independentă" },
    { letter: "F", description: "Probleme foarte diverse — cercetare, analiză avansată" },
    { letter: "G", description: "Probleme strategice — integrare inter-departamentală, funcție critică" },
  ],
  DecisionMaking: [
    { letter: "A", description: "Decizii simple — instrucțiuni clare, proceduri fixe" },
    { letter: "B", description: "Decizii de rutină — metode bine definite" },
    { letter: "C", description: "Decizii standard — inclusiv unele situații neprevăzute" },
    { letter: "D", description: "Decizii independente — poate modifica proceduri existente" },
    { letter: "E", description: "Decizii complexe — autoritate în cadrul politicii organizației" },
    { letter: "F", description: "Decizii multiple complexe — rapiditate și flexibilitate" },
    { letter: "G", description: "Decizii cu impact strategic pe termen lung" },
  ],
  BusinessImpact: [
    { letter: "A", description: "Impact limitat — contribuție indirectă sau inexistentă asupra rezultatelor" },
    { letter: "B", description: "Impact minor — munca este pre-verificată de alții" },
    { letter: "C", description: "Impact semnificativ — consiliere și analiză ca suport decizional" },
    { letter: "D", description: "Impact direct și major — responsabilitate pe rezultatele organizației" },
  ],
  WorkingConditions: [
    { letter: "A", description: "Condiții minimale — birou, fără riscuri, stres redus" },
    { letter: "B", description: "Condiții moderate — unele riscuri, mediu nu întotdeauna confortabil" },
    { letter: "C", description: "Condiții dificile — mediu zgomotos, riscuri substanțiale, presiune constantă" },
  ],
}

export const CRITERION_LABELS: Record<string, string> = {
  Knowledge: "Educație și experiență",
  Communications: "Comunicare",
  ProblemSolving: "Rezolvarea problemelor",
  DecisionMaking: "Luarea deciziilor",
  BusinessImpact: "Impact asupra afacerii",
  WorkingConditions: "Condiții de muncă",
}

export const LEGAL_GROUPS = [
  { label: "Cunoștințe și deprinderi profesionale", shortLabel: "Cunoștințe", keys: ["Knowledge", "Communications"] },
  { label: "Efort intelectual și/sau fizic", shortLabel: "Efort", keys: ["ProblemSolving"] },
  { label: "Responsabilități", shortLabel: "Responsabilități", keys: ["DecisionMaking", "BusinessImpact"] },
  { label: "Condiții de muncă", shortLabel: "Condiții", keys: ["WorkingConditions"] },
]
