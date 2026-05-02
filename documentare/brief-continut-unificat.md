# Brief Unificat Conținut — JobGrade

**Data:** 02.05.2026
**De la:** Owner + Claude (arhitectură)
**Către:** CMA, CWA, PSYCHOLINGUIST, HR_COUNSELOR, DOA, DMA, DVB2B, SOA

---

## 1. IDENTITATE — Cine suntem acum

### Persoane vizibile

| Nume | Rol | Apare în |
|---|---|---|
| **Liviu** | Senior Consultant, Echipa de proiect JobGrade | Video prezentare, interviu, materiale Owner |
| **Rareș (AI)** | Ghidul JobGrade | Chat, prezentări, video, avatar pe platformă |

- Liviu = om real. Rareș = ghid digital. AMBII sunt "echipa".
- În video-ul de prezentare: "Liviu Stroie, Senior Consultant" (o singură dată, cu nume complet)
- Peste tot altundeva: doar "Liviu"
- Rareș apare mereu cu "(AI)" după nume

### Chipul lui Rareș

- **Fișier aprobat:** `public/guide-avatar.jpg` — NU SE SCHIMBĂ
- Bărbat ~38-42 ani, cămașă albastru deschis, sacou bleumarin, batistă indigo
- **10 variante vestimentare** (în lucru) — același chip, haine diferite per card
- Folosiți DOAR avatarul aprobat — nu generați altul

### Vocea lui Rareș

- Definită complet în `src/lib/voice/voice-persona.ts`
- Consultant experimentat, competent fără aroganță, cald fără familiaritate
- Română standard perfectă — diacritice, pauze naturale, intonație vie
- **5 scripturi de audiție** disponibile pentru calibrare ton

---

## 2. REGULI ABSOLUTE — valabile pe TOT conținutul

### R1. Zero autori, scale, metodologii, citate
- NU: Hofstede, McKinsey, Maslow, Pitariu, David, Hawkins, GLOBE, Big Five
- DA: "metodologie validată", "criterii conform legislației", "experiență de consultanță"
- Excepție: instrumente licențiate (CPI260, ESQ-2, AMI) — doar în context B2B evaluare personal

### R2. 4 criterii evaluare în extern, nu 6
- Extern (client-facing): "cunoștințe și competențe, responsabilitate, efort, condiții de muncă"
- Intern (doar în Card 1, în procesul de evaluare): cele 6 criterii detaliate
- Diferența: 6 criterii e secretul nostru operațional, 4 criterii e ce vede clientul

### R3. Ton profesional RO — zero anglo-saxonisme
- NU: "Perfect!", "Fantastic!", "Amazing!", "Game changer"
- NU: "Lăsați-mă să...", "Bună întrebare!", "Interesant!"
- DA: direct, substanțial, fără preambul, fără superlative
- Virgulă: NU se pune înainte de "și" în limba română

### R4. Personal specializat, nu "2 psihologi"
- NU: "doi psihologi", "echipa de psihologi", "fondatorul"
- DA: "personal acreditat de CPR cu specializări în psihologia muncii, transporturilor și serviciilor, cu formare psihanalitică"
- Scurt: "personal specializat" sau "echipa de proiect"

### R5. Psihobusiness = feminin
- "Compania oferă..." nu "Operatorul oferă..."
- Sau persoana 1 plural: "oferim", "asigurăm"

### R6. Nu dezvăluim detalii interne
- NU: nume furnizori tech (Neon, Vercel, Anthropic) — doar în /privacy și /transparenta-ai
- NU: locație server exactă — doar "Uniunea Europeană"
- NU: număr exact de agenți/structură internă
- NU: formule de preț (de ce costă cât costă)

---

## 3. MATERIALE ÎN PRODUCȚIE — alinierea

### Media Books (7 × 6 = 42 tasks)

Fiecare Media Book trebuie actualizat cu:
- **Secțiunea "Cine suntem"** → Rareș ca ghid, echipă mixtă, personal specializat
- **Ton** → consistent cu voice-persona.ts (Rareș vorbește, nu "sistemul")
- **Design** → avatar Rareș pe copertă/footer, paleta indigo + coral
- **Zero autori** → verificare R1 pe fiecare secțiune

