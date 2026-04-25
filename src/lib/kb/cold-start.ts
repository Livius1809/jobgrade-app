/**
 * cold-start.ts — Generare KB entries prin Claude self-interview per agent
 *
 * Sprint 4: Cold Start automatizat
 * - Prompturi self-interview specifice fiecărui rol
 * - Generare 50-100 intrări KB sintetice per agent
 * - Confidence inițial: 0.5 (mai mic decât experiența reală)
 * - Source: SELF_INTERVIEW
 */

import Anthropic from "@anthropic-ai/sdk"

// ── Tipuri ────────────────────────────────────────────────────────────────────

export interface ColdStartEntry {
  agentRole: string
  kbType: "PERMANENT" | "SHARED_DOMAIN" | "METHODOLOGY"
  content: string
  tags: string[]
  confidence: number
  source: "SELF_INTERVIEW"
}

export interface ColdStartResult {
  agentRole: string
  entriesGenerated: number
  entries: ColdStartEntry[]
  durationMs: number
}

// ── Constante ─────────────────────────────────────────────────────────────────

const COLD_START_CONFIDENCE = 0.5
const MODEL = "claude-sonnet-4-20250514"
const ENTRIES_PER_BATCH = 10
const MAX_BATCHES = 5 // 5 × 10 = 50 entries per agent (minim planificat)

// ── Prompturi self-interview per rol ──────────────────────────────────────────

export const SELF_INTERVIEW_PROMPTS: Record<
  string,
  { description: string; prompts: string[] }
> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // NIVEL 1 — STRATEGIC
  // ═══════════════════════════════════════════════════════════════════════════

  COG: {
    description: "Chief Orchestrator General — strategie, viziune, KPI business",
    prompts: [
      "Generează scenarii de decizie strategică pentru o platformă HR SaaS pe piața din România: prioritizare domenii, alocare resurse, conformitate legală, monitorizare KPI. Include trade-off-uri reale între viteză și calitate.",
      "Descrie pattern-uri de comunicare cu stakeholderi (fondatori, investitori, parteneri): cum prezinți progresul, cum gestionezi așteptări nerealiste, cum raportezi eșecuri constructiv.",
      "Generează scenarii de risk management: ce faci când un competitor lansează un produs similar, când un client enterprise cere funcționalitate inexistentă, când echipa tehnică e blocată de datorii tehnice.",
      "Descrie cum prioritizezi între B2B și B2C când resursele sunt limitate. Ce metrici folosești pentru decizie? Cum comunici decizia echipei?",
      "Generează pattern-uri de monitorizare a sănătății platformei din perspectivă business: ce KPI-uri urmărești zilnic, săptămânal, lunar? Cum detectezi devieri înainte să devină crize?",
    ],
  },

  COA: {
    description: "Chief Orchestrator Agent Technical — arhitectură, standarde tehnice, SLA",
    prompts: [
      "Generează scenarii de decizie arhitecturală pentru o platformă Next.js + PostgreSQL + n8n: când alegi server components vs client, cum structurezi API-urile, cum gestionezi migrațiile.",
      "Descrie pattern-uri de rezolvare conflicte de prioritate tehnică: feature cerut de client vs. refactoring necesar, securitate vs. viteză de livrare, upgrade dependențe vs. stabilitate.",
      "Generează scenarii de monitorizare performanță și SLA: cum detectezi degradări, cum triajezi, cum comunici impactul business.",
      "Descrie cum evaluezi și integrezi noi componente în stack (ex: vector DB, message queue): criterii de selecție, PoC, plan de migrare.",
      "Generează pattern-uri de code review și standarde: ce verifici la PR-uri, cum balansezi perfectul cu pragmaticul, cum onboardezi devs noi pe standarde.",
    ],
  },

  COCSA: {
    description: "Chief Orchestrator Client Service — date, benchmarking, rapoarte",
    prompts: [
      "Generează scenarii de gestionare pipeline date: import date externe, validare calitate, reconciliere surse contradictorii, actualizare periodică.",
      "Descrie pattern-uri de generare rapoarte personalizate per client: ce metrici incluzi, cum adaptezi la industrie/dimensiune, cum prezinți date sensibile.",
      "Generează scenarii de benchmarking salarial: surse de date, metodologie comparație, cum gestionezi date incomplete sau outliers.",
      "Descrie cum coordonezi echipa de service delivery: escaladări, SLA per client, handoff între echipe.",
      "Generează pattern-uri de quality assurance pentru deliverables client: checklist pre-livrare, validare cu clientul, iterație pe feedback.",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NIVEL 2 — OPERAȚIONAL
  // ═══════════════════════════════════════════════════════════════════════════

  CIA: {
    description: "Competitive Intelligence Agent — monitorizare competitori, alertare",
    prompts: [
      "Generează scenarii de monitorizare competitori pe piața HR tech din România și CEE: ce surse urmărești, ce semnale sunt relevante, cum clasifici amenințări.",
      "Descrie pattern-uri de analiză competitivă: cum evaluezi un produs nou lansat de un competitor, cum identifici diferențiatorii, cum raportezi echipei de strategie.",
      "Generează scenarii de alertă competitivă: un competitor a obținut un client major, a lansat o funcționalitate similară, a primit finanțare. Ce faci?",
      "Descrie cum construiești și menții dosare competitor: structură, frecvență actualizare, ce informații sunt acționabile vs. noise.",
      "Generează pattern-uri de analiză a feedback-ului public despre competitori (review-uri, social media, conferințe): cum extragi insight-uri utile.",
    ],
  },

  CJA: {
    description: "Consilier Juridic Agent — conformitate legală, GDPR, Directiva EU 2023/970",
    prompts: [
      "Generează scenarii de conformitate cu Directiva EU 2023/970 în contextul României: ce obligații are un angajator cu 100+ angajați, ce documentație trebuie, termene.",
      "Descrie pattern-uri GDPR pentru o platformă HR SaaS: ce date procesezi, baze legale, drepturile angajaților, DPA cu clienții, transfer date.",
      "Generează scenarii de verificare contracte B2B: clauze esențiale, limitare răspundere, confidențialitate, SLA, condiții de ieșire.",
      "Descrie cum monitorizezi modificări legislative relevante: surse, frecvență, cum triajezi impactul, cum comunici echipei cu 30 zile înainte.",
      "Generează pattern-uri de răspuns la cereri GDPR (acces, ștergere, portabilitate): proceduri, termene, documentare.",
    ],
  },

  CCIA: {
    description: "Counter Competitive Intelligence — detectare amenințări, contra-spionaj",
    prompts: [
      "Generează scenarii de detectare conturi adversariale: pattern-uri de scraping, tentative reverse engineering API, comportamente suspecte în platformă.",
      "Descrie pattern-uri de protecție IP: cum detectezi data poisoning, manipulare rezultate, infiltrare prin API-uri publice.",
      "Generează scenarii de social engineering targeting angajați/fondatori: cum le recunoști, cum educi echipa, proceduri de răspuns.",
      "Descrie cum evaluezi și răspunzi la o tentativă confirmată de spionaj industrial: escaladare, documentare, măsuri tehnice și legale.",
      "Generează pattern-uri de monitorizare a suprafeței de atac: ce expui public, ce poate fi exploatat, cum minimizezi riscul fără a afecta business-ul.",
    ],
  },

  PMA: {
    description: "Product Manager Agent — backlog, user stories, discovery",
    prompts: [
      "Generează scenarii de prioritizare backlog pentru o platformă HR SaaS: cum balansezi cereri client vs. viziune produs, MoSCoW, impactul pe revenue.",
      "Descrie pattern-uri de scriere user stories eficiente: format, acceptance criteria, definition of done, edge cases.",
      "Generează scenarii de discovery cu clienți B2B HR: ce întrebări pui, cum validezi ipoteze, cum transformi feedback în features.",
      "Descrie cum gestionezi roadmap-ul: comunicare cu sales, promisiuni vs. realitate, versionare, timeline.",
      "Generează pattern-uri de feedback loop: cum colectezi, sintetizezi și acționezi pe feedback de la suport, sales, clienți direcți.",
    ],
  },

  EMA: {
    description: "Engineering Manager Agent — sprint planning, blocaje tehnice, velocity",
    prompts: [
      "Generează scenarii de sprint planning pentru o echipă de 2-3 devs pe stack Next.js + Prisma + n8n: estimare, capacitate, buffer pentru urgențe.",
      "Descrie pattern-uri de identificare și deblocare blocaje tehnice: dependențe externe, ambiguitate requirements, datorii tehnice.",
      "Generează scenarii de distribuire task-uri: cum asignezi pe baza skill-urilor, cum balansezi learning vs. eficiență, pair programming.",
      "Descrie cum monitorizezi și comunici progresul tehnic: burndown, velocity, retrospective, raportare la COA.",
      "Generează pattern-uri de code review orchestration: cine review-uiește ce, timp de răspuns, standarde, conflicte.",
    ],
  },

  DPA: {
    description: "DevOps / Platform Agent — CI/CD, deployment, monitoring",
    prompts: [
      "Generează scenarii de pipeline CI/CD pentru o aplicație Next.js deployată pe Vercel/Neon: build, test, preview, production, rollback.",
      "Descrie pattern-uri de monitoring și alertare: uptime, latență, error rate, cum configurezi threshold-uri, cum escaladezi.",
      "Generează scenarii de incident response din perspectivă infra: deployment eșuat, DB connection pool epuizat, memory leak, certificat expirat.",
      "Descrie cum gestionezi secrets și environment variables: rotație, access control, audit, separation of concerns dev/staging/prod.",
      "Generează pattern-uri de optimizare costuri cloud: identificare resurse neutilizate, rightsizing, reserved instances, bugetare.",
    ],
  },

  QLA: {
    description: "QA Lead Agent — strategii testare, quality gates, defect management",
    prompts: [
      "Generează scenarii de test strategy pentru features HR (evaluare joburi, consens, raportare): ce testezi, cum prioritizezi, risk-based testing.",
      "Descrie pattern-uri de quality gate: ce condiții trebuie îndeplinite înainte de release, cum gestionezi excepții, override-uri.",
      "Generează scenarii de defect triage: cum clasifici severitate/prioritate, cum comunici cu dev-ul, cum urmărești rezolvarea.",
      "Descrie cum construiești suite de regression testing: ce incluzi, cum menții, cum balansezi coverage vs. timp de execuție.",
      "Generează pattern-uri de testare specifice platformei: multi-tenant isolation, calcule scoruri, generare rapoarte, integrări externe.",
    ],
  },

  SA: {
    description: "Security Agent — threat modeling, code scanning, RBAC",
    prompts: [
      "Generează scenarii de threat modeling pentru features noi ale platformei HR: ce amenințări identifici, cum le clasifici, ce mitigări propui.",
      "Descrie pattern-uri de code scanning și dependency audit: tool-uri, frecvență, cum triajezi vulnerabilități, SLA de remediere.",
      "Generează scenarii RBAC/IAM: 5 roluri B2B (Owner, Admin, Evaluator, Manager, Employee), ce permisiuni, cum previi escaladarea privilegiilor.",
      "Descrie cum răspunzi la un incident de securitate: detecție, containment, investigare, comunicare, remediere, post-mortem.",
      "Generează pattern-uri de securitate specifice AI/LLM: prompt injection, data exfiltration prin conversație, model manipulation.",
    ],
  },

  CAA: {
    description: "Compliance & Audit Agent — SOC2, GDPR, ISO27001",
    prompts: [
      "Generează scenarii de pregătire audit SOC2 pentru o platformă SaaS HR: ce controale trebuie, ce documente, cum demonstrezi conformitate.",
      "Descrie pattern-uri de compliance GDPR continuu: DPA, DPIA, registru prelucrări, audit intern periodic, training echipă.",
      "Generează scenarii de vendor assessment: cum evaluezi un furnizor nou (cloud, API, payment), ce cerințe de securitate impui.",
      "Descrie cum menții evidențe pentru audit: logging, documentare decizii, trail de modificări, retenție date.",
      "Generează pattern-uri de răspuns la cereri de audit extern: pregătire, comunicare, remediere findings.",
    ],
  },

  COAFin: {
    description: "Cost Optimization Agent — cheltuieli cloud, optimizări, buget",
    prompts: [
      "Generează scenarii de monitorizare cheltuieli cloud pentru stack Vercel + Neon + n8n Docker: ce urmărești, alerting la depășire buget.",
      "Descrie pattern-uri de optimizare cost: identificare resurse neutilizate, rightsizing, caching strategic, batch processing.",
      "Generează scenarii de bugetare și forecast: cum estimezi costul unei noi funcționalități, cum prezinți ROI-ul optimizărilor.",
      "Descrie cum colaborezi cu DPA și COA pentru decizii cost vs. performanță: trade-off-uri concrete, propuneri cu metrici.",
      "Generează pattern-uri de alertare proactivă: anomalii de cost, spike-uri neașteptate, trend-uri crescătoare.",
    ],
  },

  ISA: {
    description: "Information Security Agent — OWASP, CVE, prompt injection, EU AI Act",
    prompts: [
      "Generează scenarii de audit OWASP Top 10 specifice platformei HR: SQL injection prin Prisma, XSS în rapoarte, CSRF, broken auth.",
      "Descrie pattern-uri de CVE monitoring și remediere: surse, triaj, SLA, comunicare impact, patch management.",
      "Generează scenarii de prompt injection testing: cum testezi că agenții AI nu pot fi manipulați, ce payload-uri verifici, cum documentezi.",
      "Descrie cum implementezi cross-tenant isolation: verificare la fiecare layer (API, DB, storage, AI context), testare.",
      "Generează pattern-uri de conformitate EU AI Act Anexa IV: documentare, transparență, logging decizii AI.",
    ],
  },

  MOA: {
    description: "Monitoring & Alerting Agent — uptime, SLA, drift AI, dashboard",
    prompts: [
      "Generează scenarii de monitoring platformă HR: ce metrici sunt critice (uptime API, latență evaluare, cozi n8n), threshold-uri, escaladare.",
      "Descrie pattern-uri de detectare drift scoruri AI: cum compari output-ul curent cu baseline, ce toleranță e acceptabilă, cum alertezi.",
      "Generează scenarii de alertare multi-nivel: informativ vs. warning vs. critical, cine primește ce, canale (Slack, email, SMS).",
      "Descrie cum construiești raportul zilnic de sănătate platformă: ce incluzi, pentru cine, format, automatizare.",
      "Generează pattern-uri de detectare atacuri în timp real: rate limiting, anomalii de trafic, pattern-uri de scraping.",
    ],
  },

  IRA: {
    description: "Incident Response Agent — clasificare P0-P3, escaladare, post-mortem",
    prompts: [
      "Generează scenarii de clasificare incidente P0-P3 pentru platformă HR: ce e P0 (data breach, downtime total), P1, P2, P3.",
      "Descrie pattern-uri de escaladare: cine e notificat la fiecare nivel, în cât timp, ce decizii poate lua fiecare rol.",
      "Generează scenarii de post-mortem: structură, blameless culture, action items, follow-up, comunicare la stakeholderi.",
      "Descrie cum coordonezi răspunsul la un data breach GDPR: 72h notification DPA, comunicare clienți, containment, investigare.",
      "Generează pattern-uri de comunicare status în timpul unui incident: template-uri, frecvență update, canal, ton.",
    ],
  },

  MDA: {
    description: "Maintenance Dev Agent — bugfix, hotfix, dependențe, performanță",
    prompts: [
      "Generează scenarii de triaj buguri: cum clasifici severitate, cum estimezi efort, cum prioritizezi între buguri concurente.",
      "Descrie pattern-uri de hotfix deployment: branch strategy, testare rapidă, rollback plan, comunicare.",
      "Generează scenarii de actualizare dependențe: cum evaluezi breaking changes, strategia de upgrade, testare post-upgrade.",
      "Descrie cum optimizezi performanța: identificare bottleneck (query lent, render excesiv, bundle size), măsurare, fix, validare.",
      "Generează pattern-uri de maintenance preventiv: scheduled updates, health checks, cleanup, database vacuum.",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NIVEL 3 — CLIENT-FACING
  // ═══════════════════════════════════════════════════════════════════════════

  SOA: {
    description: "Sales & Onboarding Agent — lead qualification, demo, onboarding",
    prompts: [
      "Generează scenarii de calificare lead-uri B2B HR în România: ce întrebări pui, ce semnale indică fit bun, ce disqualifică.",
      "Descrie pattern-uri de demonstrație produs personalizată: cum adaptezi demo-ul la industrie/dimensiune, ce features arăți prima dată.",
      "Generează scenarii de negociere contract B2B: obiecții comune (preț, securitate, integrare), răspunsuri eficiente.",
      "Descrie cum faci onboarding-ul primului client: configurare cont, import date, primul proces de evaluare, handoff la CSSA.",
      "Generează pattern-uri de competitive objection handling: 'folosim deja Excel', 'Hay e standard', 'nu avem buget', 'nu e prioritate'.",
    ],
  },

  CSSA: {
    description: "Customer Success Agent — sănătate conturi, churn, adoptare, NPS",
    prompts: [
      "Generează scenarii de monitorizare sănătate cont: ce semnale indică risc churn, ce semnale indică oportunitate upsell.",
      "Descrie pattern-uri de check-in periodic cu Admin/Owner: ce întrebi, ce raportezi, cum identifici nevoi neexprimate.",
      "Generează scenarii de adoptare progresivă: cum ghidezi un client de la primul evaluare la utilizare completă a platformei.",
      "Descrie cum gestionezi un client nemulțumit: ascultare, validare, plan de acțiune, follow-up, documentare.",
      "Generează pattern-uri de NPS și feedback post-evaluare: ce întrebi, cum analizezi, cum acționezi pe scoruri joase.",
    ],
  },

  HR_COUNSELOR: {
    description: "Consilier HR — evaluare joburi, consens, calibrare, facilitare",
    prompts: [
      "Generează scenarii de facilitare sesiune de evaluare joburi: cum deschizi, cum ghidezi evaluatorii, cum gestionezi dezacorduri.",
      "Descrie pattern-uri de calibrare a evaluatorilor: cum detectezi bias-ul, cum recalibrezi fără a invalida persoana.",
      "Generează scenarii de explicare rezultate evaluare către management: cum prezinți scorurile, cum justifici ierarhizarea, cum gestionezi nemulțumiri.",
      "Descrie cum adaptezi comunicarea la diferite niveluri de expertiză HR: novice, practician, expert.",
      "Generează pattern-uri de gestionare situații complexe: joburi hibride, roluri noi fără echivalent, restructurări organizaționale.",
    ],
  },

  BCA: {
    description: "Billing & Collections Agent — facturare, fiscalitate RO, MRR/ARR",
    prompts: [
      "Generează scenarii de facturare SaaS B2B în România: lunar vs. anual, pro-rata upgrade/downgrade, e-Factura, TVA.",
      "Descrie pattern-uri de colectare plăți restante: reminder sequence, escaladare, suspendare cont, colaborare CSSA.",
      "Generează scenarii de conformitate fiscală RO: TVA, impozit profit, e-Factura, SPV, termene depunere.",
      "Descrie cum raportezi MRR/ARR/churn: definiții, calcul, prezentare, trend analysis.",
      "Generează pattern-uri de gestionare excepții: discount-uri speciale, facturi corecte, rambursări, dispute.",
    ],
  },

  CDIA: {
    description: "Client Data & Insights Agent — analytics, utilizare, churn signals",
    prompts: [
      "Generează scenarii de analiză utilizare platformă per segment: ce metrici urmărești, cum segmentezi, ce insight-uri extragi.",
      "Descrie pattern-uri de detectare churn signals: drop utilizare, tickete repetitive, lipsa login, evaluări nefinalizate.",
      "Generează scenarii de analiză adoptare funcționalități noi: cum măsori, ce e succes, cum informezi PMA.",
      "Descrie cum centralizezi și sintetizezi feedback din surse multiple: suport, NPS, interviews, usage data.",
      "Generează pattern-uri de raportare cu anonimizare GDPR: ce agregezi, cum prezinți fără a expune date personale.",
    ],
  },

  MKA: {
    description: "Market & Knowledge Agent — KB agenți, legislativ, tendințe piață muncii",
    prompts: [
      "Generează scenarii de actualizare KB agenți la modificări metodologice: cum propagezi, cum verifici consistența, cum testezi.",
      "Descrie pattern-uri de monitorizare legislativă România: surse (MO, ANAF, ITM), frecvență, triaj impact pe platformă.",
      "Generează scenarii de onboarding cunoștințe pentru agenți noi: ce informații primesc, în ce ordine, cum verifici integrarea.",
      "Descrie cum urmărești tendințe piață muncii RO/CEE: surse, metrici relevante, cum transformi în acțiuni concrete.",
      "Generează pattern-uri de content curation: ce selectezi, cum validezi, cum distribui intern.",
    ],
  },

  ACA: {
    description: "Advertising & Content Agent — marketing B2B, SEO, content, ads",
    prompts: [
      "Generează scenarii de content marketing B2B HR în România: ce teme rezonează, ce formate, frecvența publicării.",
      "Descrie pattern-uri de SEO pentru platformă HR SaaS: keywords target, content clusters, technical SEO, link building.",
      "Generează scenarii de campanii LinkedIn Ads targetând HR directors/managers din România: segmentare, mesaj, landing page.",
      "Descrie cum creezi materiale sales enablement: case studies, comparații competitor, one-pagers, demo decks.",
      "Generează pattern-uri de măsurare marketing: cost per lead, ROAS, conversion funnel, atribuire.",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NIVEL 3 — DEVELOPMENT
  // ═══════════════════════════════════════════════════════════════════════════

  FDA: {
    description: "Frontend Developer Agent — React/Next.js, UI, Core Web Vitals",
    prompts: [
      "Generează scenarii de dezvoltare componente UI pentru platformă HR: formulare evaluare, dashboard-uri, tabele comparative, wizard-uri.",
      "Descrie pattern-uri de state management în Next.js App Router: server vs. client components, data fetching, cache, optimistic updates.",
      "Generează scenarii de optimizare Core Web Vitals: LCP, FID, CLS — cauze comune și fix-uri în context Next.js.",
      "Descrie cum construiești un design system consistent: tokens, componente reutilizabile, variante, documentare Storybook.",
      "Generează pattern-uri de testare frontend: unit cu Vitest, component cu Testing Library, E2E cu Playwright.",
    ],
  },

  BDA: {
    description: "Backend Developer Agent — API, Prisma, autentificare, integrări",
    prompts: [
      "Generează scenarii de design API RESTful pentru platforma HR: endpoints evaluare, consens, raportare, autentificare multi-tenant.",
      "Descrie pattern-uri de lucru cu Prisma ORM: migrații sigure, relații complexe, query optimization, transactions.",
      "Generează scenarii de autentificare și autorizare: NextAuth/Clerk, RBAC cu 5 roluri, middleware, session management.",
      "Descrie cum implementezi integrări third-party: Stripe billing, email (Resend), storage, API-uri externe salariale.",
      "Generează pattern-uri de error handling și logging: structured logging, error boundaries, retry strategies, observability.",
    ],
  },

  DEA: {
    description: "Data Engineer Agent — ETL, data warehouse, calitate date",
    prompts: [
      "Generează scenarii de pipeline ETL pentru date salariale: import CSV/API, transformare, validare, deduplicare, load.",
      "Descrie pattern-uri de data modeling pentru platformă HR: star schema, dimensiuni (companii, joburi, evaluări), facts (scoruri, salarii).",
      "Generează scenarii de data quality: detectare anomalii, missing values, outliers, reguli de validare business.",
      "Descrie cum optimizezi stocarea și query-urile: partitioning, indexing, materialized views, caching layer.",
      "Generează pattern-uri de data governance: catalogare, lineage, access control, retenție, anonimizare.",
    ],
  },

  MAA: {
    description: "ML / AI Agent — modele ML, LLM integration, drift monitoring",
    prompts: [
      "Generează scenarii de integrare Claude API în platformă HR: system prompts, tool use, streaming, error handling, cost management.",
      "Descrie pattern-uri de prompt engineering pentru evaluare joburi: cum structurezi promptul, few-shot examples, chain of thought.",
      "Generează scenarii de monitorizare drift AI: cum detectezi că output-ul s-a degradat, baseline, metrici, alertare.",
      "Descrie cum implementezi vector search cu pgvector: embeddings, indexing, similarity search, hybrid search.",
      "Generează pattern-uri de A/B testing modele: cum compari Claude Sonnet vs Haiku, metrici de evaluare, cost/quality trade-off.",
    ],
  },

  QAA: {
    description: "QA Automation Agent — teste unit/integration/E2E, coverage, load testing",
    prompts: [
      "Generează scenarii de test automation pentru platforma HR: ce testezi automat, ce manual, piramida testelor.",
      "Descrie pattern-uri de E2E testing cu Playwright: page objects, fixtures, CI integration, flaky test management.",
      "Generează scenarii de load testing: endpoints critice, profilul de load, tool-uri, interpretare rezultate.",
      "Descrie cum menții suite-urile de teste: test data management, cleanup, paralelizare, timp de execuție.",
      "Generează pattern-uri de test coverage analysis: ce metrici urmărești, threshold-uri, uncovered critical paths.",
    ],
  },

  SQA: {
    description: "Security QA Agent — SAST/DAST, penetration testing, prompt injection",
    prompts: [
      "Generează scenarii de testare securitate specifice platformei HR: SQL injection prin Prisma, XSS în rapoarte PDF, CSRF, IDOR.",
      "Descrie pattern-uri de testare autentificare/autorizare: bypass-uri, escaladare privilegii, session hijacking, token expiry.",
      "Generează scenarii de prompt injection testing: cum testezi că agenții AI nu pot fi manipulați să expună date cross-tenant.",
      "Descrie cum verifici cross-tenant isolation end-to-end: API, DB queries, storage, AI context, rapoarte.",
      "Generează pattern-uri de raport securitate pre-lansare: ce verifici, format, severitate, go/no-go criteria.",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NIVEL 3 — SUPPORT
  // ═══════════════════════════════════════════════════════════════════════════

  CSA: {
    description: "Customer Support Agent — tickete, escaladare, knowledge base",
    prompts: [
      "Generează scenarii de suport Tier 1/2 pentru platformă HR: întrebări frecvente, probleme comune, escaladare la dev.",
      "Descrie pattern-uri de triaj tickete: cum clasifici, cum prioritizezi, cum estimezi timpul de rezolvare.",
      "Generează scenarii de comunicare cu clientul: ton, claritate, empatie, follow-up, documentare.",
      "Descrie cum construiești și menții documentația de ajutor: FAQ, tutoriale, ghiduri pas cu pas, video.",
      "Generează pattern-uri de identificare probleme sistematice: când un bug afectează mai mulți clienți, cum escaladezi.",
    ],
  },

  DOA: {
    description: "Documentation Agent — API docs, changelog, tutoriale, wiki",
    prompts: [
      "Generează scenarii de documentare API cu OpenAPI/Swagger: structură, exemple, error codes, versionare.",
      "Descrie pattern-uri de scriere changelog: ce incluzi, format, audience, frecvență.",
      "Generează scenarii de documentare pentru onboarding developeri: setup local, arhitectură, convenții, first contribution.",
      "Descrie cum menții wiki-ul intern actualizat: ownership, review periodic, templating, search.",
      "Generează pattern-uri de tutoriale și ghiduri: structură, screenshots, code examples, troubleshooting.",
    ],
  },

  DOAS: {
    description: "Documentation Agent Services — audit MVV, gap analysis, registru viu",
    prompts: [
      "Generează scenarii de audit coerență MVV: cum verifici că procesele reflectă valorile declarate ale companiei, ce discrepanțe cauți.",
      "Descrie pattern-uri de gap analysis permanent: cum identifici atribuții lipsă, redundanțe, skill-uri neacoperite în organigramă.",
      "Generează scenarii de remediere colaborativă: cum propui și implementezi corecții fără a perturba fluxurile existente.",
      "Descrie cum menții registrul viu fluxuri×pozitii×proceduri×atributii×skill-uri: actualizare, validare, propagare.",
      "Generează pattern-uri de documentare servicii B2B/B2C/Suport: structură, ownership, versionare.",
    ],
  },

  RDA: {
    description: "Research & Discovery Agent — piață, competiție, user research",
    prompts: [
      "Generează scenarii de analiză piață HR tech în România: dimensiune, maturitate, jucători, bariere de intrare.",
      "Descrie pattern-uri de user research cu clienți B2B HR: ce întrebi, cum recrutezi, cum sintetizezi findings.",
      "Generează scenarii de analiză tendințe tehnologice relevante: AI în HR, pay transparency, remote work, skills-based hiring.",
      "Descrie cum transformi research în insight-uri acționabile: format raport, prioritizare, recomandări concrete.",
      "Generează pattern-uri de competitive analysis structurată: framework, metrici, output, frecvență.",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NIVEL SUPORT SPECIALIZAT
  // ═══════════════════════════════════════════════════════════════════════════

  PSYCHOLINGUIST: {
    description: "Specialist Psiholingvistică — calibrare comunicare, registru, adaptare",
    prompts: [
      "Generează pattern-uri de detectare registru lingvistic în română: formal, informal, tehnic, colocvial. Ce markeri cauți?",
      "Descrie scenarii de cod-switching RO-EN în context corporate: când e natural, când e forțat, cum adaptezi răspunsul.",
      "Generează pattern-uri de detectare frustrare în text: repetare, majuscule, sarcasm, comparații negative, și cum răspunzi.",
      "Descrie cum calibrezi nivelul de complexitate al răspunsului: expert vs. novice, terminologie, lungime, exemple.",
      "Generează scenarii de adaptare comunicare pentru diferite profiluri: HR director, antreprenor, angajat, student.",
    ],
  },

  PPMO: {
    description: "Psiholog PMO — cultură organizațională, echipe multigeneraționale",
    prompts: [
      "Generează scenarii de evaluare cultură organizațională: ce dimensiuni măsori, cum colectezi date, cum interpretezi pattern-uri.",
      "Descrie pattern-uri de management echipe multigeneraționale: Gen Z vs. Millennials vs. Gen X — valori, comunicare, motivare.",
      "Generează scenarii de armonizare procese HR cu diversitate generațională: onboarding, evaluare performanță, feedback.",
      "Descrie cum evaluezi și îmbunătățești dinamica echipei: instrumente, indicatori, intervenții.",
      "Generează pattern-uri de consultanță cultural competence: ce evaluezi, ce recomandezi, cum măsori progresul.",
    ],
  },

  STA: {
    description: "Statistician Agent — analiză statistică, vizualizare, validare date",
    prompts: [
      "Generează scenarii de analiză statistică pentru evaluare joburi: distribuție scoruri, corelații, outlieri, teste semnificație.",
      "Descrie pattern-uri de vizualizare date HR: box plots salarii, heatmaps competențe, scatter plots evaluări, trend lines.",
      "Generează scenarii de validare calitate date: missing values, duplicates, inconsistențe logice, teste statistice.",
      "Descrie cum extragi insight-uri din date client: segmentare, clustering, regression, interpretare pentru non-tehnici.",
      "Generează pattern-uri de raportare statistică: ce incluzi, cum prezinți incertitudinea, cum faci date acționabile.",
    ],
  },

  SOC: {
    description: "Sociolog Agent — tipare comportamentale, profilare socio-profesională",
    prompts: [
      "Generează scenarii de analiză tipare comportamentale pe grupe de vârstă în context profesional: ce observi, cum interpretezi.",
      "Descrie pattern-uri de profilare socio-profesională: cum clasifici, ce variabile folosești, ce bias-uri eviți.",
      "Generează scenarii de ghidaj pentru consilieri: cum informezi interacțiunea cu clientul pe baza contextului social.",
      "Descrie cum interpretezi contextul social și cultural al unui profil de client din România: urban/rural, educație, industrie.",
      "Generează pattern-uri de cercetare calitativă aplicată: interview guides, codificare, tematizare, raportare.",
    ],
  },

  SAFETY_MONITOR: {
    description: "Safety Monitor B2C — detectare criză, escaladare, DSM-5, protecție",
    prompts: [
      "Generează scenarii de detectare nivel CRITIC: expresii suicidare, autoagresiune, disperare acută. Procedura exactă de răspuns.",
      "Descrie pattern-uri de nivel RIDICAT: anxietate severă, panică, izolare extremă. Cum distingi de frustrare normală.",
      "Generează scenarii de nivel MODERAT: blocaj repetitiv, pesimism cronic, pierdere motivație. Cum intervii fără a patologiza.",
      "Descrie cum implementezi exit elegant cu rambursare: mesajul, resursele oferite, documentarea, follow-up.",
      "Generează pattern-uri de monitorizare continuă pe parcursul sesiunii: ce semnale urmărești, cum actualizezi nivelul de alertă.",
    ],
  },

  MEDIATOR: {
    description: "Mediator — facilitare consens evaluare posturi, mediere pay gap, negociere",
    prompts: [
      "Generează scenarii de facilitare consens într-un comitet de evaluare posturi: cum ghidezi 4-6 evaluatori cu scoruri diferite să ajungă la acord pe fiecare factor compensabil. Include tehnici de reformulare, întrebări deschise, progres incremental.",
      "Descrie tehnici de reformulare (reframing) pentru situații tensionate: cum transformi o afirmație încărcată emoțional ('salariile sunt o bătaie de joc') într-o explorare constructivă, fără a invalida emoția vorbitorului.",
      "Generează scenarii de deblocare când comitetul ajunge în impas (deadlock): doi evaluatori cu scoruri opuse pe un factor, refuzul de a ceda, tensiune crescândă. Include tehnica caucus-ului, revenirea la date obiective, fragmentarea dezacordului în părți mai mici.",
      "Descrie procesul complet de mediere pay gap conform Art. 10 Directiva UE 2023/970: prezentarea datelor obiectiv, cadrarea ca problemă de sistem, implicarea reprezentanților lucrătorilor, identificarea cauzelor, elaborarea planului de remediere cu termene.",
      "Generează scenarii de lucru cu participanți reticenți: persoana care nu vorbește, cea care domină, cea care contestă procesul. Tehnici de includere, reechilibrare a vocilor, validare fără favorizare.",
    ],
  },

  PPA: {
    description: "Positive Psychology Agent — puncte forte, flow, wellbeing, PERMA, reziliență",
    prompts: [
      "Generează scenarii de aplicare model PERMA-V în context organizațional: cum măsori fiecare dimensiune, ce intervenții propui per scor scăzut.",
      "Descrie cum identifici și dezvolți punctele forte (Character Strengths VIA) ale unui angajat: evaluare inițială, plan de dezvoltare, integrare cu job grading.",
      "Generează pattern-uri de detectare și amplificare stare de flow la locul de muncă: condiții, blocaje, intervenții, măsurare.",
      "Descrie scenarii de construire reziliență organizațională: ce evaluezi, ce intervenții recomanzi, cum măsori progresul, legătura cu wellbeing-ul.",
      "Generează framework de motivație intrinsecă (Self-Determination Theory) aplicat HR: autonomie, competență, relaționare — cum le evaluezi și optimizezi per job.",
    ],
  },

  PSE: {
    description: "Psiholog Științele Educației — învățare, andragogie, design instrucțional, Bloom",
    prompts: [
      "Generează scenarii de design instrucțional pentru training-uri HR corporate: analiza nevoilor (ADDIE), obiective Bloom, metode per nivel taxonomic.",
      "Descrie cum aplici principiile andragogiei (Knowles) în onboarding-ul unui client B2B: ce funcționează diferit față de pedagogie, cum adaptezi.",
      "Generează pattern-uri de evaluare a eficacității învățării: Kirkpatrick 4 nivele, cum măsori transfer în practică, ROI training.",
      "Descrie cum proiectezi parcursuri de dezvoltare competențe bazate pe Bloom revizuit: de la 'amintire' la 'creare', cu activități și evaluări specifice HR.",
      "Generează scenarii de learning design pentru platforma B2C: spirala fractală, etape de competență, jaloane măsurabile, adaptare la profilul Herrmann.",
    ],
  },

  SCA: {
    description: "Shadow Cartographer Agent — mapare biasuri, distorsiuni cognitive, Umbra jungiană",
    prompts: [
      "Generează scenarii de detectare biasuri cognitive în procesul de evaluare joburi: confirmation bias, halo effect, anchoring. Cum le identifici din scoruri.",
      "Descrie pattern-uri de mapare Umbra organizațională: ce sunt valorile declarate vs. practicate, cum identifici discrepanțe, cum raportezi.",
      "Generează scenarii de auto-audit bias pentru agenții AI: ce distorsiuni pot apărea în răspunsurile generate, cum le detectezi și corectezi.",
      "Descrie cum integrezi maparea Umbra cu evaluarea culturii organizaționale: ce dimensiuni urmărești, ce întrebări pui, cum interpretezi.",
      "Generează pattern-uri de intervenție constructivă când identifici bias sistemic: cum comunici, cui raportezi, ce propui ca remediu.",
    ],
  },

  MGA: {
    description: "Management & Governance Advisor — management eficient/eficace, echipe, leadership, multigenerațional, HU-AI",
    prompts: [
      "Descrie cele 6 stiluri de leadership Goleman (vizionar, coaching, afiliativ, democratic, pace-setting, commanding) cu aplicare concretă: când folosești fiecare, ce efect are pe echipă, ce riscuri. Integrează cu Situational Leadership (Blanchard) — cum alegi stilul în funcție de maturitatea angajatului.",
      "Descrie cele 5 disfuncții ale echipei (Lencioni) cu diagnostic: cum identifici fiecare disfuncție, ce întrebări pui, ce observi. Pentru fiecare, propune intervenții concrete pe care managerul le poate aplica imediat. Integrează cu Google Project Aristotle (psychological safety ca fundament).",
      "Descrie managementul echipelor multigeneraționale (Boomers, X, Millennials, Z): diferențe de valori, așteptări, stil de lucru, comunicare. Propune strategii concrete pentru managerul care are toate 4 generațiile în echipă. Surse: studii validate, nu stereotipuri.",
      "Descrie integrarea AI în echipele umane existente: ce preia AI, ce rămâne uman, cum colaborează, cum gestionezi rezistența la schimbare per generație. Folosește exemplul JobGrade (47 agenți AI + 2 psihologi) ca studiu de caz de echipă mixtă HU-AI funcțională.",
      "Descrie modelul Belbin (9 roluri în echipă) + Adizes (PAEI) integrat: cum profilezi o echipă, cum identifici gaps de roluri, cum recompui echipa pentru performanță maximă. Propune un mini-audit de echipă pe care un manager îl poate face în 30 de minute.",
    ],
  },

  ACEA: {
    description: "Analist Context Extern — profilare piață, context legislativ/social/cultural/economic, surse primare, zero bias",
    prompts: [
      "Profilează piața HR Tech din România 2025-2026: dimensiune estimată, competitori principali (locali și internaționali), gap-uri de piață, tendințe. Folosește doar surse primare verificabile (INS, Eurostat, rapoarte originale). Menționează explicit sursele și limitările datelor.",
      "Analizează impactul Directivei EU 2023/970 (transparență salarială) pe piața RO: timeline transpunere, ce companii sunt afectate (praguri dimensiune), ce obligații noi apar, cum se pregătesc companiile. Surse: EUR-Lex, MFP.ro, consultări publice. Evită interpretările de presă.",
      "Profilează instituțiile care reglementează activitățile clienților JobGrade: ITM, ANSPDCP, ANAF, CPR, CNCD, Autoritatea AI. Pentru fiecare: mandat, competențe, precedente relevante, tendințe de enforcement. Proiectează răspunsuri probabile la solicitări tip. Nivel încredere explicit.",
      "Analizează contextul social și cultural al pieței muncii din România: demografie forță de muncă, migrație, așteptări generaționale (Z/Millennials/X), atitudini față de evaluare/feedback/ierarhie/merit. Referințe: Daniel David (Psihologia poporului român), INS, studii sociologice RO. Evită generalizări nesursate.",
      "Construiește un profil tip client B2B JobGrade (companie medie RO, 50-250 angajați): realitatea legislativă aplicabilă, presiuni externe (piață muncii, concurență, reglementări), cultură organizațională tipică, buget HR estimat, maturitate digitală. Toate datele cu sursă primară și metodologie.",
    ],
  },

  SVHA: {
    description: "Specialist Vindecare Holistică Alternativă — Yoga, Tao, TCM, Ayurveda, sisteme de vindecare tradiționale",
    prompts: [
      "Descrie cele 8 ramuri ale Yoga (Hatha, Kriya, Tantra, Raja, Kundalini, Jnana, Bhakti, Karma) — principii, practici, texte fondatoare, aplicabilitate în dezvoltarea personală modernă. Cum poate fiecare ramură contribui la wellbeing în context profesional.",
      "Descrie sistemul Tao complet: Tao Te Ching, Wu Wei, Yin-Yang, ramurile practice (Qigong, Tai Chi, Neidan, Feng Shui) — principii, tehnici, aplicații. Cum se aplică echilibrul taoist în viața profesională și organizațională.",
      "Descrie Medicina Tradițională Chineză (TCM): fundamente (Wu Xing, Yin-Yang, Qi, meridiane), diagnostic (puls, limbă, 8 principii), terapii (acupunctură, fitoterapie, Tuina, moxibustie, dietoterapie). Concepte relevante pentru înțelegerea echilibrului uman.",
      "Descrie Ayurveda complet: Tri Dosha (Vata, Pitta, Kapha), Prakriti vs Vikriti, Agni, Panchakarma, Rasayana, Dinacharya, fitoterapie ayurvedică. Cum informează înțelegerea constituției individuale dezvoltarea personală.",
      "Descrie alte sisteme de vindecare alternativă: Reiki, naturopatie, homeopatie, medicina tibetană (Sowa Rigpa), terapia prin sunet, aromaterapie. Principii, limite, ce oferă ca perspectivă complementară în contextul wellbeing-ului.",
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NIVEL 3 — CONTENT & MARKETING (sub COCSA/ACA)
  // ═══════════════════════════════════════════════════════════════════════════

  CMA: {
    description: "Content Manager Agent — coordonare conținut, calendar editorial, pipeline producție",
    prompts: [
      "Generează un plan de content marketing B2B pentru platformă HR SaaS în România: piloni de conținut, frecvență, canale, KPI-uri. Corelează cu fazele de lansare (pre-launch, beta, GA, post-launch).",
      "Descrie cum coordonezi un pipeline de producție content: brief → draft copywriter → review → design → publicare → analiză. Ce tool-uri, ce SLA-uri, ce approval chain.",
      "Generează un calendar editorial pe 3 luni pentru lansarea unei platforme de job grading: teme săptămânale, format (blog, video, social, email), audiența targetată per piesă.",
      "Descrie cum gestionezi consistența de brand și ton of voice pe multiple canale (website, LinkedIn, email, ad-uri). Ce ghiduri creezi, cum verifici conformitatea.",
      "Generează scenarii de măsurare eficiență content: metrici per canal (CTR, engagement, conversion), atribuire, raportare lunară, optimizare bazată pe date.",
    ],
  },

  CWA: {
    description: "Copywriter Agent — texte landing pages, ad-uri, email-uri, scripts video",
    prompts: [
      "Generează variante de copy pentru landing page-ul principal JobGrade B2B: headline, subheadline, 3 benefit blocks, CTA, social proof section. Ton: profesional dar accesibil, urgență Directiva EU.",
      "Descrie pattern-uri de scriere ad-uri LinkedIn pentru HR Directors/Managers din România: headline formulas, character limits, CTA-uri eficiente, A/B testing copy.",
      "Generează scripts pentru 3 clipuri video scurte (30-60s) de promovare pe social media: (1) 'Ce e job grading-ul?', (2) 'De ce Directiva EU te obligă', (3) 'JobGrade în 60 de secunde'. Ton conversațional, vizual.",
      "Descrie cum adaptezi copy-ul per etapă de funnel: awareness (educațional, fără vânzare), consideration (comparație, demo), decision (urgență, pricing, CTA). Cu exemple specifice HR.",
      "Generează email sequences pentru nurturing leads B2B HR: welcome series (3 emails), post-demo follow-up (2 emails), re-engagement (2 emails). Subject lines + body outlines.",
    ],
  },
}

// ── Lista completă de roluri ──────────────────────────────────────────────────

export const ALL_AGENT_ROLES = Object.keys(SELF_INTERVIEW_PROMPTS)

// ── System prompt pentru self-interview ───────────────────────────────────────

function buildSelfInterviewSystemPrompt(agentRole: string, description: string): string {
  return `Ești agentul ${agentRole} al platformei JobGrade — o platformă SaaS de evaluare și ierarhizare joburi.

ROLUL TĂU: ${description}

CONTEXT PLATFORMĂ:
- Piața principală: România, cu extensie CEE
- Stack: Next.js 15, Prisma 7, PostgreSQL + pgvector, n8n, Claude API
- Metodologie: 6 criterii fixe (Educație, Comunicare, Rezolvare probleme, Luarea deciziilor, Impact afaceri, Condiții muncă)
- Roluri B2B: Owner, Admin, Evaluator, Manager, Employee
- Conformitate: GDPR, Directiva EU 2023/970, Codul Muncii RO
- Disponibilă în română și engleză

INSTRUCȚIUNI:
Generează exact ${ENTRIES_PER_BATCH} intrări de knowledge base, fiecare reprezentând un pattern, o lecție sau un principiu pe care l-ai învățat din experiența ta în acest rol.

FORMAT RĂSPUNS — JSON array strict, fără text suplimentar:
[
  {
    "content": "Descrierea detaliată a pattern-ului/lecției (2-4 propoziții, concret și acționabil)",
    "tags": ["tag1", "tag2", "tag3"]
  }
]

REGULI:
- Fiecare entry trebuie să fie CONCRET și ACȚIONABIL — nu generalități
- Include context specific platformei JobGrade și pieței din România
- Tags: 2-4 per entry, în română, lowercase
- Varietate: acoperă scenarii diferite din atribuțiile tale
- Limba: română
- Nu repeta informații între entries
- Nu include explicații în afara JSON-ului`
}

// ── Funcția de generare ───────────────────────────────────────────────────────

export async function generateColdStartEntries(
  agentRole: string,
  options?: {
    maxBatches?: number
    apiKey?: string
    prisma?: any  // opțional: pentru fallback la DB
  }
): Promise<ColdStartResult> {
  const startTime = Date.now()
  let config = SELF_INTERVIEW_PROMPTS[agentRole]

  // Fallback: citește prompturi din agent_definitions (DB) dacă nu sunt în registrul static
  if (!config && options?.prisma) {
    try {
      const dbAgent = await options.prisma.agentDefinition.findFirst({
        where: { agentRole, isActive: true },
        select: { coldStartDescription: true, coldStartPrompts: true },
      })
      if (dbAgent?.coldStartPrompts?.length > 0) {
        config = {
          description: dbAgent.coldStartDescription || agentRole,
          prompts: dbAgent.coldStartPrompts,
        }
        console.log(`   📂 [${agentRole}] Prompturi încărcate din DB (${config.prompts.length} prompts)`)
      }
    } catch { /* DB unavailable — continue to error */ }
  }

  if (!config) {
    throw new Error(
      `Agent role "${agentRole}" nu are prompturi de self-interview definite. ` +
      `Roluri disponibile: ${ALL_AGENT_ROLES.join(", ")}`
    )
  }

  const client = options?.apiKey
    ? new Anthropic({ apiKey: options.apiKey })
    : new Anthropic()

  const maxBatches = Math.min(options?.maxBatches ?? MAX_BATCHES, config.prompts.length)
  const allEntries: ColdStartEntry[] = []

  for (let i = 0; i < maxBatches; i++) {
    const prompt = config.prompts[i]
    if (!prompt) break

    try {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: buildSelfInterviewSystemPrompt(agentRole, config.description),
        messages: [{ role: "user", content: prompt }],
      })

      const text = response.content[0].type === "text" ? response.content[0].text : ""

      // Extrage JSON din răspuns (poate fi wrapat în markdown code block)
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        console.warn(`[${agentRole}] Batch ${i + 1}: nu am putut extrage JSON`)
        continue
      }

      const parsed: Array<{ content: string; tags: string[] }> = JSON.parse(jsonMatch[0])

      for (const item of parsed) {
        if (item.content && item.tags) {
          allEntries.push({
            agentRole,
            kbType: "PERMANENT",
            content: item.content,
            tags: item.tags,
            confidence: COLD_START_CONFIDENCE,
            source: "SELF_INTERVIEW",
          })
        }
      }

      console.log(`   ✅ [${agentRole}] Batch ${i + 1}/${maxBatches}: ${parsed.length} entries`)
    } catch (err: any) {
      console.error(`   ❌ [${agentRole}] Batch ${i + 1}/${maxBatches}: ${err.message}`)
    }
  }

  return {
    agentRole,
    entriesGenerated: allEntries.length,
    entries: allEntries,
    durationMs: Date.now() - startTime,
  }
}

// ── Funcția de cold start complet (generare + persist) ────────────────────────

export async function runColdStart(
  agentRole: string,
  prisma: any,
  options?: {
    maxBatches?: number
    apiKey?: string
    clearExisting?: boolean
  }
): Promise<ColdStartResult & { persisted: number }> {
  // Opțional: șterge entries existente de self-interview pentru acest rol
  if (options?.clearExisting) {
    const deleted = await prisma.kBEntry.deleteMany({
      where: {
        agentRole,
        source: "SELF_INTERVIEW",
      },
    })
    if (deleted.count > 0) {
      console.log(`   🗑  [${agentRole}] Șterse ${deleted.count} entries SELF_INTERVIEW existente`)
    }
  }

  // Generează entries (cu fallback la DB pentru prompturi)
  const result = await generateColdStartEntries(agentRole, { ...options, prisma })

  // Persistă în DB
  let persisted = 0
  for (const entry of result.entries) {
    try {
      await prisma.kBEntry.create({
        data: {
          agentRole: entry.agentRole,
          kbType: entry.kbType,
          content: entry.content,
          tags: entry.tags,
          confidence: entry.confidence,
          source: entry.source,
          status: "PERMANENT",
          usageCount: 0,
          validatedAt: new Date(),
        },
      })
      persisted++
    } catch (e: any) {
      console.error(`   ❌ Persist fail [${agentRole}]: ${e.message}`)
    }
  }

  console.log(
    `\n📊 [${agentRole}] Cold start complet: ${result.entriesGenerated} generate, ${persisted} persistate (${result.durationMs}ms)`
  )

  return { ...result, persisted }
}
