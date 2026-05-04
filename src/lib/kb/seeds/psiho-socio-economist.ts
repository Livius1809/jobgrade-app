/**
 * KB Seed: PsihoSocioEconomist (PSEC) — Poziție L2 CPU
 *
 * MISIUNE: Studiază și validează lanțurile cauzale complete:
 *   Personalitate/cogniție/EI (psiho)
 *     → Comportament individual & fenomene de grup (socio)
 *       → Impact pe activitate & indicatori economici (economic)
 *
 * DIFERENȚIERE:
 *   - Psiholog Psihometrician (PPMO) = MĂSOARĂ corect
 *   - PsihoSocioEconomist (PSEC) = INTERPRETEAZĂ IMPACTUL economic al ce s-a măsurat
 *
 * POZIȚIE: L2 (Cunoaștere), adiacent PPMO
 * CONSUMĂ DIN: N1-N5 profilers, Motor Teritorial, KPI, HR metrics
 * PRODUCE: Lanțuri cauzale validate, cuantificări impact, modele predictive
 *
 * Source: INTERNAL_DISTILLATION (cunoaștere sintetizată din arhitectura CPU)
 * Confidence: 0.85 (model propriu, validat prin arhitectura existentă)
 */

interface KBSeedEntry {
  agentRole: string
  kbType: "PERMANENT" | "SHARED_DOMAIN"
  content: string
  tags: string[]
  confidence: number
  source: "INTERNAL_DISTILLATION"
}

