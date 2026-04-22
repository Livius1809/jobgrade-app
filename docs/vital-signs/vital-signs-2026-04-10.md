# Vital Signs Report — 2026-04-10

## Verdict: CRITICAL 🔴

**Data:** 2026-04-10T09:56:40.211Z
**Sumar:** PASS=2 WARN=2 FAIL=1 SKIP=5

| # | Test | Status | Notes |
|---|---|---|---|
| 1 | 1. Respirație | ⚠️ WARN | Escalated între 20% și 40% — dependență parțială de Owner. |
| 2 | 2. Puls | ❌ FAIL | 22 ore moarte — organism în stop cardiac intermitent. |
| 3 | 3. Reflex | ⏭️ SKIP | Test destructiv. Rulează cu WITH_REFLEX=1. |
| 4 | 4. Adaptare | ⚠️ WARN | Organism aude semnalul (COSO vede) dar nu acționează automat — gap arhitectural: pipeline auto signal→task lipsește. |
| 5 | 5. Memorie | ⏭️ SKIP | Test destructiv lung (~90 min). Rulează cu WITH_MEMORY=1. |
| 6 | 6. Imunitate | ⏭️ SKIP | Safe reversible. Rulează cu WITH_IMMUNITY=1 sau ALL_SAFE=1. |
| 7 | 7. Creștere | ⏭️ SKIP | Baseline are 0 zile — așteptăm minim 30. |
| 8 | 8. Scop | ✅ PASS |  |
| 9 | 9. Reziliență | ⏭️ SKIP | Oprește stack-ul 2h — niciodată automat. Rulează cu WITH_RESILIENCE=1 pentru verificare light. |
| 10 | 10. Conștiință | ✅ PASS |  |

## Detalii per test

### 1. Respirație — ⚠️ WARN

```json
{
  "total": 4,
  "autoFix": 0,
  "agentFix": 0,
  "escalated": 1,
  "pctEscalated": 25,
  "autoPct": 0,
  "ownerDecisions": 0
}
```

> Escalated între 20% și 40% — dependență parțială de Owner.

### 2. Puls — ❌ FAIL

```json
{
  "deadHours": 22,
  "medianPerHour": 0,
  "totalEvents": 37,
  "breakdown": {
    "cycleLogs": 19,
    "kbEntries": 4,
    "propagationEvents": 0,
    "agentTasks": 14
  }
}
```

> 22 ore moarte — organism în stop cardiac intermitent.

### 3. Reflex — ⏭️ SKIP

```json
{}
```

> Test destructiv. Rulează cu WITH_REFLEX=1.

### 4. Adaptare — ⚠️ WARN

```json
{
  "signalId": "cmnsqegq6001lzkvhdlyymfm7",
  "deduplicated": false,
  "dbVisible": true,
  "seenByObserver": true,
  "themesDetected": 3,
  "objectivesTouched": 0,
  "newLegalTasks": 0
}
```

> Organism aude semnalul (COSO vede) dar nu acționează automat — gap arhitectural: pipeline auto signal→task lipsește.

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
  "ts": "2026-04-10T09:56:40.211Z",
  "kb": 5650,
  "agents": 69,
  "objectives": 16,
  "propagations": 0,
  "immune": 0
}
```

> Baseline are 0 zile — așteptăm minim 30.

### 8. Scop — ✅ PASS

```json
{
  "totalProactiveTasks": 86,
  "linkedToActiveObjective": 86,
  "pctLinked": 100,
  "objectivesActive": 16,
  "objectivesCovered": 13,
  "orphanTagged": 0
}
```

### 9. Reziliență — ⏭️ SKIP

```json
{}
```

> Oprește stack-ul 2h — niciodată automat. Rulează cu WITH_RESILIENCE=1 pentru verificare light.

### 10. Conștiință — ✅ PASS

```json
{
  "compositeScore": 24,
  "gapsFound": 7,
  "gapsRevealed": 4,
  "actionsPlanned": 21,
  "narrativeWords": 78
}
```

## Raw JSON

`C:\Users\Liviu\OneDrive\Desktop\exercitiu instalare_visual\jobgrade-app\docs\vital-signs\vital-signs-2026-04-10.json`
