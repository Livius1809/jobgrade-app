# SC — FURNIZORI, CLIENȚI, FLUXURI INPUT/OUTPUT
## Baza pentru elaborarea organigramei Layer 4
**Data: 31.03.2026**

---

## 1. FURNIZORI EXTERNI SC

### 1.1 Furnizori Resurse Tehnologice

| Furnizor | Ce primim (input) | Natură | Interfață SC (cine primește) |
|---|---|---|---|
| **Anthropic** | API Claude (procesare AI) | Resursă | MAA, toți agenții via Claude |
| **Neon.tech** | PostgreSQL hosting | Resursă | DPA, BDA |
| **Vercel** | Hosting/deployment web | Resursă | DPA |
| **Docker** | Runtime containere | Resursă | DPA |
| **GitHub** | Repository cod, versionare | Resursă | EMA, FDA, BDA |
| **npm/Node.js** | Runtime + pachete software | Resursă | FDA, BDA |
| **Resend** | Serviciu email tranzacțional | Resursă | SOA, CSSA, BCA |
| **Stripe** | Procesare plăți | Resursă | BCA |
| **Oblio.eu** | e-Factura RO | Resursă | BCA |
| **Sentry** | Monitoring erori | Resursă | MOA, DPA |
| **ntfy.sh** | Notificări push | Resursă | COG, MOA |
| **Google** | OAuth autentificare | Resursă | SA, BDA |
| **LinkedIn** | OAuth autentificare | Resursă | SA, BDA |
| **Registrar domeniu** | jobgrade.ro (DNS, SSL) | Resursă | DPA |

### 1.2 Furnizori Resurse Umane/Expertize

| Furnizor | Ce primim (input) | Natură | Interfață SC (cine primește) |
|---|---|---|---|
| **Owner (Liviu)** | Viziune, direcție strategică, decizii, capital, materiale specializate | Decizie + Cunoaștere + Resursă | COG |
| **DPO extern** | Ghidare conformitate GDPR | Cunoaștere + Serviciu | CJA, CAA |
| **Jurist extern** | Validare juridică documente | Cunoaștere + Serviciu | CJA |
| **Auditor extern** | Certificare AI Act | Serviciu + Livrabil | CAA, CJA |
| **Psihometrician (viitor)** | Materiale evaluare, chestionare | Cunoaștere | Layer 2 (consultanți) |

### 1.3 Furnizori Informații/Cunoaștere

| Furnizor | Ce primim (input) | Natură | Interfață SC (cine primește) |
|---|---|---|---|
| **ONRC** | Date firme RO | Informație | RDA |
| **Eurostat** | Statistici angajare UE | Informație | RDA, STA |
| **Asociații patronale** | Date piață, best practices | Informație + Cunoaștere | RDA, CIA |
| **Monitorul Oficial** | Legislație nouă | Informație | CJA, MKA |
| **EUR-Lex** | Legislație europeană | Informație | CJA |
| **ANAF/ITM/ANSPDCP** | Reglementări, ghiduri | Informație + Cunoaștere | CJA, BCA, CAA |
| **Surse piață HR** | Benchmarking salarial, tendințe | Informație | CIA, RDA, MKA |
| **Competitori** | Produse, prețuri, funcționalități (OSINT) | Informație | CIA, CCIA |
| **Literatura de specialitate** | Hawkins, Kotler, Seligman, etc. | Cunoaștere | Layer 2 (consultanți), CÂMP |

---

## 2. CLIENȚI EXTERNI SC

### 2.1 Clienți Direcți (cui livrăm)

| Client | Ce livrăm (output) | Natură | Interfață SC (cine livrează) |
|---|---|---|---|
| **Owner** | Rapoarte zilnice, propuneri, business plan, notificări, alerte | Agregat + Livrabil + Decizie | COG |
| **Clienți B2B** (firme) | Acces platformă, evaluare posturi, grile salariale, rapoarte conformitate EU, consultanță HR AI | Serviciu + Livrabil | HR_COUNSELOR, SOA, CSSA, CSA |
| **Clienți B2C** (indivizi) | Consiliere, profilare, dezvoltare personală/profesională | Serviciu | Călăuza, Profiler, Consilieri (viitor) |
| **Angajații clienților B2B** | Portal cereri Art. 7, informații salariale, rapoarte individuale | Livrabil + Informație | Platformă (self-service) |

### 2.2 Clienți Instituționali (obligații legale)

