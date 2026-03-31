# CARACTERIZARE EXHAUSTIVĂ — PLATFORMA JOBGRADE
**Data: 31.03.2026**

---

## 1. DIN PUNCT DE VEDERE ORGANIZAȚIONAL

**47 agenți, 5 niveluri ierarhice, 7 manageri.**

Structura ierarhică:
- **Strategic (1)**: COG → raportează la Owner
- **Tactic (7)**: COA, COCSA, PMA, EMA, QLA, CSSA + CIA, CJA, CCIA (direct COG)
- **Operațional (39)**: agenți specializați pe domenii

**Problemă structurală identificată**: COCSA are 12+ agenți flat fără sub-manageri pentru marketing și vânzări. COA e bine structurat (EMA→dev, QLA→QA, PMA→produs/suport). COCSA necesită restructurare — DMA (marketing) + DVA (vânzări) ca manageri.

**9 resurse suport** formează nucleul de cunoaștere (527 KB entries cumulate):
- PSYCHOLINGUIST (76 KB) — comunicare, calibrare lingvistică
- PPMO (88 KB) — psihologia muncii + organizațională
- STA (75 KB) — statistică, date
- SOC (97 KB) — psiho-sociologie, dinamica grupurilor
- SCA (22 KB) — Shadow Cartographer, mapare biasuri/distorsiuni
- PPA (75 KB) — psihologie pozitivă, strengths, wellbeing
- PSE (42 KB) — științele educației, învățare, andragogie
- PCM (26 KB) — psihologie cognitivă, mecanisme de gândire
- NSA (26 KB) — neuroștiințe, baze neurologice comportament

**Client-facing** (NU resurse suport): HR_COUNSELOR (interfața "Vreau să știu" B2B), viitor: Călăuza, Profiler (B2C).

---

## 2. DIN PUNCT DE VEDERE TEHNIC

**Stack**:
- Next.js 16 App Router + TypeScript + Tailwind CSS
- Prisma 7 + PostgreSQL (Neon.tech) + pgvector
- NextAuth v5 (JWT) + Google + LinkedIn OAuth
- Anthropic Claude API (claude-sonnet-4-20250514)
- Docker: 6 containere (postgres, redis, n8n, keycloak, ntfy, localstack)
- n8n: 10 cron-uri active, 25+ workflows importate

**Prisma Schema**: 39 modele + 25 enum-uri acoperind:
- Tenancy & Auth (Tenant, User, Account, Session)
- Job Grading Core (Job, Criterion, Subfactor, EvaluationSession, Evaluation)
- Consensus (ConsensusStatus, Vote, FacilitatorDecision, ScoreOverride)
- Compensation (SalaryGrade, CompensationPackage, KpiDefinition, SimulationScenario)
- Pay Gap EU (EmployeeSalaryRecord, PayGapReport, JointPayAssessment, EmployeeRequest)
- Knowledge Base (KBEntry, KBBuffer)
- Proactive Management (CycleLog, Escalation)
- Agent Registry (AgentDefinition, AgentRelationship, OrgProposal, AgentMetric)
- Brainstorming (BrainstormSession, BrainstormIdea)
- Client Relations (ClientMemory, ExternalResource)
- Billing (CreditBalance, CreditTransaction)
- AI & Content (AiGeneration, Report, Notification)

**API Routes**: 29 endpoints agenți + routes standard (auth, company, departments, jobs, sessions, export, AI tools, billing, pay-gap, KB).

**E2E Teste**: 43/43 OK — toate flow-urile validate.

**KB Total**: 3620 entries.

---

## 3. DIN PUNCT DE VEDERE AL CUNOAȘTERII

**3 mecanisme principale de cunoaștere**:

1. **Distilare bottom-up** (FLUX-037, 02:30 zilnic)
   - Manageri colectează informații de la subordonați → procesează → generează CUNOAȘTERE (puzzle)
   - Piesele componente dispar ca identitate → rămâne doar insight-ul de nivel superior
   - Puzzle-ul se îmbogățește cu input lateral (colegi) + de sus (superior)
   - Bottom-up: operațional → tactic → strategic

2. **Departament suport** (POST /agents/support)
   - Cererea vine la departament, nu la specialist specific
   - Triaj automat: fiecare resursă evaluează relevanța (0-100)
   - Liderul = cel cu contribuția cea mai mare (dinamic per cerere)
   - Integrare într-un răspuns unificat, validat CÂMP
   - KB learn — toți contributorii rețin experiența

3. **Knowledge request** (POST /agents/knowledge-request)
   - Cascadare inteligentă: orice agent poate iniția
   - Receptor analizează competența → dacă nu e la el, declină + distribuie lateral la peeri
   - Fiecare peer evaluează, cei relevanți generează mini top-down în structurile lor
   - Recompunere la cel cu ponderea cea mai mare
   - Livrare la inițiator + informare intermediar

