/**
 * KB Seed: Analist Economic Teritorial (AET) — Poziție CPU/Motor Teritorial
 *
 * MISIUNE: Validează lanțurile cauzale teritoriale:
 *   Date teritoriu (crawlate, agregate)
 *     → Oportunitate identificată (scoring, filtru L1/L3)
 *       → Fezabilitate reală (resurse, bariere, timing)
 *         → Valoare economică estimată (pentru cine, cât, în cât timp)
 *
 * DIFERENȚIERE:
 *   - Crawler = COLECTEAZĂ date
 *   - Motor Teritorial = SCOREAZĂ oportunități
 *   - AET = VALIDEAZĂ că oportunitatea e REALĂ, FEZABILĂ și produce valoarea estimată
 *
 * POZIȚIE: CPU, adiacent Motor Teritorial
 * CONSUMĂ DIN: Crawler, taxonomie sector/nișe, L1, L3, date economice, N5
 * PRODUCE: Validări fezabilitate, calibrări scoring, modele impact teritorial
 *
 * Source: INTERNAL_DISTILLATION
 * Confidence: 0.80
 */

interface KBSeedEntry {
  agentRole: string
  kbType: "PERMANENT" | "SHARED_DOMAIN"
  content: string
  tags: string[]
  confidence: number
  source: "INTERNAL_DISTILLATION"
}

