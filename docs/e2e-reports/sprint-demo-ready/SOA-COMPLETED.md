# SOA — Simulare customer journey B2B narativ

**Status:** COMPLETED
**Task ID:** cmnsyld920027zkvhbf0as7w5

---

# Simulare Customer Journey B2B — TechFlow Solutions

## 1. Profil Companie Ficțională

### TechFlow Solutions SRL
- **Industrie:** Software development & IT consulting
- **Angajați:** 80 (Bucuresti 60, Cluj 20)
- **Fondată:** 2018
- **Cifra afaceri:** ~8M EUR (2023)
- **Clienți:** Mid-market românesc + export Germania/Austria
- **Pain points:** 
  - Creștere rapidă → ierarhie improvizată
  - Diferențe salariale mari între dezvoltatori
  - Presiune Directiva EU (transpunere iunie 2026)
  - Tensiuni interne: "de ce primește X mai mult decât Y?"

### Organigramă Simplificată
```
CEO (Dan Popescu)
├── CTO (40 developers + QA)
├── Sales Director (8 persoane)
├── HR Director (Ioana Marinescu) ← PERSONA NOASTRĂ
└── Finance Director (4 persoane)
```

### Context Financiar
- **Bugete HR:** ~150K EUR/an
- **Istoric consultanți:** Au plătit 25K EUR în 2022 pentru "organizare departamente" (rezultat mediu)
- **Trigger:** Audit intern găsit discrepanțe salariale 40% pentru roluri similare

## 2. Persona Detaliată: HR Director

### Ioana Marinescu (35 ani)
**Rol:** HR Director (în poziție din ianuarie 2023)
**Background:** 8 ani experiență HR (anterior la eMAG, Zitec), masterand psihologia muncii
**Raportează la:** CEO direct
**Echipa:** HR Specialist (junior), HR Intern

### Pain Points Concrete
1. **Presiune CEO:** "Rezolvă diferențele salariale până în mai, altfel vin consultanții din nou"
2. **Lipsă metodologie:** Evaluările cu "Excel și intuiție" — nu rezistă la audit
3. **Transparență zero:** Angajații întreabă criterii promovare, ea nu are răspuns clar
4. **Deadline legal:** Directiva EU 2023/970 → implementare obligatorie 2026
5. **Buget limitat:** Max 30K EUR pentru soluție (vs. 50K+ consultanți)

### Profile Psihologic (calibrat cultural RO)
- **Evitare risc RIDICATĂ:** Preferă soluții dovedite vs. experimente
- **Perfectionism:** Documentează totul, vrea certitudine metodologică  
- **Colaborativă:** Lucrează bine în echipă, ascultă feedback
- **Sceptică cu vendors:** "Am mai auzit promisiuni..."
- **Orientată rezultat:** Vrea să vadă progres săptămânal, nu doar teorii

## 3. Dialog Scripturat Customer Journey

### Turn 1: First Contact (Email Inbound Lead)
**Context:** Ioana găsește JobGrade prin căutare Google "evaluare pozitii transparenta salariala romania"

**Email Ioana → SOA:**
```
Bună ziua,

Sunt HR Director la TechFlow Solutions (80 angajați, IT). Avem nevoie urgentă de o metodologie pentru evaluarea posturilor - diferențe salariale mari și presiune din partea CEO.

Am văzut pe site că aveți soluție specifică pentru Directiva EU. Putem să vorbim? Bugetul e limitat, nu vrem consultanți de 50K€ din nou.

Ioana Marinescu
HR Director, TechFlow Solutions
```

**Răspuns SOA (2h mai târziu):**
```
Bună ziua Ioana,

Înțeleg perfect situația - diferențele salariale nefondate creează tensiuni și risc legal cu noua directivă.

La TechFlow cu 80 angajați în IT, de obicei identificăm 15-25% discrepanțe care pot fi corectate fără majorări masive, doar prin redistribuire inteligentă.

Pot să vă arăt în 20 de minute cum arată o evaluare JobGrade pe pozițiile dumneavoastră? Mâine la 14:00 aveți liber?

Best,
Alex (JobGrade Sales)
```

**Interface expectat:** CRM nota lead-ul ca "QUALIFIED - IT Director, 80ee, urgent need, budget conscious"

---

### Turn 2: Scheduling Demo
**Ioana:**
```
Da, mâine la 14:00 merge. O să fiu cu Dan (CEO) primele 10 minute, apoi continuu singură.

Ce informații trebuie să pregătesc?
```

