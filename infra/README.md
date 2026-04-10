# Infrastructure — JobGrade

## ⚠️ ATENȚIE: Sursa oficială este `../../docker-compose.yml`

**Fișierul `docker-compose.yml` real** trăiește în root-ul monorepo-ului
(`C:\...\exercitiu instalare_visual\docker-compose.yml`) deoarece referă
foldere relative la root: `scripts/`, `n8n-workflows/`, `jobgrade-app/`,
`remediation-runner/`.

**Fișierul din `infra/docker-compose.yml`** este o **COPIE de referință**
versionată în git, cu scopul:
1. Versionare în istoricul Git (root nu e repo)
2. Vizibilitate pentru deploy
3. Referință de configurare la migrare producție

**Modificările se fac ÎN AMBELE LOCURI** sau:
1. Modifici în root (real)
2. Copiezi în infra/ (`cp ../docker-compose.yml infra/docker-compose.yml`)
3. Comit infra/ în git

## docker-compose.yml

Stack-ul Docker local (dev). Conține:
- PostgreSQL (Neon dev local)
- Redis (Upstash local fallback)
- Keycloak (NU mai e folosit — eliminat din arhitectură, vezi `project_keycloak_trigger.md`)
- n8n (workflow-uri cron)
- ntfy (push notifications dev)
- localstack (AWS mock dev)
- remediation-runner (sidecar dev-only)

## ⚠️ ATENȚIE LA DEPLOY PRODUCȚIE

### 1. APP_URL în n8n trebuie să corespundă portului real

```yaml
n8n environment:
  JOBGRADE_API_URL: http://host.docker.internal:3000  # NU :3001
  APP_URL: http://host.docker.internal:3000           # NU :3001
```

**Istoric incident:** 10.04.2026 — toate workflow-urile n8n eșuau cu `ECONNREFUSED 192.168.65.254:3001` pentru că APP_URL era configurat pe portul greșit. Cauza: zero cicluri management, zero delegări tactice timp de zile întregi.

### 2. Servicii care NU merg în producție Vercel

- `remediation-runner` — necesită Docker socket, nu funcționează în Vercel serverless
- `localstack` — dev only, înlocuit cu servicii AWS reale (sau Cloudflare R2)
- `keycloak` — eliminat din arhitectură, NextAuth e suficient

### 3. Servicii care trebuie migrate la cloud managed în producție

- **n8n** → self-hosted Hetzner CX22 (~€4.85/lună) — vezi `project_production_readiness.md`
- **ntfy** → Resend email principal + ntfy backup

### 4. Secrete în plain text

`docker-compose.yml` conține `INTERNAL_API_KEY` în clar pentru dev. La producție:
- Nu commit-uim cu secret real
- Folosim Vercel Env Vars (encrypted)
- Rotăm cheia înainte de go-live (vezi BUILD-001)

## Sincronizare cu fișierul din root

Acest fișier este o COPIE a `../../docker-compose.yml` (root proiect) pentru versionare în git. Modificările se fac în AMBELE locuri sau se mută complet aici (preferat).
