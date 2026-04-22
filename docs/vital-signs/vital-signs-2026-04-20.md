# Vital Signs Report — 2026-04-20

## Verdict: CRITICAL 🔴

**Data:** 2026-04-20T16:37:54.018Z
**Sumar:** PASS=0 WARN=2 FAIL=3 SKIP=5

| # | Test | Status | Notes |
|---|---|---|---|
| 1 | 1. Respirație | ⚠️ WARN | Escalated între 20% și 40% — dependență parțială de Owner. |
| 2 | 2. Puls | ❌ FAIL | 16 ore moarte — organism în stop cardiac intermitent. |
| 3 | 3. Reflex | ⏭️ SKIP | Test destructiv. Rulează cu WITH_REFLEX=1. |
| 4 | 4. Adaptare | ❌ FAIL | Semnal nu poate fi ingerat (network error) — pipeline ingestie rupt. |
| 5 | 5. Memorie | ⏭️ SKIP | Test destructiv lung (~90 min). Rulează cu WITH_MEMORY=1. |
| 6 | 6. Imunitate | ⏭️ SKIP | Safe reversible. Rulează cu WITH_IMMUNITY=1 sau ALL_SAFE=1. |
| 7 | 7. Creștere | ⏭️ SKIP | Baseline are 10 zile — așteptăm minim 30. |
| 8 | 8. Scop | ⚠️ WARN | Fir narativ slab: 58.4% linked, 33% obiective acoperite. |
| 9 | 9. Reziliență | ⏭️ SKIP | Oprește stack-ul 2h — niciodată automat. Rulează cu WITH_RESILIENCE=1 pentru verificare light. |
| 10 | 10. Conștiință | ❌ FAIL | Ciclul nu a produs narativă și zero gaps — engine tăcut. |

## Detalii per test

### 1. Respirație — ⚠️ WARN

```json
{
  "total": 13,
  "autoFix": 0,
  "agentFix": 0,
  "escalated": 0,
  "pctEscalated": 0,
  "autoPct": 0,
  "ownerDecisions": 0
}
```

> Escalated între 20% și 40% — dependență parțială de Owner.

### 2. Puls — ❌ FAIL

```json
{
  "deadHours": 16,
  "medianPerHour": 0,
  "totalEvents": 113,
  "breakdown": {
    "cycleLogs": 81,
    "kbEntries": 1,
    "propagationEvents": 0,
    "agentTasks": 31
  }
}
```

> 16 ore moarte — organism în stop cardiac intermitent.

### 3. Reflex — ⏭️ SKIP

```json
{}
```

> Test destructiv. Rulează cu WITH_REFLEX=1.

### 4. Adaptare — ❌ FAIL

```json
{
  "ingestion": "failed",
  "detail": "network error"
}
```

> Semnal nu poate fi ingerat (network error) — pipeline ingestie rupt.

### 5. Memorie — ⏭️ SKIP

```json
{}
```

> Test destructiv lung (~90 min). Rulează cu WITH_MEMORY=1.

### 6. Imunitate — ⏭️ SKIP

```json
{}
```

> Safe reversible. Rulează cu WITH_IMMUNITY=1 sau ALL_SAFE=1.

### 7. Creștere — ⏭️ SKIP

```json
{
  "ts": "2026-04-20T16:37:54.018Z",
  "kb": 5694,
  "agents": 73,
  "objectives": 18,
  "propagations": 0,
  "immune": 0
}
```

> Baseline are 10 zile — așteptăm minim 30.

### 8. Scop — ⚠️ WARN

```json
{
  "totalProactiveTasks": 341,
  "linkedToActiveObjective": 199,
  "pctLinked": 58.4,
  "objectivesActive": 18,
  "objectivesCovered": 6,
  "orphanTagged": 12
}
```

> Fir narativ slab: 58.4% linked, 33% obiective acoperite.

### 9. Reziliență — ⏭️ SKIP

```json
{}
```

> Oprește stack-ul 2h — niciodată automat. Rulează cu WITH_RESILIENCE=1 pentru verificare light.

### 10. Conștiință — ❌ FAIL

```json
{
  "resp": "{}"
}
```

> Ciclul nu a produs narativă și zero gaps — engine tăcut.

## Raw JSON

`C:\Users\Liviu\OneDrive\Desktop\exercitiu instalare_visual\jobgrade-app\docs\vital-signs\vital-signs-2026-04-20.json`
