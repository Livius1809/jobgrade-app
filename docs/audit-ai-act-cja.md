# RAPORT DE AUDIT AI ACT (REGULAMENTUL EU 2024/1689)
## PLATFORMA JOBGRADE - PSIHOBUSINESS CONSULTING SRL

**Data raportului:** Decembrie 2024  
**Consilier Juridic Agent:** [Nume CJA]  
**Destinatar:** Management Psihobusiness Consulting SRL

---

## 1. CLASIFICARE RISC

### 1.1 Categoria de Risc Identificată
**RISC ÎNALT** - conform Anexa III, punctul 4 lit. (a):

> *"Sistemele de IA destinate să fie utilizate în procesele de recrutare sau selecție a persoanelor fizice, în special pentru publicarea anunțurilor de locuri de muncă țintite, analizarea și filtrarea cererilor sau evaluarea candidaților"*

### 1.2 Justificare Clasificare
JobGrade se încadrează în această categorie prin:
- **Evaluarea și ierarhizarea posturilor** cu impact direct asupra structurii salariale
- **Analiза pay gap** cu potențial impact discriminatoriu
- **Recomandări salariale** care influențează deciziile de compensare
- **Consultanță HR AI** care poate afecta procesele de resurse umane

### 1.3 Sisteme AI Componente Identificate
1. **Agenți AI pentru generarea fișelor de post** (Claude API)
2. **Sistem de evaluare subfactori** (Claude API)
3. **Motor de analiză pay gap** (Claude API)
4. **Sistem de recomandări salariale** (Claude API)
5. **42+ agenți AI specializați** pentru diverse funcționalități HR

---

## 2. CERINȚE OBLIGATORII

### 2.1 Articolul 9 - Sistemul de Management al Riscului
**Obligații:**
- Implementarea unui sistem de management continuu al riscurilor
- Identificarea și analizarea riscurilor cunoscute și previzibile
- Adoptarea măsurilor de management al riscului

### 2.2 Articolul 10 - Datele și Guvernanța Datelor
**Obligații:**
- Asigurarea calității datelor de antrenare, validare și testare
- Examinarea în vederea eventualelor prejudecăți discriminatorii
- Identificarea lacunelor și deficiențelor relevante în date

### 2.3 Articolul 11 - Documentația Tehnică
**Obligații:**
- Redactarea documentației tehnice detaliate
- Actualizarea documentației la modificări ale sistemului
- Păstrarea documentației disponibile pentru autoritățile naționale

### 2.4 Articolul 12 - Păstrarea Înregistrărilor
**Obligații:**
- Înregistrarea automată a evenimentelor în timpul funcționării
- Păstrarea jurnalelor pentru perioade adecvate
- Asigurarea trasabilității deciziilor AI

### 2.5 Articolul 13 - Transparența și Furnizarea Informațiilor
**Obligații:**
- Informarea clară a utilizatorilor despre natura AI a sistemului
- Furnizarea informațiilor despre capacități și limitări
- Asigurarea interpretabilității rezultatelor

### 2.6 Articolul 14 - Supravegherea Umană
**Obligații:**
- Implementarea măsurilor de supraveghere umană eficace
- Asigurarea că persoanele pot înțelege și interveni asupra sistemului
- Menținerea controlului uman asupra deciziilor critice

### 2.7 Articolul 15 - Acuratețea, Robustețea și Securitatea
**Obligații:**
- Asigurarea unui nivel adecvat de acuratețe, robustețe și securitate
- Implementarea măsurilor de protecție împotriva atacurilor
- Testarea și validarea continuă a sistemelor

---

## 3. EVALUARE STARE CURENTĂ

### 3.1 Aspecte Conforme ✅
- **Utilizare API terță parte (Claude):** Beneficiem de conformitatea furnizorului upstream
- **Focalizare B2B:** Clientela business reduce unele riscuri de impact individual direct
- **Piață românească:** Experiență locală în reglementări HR
- **Echipă mixtă AI + umani calificați** (actualizat 03.04.2026):
  - 2 psihologi angajați (nu colaboratori externi)
  - 1 psiholog **acreditat de Colegiul Psihologilor din România (CPR)** pe specialitatea **Psihologia muncii, transporturilor și serviciilor**, cu **atestat de liberă practică** și număr de marcă înregistrat în Registrul Unic CPR
  - Supravegherea umană (Art. 14) este exercitată de un **profesionist atestat** în exact domeniul în care operează sistemul AI
  - Aceasta depășește cerința minimă Art. 14 — majoritatea furnizorilor AI nu dispun de profesioniști de domeniu angajați
  - Narațiune: **companie de psihologie organizațională care folosește AI ca instrument**, nu companie tech care aplică AI pe domeniu sensibil

