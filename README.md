# JobGrade

**Platformă de evaluare și ierarhizare obiectivă a pozițiilor** pentru companii românești și CEE. Conformă cu Directiva EU 2023/970.

- **Stack:** Next.js 16 (App Router, Turbopack) + Prisma 7 + NextAuth v5 + Anthropic Claude
- **DB:** PostgreSQL (Neon Pro în prod, Neon dev local sau Docker)
- **Testing:** Playwright E2E (63 teste) + Prisma integration
- **Deploy:** Vercel (web) + Neon (DB) + Hetzner (n8n workflows)

## Quick start (dev local)

### 1. Prerequisite
- **Node.js 20+** (recomandat 22 LTS)
- **Git**
- **Docker** (opțional, pentru n8n local)
- **Acces Neon DB** (dev branch) sau PostgreSQL local

### 2. Clone + install
```bash
git clone https://github.com/Livius1809/jobgrade-app.git
cd jobgrade-app
npm install
```

### 3. Environment variables

**Opțiunea A: manual** — copiază `.env.example` → `.env` și completează variabilele:

```bash
# Minimum necesar pentru dev
DATABASE_URL="postgresql://user:pass@host.neon.tech/neondb?sslmode=require"
NEXTAUTH_SECRET="generate-32-chars-random"
NEXTAUTH_URL="http://localhost:3000"
ANTHROPIC_API_KEY="sk-ant-api03-..."
RESEND_API_KEY="re_..."
EMAIL_FROM="JobGrade <noreply@jobgrade.ro>"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
INTERNAL_API_KEY="generate-32-chars-random"

# Opțional dar recomandat
UPSTASH_REDIS_URL="https://..."
UPSTASH_REDIS_TOKEN="..."
SENTRY_DSN="https://..."
```

**Opțiunea B: `vercel env pull`** (recomandat după primul deploy Vercel) — extrage automat env vars din project-ul Vercel:
```bash
# 1. Link la project-ul Vercel (o singură dată)
npx vercel link --yes --project jobgrade-app

# 2. Pull env vars din environment development
npx vercel env pull .env.local --yes

# 3. Pentru producție local (preview DB):
npx vercel env pull .env.production.local --environment=production --yes
```

⚠️ **Important:** `vercel env pull` REescrie fișierul — backup-uiește variabile custom înainte. `.env.local` e loadat automat de Next.js dar scripts standalone (`tsx`, `prisma`) necesită dotenv-cli:
```bash
npx dotenv -e .env.local -- npx tsx prisma/seed.ts
```

**Verifică toate variabilele:**
```bash
npx tsx scripts/verify-prod-env.ts
```

### 4. Database setup
```bash
# Generate Prisma client
npx prisma generate

# Push schema la DB (dev)
npx prisma db push

# Seed minimal (criterii + subfactori)
npx tsx prisma/seed.ts

# Seed demo complet (tenant TechVision cu date realiste)
npx tsx prisma/seed-demo.ts
npx tsx prisma/seed-demo-session.ts
npx tsx prisma/seed-demo-complete.ts
```

### 5. Run dev server
```bash
npm run dev
```

Deschide http://localhost:3000

**Credentiale demo:** `owner@techvision.ro` / `Demo2026!`

## Structura proiectului

```
jobgrade-app/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (app)/                # Routes protejate (signup → portal → sessions)
│   │   ├── (auth)/               # Login, register, forgot-password
│   │   ├── (marketing)/          # Landing pages publice
│   │   ├── (portal)/             # Dashboard post-login
│   │   ├── personal/             # B2C landing (6 carduri onion)
│   │   ├── transparenta-ai/      # AI Act transparency (public)
│   │   ├── api/v1/               # API routes versionate
│   │   └── globals.css
│   ├── components/               # React components reutilizabile
│   ├── lib/                      # Business logic + utils
│   │   ├── agents/               # Agent registry, proactive-loop, task-executor
│   │   ├── evaluation/           # Scoring table, je-process-engine
│   │   ├── security/             # csrf-guard, cors-guard, rate-limiter
│   │   └── prisma.ts
│   └── proxy.ts                  # Middleware (CORS, CSRF, rate limit, auth)
├── prisma/
│   ├── schema.prisma             # Schema DB completă (~50 modele)
│   ├── migrations/               # Istoricul migrărilor
│   └── seed-*.ts                 # Script-uri de populate
├── tests/
│   └── e2e/                      # Playwright tests (63 total)
├── scripts/                      # Helper scripts (deploy, verify, backup)
├── docs/                         # Documentație (deploy, GDPR, DPIA, guide primul client)
├── n8n-workflows/                # 50+ workflow-uri n8n (FLUX-xxx)
└── public/                       # Assets statice
```

## Critical Path B2B

Flow-ul complet pentru un client real:

```
Register → Login → Onboarding → Jobs/new → Sessions/new (wizard 3 pași)
    → Evaluate (scoring 6 criterii × 7 subfactori)
    → Consensus (runda 2 dacă există divergențe)
    → Finalize (buton) → engine calculează → JobResult populat
    → Results (ranking vizual + bar chart)
    → Export (PDF / Excel / JSON EU / XML EU)
```

Toate validate automat în `tests/e2e/b2b-demo-flow.spec.ts` + `first-client-journey.spec.ts`.

## Testing