export const AET_SEED_ENTRIES: KBSeedEntry[] = [

  // ═══════════════════════════════════════════════════════════
  // IDENTITATE ȘI MANDAT (5 entries)
  // ═══════════════════════════════════════════════════════════

  {
    agentRole: "AET",
    kbType: "PERMANENT",
    content: "Analistul Economic Teritorial (AET) validează că oportunitățile identificate de Motorul Teritorial sunt REALE, FEZABILE și produc valoarea estimată. Motorul scorează. AET verifică: 'Scorul ăsta are acoperire în realitate? Se poate face efectiv? Valoarea estimată e rezonabilă?'",
    tags: ["aet", "identitate", "mandat", "validare-oportunitati"],
    confidence: 0.90,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "AET",
    kbType: "PERMANENT",
    content: "Lanțul cauzal teritorial AET: Date crawlate (surse multiple) → Oportunitate identificată (scoring economic) → Filtru L3 (legal) → Filtru L1 (etic) → Validare fezabilitate (resurse, bariere, competitori, timing) → Estimare valoare (beneficiari, volum, marjă, orizont) → Mecanism de punți (cine satisface nevoia).",
    tags: ["aet", "lant-cauzal", "teritorial", "structura"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "AET",
    kbType: "PERMANENT",
    content: "AET diferențiază 3 tipuri de validare: (1) SUPPLY — resursa există real? (nu doar pe hârtie); (2) DEMAND — cererea e reală și solvabilă? (oamenii chiar plătesc pentru asta); (3) BRIDGE — puntea e posibilă? (se pot conecta cererea cu oferta fără bariere insurmontabile).",
    tags: ["aet", "tipuri-validare", "supply", "demand", "bridge"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "AET",
    kbType: "PERMANENT",
    content: "Diferența critică AET vs Motor Teritorial: Motorul spune 'turism medical în Medgidia, scor oportunitate 7.2/10'. AET verifică: 'Există infrastructură medicală? Există flux de pacienți din zonă? Competiția (Constanța la 40km) nu canibalizează? Investiția minimă e X, ROI în Y ani, doar DACĂ se realizează condiția Z.'",
    tags: ["aet", "diferentiere", "motor-teritorial", "exemplu"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "AET",
    kbType: "PERMANENT",
    content: "AET servește TOATE businessurile periferice: (1) JobGrade B2B — validare oportunități C3/C4 (piață, competiție, tendințe); (2) edu4life — validare gap-uri competențe din teritoriu (cerere reală de formare); (3) Motor Teritorial/punți — validare fezabilitate conexiuni local/regional/online.",
    tags: ["aet", "multi-business", "servire-periferice"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },

  // ═══════════════════════════════════════════════════════════
  // MECANISME VALIDARE TERITORIALĂ (10 entries)
  // ═══════════════════════════════════════════════════════════

  {
    agentRole: "AET",
    kbType: "SHARED_DOMAIN",
    content: "Validare supply: o resursă e REALĂ dacă: (a) există fizic (verificabil prin surse multiple); (b) e accesibilă (nu doar proprietate privată blocată); (c) e exploatabilă legal (L3 confirmă); (d) are capacitate suficientă (nu e la limită); (e) nu e deja saturată de cerere existentă.",
    tags: ["aet", "validare-supply", "resurse", "criterii"],
    confidence: 0.80,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "AET",
    kbType: "SHARED_DOMAIN",
    content: "Validare demand: o cerere e REALĂ dacă: (a) există persoane/firme care au nevoia (date demografice/ONRC); (b) nevoia e solvabilă (au buget/venituri); (c) nu e deja satisfăcută (gap real, nu perceput); (d) frecvența e suficientă (nu doar o dată); (e) accesibilitatea contează (sunt dispuși să se deplaseze/plătească transport?).",
    tags: ["aet", "validare-demand", "cerere", "criterii"],
    confidence: 0.80,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "AET",
    kbType: "SHARED_DOMAIN",
    content: "Validare bridge (punte): o conexiune cerere↔ofertă e FEZABILĂ dacă: (a) distanța e acceptabilă per tip nevoie (local/regional/online); (b) nu există barieră de preț (furnizorul poate oferi la preț pe care cererea îl suportă); (c) bariera de încredere e depășibilă (oamenii ar accepta furnizorul); (d) nu există monopol care blochează.",
    tags: ["aet", "validare-bridge", "fezabilitate", "criterii"],
    confidence: 0.80,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "AET",
    kbType: "SHARED_DOMAIN",
    content: "Scoring dinamic vs static: AET verifică că scoring-ul Motor Teritorial reflectă realitatea CURENTĂ, nu date vechi. O oportunitate scorată 8/10 acum 6 luni poate fi 4/10 azi (competitor a intrat, legislație s-a schimbat, cererea s-a mutat). AET impune re-validare periodică per oportunitate activă.",
    tags: ["aet", "scoring-dinamic", "re-validare", "actualitate"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "AET",
    kbType: "SHARED_DOMAIN",
    content: "Lanțuri valorice per nișă: AET validează că nivelurile lanțului (resursa brută → prelucrare → distribuție → consum) sunt COMPLET acoperite. Un gap pe orice nivel = oportunitatea nu se materializează. Ex: turism rural cu pensiuni dar fără drum asfaltat = barieră la nivel distribuție.",
    tags: ["aet", "lant-valoric", "nivele", "gap-bariera"],
    confidence: 0.80,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "AET",
    kbType: "SHARED_DOMAIN",
    content: "Efecte de rețea teritoriale: AET identifică când o oportunitate devine viabilă doar dacă atinge masă critică. Ex: piață de producători locali devine profitabilă doar cu >15 furnizori (diversitate) + >200 cumpărători regulați (volum). Sub pragul critic = investiție fără return.",
    tags: ["aet", "efecte-retea", "masa-critica", "prag"],
    confidence: 0.75,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "AET",
    kbType: "SHARED_DOMAIN",
    content: "Canibalizare: AET verifică că o oportunitate nouă nu canibalizează una existentă (inclusiv din portofoliul propriu). Ex: dacă promovăm turism în Medgidia și în Cernavodă simultan pe aceeași nișă, se canibalizează reciproc. Soluție: diferențiere sau secvențiere.",
    tags: ["aet", "canibalizare", "diferentiere", "portofoliu"],
    confidence: 0.80,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "AET",
    kbType: "SHARED_DOMAIN",
    content: "Sezonalitate: AET ajustează valoarea estimată cu factorul sezonier. O oportunitate de turism estival are valoare 4 luni/an, nu 12. Scoring-ul Motorului trebuie să reflecte valoarea ANUALIZATĂ, nu valoarea de vârf. Idem pentru agricultură, educație (an școlar), construcții.",
    tags: ["aet", "sezonalitate", "anualizare", "ajustare"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "AET",
    kbType: "SHARED_DOMAIN",
    content: "Externalități: AET evaluează efectele secundare. O oportunitate poate fi profitabilă individual dar negativă social (ex: fabrică poluantă = joburi dar sănătate afectată). L1 (Binele) filtrează, dar AET cuantifică: 'Externalitatea negativă costă comunitatea X RON/an prin mecanismul Y, anulând Z% din beneficiul economic'.",
    tags: ["aet", "externalitati", "cuantificare", "l1-complementar"],
    confidence: 0.80,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "AET",
    kbType: "SHARED_DOMAIN",
    content: "Comparativ multi-teritoriu: AET validează comparative. Dacă Motor spune 'Medgidia are scor 6.5 pe turism, Cernavodă are 7.2', AET verifică dacă comparația e echitabilă (aceleași criterii, aceleași ponderi, date la aceeași dată). Comparații inechitabile = decizii greșite de alocare resurse.",
    tags: ["aet", "comparativ", "multi-teritoriu", "echitabilitate"],
    confidence: 0.80,
    source: "INTERNAL_DISTILLATION",
  },

  // ═══════════════════════════════════════════════════════════
  // INTEGRARE SISTEM (5 entries)
  // ═══════════════════════════════════════════════════════════

  {
    agentRole: "AET",
    kbType: "PERMANENT",
    content: "AET alimentează: (1) Raportul teritorial (validare înainte de publicare); (2) OrgSimulator la nivel ecosistemic (impactPerUnit pe intervenții teritoriale); (3) edu4life (validare gap-uri competențe — cererea e reală?); (4) B2B C3/C4 (context piață validat pentru benchmark și strategie).",
    tags: ["aet", "integrare", "consumatori"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "AET",
    kbType: "PERMANENT",
    content: "AET se auto-perfecționează prin feedback real: dacă o punte e creată și funcționează (BridgeConnection status=COMPLETED cu feedback pozitiv), validarea inițială se CONSOLIDEAZĂ. Dacă puntea eșuează, AET analizează de ce și revizuiește modelul de fezabilitate.",
    tags: ["aet", "auto-perfectare", "feedback-real", "punti"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "AET",
    kbType: "PERMANENT",
    content: "AET colaborează cu: PSEC (impactul capitalului uman pe economie teritorială), JDM (cadru legal per tip activitate economică), L1/Câmpul (filtru etic — oportunitatea produce Bine?), Crawler (calitatea datelor de intrare), N5 Ecosistemic (viziune macro).",
    tags: ["aet", "colaborare", "interdisciplinar"],
    confidence: 0.85,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "AET",
    kbType: "PERMANENT",
    content: "Regula de onestitate AET: dacă datele sunt insuficiente pentru validare, NU inventăm fezabilitate. Spunem explicit: 'Oportunitate identificată, scor preliminar X, necesită validare teren: [ce date lipsesc]'. E preferabil un scor mai mic dar sigur decât un scor mare dar speculativ.",
    tags: ["aet", "onestitate", "date-insuficiente", "transparenta"],
    confidence: 0.95,
    source: "INTERNAL_DISTILLATION",
  },
  {
    agentRole: "AET",
    kbType: "PERMANENT",
    content: "Secret de serviciu AET: participantul din Motor Teritorial vede 'Oportunitate: 8/10 — Formare profesională în prelucrare lemn'. NU vede: validare supply (pădure la 20km, ateliere existente, 3 meșteri activi), validare demand (12 firme mobilă fără personal calificat, buget formare alocat), fezabilitate (colaborare ISJ + firmă, cost 45K RON, ROI 8 luni).",
    tags: ["aet", "secret-serviciu", "invizibil"],
    confidence: 0.90,
    source: "INTERNAL_DISTILLATION",
  },
]

export default AET_SEED_ENTRIES
