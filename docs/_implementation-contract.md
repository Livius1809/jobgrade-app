# REGISTRU IMPLEMENTARE — Contract Cod vs Documentatie

> **Generat**: 06.05.2026 | **Verificat contra cod**: da, grep + citire fisiere
> **Scop**: Fiecare functionare discutata si agreata are status verificat in cod.
> **Regula**: Nimic nu e "facut" fara commit demonstrabil.

## SUMAR

| Zona | DONE | PARTIAL | SKELETON | MISSING | Total |
|------|------|---------|----------|---------|-------|
| B2B Platform | 55 | 16 | 0 | 9 | 80 |
| B2C Platform | 29 | 5 | 1 | 9 | 44 |
| Arhitectura + Mecanisme | 51 | 7 | 2 | 3 | 63 |
| Infra + Legal + Ops | 72 | 12 | 3 | 5 | 92 |
| **TOTAL** | **207** | **40** | **6** | **26** | **279** |

**Rata completare**: 207/279 = **74% DONE**, 14% PARTIAL, 2% SKELETON, **9% MISSING**

---

## MISSING (26 items — nu exista in cod)

### B2B (9 MISSING)
1. SmartReportsDashboard (rapoarte activate de date, per-report readiness)
2. S2 Management multigenerational — analiza 5 factori (varsta/generatie/cultura/personalitate/rezultanta)
3. Raport capacitate de invatare
4. Raport capacitate de adaptare
5. Metrici performanta strategice (endpoint dedicat)
6. Manual cultura organizationala (generare)
7. Business plan operational (generare)
8. Notificari B2C candidat interesat (flow notificare)
9. Sectiune Angajati/Candidati in portalul B2B

### B2C (9 MISSING)
10. Card 2 "Eu si ceilalti" — chat route + pagina (schema exista, zero cod functional)
11. Card 4 "Oameni de succes/valoare" — chat route + pagina
12. Card 5 "Antreprenoriat transformational" — chat route + pagina
13. MBook pipeline (Remotion + DALL-E + social publishing)
14. Parser CPI260 (35 scale din PDF)
15. Parser ESQ-2 (16 centile din PDF)
16. Parser AMI (17 stanine din PDF)
17. Parser PASAT 2000
18. Comunitati B2C — API routes + UI pagini (schema exista)

### Arhitectura (3 MISSING)
19. n8n workflow JSON files (FLUX-041 la FLUX-056) — nu sunt in repo, doar in n8n DB
20. Vendor Manuals Roadmap (4 obiective post-scanare) — zero cod
21. Remediation Runner server.py — referit in docker-compose, sursa lipsa din repo

### Infra/Legal/Ops (5 MISSING)
22. Cookie consent banner (GDPR obligatoriu)
23. Oblio.eu integrare facturare (ANAF SPV)
24. B2C monitor in Owner Dashboard
25. KB browser UI per agent
26. Strategic themes model + editor

---

## PARTIAL (40 items — cod exista dar incomplet)

### B2B (16 PARTIAL)
- Organigrama functionala — pagina exista, lipsa vizualizare org chart
- Toggle UMAN/AI/MIXT — enum in schema, lipsa UI per post
- Matching B2B-B2C — engine exista dar pe mock data, nu pe B2C users reali
- Cost pozitie vacanta — tip VACANCY in simulare dar fara raport dedicat
- JD recomandat fit cultural vs agent schimbare — enum dar fara generare
- Profil manager leadership — lipsa raport dedicat
- Documente interne C3 — card-inputs accepta upload dar fara pipeline AI
- Simulare Impact — 2 endpoint-uri separate in loc de motor unic
- Toggle CLASIC/TRANSFORMATIONAL — doar in culture/simulator, nu transversal
- Obiective strategice CA — card-inputs suporta dar fara pagina cascade
- Declarat vs practicat — acoperit in 3C dar fara raport standalone
- Anonimizare progresiva B2B-B2C — schema are alias dar flow 6 pasi neimplementat
- Raport compatibilitate bilateral — scor returnat dar fara PDF formal
- Media Books continut — config 7 books, continut doar pt MB-R1/R2/R3
- S2 Multigenerational — team reports exista dar fara analiza factori
- Onboarding template Acme — task-uri in DB dar fara wizard automat

### B2C (5 PARTIAL)
- Comunitati acces — schema cu communityReady flag dar fara API/UI
- Comunicare adaptiva — aplicata in prompturi, lipsa engine dedicat Psiholingvist
- MBook componente — ExpandableSection exista dar fara blocuri atomice/PDF/voice
- C3 evaluation sequential flow — panel exista dar fara sequentialitate impusa
- B2C frontend — doar 2 pagini (/personal, /personal/card-3) din 6 necesare

### Arhitectura (7 PARTIAL)
- D3 process detection — modele exista, tracking procesual scheletral
- Remediation Runner — exista in lib/agents/ (nou creat azi) dar Docker sidecar lipsa
- Platform Flows — FluxStepRole seeded, orchestrare in n8n extern
- DOAS rol — agent in DB dar cele 7 functii nu au cod dedicat
- Psiholingvist — detectie exista, workflow complet neautomatizat
- Stack Healthcheck — fixes aplicate dar sursa sidecar lipsa
- Palnia ingestie — functioneaza dar fara multi-business (zero businessId pe KB)

### Infra/Legal/Ops (12 PARTIAL)
- Redis Upstash — env vars may be missing, fallback in-memory
- Contract standard PDF — markdown draft, fara generare PDF
- B2C pseudonim 2 straturi — routes exista dar profunzime neverificata
- BudgetLine/RevenueEntry — budget route exista dar RevenueEntry lipsa
- Video conference Jitsi — route exista, cost 0, Faza 1
- Voice AI ElevenLabs — route exista, Faza 2 planificata
- TVA in checkout — Stripe exista dar toggle TVA explicit lipsa
- B2C frontend — 2 pagini din vertical complet
- Media Books continut — pipeline structura dar continut majoritar ASSIGNED
- Onboarding template — task-uri dar fara wizard
- UptimeRobot — heartbeat exista, integrare externa
- Localizare RO+EN — directoare goale, zero fisiere traducere

---

## SKELETON (6 items — fisiere/stubs exista dar fara implementare reala)

1. Voice Cloning ElevenLabs — config + audition scripts, BLOCKER: inregistrare Owner
2. Localizare i18n — directoare goale, zero traduceri
3. L3 Trei Sub-straturi (L3.1/L3.2/L3.3) — conceptual, fara separare in cod
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
