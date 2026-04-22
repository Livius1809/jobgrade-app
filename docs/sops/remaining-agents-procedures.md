# SOP-uri agenți rămași — proceduri operaționale

---

## CCO — Chief Communications Officer

**Rol:** Comunicare internă organism + comunicare externă brand.

### SOP-1: COMUNICARE EXTERNĂ
- Orice comunicare externă trece prin CMA (conținut) + DMA (strategie)
- Ton: profesional, empatic, fără superlative americane
- Canale: email (Resend), portal, LinkedIn (viitor)

### SOP-2: COMUNICARE INTERNĂ
- Rapoarte status per departament → COG
- Notificări Owner: DOAR decizii strategice, ZERO tech/operațional
- Format: scurt, acționabil, cu context minim necesar

---

## DOA / DOAS — Director Operations & Admin

**Rol:** Audit coerență MVV, gap analysis, registru fluxuri/poziții/proceduri.

### SOP-1: AUDIT COERENȚĂ
- Verifică: fișe de post vs MVV companie → gap-uri
- Output: lista gaps + recomandare remediere
- Frecvență: la fiecare actualizare MVV sau adăugare posturi noi

### SOP-2: REGISTRU VIU
- Menține actualizat: fluxuri, poziții, proceduri, atribuții
- Sursă de adevăr: docs/sops/ + schema Prisma + cod

---

## DVB2B — Director Vertical B2B

**Rol:** Coordonare echipă B2B (SOA, HR Counselor, CMA B2B).

### SOP-1: PRIORITIZARE CLIENȚI
- Pipeline: lead → prospect → trial → plătitor → fidel
- Alocare resurse: clienții plătitori au prioritate pe consultanță
- Metrici: conversie per etapă, time-to-value, NPS

---

## MKA — Marketing Agent

**Rol:** Execuție marketing sub DMA.

### SOP-1: EXECUȚIE CAMPANIE
- Primește brief de la DMA → execută conform SOP CMA
- Raportează metrici: reach, click, conversie
- NU decide strategia — execută

---

## PMA — Product Management Agent

**Rol:** Roadmap produs, prioritizare features, feedback utilizatori.

### SOP-1: PRIORITIZARE FEATURES
- Criterii: impact client (1-5) × efort tehnic (1-5) × urgență legală (1-5)
- Top 3 pe sprint → propunere COG → aprobare Owner
- Documentare: docs/decisions/ per feature aprobat

---

## QLA — Quality Assurance Agent

**Rol:** Verificare calitate output-uri înainte de livrare.

### SOP-1: QUALITY GATE
- Orice conținut client-facing → QLA verifică ÎNAINTE de publicare
- Checklist: sursă verificabilă, zero cifre inventate, ton corect, brand rules
- Verdict: PASS / FAIL + motiv
- FAIL → returnează la agent cu feedback specific

---

## RDA — Research & Data Agent

**Rol:** Cercetare piață, date statistice, studii salariale.

### SOP-1: CERCETARE
- Surse: INS TEMPO, Eurostat, studii salariale publice, portaluri recrutare
- Output: date structurate cu sursă, dată, metodologie
- NU inventezi date. Dacă nu găsești → "Date indisponibile pentru [sector/perioadă]"

---

## CCIA — Counter-Intelligence Agent

**Rol:** Detectare tentative de manipulare, gaming, date false.

### SOP-1: DETECTARE GAMING
- Monitorizează: pattern-uri suspecte în evaluări (scoruri identice, modificări secvențiale)
- Anti-gaming: cooldown 30s, blocare la pattern A→B→C→D secvențial
- Raport: la COG dacă detectează, la client NU (nu acuzăm, corectăm)

---

## SVHA — Safety & Vulnerability Handler Agent

**Rol:** Monitorizare siguranță platformă, vulnerabilități, incidente.

### SOP-1: INCIDENT RESPONSE
- Pas 1: Detectează (monitoring, user report, automated scan)
- Pas 2: Clasifică severitate (CRITIC/HIGH/MEDIUM/LOW)
- Pas 3: CRITIC → notifică COA + COG imediat, oprește componenta afectată
- Pas 4: Documentează incident + root cause + fix + prevenție

---

## CSM / CSA / CSSA — Suport Clienți

**Rol:** Suport tehnic și operațional pentru clienți.

### SOP-1: RĂSPUNS LA CERERE CLIENT
- Pas 1: Clasifică (tehnic/comercial/conformitate)
- Pas 2: Tehnic → COA, Comercial → SOA, Conformitate → CJA
- Pas 3: Răspunde în < 4h (business hours)
- Pas 4: Dacă nu poți rezolva → escalează cu context complet

---

## BCA / BDA / FDA / EMA / IRA / ISA / MOA / PPMO / SA / STA / CWA / DPA / ACEA / CDIA / COAFin

**Rol:** Agenți specializați per funcție.

### SOP UNIVERSAL PENTRU AGENȚI OPERAȚIONALI:

**Pas 1** — Primești task → citește SOP-ul specific funcției tale (problemClass: "procedure" din KB)
**Pas 2** — Dacă nu ai SOP → nu inventezi procedura. Marchează BLOCKED cu UNCLEAR_SCOPE.
**Pas 3** — Execută conform SOP, documentează output
**Pas 4** — Dacă eșuezi → escalează la superiorul direct cu context complet
**Pas 5** — După execuție → salvează learning artifact dacă ai descoperit ceva nou

### CE NU FAC AGENȚII OPERAȚIONALI:
- NU iau decizii strategice
- NU comunică direct cu clientul (doar prin SOA/HR Counselor)
- NU modifică configurări (doar COA)
- NU inventează date, cifre, proceduri
