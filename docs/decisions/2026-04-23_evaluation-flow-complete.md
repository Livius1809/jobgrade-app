# Fluxul complet evaluare cu comisie (Varianta B) — Specificații Owner 23.04.2026

## Contextul de pornire
Admin client (cel care a făcut contul și a plătit) alege varianta de proces.

---

## ETAPA 1: CONFIGURARE PROCES (inline, panou lateral)

### 1.1 Definire membri comisie
Admin completează per membru:
- Nume, Prenume
- Funcție (ex: Director Producție)
- Departament (ex: Producție)
- Contact: telefon ȘI/SAU email (minim una obligatorie)
- Email e cel care primește invitația

### 1.2 Alocare fișe de post
Admin alocă fișele de post deja încărcate/elaborate fiecărui membru:
- Fiecare membru primește fișele din departamentul pe care îl reprezintă
- Un membru poate primi și fișe din alte departamente (dacă le cunoaște)
- Admin vede tabel: Membru × Fișe alocate

### 1.3 Lansare invitații
- Se trimite email de invitație per membru
- Email conține: link de activare + context (ce e evaluarea, ce se așteaptă)
- Membrul primește onboarding personalizat

### 1.4 Bifă "Inițiază sesiunea de evaluare"
- Explicare: ce se întâmplă când inițiezi (membrii primesc email, au termen, scorează individual etc.)
- Preview mesaj invitație (admin vede ce primește fiecare membru)
- Particularizare mesaj (admin poate edita textul invitației)
- Sfat gratuit (consultant familiarizare — ce să includă, cum să formuleze)

### 1.5 Gestionare membri existenți
- Admin poate șterge un membru vechi (dacă procesul se reia după un timp)
- Admin poate adăuga membru nou cu "Invită membru nou"
- Lista membrilor persistă între sesiuni

### 1.6 Alocare fișe per membru — MECANISMUL COMPLET
- Fiecare membru primește un calup de fișe de pre-scorat (fișele din departamentul lui)
- Pre-scorarea e individuală — fiecare membru scorează doar calupul lui
- **La discuția de grup**: TOȚI membrii scorează TOATE fișele
- Dar se pornește de la pre-scorarea membrului responsabil de acel calup
- Sistemul compară pre-scorarea inițială cu voturile celorlalți → activează medierea

**STATUS COD:**
- [x] API invitare (/api/v1/users/invite) — există
- [x] Email via Resend (sendInviteEmail, sendSessionInviteEmail) — există
- [x] NewSessionWizard.tsx (311 linii) — wizard 3 pași, selectare joburi + evaluatori — **există dar ca pagină separată**
- [ ] Adaptare inline (panou lateral portal) — de implementat
- [ ] Câmpuri complete per membru (funcție, dept, tel, email) — de implementat
- [ ] Invită membru nou direct din formular — de implementat
- [ ] Ștergere membru vechi — de implementat
- [ ] Alocare fișe per membru (calup per departament) — de implementat
- [ ] Bifă "Inițiază sesiunea" + explicare + preview + particularizare — de implementat
- [ ] Sfat gratuit (consultant familiarizare) la configurare — de implementat

---

## ETAPA 2: SCORARE INDIVIDUALĂ (fiecare membru, separat)

### 2.1 Login membru
- Membrul primește email → click link → activare cont → login
- Vede doar fișele alocate lui

### 2.2 Scorare per fișă — cu ghidaj AI (la fel ca la introducere fișe)

**Mecanismul AI la scorare (identic cu cel de la elaborare fișe):**
- AI înțelege fiecare informație din fișa de post prin comparație cu criteriul de scorare
- La etapa de introducere fișe (HR Admin), Profiler-ul DEJA știe ce scor ar aloca
- **Mini-consens AI ↔ reprezentant individual:**
  - AI propune scor + argumentare pe fiecare criteriu
  - Dacă reprezentantul e de acord → adoptă varianta AI
  - Dacă reprezentantul nu e de acord → argumentează
  - AI pe baza argumentelor poate:
    - Schimba formularea din narativul fișei de post
    - Schimba litera de încadrare
    - (pot exista detalii pe care varianta inițială nu le-a integrat în conceperea fișei)
