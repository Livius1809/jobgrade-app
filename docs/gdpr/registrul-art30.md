# Registrul prelucrărilor de date cu caracter personal

**Conform Art. 30 din Regulamentul (UE) 2016/679 (GDPR)**

---

**Operator:** Psihobusiness Consulting SRL  
**CIF:** RO15790994  
**Platforma:** JobGrade (jobgrade.ro)  
**Versiune document:** 1.0  
**Data întocmirii:** 01.04.2026  
**Ultima actualizare:** 01.04.2026  
**Responsabil document:** Liviu Stroie (persoană de contact GDPR)

---

## Registrul prelucrărilor

| Nr | Categorie date | Persoane vizate | Scopul prelucrării | Baza legală | Destinatari | Transfer UE → afară | Termen retenție* | Măsuri securitate |
|----|---------------|-----------------|-------------------|-------------|-------------|-------------------|-----------------|-------------------|
| 1 | **Cont utilizator** — email, prenume, nume, funcție, parolă (hash bcrypt), limbă preferată, dată ultimă autentificare, status cont | Utilizatori platformă (angajați client: COMPANY_ADMIN, OWNER, FACILITATOR, REPRESENTATIVE) | Crearea și gestionarea contului de utilizator; autentificare și autorizare acces la funcționalitățile platformei | Art. 6(1)(b) — Executarea contractului B2B între Psihobusiness și clientul-companie; Art. 6(1)(f) — Interes legitim pentru securitatea accesului | Vercel (hosting), Neon.tech (bază de date) | Nu — Vercel Frankfurt (UE), Neon.tech (UE) | Durata contractului B2B + 30 zile de la ștergerea contului* | Parola stocată exclusiv ca hash bcrypt; HTTPS/TLS obligatoriu; JWT cu expirare; RBAC pe 5 niveluri; izolare per tenant; audit log |
| 2 | **Autentificare OAuth** — Google/LinkedIn tokens (access_token, refresh_token, id_token, scope, token_type, provider, providerAccountId) | Utilizatori platformă care aleg autentificarea via Google sau LinkedIn | Autentificare securizată fără stocare parolă; verificare identitate utilizator | Art. 6(1)(b) — Executarea contractului; Art. 6(1)(a) — Consimțământ (utilizatorul alege activ OAuth) | Google LLC, LinkedIn Corp (furnizori OAuth), Vercel, Neon.tech | Da — Google și LinkedIn procesează date în SUA. Transfer acoperit de DPF (Data Privacy Framework) al furnizorilor OAuth | Durata sesiunii active + revocabil oricând de utilizator* | Tokenii OAuth stocați criptat; refresh tokens cu expirare; revocare automată la dezactivare cont; HTTPS obligatoriu |
| 3 | **Profil companie** — denumire, CUI, Reg. Comercial, adresă, județ, industrie, dimensiune, website, logo, misiune, viziune, valori, descriere | Companii client (persoane juridice); indirect — reprezentanții legali | Configurarea profilului organizațional pentru personalizarea evaluărilor și integrarea cu MVV-ul companiei | Art. 6(1)(b) — Executarea contractului B2B | Vercel, Neon.tech; Anthropic (doar dacă se folosește extracție AI) | Condiționat — dacă se folosește AI extraction, datele trec prin Anthropic API (SUA). Vezi nr. 8 | Durata contractului B2B + 30 zile* | Izolare per tenant; acces limitat COMPANY_ADMIN și OWNER; audit log modificări |
| 4 | **Fișe de post** — titlu, cod, scop, descriere, responsabilități, cerințe, status, analiză AI, departament, reprezentant | Angajații client (indirect, prin descrierea postului pe care îl ocupă) | Evaluarea și ierarhizarea posturilor conform metodologiei JobGrade cu 6 criterii; generare fișe de post AI | Art. 6(1)(b) — Executarea contractului B2B; Art. 6(1)(f) — Interes legitim al clientului pentru structurare organizațională | Vercel, Neon.tech; Anthropic (pentru analiza AI a fișei) | Condiționat — analiza AI prin Anthropic (SUA). Vezi nr. 8 | Durata contractului B2B + arhivare 5 ani conform legislație muncii* | Izolare per tenant; RBAC; versionare modificări; criptare în tranzit |
| 5 | **Evaluări posturi** — scoruri per criteriu, subfactori, justificări, voturi, decizii facilitator, override-uri, rezultate finale, grade salariale, rang | Angajații client (indirect — scorurile sunt per post, nu per persoană, dar corelarea cu titularul este posibilă) | Scorarea și ierarhizarea posturilor pe 6 criterii (Educație, Comunicare, Rezolvare probleme, Luarea deciziilor, Impact afaceri, Condiții muncă); atingerea consensului prin 3 runde | Art. 6(1)(b) — Executarea contractului B2B; Art. 6(1)(f) — Interes legitim al clientului | Vercel, Neon.tech | Nu — procesare exclusiv UE (scorarea e algoritmică, nu AI) | Durata contractului B2B + arhivare 5 ani* | Izolare per tenant; RBAC; audit trail complet pe voturi și decizii; mecanisme anti-manipulare (prag consens 75%) |
| 6 | **Import stat de plată (PayrollEntry)** — cod post, titlu post, departament, nivel ierarhic, familie posturi, grad calculat/evaluat, salariu bază, sporuri fixe, bonusuri anuale, comisioane, beneficii natură, tichete masă, gen, program lucru, tip contract, vechime organizație, vechime post, locație, oraș, studii, certificări, salariu total brut, cuartilă salarială | Angajații companiei client (date anonimizate — fără nume sau CNP, dar **gen + salariu + departament + oraș = date personale** conform GDPR, prin posibilitatea de re-identificare) | Analiza structurii salariale; calculul gradelor; conformitate cu Directiva EU 2023/970 privind transparența salarială; analiză pay gap | Art. 6(1)(b) — Executarea contractului B2B; Art. 6(1)(c) — Obligație legală (Directiva EU 2023/970, Art. 9); Art. 6(1)(f) — Interes legitim al clientului | Vercel, Neon.tech | Nu — procesare exclusiv UE | Durata contractului B2B + arhivare conform legislație fiscală (10 ani)* | **Măsuri sporite:** izolare per tenant; acces strict COMPANY_ADMIN/OWNER; fără stocare CNP/nume; pseudonimizare prin cod angajat; criptare la repaus (Neon.tech encryption at rest); audit log complet; export controlat |
| 7 | **Rapoarte pay gap** — indicatori agregați pe gen, număr angajați, status raport, evaluări comune (joint assessments), cauze root, planuri acțiune | Angajații companiei client (date agregate, dar cu posibilă re-identificare în departamente mici) | Conformitate cu Directiva EU 2023/970 Art. 9 — raportare pay gap; identificare și remediere disparități salariale pe gen | Art. 6(1)(c) — Obligație legală (transpunere Directivă EU 2023/970); Art. 6(1)(b) — Executarea contractului | Vercel, Neon.tech; autoritățile competente (dacă clientul raportează) | Nu — procesare exclusiv UE | Durata contractului + obligație legală raportare (minim 5 ani)* | Date agregate; praguri minime pentru raportare (evitare re-identificare în grupuri mici); acces restricționat; audit log |
| 8 | **Chat AI / Generări AI** — prompt-uri trimise la AI (pot conține date din fișe de post, descrieri companie, situații organizaționale), output AI, model folosit, tokeni consumați, credite | Utilizatori platformă (direct); angajații client (indirect, prin conținutul prompt-urilor) | Generare analize AI pentru fișe de post, anunțuri de recrutare, KPI, analiză sesiune; extragere profil companie | Art. 6(1)(b) — Executarea contractului; Art. 6(1)(f) — Interes legitim (funcționalitate core a platformei) | **Anthropic PBC** (Claude Sonnet 4, SUA) — sub-procesator; Vercel, Neon.tech | **DA — Transfer UE → SUA** prin Anthropic API. Temei juridic: **Clauze Contractuale Standard (SCC)** conform Art. 46(2)(c) GDPR + DPA cu Anthropic. Anthropic nu reține datele pentru antrenare (conform ToS API). | Durata contractului B2B + 90 zile* (log-urile AI se păstrează pentru audit credite) | Minimizare date în prompt-uri; fără trimitere CNP/nume angajați la AI; log complet al prompt-urilor; DPA cu Anthropic; monitorizare tokeni; rate limiting |
| 9 | **Knowledge Base (KB entries + buffers)** — conținut text, embeddings vectoriale, sursa, agent care a generat, tags, scor încredere, rate utilizare | Clienți (indirect — unele KB entries pot conține referințe la situații client, lexicon extras din documente client) | Baza de cunoștințe a agenților AI pentru îmbunătățirea calității răspunsurilor și recomandărilor | Art. 6(1)(f) — Interes legitim (îmbunătățirea serviciului); Art. 6(1)(b) — Executarea contractului | Vercel, Neon.tech | Nu — KB-ul se stochează exclusiv în Neon.tech (UE). Embedding-urile se generează local/UE | KB permanente: durata platformei; KB client-specific: durata contractului client + 30 zile* | Separare KB per agent; validare multi-nivel (BUFFER → PERMANENT); propagare controlată; fără stocare date personale directe în KB; audit trail |
| 10 | **Cookies și sesiuni** — session token, dată expirare, verificare tokens, JWT | Utilizatori platformă (toate persoanele care accesează jobgrade.ro) | Autentificare și menținerea sesiunii; protecție CSRF; funcționalitate platformă | Art. 6(1)(b) — Executarea contractului (cookies funcționale/necesare); Art. 6(1)(a) — Consimțământ (cookies analitice, dacă sunt implementate) | Vercel (CDN/Edge) | Nu — Vercel Frankfurt (UE) | Sesiune: până la expirare (24h); Verification tokens: până la utilizare sau expirare* | HttpOnly; Secure; SameSite=Lax; JWT semnat cu secret; rotire periodică tokens; CSRF protection |
| 11 | **Email-uri tranzacționale** — adresa email destinatar, subiect, conținut email (notificări sesiune, evaluări, rapoarte, credite) | Utilizatori platformă | Notificarea utilizatorilor despre evenimente relevante (lansare sesiune, evaluări completate, rapoarte generate, credite scăzute, facturi) | Art. 6(1)(b) — Executarea contractului; Art. 6(1)(f) — Interes legitim (comunicare operațională) | **Resend Inc.** (furnizor email tranzacțional) | Condiționat — Resend procesează email-uri prin infrastructura proprie. Verificare necesară dacă serverele sunt în UE sau SUA. Se aplică DPA + SCC dacă transfer extra-UE* | Log-uri email: 30 zile la Resend; conținut email: nu se stochează de noi* | HTTPS/TLS pentru trimitere; fără date sensibile în corpul email-ului; link-uri cu token temporar; DPA cu Resend |
| 12 | **Notificări push** — canal ntfy, titlu, conținut notificare | Owner platformă (Liviu); opțional utilizatori admin | Alertare Owner despre evenimente critice (escaladări, decizii necesare, rapoarte zilnice) | Art. 6(1)(f) — Interes legitim (operarea platformei) | **ntfy.sh** (serviciu open-source notificări push) | Condiționat — ntfy.sh este self-hosted sau cloud. Dacă se folosește instanța publică, serverele pot fi extra-UE* | Notificări: tranzitorii, nu se persistă de noi; ntfy reține max 12h* | Canal dedicat (ntfy.sh/jobgrade-owner-liviu-2026); fără date personale ale clienților în notificări; HTTPS |
| 13 | **Facturare** — date card (prin Stripe, NU stocate de noi), Stripe Customer ID, tranzacții credite (sume, descriere, dată), plan abonament | Companii client (persoană juridică); indirect — persoana care efectuează plata | Procesarea plăților pentru abonamente și credite; evidență financiară | Art. 6(1)(b) — Executarea contractului; Art. 6(1)(c) — Obligație legală (legislație fiscală) | **Stripe Inc.** (procesator plăți PCI-DSS); Vercel, Neon.tech (doar Stripe Customer ID + tranzacții credite) | Condiționat — Stripe procesează plăți global dar este certificat PCI-DSS Level 1 și operat sub DPF + SCC | Conform legislație fiscală: 10 ani pentru documente financiare; Stripe Customer ID: durata contractului* | **NU stocăm date card** — Stripe PCI-DSS Level 1; doar referință Stripe Customer ID; audit trail tranzacții; reconciliere automată |
| 14 | **Memorii client (ClientMemory)** — observații și învățăminte despre interacțiunile cu clientul, categorie, importanță, tags, dată expirare | Companii client (persoană juridică); indirect — persoanele de contact | Personalizarea interacțiunilor cu clientul; reținerea preferințelor și contextului de comunicare | Art. 6(1)(f) — Interes legitim (calitatea serviciului) | Vercel, Neon.tech | Nu — stocare exclusiv UE | Durata contractului + 30 zile; memoriile cu dată expirare se șterg automat* | Izolare per tenant; acces limitat la agenții relevanți; clasificare importanță; fără date sensibile |
| 15 | **Cereri angajați (EmployeeRequest)** — email solicitant, tip cerere (Art. 7 Directiva EU 2023/970), detalii cerere, răspuns, status | Angajații companiei client (direct — exercitarea dreptului la informare salarială) | Conformitate cu Directiva EU 2023/970 Art. 7 — dreptul angajaților de a solicita informații despre nivelul salarial și criteriile de stabilire | Art. 6(1)(c) — Obligație legală (transpunere Directivă EU 2023/970) | Vercel, Neon.tech | Nu — procesare exclusiv UE | Conform legislație muncii: minim 3 ani de la răspuns; termen răspuns: conform Directivă* | Acces restricționat; audit trail; notificări termen depășit; criptare în tranzit |
| 16 | **Loguri management proactiv (CycleLog, Escalation)** — rol agent, acțiuni (TRACK/INTERVENE/ESCALATE), descrieri, priorități, rezoluții | Sistem intern (agenți AI); indirect — pot conține referințe la situații client | Monitorizarea și gestionarea autonomă a platformei; escaladare probleme; asigurarea calității serviciului | Art. 6(1)(f) — Interes legitim (operarea și îmbunătățirea platformei) | Vercel, Neon.tech | Nu — procesare exclusiv UE | 1 an pentru loguri operaționale; escaladări nerezolvate: până la rezolvare* | Acces limitat la agenți manageri; fără date personale directe ale clienților; audit trail |
| 17 | **Sesiuni brainstorming** — topic, context, idei generate, scoruri, raționale, participanți (agenți AI) | Sistem intern (agenți AI) | Generare și evaluare idei pentru îmbunătățirea platformei și serviciilor | Art. 6(1)(f) — Interes legitim (inovare și dezvoltare) | Vercel, Neon.tech; Anthropic (pentru generare idei) | Condiționat — dacă generarea implică Anthropic API. Vezi nr. 8 | 1 an* | Fără date personale în sesiuni de brainstorming; acces intern |

