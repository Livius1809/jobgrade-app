# Transfer Impact Assessment (TIA) — Anthropic PBC

**Conform cerințelor Schrems II (CJUE C-311/18) și Recomandărilor EDPB 01/2020**

---

**Operator:** Psihobusiness Consulting SRL (RO15790994)  
**Sediu:** Str. Viitorului nr. 20, Roșu, Ilfov, cod poștal 077042  
**Sub-procesator evaluat:** Anthropic PBC  
**Sediu sub-procesator:** San Francisco, California, SUA  
**Data evaluării:** 02.04.2026  
**Evaluator:** Liviu Stroie (persoană de contact GDPR)

---

## 1. Descrierea transferului

### 1.1 Ce date se transferă

Platforma JobGrade utilizează API-ul Anthropic (modelul Claude) pentru:
- Analiza fișelor de post (extragere cerințe, responsabilități)
- Generare anunțuri recrutare
- Analiză sesiuni de evaluare
- Extragere profil companie din date publice
- Conversații cu agenții AI ai platformei

### 1.2 Categorii de date transferate

| Categorie | Exemple | Date personale? |
|---|---|---|
| Descrieri posturi | Titlu, responsabilități, cerințe | Indirect — postul poate fi asociat unui titular |
| Profil companie | Misiune, viziune, valori, industrie | Date persoană juridică — nu sunt date personale |
| Context organizațional | Structura departamentelor, obiective | Indirect |
| Întrebări utilizator | Întrebări despre evaluări, proceduri | Potențial — dacă menționează persoane |

### 1.3 Ce date NU se transferă

- **Niciodată:** nume angajați, CNP, adrese personale, date bancare
- **Niciodată:** salarii individuale cu identificare
- **Niciodată:** date medicale sau biometrice
- **Niciodată:** date B2C profil psihologic (procesare exclusiv UE — planificat)

### 1.4 Volumul transferului

- Estimare: 500-5.000 apeluri API/lună (fază inițială)
- Dimensiune medie prompt: ~2.000 tokeni (~1.500 cuvinte)
- Date personale directe în prompt-uri: **zero** (by design)
- Date personale indirecte: posibil, dar minimizate prin prompt engineering

---

## 2. Cadrul juridic al transferului

### 2.1 Temei juridic

**Clauze Contractuale Standard (SCC)** conform:
- Decizia de punere în aplicare (UE) 2021/914 a Comisiei din 4 iunie 2021
- Art. 46(2)(c) GDPR

Anthropic oferă DPA care include SCC prin Terms of Service API (Secțiunea „Data Processing").

### 2.2 Cadrul juridic în SUA

| Factor | Evaluare | Risc |
|---|---|---|
| FISA Section 702 | Se aplică furnizorilor de servicii electronice din SUA | MEDIU |
| Executive Order 12333 | Colectare în tranzit (bulk surveillance) | SCĂZUT — date criptate |
| Cloud Act | Acces la date stocate de companii US la cererea autorităților | MEDIU |
| EU-US Data Privacy Framework (DPF) | Anthropic participă la DPF? De verificat. | Dacă da: SCĂZUT |
| Executive Order 14086 (oct 2022) | Garanții suplimentare pentru persoane din UE | Atenuare parțială |

### 2.3 Evaluare probabilitate acces guvernamental

**Scăzută**, din următoarele motive:
1. Datele transferate nu conțin informații de interes pentru serviciile de informații (nu sunt comunicații, date financiare sau date de localizare)
2. Volumul de date este mic (o firmă mică din România)
3. Datele sunt predominant despre posturi de muncă, nu despre persoane fizice
4. Anthropic nu stochează datele API pentru antrenare (Terms of Service)
5. Durata stocării la Anthropic este minimă (procesare în timp real, fără persistare)

---

## 3. Măsuri suplimentare implementate

### 3.1 Măsuri tehnice

| Măsură | Descriere | Eficacitate |
|---|---|---|
| **Criptare în tranzit** | TLS 1.2+ pe toate apelurile API | Protecție împotriva interceptării (EO 12333) |
| **Minimizare date** | Prompt-urile nu conțin date personale directe | Reduce impactul unui eventual acces |
| **Pseudonimizare** | Cod angajat în loc de nume; pseudonim B2C | Chiar cu acces, datele nu sunt identificabile |
| **Fără persistare la Anthropic** | API Terms: datele nu sunt reținute pentru antrenare | Limitează fereastra de expunere |
| **Separare straturi** | Datele personale (DB) separate de datele trimise la AI (prompt) | Accesul la prompt nu expune baza de date |

### 3.2 Măsuri organizatorice

| Măsură | Descriere |
|---|---|
| **Privacy by design** | Arhitectura platformei previne includerea datelor personale în prompt-uri |
| **Politică internă** | Instrucțiuni clare pentru agent prompt builder: nu include date identificabile |
| **Audit trimestrial** | Verificare eșantion de prompt-uri trimise la API — confirmare minimizare |
| **DPA cu Anthropic** | Acoperit prin Terms of Service API |
| **Monitorizare sub-procesator** | Verificare anuală a politicilor Anthropic privind datele |

### 3.3 Măsuri contractuale

- **SCC** (Clauze Contractuale Standard) — incluse în DPA Anthropic
- **Angajament de non-retenție** — Anthropic API Terms: datele nu sunt folosite pentru antrenare
- **Notificare la cereri autorități** — conform SCC, Anthropic trebuie să notifice dacă primește cereri legale de acces la date

---

## 4. Evaluare risc rezidual

### 4.1 Matrice de risc

| Risc | Probabilitate | Impact | Risc rezidual |
|---|---|---|---|
| Acces FISA 702 la prompt-uri | Foarte scăzută | Scăzut (fără date personale directe) | **SCĂZUT** |
| Interceptare în tranzit | Foarte scăzută (TLS) | Neglijabil | **NEGLIJABIL** |
| Breșă de securitate Anthropic | Scăzută | Scăzut (prompt-uri fără date personale) | **SCĂZUT** |
| Utilizare neautorizată de Anthropic | Foarte scăzută (contractual interzisă) | Scăzut | **NEGLIJABIL** |

### 4.2 Concluzie

Riscul rezidual al transferului de date către Anthropic este **SCĂZUT**, din următoarele motive:

1. **Datele transferate nu conțin date personale directe** — sunt descrieri de posturi, profiluri companie și întrebări generice
2. **Măsurile tehnice** (criptare, minimizare, pseudonimizare) reduc semnificativ impactul unui eventual acces neautorizat
3. **Anthropic nu reține datele** pentru antrenare sau alte scopuri
4. **Probabilitatea accesului guvernamental** este foarte scăzută dată fiind natura datelor

Transferul este **proporțional** cu scopul urmărit (funcționalitate AI a platformei) și se încadrează în cerințele Art. 46 GDPR cu măsuri suplimentare conform Schrems II.

---

## 5. Decizie

**Transfer APROBAT** cu următoarele condiții:

1. Menținerea tuturor măsurilor tehnice și organizatorice descrise mai sus
2. Audit trimestrial al prompt-urilor trimise la API
3. Monitorizare anuală a politicilor Anthropic
4. Re-evaluare TIA dacă:
   - Anthropic modifică Terms of Service/DPA
   - Cadrul juridic UE-SUA se modifică (ex: invalidare DPF)
   - Se adaugă noi categorii de date în prompt-uri
   - Se implementează funcționalități B2C care implică date psihologice

---

**Evaluator:** Liviu Stroie  
**Data:** 02.04.2026  
**Următoarea revizuire:** 02.10.2026 (sau mai devreme dacă se modifică condițiile)
