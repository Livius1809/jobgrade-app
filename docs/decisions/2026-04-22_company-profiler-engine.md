# Company Profiler Engine — Arhitectură

**Data:** 22.04.2026
**Decizie Owner:** Engine-ul e nucleul inteligenței B2B. Echivalentul Profiler-ului B2C.

## Ce face

Profilul viu al firmei — nu ce declară, ci ce face. Agregă toate datele, urmărește coerența, alimentează agenții, deblochează servicii natural.

## Structura

```
src/lib/company-profiler/
├── index.ts          — Export central
├── types.ts          — Tipuri (CompanyProfile, MaturityState, CoherenceReport, AgentContext, ReportSection)
├── engine.ts         — Nucleu: getCompanyProfile(), getAgentContext(), getReportSections()
├── maturity.ts       — Nivel maturitate + servicii deblocate per nivel
├── coherence.ts      — Verificare coerență MVV ↔ fișe ↔ evaluări ↔ salarii (AI + deterministic)
├── agent-context.ts  — Context filtrat per agent (JE, PayGap, DOA, SOA, Benchmark, Cultură, Raport)
└── report-sections.ts — Secțiuni injectabile în rapoartele serviciilor
```

## Cum funcționează

### Un singur apel
```typescript
import { getCompanyProfile } from "@/lib/company-profiler"
const profile = await getCompanyProfile(tenantId)
```
Returnează: identitate + MVV + maturitate + coerență + servicii deblocate.

### Context pentru agenți
```typescript
import { getAgentContext } from "@/lib/company-profiler"
const ctx = await getAgentContext(tenantId, "JE")
// ctx.companyEssence — narativ pentru system prompt
// ctx.coherenceRelevant — verificări relevante
// ctx.deviationsToFlag — ce trebuie semnalat în raport
```

### Secțiuni raport
```typescript
import { getReportSections } from "@/lib/company-profiler"
const sections = await getReportSections(tenantId, "JOB_EVALUATION", { jobId: "..." })
// sections[0].narrative — text profesional
// sections[0].deviations — deviații concrete
// sections[0].recommendations — recomandări acționabile
```

## Lanțul de coerență

```
MISIUNE ↔ CAEN      — obiectul de activitate reflectat?
MISIUNE ↔ POSTURI   — posturile servesc misiunea?
VIZIUNE ↔ BENCHMARK — poziționarea reflectă aspirația?
VALORI ↔ EVALUĂRI   — criteriile reflectă valorile?
VALORI ↔ FIȘE       — atribuțiile aliniate cu valorile?
KPI ↔ REMUNERARE    — compensarea aliniată cu performanța?
STRUCTURĂ ↔ MISIUNE — structura salarială reflectă misiunea?
```

## Maturitate și servicii

| Nivel | Condiție | Servicii deblocate |
|-------|----------|-------------------|
| IMPLICIT | CAEN doar | – |
| EMERGENT | + fișe post / 3+ posturi | JE, Fișe AI |
| PARTIAL | + evaluări / salarii | Pay Gap N1 |
| SUBSTANTIAL | + benchmark / pay gap | Benchmark N2, Mediere N2 |
| COMPLETE | + MVV validat | Cultură N3, KPI N3, Dezvoltare N3 |

## Engine-ul vorbește prin servicii

Nu produce rapoarte separate. Produce **secțiuni** care se injectează:
- JE: "Postul X are scorare mare pe Impact Afaceri, dar misiunea declară servicii"
- Pay Gap: "Diferența salarială pe dept Y e justificabilă prin valoarea inovație"
- Cultură: "3 din 5 valori nu se reflectă în niciun criteriu de evaluare"

## Relația cu MVV Builder

`src/lib/mvv/builder.ts` rămâne — face rebuild-ul AI al draft-ului MVV.
Engine-ul îl folosește indirect (citește datele salvate de builder).
La acțiuni semnificative: `onSignificantAction(tenantId)` invalidează cache-ul.

## Hook în servicii existente

La fiecare acțiune semnificativă (adăugare post, evaluare, structură salarială):
```typescript
import { onSignificantAction } from "@/lib/company-profiler"
await onSignificantAction(tenantId) // invalidează cache → recalculare la next read
```
