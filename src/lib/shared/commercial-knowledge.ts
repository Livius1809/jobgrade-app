/**
 * commercial-knowledge.ts — Cunoașterea comercială partajată între toți agenții host
 *
 * PRINCIPIU: Clientul nu trebuie trimis înapoi la recepție ca să afle prețuri.
 * Ghidul din sală (Profiler, HR_Counselor) știe tot ce știe și recepționerul (SOA).
 * Dar răspunde în TONUL LUI, nu în tonul vânzătorului.
 *
 * Fluxul:
 *   1. Clientul e pe pagina principală → SOA îl ghidează, informează, convinge
 *   2. Clientul își face cont → intră în B2C (Profiler host) sau B2B (HR_Counselor host)
 *   3. Clientul vrea un serviciu nou → întreabă hostul local
 *   4. Hostul local ACCESEAZĂ cunoașterea comercială fără a schimba tonul
 *
 * Ce conține:
 *   - Prețuri, condiții de activare, pachete
 *   - Descrieri servicii (ce primește clientul)
 *   - FAQ comercial
 *   - Condiții de utilizare (simplificat)
 *   - Ce include fiecare card/serviciu
 */

// ── Servicii B2B ───────────────────────────────────────────────────────────

export interface ServiceInfo {
  code: string
  name: string
  shortDescription: string
  whatClientGets: string[]
  pricing: string
  activationConditions: string
  faq: Array<{ q: string; a: string }>
}

export const B2B_SERVICES: ServiceInfo[] = [
  {
    code: "JOB_GRADING",
    name: "Evaluarea și ierarhizarea posturilor",
    shortDescription: "Evaluați fiecare post din companie pe 6 criterii obiective și construiți o ierarhie corectă.",
    whatClientGets: [
      "Evaluare pe 6 criterii neutre de gen (cunoștințe, comunicare, rezolvare probleme, luarea deciziilor, impact afaceri, condiții muncă)",
      "Proces ghidat pas cu pas — comitetul dumneavoastră evaluează, platforma structurează",
      "Ierarhie completă cu grade salariale",
      "Trail complet de audit (conform Directiva EU 2023/970)",
      "Rapoarte exportabile PDF",
    ],
    pricing: "Costul se calculează pe baza numărului de poziții distincte și a numărului de salariați. Calculator personalizat disponibil în portal. Discount volum automat. Prețuri fără TVA.",
    activationConditions: "Crearea contului de companie + alegerea planului. Se poate începe imediat după plata pentru numărul de poziții ales.",
    faq: [
      { q: "Cât durează procesul complet?", a: "Depinde de numărul de posturi. Pentru 50-80 de posturi, între 2 și 4 săptămâni, cu efort estimat de 2-3 ore pe săptămână din partea comitetului." },
      { q: "Cine face evaluarea?", a: "Un comitet intern din compania dumneavoastră (de obicei 3-5 persoane: HR, management, reprezentanți angajați). Platforma ghidează procesul." },
      { q: "E conformă cu directiva EU?", a: "Da. Metodologia îndeplinește cerințele Directivei 2023/970: criterii obiective, neutre de gen, trail de audit complet." },
    ],
  },
  {
    code: "PAY_GAP",
    name: "Analiza diferențelor salariale (Pay Gap)",
    shortDescription: "Identificați și documentați diferențele salariale de gen, conform directivei europene.",
    whatClientGets: [
      "Raport Pay Gap pe categorii de lucrători echivalenți",
      "Identificare diferențe >5% care necesită justificare",
      "Plan de remediere cu timeline",
      "Documentație pentru autoritățile de supraveghere",
    ],
    pricing: "Inclus în planul Professional și Enterprise. Pentru Starter: disponibil ca add-on.",
    activationConditions: "Necesită finalizarea evaluării posturilor (Job Grading) + import date salariale.",
    faq: [
      { q: "Am nevoie de job grading înainte?", a: "Da. Pay Gap-ul compară salarii pe categorii echivalente de posturi — fără ierarhie nu avem categorii." },
      { q: "Ce se întâmplă dacă diferența e mare?", a: "Platforma vă ajută cu un plan de remediere. Nu suntem organ de control — suntem partener." },
    ],
  },
  {
    code: "SALARY_STRUCTURE",
    name: "Structuri salariale echitabile",
    shortDescription: "Construiți grile salariale corecte, bazate pe evaluarea obiectivă a posturilor.",
    whatClientGets: [
      "Grilă salarială pe grade (min-mid-max per grad)",
      "Benchmarking cu piața (unde disponibil)",
      "Simulări impact bugetar",
      "Recomandări de ajustare prioritizate",
    ],
    pricing: "Inclus în planul Professional și Enterprise. Starter: add-on.",
    activationConditions: "Necesită finalizarea evaluării posturilor.",
    faq: [
      { q: "Pot folosi grila și pentru viitoarele angajări?", a: "Da. Grila devine referința dumneavoastră pentru ofertele salariale la angajare." },
    ],
  },
]