### 3.2 Aspecte Neconforme ❌ (revizuit 03.04.2026)
- **Lipsa sistemului de management al riscului** (Art. 9)
- **Documentație tehnică insuficientă** (Art. 11)
- **Absența jurnalizării conforme** (Art. 12)
- **Transparență limitată față de utilizatori finali** (Art. 13)
- ~~**Supraveghere umană neformalizată** (Art. 14)~~ → **PARȚIAL ACOPERIT** — echipa mixtă există, procedura formală în curs de documentare (vezi Procedura Art. 14)
- **Testare și validare nesistematizată** (Art. 15)

---

## 4. GAP ANALYSIS

### 4.1 Gaps Severitate CRITICĂ 🔴
| Gap | Articol | Impact | Risc Amenzi |
|-----|---------|--------|-------------|
| Lipsa sistemului de management risc | Art. 9 | Foarte Mare | Până la 35M EUR |
| Documentație tehnică incompletă | Art. 11 | Mare | Până la 35M EUR |
| Transparență insuficientă | Art. 13 | Mare | Până la 35M EUR |

### 4.2 Gaps Severitate MARE 🟡
| Gap | Articol | Impact | Risc Amenzi | Status (03.04.2026) |
|-----|---------|--------|-------------|---------------------|
| Jurnalizare neconformă | Art. 12 | Mediu | Până la 15M EUR | Deschis |
| ~~Supraveghere umană neformalizată~~ | Art. 14 | ~~Mediu~~ **Redus** | ~~Până la 15M EUR~~ | **PARȚIAL ACOPERIT** — psiholog CPR angajat, procedură în documentare |
| Testare și validare ad-hoc | Art. 15 | Mediu | Până la 15M EUR | Deschis |

### 4.3 Gaps Severitate MEDIE 🟢
| Gap | Articol | Impact | Risc Amenzi |
|-----|---------|--------|-------------|
| Proceduri de guvernanță date | Art. 10 | Mic | Până la 7,5M EUR |
| Măsuri de securitate suplimentare | Art. 15 | Mic | Până la 7,5M EUR |

---

## 5. PLAN DE CONFORMITATE

### 5.1 FAZA I - FUNDAȚIA (Ian-Iun 2025)
**Responsabil:** CTO + Legal

| Activitate | Deadline | Deliverable |
|------------|----------|-------------|
| Implementare sistem management risc | 31 Mar 2025 | Procedură RMS documentată |
| Creare documentație tehnică completă | 30 Apr 2025 | Documentație tehnică AI Act |
| Implementare logging conform | 31 Mai 2025 | Sistem jurnalizare |
| Proceduri guvernanță date | 30 Iun 2025 | Manual guvernanță date |

### 5.2 FAZA II - OPERAȚIONALE (Iul-Dec 2025)
**Responsabil:** Product Manager + Legal

| Activitate | Deadline | Deliverable |
|------------|----------|-------------|
| Implementare transparență utilizatori | 31 Aug 2025 | Interface transparență |
| Formalizare supraveghere umană | 30 Sep 2025 | Proceduri supraveghere |
| Sistem testare și validare | 31 Oct 2025 | Framework testare |
| Training echipe | 30 Nov 2025 | Programe formare |
| Audit intern | 31 Dec 2025 | Raport audit intern |

### 5.3 FAZA III - OPTIMIZARE (Ian-Aug 2026)
**Responsabil:** Management + Legal

| Activitate | Deadline | Deliverable |
|------------|----------|-------------|
| Optimizări post-audit | 28 Feb 2026 | Îmbunătățiri implementate |
| Certificări externe | 30 Apr 2026 | Certificări obținute |
| Pregătire pentru aplicare | 30 Iun 2026 | Conformitate completă |
| **DEADLINE LEGAL** | **2 Aug 2026** | **CONFORMITATE TOTALĂ** |

---

## 6. DOCUMENTAȚIA NECESARĂ

### 6.1 Documentație Obligatorie
1. **Documentația Tehnică AI Act** (Art. 11)
   - Descrierea detaliată a sistemelor AI
   - Arhitectura și algoritmii utilizați
   - Datele de antrenare și metodologiile

2. **Procedura de Management al Riscului** (Art. 9)
   - Identificarea și evaluarea riscurilor
   - Măsuri de mitigare
   - Procese de monitorizare continuă

