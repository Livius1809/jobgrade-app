# Pipeline automat — Ingestie curs nou în KB organism

## Când se activează
Oricând Owner sau COG adaugă un curs/material de formare nou.

## Pași

### Pas 1: Identificare conținut
- Scanează directorul cursului: .md, .txt, .pdf
- Clasifică fiecare fișier: agent-template / skill / reference / example
- Listează conținutul găsit

### Pas 2: Mapping agent
Per fișier, determină care agenți JobGrade beneficiază:
- Business strategy → COG, DMA, CFO
- Marketing/copywriting → CMA, CWA, MKA
- Legal/compliance → CJA, DPA
- Finance → CFO, COAFin, BCA
- HR → HR Counselor, DOA
- Tech → COA, SVHA
- Research → RDA, CIA, CDIA
- Customer → COCSA, CSM, SOA
- Generic/frameworks → COG + toți

### Pas 3: Distilare
Din fiecare fișier, extrage:
- **rule:** system prompt / procedură completă (max 10K chars)
- **example:** ce tip de cunoaștere oferă
- **antiPattern:** ce NU trebuie făcut cu această cunoaștere

### Pas 4: Infuzare KB
```typescript
await prisma.learningArtifact.create({
  data: {
    studentRole: agentRole,
    teacherRole: `course-${cursNume}`,
    problemClass: "course-skill",
    rule: content,
    example: description,
    antiPattern: "Adapteaza la JobGrade. NU folosi generic.",
    sourceType: "POST_EXECUTION",
    effectivenessScore: 0.95,
  }
})
```

### Pas 5: Verificare
- Numără artifacts create per agent
- Verifică că toți agenții relevanți au primit
- Log: "Curs X: Y artifacts create pentru Z agenți"

### Pas 6: Notificare COG
- Task creat: "Curs nou ingerat: [nume]. Verifică aplicabilitatea în task-urile curente."

## Cum se rulează
```bash
# Din Claude Code sau script:
node scripts/ingest-course.js --dir="calea/catre/curs" --name="nume-curs"
```

## Responsabil
- COG inițiază (primește cursul de la Owner)
- COA/Claude execută pipeline-ul tehnic
- COG verifică distribuția