- Rezultat: o variantă agreată AI ↔ reprezentant per fiecare fișă

**Fără AI (opțional):**
- Membrul scorează singur, fără sugestii

### 2.3 Rezultat individual
- Tabel centralizat per membru: Poziție × 6 Litere (A-G)
- Membrul poate revizui și modifica până la termenul limită
- Când e gata: buton "Am terminat scorarea"

### 2.4 Cartuș informativ la terminarea scorării

**La finalizarea etapei individuale, se deschide un cartuș care arată:**

1. **Ce ai făcut din proces:**
   - N fișe scorate, N criterii, tabel sumar cu literele tale
   
2. **Ce urmează:**
   - Discuția de grup — toți membrii scorează TOATE fișele
   - Se pornește de la varianta ta pe fișele din calupul tău

3. **Consiliere — cum contribui la atingerea consensului:**
   - Cum îți susții poziția inițială cu argumente raportate la criteriile de scorare
   - Cum accepți argumente valide de la ceilalți membri
   - **Principiile de consens afișate:**
     - Consens ≠ vot — e proces de acord bazat pe fapte și logică
     - Fiecare item trebuie discutat și agreat de TOȚI membrii
     - Natural ca opiniile să difere — diversitatea e sănătoasă
     - NU îți schimba opinia ca să eviți conflictul — schimb-o pe bază de logică
     - NU evita conflictul (plecând, sub-grupuri, medierea cifrelor)
     - NU împinge agresiv propria clasare — expune-ți vederea obiectiv
     - NU intra cu mentalitatea câștig-pierdere
   - **Aceste principii se afișează ȘI în discuția de grup** (vizibile permanent)

### 2.5 Monitorizare progres
- Admin vede: cine a terminat, cine nu, termen
- Reminder automat la termen aproape

**STATUS COD:**
- [x] Pagină evaluare cu 6 criterii (/sessions/[id]/evaluate/[jobId]) — există
- [x] Verificare participant (SessionParticipant) — există
- [x] Formular scorare (EvaluationForm) — există
- [x] Principii consens documentate (procesul-complet-job-evaluation.md) — există
- [ ] Alocare fișe per membru (acum toți văd toate posturile) — de implementat
- [ ] AI ghidaj la scorare (mini-consens AI ↔ reprezentant) — de implementat
- [ ] AI schimbă formulare fișă + literă pe baza argumentelor — de implementat
- [ ] Cartuș informativ la finalizare scorare — de implementat
- [ ] Afișare principii consens permanent — de implementat
- [ ] Buton "Am terminat scorarea" cu status tracking — parțial (completedAt există)
- [ ] Dashboard progres admin — parțial (SessionActions)
- [ ] Reminder automat — de implementat

---

## ETAPA 3: DISCUȚIA DE GRUP (consens)

### 3.1 Vizualizare comparativă
- Toți membrii văd tabelul consolidat: Poziție × Membru × Litere
- Se evidențiază divergențele (unde scorurile diferă cu ≥2 nivele)
- Se vede media, modul, deviația standard per criteriu

### 3.2 Interfața discuției de grup

**Layout-ul ecranului:**

**Stânga — Lista fișelor cu progres:**
- Fiecare fișă arată: titlu post + membru responsabil (inițiator) + departament
- Status vizual per fișă: ✅ verde (consens + validat), 🟡 galben (activă), ⚪ gri (de discutat)
- Progress general sus: bară + "X/Y fișe finalizate"

**Dreapta — Fișa activă:**
- Header: titlu post, inițiator (nume + funcție + departament) în colțul dreapta-sus
- Tabel principal: rânduri = membri, coloane = cele 6 criterii (litere A-G)
  - Rând 1 (PRE-SCORARE): litera inițiatorului pe fiecare criteriu — read-only, referință permanentă
  - Rânduri 2-N (VOTURI): litera fiecărui membru — se actualizează live
  - ⚠️ pe celulele care diferă de majoritate
  - Sub fiecare coloană: **progress bar** (% consens = câți de acord / total)
  - **Când progress bar ajunge la 100%** → bara dispare → apare **"CONSENS" + litera rezultat** (verde, bold)
