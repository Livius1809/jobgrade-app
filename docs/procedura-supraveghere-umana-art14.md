# Procedura de Supraveghere Umană — Art. 14 AI Act

**Conform Regulamentul (UE) 2024/1689, Art. 14 — Supravegherea Umană**

---

**Operator:** Psihobusiness Consulting SRL  
**CIF:** RO15790994  
**Platforma:** JobGrade (jobgrade.ro)  
**Versiune document:** 1.0  
**Data întocmirii:** 03.04.2026  
**Responsabil document:** Liviu Stroie (Owner)  
**Validare profesională:** Psiholog acreditat CPR (vezi secțiunea 2)

---

## 1. Scopul procedurii

Prezenta procedură formalizează mecanismul de supraveghere umană pentru sistemul AI cu risc ridicat (Anexa III, punct 4.a) al platformei JobGrade, în conformitate cu Art. 14 din Regulamentul (UE) 2024/1689 (AI Act).

**Principiu fundamental:** JobGrade este o companie de psihologie organizațională care folosește AI ca instrument sub supraveghere profesionistă. AI-ul asistă, omul decide.

---

## 2. Echipa de supraveghere umană

### 2.1 Psiholog principal — Supervizor AI Act

| Atribut | Detalii |
|---------|---------|
| Statut | Angajat cu contract individual de muncă (nu colaborator) |
| Acreditare | **Colegiul Psihologilor din România (CPR)** |
| Specialitate | **Psihologia muncii, transporturilor și serviciilor** |
| Atestat | Liberă practică cu număr de marcă înregistrat în Registrul Unic CPR |
| Relevanță AI Act | Acoperire exactă a domeniului în care operează sistemul AI (evaluare posturi, ierarhizare, impact HR) |

**Competențe profesionale relevante Art. 14:**
- Evaluarea și clasificarea posturilor (metodologii validate științific)
- Analiza structurilor salariale și a echității interne
- Psihometrie aplicată (scale, criterii, subfactori)
- Interpretarea rezultatelor evaluărilor în context organizațional
- Identificarea biasurilor în procese de evaluare
- Deontologie profesională (Codul CPR)

### 2.2 Al doilea psiholog

| Atribut | Detalii |
|---------|---------|
| Statut | Angajat cu contract individual de muncă |
| Rol | Suport evaluare, validare secundară, continuitate operațională |
| Detalii | TBD — se va completa la angajare |

### 2.3 Proprietar platformă (Owner)

| Atribut | Detalii |
|---------|---------|
| Nume | Liviu Stroie |
| Rol AI Act | Responsabil final conformitate; decizie pe escaladări |
| Competență | Experiență psihologie organizațională + arhitectură platformă |

---

## 3. Puncte de intervenție umană obligatorii

### 3.1 Matricea de supraveghere

| Funcționalitate AI | Tip decizie | Supervizor | Nivel intervenție | Frecvență |
|---------------------|-------------|------------|-------------------|-----------|
| Generare fișe de post | Sugestie | Psiholog CPR | **Validare** — AI generează, psihologul aprobă/corectează | La fiecare generare |
| Scorare/evaluare posturi (6 criterii) | Asistare | Psiholog CPR | **Supraveghere activă** — AI asistă, comitetul uman scorează | Sesiune completă |
| Sugestii benchmark (posturi) | Sugestie | Psiholog CPR | **Validare** — AI sugerează, psihologul confirmă lista | La inițierea sesiunii |
| Slotting non-benchmark | Asistare | Psiholog CPR | **Validare rapidă** — AI pre-match, comitetul confirmă | Per post |
| Analiza pay gap (Art. 9) | Calcul automat | Psiholog CPR | **Revizuire periodică** — AI calculează, psihologul interpretează | La generare raport |
| Joint Assessment (Art. 10) | Remediere | Psiholog CPR + Owner | **Supraveghere activă** — AI identifică, echipa umană decide planul | La declanșare (gap >5%) |
| Ajustări grade Owner | Decizie | Psiholog CPR | **Aviz profesional** — Owner ajustează, psihologul validează coerența | La finalizare sesiune |
| Recomandări salariale | Sugestie | Psiholog CPR | **Validare** — AI sugerează, psihologul verifică echitatea | La utilizare |
| Agenți AI conselling (B2C planificat) | Interacție directă | Psiholog CPR | **Supraveghere continuă** — SafetyMonitor detectează, psihologul intervine la CRITIC/RIDICAT | Monitorizare zilnică |
| MEDIATOR AI (consens JE) | Facilitare | Psiholog CPR | **Monitorizare** — AI mediază, psihologul intervine la blocaj | Per sesiune mediere |