**SOA:**
```
Perfect! Pentru demo eficient, ajută dacă aveți:
- 3-4 poziții tipice (ex: Developer Senior vs Junior, QA Lead)
- Salariile curente aproximative (fără nume, doar cifre)

Demo-ul e pe datele dumneavoastră reale (anonimizate), nu pe slideuri generice.

Link Zoom: [link]
Mâine la 14:00, 20 minute.
```

**Interface expectat:** Calendar booking system cu reminder automat + prep checklist pentru demo

---

### Turn 3: Demo Live (via Zoom)
**Context:** Ioana e cu CEO primele 10 minute, apoi singură

**SOA (începutul demo):**
```
Bună ziua! Să vedem cum arată ierarhia reală din TechFlow și unde sunt diferențele care vă creează probleme.

[Screen share - JobGrade demo environment]

Ioana, ați spus că aveți dezvoltatori senior cu salarii diferite. Să luăm două poziții: "Software Developer Senior" și "QA Lead". Care e salariul aproximativ pentru fiecare?
```

**Ioana:**
```
Developer Senior: între 12.000-16.000 lei (de aici problema...)
QA Lead: 13.500 lei
```

**SOA (în platform):**
```
Perfect. Vedeți aici - introduc pozițiile...

[Demo live în JobGrade:]
1. Creez "Software Developer Senior" 
2. Evaluez pe 6 criterii: natura muncii, formarea necesară, condiții lucru, responsabilitatea, experiența, abilități interpersonale
3. Scor final: 342 puncte = Grad 8
4. Creez "QA Lead" → Scor final: 378 puncte = Grad 9

Diferența e justificată metodologic: QA Lead-ul coordonează echipă + răspunde pentru calitate în producție.

Dar cei doi "Developer Senior" cu 12K vs 16K... aici vedem dacă diferența e reală sau doar istorică.
```

**CEO Dan (înainte să plece):**
```
Mi-ai rezolvat problema: vreau toate pozițiile evaluate până în mai. Ioana, dacă e ok pentru tine, mergem înainte.
```

**Interface expectat:** Demo environment cu date TechFlow pre-populate, scoring live, export PDF instant cu rezultate

---

### Turn 4: Post-Demo Follow-up
**SOA (1h după demo):**
```
Mulțumesc pentru demo! Iată raportul generat pentru pozițiile evaluate:
[attachment: TechFlow_JobGrade_Sample.pdf]

Pentru toate cele ~25 poziții de la TechFlow, procesul durează 2-3 săptămâni:
- Săptămâna 1: Configurare + evaluare toate pozițiile
- Săptămâna 2: Review cu managerii + ajustări
- Săptămâna 3: Raport final + recomandări implementare

Investiția: 15.900 EUR anual (vs. 50K consultanți). Pot să vă trimit propunerea detaliată?
```

**Ioana:**
```
Da, trimiteți propunerea. O întrebare: dacă găsim diferențe mari, cum recomandați să corectăm fără să spargem bugetul salarial?

Și mai am o neliniște: ce se întâmplă dacă metodologia voastră nu rezistă la un audit extern?
```

**SOA:**
```
Excelente întrebări:

1. **Corecții buget-friendly:** De obicei 70% se rezolvă prin redistributie (componente variabile, beneficii, titluri) + 30% ajustări reale etalonate în timp.

2. **Audit-proof:** Metodologia JobGrade respectă standardul european EN 15838 pentru evaluarea posturilor. Avem clienți care au trecut cu succes prin audituri ITM și controller extern.

Garanție: dacă în 12 luni metodologia nu rezistă la audit, returnăm integral investiția.
```

**Interface expectat:** CRM nota "DEMO_COMPLETED - High interest, budget concerns addressed, CEO buy-in, technical questions"

---

### Turn 5: Propunere Comercială
**SOA (următoarea zi):**
```
Ioana,

Atașez propunerea pentru TechFlow:

**JobGrade Enterprise - TechFlow Solutions**
- Setup complet: toate pozițiile evaluate și documentate
- Platformă online: acces admin + 3 evaluatori
- Rapoarte conformitate Directiva EU
- Training echipă: 4 ore
- Support 12 luni

**Investiție:** 15.900 EUR/an (vs. 25K+ consultanți per proiect)
**Timeline:** Implementare completă în 3 săptămâni

Dacă aprobați până vineri, încep setup-ul săptămâna viitoare.
```

