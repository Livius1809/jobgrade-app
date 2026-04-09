# Seed Data Inventory

Documentatie generata: 2026-04-08

---

## 1. Ce exista ca seed data

### 1.1 prisma/seed.ts (principal — rulat de `npm run db:seed`)

**Comanda:** `ts-node --project tsconfig.seed.json prisma/seed.ts`
**Configurat in:** `package.json` -> `prisma.seed`

**Ce populeaza:**
- **Criterion** — 6 criterii de evaluare (upsert pe `name`):
  1. Educatie / Experienta (7 subfactori, max 112 pct)
  2. Comunicare (5 subfactori, max 85 pct)
  3. Rezolvarea problemelor (7 subfactori, max 112 pct)
  4. Luarea deciziilor (7 subfactori, max 112 pct)
  5. Impact asupra afacerii (4 subfactori, max 112 pct)
  6. Conditii de lucru (3 subfactori, max 27 pct)
- **Subfactor** — total 33 subfactori (upsert pe `criterionId_code`)

**Idempotent:** Da (foloseste upsert)

---

### 1.2 src/lib/agents/seed-agent-registry.ts

**Comanda:** `npx tsx src/lib/agents/seed-agent-registry.ts`
**NU este integrat in `npm run db:seed`** — se ruleaza separat.

**Ce populeaza:**
- **AgentDefinition** — toate rolurile detectate din:
  - `ESCALATION_CHAIN` (relatii parinte-copil)
  - `MANAGER_CONFIGS` (7 manageri cu cicluri proactive)
  - `SELF_INTERVIEW_PROMPTS` (34+ roluri cu prompturi cold-start)
  - `PROPAGATION_RULES` (reguli propagare KB)
- **AgentRelationship** — relatii REPORTS_TO din escalation chain

**Idempotent:** Da (upsert pe `agentRole` unic)

---

### 1.3 prisma/seed-final-agents.ts

**Ce populeaza:**
- **KBEntry** — intrari KB pre-populate pentru agentii L2 suport:
  - PPMO (Psihologia muncii + organizationala) — ~14 intrari
  - HR_COUNSELOR (Legislatia muncii + Fiscalitate) — ~14 intrari
  - PCM (Psiholog Mecanisme Cognitive) — ~10 intrari
  - NSA (Specialist Neurostiinte) — intrari neurostiinta

**Confidence:** 0.85-0.95 (surse academice validate)
**Source:** EXPERT_HUMAN

---

### 1.4 Alte fisiere seed KB (prisma/seed-*.ts)

| Fisier | Agent/Domeniu | Continut |
|--------|---------------|----------|
| `seed-apa-rudica-l2.ts` | L2 suport | Intrari KB APA/Rudica |
| `seed-armstrong-taylor-l2.ts` | L2 suport | Armstrong & Taylor HRM |
| `seed-daniel-david-l2.ts` | L2 suport | Daniel David psihologie |
| `seed-eleganta-lingvistica-l2.ts` | Psiholingvistica | Eleganta lingvistica |
| `seed-linguistic-quality-l2.ts` | Psiholingvistica | Calitate lingvistica |
| `seed-slama-cazacu-pitariu-l2.ts` | L2 suport | Slama-Cazacu & Pitariu |
| `seed-mediator-kb.ts` | MEDIATOR | KB mediator |
| `seed-law-analysis-distribution.ts` | CJA | Analiza legislativa |
| `seed-pse.ts` | PSE | Psiholog evaluare |
| `seed-pta.ts` | PTA | Psiholingvistica |
| `seed-ppa.ts` | PPA | Psiholog practician |
| `seed-soc.ts` | SOC | Sociolog |
| `seed-kb.ts` | Multiple | KB general |
| `seed-demo.ts` | Demo data | Date demonstrative |
| `seed-new-orgchart.ts` | Organigrama | Organigrama noua |
| `seed-skills-transfer.ts` | Skill-uri | Transfer competente |

---

### 1.5 src/lib/kb/cold-start.ts

**NU este seed direct** — este un mecanism de generare KB entries prin Claude self-interview.

**Ce contine:**
- `SELF_INTERVIEW_PROMPTS` — prompturi pentru 34+ agenti organizati pe 3 niveluri:
  - STRATEGIC: COG, COA, COCSA
  - OPERATIONAL: CIA, CJA, CCIA, PMA, EMA, DPA, QLA, SA, CAA, COAFin, ISA, MOA, IRA, MDA
  - CLIENT-FACING: SOA, CSSA, HR_COUNSELOR, BCA
  - Plus alte roluri (MKA, CMA, CWA, PSE, PPMO, etc.)
- Genereaza 50 intrari KB per agent (5 batch-uri x 10 intrari)
- Confidence initial: 0.5
- **Necesita apel API Anthropic** — nu e date statice

**Endpoint:** `POST /api/v1/kb/cold-start`

---

### 1.6 src/lib/benchmark/seed-ro-2025.ts

