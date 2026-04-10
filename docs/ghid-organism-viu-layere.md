# Ghid Owner — Organismul Viu în 8 Layere

**Document practic pentru interpretarea Owner Dashboard**

Platforma JobGrade este construită ca un **organism viu**: 8 layere (straturi) care împreună formează un sistem cu conștiință, obiective, acțiune, echilibru, apărare, metabolism, evoluție și ritm. Fiecare layer are sub-factori pe care îi poți vedea direct în dashboard, cu coduri de culoare:

- **Verde (HEALTHY)** — parametru în limite normale, nimic de făcut
- **Galben (WARNING)** — devieri ușoare, merită verificat
- **Roșu (CRITICAL)** — intervenție necesară, posibil escaladare

Acest ghid explică, pentru fiecare layer și fiecare sub-factor:
1. Ce înseamnă (limbaj simplu)
2. Cum se calculează (sursa reală din cod)
3. Pragurile exacte la care se schimbă culorile
4. Ce trebuie făcut când e roșu sau galben
5. Cine influențează acel număr

> Sursa de adevăr pentru praguri este `src/lib/owner/cockpit-aggregator.ts`. Sursa datelor este `src/app/api/v1/owner/cockpit/route.ts`. Orice modificare a pragurilor se face acolo, nu în acest document.

---

## 1. AWARENESS (Conștiință)

**Analogie biologică:** Sistemul senzorial al organismului — ochii, urechile, pielea. Ce semnale captează organismul din mediul extern și ce înțeles le dă.

**Ce reprezintă în platformă:** Fluxul de informație din afara JobGrade (știri, schimbări legislative, mișcări competitori, tendințe RSS) și temele strategice pe care observatorul COSO le extrage din acest flux.

**Sub-factori afișați:** `Semnale 24h`, `Teme strategice`

### 1.1 Semnale 24h

- **Ce înseamnă:** Numărul de semnale externe captate în ultimele 24 de ore din sursele RSS și conectorii configurați (6 RSS live la momentul livrării).
- **Cum se măsoară:** `count(*)` pe tabela `external_signals` cu `capturedAt >= now - 24h`. Vezi linia `prisma.externalSignal.count(...)` în endpoint-ul cockpit.
- **Impact asupra cui:** CIA (Competitive Intelligence Agent), DJA (Director Juridic), observatorul strategic COSO, Owner (decizii informate).
- **Valori MICI (0):** WARNING — sistemul nu captează nimic. Ori FLUX-047 (cron-ul RSS) nu rulează, ori sursele au murit, ori API-ul ingest e blocat. Organismul e "letargic" — nu vede mediul.
- **Valori MARI (10-100+):** HEALTHY — captare activă. Nu există un plafon "rău" aici; mai multe semnale = mai multă materie primă pentru pattern extractor.
- **Praguri exacte:**
  - `0` → WARNING
  - `>= 1` → HEALTHY
- **Cum aduci la verde:**
  1. Verifică că FLUX-047 rulează în n8n (External Signals Ingest)
  2. Testează manual un POST pe `/api/v1/external-signals` cu internal key
  3. Verifică că sursele RSS sunt încă live (`curl` pe URL-urile din seed)
  4. Dacă e totul ok dar 0 semnale — probabil weekend/sărbătoare când presa tace; verifică peste 4-6h
- **Cine poate influența:** FLUX-047 (cron n8n la 6h), CIA agent, Owner (poate forța captare manuală sau adăuga surse noi).

### 1.2 Teme strategice

- **Ce înseamnă:** Numărul de teme strategice generate de observatorul COSO din agregarea semnalelor recente. O "temă" e un pattern recurent cu severitate și confidence calculate (ex: "pressure pe GDPR compliance", "competitori lansează produse similare").
- **Cum se măsoară:** Call intern la `/api/v1/strategic-themes?windowHours=168` (7 zile). Temele au câmpuri `severity` (LOW/MEDIUM/HIGH/CRITICAL) și `confidence` (LOW/MEDIUM/HIGH).
- **Impact asupra cui:** Owner (decizii strategice), COG (coordonează răspuns), A2 ObjectiveHealth (folosește temele ca input pentru riscul obiectivelor).
- **Valori MICI (0-3 teme, toate LOW):** HEALTHY — mediu calm, nimic urgent
- **Valori MARI cu CRITICAL:** CRITICAL — o temă de severitate critică cere atenție Owner imediat
- **Valori MARI cu HIGH sau confidence HIGH:** WARNING — merită investigat în următoarele 24-48h
- **Praguri exacte:**
  - Orice temă cu `severity === "CRITICAL"` → layer-ul devine CRITICAL
  - Orice temă cu `severity === "HIGH"` sau `confidence === "HIGH"` → WARNING
  - Restul → HEALTHY
