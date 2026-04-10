# Checklist Production Readiness — JobGrade Platform

**Versiune:** 1.0  
**Data:** 2026-04-08  
**Clasificare:** INTERN — Owner + Claude  
**Scop:** GO / NO-GO definitiv inainte de lansarea in productie

---

## Legenda

| Simbol | Semnificatie |
|--------|-------------|
| ✅ DONE | Implementat si functional |
| 🔄 IN PROGRESS | Lucru in desfasurare |
| ❌ TODO | De facut |
| ⚠️ NEEDS DECISION | Necesita decizie Owner |
| **P0** | Blocker — nu se lanseaza fara |
| **P1** | Critic — risc major daca lipseste |
| **P2** | Important — poate fi rezolvat in primele 2 saptamani post-lansare |
| **P3** | Nice to have — planificat post-lansare |

---

## 1. INFRASTRUCTURA & DEPLOYMENT

### 1.1 Vercel Deployment

| # | Element | Status | Prioritate | Owner | Efort | Note |
|---|---------|--------|-----------|-------|-------|------|
| 1.1.1 | Creare proiect Vercel + linkare repo GitHub | ❌ TODO | **P0** | Owner | 30 min | Repo GitHub trebuie creat/migrat primul |
| 1.1.2 | Configurare domeniu `jobgrade.ro` in Vercel | ❌ TODO | **P0** | Owner | 1h | DNS A/CNAME records la registrar |
| 1.1.3 | Configurare subdomenii: `app.jobgrade.ro`, `api.jobgrade.ro` | ⚠️ NEEDS DECISION | **P1** | Owner | 30 min | Decizie: un singur domeniu sau subdomenii separate? |
| 1.1.4 | SSL/TLS (certificat Let's Encrypt via Vercel) | ❌ TODO | **P0** | Automat | 0 | Vercel genereaza automat la adaugarea domeniului |
| 1.1.5 | Eliminare header `X-Robots-Tag: noindex, nofollow` din `next.config.ts` | ❌ TODO | **P0** | Claude | 5 min | Linia 13 din `next.config.ts` — activa acum, trebuie scoasa la lansare |
| 1.1.6 | Actualizare `NEXT_PUBLIC_APP_URL` de la `localhost:3001` la URL productie | ❌ TODO | **P0** | Claude | 5 min | `.env` linia 10 |
| 1.1.7 | Actualizare `NEXTAUTH_URL` si `AUTH_URL` la URL productie | ❌ TODO | **P0** | Claude | 5 min | `.env` liniile 16-17 |

### 1.2 Variabile de Mediu (Migrare .env → Vercel)

| # | Element | Status | Prioritate | Owner | Efort | Note |
|---|---------|--------|-----------|-------|-------|------|
| 1.2.1 | Migrare toate variabilele din `.env` in Vercel Environment Variables (encrypted) | ❌ TODO | **P0** | Owner | 1h | BUILD-001 aprobat: Vercel Env Vars. 28 variabile identificate in `.env` |
| 1.2.2 | Separare variabile per environment (Preview / Production) | ❌ TODO | **P0** | Owner | 30 min | `DATABASE_URL` diferit dev vs prod |
| 1.2.3 | Verificare: nicio cheie NEXT_PUBLIC_ nu expune secrete | ✅ DONE | — | — | — | Confirmat: doar `APP_URL`, `APP_NAME`, `STRIPE_PUBLISHABLE_KEY`, `ELEVENLABS_*` (by design publice) |
| 1.2.4 | Stergere `.env` de pe masina dev dupa migrare (sau rotare chei) | ❌ TODO | **P1** | Owner | 15 min | VUL-034: chei live Stripe (`sk_live_*`) sunt in `.env` local in clar |

### 1.3 Baza de Date

| # | Element | Status | Prioritate | Owner | Efort | Note |
|---|---------|--------|-----------|-------|-------|------|
| 1.3.1 | Creare proiect Neon productie separat de dev | ❌ TODO | **P0** | Owner | 30 min | Dev actual: `ep-odd-water-alccgot0-pooler` (Neon). Productie: proiect nou |
| 1.3.2 | Migrare schema Prisma pe DB productie (`prisma migrate deploy`) | ❌ TODO | **P0** | Claude | 30 min | Schema din `src/generated/prisma/schema.prisma` |
| 1.3.3 | Activare connection pooling (PgBouncer via Neon) | ❌ TODO | **P1** | Claude | 15 min | `@prisma/adapter-pg` deja in `package.json` |
| 1.3.4 | Configurare backup automat Neon (Point-in-Time Recovery) | ❌ TODO | **P0** | Owner | 15 min | Neon ofera PITR 7 zile pe plan gratuit, 30 zile pe Pro |
| 1.3.5 | Verificare extensie `pgvector` pe Neon productie | ❌ TODO | **P1** | Claude | 10 min | KB entries folosesc embeddings vectoriale |
| 1.3.6 | Seed data productie (criterii evaluare, KB cold-start, benchmark salarii) | ❌ TODO | **P0** | Claude | 2h | `prisma/seed.ts` exista; `src/lib/kb/cold-start.ts` contine 96+ KB entries |

### 1.4 Redis (Upstash)

| # | Element | Status | Prioritate | Owner | Efort | Note |
|---|---------|--------|-----------|-------|-------|------|
| 1.4.1 | Verificare instanta Upstash existenta este productie-ready | ✅ DONE | — | — | — | `UPSTASH_REDIS_URL` configurat (`happy-falcon-75889.upstash.io`) |
| 1.4.2 | Verificare limita plan Upstash (requests/zi, dimensiune) | ❌ TODO | **P1** | Owner | 15 min | Rate limiter face ~1-2 Redis calls per API request |
| 1.4.3 | Configurare Redis TLS (Upstash ofera nativ) | ✅ DONE | — | — | — | URL-ul `https://` confirma TLS activ |

### 1.5 Servicii Docker (Keycloak, n8n, ntfy)

| # | Element | Status | Prioritate | Owner | Efort | Note |
|---|---------|--------|-----------|-------|-------|------|
| 1.5.1 | Decizie: unde ruleaza Keycloak in productie? | ⚠️ NEEDS DECISION | **P0** | Owner | — | Optiuni: (A) Managed Keycloak (Cloud-IAM.com), (B) VPS dedicat, (C) Inlocuire cu NextAuth nativ. Acum: dev local Docker |
| 1.5.2 | Decizie: unde ruleaza n8n in productie? | ⚠️ NEEDS DECISION | **P1** | Owner | — | Optiuni: (A) n8n Cloud (~20 EUR/luna), (B) VPS, (C) Self-hosted Hetzner. 9+ cron workflows active |
| 1.5.3 | Decizie: ntfy — mentinere sau migrare la alt serviciu push | ⚠️ NEEDS DECISION | **P2** | Owner | — | Actual: `ntfy.sh` public (topic `jobgrade-owner-liviu-2026`). Productie: ntfy self-hosted sau Pushover/PagerDuty |
| 1.5.4 | Migrare `remediation-runner` — eliminare din stack productie | ❌ TODO | **P2** | Claude | 1h | Sidecar dev-only; in productie Vercel nu are Docker socket |
| 1.5.5 | Migrare `localstack` — inlocuire cu AWS real (KMS, S3) sau Cloudflare R2 | ❌ TODO | **P1** | Owner | 2h | `AWS_ACCESS_KEY_ID` si `AWS_SECRET_ACCESS_KEY` sunt goale in `.env` |

### 1.6 CI/CD

| # | Element | Status | Prioritate | Owner | Efort | Note |
|---|---------|--------|-----------|-------|-------|------|
| 1.6.1 | Creare repo GitHub (privat) | ❌ TODO | **P0** | Owner | 15 min | Actual: fara repo Git |
| 1.6.2 | Configurare auto-deploy Vercel pe push la `main` | ❌ TODO | **P0** | Owner | 15 min | Standard Vercel: merge to main = deploy production |
| 1.6.3 | Branch protection pe `main` (require PR + review) | ❌ TODO | **P1** | Owner | 10 min | GitHub Settings → Branch protection rules |
| 1.6.4 | Preview deployments pe PR (Vercel automat) | ❌ TODO | **P2** | Automat | 0 | Vercel ofera by default |
| 1.6.5 | Strategie rollback documentata | ❌ TODO | **P1** | Claude | 1h | Vercel: revert la deployment anterior din dashboard |

---

## 2. SECURITATE

### 2.1 Vulnerabilitati (din VULNERABILITY-REPORT.md)

| # | Element | Status | Prioritate | Owner | Efort | Note |
|---|---------|--------|-----------|-------|-------|------|
| 2.1.1 | VUL-004 Prompt Injection Filter | ✅ DONE | — | — | — | 61 pattern-uri, integrat pe 8/10 chat endpoints |
| 2.1.2 | VUL-005 Escalation Detector | ✅ DONE | — | — | — | Sliding window 20 mesaje, prag 5 |
| 2.1.3 | VUL-009 B2C Auth (JWT) | ✅ DONE | — | — | — | `b2c-auth.ts`: generate/verify/ownership |
| 2.1.4 | VUL-015 CORS restrictiv | ✅ DONE | — | — | — | `cors-guard.ts` + `proxy.ts`, doar `jobgrade.ro` + localhost |
| 2.1.5 | VUL-031 CSRF Protection | ✅ DONE | — | — | — | `csrf-guard.ts`, Origin/Referer validation |
| 2.1.6 | VUL-032 File Upload Validation | ✅ DONE | — | — | — | 10MB max, extensii .xlsx/.csv/.pdf, magic bytes |
| 2.1.7 | VUL-035 Security Headers | ✅ DONE | — | — | — | HSTS, CSP, X-Frame-Options, Permissions-Policy complet |
| 2.1.8 | VUL-036 Tenant Isolation | ✅ DONE | — | — | — | `tenantId` pe toate queries |
| 2.1.9 | VUL-037 SQL Injection Prevention | ✅ DONE | — | — | — | Prisma ORM, zero raw SQL |
| 2.1.10 | VUL-038 Rate Limiting Redis | ✅ DONE | — | — | — | 4 tier-uri: CHAT 10/min, B2C 30/min, B2B 60/min, GENERAL 100/min |
| 2.1.11 | VUL-034 Secrets Management → Vercel Env Vars | ❌ TODO | **P0** | Owner | 1h | BUILD-001 aprobat dar neimplementat. Chei Stripe live in `.env` local |
| 2.1.12 | VUL-025 Pagina Transparenta AI | ❌ TODO | **P1** | Claude | 3 zile | BUILD-002 aprobat. `docs/transparenta-ai-content.md` exista ca draft. Termen: 2 aug 2026 |
| 2.1.13 | VUL-027 Endpoint-uri GDPR (export + stergere) | 🔄 IN PROGRESS | **P0** | Claude | 2 zile | `src/app/api/v1/b2c/my-data/route.ts` exista; `src/app/api/v1/b2c/account/route.ts` exista. De verificat completitudine |
| 2.1.14 | VUL-039 SECURITY.md + DPIA + Incident Response Plan | ❌ TODO | **P1** | Claude + DPO | 1 sapt | BUILD-005 aprobat: draft AI + review DPO |
| 2.1.15 | VUL-040 Chat Endpoints incomplete (5 lipsesc) | 🔄 IN PROGRESS | **P1** | Claude | 3 zile | HR Counselor B2B (P0), Card 2-5 B2C (P2 — lansare B2C ulterioara) |

### 2.2 Securitate Pre-Lansare

| # | Element | Status | Prioritate | Owner | Efort | Note |
|---|---------|--------|-----------|-------|-------|------|
| 2.2.1 | Rotare TOATE secretele inainte de go-live | ❌ TODO | **P0** | Owner | 2h | `AUTH_SECRET`, `INTERNAL_API_KEY`, `ANTHROPIC_API_KEY`, chei Stripe, Google, LinkedIn, ElevenLabs, Voyage |
| 2.2.2 | Actualizare CORS allowed origins — doar `jobgrade.ro` (elimina localhost) | ❌ TODO | **P0** | Claude | 15 min | `src/lib/security/cors-guard.ts` + `csrf-guard.ts` |
| 2.2.3 | Actualizare CSRF allowed origins — doar domeniul productie | ❌ TODO | **P0** | Claude | 15 min | Aceeasi locatie ca CORS |
| 2.2.4 | Reconfigurare rate limiting praguri productie | ❌ TODO | **P1** | Claude | 30 min | Pragurile actuale (CHAT 10/min) pot fi prea permisive/restrictive. Calibrare dupa primele 30 zile |
| 2.2.5 | Penetration testing (cel putin basic OWASP ZAP scan) | ❌ TODO | **P1** | External | 1-2 zile | Poate fi facut cu OWASP ZAP gratuit sau Burp Suite Community |
| 2.2.6 | Verificare DDoS protection (Vercel built-in + Cloudflare optional) | ❌ TODO | **P2** | Owner | 1h | Vercel ofera protectie DDoS basic. Cloudflare DNS proxy = extra layer |
| 2.2.7 | Definire schedule rotare chei API (trimestrial) | ❌ TODO | **P2** | Owner | 30 min | Documentare procedura + calendar |
| 2.2.8 | Audit dependente npm (`npm audit`) | ❌ TODO | **P1** | Claude | 30 min | `next@16.1.7`, `@anthropic-ai/sdk@0.79.0`, `stripe@20.4.1` — verificare CVE-uri |

---

## 3. PERFORMANTA & SCALABILITATE

| # | Element | Status | Prioritate | Owner | Efort | Note |
|---|---------|--------|-----------|-------|-------|------|
| 3.1 | Estimare utilizatori concurenti la lansare | ⚠️ NEEDS DECISION | **P1** | Owner | — | Primii 5 clienti B2B = ~50-200 utilizatori. Vercel Free: 100K requests/luna |
| 3.2 | Verificare indexuri DB pe coloanele frecvent filtrate | ❌ TODO | **P1** | Claude | 2h | `tenantId`, `userId`, `createdAt` pe tabele mari (conversation_messages, kb_entries) |
| 3.3 | Load testing (k6 sau Artillery) pe endpoint-uri critice | ❌ TODO | **P2** | Claude | 1 zi | Endpoint-uri: `/api/v1/jobs`, `/api/v1/evaluation`, chat routes |
| 3.4 | Proiectie costuri Claude API la scala | ❌ TODO | **P1** | Claude | 2h | Actual: ~3 calls/mesaj (raspuns + shadow + coherence). La 100 useri: estimare cost/luna |
| 3.5 | Bundle size optimization (`next build` + analyze) | ❌ TODO | **P2** | Claude | 2h | Verificare: recharts, react-pdf, exceljs contribuie semnificativ la bundle |
| 3.6 | Optimizare imagini (Next.js Image component, WebP) | ❌ TODO | **P3** | Claude | 1h | Verificare landing page B2B: `src/app/b2b/page.tsx` |
| 3.7 | Caching strategy: Claude commercial responses | ✅ DONE | — | — | — | `degraded-mode.ts` — cache 24h pe raspunsuri comerciale frecvente |
| 3.8 | Connection pooling Prisma + Neon | ❌ TODO | **P1** | Claude | 1h | `@prisma/adapter-pg` prezent; de configurat pool size pentru serverless |
| 3.9 | Vercel Function timeout configurare | ❌ TODO | **P1** | Claude | 15 min | Chat routes cu Claude pot depasi 10s default. Setare `maxDuration` pe route segments |

---

## 4. MONITORIZARE & ALERTING

| # | Element | Status | Prioritate | Owner | Efort | Note |
|---|---------|--------|-----------|-------|-------|------|
| 4.1 | Sentry error tracking — integrare in aplicatie | 🔄 IN PROGRESS | **P0** | Claude | 2h | `SENTRY_DSN` configurat in `.env`. `external-resources.ts` refera Sentry. De integrat `@sentry/nextjs` in cod |
| 4.2 | Uptime monitoring extern (UptimeRobot / Better Uptime) | ❌ TODO | **P1** | Owner | 30 min | Monitor pe `https://jobgrade.ro/api/health`. Interval: 5 min |
| 4.3 | Health check endpoint extins (DB + Redis + Claude API) | 🔄 IN PROGRESS | **P1** | Claude | 2h | `src/app/api/health/route.ts` exista — verifica doar secrets. De adaugat: DB ping, Redis ping, Claude health |
| 4.4 | Vercel Logs activare (inclus in plan) | ❌ TODO | **P1** | Owner | 15 min | Vercel dashboard → Logs tab |
| 4.5 | Alerting productie: email + SMS la incidente | ❌ TODO | **P1** | Owner | 1h | Actual: doar ntfy.sh (push notification Owner). De adaugat: email via Resend la erori critice |
| 4.6 | Dashboard costuri: Anthropic + Vercel + Neon | ❌ TODO | **P1** | Owner | 2h | Budget cap implementat (`budget-cap.ts`), dar fara dashboard vizual. `getBudgetStatus()` returneaza date — de creat pagina Owner |
| 4.7 | Web Vitals monitoring (Vercel Analytics) | ❌ TODO | **P2** | Owner | 15 min | Vercel ofera gratuit Speed Insights. Activare din dashboard |
| 4.8 | Status page publica | ❌ TODO | **P3** | Owner | 2h | Optiuni: Instatus (gratuit 1 monitor), Upptime (GitHub-based), sau pagina custom |
| 4.9 | Degraded mode status vizibil in Owner Dashboard | ✅ DONE | — | — | — | `getDegradedModeStatus()` din `degraded-mode.ts` — health, circuit breaker, cache size, recent failures |
| 4.10 | Failure log pentru Claude API | ✅ DONE | — | — | — | `getFailureLog()` din `degraded-mode.ts` — ultimele 500 erori cu timestamp, agent, tip |

---

## 5. CONFORMITATE & LEGAL

### 5.1 GDPR

| # | Element | Status | Prioritate | Owner | Efort | Note |
|---|---------|--------|-----------|-------|-------|------|
| 5.1.1 | Privacy Policy publicata pe site | ✅ DONE | — | — | — | `docs/privacy-policy-ro.md` — aprobata 02.04.2026 |
| 5.1.2 | Cookie Policy | ✅ DONE | — | — | — | `docs/cookie-policy-ro.md` exista |
| 5.1.3 | Terms of Service | ✅ DONE | — | — | — | `docs/terms-of-service-ro.md` exista |
| 5.1.4 | DPA template B2B (Data Processing Agreement) | ✅ DONE | — | — | — | Aprobat 02.04.2026 (din `project_gdpr_complete.md`) |
| 5.1.5 | Art.30 Registrul activitatilor de prelucrare (17 categorii) | ✅ DONE | — | — | — | Completat 02.04.2026 |
| 5.1.6 | TIA Anthropic (Transfer Impact Assessment) | ✅ DONE | — | — | — | Aprobat 02.04.2026 |
| 5.1.7 | Endpoint export date personale (Art.15 DSAR) | 🔄 IN PROGRESS | **P0** | Claude | 1 zi | `src/app/api/v1/b2c/my-data/route.ts` exista. BUILD-004: format JSON+PDF |
| 5.1.8 | Endpoint stergere cont (Art.17 Right to Erasure) | 🔄 IN PROGRESS | **P0** | Claude | 1 zi | `src/app/api/v1/b2c/account/route.ts` exista. BUILD-004: soft 30 zile + hard delete |
| 5.1.9 | Cron purge automat retenție | ✅ DONE | — | — | — | `src/lib/db/retention-policy.ts` — 10 reguli retenție, B2C hard delete, capacity monitoring |
| 5.1.10 | DPIA (Data Protection Impact Assessment) — Art.35 | ❌ TODO | **P0** | Claude + DPO | 1 sapt | Obligatorie: prelucrare risc ridicat (profilare, date sensibile). BUILD-005: draft AI + review DPO |
| 5.1.11 | Cookie consent banner (daca se folosesc cookies non-esentiale) | ⚠️ NEEDS DECISION | **P1** | Owner | — | NextAuth foloseste session cookies (esentiale = nu necesita consimtamant). Analytics cookies = necesita |
| 5.1.12 | Inregistrare ANSPDCP (daca obligatoriu) | ⚠️ NEEDS DECISION | **P1** | DPO | — | De verificat cu DPO daca mai este necesar post-GDPR |
| 5.1.13 | B2C pseudonim obligatoriu (privacy by design) | ✅ DONE | — | — | — | Confirmat din `project_gdpr_retention.md` — 2 straturi separate |

### 5.2 AI Act

| # | Element | Status | Prioritate | Owner | Efort | Note |
|---|---------|--------|-----------|-------|-------|------|
| 5.2.1 | Pagina `/transparenta-ai` publicata | ❌ TODO | **P0** | Claude + Jurist | 3 zile | BUILD-002 aprobat. Draft continut: `docs/transparenta-ai-content.md`. **Termen legal: 2 august 2026** |
| 5.2.2 | Documentare date training / surse cunoastere | ❌ TODO | **P1** | Claude | 2 zile | Art.13 AI Act: utilizatorii trebuie informati ce date foloseste AI-ul |
| 5.2.3 | Documentare supraveghere umana (Art.14) | ✅ DONE | — | — | — | `docs/procedura-supraveghere-umana-art14.md` exista. 2 psihologi acreditati CPR |
| 5.2.4 | Audit trail pe evaluari AI (pentru contestare) | ✅ DONE | — | — | — | Toate evaluarile au trail complet (agent, model, timestamp, input/output) |
| 5.2.5 | Sprint-uri saptamanale conformitate AI Act | ❌ TODO | **P1** | Claude + Jurist | Continuu | PROD-LEG-001 aprobat: echipa mixta + validare jurist |

### 5.3 Directiva EU 2023/970 (Transparenta Salariala)

| # | Element | Status | Prioritate | Owner | Efort | Note |
|---|---------|--------|-----------|-------|-------|------|
| 5.3.1 | Metodologie 6 criterii neutre de gen | ✅ DONE | — | — | — | Criteriile din `project_jobgrade_criteria.md` |
| 5.3.2 | Pay gap analysis raport conform | ✅ DONE | — | — | — | VUL-026: rapoarte exportabile, trail audit complet |
| 5.3.3 | Comunicare catre clienti B2B: **termen 7 iunie 2026** | ❌ TODO | **P1** | Owner | 1 zi | Clientii trebuie informati ca platforma ii ajuta la conformitate |

---

## 6. BUSINESS OPERATIONS

### 6.1 Plati & Facturare

| # | Element | Status | Prioritate | Owner | Efort | Note |
|---|---------|--------|-----------|-------|-------|------|
| 6.1.1 | Stripe live mode — chei configurate | ✅ DONE | — | — | — | `sk_live_*` si `pk_live_*` in `.env`. Webhook secret configurat |
| 6.1.2 | Stripe webhook endpoint functional | ✅ DONE | — | — | — | `src/app/api/v1/billing/webhook/route.ts` exista |
| 6.1.3 | Stripe checkout flow testat end-to-end (live) | ❌ TODO | **P0** | Owner | 2h | `src/app/api/v1/billing/checkout/route.ts` + `portal/route.ts` exista. Test cu card real |
| 6.1.4 | Stripe customer portal (self-service abonamente) | ✅ DONE | — | — | — | `src/app/api/v1/billing/portal/route.ts` |
| 6.1.5 | Stripe price IDs configurate (50/150/500 credite) | ✅ DONE | — | — | — | `STRIPE_PRICE_50_CREDITS`, `STRIPE_PRICE_150_CREDITS`, `STRIPE_PRICE_500_CREDITS` in `.env` |
| 6.1.6 | Integrare facturare oblio.eu | ❌ TODO | **P1** | Owner | 1 sapt | SRL platitoare TVA (CIF RO15790994). B2B fara TVA, B2C cu TVA inclus |
| 6.1.7 | Emitere facturi automate la plata Stripe | ❌ TODO | **P1** | Claude | 3 zile | Webhook Stripe → generare factura oblio.eu → email client |

### 6.2 Email

| # | Element | Status | Prioritate | Owner | Efort | Note |
|---|---------|--------|-----------|-------|-------|------|
| 6.2.1 | Resend API key configurat | ✅ DONE | — | — | — | `RESEND_API_KEY` in `.env`, `EMAIL_FROM=noreply@jobgrade.ro` |
| 6.2.2 | Domeniu `jobgrade.ro` verificat in Resend | ❌ TODO | **P0** | Owner | 30 min | SPF + DKIM records in DNS |
| 6.2.3 | Template-uri email tranzactionale (welcome, activare, resetare parola) | 🔄 IN PROGRESS | **P1** | Claude | 1 zi | `src/lib/email.ts` exista. Template comitet JE: `docs/template-email-comitet-je.md` |
| 6.2.4 | Template-uri email marketing (demo request, follow-up) | ❌ TODO | **P2** | Claude | 1 zi | `marketing-executor.ts` refera trimiterea de email-uri |

### 6.3 Procese Operationale

| # | Element | Status | Prioritate | Owner | Efort | Note |
|---|---------|--------|-----------|-------|-------|------|
| 6.3.1 | SLA definit pentru clienti B2B | ❌ TODO | **P1** | Owner | 1 zi | Minim: uptime 99.5%, raspuns suport 24h, escalare 4h |
| 6.3.2 | Proces suport clienti documentat | 🔄 IN PROGRESS | **P1** | Claude | 1 zi | `project_support_department.md`: 7 resurse AI, triaj automat, raspuns integrat |
| 6.3.3 | Onboarding B2B documentat pas cu pas | ❌ TODO | **P1** | Claude | 1 zi | Flux: demo → contract → setup tenant → import joburi → evaluare → raport |
| 6.3.4 | Incident Response Plan | ❌ TODO | **P0** | Claude + Owner | 1 zi | VUL-039: cine face ce, la ce interval, pe ce canale, escalare |
| 6.3.5 | Business Continuity Plan | ❌ TODO | **P1** | Owner | 1 zi | Ce se intampla daca Owner e indisponibil 48h? |
| 6.3.6 | Contract B2B template | ✅ DONE | — | — | — | `docs/contract-b2b-draft.md` exista |

---

## 7. CONTINUT & UX

| # | Element | Status | Prioritate | Owner | Efort | Note |
|---|---------|--------|-----------|-------|-------|------|
| 7.1 | Landing page B2B finalizata | ✅ DONE | — | — | — | `src/app/b2b/page.tsx` + `docs/landing-page-jobgrade.html` |
| 7.2 | Demo flow testat end-to-end | ❌ TODO | **P0** | Owner + Claude | 1 zi | Flux complet: landing → demo request → onboarding → evaluare → raport |
| 7.3 | Pagini responsive (mobile tested) | ❌ TODO | **P1** | Claude | 2 zile | Testare pe iPhone Safari, Android Chrome, tablet |
| 7.4 | Pagina 404 (Not Found) branded | ❌ TODO | **P1** | Claude | 2h | `src/app/not-found.tsx` NU exista. Next.js afiseaza pagina default |
| 7.5 | Pagina 500 (Error) branded | ❌ TODO | **P1** | Claude | 2h | `src/app/global-error.tsx` NU exista. Next.js afiseaza pagina default |
| 7.6 | Loading states pe toate paginile | ❌ TODO | **P2** | Claude | 1 zi | Verificare: skeleton loaders pe tabele, spinners pe actiuni |
| 7.7 | Empty states (nicio evaluare, niciun job) | ❌ TODO | **P2** | Claude | 1 zi | Mesaje prietenoase + CTA-uri cand datele lipsesc |
| 7.8 | Accesibilitate WCAG 2.1 AA | ❌ TODO | **P2** | Claude | 2 zile | Focus management, contrast, aria-labels, keyboard navigation |
| 7.9 | Compatibilitate browser: Chrome, Firefox, Safari, Edge | ❌ TODO | **P1** | Claude | 1 zi | Testare manuala pe ultimele 2 versiuni |
| 7.10 | Localizare RO + EN | 🔄 IN PROGRESS | **P1** | Claude | 3 zile | `next-intl@4.8.3` instalat. Verificare: toate string-urile sunt traduse |
| 7.11 | Favicon si meta tags (OG image, title, description) | ❌ TODO | **P1** | Claude | 2h | Favicon aprobat (spiral variabil) din `project_brand_assets.md` |

---

## 8. DATE & MIGRARE

| # | Element | Status | Prioritate | Owner | Efort | Note |
|---|---------|--------|-----------|-------|-------|------|
| 8.1 | Seed data productie: criterii evaluare | ❌ TODO | **P0** | Claude | 1h | 6 criterii fixe din `project_jobgrade_criteria.md` |
| 8.2 | Seed data productie: KB cold-start (96+ entries) | ❌ TODO | **P0** | Claude | 1h | `src/lib/kb/cold-start.ts` — Hawkins, metodologie, cunostinte comerciale |
| 8.3 | Seed data productie: benchmark salarii RO | ❌ TODO | **P1** | Owner | 2h | Date de la surse externe (Paywell, Mercer, etc.) |
| 8.4 | Seed data productie: definitii agenti (34 agenti) | ❌ TODO | **P0** | Claude | 1h | System prompts, roluri, ierarhie din `project_agents_detail.md` |
| 8.5 | Procedura backup DB documentata | ❌ TODO | **P0** | Claude | 2h | Neon PITR + export manual periodic (pg_dump) |
| 8.6 | Procedura restore DB testata | ❌ TODO | **P0** | Claude + Owner | 2h | Restaurare din PITR Neon + import pg_dump |
| 8.7 | Migration scripts testate pe DB gol | ❌ TODO | **P0** | Claude | 1h | `prisma migrate deploy` pe baza de date productie goala |
| 8.8 | Rollback scripts (revert ultima migrare) | ❌ TODO | **P1** | Claude | 2h | `prisma migrate resolve` + script SQL manual pentru edge cases |

---

## 9. TESTARE

| # | Element | Status | Prioritate | Owner | Efort | Note |
|---|---------|--------|-----------|-------|-------|------|
| 9.1 | Unit tests: module critice | 🔄 IN PROGRESS | **P1** | Claude | 3 zile | Existente: 8 fisiere test (`__tests__/` in `src/lib/agents/` si `src/lib/disfunctions/`). Lipsa: security modules, budget-cap, retention |
| 9.2 | Integration tests: API endpoints B2B | ❌ TODO | **P1** | Claude | 3 zile | Jobs CRUD, evaluation flow, team management, billing |
| 9.3 | E2E tests: flux complet utilizator | 🔄 IN PROGRESS | **P1** | Claude | 2 zile | `tests/e2e/smoke.spec.ts` exista (Playwright). De extins: register → create job → evaluate → raport |
| 9.4 | Security tests: OWASP Top 10 | ❌ TODO | **P1** | External | 2 zile | OWASP ZAP scan automat + verificare manuala |
| 9.5 | Performance tests: load testing | ❌ TODO | **P2** | Claude | 1 zi | k6 script pe endpoint-uri critice |
| 9.6 | Accessibility tests (axe-core) | ❌ TODO | **P2** | Claude | 1 zi | `@axe-core/playwright` pentru testare automata |
| 9.7 | Cross-browser tests | ❌ TODO | **P2** | Claude | 1 zi | Playwright multi-browser: chromium, firefox, webkit |

---

## 10. DOCUMENTATIE

| # | Element | Status | Prioritate | Owner | Efort | Note |
|---|---------|--------|-----------|-------|-------|------|
| 10.1 | Documentatie API (Swagger / OpenAPI) | ❌ TODO | **P2** | Claude | 2 zile | Toate rutele din `src/app/api/` documentate |
| 10.2 | Ghid utilizator B2B (cum evaluezi, cum generezi rapoarte) | ❌ TODO | **P1** | Claude | 2 zile | `docs/procesul-complet-job-evaluation.md` exista ca baza |
| 10.3 | Ghid admin (setup tenant, import date, gestionare useri) | ❌ TODO | **P2** | Claude | 1 zi | |
| 10.4 | Developer onboarding guide | ❌ TODO | **P3** | Claude | 1 zi | Cum rulezi local, structura proiect, conventii |
| 10.5 | Runbook incidente (cum rezolvi probleme frecvente) | ❌ TODO | **P1** | Claude | 1 zi | DB down, Claude API down, Stripe webhook fail, etc. |
| 10.6 | Architecture Decision Records (ADR) | 🔄 IN PROGRESS | **P3** | Claude | Continuu | `docs/owner-decisions-report.md` serveste partial acest rol |
| 10.7 | Metodologie evaluare joburi (pentru clienti) | ✅ DONE | — | — | — | `docs/metodologie-job-evaluation.txt` + `docs/procesul-complet-job-evaluation.md` |
| 10.8 | Manual angajat + angajator | ✅ DONE | — | — | — | `docs/manual-angajat.md` + `docs/manual-angajator.md` |
| 10.9 | Business plan | ✅ DONE | — | — | — | `docs/business-plan-v0.md` |
| 10.10 | Sales materials (pitch deck, one-pager) | ✅ DONE | — | — | — | `docs/sales-pitch-deck-b2b.md` + `docs/sales-one-pager-b2b.md` |

---

## 11. PLANURI DE CONTINGENTA

| # | Scenariu | Plan existent | Prioritate | Owner | Efort | Note |
|---|---------|--------------|-----------|-------|-------|------|
| 11.1 | **Anthropic API down >1h** | ✅ PARTIAL | **P0** | — | — | `degraded-mode.ts`: circuit breaker (3 fail → skip 5 min), mesaje degradate per agent, cache comercial 24h. **Lipseste:** notificare automata Owner, pagina status client |
| 11.2 | **Anthropic API down >24h** | ❌ TODO | **P1** | Owner | 1 zi | BUILD-003: mod degradat acum, fallback provider post-lansare. De documentat: ce functioneaza, ce nu, comunicare clienti |
| 11.3 | **Neon DB data loss** | ❌ TODO | **P0** | Owner | 2h | Plan: (1) Neon PITR restore, (2) pg_dump backup periodic, (3) comunicare clienti. De testat restaurarea |
| 11.4 | **Vercel outage extins** | ❌ TODO | **P1** | Owner | 2h | Optiuni: (1) asteptare (Vercel SLA 99.99%), (2) DNS switch la alt provider cu build static. De documentat |
| 11.5 | **Keycloak compromis** | ❌ TODO | **P1** | Owner | 1 zi | Plan: (1) invalidare toate sesiunile, (2) rotare secrete, (3) audit access logs, (4) comunicare clienti |
| 11.6 | **Breach securitate detectat** | ❌ TODO | **P0** | Owner + DPO | 1 zi | GDPR Art.33: notificare ANSPDCP in 72h. Art.34: notificare persoane afectate. De creat: template-uri notificare, lista contacte, procedura pas cu pas |
| 11.7 | **Client cere stergere urgenta date (DSAR)** | 🔄 IN PROGRESS | **P0** | Claude | — | `retention-policy.ts` suporta B2C hard delete. Endpoint `/api/v1/b2c/account` exista. De documentat procedura manuala pentru cereri B2B |
| 11.8 | **Costuri depasesc bugetul cu 2x** | ✅ DONE | — | — | — | `budget-cap.ts`: alerte la 70%/90%, blocare la 100%. Tier-uri diferentiate FREE/STARTER/PROFESSIONAL/ENTERPRISE |
| 11.9 | **Costuri depasesc bugetul cu 5x** | ❌ TODO | **P1** | Owner | 2h | Plan: (1) kill switch global API Claude, (2) mod degradat fortat, (3) investigare cauza (abuse? bug?), (4) comunicare clienti |
| 11.10 | **Owner indisponibil >48h** | ❌ TODO | **P2** | Owner | 1h | De documentat: cine are acces la ce, proceduri de urgenta, contact backup |

---

## SUMAR EXECUTIV

### Statistici

| Categorie | Total | ✅ DONE | 🔄 IN PROGRESS | ❌ TODO | ⚠️ NEEDS DECISION |
|-----------|-------|---------|----------------|--------|-------------------|
| 1. Infrastructura | 22 | 3 | 0 | 15 | 4 |
| 2. Securitate | 23 | 13 | 3 | 7 | 0 |
| 3. Performanta | 9 | 1 | 0 | 8 | 0 |
| 4. Monitorizare | 10 | 2 | 2 | 6 | 0 |
| 5. Conformitate | 16 | 9 | 2 | 3 | 2 |
| 6. Business Ops | 13 | 4 | 2 | 7 | 0 |
| 7. Continut & UX | 11 | 1 | 1 | 9 | 0 |
| 8. Date & Migrare | 8 | 0 | 0 | 8 | 0 |
| 9. Testare | 7 | 0 | 2 | 5 | 0 |
| 10. Documentatie | 10 | 5 | 2 | 3 | 0 |
| 11. Contingenta | 10 | 1 | 2 | 7 | 0 |
| **TOTAL** | **139** | **39 (28%)** | **16 (12%)** | **78 (56%)** | **6 (4%)** |

### Blockeri P0 (GO / NO-GO)

Platforma **NU se lanseaza** fara aceste elemente:

| # | Element | Ref | Status | Efort estimat |
|---|---------|-----|--------|--------------|
| 1 | Repo GitHub + Vercel deployment + domeniu | 1.1.1-1.1.4 | ❌ | 2h |
| 2 | Variabile de mediu migrate in Vercel (encrypted) | 1.2.1-1.2.2 | ❌ | 1.5h |
| 3 | DB productie Neon + migrare schema + seed | 1.3.1-1.3.6 | ❌ | 4h |
| 4 | Rotare TOATE secretele | 2.2.1 | ❌ | 2h |
| 5 | CORS + CSRF: doar domeniu productie | 2.2.2-2.2.3 | ❌ | 30 min |
| 6 | Eliminare `X-Robots-Tag: noindex` | 1.1.5 | ❌ | 5 min |
| 7 | URL-uri productie in config (AUTH_URL, APP_URL) | 1.1.6-1.1.7 | ❌ | 10 min |
| 8 | DPIA semnata de DPO | 5.1.10 | ❌ | 1 sapt |
| 9 | Endpoint-uri GDPR (export + stergere) complete | 5.1.7-5.1.8 | 🔄 | 2 zile |
| 10 | Sentry error tracking integrat | 4.1 | 🔄 | 2h |
| 11 | Incident Response Plan | 6.3.4 | ❌ | 1 zi |
| 12 | Stripe checkout testat live | 6.1.3 | ❌ | 2h |
| 13 | Demo flow testat end-to-end | 7.2 | ❌ | 1 zi |
| 14 | Backup DB procedura testata | 8.5-8.7 | ❌ | 3h |
| 15 | Plan breach securitate (GDPR 72h) | 11.6 | ❌ | 1 zi |
| 16 | Decizie Keycloak productie | 1.5.1 | ⚠️ | Decizie |

**Efort total estimat blockeri P0: ~3-4 saptamani lucru** (Claude + Owner + DPO)

### ⚠️ ATENȚIE INFRASTRUCTURĂ — VERIFICĂRI OBLIGATORII LA DEPLOY

**Înainte de orice deploy producție, verifică `infra/docker-compose.yml`:**

| Item | Verificare | De ce |
|---|---|---|
| **APP_URL n8n** | Trebuie să fie portul corect (`:3000` în dev, URL producție în prod) | 10.04.2026: era `:3001` greșit, toate workflow-urile eșuau cu ECONNREFUSED → zero cicluri management 4+ zile |
| **JOBGRADE_API_URL n8n** | Idem | Idem |
| **INTERNAL_API_KEY** | NU comit cheia reală — folosește Vercel Env Vars în producție | Securitate (BUILD-001) |
| **Servicii eliminate** | Verifică să nu mai existe în producție: `keycloak`, `remediation-runner`, `localstack` | Nu funcționează în Vercel serverless |
| **n8n migrat la Hetzner** | Self-hosted VPS (~€4.85/lună), nu n8n Cloud (limită exec) | Procedură: vezi `project_production_readiness.md` |

**Verificare rapidă:**
```bash
# Verifică ce port folosește n8n
docker exec jobgrade_n8n env | grep "APP_URL\|JOBGRADE_API_URL"
# Verifică că workflow-urile rulează cu succes (nu eșec masiv)
docker exec jobgrade_postgres psql -U postgres -d n8n_dev -c \
  "SELECT name, COUNT(*) FILTER (WHERE status='success') AS ok, COUNT(*) FILTER (WHERE status='error') AS err FROM execution_entity e JOIN workflow_entity w ON e.\"workflowId\"=w.id WHERE \"startedAt\" > NOW() - INTERVAL '1 hour' GROUP BY name;"
```

---

### Decizii Owner — APROBATE 09.04.2026

| # | Decizie | Rezultat |
|---|---------|----------|
| 1 | Keycloak in productie? | **ELIMINAT** — rămânem pe NextAuth. Keycloak se adaugă doar la cerere Enterprise SSO/LDAP |
| 2 | n8n in productie? | **n8n Cloud** (~20 EUR/lună) |
| 3 | Subdomenii? | **NU** — un singur domeniu jobgrade.ro |
| 4 | ntfy? | **Email Resend principal + ntfy backup urgent** |
| 5 | Cookie consent? | **NU** — fără cookies non-esențiale, Vercel Analytics server-side |
| 6 | ANSPDCP? | Verificare cu DPO la review DPIA |

### Alte decizii 09.04.2026
- Vercel: un singur proiect (`jobgrade-v2` cu `jobgrade.ro`), `jobgrade-app` șters
- UptimeRobot: configurat, interval 5 min ✅
- Resend SPF/DKIM: verified ✅
- Pentest: OWASP ZAP acum + extern (Bit Sentinel) la 60 zile post-lansare
- DDoS: Cloudflare DNS proxy
- Rate limiting: calibrare la 30 zile date reale
- Rotare chei: trimestrial
- Alertare preventivă: 70% pe TOȚI furnizorii externi (regulă universală)
- Single point of failure Owner: risc acceptat la lansare, backup uman la 20+ clienți
- Oblio.eu: în derulare, nu blocker lansare (facturare manuală la primii clienți)

---

## TIMELINE RECOMANDATA

### Saptamana 1-2: Fundatie
- [x] Creare repo GitHub + push cod
- [x] Creare proiect Vercel + linkare repo
- [x] Configurare domeniu `jobgrade.ro`
- [x] Creare DB Neon productie + migrare schema
- [x] Migrare variabile mediu in Vercel
- [x] Decizie Keycloak + n8n productie

### Saptamana 3: Securitate
- [x] Rotare toate secretele
- [x] CORS/CSRF doar domeniul productie
- [x] Integrare Sentry
- [x] Penetration testing basic (OWASP ZAP)
- [x] npm audit + fix vulnerabilitati

### Saptamana 4: Legal & Conformitate
- [x] DPIA draft + review DPO
- [x] Endpoint-uri GDPR finalizate
- [x] Incident Response Plan
- [x] Plan breach securitate

### Saptamana 5: Testare & Polish
- [x] E2E tests extinse
- [x] Pagini 404/500 branded
- [x] Mobile responsive testing
- [x] Stripe checkout test live
- [x] Demo flow complet

### Saptamana 6: Soft Launch
- [x] Seed data productie
- [x] Deploy productie
- [x] Uptime monitoring activat
- [x] Backup DB testat
- [x] Primii utilizatori interni (dogfooding)

---

---

## CE RĂMÂNE DE FĂCUT — DOAR OWNER

Acțiuni care necesită exclusiv intervenția Owner (nu pot fi delegate la Claude):

| # | Acțiune | Efort | Când | Detalii |
|---|---------|-------|------|---------|
| 1 | **Oblio.eu** — creare cont + API key | 1h | Pre-lansare | Facturare automată Stripe → oblio |
| 2 | **Stripe checkout test live** — o plată reală cu card | 30 min | Pre-lansare | Verificare flux complet: plată → credite → factură |
| 3 | **n8n Cloud** — creare cont + migrare workflows | 2h | Pre-lansare | Export din Docker local, import în n8n Cloud |
| 4 | **Cloudflare** — activare DNS proxy | 30 min | Pre-lansare | Cont gratuit, setare DNS proxy pe jobgrade.ro |
| 5 | **Neon producție** — creare proiect nou | 15 min | La deploy | Proiect separat de dev |
| 6 | **Rotare chei** — generare chei noi la toți furnizorii | 2h | La deploy | Anthropic, Stripe, Google, LinkedIn, ElevenLabs, Resend |
| 7 | **Demo flow** — testare end-to-end ca și client | 2h | Pre-lansare | Landing → demo request → onboarding → evaluare → raport |
| 8 | **DPO review** — trimitere DPIA draft pentru validare | 30 min | Pre-lansare | Draft generat de Claude, DPO validează |
| 9 | **Jurist validare** — transparență AI + breach templates | 30 min | Pre-lansare | Documente generate, jurist verifică |
| 10 | **Benchmark salarii** — date de la surse externe | 2h | Pre-lansare | Paywell, date INS, piață RO |
| 11 | **Backup uman** — identificare persoană de backup | — | La 20+ clienți | Acces limitat la Vercel/Neon pentru urgențe |

**Efort total Owner: ~12h** distribuite pe 6 săptămâni.

---

## CE FACE CLAUDE (fără intervenție Owner)

| Categorie | Items | Efort estimat |
|---|---|---|
| Pagini 404/500 + loading states + empty states | 4 items | 1 zi |
| DPIA draft + Incident Response Plan + breach templates | 3 items | 2 zile |
| Sentry integrare | 1 item | 2h |
| Seed data producție (criterii, KB, agenți) | 3 items | 3h |
| Teste (unit, integration, E2E, OWASP ZAP) | 5 items | 5 zile |
| Documentație (ghid utilizator, runbook, API docs) | 4 items | 3 zile |
| Planuri contingență (documentare) | 5 items | 2 zile |
| Onboarding B2B ghid | 1 item | 1 zi |
| Templates email | 2 items | 1 zi |
| Optimizări (bundle, imagini, indexuri DB, connection pooling) | 5 items | 2 zile |
| **Total** | **33 items** | **~18 zile lucru** |

---

*Document viu — se actualizează la fiecare progres. Ultima actualizare: 09.04.2026*
