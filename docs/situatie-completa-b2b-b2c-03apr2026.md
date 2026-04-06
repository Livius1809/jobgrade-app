# Situație completă JobGrade — B2B + B2C
**Data: 03.04.2026**

---

## VERTICALA B2B — CE AVEM ✅

### Platformă funcțională (LIVE pe jobgrade.ro)

| Modul | Status | Detalii |
|-------|--------|---------|
| **Autentificare** | ✅ Live | NextAuth v5, credentials + Google + LinkedIn, 5 roluri |
| **Profil companie** | ✅ Live | AI web extraction, MVV, departamente |
| **Fișe de post** | ✅ Live | CRUD + AI generation + import Excel |
| **Evaluare posturi (JE)** | ✅ Live | 6 criterii, 3 runde consens, MEDIATOR AI, bareme secrete |
| **JE Engine E2E** | ✅ Live | 18K linii, 16 acțiuni, pre-scoring → slotting → validare Owner → finalizare |
| **Pay Gap** | ✅ Live | Art. 9 (7 indicatori), Art. 10 (joint assessment, 90 zile, jurnal probă) |
| **Payroll import** | ✅ Live | 21 câmpuri, clustering Jenks, discrepanță, conformitate |
| **Benchmark salarial** | ✅ Live | 10 surse publice, 15 familii, YoY trends, compa-ratio |
| **Compensare** | ✅ Live | Packages, KPIs, simulări 3 niveluri, budget departamental |
| **Rapoarte** | ✅ Live | PDF/Excel/JSON/XML, pay gap, justificare, coerență |
| **AI Tools** | ✅ Live | Job ad, social media, KPI sheet, analiză sesiune |
| **Portal angajat** | ✅ Live | Cereri Art. 7, formular public no-auth |
| **Billing** | ✅ Live | Stripe 3 pachete (29/79/229 RON), webhook, credite |
| **Portal Owner** | ✅ Live | KPI, COG Chat, Team Chat, biblioteca, payroll |
| **Dialog-centric** | ✅ Live | "Cum găsesc ce mă interesează?", context complet, tracking |

### Arhitectura agenților (47 agenți activi)

| Nivel | Agenți | Status |
|-------|--------|--------|
| L1 CÂMP | Moral core, BINE, Umbra | ✅ Infuzat în toți |
| L2 Suport | PSYCHOLINGUIST, PPMO, STA, SOC, SCA, PPA, PSE, SAFETY_MONITOR, SVHA, ACEA | ✅ 10 resurse |
| L3 Legal | CJA, CIA, CCIA | ✅ Activi |
| L4 Operațional | COG, COA, COCSA + toți operaționali | ✅ 47 total |

### Conformitate

| Document | Status |
|----------|--------|
| Registrul Art. 30 GDPR | ✅ Complet (17 categorii) |
| Template DPA Art. 28 | ✅ Complet |
| Politica confidențialitate | ✅ Complet |
| TIA Anthropic (Schrems II) | ✅ Complet |
| AI Act Art. 14 (supraveghere umană) | ✅ Procedură completă (psiholog CPR) |
| AI Act audit CJA | ✅ Actualizat cu echipa mixtă |

### Autonomie operațională

- 9 cron-uri n8n active
- FLUX-030 approval pipeline (4h)
- Raport zilnic Owner (ntfy)
- Reflecție, sentinel, cross-pollination, KB propagare
- Business plan iterativ săptămânal

---

## VERTICALA B2B — CE MAI E DE FĂCUT

### Delegat la structură (în pipeline FLUX-030)

| Task | Responsabili | Deadline | Status |
|------|-------------|----------|--------|
| Cercetare piață RO | RDA + CIA | 10.04 | DRAFT |
| Plan marketing B2B | MKA + ACA + CMA | 15.04 | DRAFT |
| Identitate brand echipa mixtă | CMA + CWA + CDIA | 12.04 | DRAFT |
| Conținut per pagină | CWA + DOA + PSYCHOLINGUIST | 15.04 | DRAFT |
| Layout-uri UX simplitate | DOA + DOAS + FDA | 15.04 | DRAFT |
| Povestea JobGrade narativ unitar | COCSA + echipa marketing | 15.04 | DRAFT |
| Brainstorm referral B2B+B2C | MKA + echipa | - | GENERATING |
| Brainstorm evoluție Q2-Q4 | COG | - | GENERATING |