- **Cum aduci la verde:**
  1. Deschide tema (vizibilă în decizii sau în `/api/v1/strategic-themes`)
  2. Clasific-o: e reală sau fals pozitiv?
  3. Dacă e reală → delegă COG să formuleze un plan de răspuns
  4. Dacă e fals pozitiv → ajustează regula de observare în `strategic-observer.ts`
  5. Temele se recalculează automat pe măsură ce semnalele vechi (>168h) ies din fereastră
- **Cine poate influențea:** `strategic-observer.ts` (rule-based), observatorul COSO, Owner (marchează teme ca rezolvate sau fals pozitive).

---

## 2. GOALS (Obiective)

**Analogie biologică:** Sistemul teleologic — "ce vrea" organismul. La oameni: scopuri pe termen lung. La organism: obiective organizaționale măsurabile.

**Ce reprezintă în platformă:** Obiectivele business scoped per Business (JobGrade are 3 seed: `b2b-first-client`, `kb-validity-high`, `b2c-card-live`). Fiecare are `targetValue`, `currentValue`, `direction` (INCREASE/DECREASE/MAINTAIN/REACH), `priority` și se calculează `healthScore` 0-100 prin `computeObjectiveHealth()`.

**Sub-factori afișați:** `Active`, `Atinse`, `Sănătate medie`

### 2.1 Active

- **Ce înseamnă:** Câte obiective sunt în stare activă (nu ARCHIVED, nu SUSPENDED, nu MET-completed). Adică câte lucruri urmărește organismul chiar acum.
- **Cum se măsoară:** `objectives.filter(o => o.status !== "ARCHIVED" && o.status !== "SUSPENDED").length`
- **Impact asupra cui:** Toți agenții cu `ownerRoles` sau `contributorRoles` pe obiective (CCO pentru B2B, CKA pentru KB, CJA pentru B2C card).
- **Valori MICI (0-2):** Normal pentru un business la început. Sub 2, organismul nu e foarte ambițios — verifică dacă nu lipsesc obiective importante.
- **Valori MARI (10+):** Atenție la focus — prea multe obiective active înseamnă dispersie.
- **Praguri exacte:** Acest sub-factor este mereu HEALTHY (nu are prag propriu). Culoarea depinde de `Sănătate medie` și `risc`.
- **Cum aduci la verde:** Sub-factorul nu devine roșu de la sine. Dacă ai 0 obiective active, creează-le prin `/api/v1/objectives` POST.
- **Cine poate influența:** Owner (creează/arhivează obiective), sistemul (auto-MET când `currentValue` atinge `targetValue`).

### 2.2 Atinse

- **Ce înseamnă:** Câte obiective au `status === "MET"` — au atins targetul.
- **Cum se măsoară:** `active.filter(o => o.status === "MET").length`
- **Impact asupra cui:** Morale indicator — arată progres real. Input pentru `G1 Service Outcomes` și rapoarte Owner.
- **Valori MARI:** HEALTHY — organismul livrează. Sărbătorește!
- **Valori MICI (0):** Nu e un semnal roșu în sine — poate că obiectivele sunt încă în progres. Se corelează cu `Sănătate medie`.
- **Praguri exacte:** Mereu HEALTHY ca afișaj; e informativ.
- **Cum aduci la verde:** Nu există acțiune directă — obiectivele se ating prin munca agenților + intervenții Owner pe deal-uri reale.
- **Cine poate influența:** Agenții owneri, Owner direct (poate actualiza `currentValue` via PATCH).

### 2.3 Sănătate medie

- **Ce înseamnă:** Media `healthScore` (0-100) pe obiectivele active. Scorul e calculat de `computeObjectiveHealth()` din: progres spre target, momentum (accelerare vs decelerare), timp rămas până la deadline, semnale strategice relevante, disfuncții open care impactează rolul owner.
- **Cum se măsoară:** `avgHealth = Math.round(active.reduce((s, o) => s + (o.healthScore ?? 50), 0) / active.length)`. Dacă nu sunt obiective active, se afișează 100%.
- **Impact asupra cui:** Feedback loop către obiective — când sănătatea scade, sistemul poate escalada la COG.
- **Valori MICI (<60%):** WARNING — obiectivele sunt în pericol, probabil nu se vor atinge în timp
- **Valori MARI (>= 60%):** HEALTHY
- **Praguri exacte:**
  - `avgHealth < 60` → WARNING
  - `avgHealth >= 60` → HEALTHY
- **Reguli adiționale pentru statusul întregului layer:**
  - Orice obiectiv activ cu `riskLevel === "CRITICAL"` → layer CRITICAL
  - Orice obiectiv cu `riskLevel === "HIGH"` sau `avgHealth < 60` → layer WARNING
