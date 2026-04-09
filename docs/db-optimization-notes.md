# Database Optimization Notes

Documentatie generata: 2026-04-08
Stack: PostgreSQL (Neon serverless) + Prisma 7.5 + @prisma/adapter-pg

---

## 1. Index Verification per Table

### 1.1 ConversationMessage
**Filtered columns:** threadId, createdAt
**Existing indexes:**
- `@@index([threadId, createdAt])` — EXISTA

**Status:** COMPLET. Indexul compus acopera query-urile de incarcare mesaje per thread ordonate cronologic.

---

### 1.2 KBEntry
**Filtered columns:** agentRole, status, kbType
**Existing indexes:**
- `@@index([agentRole, status])` — EXISTA
- `@@index([agentRole, kbType])` — EXISTA

**Status:** COMPLET. Ambele pattern-uri principale de filtrare sunt acoperite.

---

### 1.3 InteractionLog
**Filtered columns:** tenantId, userId, createdAt, eventType, entityType, entityId
**Existing indexes:**
- `@@index([tenantId, userId, createdAt])` — EXISTA
- `@@index([userId, eventType])` — EXISTA
- `@@index([tenantId, entityType, entityId])` — EXISTA

**Status:** COMPLET. Tabel bine indexat pentru toate pattern-urile de query.

---

### 1.4 DisfunctionEvent
**Filtered columns:** status, class, detectedAt, targetType, targetId
**Existing indexes:**
- `@@index([class, status])` — EXISTA
- `@@index([targetType, targetId])` — EXISTA
- `@@index([detectedAt])` — EXISTA

**Status:** COMPLET.

---

### 1.5 AgentTask
**Filtered columns:** assignedTo, assignedBy, status, priority, deadlineAt, blockerType
**Existing indexes:**
- `@@index([businessId, assignedTo, status])` — EXISTA
- `@@index([businessId, assignedBy, status])` — EXISTA
- `@@index([assignedTo, status])` — EXISTA
- `@@index([status, priority])` — EXISTA
- `@@index([status, blockerType])` — EXISTA
- `@@index([deadlineAt])` — EXISTA

**Status:** COMPLET. Foarte bine indexat.

---

### 1.6 B2CUser
**Filtered columns:** deletedAt, deleteScheduledFor, status, alias, email
**Existing indexes:**
- `alias` — UNIQUE (index implicit)
- `email` — UNIQUE (index implicit)

**Recomandari:**
- **LIPSA:** `@@index([deletedAt])` — necesar pentru cron GDPR hard-delete care filtreaza `WHERE deleteScheduledFor <= NOW()`
- **LIPSA:** `@@index([deleteScheduledFor])` — varianta mai precisa pentru cron-ul de purge
- **LIPSA:** `@@index([status])` — util pentru filtrare useri activi vs onboarding vs suspendati

**Prioritate:** MEDIE. Tabelul B2CUser va creste cu volumul B2C.

---

### 1.7 Lead
**Filtered columns:** stage, assignedAgent, contactEmail, nextFollowUpAt
**Existing indexes:**
- `@@index([stage])` — EXISTA
- `@@index([contactEmail])` — EXISTA
- `@@index([nextFollowUpAt])` — EXISTA
- `@@index([assignedAgent])` — EXISTA

**Status:** COMPLET.

---

## 2. Alte tabele verificate — toate au indexuri adecvate