| Client | Ce livrăm (output) | Natură | Interfață SC (cine livrează) |
|---|---|---|---|
| **ANSPDCP** (protecție date) | Registru Art. 30, notificări breach, DPIA | Livrabil (compliance) | CJA, CAA |
| **ANAF** (fiscal) | Declarații fiscale, e-Facturi | Livrabil (fiscal) | BCA |
| **ITM** (muncă) | Conformitate Codul Muncii | Livrabil (compliance) | CJA |
| **Autoritate AI Act** | Documentație tehnică, audit conformitate | Livrabil (compliance) | CJA, CAA, DOA |

### 2.3 Clienți Indirecti (piață)

| Client | Ce livrăm (output) | Natură | Interfață SC (cine livrează) |
|---|---|---|---|
| **Piața/Comunitate** | Conținut educativ, awareness Directiva EU | Cunoaștere (marketing organic) | ACA, CMA, CWA |
| **Parteneri potențiali** | Propuneri parteneriat, materiale co-branding | Livrabil + Informație | SOA, COCSA |
| **Candidați (recrutare viitoare)** | Employer branding, imagine companie | Informație | ACA, CMA |

---

## 3. NATURA INPUTURILOR/OUTPUTURILOR — CLASIFICARE

| Natură | Simbol | Descriere | Exemplu |
|---|---|---|---|
| **Informație** | ℹ️ | Date brute, neprocesate | Date ONRC, cerere client |
| **Cunoaștere** | 🧠 | Informație procesată, cu sens | Insight research, analiză piață |
| **Agregat** | 📊 | Mai multe cunoștințe sintetizate | Raport segmentare, profil complet |
| **Livrabil** | 📄 | Produs finit, gata de utilizat | Contract, manual, raport PDF |
| **Serviciu** | 🤝 | Interacțiune continuă | Consultanță, suport, evaluare live |
| **Decizie** | ⚖️ | Input care schimbă direcția | Aprobare Owner, strategie COG |
| **Feedback** | 🔄 | Reacție la output anterior | Satisfacție, bug, reclamație |
| **Resursă** | ⚡ | Capacitate de procesare | API, hosting, bani, credite |

---

## 4. LANȚUL INTERN — FURNIZOR INTERN → CLIENT INTERN

### 4.1 Flux principal: De la idee la livrare client B2B

```
OWNER (Decizie: "construim JobGrade")
  ↓ Decizie
COG (procesează → strategie)
  ↓ Agregat (strategie + obiective)
COA + COCSA (procesează → planuri tehnic + business)
  │
  ├── COA → Agregat (roadmap tehnic)
  │   ↓
  │   PMA (procesează → specificații produs)
  │   ↓ Livrabil (user stories, acceptance criteria)
  │   EMA (procesează → task-uri dezvoltare)
  │   ↓ Livrabil (task assignments)
  │   FDA + BDA + DEA + MAA (procesează → cod)
  │   ↓ Livrabil (features implementate)
  │   QLA → QAA + SQA (procesează → teste)
  │   ↓ Livrabil (quality gate pass/fail)
  │   DPA (procesează → deployment)
  │   ↓ Livrabil (platformă live)
  │
  └── COCSA → Agregat (plan go-to-market)
      ↓
      Marketing: ACA + CMA + CWA + MKA
      ↓ Livrabil (conținut, campanii, awareness)
      Vânzări: SOA
      ↓ Serviciu (outreach, demo, onboarding)
      Customer: CSSA → CSA
      ↓ Serviciu (suport, retenție)
      Billing: BCA
      ↓ Livrabil (facturi, încasări)
```

### 4.2 Flux suport: Cerere cunoaștere

```
ORICE AGENT L4 (Informație: "am nevoie de ajutor")
  ↓ cerere
DEPARTAMENT SUPORT L2 (procesează → triaj)
  ↓ cunoaștere calibrată
AGENTUL SOLICITANT (primește → aplică)
  ↓ output îmbunătățit
CLIENTUL (intern sau extern)
```

### 4.3 Flux conformitate: Legal + Compliance

```
SURSE EXTERNE (Informație: legislație nouă)
  ↓
CJA (procesează → interpretare)
  ↓ Cunoaștere (ce trebuie făcut)
CAA (procesează → checklist compliance)
  ↓ Livrabil (plan conformitate)
DEPARTAMENTE AFECTATE (implementează)
  ↓ Feedback (status implementare)
CJA + CAA (verifică → raportează)
  ↓ Livrabil (raport conformitate)
AUTORITĂȚI (primesc raportul)
```

### 4.4 Flux financiar

```
CLIENT (plătește)
  ↓ Resursă (bani)
BCA (procesează → reconciliere)
  ↓ Livrabil (factură, confirmare)
COAFin (monitorizează → optimizare costuri)
  ↓ Agregat (raport financiar)
COG (decidează → alocare buget)
  ↓ Decizie
DEPARTAMENTE (primesc buget)

FURNIZORI EXTERNI (livrează servicii)
  ↓ Resursă (API, hosting, etc.)
BCA / DPA (plătește → gestionează)
  ↓ Livrabil (factură plătită)
```