**Ioana:**
```
Prețul e ok, dar am nevoie de 2 modificări:
1. Trial 14 zile înainte de semnare (să văd că merge cu echipa noastră)
2. Plată în 2 tranșe: 8K la început, 7,9K după deliveryul final

CEO-ul întreabă: aveți și alți clienți IT din România? Referințe?
```

**SOA:**
```
Perfect pe modificări:

1. ✅ Trial 14 zile, fără card - evaluați 5 poziții complet
2. ✅ Plată 50% la început, 50% la delivery final

Referințe IT România (cu permisiune client):
- **eMAG** (300+ poziții evaluate, 2023)  
- **Zitec** (150 poziții, 2024)
- **UiPath România** (80 poziții, implementare Q4 2024)

Contact referință: Marius T., Head of C&B la Zitec - marius.t@zitec.com

Să începeți trial-ul săptămâna aceasta?
```

**Interface expectat:** Contract generator cu clauzele modificate, lista referințe verificabilă, trial setup automat

---

### Turn 6: Trial Setup & Onboarding Start
**Ioana:**
```
Am vorbit cu Marius de la Zitec - feedback foarte pozitiv. Să pornioam trial-ul.

Echipa evaluare va fi:
- Ioana (HR Director) - admin
- Dan (CEO) - reviewer  
- Andrei (CTO) - evaluator tehnic
```

**SOA:**
```
Excelent! V-am configurat contul de trial:
- Link platform: https://app.jobgrade.ro/techflow-trial  
- Login: ioana.marinescu@techflow.ro
- Password: [generat securizat]

**Next Steps:**
1. Astăzi: Login + invite echipă (Dan, Andrei)
2. Mâine: Training 30 min pe Zoom - cum evaluați eficient
3. Săpt viitoare: Evaluăm primele 5 poziții împreună

Sună bine?
```

**Interface expectat:** Trial account cu TechFlow branding, dashboard setup, user management pentru echipă

---

### Turn 7: First Job Creation & Evaluation
**Context:** După training-ul de 30 min, Ioana începe să creeze primul job

**Ioana (prin chat în platformă):**
```
Am creat poziția "Software Developer Senior" dar nu sunt sigură la criteriul "Responsabilitate" - ce înseamnă exact "răspundere pentru resurse financiare"?

La un developer, asta înseamnă bugetul proiectului sau doar timpul propriu?
```

**SOA (live chat support):**
```
Bună întrebare! Pentru Developer Senior:

**Răspundere financiară = impactul deciziilor lui tehnice:**
- Bug în producție → cost downtime
- Arhitectură proastă → cost refactoring  
- Deadline ratat → penalități client

Dacă nu gestionează direct buget de echipă/proiect, punctajul e 2-3.
Dacă decide asupra vendor-ilor sau resurselor cloud, punctajul e 4-5.

Ajută?
```

**Ioana:**
```
Da! Am setat 3 puncte. Următorul criteriu: "Condiții de lucru" - dezvoltatorii lucrează hybrid, birou modern, dar uneori stress la deadline-uri. Cum evaluez?
```

**SOA:**
```
Perfect setup pentru punctaj 2:
- Mediu fizic excelent (birou modern)  
- Flexibilitate mare (hybrid)
- Stress episodic (deadline-uri) = normal în IT

Punctaj 1 = condiții grele permanent
Punctaj 4+ = risc fizic sau mental constant

Pentru IT hybrid cu stress ocazional → punctaj 2 e corect.
```

**Interface expectat:** Live chat integration în platformă, knowledge base cu exemple per industrie, progress tracking pentru evaluare

---

### Turn 8: Committee Review & Consensus
**Context:** După ce Ioana a evaluat prima poziție, Dan (CEO) și Andrei (CTO) fac review

**Andrei (CTO, prin platformă):**
```
Am văzut evaluarea pentru "Software Developer Senior". Punctajul pentru "Abilități interpersonale" mi se pare mic (2 puncte) - desenvoltatarii noștri prezintă la client, comunică cu PM, fac code review.
```

**Ioana:**
```
Ai dreptate, Andrei. Să modificăm la 3 puncte?
```

**Dan (CEO):**
```
Confirm 3 puncte. Și eu am observat - la "Experiență necesară" ați pus 4 ani. La noi cererea e minimum 5 ani pentru poziția Senior. Să ajustăm?
```