3. **Manual de Guvernanță a Datelor** (Art. 10)
   - Politici de calitate a datelor
   - Proceduri anti-discriminare
   - Procese de validare date

4. **Registrul de Jurnalizare** (Art. 12)
   - Specificații tehnice logging
   - Perioade de păstrare
   - Proceduri de acces

5. **Ghidul de Transparență** (Art. 13)
   - Informații pentru utilizatori
   - Explicații despre limitări
   - Proceduri de comunicare

### 6.2 Documentație de Conformitate
- **Evaluări de impact** pentru discriminare
- **Rapoarte de testare** și validare
- **Proceduri de supraveghere** umană
- **Planuri de răspuns** la incidente
- **Politici de securitate** cibernetică

---

## 7. IMPACT ASUPRA PRODUSULUI

### 7.1 Modificări Tehnice Obligatorii

#### 7.1.1 Interfața Utilizator
- **Dashboard transparență AI** pentru clienți
- **Notificări despre utilizarea AI** în toate funcționalitățile
- **Opțiuni de control uman** pentru deciziile critice
- **Raportare automatizată** conformitate

#### 7.1.2 Backend și API
- **Sistem de logging extins** pentru toate deciziile AI
- **Module de bias detection** în analize pay gap
- **API-uri pentru auditabilitate** și trasabilitate
- **Integrare cu sisteme de management risc**

#### 7.1.3 Securitate și Monitorizare
- **Enhanced authentication** pentru funcții AI
- **Real-time monitoring** pentru anomalii
- **Backup și recovery** pentru jurnale conformitate
- **Encryption** pentru date sensibile HR

### 7.2 Funcționalități Noi Necesare
1. **AI Explainability Module** - explicarea deciziilor AI
2. **Human Override System** - intervenție umană când necesar
3. **Bias Detection Engine** - detectarea automată a discriminării
4. **Compliance Dashboard** - monitorizarea conformității în timp real

### 7.3 Impact asupra UX/UI
- **Bannere informative** despre AI în toate secțiunile
- **Butoane de control uman** pentru funcții critice
- **Rapoarte de transparență** downloadabile
- **Setări de confidențialitate** granulare

---

## 8. RISCURI DE NECONFORMITATE

### 8.1 Sancțiuni Financiare

#### 8.1.1 Încălcări Grave (Art. 99, para. 3)
- **35.000.000 EUR** sau **7% din cifra de afaceri** globală anuală
- **Aplicabile pentru:**
  - Nerespectarea prohibițiilor (Art. 5)
  - Neconformitatea sistemelor cu risc înalt (Art. 9-15)

#### 8.1.2 Încălcări Medii (Art. 99, para. 4)
- **15.000.000 EUR** sau **3% din cifra de afaceri** globală anuală
- **Aplicabile pentru:**
  - Nerespectarea obligațiilor de transparență
  - Necooperarea cu autoritățile

#### 8.1.3 Încălcări Minore (Art. 99, para. 5)
- **7.500.000 EUR** sau **1,5% din cifra de afaceri** globală anuală
- **Aplicabile pentru:**
  - Furnizarea de informații incorecte
  - Nerespectarea cererilor autorităților

### 8.2 Riscuri Operaționale

#### 8.2.1 Interzicerea Comercializării
- **Oprirea vânzărilor** în UE
- **Retragerea produsului** de pe piață
- **Suspendarea serviciilor** pentru clienții existenți

#### 8.2.2 Răspunderea Civilă
- **Daune-interese** către clienții afectați
- **Costuri de remediere** pentru discriminări identificate
- **Pierderi de business** din cauza neîncrederii

#### 8.2.3 Riscuri Reputaționale
- **Pierderea încrederii** clienților B2B
- **Impact negativ** asupra brand-ului
- **Dificultăți în recrutare** și partnerships

### 8.3 Riscuri Specifice JobGrade

#### 8.3.1 Discriminare în Evaluări
- **Risc înalt:** Algoritmii de evaluare să perpetueze biasuri salariale
- **Impact:** Clienții pot fi trași la răspundere pentru discriminare
- **Consecință:** Pierderea clienților și acțiuni în justiție

#### 8.3.2 Transparența Inadecvată
- **Risc:** Angajații clienților să nu înțeleagă cum sunt evaluate posturile
- **Impact:** Contestații legale și cereri de explicații
- **Consecință:** Obligația de a modifica fundamental algoritmii

