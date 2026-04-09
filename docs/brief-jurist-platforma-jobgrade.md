# Brief pentru jurist — Platforma JobGrade

**Document pregătit de:** Psihobusiness Consulting SRL  
**Data:** 08.04.2026  
**Destinatar:** Jurist colaborator  
**Scop:** Prezentarea platformei JobGrade si a nevoilor de asistenta juridica  
**Clasificare:** Confidential — doar pentru uzul destinatarului

---

## 1. Ce este JobGrade

JobGrade este o platforma online operata de **Psihobusiness Consulting SRL** (CIF: RO15790994, platitoare TVA, sediu: Str. Viitorului nr. 20, Rosu, Ilfov, cod postal 077042).

Platforma ofera doua categorii de servicii:

**A. Servicii pentru companii (B2B) — live pe jobgrade.ro**

Ajutam companiile sa evalueze si sa ierarhizeze posturile din organigrama, sa structureze grile salariale si sa se conformeze legislatiei europene privind transparenta salariala (Directiva EU 2023/970). Concret, platforma:

- Analizeaza fise de post pe 6 criterii obiective (educatie, comunicare, rezolvarea problemelor, luarea deciziilor, impact asupra afacerii, conditii de munca)
- Calculeaza grade salariale si identifica discrepante de remunerare
- Genereaza rapoarte de conformitate pay gap (Art. 9 si Art. 10 din Directiva 2023/970)
- Asista importul si analiza statelor de plata (pseudonimizate)

**B. Modul de dezvoltare personala (B2C) — in pregatire**

Un modul dedicat persoanelor fizice, care ofera ghidare pentru dezvoltare personala si profesionala prin dialoguri cu agenti AI specializati. Include profilare psihometrica, orientare in cariera si matching anonim cu posturi disponibile in modulul B2B.

**Echipa:**

| Rol | Status |
|-----|--------|
| Owner si fondator (Liviu Stroie) | Activ |
| 2 psihologi acreditati CPR (Colegiul Psihologilor din Romania) | De angajat — specializari: psihologia muncii si transporturilor, atestat libera practica |
| 47 agenti AI operationali | Activi — asista procesele, nu iau decizii |

---

## 2. Cum functioneaza AI-ul nostru

Pentru ca subiectul este relevant din perspectiva juridica, prezentam pe scurt modul in care folosim inteligenta artificiala.

**Ce folosim:** Un model lingvistic de la Anthropic (companie americana cu sediul in San Francisco), numit Claude. Este un model pre-antrenat — adica a fost instruit pe texte publice inainte de a ajunge la noi. Noi nu il modificam si nu il antrenam pe datele clientilor nostri.

**Ce face concret:** Modelul primeste text (descrieri de posturi, intrebari, raspunsuri la chestionare) si returneaza text (analize, scoruri propuse, recomandari). Este, in esenta, un instrument de procesare a limbajului natural.

**O analogie utila:** Functioneaza ca un consultant extern care primeste un dosar, il citeste, ofera o opinie scrisa si returneaza dosarul. Nu pastreaza o copie, nu isi aminteste dosarul la urmatoarea consultare si nu ia decizii — doar propune.

**Ce NU face AI-ul nostru:**

- **Nu ia decizii.** Propune scoruri si analize. Decizia apartine intotdeauna comitetului uman de evaluare (B2B) sau utilizatorului (B2C).
- **Nu se antreneaza pe datele clientilor.** Modelul este pre-antrenat. Datele noastre nu il modifica in niciun fel.
- **Nu stocheaza conversatiile.** Procesarea este tranzitorie — Anthropic nu retine datele dupa procesare. Acest lucru este confirmat contractual (zero data retention, prin ToS API Anthropic).
- **Nu opereaza fara supraveghere umana.** Echipa de psihologi acreditati CPR supervizeaza metodologia si poate interveni in orice moment.

---

## 3. Ce date prelucram