- **Cum aduci la verde:**
  1. Deschide obiectivele roșii și identifică de ce healthScore e mic (deadline apropiat? currentValue stagnant? disfuncție pe owner role?)
  2. Dacă e problema rolului — vezi layer Action (patch-uri pending) și Immune (violări)
  3. Dacă e deadline — discută cu COG despre realocare resurse sau replanning
  4. Dacă e fals — actualizează `currentValue` prin `/api/v1/objectives` PATCH
  5. Ca ultim resort — re-negociază targetul (PATCH cu `targetValue` nou) și documentează de ce
- **Cine poate influența:** `computeObjectiveHealth()` (auto, în fiecare request cockpit), Owner (update currentValue / target), agenții de pe `ownerRoles`.

---

## 3. ACTION (Acțiune)

**Analogie biologică:** Sistemul motor — mâinile organismului. Cum se transformă conștientizarea în comportament concret.

**Ce reprezintă în platformă:** Mecanismul `AgentBehaviorPatch` — ajustări reversibile ale comportamentului unui agent, cu auto-revert 24h și veto Owner. Exemple: "slow down QAA la 50% load", "focus CCO pe b2b-first-client până vineri".

**Sub-factori afișați:** `Propuse`, `Active`

### 3.1 Propuse

- **Ce înseamnă:** Patch-uri cu status `PROPOSED` — adică sugerate (de sistem sau agenți) dar încă neaprobate. Aceștia așteaptă review Owner sau COG.
- **Cum se măsoară:** `patches.filter(p => p.status === "PROPOSED").length`. Se urmărește și **vechimea**: câți sunt pending > 24h și > 48h.
- **Impact asupra cui:** Bucla "conștientizare → comportament" — dacă patch-urile stagnează, organismul nu reacționează la insight-uri.
- **Valori MICI (0-2, proaspeți):** HEALTHY — flow normal
- **Valori MICI dar vechi (>24h):** WARNING — review restant
- **Valori MARI sau foarte vechi (>3 patch-uri cu >48h):** CRITICAL — bucla de acțiune e ruptă
- **Praguri exacte:**
  - `pending48h > 3` → layer CRITICAL + alarmă HIGH
  - `pending24h > 0` → layer WARNING + alarmă MEDIUM
  - Altfel → HEALTHY
- **Cum aduci la verde:**
  1. Deschide lista de patch-uri pending: `GET /api/v1/behavior-patches?status=PROPOSED`
  2. Pentru fiecare: aprobă (`PATCH ?action=approve`) sau respinge (`?action=reject`)
  3. Dacă sunt multe deodată — clustering: probabil un eveniment upstream le-a generat pe toate; rezolvă cauza înainte de aprobări individuale
  4. Dacă review-ul e blocat din lipsă de context — cere COG un rezumat pe fiecare
- **Cine poate influența:** Self-regulation (FLUX-048 auto-generează din C2), rules engine B2, Owner direct, COG.

### 3.2 Active

- **Ce înseamnă:** Patch-uri cu status `ACTIVE` — sunt în vigoare și modifică comportamentul agenților acum. Auto-revert la 24h sau când Owner le dezactivează.
- **Cum se măsoară:** `patches.filter(p => p.status === "ACTIVE").length`
- **Impact asupra cui:** Agenții menționați în `targetRole`, fluxurile în care rolurile respective intervin.
- **Valori MICI (0-5):** Normal — organismul e în operare stabilă
- **Valori MARI (10+):** Nu e neapărat rău, dar organismul e în "mod de ajustare" — multe interventii simultane pot interfera între ele
- **Praguri exacte:** Sub-factorul e mereu HEALTHY ca afișaj; contribuie doar informativ.
- **Cum aduci la verde:** Auto-revert la 24h rezolvă de la sine. Dacă vrei forțare: `PATCH ?action=revert` pe patch-uri individuale.
- **Cine poate influența:** Mecanismul auto-revert (cron intern), Owner, COG.

---

## 4. HOMEOSTASIS (Homeostazie)

**Analogie biologică:** Termostatul organismului — temperatura, pH-ul, glicemia. Parametri care trebuie să rămână în bandă pentru funcționare normală.

**Ce reprezintă în platformă:** `HomeostaticTarget` — metrici continui cu `minValue`/`maxValue`/`optimalValue` și praguri `warningPct`/`criticalPct`. Exemple: latency răspuns agent (<2s), KB validity rate (>80%), decision throughput (>5/zi). Sunt evaluate de `evaluateHomeostasis()`.

**Sub-factori afișați:** `Targets`, `Optime`, `Devieri`

### 4.1 Targets

