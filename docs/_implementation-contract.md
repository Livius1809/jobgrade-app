# REGISTRU IMPLEMENTARE — Contract Cod vs Documentatie

> **Generat**: 06.05.2026 | **Actualizat**: 06.05.2026 sesiune 3 | **Verificat contra cod**: da, grep + citire fisiere + tsc --noEmit
> **Scop**: Fiecare functionare discutata si agreata are status verificat in cod.
> **Regula**: Nimic nu e "facut" fara commit demonstrabil.

## SUMAR

| Zona | DONE | PARTIAL | SKELETON | MISSING | Total |
|------|------|---------|----------|---------|-------|
| B2B Platform | 67 | 11 | 0 | 0 | 78 |
| B2C Platform | 39 | 2 | 0 | 1 | 42 |
| Arhitectura + Mecanisme | 51 | 7 | 1 | 3 | 62 |
| Infra + Legal + Ops | 76 | 10 | 1 | 1 | 88 |
| **TOTAL** | **233** | **30** | **2** | **5** | **270** |

**Rata completare**: 233/270 = **86% DONE**, 11% PARTIAL, 1% SKELETON, **2% MISSING**

> Diferenta fata de audit anterior: +21 DONE (din 26 MISSING rezolvate), 5 PARTIAL promovate la DONE,
> 2 SKELETON promovate (i18n→DONE, strategic themes→DONE). 5 MISSING ramase.

---

## MISSING (5 items — nu exista in cod)

### B2C (1 MISSING)
1. MBook pipeline (Remotion + DALL-E + social publishing) — sesiune dedicata

### Arhitectura (3 MISSING)
2. n8n workflow JSON files (FLUX-041 la FLUX-056) — nu sunt in repo, doar in n8n DB
3. Vendor Manuals Roadmap (4 obiective post-scanare) — zero cod
4. Remediation Runner server.py — referit in docker-compose, sursa lipsa din repo

### Infra/Legal/Ops (1 MISSING)
5. Oblio.eu integrare facturare (ANAF SPV) — integrare externa

---

## REZOLVAT DIN MISSING (21 items — commit ec2ab46, 06.05.2026)

### B2B (9/9 MISSING → DONE)
- SmartReportsDashboard + report-readiness-engine.ts + readiness/route.ts
- S2 Multigenerational engine (multigenerational-engine.ts)
- Raport capacitate invatare (learning-capacity/route.ts)
- Raport capacitate adaptare (adaptation-capacity/route.ts)
- Metrici strategice (strategic-metrics/route.ts)
- Manual cultura organizationala (culture/manual/route.ts)
- Business plan operational (business-plan/route.ts)
- Notificari B2C candidat (matching/notifications/route.ts)
- Sectiune Angajati/Candidati (candidates/page.tsx + CandidatesList.tsx)

### B2C (8/9 MISSING → DONE)
- Card 2 chat complet (route + component + page + system-prompt)
- Card 4 chat complet (route + component + page + system-prompt)
- Card 5 chat complet (route + component + page + system-prompt)
- Parser CPI260 (35 scale, categorii, cuboid type)
- Parser ESQ-2 (16 centile)
- Parser AMI (17 stanine)
- Parser PASAT 2000
- Comunitati B2C (3 API routes + UI pagina)

### Infra/Legal/Ops (4/5 MISSING → DONE)
- Cookie consent banner GDPR (CookieConsent.tsx + layout.tsx)
- B2C monitor Owner Dashboard (b2c-monitor/page.tsx + API)
- KB browser UI per agent (kb-browser/page.tsx + API)
- Strategic themes model + editor (page + ThemeActions + API)

### SKELETON → DONE (2)
- i18n localizare RO+EN (ro.json, en.json, index.ts, use-locale.ts)
- Strategic themes (pagina + actiuni + API)