// ── Servicii B2C (Carduri) ─────────────────────────────────────────────────

export const B2C_CARDS: ServiceInfo[] = [
  {
    code: "CARD_6",
    name: "Spune-mi despre mine (Profiler)",
    shortDescription: "Profilerul tău personal — te cunoaște din fiecare interacțiune.",
    whatClientGets: [
      "Profilare continuă din toate conversațiile și testele tale",
      "Profil Herrmann (cum gândești)",
      "Trăsături de caracter (VIA Character Strengths)",
      "Traseu evolutiv vizual (spirala ta personală)",
    ],
    pricing: "Gratuit — activ din momentul creării contului.",
    activationConditions: "Crearea contului (alias + email).",
    faq: [
      { q: "Ce date colectează?", a: "Doar ce-i spui tu în conversații și ce completezi în teste. Totul legat de aliasul tău, nu de identitatea reală." },
    ],
  },
  {
    code: "CARD_3",
    name: "Îmi asum un rol profesional (Consilier Carieră)",
    shortDescription: "Descoperă-ți valoarea profesională reală și găsește rolul potrivit.",
    whatClientGets: [
      "Extracție profil din CV pe cele 6 criterii JobGrade",
      "Posturi disponibile agregate din surse publice",
      "Raport compatibilitate cu posturi concrete (plătit)",
      "Consiliere prezentare la interviu (plătit)",
    ],
    pricing: "Cardul e gratuit și activ din start. Serviciile avansate (raport compatibilitate, consiliere interviu) se plătesc cu credite.",
    activationConditions: "Activ din momentul creării contului.",
    faq: [
      { q: "Cât costă un raport de compatibilitate?", a: "Se plătește cu credite din cont. Creditele se pot achiziționa din platforma, la prețuri accesibile." },
    ],
  },
  {
    code: "CARD_1",
    name: "Drumul către mine (Călăuza)",
    shortDescription: "Cel mai profund strat — cine ești cu adevărat, dincolo de roluri.",
    whatClientGets: [
      "Conversații ghidate cu Călăuza",
      "Exerciții de auto-cunoaștere adaptate la profilul tău cognitiv",
      "Jurnal adaptat (prompt-uri personalizate Herrmann + spirală)",
      "Acces la comunitate (condiționat de progres)",
    ],
    pricing: "Se activează cu credite.",
    activationConditions: "Achiziție credite + activare din interfață. Recomandat după câteva conversații cu Profiler-ul.",
    faq: [
      { q: "Trebuie să fac ceva înainte?", a: "Nu e obligatoriu, dar experiența e mai bogată dacă ai vorbit deja cu Profiler-ul. El îi spune Călăuzei ce a observat despre tine." },
    ],
  },
  {
    code: "CARD_2",
    name: "Eu și ceilalți, adică NOI (Consilier Dezvoltare Personală)",
    shortDescription: "Înțelege cum funcționezi în relație cu ceilalți.",
    whatClientGets: [
      "Hartă a relațiilor tale importante",
      "Identificare tipare relaționale",
      "Consiliere ghidată pentru îmbunătățirea relațiilor",
      "Acces comunitate (condiționat de progres — nu din start)",
    ],
    pricing: "Se activează cu credite.",
    activationConditions: "Achiziție credite + activare.",
    faq: [
      { q: "De ce nu am acces la comunitate imediat?", a: "Comunitatea se deschide când ești pregătit. Consilierul evaluează momentul potrivit — ca să fie un spațiu de creștere, nu de ventilare." },
    ],
  },
  {
    code: "CARD_4",
    name: "Oameni de succes, oameni de valoare (Coach)",
    shortDescription: "Distincția fundamentală: succes (exterior) vs. valoare (interior).",
    whatClientGets: [
      "Coaching ghidat pe tranziția succes → valoare",
      "Evaluare trăsături de caracter (VIA — cultivate vs. necultivate)",
      "Harta impactului — cui faci bine prin ceea ce faci",
      "Exerciții Karma Yoga (acțiune fără atașament de rezultat)",
    ],
    pricing: "Se activează cu credite.",
    activationConditions: "Achiziție credite + activare. Experiența e completă dacă ai parcurs Card 1-3.",
    faq: [],
  },
  {
    code: "CARD_5",
    name: "Antreprenoriatul transformațional (Coach)",
    shortDescription: "Pune totul cap la cap într-un proiect care contează.",
    whatClientGets: [
      "Sinteză evolutivă — tot drumul tău pe toate cardurile",
      "Harta binelui propagat (de la tine spre lume)",
      "Plan de acțiune transformațional",
      "Coaching integrativ",
    ],
    pricing: "Se activează cu credite.",
    activationConditions: "Achiziție credite + activare. Acest card integrează toate celelalte — experiența e maximă cu cât mai multe carduri parcurse.",
    faq: [],
  },
]