- **Ce înseamnă:** Câte targets homeostatice sunt active și monitorizate.
- **Cum se măsoară:** `homeoEvaluations.length` (toate cu `isActive === true`).
- **Impact asupra cui:** Informativ — arată cât de dens e monitorizat organismul.
- **Valori MICI (<3):** Nu neapărat rău, dar monitorizare subțire. Adaugă targets pentru zone neacoperite.
- **Valori MARI (20+):** HEALTHY — monitorizare densă.
- **Praguri exacte:** Mereu HEALTHY ca afișaj.
- **Cum aduci la verde:** Nu se aplică.
- **Cine poate influența:** Owner / COG (prin POST `/api/v1/homeostasis` pentru targets noi).

### 4.2 Optime

- **Ce înseamnă:** Câte targets sunt în status `OPTIMAL` sau `NORMAL` — în bandă, nu au trigger warning.
- **Cum se măsoară:** `homeoEvaluations.filter(e => e.status === "OPTIMAL" || e.status === "NORMAL").length`
- **Impact asupra cui:** Informativ pozitiv — ce funcționează bine.
- **Valori MARI (aproape egal cu Targets):** HEALTHY
- **Valori MICI:** Nu e semnalizat direct, dar corelat cu `Devieri` mare
- **Praguri exacte:** Mereu HEALTHY ca afișaj.
- **Cum aduci la verde:** Reduce `Devieri` (vezi 4.3).
- **Cine poate influența:** Sistemul auto prin C2 self-regulation, Owner manual.

### 4.3 Devieri

- **Ce înseamnă:** Câte targets sunt în `CRITICAL` + `WARNING`. Adică parametri care au ieșit din bandă.
- **Cum se măsoară:** `critical.length + warning.length` unde critical și warning sunt filtrate pe `e.status`.
- **Impact asupra cui:** Agenții din `targetEntityId` când e ROLE, serviciile când e SERVICE, întregul sistem când e SYSTEM.
- **Valori MICI (0):** HEALTHY — organism în echilibru
- **Valori MARI (1+ warning):** WARNING
- **Valori MARI (1+ critical):** CRITICAL — intervenție imediată
- **Praguri exacte:**
  - `critical > 0` → layer CRITICAL + alarme per target
  - `warning > 0` → layer WARNING + alarme per target
  - Altfel HEALTHY
- **Cum aduci la verde:**
  1. Deschide lista targets cu devieri: `GET /api/v1/homeostasis?status=CRITICAL,WARNING`
  2. Pentru fiecare, vezi ce target a deviat și cu cât (`lastReading` vs `optimalValue`)
  3. C2 Self-Regulation (FLUX-048) rulează la 30min și propune automat patches pentru targets cu `autoCorrect === true`
  4. Dacă deviația persistă — probabil `autoCorrect` e off sau patch-urile sunt în pending; verifică layer Action
  5. Dacă targetul e greșit (ex: prag prea strict) — ajustează `warningPct`/`criticalPct` via PATCH
- **Cine poate influența:** FLUX-048 (C2 Self-Regulation 30min), `evaluateHomeostasis()`, Owner (ajustare praguri).

---

## 5. IMMUNE (Imunitate)

**Analogie biologică:** Sistemul imunitar — recunoaște ce e "sine" vs "non-sine" și respinge intruziuni. Memorie imună pentru pattern-uri recurente.

**Ce reprezintă în platformă:** `BoundaryRule` + `BoundaryViolation` + `QuarantineEntry` + `ImmunePattern`. Reguli de graniță (moral core, GDPR, scope CJA, data integrity, MVV) care verifică input-uri de la clienți, directive interne, date intrate. Violările ajung în carantină; pattern-urile repetate activează auto-block.

**Sub-factori afișați:** `Violări 24h`, `Carantină`

### 5.1 Violări 24h

- **Ce înseamnă:** Numărul de `BoundaryViolation` create în ultimele 24h. Fiecare violare are o severitate (LOW/MEDIUM/HIGH/CRITICAL) dictată de regula care a detectat-o.
- **Cum se măsoară:** `prisma.boundaryViolation.findMany({ where: { createdAt >= h24 } })` + filtrare pe severitate.
- **Impact asupra cui:** Agenții care au generat sau primit input-ul violator, Owner (pentru CRITICAL — escaladare imediată), CLA (Compliance).
- **Valori MICI (0):** HEALTHY — niciun atac/greșeală
- **Valori MARI dar LOW/MEDIUM:** WARNING — investighează pattern-ul
- **Valori MARI cu CRITICAL (1+):** CRITICAL — incident imediat
- **Praguri exacte:**
  - `critical > 0` → layer CRITICAL + alarmă CRITICAL
  - `recentViolations.length > 0` (dar fără critical) → WARNING
  - `== 0` → HEALTHY
- **Cum aduci la verde:**
  1. Deschide violările: `GET /api/v1/boundaries/violations?since=24h`
  2. Pentru fiecare CRITICAL — analizează contextul: a fost atac real, greșeală internă sau regulă prea strictă?
  3. Dacă e atac real → Owner escaladează, posibil block IP/user
  4. Dacă e greșeală internă → identifică agentul și corectează directiva
  5. Dacă e regulă prea strictă → ajustează `BoundaryRule` via PATCH (ex: adaugă cuvânt în whitelist)
  6. Violările vechi (>24h) ies automat din fereastră