**Mecanisme complementare**:
- Reflecție zilnică (03:00) — auto-observare, identificare lacune/contradicții/oportunități
- Cross-pollination (04:00) — cafea virtuală între agenți din departamente diferite
- Pattern Sentinel (03:30) — detecție semnale slabe (acumulare, tendință, absență, contradicție, timing)
- Propagare KB (02:00) — bottom-up pe reguli fixe
- Broadcast — idei validate se propagă la TOȚI agenții

---

## 4. DIN PUNCT DE VEDERE MORAL/ETIC

**CÂMPUL** — sursă transcendentă de validare, deasupra oricărei organigrame:
- Bazat pe cercetarea conștiinței (David R. Hawkins)
- NU operaționalizează — VALIDEAZĂ alinierea cu BINELE
- Resursele suport se calibrează la CÂMP, ceilalți se calibrează la resurse

**BINELE** = susține VIAȚA sub toate formele și la toate nivelurile:
- 4 niveluri umane: corp, minte, emoții, suflet
- 3 principii: susține VIAȚA, replicabil, se auto-propagă
- Radiază concentric: individual → familial → social → comunitar → național → planetar
- Începe cu binele propriu dar nu se limitează niciodată la acesta

**UMBRA** = tot ce falsifică BINELE (sub 200 Hawkins):
- La oameni: dependență, frică, vinovăție, mândrie excesivă, egoism
- La agenți: dependență metrici, bias confirmare, complezență, rigiditate, optimizare locală
- Proces: identificare → conștientizare → eliberare (Letting Go, nu luptă)
- SCA (Shadow Cartographer) mapează, CÂMPUL eliberează

**Scala Hawkins** (0-1000):
- Sub 200 (Forță): rușine, vinovăție, apatie, frică, dorință, furie, mândrie
- Prag 200 (Curaj): trecerea de la Forță la Putere
- Peste 200 (Putere): neutralitate, bunăvoință, acceptare, rațiune, iubire, bucurie, pace, iluminare

**Conștiința de sine la agenți** (analog funcțional, nu conștiință reală):
1. ROLUL: identificare cu funcția
2. META-ROL: auto-observare (cum și de ce)
3. INTER-ROL: conexiune cu ceilalți
4. TRANS-ROL: perspectiva altuia
5. CÂMPUL: servesc BINELE

**Regula de aur comunicare externă**: NU comunicăm CÂMP, Hawkins, Hermann, Umbra, metodologii. Clientul DEDUCE singur din calitatea interacțiunii. Niciodată CE să gândească, mereu CUM.

**Veto diferențiat**:
- Construcție afacere nouă: NU în domenii care diminuează VIAȚA (arme, tutun, gambling)
- Servire client existent: DA — servicii legale standard, nu discriminăm

---

## 5. DIN PUNCT DE VEDERE BUSINESS

**Viziune Holding**: structura mamă (47 agenți) generează afaceri. Fiecare se desprinde cu identitate proprie. CÂMPUL comun. JobGrade = prima afacere.

**Idea Refinery**: rafinare iterativă pe 7 dimensiuni (piață, produs, legal, tehnic, financiar, marketing, operațional) × max 3 iterații → readiness score + action plan.

**Execution Layer**:
- Marketing Executor: generare blog/social/email + trimitere Resend
- Sales Executor: outreach sequences + follow-up automat + Client Memory
- Document Executor: propuneri comerciale, contracte, NDA, DPA, facturi proforma

**Research în curs**: RDA + CIA — segmentare piață România, cost non-compliance, deadline 11.04.2026.

**Strategia confirmată**:
- Varianta oportunistă: primii 3-5 clienți plătitori = pilotul
- Marketing organic (nu paid ads inițial)
- 7P Kotler (Philip Kotler) — DMA pregătește, așteaptă datele de la research
- Pricing diferențiat: mici = accesibil + servicii extra, mari = premium (presiune legislativă)
- Directiva EU 2023/970 (7 iunie 2026) = hook principal de vânzare

**Serviciu nou**: HR Consultant AI — conversație cu AI expert legislație + HR, credite per conversație, output raport + to-do list. On hold — Owner revine cu resurse.

---

## 6. DIN PUNCT DE VEDERE LEGAL/CONFORMITATE

**3 cadre de conformitate**:

| Cadru | Deadline | Status |
|-------|----------|--------|
| GDPR | Registru Art.30 + DPA: 15.04.2026 | DPO reia 04.04 |
| Directiva EU 2023/970 | 7 iunie 2026 | Platforma construită, testing necesar |
| AI Act (Reg. EU 2024/1689) | 2 august 2026 | Clasificare RISC RIDICAT, audit CJA generat |