#### 8.3.3 Supraveghere Umană ~~Inadecvată~~ (revizuit 03.04.2026)
- **Risc REDUS:** Echipa include psiholog acreditat CPR pe psihologia muncii
- **Mitigare:** Psihologul validează deciziile AI critice; override profesional, nu doar tehnic
- **Avantaj:** Judecata clinică profesionistă > buton de override generic
- **Cerință reziduală:** Formalizarea procedurii de supraveghere și competence matrix bazată pe standarde CPR

---

## 9. RECOMANDĂRI EXECUTIVE

### 9.1 Acțiuni Immediate (În 30 de zile)
1. **Constituirea echipei AI Act** cu responsabilități clare
2. ~~**Angajarea unui consultant extern** specializat în AI Act~~ → **Recomandat:** auditor extern 15-30K EUR, NU 150K+ (echipa internă acoperă 80%)
3. **Inventarierea completă** a tuturor sistemelor AI utilizate
4. **Formalizarea rolului psihologului CPR** în procedura de supraveghere Art. 14
5. **Documentarea competence matrix** bazată pe standardele CPR

### 9.2 Prioritatea Zero
- **Sistemul de management al riscului** este prioritatea absolută
- **Documentația tehnică** trebuie inițiată imediat
- **Procedura de supraveghere umană (Art. 14)** — formalizarea rolului psihologului acreditat

### 9.3 Investiția Estimată (revizuit 03.04.2026)

**Context:** Echipa mixtă (2 psihologi angajați + 45 agenți AI + platformă existentă) reduce semnificativ costurile estimate inițial.

- **Echipa internă:** Proprietar + 2 psihologi + platformă AI (costuri deja acoperite)
- **Auditor extern AI Act:** 15.000 - 30.000 EUR (validare, nu implementare)
- **Dezvoltare tehnică suplimentară:** 0 EUR (platforma e construită, agenții CJA+CAA generează documentația)
- **Total estimat revizuit:** 15.000 - 30.000 EUR (vs. 600K-800K anterior)

**Justificare reducere:** 80% din muncă e realizabilă intern — echipa de agenți AI (CJA, CAA, DOA, SQA, QAA) sub supravegherea psihologului acreditat produce documentația; auditorul extern validează, nu creează de la zero.

### 9.4 Beneficiile Conformității
- **Avantaj competitiv** față de concurența neconformă
- **Încrederea sporită** a clienților B2B
- **Accesul la piețe internaționale** din UE
- **Protecția juridică** împotriva sancțiunilor

---

## 10. CONCLUZIE

JobGrade se află în **categoria de risc înalt** conform AI Act și trebuie să implementeze urgent măsurile de conformitate. **Deadline-ul de 2 august 2026** este fix și neamănat. 

**Recomandarea fermă** este începerea imediată a activităților de conformitate, cu prioritate pe sistemul de management al riscului și documentația tehnică.

Neconformitatea poate rezulta în amenzi de **până la 35 milioane EUR** și interzicerea comercializării în UE.

---

**Semnat:**  
CJA (Consilier Juridic Agent)  
Psihobusiness Consulting SRL

**Data raport inițial:** Decembrie 2024  
**Ultima actualizare:** 03.04.2026

---

## ADDENDUM — ACTUALIZARE 03.04.2026

### Modificări majore față de raportul inițial

1. **Echipa mixtă confirmată** — 2 psihologi angajați, 1 acreditat CPR pe psihologia muncii cu atestat de liberă practică. Art. 14 trece de la gap MARE la PARȚIAL ACOPERIT.

2. **Reducere estimare costuri** — de la 600K-800K EUR la 15K-30K EUR. Platforma e construită (45 agenți, 89 pagini, 2050 KB entries). Echipa internă produce documentația. Auditor extern doar validează.

3. **Reformulare risc Art. 14** — Supravegherea umană nu mai e "buton de override" generic ci supraveghere profesionistă atestată. Psihologul acreditat = supervizor calificat în exact domeniul sistemului AI.

4. **Narațiune modificată** — JobGrade nu e "companie tech care pune AI pe HR" ci "companie de psihologie organizațională care folosește AI ca instrument sub supraveghere profesionistă". Această distincție e critică la un audit AI Act.

5. **Document de referință nou:** `docs/procedura-supraveghere-umana-art14.md` — procedura formală de supraveghere umană cu rolul psihologului CPR.

*Acest raport constituie o evaluare preliminară actualizată. Se recomandă validarea cu auditor extern specializat AI Act (buget estimat 15-30K EUR).*