**SOA (moderare prin chat):**
```
Excellentă colaborare! Vedeți cum funcționează comitetul:

Modificări sugerate:
- Abilități interpersonale: 2 → 3 puncte ✅
- Experiență necesară: 4 → 5 ani ✅

**Impact pe scor final:**
- Scor original: 342 puncte
- Scor ajustat: 356 puncte  
- Grading rămâne același (Grad 8)

Confirmați modificările?
```

**Interface expectat:** Review workflow cu tracking modificări, notificări în timp real, consensus tracking pentru fiecare criteriu

---

### Turn 9: First Report Generation
**Context:** Prima poziție evaluată și aprobată de comitet

**Ioana:**
```
Gata cu prima evaluare! Cum generez raportul pentru această poziție?
```

**SOA:**
```
Super! Apăsați pe "Generate Report" din dashboard.

Raportul va conține:
- **Scor final:** 356 puncte = Grad 8
- **Breakdown pe criterii:** vizualizare grafică
- **Benchmark:** comparație cu alte pozitii similare (anonimizate)
- **Recomandări salariale:** pentru piața românească IT
- **Documentație audit:** metodologia aplicată

Generez acum?
```

**Ioana (3 minute mai târziu):**
```
Wow! Raportul arată foarte profesional. În special secțiunea "Metodologie aplicată" - exact ce îmi trebuie pentru auditurile viitoare.

O întrebare: în "Recomandări salariale" apare banda 13.500-15.800 lei pentru grad 8. Cum ați calculat aceste cifre?
```

**SOA:**
```
Excelentă întrebare! Banda salarială se bazează pe:

**Date piață România IT (2024):**
- Salariu mediu pentru experiența echivalentă
- Ajustare pentru București vs. alte orașe
- Size-ul companiei (80 angajați = mid-market)
- Industria software development

**Formula:** Punctaj JobGrade × Coeficient piață × Ajustare locație/industrie

Pentru transparență completă, în raport aveți și sursa datelor utilizate.
```

**Interface expectat:** Report generator cu PDF professional, grafice interactive, sourcing transparent pentru date salariale

---

### Turn 10: Scale Planning & Contract Decision
**Context:** După prima poziție evaluată cu succes

**Dan (CEO) prin email:**
```
Ioana, Alex,

Sunt impressed cu procesul și rezultatele. Să mergem la scara completă:
- Toate pozițiile evaluate (25 poziții estimate)
- Timeline: finalizare până în mai 
- Budget aprobat: 15.900 EUR conform propunerii

Când putem semna contractul?
```

**SOA:**
```
Fantastic, Dan! 

**Planning Scale-up pentru TechFlow:**

**Săptămâna 1-2:** Setup toate pozițiile + evaluări în paralel
**Săptămâna 3:** Review comitet pentru toate + ajustări
**Săptămâna 4:** Rapoarte finale + plan implementare

**Timeline delivery:** Miercuri, 15 mai (conform cererii CEO)

Contractul e pregătit cu modificările agreate (plată 2 tranșe). Îl semnez eu pentru JobGrade, Dan pentru TechFlow.

Zoom call mâine la 15:00 pentru semnare electronică?
```

**Interface expectat:** Contract management system, electronic signature workflow, project timeline cu milestones

---

### Turn 11: Contract Signature & Full Onboarding
**Context:** Call de semnare contract

**Dan (CEO):**
```
Perfect, contract semnat electronic. Când începeți cu setup-ul complet?
```

**SOA:**
```
Mulțumesc! Săptămâna aceasta pregătim toată infrastructura:

**Până vineri:**
- Account complet TechFlow (fără limitări trial)
- Import toate pozițiile din org chart
- Setup 3 evaluatori: Ioana, Dan, Andrei
- Calibrare proces intern pentru eficiență

**Săptămâna viitoare:** Prima sesiune evaluare intensivă (10 poziții/zi)

Ioana, aveți organigrama completă cu toate pozițiile de evaluat?
```

**Ioana:**
```
Da, am pregătit Excel cu toate pozițiile:
- Development: 8 pozitii distincte (Junior, Senior, Lead, Principal)
- QA: 3 poziții (Tester, QA Lead, QA Manager) 
- Sales: 5 poziții (SDR, Account Executive, Sales Manager, etc.)
- Support: 9 poziții (HR, Finance, Admin, etc.)

Total: 25 poziții pentru evaluare.
```

**Interface expectat:** Bulk import system pentru poziții, project dashboard cu progress tracking, onboarding checklist

---

### Turn 12: Success Metrics & Handoff to CSSA
**Context:** După 2 săptămâni de utilizare intensivă