- **Cine poate influența:** `checkBoundaries()` (funcție pură), 6 reguli seed (2 moral core shared, 4 business-scoped), Owner (ajustare reguli).

### 5.2 Carantină

- **Ce înseamnă:** Input-uri blocate care așteaptă decizie Owner (release sau destroy). La destroy, crește `occurrenceCount` pe `ImmunePattern` și se poate activa `autoBlock`.
- **Cum se măsoară:** `prisma.quarantineEntry.count({ where: { status: "QUARANTINED" } })`
- **Impact asupra cui:** Clienți ale căror request-uri sunt blocate (customer experience), Owner (decizii per item).
- **Valori MICI (0):** HEALTHY
- **Valori MARI (1+):** WARNING — item-uri așteaptă review
- **Praguri exacte:**
  - `quarantinedCount > 0` → WARNING
  - Altfel HEALTHY
  - Notă: carantina singură nu ridică layer-ul la CRITICAL; combinația cu violări CRITICAL face asta.
- **Cum aduci la verde:**
  1. `GET /api/v1/quarantine` — listează item-uri
  2. Pentru fiecare: release (fals pozitiv) sau destroy (confirmat malițios)
  3. La destroy, `ImmunePattern` memorează și va auto-bloca viitoare instanțe similare — util să reduci carantina viitoare
- **Cine poate influența:** Owner direct via PATCH, `ImmunePattern.autoBlock` (auto după threshold), CLA agent.

---

## 6. METABOLISM (Metabolism)

**Analogie biologică:** Metabolismul celular — cum consumă organismul energie și cum e distribuită. Plus faza de viață (bebeluș, adult, senior).

**Ce reprezintă în platformă:** `ResourceBudget` per agent (cost LLM maxim/zi vs folosit) + `lifecyclePhase` pe Business (GROWTH / MATURE / CONSOLIDATION / PIVOT). Faza dictează "tonul" organismului — GROWTH = mai multă brainstorming, MATURE = mai multă execuție.

**Sub-factori afișați:** `Faza`, `Bugete active`, `Depășite`

### 6.1 Faza

- **Ce înseamnă:** Faza de viață a business-ului curent (JobGrade = GROWTH la data scrierii acestui ghid).
- **Cum se măsoară:** `prisma.business.findUnique({ select: { lifecyclePhase: true } })`. JobGrade e seed-at cu `GROWTH`.
- **Impact asupra cui:** Tonul comportamental al agenților (mai exploratoriu vs mai disciplinat), prioritizarea obiectivelor.
- **Valori posibile:** `GROWTH`, `MATURE`, `CONSOLIDATION`, `PIVOT`. Niciuna nu e "rea" — sunt descriptoare.
- **Praguri exacte:** Mereu HEALTHY ca afișaj (e doar descriptiv).
- **Cum aduci la verde:** Nu se aplică.
- **Cine poate influența:** Owner via `PATCH /api/v1/businesses` când e momentul unei tranziții de fază (decizie strategică, nu automată).

### 6.2 Bugete active

- **Ce înseamnă:** Câți agenți au `ResourceBudget` activ — adică câți au limită de cheltuieli LLM/zi.
- **Cum se măsoară:** `budgets.length` (filtrat pe `isActive: true`).
- **Impact asupra cui:** Agenții bugetați (restricție), Owner (control cost total).
- **Valori MARI (= nr. total agenți):** HEALTHY — toți agenții sunt sub control
- **Valori MICI:** Neacoperit, dar nu e semnalizat direct (doar informativ)
- **Praguri exacte:** Mereu HEALTHY ca afișaj.
- **Cum aduci la verde:** Creează bugete pentru agenții lipsă via POST `/api/v1/resources?action=budget`.
- **Cine poate influența:** Owner (creează/dezactivează bugete), E2 Resource Market (auto-negotiation sub 20%).

### 6.3 Depășite

- **Ce înseamnă:** Câți agenți au consumat mai mult decât bugetul (`usedLlmCost > maxLlmCostPerDay`). Subset dublu: `overBudget > 100%` și `overBudget120 > 120%`.
- **Cum se măsoară:** `budgets.filter(b => !b.withinBudget).length` și o filtrare adițională pe `costUsedPct > 120`.
- **Impact asupra cui:** Cost Owner (financiar direct), agenții depășiți (posibil throttling automat via C2), obiectivele dependente de acei agenți.
- **Valori MICI (0):** HEALTHY
- **Valori MARI cu depășiri <120%:** WARNING — monitor
- **Valori MARI cu depășiri >120% (1+):** CRITICAL — sângerare de bani
- **Praguri exacte:**
  - `overBudget120 > 0` → layer CRITICAL + alarmă HIGH
  - `overBudget > 0` (dar sub 120%) → layer WARNING + alarmă MEDIUM
  - Altfel HEALTHY