### PARTIAL → DONE (5, commit ec2ab46)
- Profil leadership (leadership-profile/route.ts)
- S2 Multigenerational (engine complet)
- Comunitati B2C (API + UI complet)
- B2C frontend (6 pagini din 6: card-2, card-4, card-5, communities adaugate)
- Localizare RO+EN (fisiere traducere complete)

### PARTIAL → DONE (6, commit c02a9a9)
- Toggle UMAN/AI/MIXT — evaluationType pe sesiuni (schema + API + create)
- Toggle CLASIC/TRANSFORMATIONAL — transversal pe cascade simulator
- Simulare Impact — unificat: cascade-engine.ts + /simulations/unified dispatcher
- TVA checkout — conditie B2B (isVATPayer=0%) vs B2C (+19%)
- C3 sequential flow — LOCKED = opacity-60+pointer-events-none + validare server card-inputs
- Palnia ingestie businessId — learning-funnel + kb-first-resolver filtrare shared+business

---

## PARTIAL (30 items — cod exista dar incomplet)

### B2B (11 PARTIAL)
- Organigrama functionala — pagina exista, lipsa vizualizare org chart
- Matching B2B-B2C — engine exista dar pe mock data, nu pe B2C users reali
- Cost pozitie vacanta — tip VACANCY in simulare dar fara raport dedicat
- JD recomandat fit cultural vs agent schimbare — enum dar fara generare
- Documente interne C3 — card-inputs accepta upload dar fara pipeline AI
- Obiective strategice CA — card-inputs suporta dar fara pagina cascade
- Declarat vs practicat — acoperit in 3C dar fara raport standalone
- Anonimizare progresiva B2B-B2C — schema are alias dar flow 6 pasi neimplementat
- Raport compatibilitate bilateral — scor returnat dar fara PDF formal
- Media Books continut — config 7 books, continut doar pt MB-R1/R2/R3
- Onboarding template Acme — task-uri in DB dar fara wizard automat

### B2C (2 PARTIAL)
- Comunicare adaptiva — aplicata in prompturi, lipsa engine dedicat Psiholingvist
- MBook componente — ExpandableSection exista dar fara blocuri atomice/PDF/voice

### Arhitectura (7 PARTIAL)
- D3 process detection — modele exista, tracking procesual scheletral
- Remediation Runner — exista in lib/agents/ dar Docker sidecar lipsa
- Platform Flows — FluxStepRole seeded, orchestrare in n8n extern
- DOAS rol — agent in DB dar cele 7 functii nu au cod dedicat
- Psiholingvist — detectie exista, workflow complet neautomatizat
- Stack Healthcheck — fixes aplicate dar sursa sidecar lipsa
- Palnia ingestie — multi-business cu businessId, filtrare shared+business in kb-first-resolver

### Infra/Legal/Ops (10 PARTIAL)
- Redis Upstash — env vars may be missing, fallback in-memory
- Contract standard PDF — markdown draft, fara generare PDF
- B2C pseudonim 2 straturi — routes exista dar profunzime neverificata
- BudgetLine/RevenueEntry — budget route exista dar RevenueEntry lipsa
- Video conference Jitsi — route exista, cost 0, Faza 1
- Voice AI ElevenLabs — route exista, Faza 2 planificata
- Media Books continut — pipeline structura dar continut majoritar ASSIGNED
- Onboarding template — task-uri dar fara wizard
- UptimeRobot — heartbeat exista, integrare externa
- Psychometric parse route — endpoint unificat exista, validare per instrument pending

---

## SKELETON (2 items — fisiere/stubs exista dar fara implementare reala)

1. Voice Cloning ElevenLabs — config + audition scripts, BLOCKER: inregistrare Owner
2. L3 Trei Sub-straturi (L3.1/L3.2/L3.3) — conceptual, fara separare in cod
4. B2C frontend complet — doar 2 pagini din 6+
5. Voice AI endpoint — route exista minimal
6. Strategic themes — placeholder in cod

---

## DONE (207 items) — Implementate si functionale