```bash
# Toate E2E (53 passed / 1 skipped OAuth / 0 failed)
npx playwright test

# Doar B2B critical path
npx playwright test tests/e2e/b2b-demo-flow.spec.ts

# Flow complet primul client (register → job → session)
npx playwright test tests/e2e/first-client-journey.spec.ts

# Audit pagini (20 pagini verificate)
npx playwright test tests/e2e/page-smoke-audit.spec.ts

# Performance (Web Vitals pe pagini critice)
npx playwright test tests/e2e/performance-audit.spec.ts

# Type check
npx tsc --noEmit

# Production build
npm run build
```

## Scripts utile

### Development
- `scripts/verify-prod-env.ts` — verifică env vars înainte de deploy
- `scripts/verify-demo-session.ts` — debug stare sesiune demo
- `scripts/check-fcj-users.ts` — debug useri de test E2E
- `scripts/test-living-organism.ts` — vital signs runner pentru organismul viu intern

### Deploy
- `scripts/deploy-migrate-prod.ts` — safe runner `prisma migrate deploy`
- `scripts/top-up-demo-credits.ts` — repopulează credite demo tenant

### Organism viu (sprint auto-management)
- `scripts/backfill-task-objectives.ts` — leagă taskuri la obiective
- `scripts/seed-missing-role-objectives.ts` — obiective cascade per rol
- `scripts/e2e-test-owner-objective.ts` — trimite obiectiv la organism

## Deploy în producție

Vezi **[docs/DEPLOY-GUIDE.md](docs/DEPLOY-GUIDE.md)** pentru ghidul complet pas-cu-pas:
- Faza 1: Neon Pro + branch production + migrare
- Faza 2: Vercel project + env vars + domain
- Faza 3: Hetzner VPS + n8n + Caddy SSL
- Faza 4: Verificare end-to-end + monitoring

## Documentație suplimentară

- **[docs/GHID-PRIMUL-CLIENT.md](docs/GHID-PRIMUL-CLIENT.md)** — ghid client-facing pentru primul HR Director
- **[docs/DEPLOY-GUIDE.md](docs/DEPLOY-GUIDE.md)** — deploy producție
- **[docs/B2C-STATUS.md](docs/B2C-STATUS.md)** — status scope B2C (parțial implementat)
- **[docs/marketing/newsletter-template-b2b.md](docs/marketing/newsletter-template-b2b.md)** — templates newsletter
- **[docs/production-readiness-checklist.md](docs/production-readiness-checklist.md)** — 139 items pre-lansare

## Arhitectură — decizii importante

### Next.js App Router + Turbopack
- Toate rutele folosesc App Router (nu Pages Router)
- Turbopack e default — 10-50x mai rapid la HMR
- Server Components by default, Client Components explicit (`"use client"`)
- Route groups: `(app)`, `(auth)`, `(marketing)` — **NU apar în URL**
  - Path `/app/sessions/...` **nu există** — folosește `/sessions/...`

### Multi-tenancy
- Fiecare companie = Tenant izolat
- Toate queries Prisma filtrate pe `tenantId`
- JWT session include `tenantId`
- Zero cross-tenant data leakage

### Security stack (10 layere)
1. CORS preflight (OPTIONS whitelist)
2. CSRF guard (origin/referer validation)
3. Rate limiting (Upstash Redis, tier-based)
4. Public path allowlist
5. Static files skip
6. Internal API key (n8n → Vercel)
7. Hidden routes (`/owner` → 404 pentru neauth)
8. B2C token separate (nu NextAuth)
9. NextAuth session validation
10. Security headers (CSP, HSTS, X-Frame, Referrer-Policy, etc.)

Vezi `src/proxy.ts` + `src/lib/security/`.

### Scoring engine
- 6 criterii × A-G subfactori = bareme fixe (scoring-table.ts)
- Normalizare RO↔EN pentru criterii (engine internal folosește chei engleze)
- `je-process-engine.ts` — pipeline Pre-scoring → Benchmark → Slotting → Owner Validation → Finalize
- `finalizeSession()` populează `JobResult` cu rank + score + normalized
- **INTERN:** baremul de punctare e secret de serviciu. Nu expune clientului punctele exacte per subfactor.

### Agent ecosystem
- 34 agents definiti (vezi `project_agent_hierarchy.md` memory)
- Task executor cu Anthropic tool_use + sibling context + web search opțional
- Proactive-loop: fiecare manager execută self-tasks + evaluează subordonați
- Signal→task pipeline: COSO automat la semnale externe

## Troubleshooting dev

### "Turbopack hot reload nu prinde modificarea"
Adaugă `export const dynamic = "force-dynamic"` la pagină.

### "CSRF 403 la POST"
Verifică `NEXT_PUBLIC_APP_URL` în `.env` — trebuie să match Origin header (ex: `http://localhost:3000`).

### "Session COMPLETED dar JobResult gol"
Asigură-te că ai rulat seed-demo-complete care apelează `finalizeSession` engine, nu doar `PATCH status`.

### "Rate limit 429 în dev"
Sau:
1. Setează `UPSTASH_REDIS_URL` + token (chiar dev)
2. Sau acceptă fallback in-memory (funcționează dar se resetează la restart)

### "Dev server se oprește"
Folosește watchdog-ul inclus:
```bash
bash scripts/start-with-watchdog.sh
```

## Contributing

Acest repo e **privat**. Pentru feedback sau bug reports, contactează direct Owner-ul.

## Licență

Proprietar — Psihobusiness Consulting SRL (CIF RO15790994).
Toate drepturile rezervate.

---

**Status deployment:** Dev complet funcțional, validat cu 63 E2E teste. Gata pentru deploy producție — vezi [docs/DEPLOY-GUIDE.md](docs/DEPLOY-GUIDE.md).