- **Cum aduci la verde:**
  1. `GET /api/v1/resources?view=budgets` — listează depășirile
  2. Pentru fiecare agent peste 120%: investighează de ce (loop infinit? task uriaș? prompt prost?)
  3. Soluție rapidă: PATCH buget în sus dacă e justificat; PATCH în jos cu pauză agent dacă nu
  4. E2 Resource Market poate negocia automat transferuri între agenți (auto-grant < 20%)
  5. FLUX-053 (cron 00:00) reset-ează bugetele zilnic — dacă e doar un spike, problema dispare la miezul nopții
- **Cine poate influența:** FLUX-053 (reset zilnic), E2 auto-negotiation, Owner (PATCH direct).

---

## 7. EVOLUTION (Evoluție)

**Analogie biologică:** Pruning-ul neuronal + selecție naturală. Organismul taie ce nu mai folosește și propagă ce merge bine.

**Ce reprezintă în platformă:** `PruneCandidate` pentru KB entries (cu reasons: UNUSED_90D, LOW_SUCCESS_RATE, SUPERSEDED) + `PropagationEvent` pentru entries cu success rate mare care se propagă la agenți fără echivalent.

**Sub-factori afișați:** `Pruning pending`

### 7.1 Pruning pending

- **Ce înseamnă:** Numărul de candidați la pruning cu status `FLAGGED` — KB entries care așteaptă decizie Owner (approve → șters, keep → menținut, defer → review peste 30 zile).
- **Cum se măsoară:** `prisma.pruneCandidate.count({ where: { status: "FLAGGED" } })`.
- **Impact asupra cui:** CKA (Chief Knowledge Agent), Owner (decizie finală), calitatea KB-ului agenților.
- **Valori MICI (0):** HEALTHY — KB-ul e curat sau pruning-ul e la zi
- **Valori MICI-MEDII (1-10):** WARNING — există review restant dar nu urgent
- **Valori MARI (>10):** CRITICAL — backlog mare, KB-ul acumulează balast
- **Praguri exacte:**
  - `pruneCandidatesFlagged > 10` → layer CRITICAL + alarmă HIGH
  - `pruneCandidatesFlagged > 0` → WARNING + alarmă MEDIUM
  - `== 0` → HEALTHY
- **Cum aduci la verde:**
  1. `GET /api/v1/pruning` — listează candidații
  2. Pentru fiecare, vezi `reason` și `evidence` (când a fost folosit ultima dată, rata de succes)
  3. Batch review: aprobă toate UNUSED_90D fără excepții; verifică manual LOW_SUCCESS_RATE (posibil e entry bun dar greșit folosit)
  4. `PATCH ?id=...&action=approve|keep|defer`
  5. FLUX-051 (D 03:00) rulează scanning automat — nu trebuie să declanșezi manual
- **Cine poate influența:** FLUX-051 (scan săptămânal), CKA, Owner.

---

## 8. RHYTHM (Ritm)

**Analogie biologică:** Bătăile inimii + ritm circadian. Cadența constantă care menține organismul viu. Plus outcome measurement — cum știi că ce faci funcționează.

**Ce reprezintă în platformă:** `ServiceOutcome` (metric singular per serviciu: eval accuracy 85%, retention 80%, matching 70%) + `Ritual` (5 tipuri: retrospectivă V, strategic lunar, calibrare trimestrială, post-incident, celebrare) + `WildCard` (1/săpt per agent, provocare ieșită din rutină).

**Sub-factori afișați:** `Outcomes măsurate`, `Ritualuri overdue`, `Gaps date`

### 8.1 Outcomes măsurate

- **Ce înseamnă:** Raport `onTarget / total` — câte outcomes au `currentValue >= targetValue` din totalul celor definite.
- **Cum se măsoară:**
  - `measured = outcomes.filter(o => o.currentValue !== null)`
  - `onTarget = measured.filter(o => o.currentValue >= o.targetValue)`
  - `offTarget = measured.length - onTarget.length`
  - Display: `${onTarget.length}/${outcomes.length}`
- **Impact asupra cui:** Agenții responsabili de fiecare serviciu, Owner (dovadă că JobGrade livrează valoare reală).
- **Valori MICI off-target (0):** HEALTHY
- **Valori MARI off-target (>50%):** CRITICAL — sistemul nu livrează, replanificare necesară
- **Praguri exacte:**
  - `offTargetPct > 50` → layer CRITICAL + alarmă HIGH
  - `offTarget > 0` → contribuie la WARNING
