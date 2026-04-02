# ACORD DE PRELUCRARE A DATELOR CU CARACTER PERSONAL

**(Data Processing Agreement — DPA)**

**Conform Art. 28 din Regulamentul (UE) 2016/679 (GDPR)**

---

## PĂRȚILE

**OPERATORUL DE DATE** (denumit în continuare „Operatorul" sau „Clientul"):

**Denumire:** [DENUMIRE COMPANIE CLIENT]  
**CUI:** [CUI CLIENT]  
**Sediu:** [ADRESĂ CLIENT]  
**Reprezentant legal:** [NUME REPREZENTANT]  
**Email contact DPO/privacy:** [EMAIL CLIENT]

și

**PERSOANA ÎMPUTERNICITĂ** (denumit în continuare „Împuternicitul" sau „Procesatorul"):

**Denumire:** Psihobusiness Consulting SRL  
**CUI:** RO15790994  
**Sediu:** [ADRESĂ DE COMPLETAT]  
**Reprezentant legal:** [NUME DE COMPLETAT]  
**Email contact DPO/privacy:** [EMAIL DE COMPLETAT]

denumite împreună „Părțile" și individual „Partea".

---

## PREAMBUL

Prezentul Acord de Prelucrare a Datelor cu Caracter Personal („Acordul DPA") este încheiat ca anexă la Contractul de prestări servicii SaaS („Contractul principal") dintre Părți, prin care Împuternicitul furnizează Operatorului acces la platforma JobGrade pentru evaluarea și ierarhizarea posturilor, analiza structurii salariale și conformitatea cu Directiva EU 2023/970 privind transparența salarială.

Prezentul Acord reglementează obligațiile Părților privind protecția datelor cu caracter personal, în conformitate cu Regulamentul (UE) 2016/679 (GDPR) și cu legislația română aplicabilă (Legea nr. 190/2018).

---

## ARTICOLUL 1 — OBIECTUL ȘI DURATA PRELUCRĂRII

**1.1.** Împuternicitul prelucrează date cu caracter personal în numele Operatorului exclusiv în scopul furnizării serviciilor prevăzute în Contractul principal, respectiv:

- (a) Gestionarea conturilor de utilizator ale angajaților Operatorului pe platforma JobGrade;
- (b) Procesarea fișelor de post și evaluarea/ierarhizarea posturilor conform metodologiei cu 6 criterii;
- (c) Importul și analiza datelor din statul de plată (pseudonimizate) pentru calculul gradelor salariale;
- (d) Generarea rapoartelor de pay gap conform Directivei EU 2023/970;
- (e) Procesarea cererilor angajaților conform Art. 7 din Directiva EU 2023/970;
- (f) Generarea de analize AI (fișe de post, anunțuri recrutare, KPI-uri, analize sesiune);
- (g) Trimiterea de notificări și email-uri tranzacționale către utilizatorii autorizați;
- (h) Facturarea serviciilor prin procesatorul de plăți Stripe.

**1.2.** Durata prelucrării coincide cu durata Contractului principal. La încetarea Contractului principal, se aplică dispozițiile Art. 12 din prezentul Acord.

---

## ARTICOLUL 2 — NATURA ȘI SCOPUL PRELUCRĂRII

**2.1.** Natura prelucrării include: colectare, înregistrare, organizare, structurare, stocare, adaptare, consultare, utilizare, aliniere, combinare, restricționare, ștergere — toate prin mijloace automatizate (platformă SaaS).

**2.2.** Scopul prelucrării: furnizarea serviciilor de evaluare și ierarhizare posturi, analiză salarială, conformitate cu transparența salarială UE, generare rapoarte și analize AI, conform specificațiilor din Contractul principal.

---

## ARTICOLUL 3 — TIPUL DATELOR CU CARACTER PERSONAL

**3.1.** Categoriile de date cu caracter personal prelucrate:

| Categorie | Date specifice | Nivel sensibilitate |
|-----------|---------------|-------------------|
| Date de identificare utilizator | Email, prenume, nume, funcție | Standard |
| Date de autentificare | Parolă (hash), tokeni OAuth (Google/LinkedIn) | Ridicat |
| Date organizaționale | Denumire companie, CUI, adresă, industrie | Standard (PJ) |
| Fișe de post | Titlu, responsabilități, cerințe, descriere | Standard |
| Date salariale pseudonimizate | Cod angajat, salariu bază, sporuri, bonusuri, comisioane, beneficii, tichete, salariu total brut, cuartilă | Ridicat |
| Date demografice | Gen (MALE/FEMALE/OTHER) | Ridicat |
| Date profesionale | Nivel ierarhic, departament, familie posturi, program lucru, tip contract, vechime, locație, oraș, studii, certificări | Standard-Ridicat |
| Evaluări și scoruri | Scoruri per criteriu, justificări, voturi, decizii | Standard |
| Conversații AI | Prompt-uri și output-uri AI (pot conține date organizaționale) | Ridicat |
| Date de contact cereri | Email angajat solicitant, detalii cerere Art. 7 | Standard |
| Date financiare | Stripe Customer ID, tranzacții credite (nu date card) | Ridicat |

**3.2.** **Date sensibile (Art. 9 GDPR):** Împuternicitul NU prelucrează în mod intenționat categorii speciale de date (origine rasială/etnică, convingeri politice, date genetice, biometrice, sănătate, viață sexuală). Genul (MALE/FEMALE/OTHER) este prelucrat exclusiv în scopul conformității cu Directiva EU 2023/970 privind transparența salarială.

---

## ARTICOLUL 4 — CATEGORIILE DE PERSOANE VIZATE

**4.1.** Persoanele vizate ale căror date sunt prelucrate:

- (a) **Utilizatorii platformei** — angajații Operatorului cu cont pe JobGrade (maxim 5 roluri: SUPER_ADMIN, COMPANY_ADMIN, OWNER, FACILITATOR, REPRESENTATIVE);
- (b) **Angajații Operatorului** (indirect) — prin datele pseudonimizate din statul de plată (fără nume sau CNP, identificați prin cod angajat);
- (c) **Angajații Operatorului** (direct) — prin cererile Art. 7 (email, detalii cerere);
- (d) **Reprezentantul legal al Operatorului** — prin datele profilului companie.

---

## ARTICOLUL 5 — OBLIGAȚIILE ÎMPUTERNICITULUI

**5.1.** Împuternicitul se obligă să:

- (a) Prelucreze datele cu caracter personal **numai pe baza instrucțiunilor documentate** ale Operatorului, inclusiv în ceea ce privește transferurile de date către o țară terță (cu excepția cazului în care este obligat prin dreptul UE sau dreptul intern);
- (b) Se asigure că persoanele autorizate să prelucreze date cu caracter personal **s-au angajat să respecte confidențialitatea** sau au o obligație legală adecvată de confidențialitate;
- (c) Ia toate **măsurile tehnice și organizatorice** necesare conform Art. 32 GDPR (detaliate în Anexa 1);
- (d) Respecte condițiile prevăzute la Art. 28(2) și (4) GDPR pentru **recurgerea la un alt împuternicit** (sub-procesator) — detaliate în Art. 9;
- (e) Ia în considerare natura prelucrării și **asiste Operatorul** prin măsuri tehnice și organizatorice adecvate, în măsura posibilului, pentru îndeplinirea obligației Operatorului de a răspunde cererilor persoanelor vizate (acces, rectificare, ștergere, portabilitate, opoziție, restricționare);
- (f) **Asiste Operatorul** în asigurarea respectării obligațiilor prevăzute la Art. 32-36 GDPR (securitate, notificare breșe, evaluare impact), ținând seama de natura prelucrării și de informațiile aflate la dispoziția sa;
- (g) La alegerea Operatorului, **șterge sau returnează** toate datele cu caracter personal la încetarea contractului (Art. 12);
- (h) Pune la dispoziția Operatorului **toate informațiile necesare** pentru a demonstra respectarea obligațiilor și permite **auditurile** (Art. 10);
- (i) **Informează imediat** Operatorul în cazul în care o instrucțiune încalcă GDPR sau alte dispoziții UE/naționale privind protecția datelor.

---

## ARTICOLUL 6 — INSTRUCȚIUNILE OPERATORULUI

**6.1.** Instrucțiunile Operatorului privind prelucrarea datelor sunt constituite din:

- (a) Prezentul Acord DPA și anexele sale;
- (b) Contractul principal;
- (c) Configurările efectuate de Operator în platforma JobGrade (setări tenant, import date, lansare sesiuni);
- (d) Instrucțiuni suplimentare scrise transmise de Operator prin email sau prin interfața platformei.