| MB | Responsabil coordonare | Prioritate |
|---|---|---|
| MB-R1 Job Grading | CMA | P1 — primul material |
| MB-R2 Pay Gap | CMA | P1 |
| MB-R3 Joint Assessment | CMA | P2 |
| MB-S1 Evaluare Personal | CMA | P2 |
| MB-S2 Multigenerațional | CMA | P3 |
| MB-S3 Procese Calitate | CMA | P3 |
| MB-S4 Cultură Performanță | CMA | P3 |

### Video-uri (2 scripturi gata)

| Video | Ce conține | Unde se publică |
|---|---|---|
| 01 Prezentare Owner | Liviu povestește: cine sunt, ce e JobGrade, de ce | Landing page hero, YT, LinkedIn |
| 02 Interviu Rareș × Liviu | Conversație despre misiune, viziune, valori | YT (full), LinkedIn/FB/Reels (clipuri) |

Scripturile sunt în `documentare/video-scripts/`. CWA verifică tonul. PSYCHOLINGUIST validează.

### Prezentări SOA descărcabile (4 gata)

| Temă | Endpoint | Status |
|---|---|---|
| Evaluare posturi | /api/v1/presentations?topic=job-evaluation | LIVE |
| Pay gap | /api/v1/presentations?topic=pay-gap | LIVE |
| Prețuri | /api/v1/presentations?topic=pricing | LIVE |
| Dezvoltare org. | /api/v1/presentations?topic=organizational | LIVE |

CWA verifică conținut. PSYCHOLINGUIST calibrează ton RO.

### Landing pages B2B (verificate 02.05)

| Pagină | Status | Observații |
|---|---|---|
| /b2b/je | CURAT | Zero autori, ton profesional |
| /b2b/pay-gap | CURAT | Zero autori, ton profesional |
| /b2b/evaluare-comuna | CURAT | Zero autori, ton profesional |
| /b2b/abonamente | CURAT | Calculator interactiv, prețuri reale |
| /b2b/sandbox | FUNCȚIONAL | Dashboard live + chat |

### Social Media (DMA coordonează)

Materiale disponibile pentru campanii:
- Clipuri video (tăiate din 01 + 02) — per platformă
- Prezentări descărcabile — link în postări
- Avatar Rareș — thumbnail pentru postări
- Sandbox link — CTA în orice postare

---

## 4. WORKFLOW PRODUCȚIE

### Pentru fiecare material nou:

```
1. CMA coordonează structura (secțiuni, lungime, scop)
2. CWA scrie conținutul (în vocea lui Rareș)
3. HR_COUNSELOR validează substanța tehnică
4. CJA verifică referințele legale
5. PSYCHOLINGUIST calibrează:
   - Zero anglo-saxonisme
   - Ton per audiență (CEO/HR/Consultant/B2C)
   - Diacritice, frazare, semantică
6. DOA creează designul (avatar Rareș, paleta brand)
7. Owner aprobă final
```

### Checklist pre-publicare:

- [ ] Zero nume autori/scale/metodologii
- [ ] 4 criterii extern (nu 6)
- [ ] "Personal specializat" (nu "2 psihologi")
- [ ] Ton consistent cu voice-persona.ts
- [ ] Avatar Rareș corect (chipul aprobat)
- [ ] Paleta brand: indigo (#4F46E5) + coral (#E85D43)
- [ ] NU virgulă înainte de "și"
- [ ] NU superlative americane
- [ ] Link sandbox în CTA
- [ ] Validare PSYCHOLINGUIST

---

## 5. PRIORITĂȚI IMEDIATE

1. **MB-R1 (Job Grading)** — primul Media Book complet, template pentru restul
2. **Video 01 (Prezentare Owner)** — filmarea necesită Owner, pregătire ASAP
3. **Variantele avatar** — Owner generează 10 variante Firefly
4. **Voce ElevenLabs** — selecție voce RO cu scripturile de audiție
5. **Campanie LinkedIn** — DMA pregătește cu clipuri + sandbox link

---

*Brief aprobat de Owner. Orice material care nu respectă regulile de mai sus se returnează la autor.*
