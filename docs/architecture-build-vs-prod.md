# ARHITECTURA JOBGRADE — Raport Comparativ Build vs Producție

**Data:** 23.04.2026
**Scop:** Înțelegere comună Owner + COA asupra sistemului complet

---

## 1. VEDERE DE ANSAMBLU

```
┌─────────────────────────────────────────────────────────────┐
│                    UTILIZATORI (Browser)                     │
│        Client B2B    │    Owner    │    Client B2C           │
└──────────┬───────────┴──────┬──────┴───────────┬─────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (Cloud)                            │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────┐  │
│  │ Next.js App │  │ 192 API      │  │ Cron Jobs (3)      │  │
│  │ (frontend)  │  │ Routes       │  │ executor / signals │  │
│  │ SSR + RSC   │  │ /api/v1/*    │  │ / retry            │  │
│  └──────┬──────┘  └──────┬───────┘  └────────┬───────────┘  │
│         │                │                   │               │
│         └────────────────┼───────────────────┘               │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │
           ┌───────────────┼───────────────────┐
           │               │                   │
           ▼               ▼                   ▼
    ┌──────────┐    ┌──────────┐       ┌──────────────┐
    │ Neon DB  │    │ Anthropic│       │ Alte servicii │
    │ Postgres │    │ Claude   │       │ Stripe       │
    │ 107      │    │ Sonnet/  │       │ Resend       │
    │ modele   │    │ Haiku    │       │ ElevenLabs   │
    └──────────┘    └──────────┘       │ Sentry       │
                                       │ ANAF (public)│
                                       └──────────────┘
```

---

## 2. COMPONENTE — BUILD (Local) vs PRODUCȚIE (Cloud)

### A. Nucleul aplicației

| Componentă | BUILD (Local) | PRODUCȚIE (Cloud) | Diferențe |
|-----------|---------------|-------------------|-----------|
| **Next.js App** | `npm run dev` pe localhost:3000 | Vercel Functions (Frankfurt) | Dev: hot reload. Prod: cold start ~200ms |
| **Baza de date** | Neon `ep-odd-water` (dev) | Neon `ep-divine-union` (prod) | **DB-uri SEPARATE.** Date diferite! |
| **Prisma ORM** | `prisma generate` local | `prisma generate` la build Vercel | Același client generat |
| **Redis cache** | Docker local (port 6379) | Upstash Redis (cloud) | Local: fără persistență. Prod: persistent |
| **Auth** | NextAuth v5, sesiune locală | NextAuth v5, sesiune prod | Aceleași secrete (NEXTAUTH_SECRET) |

### B. Servicii externe (identice Build și Producție)

| Serviciu | Furnizor | Locație | Ce face | Cum comunică |
|----------|----------|---------|---------|-------------|
| **AI (LLM)** | Anthropic | Cloud (US/EU) | Generare text, evaluare, chat | HTTPS API, key ANTHROPIC_API_KEY |
| **Plăți** | Stripe | Cloud | Checkout, subscriptions, webhook | HTTPS API + webhook → /api/v1/billing/webhook |
| **Email** | Resend | Cloud | Notificări, invitații | HTTPS API, key RESEND_API_KEY |
| **Voce** | ElevenLabs | Cloud (EU) | Agenți conversaționali voice | WebSocket + webhook → /api/v1/voice/completions |
| **Monitoring** | Sentry | Cloud (DE) | Error tracking | SDK client+server, DSN |
| **ANAF** | Guvern RO | Cloud | Lookup CUI companie | HTTPS API public, fără key |

### C. Componente DOAR locale (nu există în producție)

| Componentă | Docker | Port | Scop | De ce nu e în prod |
|-----------|--------|------|------|-------------------|
| **n8n** | Da | 5678 | Workflow-uri automate organism | Înlocuit de GitHub Actions cron |
| **Keycloak** | Da | 8081 | Identity management (dev) | NextAuth face totul în prod |
| **ntfy** | Da | 8082 | Notificări push Owner | ntfy.sh gratuit în prod |
| **LocalStack** | Da | 4566 | Mock AWS (KMS, S3, Secrets) | Nu folosim AWS în prod |
| **Remediation Runner** | Da | 8088 | Restart containere | Nu e nevoie în prod (Vercel managed) |