| Model | Indexuri existente | Status |
|-------|-------------------|--------|
| KBBuffer | `[agentRole, status]` | OK |
| CycleLog | `[managerRole, resolved]`, `[targetRole, actionType]` | OK |
| Escalation | `[targetRole, status]`, `[sourceRole, status]`, `[status]` | OK |
| AgentDefinition | `[level, isActive]` | OK |
| AgentRelationship | `[parentRole, isActive]` | OK |
| AgentMetric | `[agentRole, periodStart]` | OK |
| BrainstormSession | `[initiatedBy, status]`, `[level, status]` | OK |
| BrainstormIdea | `[sessionId, compositeScore]`, `[generatedBy]` | OK |
| ClientMemory | `[tenantId, category]`, `[tenantId, importance]` | OK |
| ExternalResource | `[status]`, `[nextPaymentDate]` | OK |
| PayrollEntry | `[tenantId, importBatchId]`, `[tenantId, jobFamily]`, `[tenantId, gender]`, `[tenantId, hierarchyLevel]` | OK |
| SalaryBenchmark | `[jobFamily, seniorityLevel, year]`, `[country, year, quarter]`, `[gradeMin, gradeMax]`, `[corCode]` | OK |
| ConversationThread | `[tenantId, userId, isActive]`, `[userId, agentRole]` | OK |
| FluxStepRole | `[fluxId]`, `[roleCode]` | OK |
| ReorganizationEvent | `[triggeredByRole, status]`, `[status, autoRevertAt]`, `[patternSignature]` | OK |
| OrgProposal | `[status]`, `[proposedBy]` | OK |
| Business | `[status]` | OK |
| OrganizationalObjective | `[businessId, status]`, `[businessId, priority]`, `[deadlineAt]`, `[parentObjectiveId]` | OK |
| ExternalSignal | `[category, capturedAt]`, `[processedAt]`, `[source, capturedAt]` | OK |
| AgentBehaviorPatch | `[businessId, status]`, `[targetRole, status]`, `[expiresAt]` | OK |

---

## 3. Indexuri recomandate de adaugat

### 3.1 B2CUser — GDPR soft-delete support
```prisma
@@index([deleteScheduledFor])  // cron GDPR hard-delete
@@index([status])              // filtrare per status
```

### 3.2 Notification — citire rapida per user
Modelul `Notification` nu are niciun index custom:
```prisma
@@index([userId, read, createdAt])  // notificari necitite per user, ordonate
```

### 3.3 AiGeneration — audit si cost tracking
Modelul `AiGeneration` nu are indexuri:
```prisma
@@index([tenantId, createdAt])  // istoric per tenant
@@index([type])                 // filtrare per tip generare
```

### 3.4 CreditTransaction — billing queries
Modelul `CreditTransaction` nu are indexuri:
```prisma
@@index([tenantId, createdAt])  // istoric tranzactii per tenant
```

### 3.5 Report — cautare rapoarte
Modelul `Report` nu are indexuri:
```prisma
@@index([tenantId, type])       // rapoarte per tenant si tip
```

---

## 4. Connection Pooling — Recomandari Neon Serverless

### 4.1 Situatia curenta
- Prisma foloseste `@prisma/adapter-pg` (driver adapter) cu `PrismaPg`
- Neon ofera connection pooling prin PgBouncer pe portul dedicat (`:5432` vs `:5433`)
- Stack serverless (Vercel Functions) = conexiuni de scurta durata, frecvente

### 4.2 Recomandari

1. **Foloseste Neon pooled connection string** pentru `DATABASE_URL` in productie
   - Format: `postgresql://user:pass@ep-xxx.region.neon.tech:5432/db?pgbouncer=true&sslmode=require`
   - NU folosi direct connection string-ul non-pooled decat pentru migrari

2. **Connection string separat pentru migrari**
   - `DIRECT_URL` (non-pooled) pentru `prisma migrate deploy`
   - `DATABASE_URL` (pooled) pentru runtime
   - In `schema.prisma`:
     ```prisma
     datasource db {
       provider  = "postgresql"
       url       = env("DATABASE_URL")
       directUrl = env("DIRECT_URL")
     }
     ```

3. **Pool size pe Neon**
   - Free tier: 100 conexiuni simultane (pooled)
   - Monitorizare: Neon dashboard -> Connections tab
   - Alerta la >80% pool utilization

4. **Timeout settings recomandate**
   - `connect_timeout=10` in connection string
   - `idle_timeout=300` pe Neon (default)
   - `statement_timeout=30000` (30s) pentru queries standard