### 4.5 Flux cunoaștere nocturn (automat)

```
TOȚI AGENȚII (generează → KB entries)
  ↓ Informație
PROPAGARE (02:00) → distribuie bottom-up
  ↓ Informație (raw)
DISTILARE (02:30) → manageri procesează
  ↓ Cunoaștere (puzzle-uri)
REFLECȚIE (03:00) → auto-observare
  ↓ Cunoaștere (insight-uri, lacune)
SENTINEL (03:30) → semnale slabe
  ↓ Agregat (alerte)
CROSS-POLLINATION (04:00) → serendipitate
  ↓ Cunoaștere (conexiuni noi)
RAPORT OWNER (07:00)
  ↓ Agregat (raport zilnic)
OWNER (primește pe telefon)
```

---

## 5. INTERFEȚE — POZIȚII CARE GESTIONEAZĂ GRANIȚELE

### 5.1 Interfațe cu furnizori externi

| Furnizor extern | Interfață SC | Ce gestionează |
|---|---|---|
| Furnizori tech (Anthropic, Neon, etc.) | **DPA** + **BCA** | DPA: integrare tehnică. BCA: plăți, contracte |
| Owner | **COG** | Strategie, decizii, direcție |
| Furnizori info (ONRC, Eurostat) | **RDA** + **CIA** | Research, colectare date |
| Furnizori legislativi (MO, EUR-Lex) | **CJA** + **MKA** | Monitorizare, interpretare |
| Furnizori servicii (DPO, jurist, auditor) | **CJA** + **CAA** | Coordonare, validare |

### 5.2 Interfețe cu clienți externi

| Client extern | Interfață SC | Ce gestionează |
|---|---|---|
| Owner | **COG** | Rapoarte, propuneri, notificări |
| Clienți B2B | **SOA** (vânzare) → **CSSA** (relație) → **CSA** (suport) → **HR_COUNSELOR** (consultanță) | Ciclu complet client |
| Clienți B2C (viitor) | **Profiler** → **Călăuza** → **Consilieri** | Ciclu complet client |
| Autoritățile | **CJA** + **CAA** + **BCA** | Raportare, conformitate |
| Piața | **ACA** + **CMA** + **CWA** | Marketing, awareness |

---

## 6. GAPS IDENTIFICATE (poziții/funcțiuni lipsă)

Pe baza listării de mai sus, funcțiuni care lipsesc în organigrama actuală:

| Gap | Ce lipsește | De ce e nevoie | Propunere |
|---|---|---|---|
| **Manager Marketing** | Coordonator ACA+CMA+CWA+MKA | 4 agenți fără manager = fără prioritizare | DMA sub COCSA |
| **Manager Vânzări** | Coordonator SOA+BCA+CDIA | Pipeline, target-uri, forecast | DVA sub COCSA |
| **HR Operațional** | Administrare personal intern (când crește echipa umană) | Recrutare, contracte, admin | HRA sub COCSA (viitor) |
| **Contabilitate** | Evidență contabilă, raportare financiară | BCA facturează dar nu face contabilitate completă | FCA sub COCSA (viitor) |
| **Manager Operațiuni IT** | Coordonator ISA+MOA+IRA+MDA | 4 agenți ops fără manager | OMA sub COCSA |
| **Interfață Profiler/Călăuza** | Client-facing B2C | B2C planificat dar fără poziții create | Sub COCSA (la dezvoltare B2C) |

---

## 7. PRINCIPIU VALIDARE COMPLETITUDINE

```
Pentru fiecare FURNIZOR EXTERN:
  ✓ Există o INTERFAȚĂ în SC care primește inputul?
  ✓ Interfața are ATRIBUȚII definite pentru procesare?
  ✓ Interfața are SKILLS necesare?
  ✓ Outputul procesat are un CLIENT INTERN identificat?

Pentru fiecare CLIENT EXTERN:
  ✓ Există o INTERFAȚĂ în SC care livrează outputul?
  ✓ Interfața primește input de la un FURNIZOR INTERN?
  ✓ Lanțul intern e complet (fără întreruperi)?

Pentru fiecare POZIȚIE:
  ✓ Primește input de la cine?
  ✓ Livrează output cui?
  ✓ Ce natură are inputul/outputul?
  ✓ Ce atribuții acoperă procesarea?
  ✓ Ce skills susțin atribuțiile?

Dacă orice întrebare nu are răspuns → GAP → poziție/funcțiune lipsă
```
