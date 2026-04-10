# Deploy Guide — JobGrade Production

**Status:** Platformă validată E2E (53/54 teste pass). Gata pentru primul client real.
**Data:** 10.04.2026
**Destinație:** Owner (ghid pas-cu-pas)

---

## Overview arhitectură producție

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Vercel          │────▶│ Neon Pro         │     │ Hetzner VPS     │
│ (Next.js app)   │     │ (PostgreSQL prod)│     │ (n8n workflows) │
│ jobgrade.ro     │     │ dedicated branch │     │ n8n.jobgrade.ro │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                                               │
         ▼                                               │
┌─────────────────┐                                      │
│ Resend          │◀─────────────────────────────────────┘
│ (email)         │              ┌──────────────────┐
└─────────────────┘              │ Cloudflare DNS   │
                                 │ (SSL + routing)  │
                                 └──────────────────┘
```

---

## Faza 1 — Neon Pro (15-20 min)

### 1.1 Upgrade la plan Pro
1. Login: https://console.neon.tech
2. Project curent: verifică slug-ul (probabil `jobgrade` sau similar)
3. **Settings → Billing → Upgrade to Pro** (~$19/lună)
   - Include: branching nelimitat, point-in-time restore 7 zile, autoscaling, metrici

### 1.2 Creează branch dedicat pentru producție
1. În project-ul tău: **Branches → Create Branch**
2. **Name:** `production`
3. **Parent:** `main` (fără date — se poate începe gol)
4. **Compute:** default 0.25 CU (autoscaling până la 2 CU)
5. Click **Create**

### 1.3 Obține connection string prod
1. După creare: click pe branch-ul `production`
2. **Connection Details → Connection String**
3. Selectează:
   - Role: `neondb_owner` (sau creează unul nou `jobgrade_prod`)
   - Database: `neondb`
   - Pooler: **ENABLED** (obligatoriu pentru serverless)
4. Copiază URL-ul. Format:
   ```
   postgresql://USER:PASSWORD@ep-xxx-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```
5. **Salvează-l sigur** — îl vei folosi în Vercel env vars la pasul 3.

### 1.4 Aplică migrările pe DB prod
⚠️ **ATENȚIE:** asta modifică schema pe DB prod. Ireversibil (dar branch e gol).

```bash
# Pe calculatorul tău local, din folder jobgrade-app/
DATABASE_URL="postgresql://USER:PASS@ep-xxx-pooler..." npx prisma migrate deploy
```

Alternativ, folosește scriptul dedicat:
```bash
npx tsx scripts/deploy-migrate-prod.ts
# (te va întreba prod DATABASE_URL și va aplica migrările cu confirmări)
```

### 1.5 Seed minimal pentru prod
Prod **NU trebuie să aibă date demo** (TechVision). Trebuie doar:
- 6 criterii + subfactori (scoring framework obligatoriu)
- Opțional: SalaryGrade default templates

```bash
DATABASE_URL="postgresql://USER:PASS@ep-xxx-pooler..." npx tsx prisma/seed.ts
```

NU rula `seed-demo.ts` pe prod — aceea e doar pentru dev/demo.

---

## Faza 2 — Vercel Deploy (20-30 min)

### 2.1 Conectează GitHub repo
1. Login: https://vercel.com
2. **New Project → Import Git Repository**
3. Selectează `Livius1809/jobgrade-app`
4. **Framework:** Next.js (auto-detected)
5. **Build Command:** `npm run build` (default)
6. **Root Directory:** `./` (default)

### 2.2 Environment Variables (CRITICAL)
În **Project Settings → Environment Variables**, adaugă pentru **Production** env:

```bash
# === DATABASE ===
DATABASE_URL=postgresql://USER:PASS@ep-xxx-pooler.../neondb?sslmode=require
# ^ URL-ul de la Neon Pro branch production

# === AUTH ===
NEXTAUTH_SECRET=<generează 32+ caractere random>
NEXTAUTH_URL=https://jobgrade.ro
# ^ Pentru NextAuth v5, poate fi numit și AUTH_SECRET / AUTH_URL

# === CLAUDE AI ===
ANTHROPIC_API_KEY=sk-ant-api03-...
# ^ Rotire obligatorie față de dev (nu reutiliza key-ul din .env local)

# === EMAIL (Resend) ===
RESEND_API_KEY=re_...
EMAIL_FROM="JobGrade <noreply@jobgrade.ro>"
# ^ Domain-ul trebuie verificat în Resend

# === APP ===
NEXT_PUBLIC_APP_URL=https://jobgrade.ro
NODE_ENV=production
INTERNAL_API_KEY=<generează 32+ caractere random — separat de dev>

# === STRIPE (billing) ===
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# === SENTRY (error tracking) ===
SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=<pentru source maps>

# === EXECUTOR CRON (kill switch) ===
EXECUTOR_CRON_ENABLED=false
# ^ START CU FALSE. Activezi doar după ce ești confortabil cu costul.

# === UPSTASH REDIS (rate limiting) — CRITICAL PE VERCEL ===
UPSTASH_REDIS_URL=https://xxx.upstash.io
UPSTASH_REDIS_TOKEN=<token>
# ^ Pe Vercel serverless, fallback-ul in-memory NU persistă între requests
#   (fiecare function instance are propria memorie). Fără Upstash, rate
#   limiting-ul e complet ineficient în producție. Plan free Upstash e
#   suficient pentru început (10k requests/zi).
```