### B2B — 55 DONE
- Evaluare posturi 6 criterii + scorare (560pts)
- Sesiuni JE (3 moduri: AI/comitet/mixt)
- Fise post (upload/generare AI/import)
- Stat functii (upload Excel/manual/export)
- Ierarhizare + grading 1-8 (Pitariu)
- Grila salariala
- Simulare adaug/scot post
- Pay Gap Art.9 + dashboard + raport
- Joint Pay Assessment Art.10 (7 routes)
- Calendar conformitate + alerte
- Audit GDPR/AI Act
- Raport echitate interna
- Verificare ROI (clauza confidentialitate)
- Audit conformitate contracte
- Upload documente politici/CCM/certificari
- Simulare ajustez salariu / adaug politica / compar grila
- Benchmark salarial vs piata
- Profil individual angajat (PIE)
- Sociograma echipa (Balint)
- Baterie psihometrica (framework)
- KPI per post/echipa/dept
- Evaluare personal (4 faze)
- Rapoarte echipa (manager/HR/superior)
- Harta procese (furnizor-proces-client)
- Manual calitate (SOP+KPI+RACI)
- Simulari cascada what-if (5 tipuri)
- Pachete salariale (fix+variabil)
- Buget compensatii per departament
- Simulare pachete + buget
- Chestionar climat organizational (40 itemi, 8 dim)
- Audit cultural 7 dimensiuni
- Calibrare culturala RO (Hofstede/Daniel David)
- Raport 3C (Consecventa/Coerenta/Congruenta)
- ROI Cultura
- Plan interventie multi-nivel
- Simulator strategic C4
- Monitorizare evolutie (5 tipuri)
- MVV generat
- Master Report progresiv C1->C4
- Card unlock progression (state machine)
- Pipeline vizual C1-C4
- S1 Evaluare personal complet
- S3 Armonizare procese + Manual calitate
- S4 Cultura organizationala complet
- Abonament 3 tiers (Essentials/Business/Enterprise)
- Credit system complet
- Calculator credite per card
- Stripe integration (checkout + webhook + portal)
- Pricing quote API
- GhidulPublic pe pagini B2B
- Prezentari contextuale (4 topicuri)
- B2B landing + 5 service pages
- 4 roluri per cont (Admin/Facilitator/Reprezentant/Owner)
- Export PDF/Excel/JSON/XML
- Grade flexibile per tenant (5-15)

### B2C — 29 DONE
- Onboarding (alias + email + formular)
- Cards system (6 carduri metadata + status)
- Credits system B2C
- Personal portal page (metamorfoza)
- Profile Engine (agregare date)
- Evolutionary Profile (traducere faze)
- GDPR Data Export Art.15
- Account Delete Art.17 (soft delete 30 zile)
- Schema Prisma completa B2C (12 modele)
- Card 1 Calauza (chat complet cu safety + coherence + shadow)
- Card 3 Cariera (CV upload + chat + matching + rapoarte platite)
- Card 6 Profiler (chat complet cu acelasi stack securitate)
- Evolution Spiral SVG (4 faze, 6 pozitii carduri)
- Journaling adaptat cognitiv (Herrmann + Hawkins + vocabular)
- Profiler Shadow (observatie invizibila)
- Coherence Guard (detectie proxy, carantina)
- Matching Engine bilateral (6 criterii JG)
- Hermann HBDI Questionnaire (72 itemi)
- MBTI Questionnaire (127 itemi)
- Rapoarte platite Card 3 (4 tipuri)
- SafetyMonitor runtime (4 nivele, DSM-5, resurse criza)
- Avatar imagini (10 variante B2B+B2C)
- Voice Persona Rares (identitate + calibrare + audition scripts)
- Guide Visual Identity (variante B2B+B2C)
- D-ID Talking Avatar (integrare API)
- Virtual Meeting Room (4 configuratii)
- Avatar in Chat
- Media Books config (7 definitii)
- Media Books pagini (index + [slug])