- Progress per fișă sus: "Consens: ██████░░░░ 2/6 criterii"
- Când toate 6 coloanele = CONSENS → bară 100% → "✅ CONSENS COMPLET" → buton Finalizează

**Sub tabel — Panoul de discuție per criteriu:**
- Se activează la click pe un criteriu divergent (⚠️)
- Arată argumentele postate de fiecare membru
- AI sintetizează și recomandă
- Butoane: Accept / Mențin + argumentez (text obligatoriu)

**Colț jos — Principii directoare (toggle, permanent accesibil)**

### 3.3 Mecanismul de pornire a discuției
- Se deschide fișa activă → apare pre-scorarea inițiatorului (referință permanentă)
- Toți membrii votează pe toate cele 6 criterii
- Sistemul compară automat → marchează ✅ consens sau ⚠️ divergent
- Progresul barelor pe coloane reflectă starea live

### 3.4 Editare și dezbatere — principiu deschis
- **Toți membrii pot schimba opinia pe baza argumentelor** — inclusiv cei care inițial erau de acord cu inițiatorul
- Respectă principiul din metodologie: "schimbă-ți opinia doar pe bază de logică"
- Fiecare schimbare necesită argumentare (text minim)
- Argumentele noi sunt vizibile tuturor și pot genera noi argumente
- **Nu există limită de timp** — procesul e viu, dezbaterea e sănătoasă

### 3.5 Pricing pe runde de mediere
- **Inclus în pachet: 3 runde de mediere per criteriu**
  - Runda 1: votul inițial + detectare divergențe
  - Runda 2: argumentare + recalibrare
  - Runda 3: AI sinteză + recomandare + vot final
- **Din runda 4 încolo: contra credite**
  - Fiecare rundă suplimentară de argumentare = credite din sold
  - AI mediere suplimentară = credite din sold
  - Fără limită de runde — pot discuta cât doresc
  - Comunicare: "Discuția pe acest criteriu continuă. De aici se consumă X credite per rundă din soldul dumneavoastră."
  - Ton neutru, informativ, fără presiune
- **Rațional:** motivare naturală spre eficiență, nu restricție. Companiile cu divergențe mari au cea mai mare nevoie de serviciu.

### 3.6 AI mediază — valoare adăugată reală (varianta B)

**AI-ul nu e un arbitru rece. E un mediator care CUNOAȘTE fiecare participant.**

Profiler-ul acumulează progresiv cunoaștere despre:
- Cum gândește fiecare membru (pattern-uri de scorare, tendințe, argumente preferate)
- Unde tinde să supraevalueze sau subevalueze (bias-uri inconștiente)
- Ce tipuri de argumente îl conving pe fiecare (date, logică, experiență, autoritate)
- Relațiile între membri (cine influențează pe cine, cine rezistă, cine cedează rapid)

**Medierea progresivă a AI-ului:**
- La **runda 1**: AI observă, colectează voturi, identifică divergențe
- La **runda 2**: AI sintetizează argumentele, identifică punctele comune, propune compromis argumentat
- La **runda 3+**: AI folosește cunoașterea acumulată:
  - "Marinescu tinde să evalueze Educația mai strict — în 3 din 5 fișe anterioare a ales un nivel sub majoritate"
  - "Stan și Ionescu au ajuns la acord rapid pe fișele tehnice dar divergează pe cele manageriale"
  - Propune compromis calibrat pe felul în care gândesc participanții
- Cu cât procesul avansează, cu atât medierea AI devine mai valoroasă
- **Interesul nostru:** toți cei implicați să vadă valoare reală în medierea AI

**Diferențiator:** niciun competitor nu are mediere care învață din comportamentul evaluatorilor. Hay/Mercer au mediator uman care nu se calibrează. AI-ul nostru se calibrează pe fiecare client, pe fiecare membru, pe fiecare criteriu.