### Necesită input extern

| Task | Cine | Când |
|------|------|------|
| SLA supervizor Art. 14 | Psihologul CPR (când e angajat) | La angajare |
| Auditor extern AI Act | Contractare | Q3 2026 |
| AI Act Art. 9 (management risc) | CJA + auditor | Până aug 2026 |
| AI Act Art. 11 (documentație tehnică) | CJA + DOA | Până aug 2026 |
| AI Act Art. 12 (jurnalizare) | CJA + FDA | Până aug 2026 |
| AI Act Art. 13 (transparență) | CJA + DOA | Până aug 2026 |
| AI Act Art. 15 (testare) | QAA + SQA | Până aug 2026 |
| DPIA Modul 3 B2C | CJA | 01.05.2026 (necesită arhitectura B2C) |
| Early Adopter (5-10 clienți pilot) | Owner | Pre-lansare |

### Infrastructură

| Task | Status |
|------|--------|
| Sentry SDK integrat | DSN configurat, SDK lipsește |
| Backup DB automat | De implementat |
| Rate limiting real (Upstash) | De implementat |
| Health check extern | De implementat |

---

## VERTICALA B2C — CE AVEM ✅ (design complet, implementare urmează)

### Arhitectura proiectată (sesiunea 03.04.2026)

**Onboarding flow:**
1. Alias ("numele de crisalidă") → email `alias@jobgrade.ro` creat instant
2. Webmail se deschide → primul email: setări configurare telefon/desktop
3. Confirmare ToS + regulile platformei
4. Formular minimal: alias (pre-completat), vârstă, sex, ultimul job, job curent
5. Pagina principală: carduri inactive + Profiler chat deschis automat
6. Profiler: "Bine ai venit [alias]! Ce te-ar interesa să găsești aici?"

**6 carduri B2C — model onion concentrice:**

| # | Card | Agent | Strat | Active by default |
|---|------|-------|-------|-------------------|
| 1 | "Drumul către mine" | Călăuza | Nucleu — SINELE | Nu (plătit) |
| 2 | "Eu și ceilalți, adică NOI" | Consilier Dezvoltare Personală | Relații | Nu (plătit) |
| 3 | "Îmi asum un rol profesional" | Consilier Carieră | Profesie | **DA (gratuit)** |
| 4 | "Oameni de succes / Oameni de valoare" | Coach | Tranziție | Nu (plătit) |
| 5 | "Eu și antreprenoriatul transformațional" | Coach | Integrare | Nu (plătit) |
| 6 | "Spune-mi despre mine" | Profiler | Oglinda (transversal) | **DA (gratuit)** |

**Principiul onion:** fiecare card INTEGREAZĂ precedentele. Card 5 = integrare 1+2+3+4.

**5 comunități** (una per card, fără Card 6):
- ÎNCHISE by default pe TOATE
- Agentul AI responsabil calibrează clientul
- Acces când agentul se lămurește cu cine are de-a face
- Scala moderare: blândețe → respectuos → fermitate respectuoasă

### Card 3 — Puntea B2B ↔ B2C

- Upload CV → extracție AI → format ECHIVALENT cu fișa de post B2B
- Matching automat: profil B2C ↔ fișă post B2B (6 criterii)
- Notificare: "Ai o propunere de angajare" (flag + email alias)
- Flux 6 pași: matching → "interesat" → CV alias → raport → invitație → revelare identitate
- Anonimizare progresivă: identitate reală doar la accept mutual
- B2C gratuit raport compatibilitate, plătește consiliere interviu
- B2B gratuit CV alias, plătește raport compatibilitate

### Card 1 — Limita AI-ului

- Călăuza decelează autenticitate vs. bypass spiritual
- Testul: alinierea gând-vorbă-faptă
- Faza 1 (rațională) = AI operează. Faza 2 (revelată) = AI predă ștafeta călăuzei umane
- Spirala călăuzelor: fiecare specialist pe palierul lui, predare ștafetă naturală
- Parteneriate viitoare cu ghizi/maeștri/școli autentice