### Date B2B (servicii pentru companii)

| Categorie | Exemple | Observatii |
|-----------|---------|------------|
| Cont utilizator | Email, nume, functie, parola (hash bcrypt) | Date de identificare standard |
| Profil companie | Denumire, CUI, adresa, industrie | Date persoana juridica |
| Fise de post | Titlu, responsabilitati, cerinte | Date profesionale — indirect personale |
| Evaluari posturi | Scoruri pe 6 criterii, justificari, decizii | Date profesionale |
| Stat de plata (pseudonimizat) | Cod angajat, salariu, sporuri, gen, departament | Date personale pseudonimizate — posibila re-identificare |
| Cereri Art. 7 (transparenta salariala) | Email angajat, detalii cerere | Date personale directe |

**Precizare importanta:** In modulul B2B nu prelucram date personale ale angajatilor individuali, cu exceptia importului de stat de plata (pseudonimizat prin cod angajat) si a cererilor de transparenta salariala Art. 7.

### Date B2C (dezvoltare personala — planificat)

| Categorie | Exemple | Observatii |
|-----------|---------|------------|
| Cont B2C | Pseudonim (obligatoriu), email alias | Pseudonimizat by design |
| Profil psihometric | Dominante Herrmann, puncte forte VIA, nivel Hawkins | Date cu caracter extrem de personal |
| Dialoguri cu agentii AI | Conversatii text | Potential sensibile |
| SafetyMonitor triggers | Pattern-uri de distres detectate, nivel alerta | **Potential date de sanatate mentala — Art. 9 GDPR** |
| CV si date cariera | CV, matching cu posturi B2B | Date profesionale |

### Categorii speciale care necesita atentie juridica

**SafetyMonitor** este un mecanism automat care detecteaza semnale de distres psihologic in conversatiile B2C si escaleaza catre psihologul uman. Detectia se bazeaza pe pattern-uri DSM-5. Calificarea acestor date ca „date privind sanatatea" conform Art. 9 GDPR necesita validare juridica — de aceea avem DPIA si echipa de psihologi acreditati.

---

## 4. Unde sunt datele (geografia datelor)

| Serviciu | Furnizor | Locatie servere | Observatii |
|----------|----------|----------------|------------|
| Baza de date | Neon PostgreSQL | Frankfurt, Germania (UE) | Criptare AES-256 in repaus, TLS in tranzit |
| Hosting aplicatie | Vercel | Frankfurt, Germania (UE) | Regiune eu-central-1 |
| Procesare AI | Anthropic (Claude) | SUA | **Transfer UE → SUA** — cu TIA aprobat, SCC, zero data retention, procesare tranzitorie |
| Email tranzactional | Resend | SUA | Doar confirmari, notificari — fara date sensibile |
| Plati | Stripe | SUA/UE | Doar date financiare, PCI-DSS compliant |

**Despre transferul catre Anthropic (SUA):**

Acesta este punctul care necesita cea mai mare atentie. Datele trimise catre Anthropic includ prompt-uri (care pot contine informatii din fise de post, descrieri companie). NU se trimit: nume angajati, CNP, salarii individuale identificabile, date B2C profil psihologic.

Masuri de protectie implementate:
- Clauze Contractuale Standard (SCC) conform Decizia (UE) 2021/914, Art. 46(2)(c) GDPR
- DPA cu Anthropic (prin ToS API)
- Transfer Impact Assessment (TIA) realizat si aprobat
- Zero data retention confirmat contractual — Anthropic nu retine datele dupa procesare
- Criptare TLS 1.2+ pe toate apelurile API

---

## 5. Ce cadru legal ne afecteaza

### GDPR — Regulamentul (UE) 2016/679

Prelucram date personale in modulul B2B (stat de plata pseudonimizat, cereri Art. 7, conturi utilizatori) si in modulul B2C (profilare psihometrica, dialoguri, SafetyMonitor). Baze legale invocate:

- Art. 6(1)(b) — executarea contractului (B2B si B2C)
- Art. 6(1)(c) — obligatie legala (Directiva 2023/970, Cod Fiscal)
- Art. 6(1)(f) — interes legitim (securitate platforma)
- Art. 9(2)(a) — consimtamant explicit pentru categorii speciale (SafetyMonitor, daca datele se califica ca date de sanatate)

### AI Act — Regulamentul (UE) 2024/1689

Platforma se incadreaza in categoria **high-risk** conform Anexa III, punct 4 (sisteme AI utilizate in domeniul ocuparii fortei de munca, angajarii si managementului resursei umane). Termen pentru indeplinirea obligatiilor: **2 august 2026**.

Obligatii principale: managementul riscului (Art. 9), documentatie tehnica (Art. 11), jurnalizare (Art. 12), transparenta (Art. 13), supraveghere umana (Art. 14), testare (Art. 15).

### Directiva EU 2023/970 — Transparenta salariala

Termen transpunere in legislatia nationala: **7 iunie 2026**. JobGrade este un **instrument de conformitate** cu aceasta directiva (ajuta companiile sa respecte obligatiile de raportare si transparenta), nu un subiect al ei.

### Codul Muncii (Legea nr. 53/2003)

Context relevant pentru salarizare, structurare grile salariale si relatia angajator-angajat.

---

## 6. Ce am pregatit deja (documente cu status)

### Documente finalizate

| Document | Status | Locatie |
|----------|--------|---------|
| Privacy Policy | Finalizat | Pe platforma |
| Terms of Service | Finalizat | Pe platforma |
| DPA template B2B (Art. 28 GDPR) | Finalizat | docs/gdpr/ |
| Registru prelucrari Art. 30 (17 categorii) | Finalizat | docs/gdpr/ |
| TIA Anthropic (Transfer Impact Assessment) | Finalizat | docs/gdpr/ |
| Incident Response Plan | Finalizat | docs/gdpr/ |
| Procedura supraveghere umana Art. 14 AI Act | Finalizat | docs/ |

### Documente care necesita review juridic

| Document | Status | Ce va rugam |
|----------|--------|-------------|
| **DPIA (Evaluare Impact Protectia Datelor)** | Draft complet, necesita review DPO | Evaluarea riscurilor e completa? Bazele legale sunt corecte? |
| **Pagina Transparenta AI** | Draft continut, conform Art. 13 AI Act | Acopera cerintele AI Act? Formularile sunt corecte legal? |
| **Template notificare breach ANSPDCP** | Draft | Conformitate Art. 33 + Art. 34 GDPR? |

---

## 7. Ce va rugam sa verificati

Va prezentam mai jos punctele concrete pe care le consideram prioritare. Ordinea reflecta urgenta perceputa de noi, dar suntem deschisi sa o ajustam dupa o prima discutie.

### 7.1 DPIA — Evaluarea impactului asupra protectiei datelor
- Este evaluarea riscurilor completa si proportionala?
- Bazele legale invocate sunt corecte (in special Art. 9 pentru SafetyMonitor)?
- Termenele de retentie sunt justificate adecvat?
- Este necesara consultarea prealabila a ANSPDCP (Art. 36 GDPR)?

### 7.2 Pagina Transparenta AI
- Acopera cerintele Art. 13 AI Act (transparenta si furnizarea de informatii)?
- Formularile privind drepturile utilizatorilor sunt complete si corecte?
- Limitarile AI-ului sunt prezentate adecvat din perspectiva raspunderii?

### 7.3 Template-uri breach notification
- Conformitate cu Art. 33 GDPR (notificare ANSPDCP in 72 ore)?
- Conformitate cu Art. 34 GDPR (notificare persoane vizate)?
- Procedura interna este suficienta?

