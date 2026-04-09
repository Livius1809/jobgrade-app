# Evaluarea impactului asupra protecției datelor (DPIA)

**Conform Art. 35 din Regulamentul (UE) 2016/679 (GDPR)**
**Ghid ANSPDCP și Ghidurile WP29 (WP 248 rev.01)**

---

**Operator:** Psihobusiness Consulting SRL
**CIF:** RO15790994
**Sediu:** Str. Viitorului nr. 20, Roșu, Ilfov, cod poștal 077042
**Platforma:** JobGrade (jobgrade.ro)
**Versiune document:** 0.1 (DRAFT — necesită revizuire DPO)
**Data întocmirii:** 08.04.2026
**Responsabil document:** Liviu Stroie (persoană de contact GDPR)
**Status:** AI draft — BUILD-005 aprobat. Urmează revizuire DPO.

---

## Cuprins

1. [Descrierea prelucrării](#1-descrierea-prelucrării)
2. [Necesitatea și proporționalitatea](#2-necesitatea-și-proporționalitatea)
3. [Riscuri pentru persoanele vizate](#3-riscuri-pentru-persoanele-vizate)
4. [Măsuri de atenuare](#4-măsuri-de-atenuare)
5. [Evaluarea riscurilor reziduale](#5-evaluarea-riscurilor-reziduale)
6. [Consultare DPO](#6-consultare-dpo)
7. [Decizia](#7-decizia)

---

## 1. Descrierea prelucrării

### 1.1 Contextul și motivul evaluării

Platforma JobGrade oferă două categorii de servicii care implică prelucrări de date cu risc potențial ridicat, conform criteriilor ANSPDCP/WP29 (Ghidurile WP 248 rev.01):

- **B2B:** evaluare și ierarhizare posturi, analiză salarială, conformitate cu Directiva EU 2023/970 privind transparența salarială;
- **B2C (planificat):** profilare psihometrică individuală, dezvoltare personală și profesională prin agenți AI conversaționali.

**Criterii de risc ridicat îndeplinite (WP 248, secțiunea III.B):**

| Nr. | Criteriu WP29 | Aplicabilitate JobGrade |
|-----|---------------|------------------------|
| 1 | Evaluare/Scorare (inclusiv profilare) | DA — scorare posturi pe 6 criterii (B2B); profilare psihometrică Herrmann, VIA, Hawkins (B2C) |
| 2 | Luare automată de decizii cu efecte juridice/semnificative | PARȚIAL — AI propune scoruri, decizia finală este umană (comitet evaluare / facilitator) |
| 3 | Monitorizare sistematică | DA — B2C: SafetyMonitor monitorizează pattern-uri DSM-5, Profiler shadow, Evolution Engine |
| 4 | Date sensibile sau cu caracter extrem de personal | DA — B2C: date potențial de sănătate mentală (SafetyMonitor); profiluri psihologice |
| 5 | Date prelucrate la scară largă | POTENȚIAL — pe măsura scalării (target: zeci de companii B2B, mii de utilizatori B2C) |
| 7 | Tehnologie inovatoare | DA — modele LLM (Claude/Anthropic), agenți AI autonomi, profilare adaptivă |
| 9 | Persoane vulnerabile | DA — B2C: persoane în situații de criză existențială, căutare de sine |

Conform regulii WP29 (două sau mai multe criterii = DPIA obligatorie), evaluarea de impact este **obligatorie**.

### 1.2 Natura, scopul, contextul și finalitățile prelucrării

#### A. Modul B2B — Evaluare și ierarhizare posturi

**Ce date se prelucrează:**

| Categorie | Date specifice | Natura datelor |
|-----------|---------------|----------------|
| Cont utilizator | Email, prenume, nume, funcție, parolă (hash bcrypt) | Date de identificare |
| Profil companie | Denumire, CUI, adresă, industrie, MVV | Date persoană juridică |
| Fișe de post | Titlu, responsabilități, cerințe, descriere, analiză AI | Date profesionale (indirect personale) |
| Evaluări posturi | Scoruri pe 6 criterii, justificări, voturi, decizii, grade | Date profesionale |
| Stat de plată (pseudonimizat) | Cod angajat, salariu, sporuri, bonusuri, gen, departament, orașul, studii | Date personale pseudonimizate — posibilă re-identificare |
| Rapoarte pay gap | Indicatori agregați pe gen, status, planuri acțiune | Date agregate — posibilă re-identificare în grupuri mici |
| Cereri Art. 7 | Email angajat, detalii cerere transparență salarială | Date personale directe |
| Conversații AI | Prompt-uri și răspunsuri (pot conține date organizaționale) | Date potențial personale |

**De la cine:**
- Utilizatori platformă (angajați ai companiei client: COMPANY_ADMIN, OWNER, FACILITATOR, REPRESENTATIVE)
- Angajați ai companiei client (indirect, prin stat de plată pseudonimizat și fișe de post)

**Scopul:**
- Evaluarea și ierarhizarea posturilor conform metodologiei cu 6 criterii
- Calculul gradelor salariale și conformitatea cu Directiva EU 2023/970
- Analiza pay gap pe bază de gen
- Generare analize AI (fișe de post, anunțuri recrutare, KPI)

**Baza legală:**
- Art. 6(1)(b) GDPR — executarea contractului B2B
- Art. 6(1)(c) GDPR — obligație legală (Directiva EU 2023/970, legislație fiscală)
- Art. 6(1)(f) GDPR — interes legitim (securitate platformă, îmbunătățire servicii)

#### B. Modul B2C — Dezvoltare personală și profesională (planificat)

**Ce date se prelucrează:**

| Categorie | Date specifice | Natura datelor |
|-----------|---------------|----------------|
| Cont B2C | Email, pseudonim (obligatoriu), alias | Date de identificare — pseudonimizate by design |
| Profil psihometric | Herrmann (dominanțe cerebrale), VIA (virtuți/puncte forte), Hawkins (nivel conștiință) | **Date cu caracter extrem de personal** |
| Dialoguri cu agenți | Conversații cu Călăuza, Profiler, agenți per card | Date sensibile potențial |
| Jurnal personal | Însemnări, reflecții | Date cu caracter extrem de personal |
| SafetyMonitor triggers | Pattern-uri DSM-5 detectate, nivel alertă, acțiuni | **Date potențial de sănătate mentală** — Art. 9 GDPR |
| CV și date carieră | CV upload, fișă post, matching, benchmark | Date profesionale |
| Comunități | Participare, interacțiuni sub pseudonim | Date comportamentale |

**De la cine:**
- Persoane fizice (utilizatori B2C) — inclusiv persoane potențial vulnerabile (căutare de sine, criză existențială)

**Scopul:**
- Ghidare dialog-centrică pentru dezvoltare personală și profesională
- Profilare psihometrică pe baze validate (Herrmann, VIA-IS, Hawkins)
- Matching bilateral B2B ↔ B2C (recrutare anonimizată)
- Monitorizare siguranță psihologică (SafetyMonitor)

**Baza legală:**
- Art. 6(1)(b) GDPR — executarea contractului B2C (abonament)
- Art. 6(1)(a) GDPR — consimțământ explicit pentru profilarea psihometrică
- Art. 9(2)(a) GDPR — consimțământ explicit pentru categorii speciale (date sănătate mentală, dacă sunt colectate prin SafetyMonitor)

[DPO: Validare necesară — calificarea datelor SafetyMonitor ca „date privind sănătatea" conform Art. 9 GDPR. Dacă pattern-urile DSM-5 detectate constituie date de sănătate, este necesar consimțământ explicit separat conform Art. 9(2)(a).]

#### C. Componenta AI — Transfer internațional

**Motor AI:** Anthropic PBC (Claude Sonnet 4), San Francisco, SUA

**Date transferate UE → SUA:**
- Prompt-uri (pot conține date organizaționale, fișe de post, descrieri companie)
- NU se transferă: nume angajați, CNP, salarii individuale identificabile, date B2C profil psihologic

**Temei juridic transfer:**
- Clauze Contractuale Standard (SCC) conform Decizia (UE) 2021/914, Art. 46(2)(c) GDPR
- DPA cu Anthropic (prin ToS API)
- Transfer Impact Assessment (TIA) realizat — vezi `docs/gdpr/tia-anthropic.md`

**Garanții Anthropic:**
- Zero data retention pentru antrenare modele (confirmat ToS API)
- Procesare în timp real, fără persistare
- Criptare TLS 1.2+ pe toate apelurile API

### 1.3 Durata retenției

Conform termenelor aprobate (02.04.2026), detaliate integral în Registrul Art. 30 (`docs/gdpr/registrul-art30.md`):

| Categorie | Termen | Baza |
|-----------|--------|------|
| Cont utilizator B2B | Durata contract + 3 ani | Prescripție comercială |
| Fișe de post și evaluări | Durata contract + 5 ani | Codul Muncii + transparență salarială |
| Stat de plată (per client) | 24 luni sau terminare contract | Interes legitim |
| Stat de plată (agregate anonime, min 5/celulă) | Fără limită | Recital 26 GDPR — nu sunt date personale |
| Rapoarte pay gap | Durata contract + 5 ani | Directiva EU 2023/970 |
| Conversații AI (text brut) | 6 luni | Minimizare |
| Date facturare | 10 ani | Art. 25 Cod Fiscal |
| Cont B2C | Pseudonim default; notificare la 24 luni inactivitate; ștergere la 36 luni | Privacy by design |
| Profil psihologic B2C | Durata abonament + 6 luni | Separat de identitate reală |
| Facturare B2C | 10 ani (strat separat) | Obligație fiscală |

### 1.4 Fluxul de date — schemă simplificată

```
┌──────────────────────────────────────────────────────────────┐
│                        UTILIZATOR                            │
│        B2B (angajat client)    │    B2C (persoană fizică)    │
└────────────┬──────────────────────────────────┬──────────────┘
             │ HTTPS/TLS                        │ HTTPS/TLS
             ▼                                  ▼
┌──────────────────────────────────────────────────────────────┐
│              VERCEL (Frankfurt, UE — eu-central-1)           │
│              Next.js App + API Routes + RBAC                 │
└────────────┬──────────┬─────────────────────┬────────────────┘
             │          │                     │
             ▼          ▼                     ▼
    ┌──────────┐  ┌──────────────┐   ┌────────────────┐
    │ Neon.tech│  │ Anthropic API│   │ Stripe / Resend│
    │ (UE)     │  │ (SUA)        │   │ (plăți/email)  │
    │ AES-256  │  │ SCC + DPA    │   │ PCI-DSS / DPA  │
    └──────────┘  └──────────────┘   └────────────────┘
```

---

## 2. Necesitatea și proporționalitatea

### 2.1 De ce este necesară prelucrarea

**B2B — Evaluare posturi:**
Evaluarea și ierarhizarea posturilor este serviciul principal al platformei. Fără prelucrarea datelor din fișele de post, a scorurilor de evaluare și a datelor salariale, platforma nu poate funcționa. Conformitatea cu Directiva EU 2023/970 privind transparența salarială impune explicit analiza pe bază de gen, ceea ce necesită prelucrarea datelor demografice (gen) alături de cele salariale.

**B2C — Dezvoltare personală:**
Profilarea psihometrică (Herrmann, VIA, Hawkins) este fundamentul metodologiei de ghidare. Fără aceste date, platforma nu poate adapta conversațiile, nu poate oferi recomandări relevante și nu poate măsura progresul utilizatorului. SafetyMonitor este o necesitate de siguranță — protejează persoanele vulnerabile de potențiale efecte adverse ale interacțiunii cu AI.

**AI (Anthropic):**
Utilizarea modelelor LLM este necesară pentru: analiza și structurarea fișelor de post, generarea de rapoarte, conversațiile ghidate B2C. Alternativele (procesare manuală) ar fi impracticabile ca timp și cost, și ar elimina propunerea de valoare a platformei.

### 2.2 Principiul minimizării datelor

| Domeniu | Măsura de minimizare |
|---------|---------------------|
| Stat de plată B2B | Pseudonimizare: cod angajat, fără nume/CNP |
| Agregate statistice | Prag minim 5 angajați/celulă pentru rapoarte (evitare re-identificare) |
| Prompt-uri AI | NU se trimit: nume, CNP, salarii individuale identificabile, date personale directe |
| B2C | Pseudonim obligatoriu; email și date fiscale pe strat separat de profilul psihologic |
| Cookies | Exclusiv cookies funcționale — fără tracking, marketing, analytics |
| Conversații AI brut | Retenție 6 luni, apoi ștergere; cunoașterea utilă se distilează anonim |
| SafetyMonitor | Pattern-uri detectate, nu diagnostic clinic; nu se stochează concluzii medicale |

### 2.3 Alternative evaluate

| Alternativă | Evaluare | Decizie |
|-------------|----------|---------|
| Procesare manuală fără AI | Impracticabilă: timpul de evaluare crește de 10-20x; pierde avantajul competitiv | Respinsă |
| AI on-premise (fără transfer SUA) | Modele locale nu ating calitatea Claude pentru limbajul natural; cost hardware prohibitiv | Respinsă — se reevaluează anual |
| B2C fără profilare | Pierde valoarea serviciului; ghidarea devine generică și ineficientă | Respinsă |
| B2C fără SafetyMonitor | **Periculos** — persoane vulnerabile ar putea fi expuse fără protecție | Respinsă din motive etice și de siguranță |
| Stat de plată cu date complete (nume, CNP) | Adaugă risc fără beneficiu — evaluarea e per post, nu per persoană | Respinsă — pseudonimizare menținută |

### 2.4 Proporționalitate

Prelucrările sunt proporționale cu scopurile urmărite:
- **B2B:** datele prelucrate sunt necesare și suficiente pentru evaluarea posturilor și conformitatea legală;
- **B2C:** pseudonimizarea by design, separarea straturilor (profil psihologic ≠ identitate reală ≠ date fiscale) limitează impactul unei eventuale breșe;
- **AI:** minimizarea datelor în prompt-uri și absența persistării la Anthropic reduc expunerea la minimum necesar.

---

## 3. Riscuri pentru persoanele vizate

### 3.1 Matrice de evaluare a riscurilor

**Scală probabilitate:** Scăzută (1) / Medie (2) / Ridicată (3) / Foarte ridicată (4)
**Scală impact:** Neglijabil (1) / Limitat (2) / Semnificativ (3) / Maxim (4)
**Nivel risc = Probabilitate × Impact:** Scăzut (1-4) / Mediu (5-8) / Ridicat (9-12) / Critic (13-16)

### 3.2 Riscuri identificate

#### R-01: Acces neautorizat la date salariale pseudonimizate (B2B)

| Parametru | Valoare |
|-----------|---------|
| **Persoane vizate** | Angajați ai companiei client |
| **Descriere risc** | Un atacator obține acces la baza de date și corelează gen + salariu + departament + oraș, re-identificând angajați |
| **Probabilitate** | Medie (2) — infrastructură cloud gestionată, dar nu există criptare la nivel de câmp |
| **Impact** | Semnificativ (3) — discriminare pe bază salarială, prejudiciu profesional |
| **Nivel risc** | **6 — Mediu** |

#### R-02: Corelarea pseudonim ↔ identitate reală B2C

| Parametru | Valoare |
|-----------|---------|
| **Persoane vizate** | Utilizatori B2C |
| **Descriere risc** | Acces la DB permite corelarea aliasului B2C cu email-ul și, dacă utilizatorul a solicitat factură, cu datele reale de identitate. Profilul psihologic devine identificabil |
| **Probabilitate** | Medie (2) — separare logică, dar nu fizică, între straturi |
| **Impact** | Maxim (4) — expunere profil psihometric (Herrmann, Hawkins, VIA) + date potențiale de sănătate mentală |
| **Nivel risc** | **8 — Mediu spre Ridicat** |

[DPO: Evaluare necesară — separarea fizică a straturilor (profil psihologic vs. identitate) este suficientă sau se impune criptare la nivel de câmp cu chei separate?]

#### R-03: Utilizarea datelor de către Anthropic sau autorități SUA

| Parametru | Valoare |
|-----------|---------|
| **Persoane vizate** | Toți utilizatorii ale căror date tranzitează prin Anthropic API |
| **Descriere risc** | FISA Section 702 sau Cloud Act — autorități SUA solicită acces la datele procesate de Anthropic |
| **Probabilitate** | Scăzută (1) — date fără interes pentru servicii de informații; volum mic; Anthropic nu persistă |
| **Impact** | Limitat (2) — datele transferate nu conțin date personale directe; sunt predominant descrieri de posturi |
| **Nivel risc** | **2 — Scăzut** |

#### R-04: Decizii discriminatorii bazate pe evaluare AI (B2B)

| Parametru | Valoare |
|-----------|---------|
| **Persoane vizate** | Angajați ai companiei client (indirect — prin corelare post ↔ titular) |
| **Descriere risc** | AI-ul propune scoruri biasate care duc la ierarhizare inechitabilă a posturilor; compania folosește rezultatele pentru decizii salariale discriminatorii |
| **Probabilitate** | Medie (2) — modelele LLM pot avea bias-uri implicite |
| **Impact** | Semnificativ (3) — impact salarial direct; potențial discriminare pe gen |
| **Nivel risc** | **6 — Mediu** |

#### R-05: Impactul psihologic negativ al interacțiunii cu AI (B2C)

| Parametru | Valoare |
|-----------|---------|
| **Persoane vizate** | Utilizatori B2C, în special persoane vulnerabile |
| **Descriere risc** | Interacțiunea cu agenții AI poate induce: dependență emoțională, bypass spiritual (credința că AI-ul poate ghida spiritual), agravarea stării în cazul persoanelor cu probleme de sănătate mentală preexistente |
| **Probabilitate** | Medie (2) — categoria de utilizatori include persoane în căutare de sine, potențial vulnerabile |
| **Impact** | Maxim (4) — prejudiciu asupra sănătății mentale; în cazuri extreme, risc vital |
| **Nivel risc** | **8 — Mediu spre Ridicat** |

#### R-06: Breșă de securitate cu expunere date SafetyMonitor (B2C)

| Parametru | Valoare |
|-----------|---------|
| **Persoane vizate** | Utilizatori B2C pentru care SafetyMonitor a detectat semnale |
| **Descriere risc** | Expunerea trigger-urilor SafetyMonitor (pattern-uri DSM-5, nivel alertă RIDICAT/CRITIC) ar dezvălui informații despre starea de sănătate mentală a utilizatorilor |
| **Probabilitate** | Scăzută (1) — aceste date sunt stocate izolat, acces restricționat |
| **Impact** | Maxim (4) — stigmatizare, discriminare, prejudiciu psihologic |
| **Nivel risc** | **4 — Scăzut spre Mediu** |

#### R-07: Poluarea profilului B2C prin date false/contaminate

| Parametru | Valoare |
|-----------|---------|
| **Persoane vizate** | Utilizatori B2C |
| **Descriere risc** | Proxy questions (întrebări despre alte persoane), account sharing, răspunsuri false la chestionare poluează profilul psihometric, ducând la recomandări greșite |
| **Probabilitate** | Medie (2) — comportament natural al unor utilizatori |
| **Impact** | Limitat (2) — recomandări inadecvate, dar fără consecințe juridice directe; Profiler shadow detectează incongruențe |
| **Nivel risc** | **4 — Scăzut** |

#### R-08: Prompt injection — manipularea agenților AI

| Parametru | Valoare |
|-----------|---------|
| **Persoane vizate** | Toți utilizatorii platformei |
| **Descriere risc** | Un utilizator malițios injectează instrucțiuni în conversație pentru a deturna comportamentul agentului AI, a extrage cunoaștere confidențială sau a accesa date ale altor utilizatori |
| **Probabilitate** | Medie (2) — vectorul este cunoscut; există protecții, dar rămân gap-uri |
| **Impact** | Semnificativ (3) — expunere date, extracție metodologie, compromiterea integrității evaluărilor |
| **Nivel risc** | **6 — Mediu** |

#### R-09: Hallucination AI — informații false în evaluări sau recomandări

| Parametru | Valoare |
|-----------|---------|
| **Persoane vizate** | Angajații clienților B2B (indirect), utilizatori B2C |
| **Descriere risc** | AI-ul generează informații false (legislație inventată, scoruri inconsistente, recomandări periculoase) care sunt luate ca valide |
| **Probabilitate** | Medie (2) — hallucination este o limitare cunoscută a modelelor LLM |
| **Impact** | Semnificativ (3) — decizii bazate pe informații false; potențial prejudiciu profesional sau psihologic |
| **Nivel risc** | **6 — Mediu** |

#### R-10: Retenție date peste termenele GDPR

| Parametru | Valoare |
|-----------|---------|
| **Persoane vizate** | Toți utilizatorii |
| **Descriere risc** | Absența unui mecanism automat de ștergere la expirarea termenelor de retenție |
| **Probabilitate** | Ridicată (3) — nu există încă cron de purge automat |
| **Impact** | Limitat (2) — încălcarea principiului limitării stocării; risc sancțiune ANSPDCP |
| **Nivel risc** | **6 — Mediu** |

[DPO: Evaluare necesară — prioritizarea implementării cron-ului de purge automat. Propunem termen: înainte de lansarea publică.]

---

## 4. Măsuri de atenuare

### 4.1 Măsuri per risc identificat

#### R-01: Acces neautorizat la date salariale

| Măsură | Status | Eficacitate |
|--------|--------|-------------|
| Izolare multi-tenant (Tenant ID, cascade delete) | ✅ Implementat | Ridicată |
| Pseudonimizare stat de plată (cod angajat, fără nume/CNP) | ✅ Implementat | Ridicată |
| RBAC pe 5 niveluri (acces stat de plată: doar COMPANY_ADMIN, OWNER) | ✅ Implementat | Ridicată |
| Criptare la repaus (Neon.tech AES-256) | ✅ Implementat | Ridicată |
| Criptare în tranzit (TLS 1.2+) | ✅ Implementat | Ridicată |
| Audit trail pe operațiuni critice | ✅ Implementat | Medie |
| Criptare la nivel de câmp pe date salariale | ❌ Neimplementat | Planificat |
| Prag minim 5 angajați/celulă pentru rapoarte | ✅ Implementat | Ridicată |

#### R-02: Corelarea pseudonim ↔ identitate B2C

| Măsură | Status | Eficacitate |
|--------|--------|-------------|
| Pseudonim obligatoriu (privacy by design, Art. 25 GDPR) | ✅ Implementat | Ridicată |
| Două straturi separate: profil psihologic ≠ identitate | ✅ Implementat (logic) | Medie |
| Date fiscale separate de profilul psihologic | ✅ Planificat | Medie |
| Autentificare B2C cu JWT (30 zile expiry) | ✅ Implementat | Medie |
| Verificare ownership pe toate rutele B2C | ✅ Implementat | Ridicată |
| Criptare câmpuri sensibile (email, date fiscale) cu cheie separată | ❌ Neimplementat | Planificat |

#### R-03: Utilizarea datelor de către Anthropic/autorități SUA

| Măsură | Status | Eficacitate |
|--------|--------|-------------|
| SCC conform Decizia (UE) 2021/914 | ✅ Implementat | Medie (conform Schrems II) |
| DPA cu Anthropic (ToS API) | ✅ Implementat | Medie |
| TIA realizat (`docs/gdpr/tia-anthropic.md`) | ✅ Implementat | Medie |
| Zero data retention la Anthropic | ✅ Confirmat ToS | Ridicată |
| Minimizare date în prompt-uri | ✅ Implementat (politică + prompt engineering) | Ridicată |
| Fără date personale directe în prompt-uri | ✅ Implementat (by design) | Ridicată |

#### R-04: Decizii discriminatorii AI (B2B)

| Măsură | Status | Eficacitate |
|--------|--------|-------------|
| AI propune, comitetul uman decide (3 runde consens) | ✅ Implementat | Ridicată |
| Metodologie neutră din perspectiva genului (6 criterii per post, nu per persoană) | ✅ Implementat | Ridicată |
| Prag consens 75% pentru finalizare | ✅ Implementat | Medie |
| Audit trail complet pe voturi și decizii | ✅ Implementat | Medie |
| Override facilitator documentat cu justificare | ✅ Implementat | Medie |
| Supraveghere umană Art. 14 AI Act (2 psihologi acreditați CPR) | ✅ Implementat | Ridicată |
| Validator post-răspuns pentru afirmații factuale AI | ❌ Neimplementat | Planificat |

#### R-05: Impact psihologic negativ B2C

| Măsură | Status | Eficacitate |
|--------|--------|-------------|
| SafetyMonitor cu 4 niveluri (INFORMATIV/MODERAT/RIDICAT/CRITIC) | ✅ Implementat | Ridicată |
| Pattern-uri DSM-5 în safety triggers | ✅ Implementat | Medie |
| Escaladare automată la psiholog la nivel RIDICAT | ✅ Implementat | Ridicată |
| Nivel CRITIC → afișare imediată Telefonul Speranței 0800 801 200 | ✅ Implementat | Ridicată |
| 2 psihologi acreditați CPR în echipă | ✅ Implementat | Ridicată |
| Dosage calibrator (limitare frecvență interacțiuni) | ✅ Implementat | Medie |
| System prompt Călăuza: nu pretinde ghidare spirituală, recomandă călăuze umane | ✅ Implementat | Medie |
| Comunități ÎNCHISE by default, activare doar după calibrare agent AI | ✅ Implementat | Medie |

#### R-06: Breșă securitate date SafetyMonitor

| Măsură | Status | Eficacitate |
|--------|--------|-------------|
| Izolare date SafetyMonitor | ✅ Implementat | Medie |
| Acces restricționat (doar SafetyMonitor + psiholog) | ✅ Implementat | Ridicată |
| Pseudonim B2C pe trigger-uri | ✅ Implementat | Medie |
| Criptare la nivel de câmp pe datele SafetyMonitor | ❌ Neimplementat | Planificat |

#### R-07: Poluare profil B2C

| Măsură | Status | Eficacitate |
|--------|--------|-------------|
| Coherence guard (detectare proxy questions, account sharing) | ✅ Implementat | Medie |
| Profiler shadow (detectare incongruențe multi-sursă) | ✅ Implementat | Medie |
| Quarantine pe date contaminate | ✅ Implementat | Medie |
| Herrmann estimat din dialog, nu doar din test | ✅ Implementat | Medie |

#### R-08: Prompt injection

| Măsură | Status | Eficacitate |
|--------|--------|-------------|
| Prompt injection filter (61 pattern-uri regex, 2 niveluri severitate) | ✅ Implementat pe 8/10 endpoint-uri | Medie |
| Escalation detector (sliding window 20 mesaje, prag scor 5) | ✅ Implementat | Medie |
| L1/L2/L3 layers injectate automat în system prompts | ✅ Implementat | Medie |
| CORS restrictiv (whitelist origins) | ✅ Implementat | Medie |
| Integrare filter pe endpoint-uri noi (B2C cards, HR Counselor) | ❌ Parțial | În curs |

#### R-09: Hallucination AI

| Măsură | Status | Eficacitate |
|--------|--------|-------------|
| Date comerciale hardcodate (commercial-knowledge.ts) | ✅ Implementat | Ridicată — pentru prețuri |
| L3 (cadrul legal) injectat cu legislație concretă | ✅ Implementat | Medie |
| Comitet uman validează scorurile AI | ✅ Implementat (B2B) | Ridicată |
| SafetyMonitor pentru recomandări periculoase (B2C) | ✅ Implementat | Medie |
| Validator post-răspuns pe afirmații factuale | ❌ Neimplementat | Planificat |

#### R-10: Retenție peste termene GDPR

| Măsură | Status | Eficacitate |
|--------|--------|-------------|
| Termene de retenție definite și aprobate | ✅ Implementat (02.04.2026) | Organizatorică |
| Cron de purge automat la expirare | ❌ Neimplementat | Planificat |
| Endpoint DELETE /api/v1/b2c/account | ❌ Neimplementat | Planificat |
| Endpoint GET /api/v1/b2c/my-data (DSAR) | ❌ Neimplementat | Planificat |
| Cascade delete la ștergere tenant (B2B) | ✅ Implementat | Ridicată |

### 4.2 Măsuri tehnice transversale

| Măsură | Descriere | Status |
|--------|-----------|--------|
| Criptare în tranzit | TLS 1.2+ pe toate conexiunile | ✅ |
| Criptare la repaus | Neon.tech AES-256 | ✅ |
| Izolare multi-tenant | Tenant ID cu cascade delete | ✅ |
| RBAC | 5 niveluri (SUPER_ADMIN → REPRESENTATIVE) | ✅ |
| Autentificare | NextAuth v5 + JWT; OAuth Google/LinkedIn | ✅ |
| Hosting UE | Vercel Frankfurt (eu-central-1), Neon.tech UE | ✅ |
| Backup | Neon.tech point-in-time recovery (RPO < 5 min) | ✅ |
| Sanitizare loguri | console.error fără date utilizator (14 fișiere sanitizate) | ✅ |
| Procedură incident | Notificare 48h + asistență ANSPDCP 72h | ✅ Documentat |
| Rate limiting | Redis-backed pe API routes | ❌ Planificat |

### 4.3 Măsuri organizatorice

| Măsură | Descriere | Status |
|--------|-----------|--------|
| 2 psihologi acreditați CPR | Supraveghere umană Art. 14 AI Act; muncă + transporturi; atestat liberă practică | ✅ |
| Registru Art. 30 complet | 17 categorii documentate | ✅ |
| Privacy Policy publicată | `docs/privacy-policy-ro.md` | ✅ |
| DPA template | `docs/gdpr/template-dpa.md` | ✅ |
| TIA Anthropic | `docs/gdpr/tia-anthropic.md` | ✅ |
| Pagina transparență AI | `docs/transparenta-ai-content.md` | ✅ Draft |
| Procedură supraveghere umană Art. 14 | `docs/procedura-supraveghere-umana-art14.md` | ✅ |
| Incident response plan | `docs/incident-response-plan.md` | ✅ |

---

## 5. Evaluarea riscurilor reziduale

### 5.1 Riscuri reziduale după aplicarea măsurilor

| ID Risc | Descriere | Risc inițial | Risc rezidual | Acceptabil? |
|---------|-----------|-------------|---------------|-------------|
| R-01 | Acces neautorizat date salariale | Mediu (6) | **Scăzut (3)** — pseudonimizare + izolare + RBAC + criptare | DA |
| R-02 | Corelarea pseudonim ↔ identitate B2C | Mediu-Ridicat (8) | **Mediu (4)** — pseudonim + 2 straturi; rămâne risc de corelație la nivel DB | CONDIȚIONAT — se reduce la Scăzut după implementarea criptării la nivel de câmp |
| R-03 | Acces autorități SUA la date Anthropic | Scăzut (2) | **Scăzut (1)** — zero retention + minimizare + TIA | DA |
| R-04 | Decizii discriminatorii AI B2B | Mediu (6) | **Scăzut (3)** — comitet uman + 3 runde consens + psihologi | DA |
| R-05 | Impact psihologic negativ B2C | Mediu-Ridicat (8) | **Mediu (4)** — SafetyMonitor + psihologi + dosage calibrator; rămâne risc pentru persoane care nu dezvăluie semnale | CONDIȚIONAT — acceptabil cu monitorizare continuă |
| R-06 | Breșă date SafetyMonitor | Scăzut-Mediu (4) | **Scăzut (2)** — izolare + pseudonim; se reduce suplimentar cu criptare câmp | DA |
| R-07 | Poluare profil B2C | Scăzut (4) | **Scăzut (2)** — coherence guard + Profiler shadow | DA |
| R-08 | Prompt injection | Mediu (6) | **Scăzut-Mediu (4)** — filter + escalation detector; rămân endpoint-uri neacoperite | CONDIȚIONAT — se finalizează acoperirea |
| R-09 | Hallucination AI | Mediu (6) | **Scăzut-Mediu (4)** — comitet uman B2B + SafetyMonitor B2C; lipsește validator post-răspuns | CONDIȚIONAT — se implementează validator |
| R-10 | Retenție peste termene | Mediu (6) | **Mediu (6)** — fără cron de purge, riscul rămâne | **NU** — necesită implementare urgentă |

### 5.2 Condiții pentru acceptarea riscurilor reziduale

Riscurile marcate **CONDIȚIONAT** devin acceptabile prin implementarea următoarelor acțiuni, **înainte de lansarea publică:**

1. **R-02:** Implementare criptare la nivel de câmp pe email și date fiscale B2C cu cheie separată de cheia bazei de date;
2. **R-05:** Monitorizare continuă a eficacității SafetyMonitor; revizuire trimestrială a pattern-urilor cu psihologii din echipă;
3. **R-08:** Integrare prompt injection filter pe toate endpoint-urile noi (B2C cards, HR Counselor);
4. **R-09:** Implementare validator post-răspuns pentru afirmații cu numere, date și referințe legislative;
5. **R-10:** Implementare cron de purge automat + endpoint DELETE pentru cont B2C + endpoint GET pentru DSAR.

[DPO: Validare necesară — lista de condiții este suficientă? Există riscuri reziduale neidentificate? Se impune consultare ANSPDCP pentru vreunul dintre riscurile reziduale CONDIȚIONATE?]

---

## 6. Consultare DPO

### 6.1 Spațiu pentru observațiile DPO

[DPO: Acest spațiu este rezervat observațiilor și recomandărilor responsabilului cu protecția datelor. Se solicită în mod specific opinia DPO pe următoarele puncte:]

1. **Calificarea datelor SafetyMonitor:** Pattern-urile DSM-5 detectate de SafetyMonitor constituie „date privind sănătatea" conform Art. 9 GDPR? Dacă da, consimțământul explicit separat conform Art. 9(2)(a) este suficient sau se impune o altă bază legală?

2. **Separarea fizică vs. logică a straturilor B2C:** Separarea logică actuală (profil psihologic vs. identitate vs. date fiscale în aceeași bază de date) este suficientă sau se impune separare fizică (baze de date distincte)?

3. **Necesitatea consultării ANSPDCP:** Conform Art. 36 GDPR, dacă riscul rezidual rămâne ridicat după aplicarea măsurilor, operatorul trebuie să consulte autoritatea de supraveghere. Riscurile reziduale identificate impun consultare prealabilă?

4. **Profilarea B2C și Art. 22 GDPR:** Profilarea psihometrică B2C constituie „decizie individuală automatizată" conform Art. 22? Deși recomandările sunt de natură orientativă (nu produc efecte juridice), platforma poate influența decizii profesionale semnificative (schimbare carieră, antreprenoriat).

5. **Termenul de retenție B2C (36 luni inactivitate):** Este proporțional? Se impune un termen mai scurt?

6. **Conformitatea cu lista ANSPDCP de prelucrări care necesită DPIA:** Verificare că prelucrările descrise sunt aliniate cu lista publicată de ANSPDCP (Decizia nr. 174/2018).

### 6.2 Aviz DPO

**Data avizului:** ___/___/______

**Aviz:**

☐ Favorabil — prelucrarea poate continua conform măsurilor descrise
☐ Favorabil cu observații — prelucrarea poate continua cu implementarea observațiilor de mai jos
☐ Nefavorabil — prelucrarea nu poate continua fără consultare ANSPDCP

**Observații DPO:**

_______________________________________________________________________________

_______________________________________________________________________________

_______________________________________________________________________________

_______________________________________________________________________________

**Semnătura DPO:** ___________________________

---

## 7. Decizia

### 7.1 Opțiuni

Conform Art. 35(7) GDPR și pe baza evaluării de mai sus:

| Opțiune | Descriere | Aplicabilitate |
|---------|-----------|----------------|
| **A — Continuăm prelucrarea** | Riscurile reziduale sunt acceptabile | DA — pentru B2B, după implementarea condițiilor din §5.2 |
| **B — Modificăm prelucrarea** | Adăugăm măsuri suplimentare | DA — pentru B2C, condițiile din §5.2 sunt obligatorii înainte de lansare |
| **C — Consultăm ANSPDCP** | Riscul rezidual rămâne ridicat | De evaluat de DPO — în special pentru profilarea psihometrică B2C cu componenta SafetyMonitor |

### 7.2 Acțiuni obligatorii înainte de lansarea publică

| Nr. | Acțiune | Termen propus | Responsabil |
|-----|---------|---------------|-------------|
| 1 | Cron de purge automat pe termene retenție | Înainte de lansare | Echipa tehnică |
| 2 | Endpoint DELETE /api/v1/b2c/account (right to erasure) | Înainte de lansare | Echipa tehnică |
| 3 | Endpoint GET /api/v1/b2c/my-data (DSAR - Data Subject Access Request) | Înainte de lansare | Echipa tehnică |
| 4 | Criptare la nivel de câmp pe date sensibile B2C | Înainte de lansare | Echipa tehnică |
| 5 | Integrare prompt injection filter pe toate endpoint-urile | Înainte de lansare | Echipa tehnică |
| 6 | Implementare rate limiting pe API routes | Înainte de lansare | Echipa tehnică |
| 7 | Revizuire DPO a prezentei DPIA | Termen: conform calendar DPO | DPO extern |
| 8 | Consimțământ explicit separat pentru profilare psihometrică B2C | Înainte de lansare B2C | Echipa juridică + tehnică |
| 9 | Consimțământ explicit separat pentru SafetyMonitor (dacă DPO confirmă Art. 9) | Înainte de lansare B2C | Echipa juridică + tehnică |
| 10 | Validator post-răspuns AI pentru afirmații factuale | Q3 2026 | Echipa tehnică |

### 7.3 Revizuire periodică

Prezenta DPIA se revizuiește:
- **Obligatoriu:** la orice modificare semnificativă a prelucrărilor (funcționalitate nouă, sub-procesator nou, categorie de date nouă);
- **Periodic:** cel puțin o dată la 12 luni;
- **La cererea DPO sau ANSPDCP;**
- **La lansarea modulului B2C** (revizuire completă a secțiunilor B2C).

---

## Anexe

- **Anexa A:** Registrul prelucrărilor Art. 30 — `docs/gdpr/registrul-art30.md`
- **Anexa B:** Politica de confidențialitate — `docs/gdpr/politica-confidentialitate.md`
- **Anexa C:** Template DPA — `docs/gdpr/template-dpa.md`
- **Anexa D:** Transfer Impact Assessment Anthropic — `docs/gdpr/tia-anthropic.md`
- **Anexa E:** Transparența AI — `docs/transparenta-ai-content.md`
- **Anexa F:** Raport de vulnerabilități — `docs/VULNERABILITY-REPORT.md`
- **Anexa G:** Procedura supraveghere umană Art. 14 — `docs/procedura-supraveghere-umana-art14.md`
- **Anexa H:** Incident Response Plan — `docs/incident-response-plan.md`

---

## Semnături

| Rol | Nume | Data | Semnătura |
|-----|------|------|-----------|
| **Responsabil GDPR / Administrator** | Liviu Stroie | ___/___/______ | ___________________ |
| **DPO** | [DPO: Nume DPO extern] | ___/___/______ | ___________________ |

---

*Prezenta evaluare a impactului asupra protecției datelor a fost întocmită în conformitate cu Art. 35 din Regulamentul (UE) 2016/679 (GDPR), Ghidurile WP29 privind DPIA (WP 248 rev.01), Decizia ANSPDCP nr. 174/2018 privind lista prelucrărilor care necesită DPIA și Regulamentul (UE) 2024/1689 privind Inteligența Artificială (AI Act).*

*Versiune: 0.1 — DRAFT AI, necesită revizuire DPO.*