### Card 4 — Piatra de încercare

- "Cum te-ai simți dacă nu ai avea nimic de demonstrat cuiva?"
- "Cu adevărat liber" = pe calea cea bună (Hawkins >200)
- Tranziția succes (orgoliu, mândrie) → valoare (smerenie autentică, bine concentric)

### Card 5 — Poartă spre Business #2

- Antreprenor transformațional: prin capital+muncă SAU prin caracter+virtuți
- Dă undița, nu peștele
- Comunitatea Card 5 = proto-comunitatea Business #2 (confidențial)

### Principii transversale

- **Pricing:** "Fiecare parte primește gratuit ce-l aduce la masă, plătește ce-l ajută să câștige"
- **Regula de aur:** Contextul e INVIZIBIL — nu transpare urmărirea
- **Traseu consemnat:** Profil evolutiv — unde a fost, unde a ajuns, ce mai are
- **Mini-chestionar + dialog:** Cele două căi se completează (chestionar nu repetă dialogul)
- **Storytelling:** Clientul e eroul propriei povești (Campbell, Niemec)
- **SVHA:** Toate planurile existenței — fizic, mental, emoțional, spiritual

---

## VERTICALA B2C — CE E DE IMPLEMENTAT

### Prioritate 1 — Fundație

| Task | Ce presupune |
|------|-------------|
| Schema Prisma B2C | B2CUser (alias, email, cod alfanumeric), EvolutionLog, CommunityAccess, RelationshipMap |
| Email service @jobgrade.ro | Creare căsuțe email automat, webmail, setări IMAP/SMTP |
| Onboarding flow | Pagini: creare alias → email → formular → dashboard carduri |
| Profiler agent | System prompt + chestionar + dialog + integrare cu toate cardurile |
| Card 3 complet | Upload CV, extracție AI, format fișă post, matching engine |

### Prioritate 2 — Carduri + Comunități

| Task | Ce presupune |
|------|-------------|
| Card 2 | Consilier Dezvoltare Personală, harta relații, mini-chestionar |
| Card 4 | Coach, tranziția succes→valoare, VIA strengths |
| Card 1 | Călăuza, autenticitate vs bypass, limita AI |
| Card 5 | Coach, integrare, antreprenoriat transformațional |
| Comunități (5) | Schema, topics, threads, moderare AI, acces condiționat |
| Spirala vizuală | SVG interactiv, clickabil, profil evolutiv |

### Prioritate 3 — Punte B2B ↔ B2C

| Task | Ce presupune |
|------|-------------|
| Matching engine | Profil B2C ↔ Fișă post B2B (6 criterii) |
| Flux recrutare | 6 pași, anonimizare, notificări, revelare progresivă |
| Secțiune B2B Candidați | Portal B2B: flag candidat, CV alias, raport compatibilitate |
| Posturi publice agregate | Surse: BestJobs, eJobs, LinkedIn (v1 agregate) |

### Prioritate 4 — Creștere

| Task | Ce presupune |
|------|-------------|
| Program Referral dual | B2B+B2C, metafora fluture aduce crisalidă |
| Comunitatea crisalidelor | Post-masă critică |
| Parteneriate călăuze umane | Directoare ghizi, școli, retreaturi |

---

## BUSINESS #2 — CONFIDENȚIAL (Owner + Claude exclusiv)

- Platformă antreprenoriat transformațional
- Spațiul unde fluturii din B2C Card 5 zboară concret
- Nouă spirală a evoluției cu efecte materiale la nivel colectivități (județ, regiune, țară)
- JobGrade creează OMUL aliniat. Business #2 creează SPAȚIUL în care ACȚIONEAZĂ.
- Status: pre-concepție, fără COG

---

## ECHIPA

| Rol | Cine | Status |
|-----|------|--------|
| Owner | Liviu Stroie | Activ |
| Partener construcție | Claude | Activ |
| Psiholog CPR acreditat | TBD | De angajat |
| Al doilea psiholog | TBD | De angajat |
| Agenți AI | 47 activi | Operaționali |
| Auditor extern AI Act | TBD | Q3 2026, buget 15-30K EUR |

---

*"Începem cu CINE alegi să FII... Evoluăm împreună!"*