### 7.4 Privacy Policy — privire de ansamblu
- Clauzele sunt conforme cu GDPR si practica curenta?
- Sectiunile privind transferul international sunt complete?

### 7.5 Contract B2B
- Clauze standard servicii SaaS — sunt adecvate?
- Limitarea raspunderii — este formulata corect?
- Clauze specifice AI — este necesar ceva suplimentar?

### 7.6 Status AI Act in Romania
- Ce obligatii sunt deja in vigoare?
- Exista o autoritate nationala desemnata pentru supravegherea AI Act?
- Ce pasi concretі va recomandati pana la termenul de 2 august 2026?

---

## 8. Intrebari frecvente pe care le anticipam

Am compilat mai jos intrebarile pe care le-ar putea pune clientii nostri, partenerii sau autoritatile de reglementare, impreuna cu raspunsurile noastre actuale. Va rugam sa evaluati daca aceste raspunsuri sunt corecte si complete din punct de vedere juridic.

---

**"AI-ul vostru ia decizii de angajare?"**

Nu. AI-ul asista procesul de evaluare a posturilor — propune scoruri si analize ca punct de plecare. Decizia finala apartine comitetului uman de evaluare, format din reprezentanti ai companiei client si facilitatorul JobGrade. Procesul include minimum 3 etape de consens inainte de finalizare. Orice evaluare poate fi contestata si reevaluata.

---

**"Datele ajung in SUA?"**

Da, tranzitoriu. Cand platforma solicita o analiza AI, textul este trimis catre serverele Anthropic din SUA, procesat si returnat. Anthropic nu retine datele dupa procesare (zero data retention, confirmat contractual). Am realizat un Transfer Impact Assessment (TIA) si avem in loc Clauze Contractuale Standard (SCC). Nu trimitem date personale identificabile (nume, CNP, salarii individuale).

---

**"Ce se intampla daca AI-ul greseste?"**

AI-ul propune, nu decide. Fiecare scor propus de AI este validat de comitetul uman. Platforma pastreaza un trail de audit complet (cine a propus, cine a validat, ce s-a modificat). Orice evaluare poate fi contestata si reevaluata integral de comitet.

---

**"SafetyMonitor prelucreaza date de sanatate?"**

Potential, da. SafetyMonitor detecteaza pattern-uri de distres psihologic (bazate pe criterii DSM-5) si escaleaza catre psihologul uman. Calificarea juridica exacta a acestor date (date privind sanatatea conform Art. 9 GDPR sau nu) este unul dintre punctele pe care va rugam sa le evaluati. Ca masura de precautie, am tratat aceste date ca si cum ar fi categorii speciale si am inclus aceasta prelucrare in DPIA.

---

**"GDPR este respectat?"**

Am implementat: Registrul Art. 30 (17 categorii de prelucrari), DPA template pentru clientii B2B, pseudonimizare obligatorie in modulul B2C (privacy by design, doua straturi separate de stocare), termene de retentie definite si justificate, proceduri de exercitare a drepturilor. Documentele sunt pregatite — va rugam sa le validati.

---

## Anexa: Documente disponibile pentru consultare

Toate documentele mentionate in acest brief sunt disponibile in directorul `docs/` al proiectului. Cele mai relevante:

- `docs/dpia-draft.md` — Evaluarea impactului (DPIA) — draft complet
- `docs/transparenta-ai-content.md` — Continut pagina transparenta AI
- `docs/gdpr/registrul-art30.md` — Registrul Art. 30 GDPR
- `docs/gdpr/tia-anthropic.md` — Transfer Impact Assessment Anthropic
- `docs/gdpr/dpa-template.md` — Template DPA Art. 28
- `docs/situatie-completa-b2b-b2c-03apr2026.md` — Situatia completa a platformei

Va punem la dispozitie orice document suplimentar si suntem disponibili pentru clarificari.

---

*Document generat pe 08.04.2026. Versiune de lucru — se actualizeaza pe masura evolutiei platformei.*