**6.2.** Împuternicitul nu prelucrează datele în alt scop decât cel stabilit prin instrucțiunile Operatorului. Orice prelucrare suplimentară necesită acordul scris prealabil al Operatorului.

**6.3.** Împuternicitul informează imediat Operatorul dacă, în opinia sa, o instrucțiune este contrară GDPR sau legislației aplicabile.

---

## ARTICOLUL 7 — CONFIDENȚIALITATE

**7.1.** Împuternicitul se asigură că accesul la datele cu caracter personal ale Operatorului este limitat la **personalul strict necesar** pentru furnizarea serviciilor, care:

- (a) A semnat un angajament de confidențialitate sau este supus unei obligații legale de confidențialitate;
- (b) A fost instruit cu privire la cerințele GDPR și la obligațiile de protecție a datelor;
- (c) Acționează exclusiv pe baza instrucțiunilor Împuternicitului.

**7.2.** Obligația de confidențialitate supraviețuiește încetării prezentului Acord.

**7.3.** În ceea ce privește sistemele AI autonome (agenți AI) ale platformei JobGrade, Împuternicitul se asigură că:

- (a) Agenții AI accesează date cu caracter personal exclusiv în limita funcționalității lor desemnate;
- (b) Datele procesate prin AI nu sunt utilizate pentru antrenarea modelelor terțe;
- (c) Există loguri complete ale interacțiunilor AI cu datele Operatorului.

---

## ARTICOLUL 8 — MĂSURI TEHNICE ȘI ORGANIZATORICE

**8.1.** Împuternicitul implementează măsurile tehnice și organizatorice descrise în **Anexa 1** la prezentul Acord, care asigură un nivel de securitate corespunzător riscului, conform Art. 32 GDPR.

**8.2.** Împuternicitul revizuiește și actualizează periodic aceste măsuri, asigurând un nivel continuu de protecție adecvat.

**8.3.** Operatorul a evaluat măsurile din Anexa 1 și le consideră adecvate scopului prelucrării.

---

## ARTICOLUL 9 — SUB-PROCESATORI

**9.1.** Operatorul acordă **autorizare generală** Împuternicitului de a recurge la sub-procesatori pentru furnizarea serviciilor, sub rezerva respectării condițiilor din prezentul articol.

**9.2.** Lista sub-procesatorilor aprobați la data semnării prezentului Acord:

| Nr | Sub-procesator | Sediu | Serviciu | Date prelucrate | Localizare servere | Temei transfer (dacă extra-UE) |
|----|---------------|-------|----------|----------------|-------------------|-------------------------------|
| 1 | **Vercel Inc.** | SUA | Hosting aplicație web (Next.js) | Toate datele tranzitate prin aplicație | **Frankfurt, Germania (eu-central-1)** | N/A — servere UE |
| 2 | **Neon Inc.** | SUA | Bază de date PostgreSQL gestionată | Toate datele persistate | **UE (Frankfurt)** | N/A — servere UE |
| 3 | **Anthropic PBC** | SUA (San Francisco) | API AI — Claude Sonnet 4 (generare analize, procesare fișe post) | Prompt-uri (pot conține date organizaționale, fișe post, descrieri companie); Output-uri AI | **SUA** | **SCC (Clauze Contractuale Standard)** conform Art. 46(2)(c) GDPR + DPA Anthropic + angajamentul de non-retenție a datelor pentru antrenare |
| 4 | **Resend Inc.** | SUA | Email tranzacțional | Adrese email destinatari, subiect, conținut email | **De verificat** — se aplică SCC dacă servere extra-UE* | SCC (dacă aplicabil) |
| 5 | **Stripe Inc.** | SUA (San Francisco) | Procesare plăți | Date card (procesate exclusiv de Stripe, nu stocate de Împuternicit); Stripe Customer ID | **Infrastructură globală, certificată PCI-DSS Level 1** | **DPF (Data Privacy Framework)** + SCC + certificare PCI-DSS |

**9.3.** Împuternicitul va **notifica Operatorul în scris** (prin email) cu cel puțin **30 de zile** înainte de adăugarea sau înlocuirea unui sub-procesator, oferind Operatorului posibilitatea de a formula obiecții.