**Ce contine:**
- `SEED_DATA_RO_2025` — date publice piata salariala Romania 2025
- Surse: INS TEMPO, Hays, BestJobs, Glassdoor
- Organizate pe jobFamily + seniorityLevel (ENTRY/MID/SENIOR/LEAD/EXECUTIVE)
- Valori: salaryP10, P25, Median, P75, P90 (RON brut/luna)

**Folosit de:** endpoint `/api/v1/benchmark`

---

## 2. Ce lipseste pentru productie

### 2.1 CriteriaMapping (Legea transparentei salariale)
- Modelul `CriteriaMapping` exista in schema (mapare 6 criterii JobGrade -> 4 criterii legale)
- **NU exista seed data** pentru populare
- Necesar: 6-8 intrari (fiecare `jobgradeFactor` mapat la un `LegalCriterion`)
- Criterii legale: CUNOSTINTE_DEPRINDERI, EFORT_INTELECTUAL_FIZIC, RESPONSABILITATI, CONDITII_MUNCA

### 2.2 Business (organism viu)
- Modelul `Business` exista dar **nu are seed** pentru business-ul principal "jobgrade"
- Necesar: cel putin 1 intrare Business cu `code: "jobgrade"`
- Dependent: OrganizationalObjective, AgentTask, AgentBehaviorPatch, etc.

### 2.3 SalaryBenchmark (date piata in DB)
- Modelul exista dar seed-ul (`seed-ro-2025.ts`) e un export TypeScript, nu un script de populare DB
- Necesar: script care sa faca upsert din `SEED_DATA_RO_2025` in tabelul `salary_benchmarks`

### 2.4 ExternalResource (dependente Owner)
- Modelul exista dar **nu are seed** pentru resursele existente (Anthropic API, Neon, Vercel, etc.)

### 2.5 FluxStepRole (mapare flux -> roluri)
- Modelul exista, endpoint de administrare exista (`/api/v1/admin/flux-step-role`)
- **Nu exista seed** cu maparea initiala a celor ~40 fluxuri

### 2.6 HomeostaticTarget, BoundaryRule, Ritual (organism viu)
- Modele existente in schema dar fara seed data initial

### 2.7 B2C Communities
- Modelul `B2CCommunity` exista dar nu are seed pentru cele 5 comunitati per card

---

## 3. Ordinea de seeding (dependente)

```
1. prisma/seed.ts                    # Criterion + Subfactor (zero dependente)
2. seed-agent-registry.ts            # AgentDefinition + AgentRelationship
3. CriteriaMapping seed (LIPSA)      # depinde de Criterion
4. Business seed (LIPSA)             # depinde de nimic
5. seed-final-agents.ts              # KBEntry (depinde de agentRole existenta)
6. seed-kb.ts + toate seed-*-l2.ts   # KBEntry aditionale
7. seed-mediator-kb.ts               # KBEntry mediator
8. seed-new-orgchart.ts              # Organigrama noua
9. SalaryBenchmark seed (LIPSA)      # depinde de nimic
10. ExternalResource seed (LIPSA)    # depinde de nimic
11. FluxStepRole seed (LIPSA)        # depinde de AgentDefinition
12. Cold-start KB generation         # depinde de AgentDefinition + API key
```

---

## 4. Comenzi de rulare

```bash
# 1. Seed principal (criterii + subfactori)
npm run db:seed
# sau: ts-node --project tsconfig.seed.json prisma/seed.ts

# 2. Agent registry (organigrama agenti)
npx tsx src/lib/agents/seed-agent-registry.ts

# 3. KB entries pre-populate (fiecare separat)
npx tsx prisma/seed-final-agents.ts
npx tsx prisma/seed-kb.ts
npx tsx prisma/seed-mediator-kb.ts
npx tsx prisma/seed-pse.ts
npx tsx prisma/seed-pta.ts
npx tsx prisma/seed-ppa.ts
npx tsx prisma/seed-soc.ts
npx tsx prisma/seed-apa-rudica-l2.ts
npx tsx prisma/seed-armstrong-taylor-l2.ts
npx tsx prisma/seed-daniel-david-l2.ts
npx tsx prisma/seed-eleganta-lingvistica-l2.ts
npx tsx prisma/seed-linguistic-quality-l2.ts
npx tsx prisma/seed-slama-cazacu-pitariu-l2.ts
npx tsx prisma/seed-law-analysis-distribution.ts
npx tsx prisma/seed-skills-transfer.ts

# 4. Cold-start KB (necesita ANTHROPIC_API_KEY)
# curl -X POST http://localhost:3000/api/v1/kb/cold-start -H "Authorization: Bearer ..."

# 5. Demo data (doar pentru development/demo)
npx tsx prisma/seed-demo.ts
```

---

## 5. Observatii

- Toate seed-urile individuale din prisma/ sunt **idempotente** (folosesc upsert)
- **Nu exista un script master** care sa ruleze tot in ordine — fiecare se ruleaza manual
- Cold-start KB genereaza date sintetice (confidence 0.5) — nu inlocuieste expertiza umana
- `seed-demo.ts` este doar pentru mediul de dezvoltare, NU pentru productie
- Lipseste un `seed-production.ts` unificator care sa ruleze pasii 1-3 in ordine