---

## Note importante

### Termene de retenție — APROBATE de Owner (02.04.2026)

| Nr registru | Categorie | Termen retenție aprobat | Baza |
|---|---|---|---|
| 1 | Cont utilizator B2B | Durata contractului + 3 ani | Prescripție comercială Art. 2517 Cod Civil |
| 2 | Autentificare OAuth | Durata sesiunii + revocare la cerere | Tehnic |
| 3 | Profil companie | Durata contractului + 3 ani | Prescripție comercială |
| 4 | Fișe de post | Durata contractului + 5 ani | Codul Muncii + Legea transparență salarială |
| 5 | Evaluări posturi | Durata contractului + 5 ani | Codul Muncii + Legea transparență salarială |
| 6 | Stat de plată (brut per client) | 24 luni sau terminare contract (ce vine primul) | Interes legitim — comparație YoY |
| 6* | Stat de plată (agregate anonime, min 5/celulă) | Fără limită — nu sunt date personale | Recital 26 GDPR |
| 7 | Rapoarte pay gap | Durata contractului + 5 ani | Directiva EU 2023/970 |
| 8 | Chat AI / Generări AI | 6 luni (conversații raw); cunoașterea distilată în ClientMemory pe durata contractului | Minimizare + interes legitim |
| 9 | Knowledge Base | KB permanent: durata platformei; KB client-specific: durata contract + 30 zile | Operațional |
| 10 | Cookies/sesiuni | Până la expirare (24h) | Tehnic |
| 11 | Email-uri tranzacționale | 30 zile la Resend; nu stocăm | Operațional |
| 12 | Notificări push | Tranzitorii, max 12h | Operațional |
| 13 | Facturare | 10 ani | Art. 25 Cod Fiscal |
| 14 | Memorii client | Durata contractului + 30 zile | Interes legitim |
| 15 | Cereri angajați Art. 7 | 3 ani de la răspuns | Legislația muncii |
| 16 | Loguri management | 12 luni | Securitate + audit |
| 17 | Brainstorming | 12 luni | Operațional intern |