**9.4.** Dacă Operatorul formulează o **obiecție motivată** în termen de 15 zile de la notificare, Părțile vor negocia cu bună-credință o soluție. Dacă nu se ajunge la un acord, Operatorul are dreptul de a rezilia Contractul principal fără penalități.

**9.5.** Împuternicitul se asigură că **fiecare sub-procesator** este obligat contractual la aceleași obligații de protecție a datelor ca cele prevăzute în prezentul Acord. Împuternicitul rămâne pe deplin responsabil față de Operator pentru îndeplinirea obligațiilor sub-procesatorilor.

---

## ARTICOLUL 10 — DREPTUL DE AUDIT

**10.1.** Împuternicitul pune la dispoziția Operatorului toate informațiile necesare pentru a demonstra respectarea obligațiilor prevăzute în prezentul Acord și în Art. 28 GDPR.

**10.2.** Împuternicitul **permite și contribuie** la auditurile, inclusiv inspecțiile, efectuate de Operator sau de un alt auditor mandatat de Operator, în următoarele condiții:

- (a) Operatorul notifică intenția de audit cu cel puțin **15 zile lucrătoare** înainte;
- (b) Auditul se desfășoară în timpul programului normal de lucru;
- (c) Auditorul respectă obligații de confidențialitate;
- (d) Auditul nu perturbă semnificativ activitatea curentă a Împuternicitului;
- (e) Frecvența auditurilor: maxim **o dată pe an**, cu excepția cazurilor de incident de securitate sau cerere a autorității de supraveghere.

**10.3.** Costurile auditului sunt suportate de Operator, cu excepția cazului în care auditul relevă neconformități semnificative, caz în care costurile sunt suportate de Împuternicit.

**10.4.** Rezultatele auditului sunt confidențiale și se comunică ambelor Părți.

---

## ARTICOLUL 11 — NOTIFICAREA BREȘELOR DE SECURITATE

**11.1.** Împuternicitul **notifică Operatorul fără întârziere nejustificată** și, în orice caz, în cel mult **48 de ore** de la momentul în care ia cunoștință de o încălcare a securității datelor cu caracter personal.

**11.2.** Notificarea include cel puțin:

- (a) Descrierea naturii încălcării, inclusiv, dacă este posibil, categoriile și numărul aproximativ al persoanelor vizate afectate;
- (b) Numele și datele de contact ale DPO sau ale altui punct de contact de la care se pot obține mai multe informații;
- (c) Descrierea consecințelor probabile ale încălcării;
- (d) Descrierea măsurilor luate sau propuse pentru a remedia încălcarea, inclusiv, după caz, măsuri de atenuare a efectelor negative;
- (e) Cronologia evenimentelor (momentul detectării, momentul notificării, acțiuni întreprinse).

**11.3.** Împuternicitul **cooperează** cu Operatorul și ia toate măsurile rezonabile pentru a remedia sau atenua efectele încălcării.

**11.4.** Împuternicitul **asistă Operatorul** în notificarea ANSPDCP (în termen de 72 de ore conform Art. 33 GDPR) și, dacă este cazul, în notificarea persoanelor vizate (Art. 34 GDPR).

**11.5.** Împuternicitul **documentează** toate încălcările securității datelor, inclusiv circumstanțele, efectele și măsurile corective, și pune această documentație la dispoziția Operatorului și a autorităților de supraveghere.

---

## ARTICOLUL 12 — ȘTERGEREA SAU RETURNAREA DATELOR LA ÎNCETAREA CONTRACTULUI

**12.1.** La încetarea Contractului principal (indiferent de motiv), Împuternicitul, la alegerea Operatorului:

- (a) **Returnează** toate datele cu caracter personal ale Operatorului într-un format structurat, utilizat în mod curent și lizibil automat (CSV, JSON sau format agreat de Părți); sau
- (b) **Șterge** toate datele cu caracter personal și toate copiile existente.

**12.2.** Returnarea sau ștergerea se efectuează în termen de **30 de zile** de la încetarea Contractului principal.

**12.3.** Împuternicitul confirmă în scris Operatorului ștergerea completă a datelor.

**12.4.** **Excepții:** Împuternicitul poate reține date cu caracter personal dacă dreptul UE sau dreptul intern impune stocarea (ex.: date financiare conform legislației fiscale — 10 ani). În acest caz, Împuternicitul informează Operatorul cu privire la datele reținute, baza legală și termenul de stocare.