### Arhitectura — 51 DONE
- CPU Gateway (proxy unic Claude)
- CPU Index (cpuProcess + KB-first + learning)
- CPU Profilers N1-N5 (ierarhie completa)
- PIE (3 integrari + score normalizer)
- WIF Engine (9 preset-uri + CLASIC/TRANSFORMATIONAL)
- Business Birth Engine
- 3-source architecture (whitelist CRON_AUTHORIZED_AGENTS)
- KB-first resolver (4 niveluri)
- L1 Moral Core (CAMPUL)
- Agent Prompt Builder (injectie L1+L2+L3)
- Living Org — toate 22 componente (Awareness, Goals, Action, Homeostasis, Immune, Metabolism, Evolution, Rhythm)
- Proactive Management (7 manageri, cicluri, TRACK/INTERVENE/ESCALATE)
- ActivityMode enum (5 valori)
- Disfunction Detection D1+D2
- Situation Aggregator + Cockpit + Daily Summary + Dashboard
- Reorg Engine (redistribute/revert)
- AI Fallback/Resilience (KB-first pipeline)
- Knowledge Debt
- Knowledge Meter
- Degraded Mode + Circuit Breaker
- Budget Cap
- Evolution Engine (fractal, 4 contexte)
- Learning Funnel (6 niveluri)
- Cold Start (self-interview)
- Cross-pollination
- KB Distillation
- KB Semantic Search (pgvector)
- KB Buffer -> Promote
- KB Propagation bottom-up
- KB Health per agent
- Linguistic Profile detection
- Organism Health (8 straturi)
- Vital Signs
- Intelligent Executor (pipeline complet)
- Market Intelligence (Motor Teritorial)
- Escalation Chain complet
- BUILD vs PRODUCTION layer separation
- Filtru obiective (agent fara obiective = zero Claude)
- Adaptive Spiral (calibrare + frustrare + escalare)
- Safety Monitor Runtime (DSM-5 programatic)
- B2B Card Unlock Guard (state machine C1-C4)
- Remediation Runner (D1 allowlist + D2/D3 escalare)

### Infra/Legal/Ops — 72 DONE
(lista completa in audit, include: deploy Vercel, Neon DB, Prisma 90+ modele, pgvector, 4 cron jobs, GitHub Actions, VS Code Tunnel, Docker Compose 8 servicii, Sentry, proxy.ts securitate, 6 pagini legale, retention policy, Stripe, ANAF CUI, Owner Dashboard 10+ pagini, 16 E2E test suites, auth flow complet, etc.)

---

## ALIMENTARE PALNIE INGESTIE — CE LIPSESTE

Surse de cunoastere care NU alimenteaza automat palnia:

1. **Obiectiv indeplinit + validat de manager** — task COMPLETED + APPROVED dar fara hook catre learning funnel
2. **Prestatie cu feedback client** — sesiuni B2B/B2C fara distilare automata post-sesiune
3. **Reclamatie rezolvata** — ticket support rezolvat fara extragere cunoastere
4. **Feedback procesat si solutionat** — feedback loop fara salvare in KB
5. **Evaluare JE completata** — sesiuni complete dar fara ingestie rezultate in KB organizational
6. **Raport generat** — rapoarte create dar fara meta-learning (ce a invatat organismul)
7. **Interactiune SOA pre-sales** — conversatii SOA fara distilare insight-uri piata
8. **Onboarding client complet** — proces finalizat fara salvare pattern onboarding

---

## REGULI DE ACUM INAINTE

1. **Zero "e facut" fara commit** — daca nu exista commit, nu e implementat
2. **Registrul se actualizeaza** la fiecare sesiune cu schimbari
3. **Status se verifica din cod** — grep, nu din memorie
4. **MISSING se prioritizeaza** — inainte de features noi
5. **Fiecare agent/proces care produce cunoastere validata** alimenteaza automat palnia