### 3.2 Niveluri de intervenție

| Nivel | Definiție | Exemplu |
|-------|-----------|---------|
| **Monitorizare** | Psihologul revizuiește periodic output-urile AI fără intervenție activă | Rapoarte zilnice de activitate |
| **Revizuire periodică** | Psihologul verifică rezultatele la intervale definite | Rapoarte pay gap trimestriale |
| **Validare** | AI generează, psihologul aprobă/respinge/corectează înainte de livrare | Fișe de post, benchmarks |
| **Supraveghere activă** | Psihologul participă în timp real la procesul asistat de AI | Sesiuni evaluare, mediere |
| **Intervenție directă** | Psihologul preia controlul de la AI | Escaladare SafetyMonitor CRITIC |

---

## 4. Procedura de override

### 4.1 Override tehnic (existent în platformă)
- Orice utilizator autorizat (OWNER, COMPANY_ADMIN, FACILITATOR) poate modifica deciziile AI
- Modificările sunt logate în audit trail cu motivația
- Owner-ul poate ajusta grade cu justificare din MVV (litere + grade vizibile, punctaje ascunse)

### 4.2 Override profesional (nou — Art. 14)
- Psihologul CPR poate **opri orice proces AI** dacă detectează:
  - Bias sistemic în evaluări
  - Rezultate inconsistente cu literatura de specialitate
  - Risc de discriminare indirectă
  - Neconformitate cu standardele profesionale CPR
- Oprirea se documentează în **Registrul de Supraveghere** (secțiunea 6)
- Owner-ul este notificat imediat via ntfy

### 4.3 Procedura de oprire

```
1. Psiholog detectează problemă → documentează observația
2. Psiholog clasifică severitatea: MINOR / MAJOR / CRITIC
3. MINOR: observație în registru, monitorizare continuă
4. MAJOR: oprire funcționalitate afectată, notificare Owner, remediere în 5 zile lucrătoare
5. CRITIC: oprire imediată a întregului modul afectat, notificare Owner, remediere înainte de repornire
```

---

## 5. Competence matrix — bazată pe standarde CPR

### 5.1 Cerințe pentru Supervizor AI Act (Psiholog principal)

| Competență | Standard | Verificare |
|------------|----------|------------|
| Acreditare CPR activă | Colegiul Psihologilor din România, specialitatea muncă | Nr. marcă în Registrul Unic |
| Atestat de liberă practică | CPR — confirmare competență profesională | Atestat valid, neexpirat |
| Cunoașterea metodologiei JE | Curs intern + practică asistată (min. 3 sesiuni) | Certificat intern + log sesiuni |
| Cunoașterea platformei AI | Training pe funcționalitățile AI ale platformei | Test de verificare + log |
| AI Act awareness | Curs/training pe AI Act Art. 14 și obligații | Certificat/confirmare participare |
| Deontologie profesională | Codul deontologic CPR actualizat | Declarație anuală |

### 5.2 Training obligatoriu

| Modul | Conținut | Frecvență |
|-------|---------|-----------|
| T1 — Platforma JobGrade | Funcționalitățile AI, limitări, cum interpretezi output-urile | La angajare + anual |
| T2 — Metodologia 6 criterii | Baremele, conversiile, interpretarea gradelor | La angajare + la modificări |
| T3 — AI Act Art. 14 | Obligații supervizor, procedura de override, registru | La angajare + anual |
| T4 — Bias și discriminare | Identificare biasuri în evaluări AI, tehnici de corecție | Semestrial |
| T5 — Cazuistică | Analiza cazurilor reale de intervenție/override | Trimestrial |