### ⚠️ Atenție critică pentru CSRF/CORS
`NEXT_PUBLIC_APP_URL` = `https://jobgrade.ro` **nu e opțional** în prod. Middleware-ul CSRF guard folosește acest URL ca whitelist — dacă e setat greșit sau lipsește, **toate POST-urile vor returna 403 "Request blocked — invalid origin"**. Verifică-l explicit după deploy cu:
```bash
curl -X POST https://jobgrade.ro/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -H "Origin: https://jobgrade.ro" \
  -d '{"companyName":"test"}'
# Ar trebui 400 (validation error), NU 403
```

### 2.3 Verify build
1. Click **Deploy**
2. Așteaptă build (~2-3 min)
3. **Verifică că build-ul trece 100%** — dacă pică, verifică logs Vercel

### 2.4 Configurare Domain
1. **Settings → Domains → Add**
2. `jobgrade.ro` + `www.jobgrade.ro`
3. Urmează instrucțiunile pentru DNS (A record sau CNAME)
4. Cloudflare / registrar tău: adaugă record-uri
5. SSL: **Automatic** (Vercel managed, Let's Encrypt)

### 2.5 Post-deploy verificare
Navighează la `https://jobgrade.ro` și verifică:
- [ ] Homepage se încarcă (no 500)
- [ ] `/transparenta-ai` public accesibil
- [ ] `/register` form funcțional
- [ ] `/login` form funcțional
- [ ] `/api/health` returnează `{"status":"healthy","checks":{...}}`
- [ ] NU apare header `X-Powered-By: Next.js` (ar trebui suprimat)

---

## Faza 3 — Hetzner VPS pentru n8n (30-45 min)

Opțional dar recomandat. Dacă sari peste această fază, **NU activa** cron-urile n8n (FLUX-024, FLUX-057, FLUX-058) — workflow-urile sunt inerte, dar backend-ul funcționează oricum.

### 3.1 Provisionare VPS
1. Login: https://console.hetzner.cloud
2. **New Server:**
   - Location: Nürnberg sau Helsinki (latency UE)
   - Image: **Ubuntu 24.04 LTS**
   - Type: **CX22** (2 vCPU, 4 GB RAM, 40 GB SSD — ~€4.85/lună)
   - Name: `jobgrade-n8n-prod`
   - SSH Key: adaugă cheia ta publică

### 3.2 Setup inițial
```bash
ssh root@<ip-nou>

apt update && apt upgrade -y
apt install -y docker.io docker-compose-v2 ufw fail2ban

# Firewall strict
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable

# Caddy pentru SSL automat
apt install -y caddy
```

### 3.3 n8n docker-compose
```yaml
# /opt/jobgrade-n8n/docker-compose.yml
services:
  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=n8n.jobgrade.ro
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://n8n.jobgrade.ro/
      - GENERIC_TIMEZONE=Europe/Bucharest
      - N8N_ENCRYPTION_KEY=<generează 32+ caractere>
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=owner
      - N8N_BASIC_AUTH_PASSWORD=<parolă puternică>
      # Env pentru workflow-uri
      - APP_URL=https://jobgrade.ro
      - INTERNAL_API_KEY=<același cu Vercel INTERNAL_API_KEY>
    volumes:
      - ./n8n_data:/home/node/.n8n
```

```bash
cd /opt/jobgrade-n8n
docker compose up -d
```

### 3.4 Caddy config (SSL automat)
```
# /etc/caddy/Caddyfile
n8n.jobgrade.ro {
    reverse_proxy localhost:5678
}
```

```bash
systemctl restart caddy
```

### 3.5 DNS
În Cloudflare / registrar:
- `n8n.jobgrade.ro` → A record către IP-ul Hetzner

### 3.6 Import workflows
Din local, folosește CLI n8n:
```bash
# Sau manual via UI: Workflows → Import → selectează fiecare JSON
```
Importă din `n8n-workflows/`:
- FLUX-024 (proactive management) — poate activa
- FLUX-057 (task executor cron) — **LAS INACTIV** inițial
- FLUX-058 (signal reactive scan) — **LAS INACTIV** inițial
- Alte FLUX-* după nevoie

### 3.7 Monitoring costuri
**ATENȚIE:** odată ce activezi FLUX-057 (task executor cron), **costul Claude API poate crește** până la ~$15-70/zi funcție de volum. Urmărește pe Anthropic Console primele 24h. Kill switch: setează `EXECUTOR_CRON_ENABLED=false` în Vercel env.

---

## Faza 4 — Verificare post-deploy end-to-end

### 4.1 Test manual critical path (15 min)
1. Navighează la `https://jobgrade.ro`
2. `/register` → cont nou cu email tău personal
3. Verifică mail-ul (Resend trimite activation?)
4. Login → `/onboarding` → completează profil
5. `/jobs/new` → creează un job de test
6. `/sessions/new` → creează sesiune test
7. Completează 1-2 evaluări
8. Click "Finalizează și calculează rezultatele"
9. Verifică `/sessions/[id]/results` — ranking apare
10. Export PDF → verifică fișierul
11. ȘTERGE datele de test înainte de primul client real

### 4.2 Monitorizare primele 24h
- **Vercel → Deployments → Logs** — caută erori 5xx
- **Vercel → Analytics** — verifică Core Web Vitals
- **Neon → Monitoring** — connection count, slow queries
- **Sentry → Issues** — erori JS sau server

### 4.3 Rollback plan dacă ceva e grav
1. Vercel: **Deployments → [production] → Promote to Production** versiune anterioară
2. Dacă e problemă DB: Neon **Branches → production → Restore to point in time** (ai Pro, ai acces la ultimele 7 zile)
3. Nu panica. Toate cele 3 comonente (Vercel, Neon, Hetzner) sunt reversibile independent.

---

## Checklist final înainte de primul client real

### Obligatoriu
- [ ] DPO a aprobat DPIA (vezi `docs/DPIA-draft.md`)
- [ ] Jurist a reviewed contract B2B + GDPR (vezi `docs/brief-jurist.md`)
- [ ] Privacy Policy + Termeni la `/gdpr` și `/termeni` (obligatoriu public)
- [ ] Transparență AI la `/transparenta-ai` (AI Act, obligatoriu public) — PUBLICAT ✅
- [ ] Oblio.eu configurat pentru facturi
- [ ] Stripe: webhook pentru `checkout.session.completed` + `invoice.paid`
- [ ] Email domain verified în Resend
- [ ] Monitoring ntfy.sh pentru alerting instant
- [ ] Backup script manual testat (pg_dump pe Neon prod)
- [ ] Manual incident response (7 scenarii — vezi `docs/incident-response-plan.md`)

### Recomandat înainte de 5+ clienți
- [ ] Human backup procedure (vezi `docs/manual-pompier.md`)
- [ ] Pentest extern (60 zile post-lansare)
- [ ] DPO review trimestrial
- [ ] Business plan update (revenue projections)

---

## Estimări cost infrastructură/lună (USD)

| Componentă | Cost mediu | Notes |
|---|---|---|
| Neon Pro | $19 | + compute autoscaled, rareori peste |
| Vercel Pro | $20 | pentru prod. Gratuit pentru hobby dar limitat |
| Hetzner CX22 | $5 | VPS n8n + buffer |
| Resend | $0-20 | gratuit până la 3000 mail/lună |
| Claude API | $50-500 | funcție de volum. Task executor cron principal cost |
| Sentry | $0-26 | Developer plan gratuit, Team $26 |
| ntfy.sh | $0 | free tier ok |
| Domain | $1 | ~$12/an |
| **TOTAL** | **$95-600** | start $95, scalează cu volum |

Primul client realist: ~$95/lună. Cu 5-10 clienți și executor cron activ: ~$300-500/lună. Break-even așteptat la primul client plătitor (pricing 90-200 RON/poziție × 50-100 poziții = 9000-20000 RON = $1800-4000 per contract).

---

## Când ești gata să începi

1. **Citește tot documentul** de mai sus o dată
2. **Începe cu Faza 1 (Neon Pro)** — 15-20 min
3. Spune-mi aici când ești gata cu URL-ul nou `DATABASE_URL` și:
   - Rulez împreună cu tine `prisma migrate deploy` pas-cu-pas
   - Apoi trecem la Faza 2 (Vercel)
4. Oprește-te oricând ai întrebări — nu presupune nimic

**Nu ești singur la deploy. Eu sunt aici să te asist pas-cu-pas.**