**B2C (planificat):**

| Categorie | Termen | Nota |
|---|---|---|
| Cont B2C | Email obligatoriu, pseudonim default | Privacy by design Art. 25 GDPR |
| Profil psihologic B2C | Durata abonament + 6 luni | Legat de pseudonim, nu de identitate reală |
| Facturare B2C | 10 ani (strat separat de profil) | Obligație fiscală; nelinkuit de profilul psihologic |
| Notificare ștergere B2C | 30/60/90 zile înainte | Export gratuit oricând (PDF) |

### Transfer internațional — Anthropic API (prioritate ridicată)

**Anthropic PBC** (San Francisco, SUA) este principalul sub-procesator care implică transfer de date UE → SUA. Măsuri implementate:

1. **Clauze Contractuale Standard (SCC)** — conform Deciziei de punere în aplicare (UE) 2021/914 a Comisiei
2. **DPA (Data Processing Agreement)** cu Anthropic — în vigoare prin ToS API
3. **Anthropic nu reține datele** trimise prin API pentru antrenarea modelelor (conform Terms of Service API, secțiunea privind datele clienților)
4. **Minimizare:** prompt-urile nu conțin nume, CNP sau date direct identificabile ale angajaților
5. **Evaluare impact transfer (TIA):** realizată — vezi `docs/gdpr/tia-anthropic.md`