**12.5.** Datele din Knowledge Base (KB) care nu conțin date cu caracter personal ale Operatorului (ex.: metodologie generală, cunoștințe de domeniu) nu fac obiectul obligației de ștergere.

---

## ARTICOLUL 13 — TRANSFER INTERNAȚIONAL DE DATE

**13.1.** Împuternicitul nu transferă date cu caracter personal în afara Spațiului Economic European (SEE) fără asigurarea unor garanții adecvate conform Capitolul V GDPR.

**13.2.** Transferurile către sub-procesatorul **Anthropic PBC** (SUA) sunt acoperite prin:

- (a) **Clauze Contractuale Standard (SCC)** conform Deciziei de punere în aplicare (UE) 2021/914, Modulul 3 (Procesator → Sub-procesator);
- (b) **Măsuri suplimentare:** Anthropic nu reține datele transmise prin API pentru antrenarea modelelor; minimizarea datelor personale în prompt-uri; loguri complete;
- (c) **Transfer Impact Assessment (TIA)** efectuat de Împuternicit, disponibil la cerere.

**13.3.** Transferurile către **Stripe Inc.** sunt acoperite prin DPF (Data Privacy Framework) și SCC, cu observația că Împuternicitul nu stochează date de card — acestea sunt procesate exclusiv de Stripe (PCI-DSS Level 1).

**13.4.** **Vercel** și **Neon.tech**, deși entități cu sediul în SUA, operează servere în **UE (Frankfurt)** pentru datele Operatorului. Nu se consideră transfer extra-UE.

---

## ARTICOLUL 14 — EVALUAREA IMPACTULUI ASUPRA PROTECȚIEI DATELOR (DPIA)

**14.1.** Împuternicitul asistă Operatorul în realizarea evaluării impactului asupra protecției datelor (DPIA) conform Art. 35 GDPR, dacă prelucrarea este susceptibilă să genereze un risc ridicat.

**14.2.** Împuternicitul furnizează informațiile necesare privind măsurile tehnice, logica prelucrării AI și garanțiile implementate.

---

## ARTICOLUL 15 — RESPONSABILITATE

**15.1.** Fiecare Parte este responsabilă pentru prejudiciile cauzate prin încălcarea prezentului Acord sau a GDPR, conform Art. 82 GDPR.

**15.2.** Împuternicitul este exonerat de răspundere dacă dovedește că nu este responsabil în niciun fel de evenimentul care a cauzat prejudiciul.

---

## ARTICOLUL 16 — DISPOZIȚII FINALE

**16.1.** Prezentul Acord intră în vigoare la data semnării și rămâne în vigoare pe toată durata Contractului principal, precum și până la ștergerea sau returnarea completă a datelor.

**16.2.** Modificarea prezentului Acord se face numai prin act adițional scris, semnat de ambele Părți.

**16.3.** În caz de contradicție între prezentul Acord și Contractul principal, prevederile prezentului Acord prevalează în ceea ce privește protecția datelor cu caracter personal.

**16.4.** Prezentul Acord este guvernat de legislația română. Orice litigiu se soluționează de instanțele competente din România.

**16.5.** Prezentul Acord s-a încheiat în 2 (două) exemplare originale, câte unul pentru fiecare Parte.

---

## SEMNĂTURI

| | OPERATOR | ÎMPUTERNICIT |
|---|---------|-------------|
| **Denumire** | [DENUMIRE CLIENT] | Psihobusiness Consulting SRL |
| **Reprezentant** | [NUME] | [NUME DE COMPLETAT] |
| **Funcția** | [FUNCȚIE] | Administrator |
| **Data** | ___/___/______ | ___/___/______ |
| **Semnătura** | ___________________ | ___________________ |

---

---

# ANEXA 1 — MĂSURI TEHNICE ȘI ORGANIZATORICE

**(conform Art. 32 GDPR)**

## 1. Pseudonimizarea și criptarea datelor personale

| Măsură | Implementare |
|--------|-------------|
| Criptare în tranzit | TLS 1.2+ obligatoriu pe toate conexiunile (HTTPS); certificate gestionate de Vercel |
| Criptare la repaus | Neon.tech encryption at rest (AES-256); backup-uri criptate |
| Pseudonimizare | Statul de plată importat cu cod angajat — fără nume sau CNP; genul stocat doar pentru conformitate pay gap |
| Hash parole | bcrypt cu salt unic per utilizator |
| Tokeni OAuth | Stocați criptat în baza de date; refresh tokens cu expirare |