// ── Informații generale ────────────────────────────────────────────────────

export const GENERAL_COMMERCIAL = {
  companyName: "Psihobusiness Consulting SRL",
  cif: "RO15790994",
  platform: "JobGrade",
  website: "jobgrade.ro",

  b2bPricing: {
    summary: "Costul se calculează pe baza numărului de poziții distincte din statul de funcții și a numărului de salariați. Calculator personalizat disponibil în portal.",
    plans: [
      { name: "Starter", positions: "1-50", price: "calculator personalizat", launch: "calculator personalizat", earlyAdopter: "discount volum automat" },
      { name: "Professional", positions: "51-150", price: "calculator personalizat", launch: "calculator personalizat", earlyAdopter: "discount 12%" },
      { name: "Enterprise", positions: "150+", price: "calculator personalizat", launch: "calculator personalizat", earlyAdopter: "discount 25%" },
    ],
    pricingModel: "Credite: 1 credit = 8 RON. Costul per serviciu = credite calculate din formulă (poziții × factor + salariați × factor). Discount volum automat pe baza dimensiunii organizației.",
    earlyAdopter: "Primii 20 de clienți beneficiază de un preț de lansare cu reducere, blocat pe toată durata contractului.",
    billing: "Facturare upfront, reînnoire anuală la 50% din prețul inițial.",
    vatNote: "Prețurile B2B sunt fără TVA.",
  },

  b2cPricing: {
    summary: "Card 3 (Carieră) și Card 6 (Profiler) sunt gratuite. Celelalte carduri se activează cu credite.",
    credits: "Creditele se pot achiziționa din platformă. Prețul include TVA.",
    freeCards: ["CARD_3", "CARD_6"],
    paidCards: ["CARD_1", "CARD_2", "CARD_4", "CARD_5"],
    vatNote: "Prețurile B2C includ TVA.",
  },

  accountCreation: {
    b2b: "Contul se creează cu date reale ale companiei (denumire, CUI, persoana de contact). După plată se activează imediat.",
    b2c: "Contul se creează cu un alias (pseudonim) ales de client. Nu sunt necesare date personale reale. Primește o adresă de email pe jobgrade.ro.",
  },

  gdpr: "Platforma respectă integral GDPR. B2C: profil legat de pseudonim, nu de identitate reală (privacy by design). Date reale doar dacă clientul vrea factură.",
  aiAct: "Platforma respectă AI Act (Reg. 2024/1689). Supraveghere umană asigurată de psihologi acreditați CPR.",
  directive: "Conformitate cu Directiva EU 2023/970 privind transparența salarială. Termen: 7 iunie 2026.",
}

// ── Detectare întrebări comerciale ─────────────────────────────────────────

const COMMERCIAL_PATTERNS = [
  { pattern: /pre[tț]|cost[aă]?|c[aâ]t\b|tarif|pla[tț]|achizi[tț]|cump[aă]r/i, topic: "pricing" },
  { pattern: /activ[aă]|activez|deschid|deblocez|cum\s*(pot|fac|accesez)/i, topic: "activation" },
  { pattern: /card\s*\d|serviciu|pachet|plan\b|starter|professional|enterprise/i, topic: "services" },
  { pattern: /cont\b|[iî]nregistr|[iî]nscri|sign\s*up/i, topic: "account" },
  { pattern: /credit|bani|plat[aă]|factur[aă]|tva/i, topic: "billing" },
  { pattern: /gdpr|date\s*personale|confiden[tț]ial|anonim/i, topic: "privacy" },
  { pattern: /directiv[aă]|conformitate|legisla[tț]|termen|2026|2023\/970/i, topic: "compliance" },
  { pattern: /demo|prezentare|ar[aă]t[aă]|cum\s*func[tț]ioneaz[aă]/i, topic: "demo" },
]

