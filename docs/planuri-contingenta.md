# Planuri de Contingență — JobGrade

**Ultima actualizare:** 2026-04-08
**Responsabil:** Owner + COG
**Clasificare:** Document intern — nu se partajează cu clienții

---

## 11.1 Anthropic API indisponibil > 1 oră

### Ce funcționează fără API
- Navigare platformă, dashboard-uri, management utilizatori
- Consultare rapoarte deja generate (cache comercial)
- Descărcare PDF-uri existente
- Autentificare, management sesiuni, CRUD posturi
- Mesaj degraded mode afișat automat în interfață

### Ce NU funcționează
- Chat conversațional (toți agenții AI)
- Evaluare AI-asistată (scoring, sugestii, calibrare)
- Distilare KB (post-sesiune)
- Generare rapoarte noi (RDA, CIA, DMA)
- Profilare B2C

### Acțiuni imediate
1. **Detectare automată:** healthcheck n8n (FLUX-041) verifică API la fiecare 5 min
2. **Notificare Owner:** ntfy.sh/jobgrade-owner-liviu-2026 — alertă imediată
3. **Banner automat:** platforma afișează mesaj degraded mode pentru utilizatori
4. **Monitorizare:** verificare Anthropic Status Page (https://status.anthropic.com)
5. **Așteptare:** nu se escaladează către clienți dacă durata estimată < 2h

### Template comunicare internă (Slack/ntfy)
```
[INCIDENT] API Anthropic indisponibil de la HH:MM
Status: degraded mode activ
Impact: chat și evaluări AI suspendate
Acțiune: monitorizăm, nu necesită intervenție manuală
ETA restabilire: conform status.anthropic.com
```

---

## 11.2 Anthropic API indisponibil > 24 ore

### Escaladare
1. **Ora 1-4:** monitorizare pasivă (vezi 11.1)
2. **Ora 4-8:** pregătire comunicare către clienți cu sesiuni active
3. **Ora 8-24:** notificare clienți afectați, propunere extensie deadline sesiuni
4. **Ora 24+:** activare proceduri manuale

### Workaround-uri manuale (doar dacă depășim 24h)
- Evaluările se pot completa manual (scoruri introduse direct, fără sugestii AI)
- Rapoartele existente rămân disponibile
- Sesiunile de consens se pot derula fără facilitare AI
- Se amână: distilare KB, generare rapoarte noi, onboarding B2C

### Template comunicare clienți
```
Subiect: JobGrade — Servicii AI temporar indisponibile

Bună ziua [Nume],

Vă informăm că furnizorul nostru de inteligență artificială se confruntă cu o
întrerupere extinsă de serviciu. Platforma JobGrade funcționează, dar
funcționalitățile asistate de AI (evaluare automată, chat, generare rapoarte)
sunt temporar suspendate.

Ce puteți face:
- Consultați rapoartele deja generate — sunt disponibile integral
- Completați evaluări manual — scorul se introduce direct
- Deadline-urile sesiunilor active au fost extinse automat cu [N] zile

Vom reveni cu o confirmare imediat ce serviciile sunt restabilite.

Cu stimă,
Echipa JobGrade
```

---

## 11.3 Pierdere date Neon DB

### Niveluri de recuperare

**Pas 1 — Neon PITR (Point-in-Time Recovery)**
- Plan Pro: restaurare la orice punct din ultimele 7 zile
- Plan Business: ultimele 30 de zile
- Acțiune: Neon Console → Branch → Restore → selectare timestamp anterior incidentului
- Timp estimat: 5-15 minute
- Risc pierdere date: doar tranzacțiile între momentul restaurat și incident

**Pas 2 — Restaurare din pg_dump backup**
- Backup-uri programate: conform `docs/procedura-backup-restore.md`
- Restaurare: `pg_restore --clean --if-exists -d $DATABASE_URL backup_YYYYMMDD.dump`
- Timp estimat: 15-60 minute (depinde de dimensiune)
- Risc: pierdere date de la ultimul backup până la incident

**Pas 3 — Notificare clienți (dacă date pierdute irecuperabil)**
- Se aplică doar dacă nici PITR nici backup nu acoperă datele pierdute
- Obligație GDPR Art. 34 dacă sunt implicate date personale
- Template: vezi secțiunea 11.6

### Obiective de recuperare
| Metric | Target | Observații |
|--------|--------|-----------|
| **RTO** (Recovery Time Objective) | < 1 oră | Restaurare PITR + redeploy |
| **RPO** (Recovery Point Objective) | < 1 oră | PITR continuu pe plan Pro |
| **RPO worst case** | < 24 ore | Dacă PITR indisponibil, backup zilnic |

### Acțiuni post-recuperare
1. Verificare integritate date (count pe tabele principale)
2. Test funcțional rapid (login, listare sesiuni, deschidere raport)
3. Notificare Owner cu raport pierdere date (dacă există)
4. Post-mortem în 48h

---

## 11.4 Vercel — indisponibilitate extinsă

### Context
- Vercel SLA: 99.99% uptime (< 52 min downtime/an)
- Indisponibilitate > 30 min este excepțional de rară

### Acțiuni
| Durată | Acțiune |
|--------|---------|
| **< 30 min** | Așteptare. Monitorizare https://vercel-status.com |
| **30 min - 2h** | Notificare Owner, pregătire comunicare clienți |
| **2h - 4h** | Comunicare proactivă către clienții cu sesiuni active |
| **> 4h** | Activare plan DNS switch (vezi mai jos) |

### Plan DNS switch (doar > 4h)
1. Build local: `npm run build && npm run start` pe server de rezervă (VPS pregătit)
2. Actualizare DNS: jobgrade.ro → IP server de rezervă (TTL scurt, deja configurat la 300s)
3. Propagare DNS: 5-30 minute
4. Limitări pe server de rezervă: fără edge functions, fără ISR, performanță redusă
5. Revenire la Vercel imediat ce este restabilit

### Template comunicare
```
Subiect: JobGrade — Întrerupere temporară de serviciu

Bună ziua,

Platforma JobGrade este temporar indisponibilă din cauza unei probleme la
furnizorul nostru de hosting. Lucrăm la restabilirea accesului.

Datele dumneavoastră sunt în siguranță — baza de date nu este afectată.

Vă vom notifica imediat ce platforma revine online.

Echipa JobGrade
```

---

## 11.6 Breșă de securitate (data breach)

### Cadru legal
- **GDPR Art. 33:** notificare ANSPDCP în maxim 72 de ore de la constatare
- **GDPR Art. 34:** notificare persoane afectate dacă riscul este ridicat
- **DPO:** coordonează întregul proces

### Pași de răspuns

**1. DETECTARE (0-1h)**
- Sursa alertei: Sentry, monitorizare acces, raport utilizator, audit log
- Confirmare: este breșă reală sau fals pozitiv?
- Înregistrare timestamp precis al detectării (declanșează ceasul de 72h)

**2. IZOLARE (1-2h)**
- Revocare token-uri/sesiuni compromise
- Blocare IP-uri suspecte la nivel Vercel/Cloudflare
- Dezactivare endpoint-uri afectate dacă necesar
- Schimbare credențiale compromise (DB, API keys, Resend)
- NU se șterg log-uri — sunt dovezi

**3. EVALUARE (2-12h)**
- Ce date au fost accesate/exfiltrate?
- Câți utilizatori/tenants sunt afectați?
- Ce categorii de date personale? (nume, email, date evaluare, scoruri)
- Evaluare nivel risc pentru persoanele afectate (scăzut/mediu/ridicat)
- Documentare completă a incidentului

**4. NOTIFICARE ANSPDCP — maxim 72h de la detectare**

**5. NOTIFICARE PERSOANE AFECTATE — fără întârziere nejustificată (dacă risc ridicat)**

**6. REMEDIERE (1-7 zile)**
- Patch vulnerabilitate exploatată
- Audit securitate extins
- Rotație completă de credențiale
- Verificare că atacatorul nu are acces persistent (backdoor)

**7. REVIEW POST-INCIDENT (7-14 zile)**
- Post-mortem documentat
- Actualizare proceduri
- Comunicare lecții învățate intern

### Template notificare ANSPDCP (Art. 33)

```
NOTIFICARE ÎNCĂLCARE SECURITATE DATE PERSONALE

Operator: Psihobusiness Consulting SRL, CIF RO15790994
DPO: [Nume DPO], [email DPO], [telefon DPO]

1. Data și ora constatării: [DD.MM.YYYY, HH:MM]

2. Natura încălcării:
   [Descriere: acces neautorizat / divulgare / pierdere / alterare]

3. Categorii de date afectate:
   [Nume, email, funcție, date evaluare, scoruri ierarhizare, etc.]

4. Categorii de persoane vizate:
   [Utilizatori platformă B2B — angajați ai companiilor cliente]

5. Număr aproximativ persoane afectate: [N]

6. Număr aproximativ înregistrări afectate: [N]

7. Consecințe probabile:
   [Risc de uzurpare identitate / prejudiciu reputațional / etc.]

8. Măsuri luate sau propuse:
   - [Izolare imediată a sistemului afectat]
   - [Revocare acces, rotație credențiale]
   - [Notificare persoane afectate — da/nu și motivul]
   - [Audit securitate în curs]

9. Comunicare către persoanele vizate:
   [Da / Nu — motivul conform Art. 34 alin. 3]

Semnătura DPO: _______________
Data: _______________
```

### Template notificare utilizatori (Art. 34)

```
Subiect: Notificare privind securitatea datelor dumneavoastră — JobGrade

Stimate/Stimată [Nume],

Vă scriem pentru a vă informa despre un incident de securitate care a afectat
platforma JobGrade și care ar putea implica date personale asociate contului
dumneavoastră.

CE S-A ÎNTÂMPLAT
[Descriere clară, fără jargon tehnic, a naturii incidentului]

CE DATE AU FOST AFECTATE
[Lista categoriilor: nume, email, funcție, scoruri evaluare etc.]

CE AM FĂCUT
- Am izolat imediat sistemul afectat
- Am remediat vulnerabilitatea exploatată
- Am notificat Autoritatea Națională de Supraveghere (ANSPDCP)
- Am efectuat un audit complet de securitate

CE VĂ RECOMANDĂM
- Schimbați-vă parola pentru contul JobGrade
- Dacă folosiți aceeași parolă pe alte platforme, schimbați-o și acolo
- Fiți atenți la emailuri suspecte care pretind că vin de la JobGrade

CONTACT
Pentru orice întrebări, ne puteți contacta:
- DPO: [email DPO]
- Suport: suport@jobgrade.ro

Ne cerem scuze pentru inconvenientul creat și vă asigurăm că am luat toate
măsurile necesare pentru a preveni repetarea unui astfel de incident.

Cu stimă,
[Nume responsabil]
Psihobusiness Consulting SRL
```

---

## 11.9 Costuri AI depășesc bugetul cu 5x

### Praguri de alertă
| Prag | Acțiune |
|------|---------|
| **1.5x buget** | Alertă Owner, investigare cauză |
| **2x buget** | Reducere automată: dezactivare cicluri proactive non-critice |
| **3x buget** | Dezactivare completă agenți non-esențiali |
| **5x buget** | KILL SWITCH — doar healthcheck rămâne activ |

### Kill switch — ce se oprește
- Toate apelurile Claude din agenți (chat, evaluare, distilare, brainstorm)
- Cicluri proactive management (4h/12h/24h)
- Cross-pollination, reflecție, cold start KB
- Monitorizare marketing și sales outreach automat

### Kill switch — ce rămâne activ
- Platforma web (fără funcționalități AI)
- Baza de date, autentificare, CRUD
- Healthcheck infrastructură
- Degraded mode messaging

### Implementare
```typescript
// Variabilă de mediu: KILL_SWITCH_AI=true
// Verificare la intrarea în orice endpoint /api/agents/*
if (process.env.KILL_SWITCH_AI === "true") {
  return NextResponse.json(
    { error: "Serviciile AI sunt temporar suspendate." },
    { status: 503 }
  )
}
```

### Investigare cauze posibile
1. **Abuz:** un tenant generează volum anormal → throttle/blocare tenant
2. **Bug:** loop infinit în workflow n8n sau recursie agent → fix + redeploy
3. **Scalare neașteptată:** mulți clienți noi simultan → recalculare buget, creștere prag
4. **Atac:** prompt injection care generează răspunsuri lungi → hardening input validation

### Comunicare clienți
```
Subiect: JobGrade — Funcționalități AI temporar suspendate

Bună ziua [Nume],

Din motive operaționale, funcționalitățile bazate pe inteligență artificială
din platforma JobGrade sunt temporar suspendate. Platforma rămâne accesibilă
pentru consultare rapoarte, management sesiuni și operațiuni curente.

Vom restabili funcționalitățile AI în cel mai scurt timp.

Cu stimă,
Echipa JobGrade
```

---

## 11.10 Owner indisponibil > 48 ore

### Ce rulează automat (fără intervenție Owner)
- Workflow-uri n8n programate (cron-uri: healthcheck, backup, rapoarte zilnice)
- SafetyMonitor B2C (niveluri CRITIC și RIDICAT gestionează automat)
- Degraded mode (se activează automat la detectarea problemelor)
- Notificări automate pe ntfy.sh (se acumulează necitite)
- Răspunsuri automate suport nivel 1 (triaj, FAQ)
- Docker auto-restart (restart: unless-stopped)

### Ce se oprește / nu poate continua
- Decizii strategice (pricing, funcționalități noi, parteneriate)
- Aprobare propuneri COG care necesită Owner
- Deploy-uri în producție (necesită aprobare manuală)
- Escaladări care au ajuns la nivel Owner
- Comunicare către clienți în situații de criză
- Contracte noi, oferte comerciale

### Ce se degradează
- Ciclurile proactive de management continuă dar escaladările rămân în coada de așteptare
- Rapoartele COG se generează dar nu se acționează pe ele
- Alertele se acumulează fără răspuns

### Procedură curentă
1. **0-48h:** funcționare normală, Owner răspunde la escaladări
2. **48h+:** COG trece în modul conservator (nu inițiază schimbări, doar menține)
3. **72h+:** mesaj automat către Owner pe toate canalele (email, ntfy, SMS dacă configurat)
4. **7 zile+:** sistem intră în modul de conservare completă

### Viitor: backup uman cu acces limitat
- Se va desemna o persoană de încredere cu acces la:
  - Dashboard Owner (doar vizualizare)
  - Vercel (doar rollback, nu deploy nou)
  - Neon (doar restaurare backup, nu modificare)
  - ntfy.sh (citire alerte)
- Fără acces la: cod sursă, credențiale API, date clienți, decizii strategice
- Documentație separată pentru această persoană (proceduri pas cu pas)
- **Status:** neimplementat — de planificat în Q3 2026

---

## Anexă: Matrice de severitate

| Severitate | Exemple | Timp răspuns | Cine decide |
|------------|---------|--------------|-------------|
| **S1 — Critică** | Breach securitate, pierdere date | < 1h | Owner + DPO |
| **S2 — Majoră** | API down > 4h, costuri 3x+ | < 4h | Owner |
| **S3 — Moderată** | API down < 4h, Vercel down < 2h | < 24h | COG |
| **S4 — Minoră** | Degradare performanță, erori non-critice | < 72h | COG autonom |