---

## 6. Registrul de supraveghere

### 6.1 Structura registrului

Fiecare intrare conține:

| Câmp | Descriere |
|------|-----------|
| Data și ora | Timestamp intervenție |
| Supervizor | Numele psihologului + nr. marcă CPR |
| Funcționalitate AI | Ce modul AI a fost supervizat |
| Tip intervenție | Monitorizare / Revizuire / Validare / Supraveghere activă / Override |
| Observații | Ce a constatat supervizorul |
| Acțiune luată | Aprobare / Corecție / Oprire / Escaladare |
| Justificare profesională | De ce a luat această decizie (referință la standarde CPR dacă relevant) |
| Impact | Ce s-ar fi întâmplat fără intervenție (estimare) |
| Follow-up | Acțiuni ulterioare necesare |

### 6.2 Păstrare

- **Digital:** Stocat în baza de date platformei, tabel dedicat
- **Perioadă retenție:** Minim 5 ani de la ultima intrare (conform AI Act Art. 12)
- **Acces:** Owner + Psiholog CPR + Auditor extern (la cerere)
- **Format export:** PDF + JSON pentru autoritățile competente

---

## 7. Raportare și audit

### 7.1 Raportare internă

| Raport | Frecvență | Destinatar | Conținut |
|--------|-----------|------------|---------|
| Raport supraveghere zilnică | Zilnic (automat) | Owner (via ntfy) | Nr. validări, override-uri, observații |
| Raport supraveghere lunar | Lunar | Owner + Psiholog | Statistici, tendințe, recomandări |
| Raport audit intern | Trimestrial | Management | Eficacitatea supravegherii, gaps, îmbunătățiri |

### 7.2 Audit extern

- **Frecvență:** Anual (minim) sau la cererea autorităților
- **Cine:** Auditor extern specializat AI Act
- **Ce verifică:** Conformitate Art. 14, registru supraveghere, competence matrix, eficacitatea override-urilor
- **Budget estimat:** 5.000 - 10.000 EUR/audit

---

## 8. Specificitate psihologia muncii — de ce acoperirea e exactă

Art. 14 AI Act cere ca supravegherea să fie exercitată de persoane care "au competența, formarea și autoritatea necesare" (Art. 14, para. 4, lit. a).

**Argumentul Psihobusiness:**

| Cerință Art. 14 | Cum e acoperită |
|-----------------|-----------------|
| Competență în domeniu | Psiholog acreditat CPR pe **psihologia muncii** = exact domeniul sistemului AI |
| Formare profesională | Atestat de liberă practică CPR = formare verificată și atestată de organism profesional |
| Autoritate de intervenție | Angajat cu drept de override profesional = autoritate reală, nu formală |
| Înțelegere capacități/limitări AI | Training intern obligatoriu pe platforma AI (Modul T1+T2) |
| Capacitate de interpretare output | Competență în psihometrie, evaluare posturi, analiză salarială |
| Capacitate de decizie informată | Judecată clinică profesionistă > override tehnic generic |

**Concluzie:** Combinația psiholog CPR acreditat pe muncă + AI ca instrument sub supraveghere profesionistă acoperă **integral** cerințele Art. 14 AI Act.

---

## 9. Revizuire și actualizare

| Eveniment | Acțiune |
|-----------|---------|
| Modificare funcționalități AI | Actualizare matrice supraveghere (secțiunea 3) |
| Schimbare supervizor | Verificare acreditare CPR + training obligatoriu |
| Modificare AI Act | Consultare CJA + actualizare procedură |
| Incident de supraveghere | Analiză root cause + actualizare procedură |
| Audit extern | Integrare recomandări + actualizare |

**Ultima actualizare:** 03.04.2026  
**Următoarea revizuire programată:** 03.07.2026 (trimestrial)