**Ioana:**
```
Alex, update după primele evaluări complete:

✅ **Progres:** 23 din 25 poziții evaluate și aprobate  
✅ **Echipa:** Toți 3 evaluatorii confortabili cu procesul
✅ **Timpii:** Medie 25 min/poziție (vs. 2-3 ore cu Excel!)
✅ **Discover:** Am identificat 6 discrepanțe salariale majore care trebuie corectate

**Probleme:** Doar 2 poziții încă în review (cerințe foarte specifice)
**Next:** Raport final + plan implementare pentru diferențele găsite

Rating experiența de setup: 9/10. Recomand și la Zitec și la alte companii partenere.
```

**SOA:**
```
Excelent feedback, Ioana! Exact rezultatul pe care îl țintim.

**Handoff pentru support continuu:**
- De acum înainte: echipa Customer Success (CSSA) 
- Contact direct: maria.popescu@jobgrade.ro
- Response time: sub 4h pentru întrebări  
- Check-in lunar: progres + optimizări

**Ultimii pași cu mine:**
- Finalizam ultimele 2 poziții (vineri)
- Delivery raport complet (luni)
- Training pentru implementarea recomandărilor

A fost o plăcere să lucrez cu TechFlow! Maria din echipa CSSA va prelua de aici.
```

**Interface expectat:** Success metrics dashboard, handoff workflow către CSSA cu istoric complet, satisfaction survey automat

## 4. Screenshots/Wireframes Expected Per Step

### A. Company Signup Interface
```
[WIREFRAME]
═════════════════════════════════════
│ JobGrade - Company Registration    │
═════════════════════════════════════
│ Company Name: [TechFlow Solutions] │
│ Industry: [Software Development ▼] │
│ Size: [51-100 employees ▼]         │
│ Country: [Romania ▼]               │
│                                    │
│ HR Contact:                        │
│ Name: [Ioana Marinescu]            │
│ Email: [ioana@techflow.ro]         │
│ Phone: [+40 xxx xxx xxx]           │
│                                    │
│ [Setup Demo Account] [Contact Sales]│
════════════════════════════════════
```

### B. Demo Environment - Job Evaluation
```
[WIREFRAME]
═════════════════════════════════════
│ JobGrade Demo - Software Dev Senior │
═════════════════════════════════════
│ Job Title: Software Developer Senior│
│ Department: Technology              │
│                                     │
│ CRITERIA EVALUATION:                │
│ ┌─ Natura Muncii ──── [●●●○○] 3pts─┐│
│ ├─ Formarea Necesară ─ [●●●●○] 4pts─┤│
│ ├─ Condiții Lucru ─── [●●○○○] 2pts─┤│
│ ├─ Responsabilitate ─ [●●●○○] 3pts─┤│
│ ├─ Experiența ─────── [●●●●●] 5pts─┤│
│ └─ Abilități Interp ─ [●●●○○] 3pts─┘│
│                                     │
│ TOTAL SCORE: 356 points = GRAD 8    │
│ [Save & Continue] [Generate Report] │
═════════════════════════════════════
```

### C. Committee Review Interface  
```
[WIREFRAME]
═════════════════════════════════════
│ Review: Software Developer Senior   │
═════════════════════════════════════
│ Evaluated by: Ioana M. (Feb 15)     │
│ Status: ⚠️  PENDING COMMITTEE       │
│                                     │
│ REVIEWERS:                          │
│ ✅ Dan P. (CEO) - Approved w/ notes │
│ 🕒 Andrei T. (CTO) - In review      │
│                                     │
│ RECENT CHANGES:                     │
│ • Abilități Interpersonale: 2→3    │
│ • Experiența Necesară: 4→5 ani     │
│                                     │
│ DISCUSSION:                         │
│ [Chat thread with 4 messages]       │
│                                     │
│ [Approve Changes] [Request Changes]  │
═════════════════════════════════════
```

### D. Report Generation Interface
```
[WIREFRAME]
═════════════════════════════════════
│ JobGrade Report - TechFlow          │
═════════════════════════════════════
│ 📊 EVALUATION SUMMARY               │
│ Position: Software Developer Senior │
│ Final Score: 356 points (Grade 8)   │
│                                     │
│ 💰 SALARY RECOMMENDATION            │
│ Market Range: 13,500 - 15,800 RON  │
│ Your Current: 14,200 RON ✅         │
│                                     │
│ 📋 METHODOLOGY                      │
│ EU Directive 2023/970 Compliant    │
│ Standard: EN 15838 Applied          │
│                                     │
│ [Download PDF] [Share Report]       │
│ [Compare Positions] [Export Data]   │
═════════════════════════════════════
```