## 2. Capacitatea de a asigura confidențialitatea, integritatea, disponibilitatea și reziliența

| Măsură | Implementare |
|--------|-------------|
| Confidențialitate | RBAC pe 5 niveluri de rol; izolare multi-tenant prin Tenant ID; JWT semnat cu secret; HttpOnly cookies |
| Integritate | Cascade delete la ștergere tenant; audit trail pe operațiuni critice; versionare evaluări |
| Disponibilitate | Hosting Vercel (SLA 99.99%); Neon.tech serverless PostgreSQL cu auto-scaling; CDN global |
| Reziliență | Point-in-time recovery Neon.tech; Vercel edge functions cu failover automat |

## 3. Capacitatea de a restabili disponibilitatea și accesul la date în timp util

| Măsură | Implementare |
|--------|-------------|
| Backup | Neon.tech: point-in-time recovery (continuous backup); retenție conform plan |
| Disaster recovery | Infrastructură serverless — fără server fizic de gestionat; Vercel auto-redeploy |
| RTO (Recovery Time Objective) | < 1 oră pentru restaurare din backup |
| RPO (Recovery Point Objective) | < 5 minute (continuous backup Neon.tech) |

## 4. Proces de testare și evaluare periodică a eficacității măsurilor

| Măsură | Implementare |
|--------|-------------|
| Revizuire securitate | Cel puțin o dată la 6 luni |
| Actualizare dependențe | Monitorizare vulnerabilități npm/yarn; dependabot alerts |
| Testare acces | Verificare periodică a permisiunilor RBAC |
| Monitorizare | Logging centralizat; alerte automate pentru comportament anormal |

## 5. Măsuri organizatorice

| Măsură | Implementare |
|--------|-------------|
| Politică confidențialitate | Toți utilizatorii acceptă Politica de confidențialitate la înregistrare |
| Instruire personal | Personalul Împuternicitului este instruit privind GDPR și protecția datelor |
| Principiul minimizării | Se colectează doar datele strict necesare scopului |
| Principiul limitării stocării | Termene de retenție definite per categorie de date (vezi Registrul Art. 30) |
| Procedură răspuns cereri | Proces documentat pentru drepturile persoanelor vizate (acces, ștergere, portabilitate) |
| Procedură notificare breșe | Notificare Operator în max 48h; asistență notificare ANSPDCP în 72h |
| Control acces fizic | N/A — infrastructură 100% cloud, fără servere fizice proprii |

---

# ANEXA 2 — INSTRUCȚIUNI DE PRELUCRARE

Operatorul instruiește Împuternicitul să prelucreze datele cu caracter personal conform următoarelor instrucțiuni:

1. **Stocare:** Datele se stochează exclusiv pe servere localizate în UE (Frankfurt, Germania), cu excepția transferurilor către Anthropic API (SUA) acoperite de SCC.

2. **Acces:** Datele Operatorului sunt accesibile exclusiv:
   - Utilizatorilor autorizați ai Operatorului, conform rolurilor atribuite;
   - Sistemelor automate ale Împuternicitului (agenți AI), strict în limita funcționalității;
   - Personalului tehnic al Împuternicitului, exclusiv pentru suport tehnic și remediere incidente.

3. **Minimizare AI:** La trimiterea datelor către Anthropic API:
   - NU se trimit nume, CNP sau date direct identificabile ale angajaților;
   - Se trimit doar informații organizaționale relevante pentru analiza solicitată;
   - Se păstrează log complet al tuturor prompt-urilor și răspunsurilor.

4. **Ștergere:** La cererea Operatorului sau la încetarea contractului:
   - Datele se șterg prin cascade delete la nivel de tenant;
   - Se confirmă ștergerea în scris în termen de 30 de zile;
   - KB entries care conțin referințe specifice la Operator se șterg sau se anonimizează.

5. **Export:** La cererea Operatorului, datele se exportă în format CSV sau JSON, structurat per model de date.

---

**Prezenta Anexă face parte integrantă din Acordul DPA.**

**Data:** ___/___/______

**Semnături:**

| OPERATOR | ÎMPUTERNICIT |
|---------|-------------|
| ___________________ | ___________________ |