### Măsuri tehnice transversale

- **Criptare în tranzit:** TLS 1.2+ pe toate conexiunile
- **Criptare la repaus:** Neon.tech encryption at rest (AES-256)
- **Izolare multi-tenant:** Toate datele sunt izolate per Tenant ID cu cascade delete
- **RBAC:** 5 niveluri de rol (SUPER_ADMIN, COMPANY_ADMIN, OWNER, FACILITATOR, REPRESENTATIVE)
- **Autentificare:** NextAuth v5 cu JWT, opțional OAuth (Google/LinkedIn)
- **Hosting:** Vercel Frankfurt (eu-central-1), Neon.tech EU
- **Backup:** Conform politica Neon.tech (point-in-time recovery)
- **Logging:** Audit trail pe operațiuni critice
- **Pseudonimizare:** PayrollEntry folosește cod angajat, fără nume/CNP

### Revizuire

Acest registru se revizuiește:
- **Obligatoriu:** la orice modificare a prelucrărilor (adăugare funcționalitate, schimbare sub-procesator)
- **Periodic:** cel puțin o dată la 6 luni
- **La cererea ANSPDCP:** în termen de 48 de ore

---

**Întocmit de:** Liviu Stroie (persoană de contact GDPR)  
**Data:** 01.04.2026  
**Termene retenție aprobate:** 02.04.2026  
**Semnătura:** ___________________________
