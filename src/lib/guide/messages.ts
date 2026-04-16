/**
 * messages.ts — bibliotecă de mesaje narrative pentru NarrativeGuide
 *
 * Fiecare mesaj are:
 * - id (unic, pentru tracking „seen" în localStorage)
 * - matcher (path regex + opțional rol + opțional condiție pe state)
 * - conținut (titlu + corp + opțional CTA)
 * - priority (cel mai mare câștigă când mai multe match-uiesc)
 */

export type UserRoleHint = "OWNER" | "COMPANY_ADMIN" | "FACILITATOR" | "REPRESENTATIVE" | "SUPER_ADMIN"

export interface NarrativeContext {
  pathname: string
  role: UserRoleHint | null
  // Indicatori opționali — completați de pagina care invocă guide
  hasIdentity?: boolean
  hasJobs?: boolean
  hasPayroll?: boolean
  relevanceIndex?: number
}

export interface NarrativeMessage {
  id: string
  match: (ctx: NarrativeContext) => boolean
  title: string
  body: string
  cta?: { label: string; href: string }
  priority: number // mai mare = mai prioritar
}

export const NARRATIVE_MESSAGES: NarrativeMessage[] = [
  // ── Portal — primul contact ─────────────────────────────────────
  {
    id: "portal-empty-cui",
    match: (c) => /^\/portal\/?$/.test(c.pathname) && !c.hasIdentity,
    title: "Începe cu identitatea firmei",
    body: `Tastează CUI-ul în cardul „Identitate firmă" și apasă butonul verde 🇷🇴 ANAF. În 2 secunde primești denumire, adresă, COD CAEN, statut TVA — și deblochezi instant 3 servicii gratuite (profil sectorial, top decalaje, MVV draft).`,
    cta: { label: "Adaugă CUI →", href: "/portal" },
    priority: 100,
  },
  {
    id: "portal-empty-jobs",
    match: (c) => /^\/portal\/?$/.test(c.pathname) && c.hasIdentity === true && !c.hasJobs,
    title: "Adaugă fișele de post",
    body: "Următorul pas: încarcă structura de posturi. Ai 3 căi — manual (1 fișă), import Excel (mai multe deodată) sau generare automată cu AI din titluri. Fișele complete deblochează evaluarea, structura salarială și majoritatea serviciilor.",
    cta: { label: "Adaugă fișe →", href: "/jobs" },
    priority: 90,
  },
  {
    id: "portal-empty-payroll",
    match: (c) => /^\/portal\/?$/.test(c.pathname) && c.hasJobs === true && !c.hasPayroll,
    title: "Importă statul de salarii",
    body: "Pentru analiza decalajului salarial (UE 2023/970) și structura salarială pe clase Pitariu ai nevoie de statul de funcții cu salariile actuale. Importul e Excel — îl mapăm noi automat pe coloanele relevante.",
    cta: { label: "Importă →", href: "/pay-gap/employees" },
    priority: 85,
  },
  {
    id: "portal-relevance-low",
    match: (c) => /^\/portal\/?$/.test(c.pathname) && (c.relevanceIndex ?? 0) >= 30 && (c.relevanceIndex ?? 0) < 60,
    title: "Ești la jumătatea drumului",
    body: `Indicele tău de relevanță arată că ai pus baza solidă. Cu fiecare input nou (kpis, comitet evaluare, documente interne), deblochezi servicii avansate. Vezi cardul „Următorul pas recomandat" pentru cea mai bună acțiune acum.`,
    priority: 50,
  },
  {
    id: "portal-relevance-high",
    match: (c) => /^\/portal\/?$/.test(c.pathname) && (c.relevanceIndex ?? 0) >= 60,
    title: "Foarte aproape de complet",
    body: `Aproape toate inputurile esențiale sunt completate. Concentrează-te pe rapoarte: rulează cele de pe lista „Jurnal rapoarte" pentru a vedea KPI-urile soft (cultură, performanță, procese) cum se calculează în Snapshot.`,
    cta: { label: "Vezi rapoarte →", href: "/reports" },
    priority: 50,
  },

  // ── Pagini de lucru ──────────────────────────────────────────────
  {
    id: "jobs-list",
    match: (c) => /^\/jobs\/?$/.test(c.pathname),
    title: "Fișele sunt fundamentul",
    body: `Cu cât descrii mai concret atribuțiile și cerințele, cu atât AI-ul scorează mai precis evaluarea. Pentru o fișă nouă, recomand „Generare automată cu AI" — îți propune un draft complet din titlu și CAEN-ul firmei, pe care apoi îl ajustezi.`,
    cta: { label: "Fișă nouă cu AI →", href: "/jobs/new?mode=ai" },
    priority: 70,
  },
  {
    id: "sessions-list",
    match: (c) => /^\/sessions\/?$/.test(c.pathname),
    title: "Trei moduri de evaluare",
    body: "1) Automată cu AI — cea mai rapidă, fără efort uman. 2) Semi-automată — comisie + medierea AI pentru consens. 3) Manuală — comisie + facilitator uman. Toate trei produc același tabel cu litere și scoruri. Diferența e nivelul de implicare al echipei tale.",
    priority: 60,
  },
  {
    id: "pay-gap",
    match: (c) => /^\/pay-gap/.test(c.pathname),
    title: "Conformitate UE 2023/970",
    body: "Directiva cere raport de transparență salarială pentru companiile cu peste 100 de angajați. Sub 100 e opțional, dar recomandat — îți evită surprize la angajări noi sau audituri viitoare.",
    priority: 60,
  },
  {
    id: "company",
    match: (c) => /^\/company\/?$/.test(c.pathname),
    title: "Detalii avansate companie",
    body: "Aici rafinezi misiunea, viziunea, valorile. Pentru identitatea de bază (denumire, adresă, CAEN), folosește direct butonul ANAF din portal — e mult mai rapid și complet.",
    priority: 55,
  },
  {
    id: "reports",
    match: (c) => /^\/reports\/?$/.test(c.pathname),
    title: "Rapoartele tale",
    body: "Aici găsești toate rapoartele generate. Fiecare poate fi descărcat în PDF sau Excel. Tipurile noi de rapoarte (Cultură, Procese & Calitate, Multigen) apar pe măsură ce rulezi serviciile corespunzătoare.",
    priority: 55,
  },

  // ── Fallback general (cea mai joasă prioritate) ─────────────────
  {
    id: "fallback-portal",
    match: (c) => /^\/portal\/?$/.test(c.pathname),
    title: "Bun venit pe panoul JobGrade",
    body: `Aici ai vederea de ansamblu: snapshotul organizației sus, datele tale și serviciile disponibile mai jos. Pe măsură ce adaugi inputuri noi, indicele de relevanță crește și mai multe servicii se activează. Apasă din nou „🌟 Ghid" pe alte pagini pentru explicații contextuale.`,
    priority: 1,
  },
  {
    id: "fallback-any",
    match: () => true,
    title: "Călăuza JobGrade",
    body: "Sunt aici cu sfaturi adaptate la pagina pe care te afli. Navighează prin portal, fișe de post, sesiuni sau rapoarte — pe fiecare pagină voi avea o sugestie relevantă pentru pasul următor.",
    priority: 0,
  },
]

/**
 * Alege cel mai relevant mesaj pentru contextul curent.
 * Returnează `null` dacă niciun mesaj nu match-uiește.
 */
export function pickNarrative(ctx: NarrativeContext): NarrativeMessage | null {
  const matches = NARRATIVE_MESSAGES.filter((m) => m.match(ctx))
  if (matches.length === 0) return null
  matches.sort((a, b) => b.priority - a.priority)
  return matches[0]
}
