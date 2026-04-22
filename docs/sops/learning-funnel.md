# Pâlnia de învățare — Mecanism interfață agent ↔ mediu

## Principiu
Totul ce trece prin agent produce învățare. Fiecare interacțiune (task, conversație, semnal, feedback, eroare) intră în pâlnie și iese cunoaștere acționabilă, la niveluri din ce în ce mai înalte.

## Arhitectura pâlniei

```
════════════════════════════════════════
  TOATE INTERACȚIUNILE (intrare largă)
════════════════════════════════════════
     Task-uri executate
     Conversații cu clienți
     Semnale externe (CIA)
     Feedback (pozitiv/negativ)
     Decizii Owner
     Cursuri/referințe noi
     Erori și eșecuri
     Observații proprii
            │
            ▼
┌─── NIVEL 1: CAPTURĂ ──────────────┐
│ Ce s-a întâmplat?                  │
│ → log structurat per eveniment     │
│ → clasificare: task/conversație/   │
│   semnal/feedback/eroare/curs      │
└────────────────────────────────────┘
            │
            ▼
┌─── NIVEL 2: DISTILARE ────────────┐
│ Ce am învățat?                     │
│ → extrage DECLARATIV (ce e nou)    │
│ → extrage PROCEDURAL (cum fac)     │
│ → extrage ANTI-PATTERN (ce NU fac)│
│ → evaluează: confirmare/infirmare  │
│   cunoștințe existente             │
└────────────────────────────────────┘
            │
            ▼
┌─── NIVEL 3: AGENT (individual) ───┐
│ KB agent actualizat                │
│ → cunoștință nouă? → CREATE       │
│ → cunoștință confirmată? → ↑score │
│ → cunoștință infirmată? → ↓score  │
│ → procedură rafinată? → UPDATE    │
│ → anti-pattern descoperit? → ADD  │
└────────────────────────────────────┘
            │
            ▼
┌─── NIVEL 4: DEPARTAMENT ──────────┐
│ Propagare la frați (agenți cu     │
│ rol similar sau complementar)      │
│ → dacă score > 0.8 și applied > 3 │
│ → propagă la agenții din același   │
│   departament                      │
│ → PATTERN departamental emerge     │
└────────────────────────────────────┘
            │
            ▼
┌─── NIVEL 5: ORGANIZAȚIE ──────────┐
│ Consolidare cross-departament      │
│ → pattern-uri care apar în 3+     │
│   departamente = cunoștință org    │
│ → COG primește insight strategic   │
│ → Owner primește doar ce necesită  │
│   decizie strategică               │
└────────────────────────────────────┘
            │
            ▼
┌─── NIVEL 6: SPIRALA EVOLUTIVĂ ────┐
│ Feedback loop descendent:          │
│ → insight org → rafinează dept     │
│ → dept pattern → rafinează agent   │
│ → agent rafinat → interacțiuni     │
│   mai bune → captură mai bogată    │
│                                    │
│ Maturitate crește la fiecare ciclu │
│ SEED → SPROUT → GROWTH → BLOOM    │
└────────────────────────────────────┘
            │
            ▼
════════════════════════════════════════
  CUNOAȘTERE ACȚIONABILĂ (ieșire)
  La nivel din ce în ce mai profund
════════════════════════════════════════
```

## Implementare tehnică

### Hook post-execuție (NIVEL 1-3)
Există deja parțial în `learning-pipeline.ts`. Trebuie extins:

```typescript
// După ORICE interacțiune agent:
async function learningFunnel(event: AgentEvent) {
  // NIVEL 1: Captură
  const capture = {
    agentRole: event.agentRole,
    eventType: event.type, // TASK | CONVERSATION | SIGNAL | FEEDBACK | ERROR | COURSE
    input: event.input,
    output: event.output,
    success: event.success,
    timestamp: new Date(),
  }

  // NIVEL 2: Distilare (AI extrage cunoștințe)
  const distilled = await distillLearning(capture)
  // → { declarative: string[], procedural: string[], antiPatterns: string[] }

  // NIVEL 3: Integrare agent
  for (const knowledge of distilled.declarative) {
    await upsertAgentKnowledge(event.agentRole, 'declarative', knowledge)
  }
  for (const procedure of distilled.procedural) {
    await upsertAgentKnowledge(event.agentRole, 'procedural', procedure)
  }
  for (const antiPattern of distilled.antiPatterns) {
    await upsertAgentKnowledge(event.agentRole, 'anti-pattern', antiPattern)
  }
}
```

### Propagare departamentală (NIVEL 4)
Cron periodic (zilnic):

```typescript
async function propagateDepartmentLearning() {
  // Găsește cunoștințe cu score > 0.8 și applied > 3
  const valuable = await findHighValueKnowledge()
  
  for (const knowledge of valuable) {
    const siblings = await getSiblingAgents(knowledge.agentRole)
    for (const sibling of siblings) {
      await propagateIfRelevant(knowledge, sibling)
    }
  }
}
```

### Consolidare organizațională (NIVEL 5)
Cron săptămânal:

```typescript
async function consolidateOrgLearning() {
  // Pattern-uri care apar în 3+ departamente
  const crossPatterns = await findCrossDepartmentPatterns()
  
  for (const pattern of crossPatterns) {
    // Salvează ca cunoștință organizațională
    await createOrgKnowledge(pattern)
    // Notifică COG
    await notifyCOG(pattern)
  }
}
```

### Spirala evolutivă (NIVEL 6)
Cron lunar:

```typescript
async function evolveSpiral() {
  // Insight org → rafinează proceduri dept
  const orgInsights = await getRecentOrgKnowledge()
  for (const insight of orgInsights) {
    await refineDepartmentProcedures(insight)
  }
  
  // Evaluează maturitate per agent
  await updateMaturityScores()
  // SEED → SPROUT → GROWTH → BLOOM
}
```

## Surse de intrare în pâlnie

| Sursă | Eveniment | Frecvență | Exemplu |
|---|---|---|---|
| Task executat | TASK_COMPLETED / TASK_FAILED | La fiecare execuție | "Am descoperit că..." |
| Conversație client | CONVERSATION_END | La fiecare sesiune | "Clientul a întrebat X, am răspuns Y" |
| Semnal extern | SIGNAL_PROCESSED | Continuu (CIA) | "Legislație nouă: Art. X modificat" |
| Feedback client | FEEDBACK_RECEIVED | La fiecare rating | "Rating 2/5 pe raport pay gap" |
| Decizie Owner | DECISION_DOCUMENTED | La fiecare docs/decisions/ | "Owner a decis: storno prorata" |
| Curs/referință | COURSE_INGESTED | La fiecare upload | "Curs customer relations → 118 artifacts" |
| Eroare | ERROR_OCCURRED | La fiecare eroare | "API X a eșuat — cauza: Y" |
| Observație proprie | SELF_OBSERVATION | La reflecție periodică | "Am observat pattern Z în ultimele 10 task-uri" |

## Metrici pâlnie

- **Volum intrare**: câte interacțiuni/zi intră în pâlnie
- **Rata distilare**: câte produc cunoștințe noi vs confirmă existente
- **Propagare**: câte cunoștințe ajung la nivel departament
- **Consolidare**: câte ajung la nivel organizație
- **Utilizare**: câte cunoștințe din pâlnie sunt efectiv folosite în task-uri
- **Maturitate**: scor per agent/dept/org — crește cu fiecare ciclu spirală
