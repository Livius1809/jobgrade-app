# Evaluare Comună Art. 10 — Specificație completă (Owner 24.04.2026)

## Pre-requisite (din Pas 14)
- Raport comparativ pay gap pe muncă egală predat automat
- Conține: tipul decalajului (M-M, M-F, F-M, F-F), caracteristici, analiză diferențe, măsuri propuse
- Raportul e vizibil tuturor membrilor comisiei din momentul configurării

## BLOC 1: Configurare evaluare comună

### 1.1 Trigger
- Automat: flagul pay gap >5% din Pas 14
- Notificare admin cont: "Decalaj salarial >5% detectat — evaluare comună obligatorie Art. 10"

### 1.2 Definire membri comisie evaluare comună (admin cont)
- **Reprezentant salariați** — obligatoriu conform legii, desemnat de angajați
  - Nume, funcție, departament, email, telefon
  - Flag "Reprezentant salariați" (diferit de management)
- **Reprezentant HR** — responsabil date salariale
- **Reprezentant management** — decident buget
- **Alți membri** opțional (sindcat, consilier extern)
- Aceleași componente ca la comisia JE (formular, invitație, onboarding)

### 1.3 Încărcare raport comparativ
- Raportul preluat automat din Pas 14 devine documentul de lucru
- Conține:
  - Categorii cu decalaj >5% (grupuri muncă egală × normă)
  - Tip decalaj: M-F (bărbați câștigă mai mult), F-M (femei câștigă mai mult), M-M, F-F (intra-gen)
  - Angajații din fiecare grup (anonimizat sau nu, funcție de setare)
  - Justificările existente (din Pas 14, dacă au fost completate)
  - Măsuri propuse automat (AI sugerează pe baza pattern-urilor)
- Toți membrii comisiei văd raportul complet din momentul configurării

### 1.4 Structura raportului preliminar (capitole)
1. **Constatare**: categorii afectate, dimensiune decalaj, angajați vizați
2. **Analiză cauze**: cauze identificate per categorie (vechime, competențe, piață etc.)
3. **Justificări obiective**: ce diferențe sunt justificate și de ce
4. **Diferențe nejustificate**: ce trebuie corectat
5. **Plan de corecție**: măsuri concrete, responsabili, termene, buget
6. **Monitorizare**: indicatori, frecvență verificare, termen legal (6 luni)

## BLOC 2: Vot și consens per capitol

### 2.1 Votul membrilor
- Fiecare membru votează pe fiecare capitol din raportul preliminar:
  - **Soliditatea argumentelor** — cauzele identificate sunt corecte?
  - **Fezabilitatea măsurilor** — planul de corecție e realist?
  - **Planul de urmat** — sunt de acord cu termenele și responsabilii?
  - **Monitorizare** — mecanismul de verificare e adecvat?
- Buton "Validează" per capitol (nu per tot raportul)
- Dacă nu validează → comentariu obligatoriu (ce nu e de acord și ce propune)

### 2.2 AI mediator
- Oferă explicații suplimentare pe baza datelor:
  - "Diferența de X% pe categoria Y poate fi explicată prin diferența de vechime medie: F=3.2 ani vs M=7.1 ani"
  - "Conform Art. 4, competențele suplimentare sunt criteriu obiectiv acceptabil"
- Mediază ajungerea la consens (aceleași componente ca la JE Bloc 3)
- VideoConferință disponibilă (Jitsi Faza 1 / LiveKit Faza 2)

### 2.3 Progres consens
- Progress bar per capitol: câți au validat / total
- Când toți validează un capitol → marcat verde, read-only
- Când toate capitolele validate → raport finalizat

## BLOC 3: Discuție grup + video
- Aceleași componente: GroupDiscussionView, DiscussionPanel, VideoConference
- Adaptat: în loc de criterii A-G, capitolele raportului
- AI mediator contextualizat pe pay gap (nu pe evaluare posturi)

## BLOC 4: Semnătură — FIECARE MEMBRU (nu doar Owner)

### 4.1 Semnătură individuală
- Fiecare membru semnează (electronică + olografă):
  - Varianta finală a raportului
  - Toate componentele discutate (capitolele)
  - Versiunea curentă (nu versiunea inițială)
- NU e doar Owner — toți membrii inclusiv reprezentantul salariaților

### 4.2 Versiuni raport
- **V1 (inițial)**: raportul preliminar generat automat din date
- **V2 (după consens)**: raportul cu modificările din discuție
- **V3...Vn (monitorizare)**: la fiecare ciclu de monitorizare

### 4.3 Reluare proces (monitorizare progres)
- La termenul de verificare (din planul de corecție):
  - Se încarcă **versiunea curentă** (date actualizate: salarii, gap recalculat)
  - Se compară cu **versiunea inițială** (V1, inactivă, referință)
  - Membrii evaluează: progresul e suficient?
  - Dacă gap-ul a scăzut sub 5%: proces încheiat cu succes
  - Dacă nu: noi măsuri, noi termene → ciclul continuă

### 4.4 Jurnal proces
- Automat, structurat pe categorii (la fel ca JE):
  - Setup, Analiză, Discuții, Voturi, Mediere AI, Semnături
- Exportabil PDF
- Include toate versiunile (V1→Vn) cu diff-urile

### 4.5 Monitorizare termene legale
- Termen maxim: 6 luni de la constatare (Art. 10 alin. 3)
- Avertizări automate:
  - La 4 luni: "Aveți 2 luni rămase pentru finalizarea planului"
  - La 5 luni: "O lună rămasă — escalare urgentă"
  - La 5.5 luni: "Termen imediat — risc sancțiuni"
- Notificări: email + dashboard Owner + reprezentant salariați

## Componente reutilizate din JE
- CommitteeConfigForm (formular membri, invitații)
- DiscussionPanel (forum threaded, AI bubble)
- VideoConference (Jitsi/LiveKit)
- SessionJournal (jurnal structurat)
- SignatureCanvas (semnătură electronică)
- AdminProgressDashboard (progres per membru)
- EvaluationReminderEmail (remindere automate)

## Componente noi necesare
- JointAssessmentReport (raport preliminar cu capitole)
- ChapterVoting (vot per capitol cu progress)
- VersionComparison (diff V1 vs Vn)
- LegalDeadlineMonitor (avertizări termene)
- GapTypeIndicator (M-F, F-M, M-M display)