5. **pgvector (KBEntry.embedding)**
   - Index HNSW pe coloana `embedding` se creeaza manual (Prisma nu suporta Unsupported)
   - Comanda SQL: `CREATE INDEX CONCURRENTLY kb_entries_embedding_idx ON kb_entries USING hnsw (embedding vector_cosine_ops)`
   - Monitorizare: dimensiunea indexului creste cu nr intrari KB

---

## 5. maxDuration pe Chat Routes (AI-calling routes)

### 5.1 Route-uri cu maxDuration SETAT

| Route | maxDuration | Tip |
|-------|------------|-----|
| `api/v1/assistant/route.ts` | 60s | Chat AI |
| `api/v1/b2c/profiler/chat/route.ts` | 60s | Chat AI |
| `api/v1/b2c/calauza/chat/route.ts` | 60s | Chat AI |
| `api/v1/agents/hr-counselor/chat/route.ts` | 60s | Chat AI |
| `api/v1/agents/cssa/chat/route.ts` | 60s | Chat AI |
| `api/v1/agents/csa/chat/route.ts` | 60s | Chat AI |
| `api/v1/agents/soa/chat/route.ts` | 60s | Chat AI |
| `api/v1/voice/completions/route.ts` | 60s | Voice AI |
| `api/v1/evolution/route.ts` | 120s | Evolution engine |
| `api/v1/sessions/[id]/je-process/route.ts` | 60s | Job evaluation AI |
| `api/v1/docs/route.ts` | 60s | Document generation |
| `api/v1/payroll/reports/route.ts` | 60s | Report generation |
| `api/v1/payroll/joint-assessment/route.ts` | 60s | Assessment AI |
| `api/v1/payroll/analysis/route.ts` | 60s | Analysis AI |
| `api/v1/payroll/import/route.ts` | 60s | Import processing |
| `api/v1/admin/backup/route.ts` | 60s | Backup |
| `api/v1/b2c/profile/route.ts` | 15s | Profile |
| `api/v1/b2c/onboarding/route.ts` | 30s | Onboarding |
| `api/v1/b2c/my-data/route.ts` | 30s | B2C data |
| `api/v1/b2c/journal/route.ts` | 30s | Journal AI |
| `api/v1/b2c/cards/route.ts` | 15s | Cards |
| `api/v1/b2c/account/route.ts` | 15s | Account |

### 5.2 Route-uri AI FARA maxDuration (necesita adaugare)

| Route | Import AI | Recomandare |
|-------|-----------|-------------|
| `api/v1/team-chat/route.ts` | `import Anthropic` | **60s** — chat cu agenti, durata similara cu celelalte chat routes |
| `api/v1/agents/proposals/[id]/review/route.ts` | `import Anthropic` | **60s** — review propuneri cu AI |

### 5.3 Pagina cu maxDuration

| Pagina | maxDuration |
|--------|-------------|
| `(portal)/owner/reports/evolution/page.tsx` | 60s |

---

## 6. Rezumat actiuni necesare

1. **Schema changes** (NU modifica inca — doar documentat):
   - Adauga `@@index([deleteScheduledFor])` pe B2CUser
   - Adauga `@@index([status])` pe B2CUser
   - Adauga `@@index([userId, read, createdAt])` pe Notification
   - Adauga `@@index([tenantId, createdAt])` pe AiGeneration
   - Adauga `@@index([tenantId, createdAt])` pe CreditTransaction
   - Adauga `@@index([tenantId, type])` pe Report
   - Adauga `directUrl` in datasource block

2. **Code changes** (NU modifica inca — doar documentat):
   - Adauga `export const maxDuration = 60` in `api/v1/team-chat/route.ts`
   - Adauga `export const maxDuration = 60` in `api/v1/agents/proposals/[id]/review/route.ts`

3. **Infrastructure**:
   - Verifica ca `DATABASE_URL` in productie foloseste pooled connection
   - Creeaza index HNSW pe `kb_entries.embedding` manual in Neon SQL Editor
