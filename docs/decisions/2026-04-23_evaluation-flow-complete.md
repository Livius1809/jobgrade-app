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

### 3.2 Mecanismul de pornire a discuției
- Pe fiecare fișă de post, se pornește de la PRE-SCORAREA membrului responsabil (cel care a avut calupul)
- Toți ceilalți membri scorează aceeași fișă
- Sistemul compară automat:
  - Varianta inițială (pre-scorarea membrului responsabil)
  - Voturile celorlalți membri
  - Identifică divergențe per criteriu

### 3.3 Discuție per criteriu divergent
- Pe fiecare criteriu cu divergență:
  - Se vede scorul inițial (pre-scorare) vs scorurile celorlalți
  - Fiecare membru poate posta comentariu/argumentare
  - Poate modifica scorul (recalibrare)
  - AI sintetizează argumentele și propune compromis
- Formatul: tip forum/chat per criteriu cu voturi — ușor de urmărit pentru membri și de mediat pentru AI

### 3.4 Mecanismul de consens (3+1 sub-etape)
1. **Automat**: dacă toți au dat aceeași literă → consens automat, se trece la următoarea fișă
2. **Recalibrare**: cei din minoritate primesc argumentele majorității + info suplimentar → pot recalibra
3. **Vot final**: dacă tot nu e consens → vot, majoritate simplă câștigă
4. **Facilitare AI** (var B): dacă votul e la egalitate → AI analizează toate argumentele, propune scor de compromis cu motivare → membrii acceptă sau contestă → dacă majoritate acceptă, devine scor final

### 3.5 AI mediază (varianta B) — mecanismul detaliat
- AI primește: pre-scorarea inițială, scorurile tuturor membrilor, argumentele postate
- AI analizează și propune compromis cu motivare explicită
- Membrii pot accepta sau contesta (cu motivare)
- Dacă acceptat de majoritate → devine scorul final pe acel criteriu
- Dacă contestat → facilitare manuală (owner decide)

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