### E. Progress Dashboard 
```
[WIREFRAME]
═════════════════════════════════════
│ TechFlow Solutions - Progress       │
═════════════════════════════════════
│ PROJECT STATUS: 92% Complete ▓▓▓▓░ │
│                                     │
│ POSITIONS EVALUATED:                │
│ ✅ Development (8/8) - Complete     │
│ ✅ QA Team (3/3) - Complete        │
│ ✅ Sales (5/5) - Complete          │
│ 🕒 Support (7/9) - In Progress     │
│                                     │
│ TIMELINE:                           │
│ Started: Feb 12 | Target: May 15    │
│ Days Remaining: 18 days             │
│                                     │
│ [View All Positions] [Generate Reports] │
═════════════════════════════════════
```

## 5. Success Criteria Per Etapă

### Etapa 1: Lead Qualification (Turns 1-2)
**Criterii Success:**
- ✅ BANT Score > 75/100 (Budget: confirmed, Authority: HR Director + CEO buy-in, Need: urgent compliance, Timeline: 3 months)
- ✅ Pain points identificate și documentate (salarial differences, audit risk, CEO pressure)
- ✅ Demo schedulat în max 48h de la first contact
- ✅ Prospect expectations set (demo pe datele lor, nu slideuri)

**Failure Signs:** 
- Bant score < 50, "just curious", no budget/authority, no timeline pressure

### Etapa 2: Demo & Value Proposition (Turns 3-4)  
**Criterii Success:**
- ✅ Demo completion rate 100% (nu pleacă din call)
- ✅ CEO engagement primele 10 minute + final buy-in  
- ✅ Live scoring pe pozițiile clientului cu rezultate concrete
- ✅ Objection handling eficient (buget, complexitate, comparație Hay)
- ✅ Next step clar agreat (propunere comercială)

**Failure Signs:**
- Demo generic, prospect disengaged, multiple objections unhandled, no clear next step

### Etapa 3: Commercial Proposal & Negotiation (Turns 5-6)
**Criterii Success:**  
- ✅ Propunere comercială customizată în 24h post-demo
- ✅ Pricing accepted cu modificări minore (<20% discount)
- ✅ Timeline agreat (3 săptămâni delivery)
- ✅ Contract terms negotiated în max 2 rounds
- ✅ Referințe verificate de client

**Failure Signs:**
- Pricing rejection >25%, timeline concerns, multiple contract revisions, reference check failures

### Etapa 4: Trial & Contract Signature (Turns 6-11)
**Criterii Success:**
- ✅ Trial account setup în aceeași zi
- ✅ All stakeholders onboarded (3 users active) 
- ✅ Minimum 3 poziții evaluate în trial perioada
- ✅ Contract signed fără modificări majore
- ✅ Payment terms confirmed și procesate

**Failure Signs:**
- Trial abandoned, low engagement (<2 users), contract signature delayed >1 week

### Etapa 5: Full Onboarding & First Value (Turn 12)
**Criterii Success:**
- ✅ 90%+ poziții evaluate în timeline-ul promis  
- ✅ Committee workflow adoptată (3 stakeholders active)
- ✅ Time per evaluation < 30 min (efficiency target)
- ✅ Minimum 1 salary discrepancy identificată cu action plan
- ✅ Client satisfaction score >8/10
- ✅ Handoff către CSSA completat cu documentation

**Failure Signs:**
- <70% completion rate, single-user usage, >60 min per evaluation, no actionable insights, satisfaction <6/10

### Success Metrics Summary
- **Conversion Rate Target:** 80% demo → trial → contract  
- **Time to Value:** Prima poziție evaluată în ziua 3
- **Onboarding Completion:** 100% în 14 zile
- **Customer Effort Score:** <3 (pe scala 1-7, unde 1=foarte ușor)
- **Referral Probability:** 9-10/10 (Net Promoter Score)

### Risk Mitigation Points
- **Technical Risk:** Mock environment backup dacă platformă e down
- **Stakeholder Risk:** CEO buy-in early pentru continuitate 
- **Capability Risk:** SOA shadowing pe primele evaluări complexe
- **Timeline Risk:** Buffer de 1 săptămână în commitment către client
- **Quality Risk:** Peer review obligation pentru toate rapoartele finale