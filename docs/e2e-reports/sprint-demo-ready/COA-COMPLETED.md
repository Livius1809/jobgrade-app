# COA — Audit infrastructură demo-ready

**Status:** COMPLETED
**Task ID:** cmnsyld7v0026zkvhc0qjkgr1

---

# Audit Infrastructură Demo-Ready — JobGrade Critical Path B2B

## 1. Infra Checklist Demo Setup

### Componente Core Obligatorii
✅ **Next.js 15 Development Server**
- <cite index="1-7">Node.js versiune minimum: 20.9</cite>
- <cite index="1-6">Setup implicit: TypeScript, Tailwind CSS, ESLint, App Router</cite>
- Port implicit: 3000

✅ **Baza de Date PostgreSQL**
- Neon.tech (cloud) pentru demo rapid ȘI
- PostgreSQL local pentru dezvoltare offline
- <cite index="11-3,11-36">DATABASE_URL pentru conexiunea Prisma</cite>

✅ **Prisma ORM 7**
- <cite index="11-25,11-26">Citește automat environment variables din sistem</cite>
- Migrations pentru schema DB
- Seed data pentru demo

### Componente Opționale (Nice-to-Have)
🔄 **n8n (Docker) — OPȚIONAL pentru demo**
- <cite index="21-21">Port implicit: 5678, SQLite implicit sau PostgreSQL</cite>
- <cite index="21-1,21-11">Pentru dezvoltare locală și testare, nu pentru producție</cite>
- Poate fi omis în prima fază demo

✅ **Claude API Integration**
- Pentru scoring joburi și generare rapoarte
- Mock-uibil cu date statice

### Dependențe Sistem
- Docker Desktop (pentru n8n opțional)
- Git pentru version control
- VS Code + extensii Next.js recomandate

## 2. Environment Variables Obligatorii

### .env.local (Prioritate Înaltă — Next.js)
```bash
# === DATABASE ===
DATABASE_URL="postgresql://user:password@localhost:5432/jobgrade_demo?schema=public"
# Pentru Neon.tech: DATABASE_URL="postgresql://user:password@host.neon.tech/jobgrade?sslmode=require"

# === NEXT AUTH V5 ===
NEXTAUTH_SECRET="demo-secret-key-minimum-32-caractere"
NEXTAUTH_URL="http://localhost:3000"

# === CLAUDE API ===
ANTHROPIC_API_KEY="sk-ant-api-key-here"  # Pentru scoring joburi

# === APP CONFIG ===
NODE_ENV="development"

# === DEMO FLAGS (opțional) ===
NEXT_PUBLIC_DEMO_MODE="true"  # Pentru a activa mock data
NEXT_PUBLIC_API_URL="http://localhost:3000"  # Client-side API calls
```

### Explicații Environment Variables

**DATABASE_URL** — <cite index="11-3">Folosit des pentru URL conexiune bază de date</cite>
- Format PostgreSQL: `postgresql://user:password@host:port/database?schema=public`
- Pentru demo local: PostgreSQL pe localhost:5432
- Pentru demo cloud: Neon.tech cu SSL obligatoriu

**NEXTAUTH_SECRET** — Obligatoriu pentru Next.js Auth v5
- Minimum 32 caractere pentru securitate
- Generat unic per environment

**ANTHROPIC_API_KEY** — Pentru integrare Claude API
- Necessary pentru scoring inteligent joburi
- Mock-uibil în demo cu răspunsuri statice

**NODE_ENV** — <cite index="6-2">Next.js evaluează bazat pe NODE_ENV pentru .env files</cite>
- "development" pentru demo local
- "production" pentru deployment

**NEXT_PUBLIC_*** — <cite index="6-4">Doar variabilele cu prefix NEXT_PUBLIC_ sunt expuse la browser</cite>
- Pentru configurare client-side
- Demo mode flags, API endpoints publice

### Hierarchie Fișiere Environment (Next.js)
<cite index="6-1,6-31">Next.js suportă multiple fișiere: .env, .env.local, .env.development, .env.production, .env.test</cite>

Ordinea încărcare (prioritate descrescătoare):
1. `.env.local` — <cite index="6-2,6-32">Next.js prioritizează .env.local pentru overrides locale</cite>
2. `.env.development` (când NODE_ENV=development)
3. `.env.production` (când NODE_ENV=production)
4. `.env` (fallback general)

### Prisma Environment Handling
<cite index="14-23">Prisma nu suportă nativ .env.local, dar se poate folosi dotenv-cli</cite>

Pentru consistency cu Next.js:
```bash
# Package.json scripts
"db:generate": "dotenv -e .env.local -- prisma generate",
"db:migrate": "dotenv -e .env.local -- prisma db push",
"db:seed": "dotenv -e .env.local -- prisma db seed"
```

## 3. Mock Strategy Servicii Externe

### Claude API (Scoring Joburi)
**Producție:** API real Claude pentru analiză complexă
**Demo:** Mock responses cu JSON static