- **Cum aduci la verde:**
  1. `GET /api/v1/outcomes` — listează outcomes cu status
  2. Pentru fiecare off-target: e problema livrării (proces) sau a măsurării (date vechi)?
  3. Dacă proces — delegă COG să propună plan de îmbunătățire
  4. Dacă măsurare — trigger măsurare proaspătă via `POST ?action=measure`
  5. Dacă target-ul e nerealist — renegociază via PATCH și documentează
- **Cine poate influența:** Agenții responsabili, Owner, FLUX-054 (retrospectivă V 17:00 care coagulează totul).

### 8.2 Ritualuri overdue

- **Ce înseamnă:** Ritualuri care ar fi trebuit să ruleze și nu au rulat — pragul e calculat din `cronExpression`:
  - Săptămânal (`0 0 * * 0`) → 10 zile
  - Lunar (`0 0 1 * *`) → 45 zile
  - Default → 14 zile
- **Cum se măsoară:** Loop prin `rituals`; pentru fiecare, dacă `!lastRunAt` SAU `(now - lastRunAt) > threshold`, e overdue.
- **Impact asupra cui:** Coerența organismului — retrospectivele construiesc învățare; lipsa lor = regres.
- **Valori MICI (0):** HEALTHY
- **Valori MICI-MEDII (1-2):** WARNING — recuperează
- **Valori MARI (>2):** CRITICAL — ritmul e rupt
- **Praguri exacte:**
  - `overdueRituals > 2` → layer CRITICAL + alarmă HIGH
  - `overdueRituals > 0` → layer WARNING + alarmă MEDIUM
  - Altfel HEALTHY
- **Cum aduci la verde:**
  1. `GET /api/v1/rituals?overdue=true` — listează
  2. Pentru fiecare, fie trigger manual (`PATCH ?action=markRun` + rulează templateul), fie investighează de ce cron-ul n8n nu a rulat
  3. FLUX-054 (retrospectivă V 17:00) trebuie să fie activ în n8n — verifică acolo
  4. După ce ritualul e rulat, `lastRunAt` se actualizează și iese de pe lista overdue
- **Cine poate influența:** FLUX-054, crons n8n pentru celelalte ritualuri, Owner (markRun manual).

### 8.3 Gaps date

- **Ce înseamnă:** Outcomes cu `currentValue === null` — adică ai definit metricul dar nu ai măsurat niciodată.
- **Cum se măsoară:** `outcomesRaw.filter(o => o.currentValue === null).length`
- **Impact asupra cui:** Te blochează să evaluezi layer-ul Rhythm în mod semnificativ — nu poți zice "off-target" dacă n-ai măsurat nimic.
- **Valori MICI (0):** HEALTHY — toate outcomes au cel puțin o măsurătoare
- **Valori MARI (1+):** WARNING
- **Praguri exacte:**
  - `measurementGaps > 0` → WARNING + alarmă MEDIUM
  - Altfel HEALTHY
- **Cum aduci la verde:**
  1. `GET /api/v1/outcomes?missing=true`
  2. Pentru fiecare, execută `POST /api/v1/outcomes?action=measure` cu valoare inițială
  3. Dacă nu există mecanism de măsurare → construiește-l (instrument, integration, raportare manuală)
  4. Dacă outcome-ul nu mai e relevant → dezactivează-l via PATCH `isActive: false`
- **Cine poate influența:** Owner (măsurare manuală / dezactivare), agenții ownerii serviciului, FLUX-054 (agregare săptămânală).

---

## CUM SĂ FACI ORGANISMUL "VERDE PESTE TOT"

Un organism viu **nu stă verde pasiv** — stă verde pentru că cineva (tu + agenții + crons) îl întreține. Aici sunt ritmurile practice.

### Acțiuni zilnice (5 minute, dimineața cu cafeaua)

1. **Deschide Owner Dashboard.** Uită-te la cele 8 layere. Orice roșu = prioritate azi.
2. **Verifică `Semnale 24h` (Awareness).** Dacă e 0, testează rapid FLUX-047 — probabil cron-ul a căzut peste noapte.
3. **Verifică `Propuse` (Action).** Dacă sunt patch-uri pending > 24h, aprobă/respinge rapid (nu procrastina; procrastinarea aici rupe bucla de acțiune).
4. **Verifică `Devieri` (Homeostasis).** Dacă e 1-2, probabil C2 le va rezolva automat în câteva cicluri. Dacă e > 2, investighează cauza comună.
5. **Verifică `Violări 24h` (Immune) dacă are CRITICAL.** Fiecare violare CRITICAL e un eveniment care trebuie înțeles înainte să treacă ziua.

### Acțiuni săptămânale (30 minute, vinerea după-amiaza)