### D. Componente DOAR în producție

| Componentă | Furnizor | Ce face |
|-----------|----------|---------|
| **GitHub Actions** | GitHub | Cron organism (la 2h), vital-signs (zilnic) |
| **Vercel Cron** | Vercel | Backup cron: executor/signals/retry |
| **Vercel Edge Network** | Vercel | CDN, SSL, DDoS protection |
| **Neon Pooler** | Neon | Connection pooling DB |

---

## 3. FLUXURI DE COMUNICARE

### A. Client B2B → Platformă (request tipic)

```
Browser → Vercel CDN → Next.js SSR
  → Auth check (NextAuth, sesiune cookie)
  → Prisma query → Neon DB (Frankfurt)
  → [dacă AI] → Anthropic Claude (Sonnet/Haiku)
  → [dacă plată] → Stripe API
  → Response → Browser
```

### B. Organism autonom (background)

```
GitHub Actions (cron la 2h, L-V 08-22 EET)
  → HTTPS POST /api/cron/executor (cu CRON_SECRET)
    → Citește tasks din DB (agent_tasks)
    → Pentru fiecare task:
      → Cost gate (alege model AI)
      → KB lookup (kb_entries)
      → Anthropic Claude call
      → Salvează rezultat în DB
      → Learning funnel (distilare)
  → POST /api/cron/signals
    → Detectare disfuncții
  → POST /api/v1/agents/metrics/collect
    → Agregare metrici
```

### C. Plată (checkout flow)

```
Browser → POST /api/v1/billing/checkout
  → Stripe.checkout.sessions.create()
  → Redirect → Stripe hosted page
  → Client plătește
  → Stripe → POST /api/v1/billing/webhook (webhook secret)
    → Verificare semnătură
    → Creditare cont (CreditTransaction)
    → Activare serviciu (ServicePurchase)
```

### D. Chat cu agent AI

```
Browser → POST /api/v1/agents/hr-counselor/chat
  → Prompt injection check
  → Escalation detection (regex)
  → Budget cap check ($0.015/mesaj)
  → Boundary guard
  → KB injection (3-5 entries relevante)
  → Company Profiler context
  → Commercial knowledge injection
  → Anthropic Claude call (Sonnet, max_tokens 1500)
  → Shadow observer (async, non-blocking)
  → Save message (ConversationThread + ConversationMessage)
  → Record API usage
  → Response → Browser
```

---

## 4. BAZA DE DATE — Structura pe domenii

### 107 modele Prisma organizate pe domenii:

| Domeniu | Modele cheie | Nr. | Scop |
|---------|-------------|-----|------|
| **Multi-tenant** | Tenant, User, Business | ~5 | Izolarea datelor per client |
| **Evaluare posturi** | EvaluationSession, SessionJob, JobAssignment, Vote, Criterion, Subfactor, JobResult | ~12 | Core business — 6 criterii, consens |
| **Posturi** | Job, Department, CompanyProfile | ~5 | Structură organizațională client |
| **Salarizare** | SalaryGrade, PayrollEntry, CompensationPackage | ~5 | Structură salarială + pay gap |
| **Pay Gap** | PayGapReport, JointPayAssessment, EmployeeRequest | ~4 | Conformitate EU 2023/970 |
| **Billing** | ServicePurchase, CreditTransaction, CreditBalance | ~4 | Plăți Stripe + credite |
| **AI & Chat** | ConversationThread, ConversationMessage, AiGeneration, ClientMemory | ~6 | Istoricul conversațiilor + insight-uri |
| **Organism** | AgentDefinition, AgentRelationship, AgentTask, KBEntry, LearningArtifact | ~15 | 45 agenți + KB + learning |
| **Monitorizare** | ExecutionTelemetry, DisfunctionEvent, BoundaryViolation, Escalation | ~10 | Sănătate organism |
| **Pricing** | ProviderCost, AIOperationTier, CreditValue, ServiceUsageLog | ~5 | Cost tracking + plase siguranță |
| **Homeostasis** | HomeostaticTarget, BehaviorPatch, WildCard, Ritual | ~8 | Auto-reglare organism |
| **Obiective** | OrganizationalObjective, StrategicTheme, ServiceOutcome | ~5 | Direcție strategică |
| **B2C** | B2CUser, B2CProfile, OnboardingState | ~5 | Modul B2C (viitor) |
| **Notificări** | Notification (cu requestKind, responseKind) | ~2 | OwnerInbox structurat |
| **Altele** | Report, Simulation, BudgetLine, SystemConfig | ~16 | Diverse |