```typescript
// lib/claude-mock.ts
export const mockClaudeScoring = {
  jobAnalysis: {
    complexity: 8.5,
    responsibility: 7.2,
    skills: ["Leadership", "Strategy", "Budget Management"],
    grade: "Senior Manager",
    reasoning: "Poziție cu responsabilități manageriale extinse..."
  }
}
```

### n8n Workflows (Automatizare)
**Producție:** n8n Docker cu workflows complete
**Demo:** Mock workflow results + UI simulat

Pentru demo rapid, n8n poate fi complet omis:
- Simulate workflow results în API routes
- UI mock pentru "workflow execution" status
- Focus pe critical path fără complexitate automațiuni

### Servicii Email (Notificări)
**Producție:** SendGrid, Postmark, etc.
**Demo:** Console.log + UI toast notifications

### File Storage (Rapoarte PDF)
**Producție:** AWS S3, Cloudinary
**Demo:** Local filesystem `/tmp` sau browser download direct

## 4. Setup Instructions Pas-cu-Pas

### Pas 1: Prerequisite Software
```bash
# Verifică Node.js versiune
node --version  # Trebuie >= 20.9

# Instalează pnpm (recomandat pentru Next.js 15)
npm install -g pnpm

# Verifică Docker (opțional pentru n8n)
docker --version
```

### Pas 2: Clone și Setup Repo
```bash
# Clone repository
git clone [jobgrade-repo-url]
cd jobgrade

# Instalează dependențe
pnpm install

# Setup environment
cp .env.example .env.local
# EDITEAZĂ .env.local cu valorile reale
```

### Pas 3: Database Setup

**Opțiunea A: Neon.tech (Recomandat pentru Demo)**
1. Mergi la neon.tech → Create Project
2. Copiază connection string în `DATABASE_URL`
3. Connection string format: `postgresql://user:pass@host.neon.tech/db?sslmode=require`

**Opțiunea B: PostgreSQL Local**
```bash
# macOS (Homebrew)
brew install postgresql
brew services start postgresql
createdb jobgrade_demo

# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb jobgrade_demo

# Windows (scoop)
scoop install postgresql
# Sau PostgreSQL installer official
```

### Pas 4: Prisma Database Setup
```bash
# Generate Prisma client
pnpm db:generate  # Sau: dotenv -e .env.local -- prisma generate

# Push schema la DB (pentru demo rapid)
pnpm db:push     # Sau: dotenv -e .env.local -- prisma db push

# Seed demo data
pnpm db:seed     # Sau: dotenv -e .env.local -- prisma db seed
```

### Pas 5: Start Development Server
```bash
# Start Next.js development
pnpm dev

# Server pornește pe http://localhost:3000
# Check în browser: signup, login, dashboard
```

### Pas 6: n8n Setup (Opțional)
```bash
# Doar dacă vrei să testezi automațiunile
# Creează volum persistent
docker volume create n8n_data

# Start n8n cu tunnel pentru webhook-uri externe
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n \
  start --tunnel

# Acces: http://localhost:5678
# Setup owner account la prima rulare
```

### Pas 7: Verificare Demo Funcțional
1. **Signup Company** → http://localhost:3000/signup
2. **Login ca HR Director** → Dashboard companie
3. **Crează primul job** → Job creation wizard
4. **Evaluare job** → Comitet scoring, Claude API call
5. **Generează raport** → PDF download sau preview

## 5. Dependințe Critice vs Nice-to-Have

### P0 — CRITICE (Demo nu funcționează fără)
- Node.js 20.9+
- Next.js 15 development server
- PostgreSQL database (local SAU Neon.tech)
- Prisma ORM + migrations
- Environment variables (.env.local)
- Next Auth v5 pentru autentificare

### P1 — IMPORTANTE (Demo funcțional dar incomplet)
- Claude API key pentru scoring real
- Seed data pentru user flows
- Tailwind CSS pentru styling consistent
- TypeScript pentru type safety

### P2 — NICE-TO-HAVE (Demo excelent dar nu obligatoriu)
- n8n pentru automațiuni workflow
- Docker pentru containerizare
- Email service pentru notificări
- File storage pentru rapoarte PDF
- Error monitoring (Sentry)
- Performance monitoring

## Concluzie Setup Demo

**Timpul estimat setup complet:** 30-45 minute pentru dezvoltator experimentat

**Configurația minimă funcțională:**
1. Next.js server (5 min)
2. PostgreSQL + Prisma (10 min)
3. Environment variables (5 min)
4. Seed data + test critical path (15 min)

**Pentru demo rapid fără n8n:** configurația minimă este suficientă
**Pentru demo complet cu automațiuni:** adaugă n8n setup (+15 min)

**Troubleshooting common:**
- Port conflicts → verifică că 3000, 5432, 5678 sunt libere
- Permission errors → <cite index="14-55,14-56">Mesajul Prisma ".env loaded" poate fi misleading dar fișierul corect este citit</cite>
- Database connection → verifică DATABASE_URL format și credențiale
- Environment variables → <cite index="6-35">Variables fără NEXT_PUBLIC_ rămân server-only, nu ajung în browser</cite>