1. **Rulează retrospectiva (Ritual R4 — Retrospectivă Vinerii).** FLUX-054 o declanșează automat la 17:00, dar Owner-ul trebuie să o *citească* și să extragă 1-2 acțiuni.
2. **Review `Sănătate medie` Goals.** Dacă a scăzut săptămâna asta — de ce? Corelează cu ce a apărut în layer Awareness.
3. **Review `Pruning pending` (Evolution).** Aprobă/keep/defer batch-ul săptămânii. Dacă lași să se strângă, devine CRITICAL.
4. **Răspunde la Wild Cards.** FLUX-050 generează luni dimineața 9 wild cards (per agent PROACTIVE_CYCLIC). Citește-le vinerea și marchează cele valoroase pentru promovare la idei.
5. **Verifică `Outcomes măsurate`.** Dacă ai vreun gap de date (8.3), trigger o măsurătoare acum.
6. **Verifică `Depășite` Metabolism.** Un agent peste 120% de 5 zile consecutive înseamnă că fie e folosit prost, fie bugetul e nerealist. Decide.

### Acțiuni lunare (2 ore, ultima joi a lunii)

1. **Rulează Ritualul R2 — Review Strategic Lunar.** Definit în seed rituals, template complet în DB. Aici te uiți la obiective vs realitate și decizi reconfigurări majore.
2. **Evaluează `Faza` Business (Metabolism).** Ești încă în GROWTH? Vreun semnal că e momentul tranziției la MATURE? Face-o explicit.
3. **Scan complet `BoundaryRule` (Immune).** Regulile care n-au detectat nimic 30 de zile sunt ori perfecte (lumea respectă) ori moarte (nu mai match-uiesc realitatea). Verifică.
4. **Review `ResourceBudget` (Metabolism).** Uită-te la `usedLlmCost` mediu per agent — re-calibrează bugetele pe date reale, nu pe presupuneri.
5. **Verifică `AdaptationMetric` (G4).** OODA timing, KB velocity, patch effectiveness — trendurile lunare spun mai mult decât snapshot-urile zilnice.

### Când TOTUL e verde — nu te culca pe lauri

**Verdele pasiv e mai periculos decât roșul activ.** Roșul îți zice "uită-te aici". Verdele peste tot poate însemna ori "organism sănătos", ori "mecanismele de detecție s-au rupt și nu mai știi că ești bolnav".

Când vezi 8 layere verzi, **fă check-up-ul lunar al mecanismelor de detecție:**

1. **Generează un eveniment fals pozitiv controlat.** Trimite un semnal extern de test prin API. Trebuie să apară în `Semnale 24h` în câteva minute. Dacă nu apare — Awareness e mort.
2. **Creează un patch propus dummy.** Via POST manual. Vezi că apare în `Propuse` (Action). Șterge-l după.
3. **Triggerează o violare boundary de test.** Trimite un input cu cuvânt-cheie din `BoundaryRule`. Vezi că apare în `Violări 24h`.
4. **Verifică ultimele 10 ritualuri `lastRunAt`.** Toate trebuie să aibă rulări recente. Dacă unul nu a rulat de 3+ săptămâni și e verde — probabil cron-ul e off dar pragul default 14 zile + threshold>14 zile ratează unele situații. Investighează.
5. **Rulează un pattern extractor manual pe semnale vechi.** Trebuie să producă teme cunoscute. Dacă produce doar temele super generice — motorul s-a degradat.
6. **Verifică logs la FLUX-047, FLUX-048, FLUX-051, FLUX-054.** Toate trebuie să aibă rulări cu exit code success în ultimele 48h.

**Principiul:** un organism viu nu are voie să tacă. Dacă nu spune nimic = ori doarme, ori a murit. Tu ești responsabil să-l trezești periodic și să verifici că poate încă vorbi.

### Lanțul de escaladare când ceva e roșu și nu știi ce să faci

1. **Citește alarma din layer.** E scrisă în română clară.
2. **Deschide cardul interactiv.** Vezi lista completă de alarme și sub-factori.
3. **Urmează link-ul către endpoint.** Toate fac referire la `/api/v1/<topic>` — interoghează direct pentru detalii.
4. **Dacă e incert → deleagă COG.** COG poate investiga cauza comună pe situațiile cu >3 roluri implicate.
5. **Dacă e sistemic → Owner decide.** Unele lucruri nu pot fi rezolvate de agenți (ex: tranziție fază, ajustare moral core, re-negociere target obiectiv). Acelea sunt treaba ta.
6. **Documentează învățătura.** Orice incident trebuie să lase o urmă — fie un nou `BoundaryRule`, fie o ajustare de prag, fie o entry KB. "Am rezolvat și am uitat" = același incident peste 30 de zile.

---

**Document viu — update-at când layere / sub-factori / praguri se schimbă în cod.**
**Sursa de adevăr: `src/lib/owner/cockpit-aggregator.ts`.**