export type CommercialTopic = "pricing" | "activation" | "services" | "account" | "billing" | "privacy" | "compliance" | "demo"

/**
 * Detectează dacă mesajul clientului conține o întrebare comercială.
 * Returnează topic-ul detectat sau null.
 */
export function detectCommercialQuestion(message: string): CommercialTopic | null {
  for (const { pattern, topic } of COMMERCIAL_PATTERNS) {
    if (pattern.test(message)) return topic as CommercialTopic
  }
  return null
}

/**
 * Construiește contextul comercial relevant pentru un topic detectat.
 * Agentul host primește această informație și o livrează în TONUL LUI.
 */
export function getCommercialContext(topic: CommercialTopic, context: "B2B" | "B2C"): string {
  const g = GENERAL_COMMERCIAL

  switch (topic) {
    case "pricing":
      return context === "B2B"
        ? `INFORMAȚII PREȚURI B2B (răspunde în tonul tău, nu ca vânzător):
${g.b2bPricing.summary}
Planuri: ${g.b2bPricing.plans.map(p => `${p.name} (${p.positions}): ${p.launch} lansare`).join("; ")}
${g.b2bPricing.earlyAdopter}
${g.b2bPricing.billing}
${g.b2bPricing.vatNote}`
        : `INFORMAȚII PREȚURI B2C (răspunde în tonul tău, nu ca vânzător):
${g.b2cPricing.summary}
${g.b2cPricing.credits}
Carduri gratuite: Profiler + Consilier Carieră (active din start).
Carduri cu credite: Călăuza, Relații, Coach (succes/valoare), Coach (antreprenoriat).
${g.b2cPricing.vatNote}`

    case "activation": {
      const services = context === "B2B" ? B2B_SERVICES : B2C_CARDS
      return `CONDIȚII DE ACTIVARE (răspunde în tonul tău):
${services.map(s => `${s.name}: ${s.activationConditions}`).join("\n")}`
    }

    case "services": {
      const services = context === "B2B" ? B2B_SERVICES : B2C_CARDS
      return `SERVICII DISPONIBILE (răspunde în tonul tău):
${services.map(s => `${s.name}: ${s.shortDescription}\nPricing: ${s.pricing}`).join("\n\n")}`
    }

    case "account":
      return `CREARE CONT (răspunde în tonul tău):
${context === "B2B" ? g.accountCreation.b2b : g.accountCreation.b2c}`

    case "billing":
      return context === "B2B"
        ? `FACTURARE B2B: ${g.b2bPricing.billing} ${g.b2bPricing.vatNote}`
        : `CREDITE B2C: ${g.b2cPricing.credits} ${g.b2cPricing.vatNote}`

    case "privacy":
      return `CONFIDENȚIALITATE: ${g.gdpr}`

    case "compliance":
      return `CONFORMITATE: ${g.directive} ${g.aiAct}`

    case "demo":
      return `DEMO: Demonstrația durează aproximativ 30 de minute. Clientul vede platforma pe un scenariu real din domeniul lui. Poate fi programată de pe pagina /b2b sau prin conversație.`
  }
}

/**
 * Injectează cunoașterea comercială în promptul agentului host,
 * DOAR dacă mesajul clientului conține o întrebare comercială.
 *
 * Principiu: hostul local (Profiler/HR_Counselor) răspunde în tonul lui,
 * cu informațiile pe care le-ar fi dat SOA pe pagina principală.
 * Clientul nu e trimis înapoi la recepție.
 */
export function injectCommercialKnowledge(
  message: string,
  agentContext: "B2B" | "B2C"
): string {
  const topic = detectCommercialQuestion(message)
  if (!topic) return ""

  const context = getCommercialContext(topic, agentContext)

  return `
--- CUNOAȘTERE COMERCIALĂ (partajată cu SOA — răspunde în tonul TĂU, nu ca vânzător) ---
${context}

REGULI:
- Răspunde natural, în tonul tău obișnuit (nu deveni agent de vânzări)
- Oferă informația cerută concret, fără upsell agresiv
- Dacă clientul vrea mai multe detalii tehnice sau o demonstrație, poți sugera: "Pot să vă arăt mai multe despre cum funcționează" sau ghidează spre pagina relevantă
- NU spune "nu știu, întrebați pe altcineva" — TU știi răspunsul
---`
}