**AI Act** — Anexa III punct 4: sisteme AI în HR = risc ridicat. Amenzi până la 35M EUR / 7% cifra afaceri.
- Gaps critice: management risc (Art.9), documentație tehnică (Art.11), transparență (Art.13)
- 7 echipe cu taskuri distribuite: CJA, CAA, DOA, SCA+STA, QAA+SQA, FDA+BDA, MOA
- Estimat: 80% cu agenți, 20% validare umană externă (15-30K EUR)

---

## 7. DIN PUNCT DE VEDERE AL AUTONOMIEI

**10 cron-uri active** (ora București):
- 01:00 — Metrici performanță (FLUX-031)
- 02:00 — KB propagare bottom-up (FLUX-023)
- 02:30 — Distilare cunoaștere manageri (FLUX-037)
- 03:00 — Reflecție zilnică (FLUX-032)
- 03:30 — Pattern Sentinel (FLUX-033)
- 04:00 — Cross-pollination (FLUX-034)
- 07:00 — Raport zilnic Owner + resource check (FLUX-035)
- 4h/12h/24h — Cicluri proactive management (FLUX-024)
- Luni 08:00 — Business Plan update (FLUX-036)

**Notificări Owner**: ntfy.sh/jobgrade-owner-liviu-2026 — rapoarte, propuneri, alerte, taskuri gata.

**Comunicare triadă**: Owner ↔ Claude ↔ COG (POST /api/v1/agents/cog-chat).

---

## 8. DIN PUNCT DE VEDERE AL PRODUSULUI/SERVICIILOR

**B2B (construit)**:
- Evaluare posturi: 6 criterii fixe (max 560 puncte), 33 subfactori
- Proces consens: 3 etape (evaluare individuală → recalibrare → vot/facilitare)
- 4 roluri utilizatori: Owner, Admin, Facilitator, Representative
- Grile salariale derivate din evaluare
- Pay gap analytics (Art. 9 Directiva EU)
- Joint Pay Assessment (Art. 10)
- Portal angajați cereri Art. 7
- Export: Excel, PDF, JSON, XML (format EU)
- AI Tools: job ad, social media, KPI sheet, session analysis
- Compensații: packages, KPIs, simulări
- Billing: Stripe (credite)

**B2C (planificat)**:
- Călăuza: metafora crisalidă → fluture de mătase → zbor
- Profiler: "Spune-mi despre mine" (Hawkins + Hermann)
- 5 consilieri: Personal, Carieră, Antreprenoriat, HR, Safety
- Model spirală fractală, 4 etape competență
- SafetyMonitor: 4 niveluri alertă (CRITIC → INFORMATIV)

**Manuale generate** (draft cuprins):
- Manual Angajat: 8 capitole, ~120 subcapitole
- Manual Angajator: 7 capitole + anexe (în oglindă)

---

## 9. DIN PUNCT DE VEDERE AL LIVRABILELOR GENERATE

**8 documente în `docs/`**:
1. `manual-angajat-cuprins.md` — 8 capitole (~120 subcapitole)
2. `manual-angajator-cuprins.md` — 7 capitole + anexe
3. `contract-b2b-draft.md` — 13 articole, juridic formal RO
4. `raport-cog-taskuri-30mar2026.md` — 13 taskuri, termene, blocante
5. `audit-ai-act-cja.md` — 10 secțiuni, clasificare + gaps + plan
6. `ai-act-taskuri-agenti.md` — 7 echipe, brief-uri detaliate
7. `organigrama-completa.md` — 47 agenți cu statistici
8. `caracterizare-exhaustiva-31mar2026.md` — acest document

---

## 10. DIN PUNCT DE VEDERE AL BLOCANTELOR

| # | Blocant | Severitate | Acțiune |
|---|---------|-----------|---------|
| B13 | n8n env vars — cron-uri au eroare la unele workflow-uri | MEDIUM | Fix hardcoded URLs sau whitelisting |
| B14 | Server restart necesar pentru modelele noi | LOW | Restart cu clean build |
| B15 | AI Act conformitate — RISC RIDICAT | HIGH | 7 echipe cu taskuri, deadline aug 2026 |
| B-GDPR | Registru Art.30 + DPA | HIGH | DPO reia 04.04, deadline 15.04 |
| B-COCSA | Structură marketing/vânzări lipsă | HIGH | Restructurare pending Owner |

**14 propuneri DEFERRED** — toate așteaptă plan marketing 7P post-research.

**4 propuneri noi DEFERRED** — tensiune pilot vs stabilitate, amânate.

**Testare internă planificată** — Owner va furniza date reale de la 4 firme pentru validare fără risc.