---

## 5. SECURITATE

| Strat | Implementare | Fișier |
|-------|-------------|--------|
| **Autentificare** | NextAuth v5 (Credentials + Google + LinkedIn) | src/lib/auth.ts |
| **Autorizare** | Roluri: SUPER_ADMIN, OWNER, COMPANY_ADMIN, FACILITATOR, REPRESENTATIVE | Per route |
| **CSRF** | Token verificat pe mutații | src/lib/security/csrf-guard.ts |
| **Prompt injection** | Filtru pe input chat | src/lib/security/prompt-injection-filter.ts |
| **Upload** | Magic bytes, MIME, dimensiune 10MB | src/lib/security/upload-validator.ts |
| **Rate limiting** | Budget cap per tenant + Upstash Redis | src/lib/ai/budget-cap.ts |
| **Boundary guard** | Reguli per agent (ce poate/nu poate) | src/lib/agents/boundary-guard.ts |
| **Escalation** | Detectare conflict/legal → blocare + notificare | src/lib/security/escalation-detector.ts |
| **Internal API** | Header x-internal-key pe cron/KB/monitoring | Per route |
| **Webhook** | Semnătură Stripe verificată | src/app/api/v1/billing/webhook |

---

## 6. CE VEDE COA (Director Operațional)

### Acces direct necesar la:

| Resursă | Unde | Cum accesează |
|---------|------|---------------|
| Cod sursă | GitHub repo | Citire directă |
| Schema DB | prisma/schema.prisma (107 modele) | Citire fișier |
| Configurare Vercel | Vercel dashboard | Deployment, env vars, logs |
| Configurare Neon | Neon console | DB queries, branching |
| Configurare Stripe | Stripe dashboard | Pachete, prețuri, webhook |
| Configurare GitHub Actions | .github/workflows/*.yml | Cron schedule, secrets |
| Logs aplicație | Vercel logs (runtime) | Erori, performanță |
| Sentry | Sentry dashboard | Erori detaliate |
| Metrici organism | /owner/reports/agents | Evoluție, KB, tasks |

---

## 7. DIFERENȚE CRITICE BUILD vs PRODUCȚIE

| Aspect | Build (Local) | Producție |
|--------|--------------|-----------|
| **DB** | ep-odd-water (dev) | ep-divine-union (prod) — **DATE DIFERITE** |
| **Cron** | n8n Docker local | GitHub Actions + Vercel Cron |
| **Identity** | Keycloak (opțional) | NextAuth direct |
| **Notificări** | ntfy Docker local | ntfy.sh cloud |
| **AWS** | LocalStack mock | Nu se folosește |
| **Container mgmt** | Remediation Runner | Vercel managed (nu e nevoie) |
| **Cache** | Redis Docker local | Upstash Redis cloud |
| **SSL/CDN** | Fără | Vercel Edge Network |
| **Deployment** | `npm run dev` | `git push` → Vercel auto-deploy |
| **Schema sync** | `prisma db push` pe dev | `prisma db push` manual pe prod |

**ATENȚIE:** Schema DB trebuie sincronizată manual pe prod (`prisma db push` cu DATABASE_URL prod). Nu se face automat la deploy!

---

*Document de referință pentru COA. Se actualizează la fiecare schimbare de infrastructură.*