### 3.7 Finalizare criteriu → finalizare fișă
- Criteriu cu consens (100%) → progress bar dispare → "CONSENS" + litera → read-only
- Când toate 6 = CONSENS → buton "Finalizează fișa"
- Inițiatorul vede varianta finală vs varianta lui inițială → validează modificările
- Fișa se colorează verde în lista din stânga → se deschide automat următoarea

**STATUS COD:**
- [x] Vizualizare comparativă (ConsensusView) — există (distribuție, medie, CV)
- [x] Recalibrare endpoint — există
- [x] Vot endpoint — există
- [x] Facilitator decide endpoint — există
- [x] revealScores() detectează divergențe ≥2 — există
- [ ] Forum/chat per criteriu divergent — de implementat
- [ ] Comentarii per criteriu — de implementat
- [ ] AI sinteză argumente + compromis — de implementat (acum AI face doar benchmarks/slotting)
- [ ] Vizualizare tip "tablou de bord consens" ușor de urmărit — de implementat

---

## ETAPA 4: VALIDARE INDIVIDUALĂ (post-consens)

### 4.1 Fiecare membru validează
- Vede tabelul final (consens) vs tabelul lui inițial
- Pe fiecare criteriu unde s-a schimbat vs varianta lui:
  - Marchează "Accept schimbarea" sau "Contest" (cu motivare)
- Dacă acceptă tot → semnătură digitală pe varianta finală

### 4.2 Actualizare tabel individual
- Tabelul membrului se actualizează automat cu scorurile de consens
- Devine READ ONLY
- Membrul nu mai poate modifica

### 4.3 Finalizare etapă comisie
- Când toți membrii au validat → tabelul general devine READ ONLY pentru membri
- Etapa se închide automat

**STATUS COD:**
- [ ] Ecran validare "varianta mea vs consens" — de implementat
- [ ] Accept/Contest per criteriu — de implementat
- [ ] Semnătură digitală per membru — parțial (validare sesiune există, dar nu per membru)
- [ ] Tabel read-only post-validare — de implementat
- [ ] Auto-close etapă la validare toți — de implementat

---

## ETAPA 5: RAPORT + AJUSTARE OWNER

### 5.1 Tabelul general
- Director General / Owner / Reprezentant legal vede tabelul final
- Poate face ajustări motivate (proposeGradeAdjustment)
- Vede impactul fiecărei ajustări (getAdjustmentImpact)

### 5.2 Validare finală + semnătură
- Owner validează configurația
- Semnătură electronică + loc olograf
- Raportul devine oficial (RDA)

**STATUS COD:**
- [x] proposeGradeAdjustment — există
- [x] getAdjustmentImpact — există
- [x] startOwnerValidation — există
- [x] getHierarchyForValidation — există
- [x] confirmAdjustment — există
- [x] finalizeSession — există
- [x] Pagină validare cu semnătură (electronică + olografă) — există complet
- [ ] Deschidere raport inline (panou lateral) — în curs

---

## REZUMAT GAP-URI

| Componentă | Existentă | Efort estimat |
|-----------|-----------|--------------|
| Formular definire membru comisie | ❌ | Mediu |
| Alocare fișe per membru | ❌ | Mediu |
| Onboarding personalizat membru | ❌ | Mic |
| AI sugestie scor cu argumentare | ❌ | Mediu |
| Dashboard progres admin per membru | Parțial | Mic |
| Reminder automat email | ❌ | Mic |
| Forum/comentarii per criteriu | ❌ | Mare |
| AI sinteză argumente + compromis | ❌ | Mare |
| Tablou consens ușor de urmărit | ❌ | Mare |
| Validare individuală (varianta mea vs consens) | ❌ | Mediu |
| Accept/Contest per criteriu schimbat | ❌ | Mediu |
| Tabel read-only post-validare | ❌ | Mic |
| Auto-close etapă | ❌ | Mic |
| Panou rapoarte inline | Parțial | Mic |

**Ce funcționează SOLID:** Invitare email, scorare 6 criterii, detectare divergențe, recalibrare, vot, facilitator decide, ajustare owner, validare+semnătură.

**Ce lipsește fundamental:** Formularul de configurare comisie (membrii + alocare fișe), discuția de grup (forum + AI mediere), validarea individuală post-consens.