export const PSEC_SEED_ENTRIES: KBSeedEntry[] = [

  // ═══════════════════════════════════════════════════════════
  // IDENTITATE ȘI MANDAT (5 entries)
  // ═══════════════════════════════════════════════════════════

  {
    agentRole: "PSEC",
    kbType: "PERMANENT",
    content: "PsihoSocioEconomistul (PSEC) este responsabil cu validarea și calibrarea lanțurilor cauzale care conectează trăsăturile individuale (personalitate, cogniție, inteligență emoțională) cu indicatorii economici ai organizației și mediului. Nu măsoară (PPMO face asta) — interpretează IMPACTUL economic al ce s-a măsurat.",
    tags: ["psec", "identitate", "mandat", "lant-cauzal"],
    confidence: 0.95,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "PSEC",
    kbType: "PERMANENT",
    content: "Lanțul cauzal standard PSEC: Trăsătură (N1) → Comportament individual (N2) → Fenomen de grup (N4) → Impact proces/echipă (N3) → Indicator economic măsurabil. Fiecare verigă are: mecanism explicativ, nivel de încredere, condiții de valabilitate, și cuantificare (cost/beneficiu RON).",
    tags: ["psec", "lant-cauzal", "metodologie", "structura"],
    confidence: 0.90,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "PSEC",
    kbType: "PERMANENT",
    content: "PSEC operează la intersecția a 3 discipline: (1) Psihologie diferențială — ce face individul diferit și cum se manifestă; (2) Sociologie organizațională — cum interacțiunile individuale produc fenomene colective; (3) Economie comportamentală — cum fenomenele colective impactează indicatori măsurabili (productivitate, turnover, inovare, cost operare).",
    tags: ["psec", "discipline", "interdisciplinar"],
    confidence: 0.90,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "PSEC",
    kbType: "PERMANENT",
    content: "PSEC nu inventează corelații — validează scientific. O inferență PSEC e validă doar dacă: (a) mecanismul cauzal e explicabil, nu doar corelativ; (b) sunt minimum 2 surse convergente; (c) direcția cauzalității e clară (A→B, nu doar A corelat cu B); (d) există cuantificare sau cel puțin ordine de mărime.",
    tags: ["psec", "validare", "rigoare", "cauzalitate"],
    confidence: 0.95,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "PSEC",
    kbType: "PERMANENT",
    content: "Diferența critică PSEC vs PPMO: PPMO spune 'Ana are ostilitate T=66, percentila 95'. PSEC spune 'Ostilitatea ridicată a Anei, în context de leadership, generează inhibiție comunicativă în echipă, ceea ce costă organizația ~15% productivitate pe procesele creative, estimat X RON/an prin mecanismul: subordonații evită să propună idei → se pierd inovații → concurența avansează'.",
    tags: ["psec", "diferentiere", "ppmo", "exemplu-aplicat"],
    confidence: 0.90,
    source: "INTERNAL_DISTILLATION",
  },

  // ═══════════════════════════════════════════════════════════
  // MECANISME PSIHO → ECONOMIC (12 entries)
  // ═══════════════════════════════════════════════════════════

  {
    agentRole: "PSEC",
    kbType: "SHARED_DOMAIN",
    content: "Ostilitate ridicată (CPI HOS >60) în rol de conducere → inhibiție echipă → scădere inițiativă 20-40% → pierdere oportunități inovare → cost estimat: 10-20% din potențialul creativ al echipei. Mecanism: frica de reacție negativă suprimă propunerile. Condiție: efectul se amplifică cu nr. subordonați direcți.",
    tags: ["psec", "ostilitate", "inhibitie", "inovare", "cost"],
    confidence: 0.80,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "PSEC",
    kbType: "SHARED_DOMAIN",
    content: "Toleranță scăzută (CPI TO <42) la management → turnover crescut în echipele conduse cu 15-25% peste media org → cost recrutare + onboarding per plecare: 3-6 salarii lunare. Mecanism: angajații cu stil cognitiv diferit de manager se simt nevalorizați → pleacă.",
    tags: ["psec", "toleranta", "turnover", "cost-recrutare"],
    confidence: 0.80,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "PSEC",
    kbType: "SHARED_DOMAIN",
    content: "Angajament ridicat (AMI EN ≥7) fără autocontrol proporțional (AMI SK <5) → burnout în 12-18 luni → absenteism crescut → cost: 1.5-2.5% din fondul salarial al echipei. Mecanism: angajamentul fără limită consumă resursa fără regenerare.",
    tags: ["psec", "angajament", "burnout", "absenteism", "cost"],
    confidence: 0.75,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "PSEC",
    kbType: "SHARED_DOMAIN",
    content: "Dominanță motivațională ridicată (AMI DO ≥7) + empatie scăzută (CPI EM <42) în rol team lead → decizii rapide DAR fără buy-in echipă → implementare deficitară (30-50% din decizii necesită reluare) → cost: timp × nr oameni × rework. Mecanism: lipsa consultării generează rezistență pasivă.",
    tags: ["psec", "dominanta", "empatie", "rework", "implementare"],
    confidence: 0.80,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "PSEC",
    kbType: "SHARED_DOMAIN",
    content: "Stil cognitiv omogen în echipă (toți Herrmann B-dominant) → execuție excelentă DAR adaptabilitate scăzută → în mediu schimbător, performanța scade 20-30% vs echipe cognitive diverse. Cost: pierdere competitivitate la schimbare de piață. Mecanism: lipsa diversității cognitive elimină perspectivele alternative.",
    tags: ["psec", "herrmann", "diversitate-cognitiva", "adaptabilitate"],
    confidence: 0.75,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "PSEC",
    kbType: "SHARED_DOMAIN",
    content: "Integritate ridicată uniformă (ESQ-2 risc contraproductiv <5 pe toată echipa) → coeziune bazată pe încredere → reducere costuri control: -30-50% timp supervizare, -80% incidente conformitate. Beneficiu: fonduri eliberate pentru dezvoltare. Mecanism: încrederea reduce nevoia de monitorizare.",
    tags: ["psec", "integritate", "incredere", "cost-control", "beneficiu"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "PSEC",
    kbType: "SHARED_DOMAIN",
    content: "Climat scăzut pe Inovare (CO dim.7 <4.0) + leadership autoritarist (CPI DO >60, TO <40) → stagnare procese → pierdere 5-15% eficiență operațională/an prin lipsa optimizărilor. Mecanism: nimeni nu propune îmbunătățiri → procesele se degradează natural fără feedback corectiv.",
    tags: ["psec", "climat", "inovare", "stagnare", "eficienta"],
    confidence: 0.80,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "PSEC",
    kbType: "SHARED_DOMAIN",
    content: "Congruență 3C ridicată (gap <15% pe toate dimensiunile) → angajament organic crescut → productivitate +10-20% vs organizații cu gap >30%. Cost-beneficiu: investiția în alinierea 3C se recuperează în 6-12 luni prin creșterea productivității. Mecanism: oamenii depun efort discret (discretionary effort) când cred în ce face organizația.",
    tags: ["psec", "3c", "congruenta", "angajament-organic", "productivitate"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "PSEC",
    kbType: "SHARED_DOMAIN",
    content: "Sociogramă cu nod critic izolat (o persoană prin care trec >40% din fluxurile informaționale) → risc operațional sever: dacă pleacă, 30-60% din cunoașterea tacită se pierde. Cost potențial: 6-12 luni productivitate scăzută pe procesele dependente. Mecanism: single point of failure uman.",
    tags: ["psec", "sociograma", "nod-critic", "risc-operational", "cunoastere-tacita"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "PSEC",
    kbType: "SHARED_DOMAIN",
    content: "Flexibilitate scăzută generalizată (CPI FX <43, AMI FX <5 pe >50% din echipa de management) → rezistență la schimbare organizațională → costul transformării crește cu 40-80% vs organizații cu management flexibil. Mecanism: fiecare inițiativă de schimbare întâmpină rezistență care consumă resurse suplimentare de convingere și implementare.",
    tags: ["psec", "flexibilitate", "rezistenta-schimbare", "cost-transformare"],
    confidence: 0.80,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "PSEC",
    kbType: "SHARED_DOMAIN",
    content: "Satisfacție muncii ridicată (ESQ-2 >80) corelată cu productivitate ridicată (ESQ-2 >90) → angajat de înaltă valoare: generează 2-3x mai multă valoare decât costul salarial. Recunoașterea și retenția acestor profiler = prioritate economică. Cost pierdere: 6-12 luni recrutare + 12 luni ramp-up = ~2 ani valoare pierdută.",
    tags: ["psec", "satisfactie", "productivitate", "retentie", "valoare-angajat"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "PSEC",
    kbType: "SHARED_DOMAIN",
    content: "Impact teritorial: concentrare firme cu climat scăzut pe Performanță (CO dim.8 <4.2) într-un teritoriu → scădere PIB local 3-7% pe termen mediu (3-5 ani) prin mecanismul: angajați demotivați → productivitate scăzută → firme necompetitive → pierdere comenzi → reducere locuri muncă → exod forță de muncă → spirală negativă.",
    tags: ["psec", "teritorial", "climat", "pib", "spirala-negativa", "ecosistemic"],
    confidence: 0.70,
    source: "INTERNAL_DISTILLATION",
  },

  // ═══════════════════════════════════════════════════════════
  // METODOLOGIE & INSTRUMENTE (8 entries)
  // ═══════════════════════════════════════════════════════════

  {
    agentRole: "PSEC",
    kbType: "PERMANENT",
    content: "Modelul de cuantificare PSEC: (1) Identifică trăsătura/comportamentul din profil N2; (2) Stabilește mecanismul prin care produce efect (cauzal, nu corelativ); (3) Estimează magnitudinea efectului (ordine de mărime, nu cifră exactă); (4) Aplică pe contexul specific (nr oameni, procese afectate, durată); (5) Exprimă în RON/an cu interval de încredere.",
    tags: ["psec", "metodologie", "cuantificare", "5-pasi"],
    confidence: 0.90,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "PSEC",
    kbType: "PERMANENT",
    content: "Surse de date PSEC consumă: (1) Profiluri N2 individuale — trăsături/tensiuni; (2) N3 organizațional — climat/cultură/structură; (3) N4 relațional — sociogramă/noduri critice; (4) KPI măsurați — productivitate, turnover, absenteism, satisfacție; (5) Date financiare — fond salarii, buget recrutare, cost operare; (6) Motor Teritorial — context piață/competiție.",
    tags: ["psec", "surse-date", "inputuri"],
    confidence: 0.90,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "PSEC",
    kbType: "PERMANENT",
    content: "Output PSEC per analiză: un document cu (A) Lanț cauzal explicit (trăsătură → comportament → fenomen → indicator); (B) Cuantificare cu interval (optimistic/realist/pesimist); (C) Nivel de încredere (câte surse converg); (D) Condiții de valabilitate (în ce context e adevărat); (E) Recomandare de intervenție cu ROI estimat.",
    tags: ["psec", "output", "format-raport"],
    confidence: 0.90,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "PSEC",
    kbType: "PERMANENT",
    content: "PSEC alimentează direct: (1) OrgInferenceBlock.costImplication din profilul narativ org; (2) Simulatorul organizațional (impactPerUnit per intervenție); (3) ROI cultură (F4 din C4) — cuantificarea gap-ului 3C; (4) Raportul CEO din MasterReport (layer IMPACT); (5) Mecanismul inferențial auto-perfectibil (validare lanțuri cauzale).",
    tags: ["psec", "consumatori", "integrare-sistem"],
    confidence: 0.90,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "PSEC",
    kbType: "PERMANENT",
    content: "Regula anti-speculație: PSEC NU produce cifre false de dragul impresiei. Dacă datele sunt insuficiente, spune explicit: 'Date insuficiente pentru cuantificare — necesită: [ce date lipsesc]'. E preferabilă onestitatea față de o cifră impresionantă nevalidată. Credibilitatea PSEC = cel mai important activ.",
    tags: ["psec", "anti-speculatie", "onestitate", "credibilitate"],
    confidence: 0.95,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "PSEC",
    kbType: "PERMANENT",
    content: "PSEC operează pe 3 orizonturi temporale: (1) IMEDIAT (0-6 luni): efect direct, măsurabil, cu date existente; (2) MEDIU (6-18 luni): efect indirect, necesită proiecție, bazat pe pattern-uri validate; (3) LUNG (18+ luni): efect sistemic, necesită modelare, cu interval mare de incertitudine. Fiecare cuantificare specifică orizontul.",
    tags: ["psec", "orizonturi", "temporal", "incertitudine"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "PSEC",
    kbType: "SHARED_DOMAIN",
    content: "Fenomene de grup cu impact economic major: (1) Groupthink — echipe omogene iau decizii suboptimale, cost: oportunități pierdute; (2) Social loafing — în echipe mari fără accountability, efortul individual scade 20-40%; (3) Psychological safety (Edmondson) — absența ei costă inovare, prezența ei generează +25% propuneri implementabile; (4) Polarizare de grup — decizii mai extreme decât ale indivizilor, risc strategic.",
    tags: ["psec", "fenomene-grup", "groupthink", "social-loafing", "safety-psihologica"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "PSEC",
    kbType: "SHARED_DOMAIN",
    content: "Modelul cascadei PSEC: La nivel ecosistemic (N5), PSEC vede cum se acumulează efectele micro în efecte macro. Ex: 100 firme cu climat scăzut pe Comunicare (CO dim.5 <4.5) într-un teritoriu → informalitate crescută → contracte neclare → litigii → costuri juridice teritoriale crescute → investitori evită zona → spirală descendentă. Motor Teritorial detectează semnalul, PSEC explică mecanismul.",
    tags: ["psec", "cascada", "ecosistemic", "teritorial", "spiral-negativa"],
    confidence: 0.75,
    source: "INTERNAL_DISTILLATION",
  },

  // ═══════════════════════════════════════════════════════════
  // RELAȚIE CU MECANISMUL INFERENȚIAL (5 entries)
  // ═══════════════════════════════════════════════════════════

  {
    agentRole: "PSEC",
    kbType: "PERMANENT",
    content: "PSEC este VALIDATORUL lanțurilor cauzale din mecanismul inferențial auto-perfectibil. Când InferenceBlock spune 'DO ridicat + TO scăzut → conflict', PSEC validează: (a) mecanismul e real? (b) cuantificarea e rezonabilă? (c) condițiile sunt specificate? Fără validare PSEC, inferențele rămân la nivel de ipoteză.",
    tags: ["psec", "validator", "inferential", "calitate"],
    confidence: 0.90,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "PSEC",
    kbType: "PERMANENT",
    content: "Relația PSEC cu LivingNarrativeProfile: PSEC calibrează costImplication și impactul pe care simulatorul îl arată. Fără PSEC, slider-ul ar muta cifre arbitrare. Cu PSEC, fiecare mișcare de slider are un model economic validat în spate.",
    tags: ["psec", "living-profile", "simulator", "calibrare"],
    confidence: 0.90,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "PSEC",
    kbType: "PERMANENT",
    content: "PSEC se auto-perfecționează: fiecare client real care trece prin sistem oferă un punct de validare. Dacă PSEC a estimat 'ostilitate → turnover +15%' și clientul raportează efectiv +18%, modelul se consolidează. Dacă raportează doar +3%, modelul se revizuiește. Sursa de învățare: InferenceUpdate de tip INTERVENTION_RESULT.",
    tags: ["psec", "auto-perfectare", "validare-reala", "invatare"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "PSEC",
    kbType: "PERMANENT",
    content: "PSEC produce 'etichete de greutate' pentru simulator: fiecare dimensiune din OrgSimulatorIntervention are un impactPerUnit calibrat de PSEC. Ex: '1000 RON investiți în training comunicare asertivă pentru manageri cu HOS>60 produce +0.3 pe dimensiunea Climat/Comunicare în 6 luni'. Aceste calibrări sunt ipoteze inițiale care se rafinează cu date reale.",
    tags: ["psec", "etichete-greutate", "simulator", "calibrare-initiala"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "PSEC",
    kbType: "PERMANENT",
    content: "Secret de serviciu PSEC: clientul NU vede niciodată 'lanțul cauzal' expus tehnic. Vede doar efectul: 'Dacă investești X, obții Y în Z luni'. Consultantul vede mecanismul complet. Owner-ul vede modelul. Asta e diferențiatorul comercial — capacitatea de a cuantifica impactul psihologic pe limbajul financiar al decidentului.",
    tags: ["psec", "secret-serviciu", "diferentiator", "comercial"],
    confidence: 0.95,
    source: "INTERNAL_DISTILLATION",
  },
]

export default PSEC_SEED_ENTRIES
