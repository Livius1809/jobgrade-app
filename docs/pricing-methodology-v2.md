# METODOLOGIE PRICING — JobGrade Platform
## Document de referință pentru toate serviciile actuale și viitoare

**Data:** 22.04.2026
**Elaborat de:** Claude (tehnic) + COG (operațional)
**Aprobat de:** Owner — PENDING
**Destinatari:** Marketing (strategie), COG (operațional), DMA (date)
**Versiune:** 2.0 (înlocuiește pricing-strategy-guide.md)

---

> **Metodologia:** Inventar servicii → Consum resurse real → Cost real → Plasa 1 (worst-case) → Plasa 2 (valutar) → Verificare marjă → Categorii pachete
>
> **Structura costurilor:**
> - **CAPEX** (costuri fixe lunare: infra, organism) → acoperit de **abonament** (399 RON/lună)
> - **OPEX** (costuri variabile per serviciu) → acoperit de **credite** (1 credit = 8 RON preț vânzare)
> - **Marja** = (preț credit - cost real acoperitor per credit) / preț credit × 100%

---

# 1. INVENTAR COMPLET SERVICII CLIENT B2B

## 1.1 Servicii cu consum AI (facturabile prin credite)

| Cod | Serviciu | Rută API | Model AI real | Unitate de consum |
|-----|----------|----------|---------------|-------------------|
| S-01 | Generare fișă de post AI | `/api/v1/ai/job-description` | Sonnet | Per poziție |
| S-02 | Generare anunț recrutare | `/api/v1/ai/job-ad` | Sonnet | Per poziție × platformă |
| S-03 | Generare fișă KPI | `/api/v1/ai/kpi-sheet` | Sonnet | Per poziție |
| S-04 | Verificare relevanță (timp real) | `/api/v1/ai/relevance-check` | Haiku | Per verificare (debounced) |
| S-05 | Extragere MVV din website/CAEN | `/api/v1/ai/company-extract` | Sonnet | Per companie |
| S-06 | Upload fișă PDF/Word → structurare | `/api/v1/jobs/upload-description` | Sonnet | Per fișier |
| S-07 | Import stat funcții (XLSX/PDF/PNG) | `/api/v1/jobs/import-stat-functii` | Sonnet + Vision (imagini) | Per fișier |
| S-08 | Evaluare automată AI (JE AUTO) | `/api/v1/sessions/auto-evaluate` | Sonnet | Per poziție din sesiune |
| S-09 | Analiză post-evaluare | `/api/v1/ai/session-analysis` | Sonnet | Per sesiune |
| S-10 | Chat SOA (vânzări) | `/api/v1/agents/soa/chat` | Sonnet | Per mesaj |
| S-11 | Chat HR Counselor | `/api/v1/agents/hr-counselor/chat` | Sonnet | Per mesaj |
| S-12 | Chat CSA (suport) | `/api/v1/agents/csa/chat` | Sonnet | Per mesaj |
| S-13 | Chat CSSA (suport senior) | `/api/v1/agents/cssa/chat` | Sonnet | Per mesaj |

## 1.2 Servicii fără consum AI (incluse în abonament sau gratuite)

| Cod | Serviciu | Rută API | Resurse | Unitate |
|-----|----------|----------|---------|---------|
| F-01 | Creare/editare posturi | `/api/v1/jobs` | DB write | Per poziție |
| F-02 | Import posturi din Excel | `/api/v1/jobs/import` | DB write + ExcelJS | Per fișier |
| F-03 | Import stat salarii | `/api/v1/payroll/import` | DB write + ExcelJS | Per fișier |
| F-04 | Creare sesiune evaluare | `/api/v1/sessions` POST | DB write | Per sesiune |
| F-05 | Scorare individuală (comisie) | `/api/v1/sessions/[id]/jobs/[jid]/evaluate` | DB write | Per criteriu × evaluator |
| F-06 | Consens: vot | `/api/v1/sessions/[id]/consensus/[jid]/vote` | DB write | Per criteriu × evaluator |
| F-07 | Consens: recalibrare | `/api/v1/sessions/[id]/consensus/[jid]/recalibrate` | DB logic | Per rundă |
| F-08 | Consens: decizie | `/api/v1/sessions/[id]/consensus/[jid]/decide` | DB logic | Per criteriu |
| F-09 | JE Process Engine (toate acțiunile) | `/api/v1/sessions/[id]/je-process` | DB logic complexă | Per acțiune |
| F-10 | Finalizare sesiune | `/api/v1/sessions/[id]/complete` | DB finalizare | Per sesiune |
| F-11 | Dashboard pay gap | `/api/v1/pay-gap/dashboard` | DB read + calcul indicatori | Per interogare |
| F-12 | Raport pay gap | `/api/v1/pay-gap/report` | DB read + calcul complex | Per an |
| F-13 | Export PDF | `/api/v1/sessions/[id]/export/pdf` | PDF gen lib | Per export |
| F-14 | Export Excel | `/api/v1/sessions/[id]/export/excel` | Excel gen lib | Per export |
| F-15 | Export JSON/XML | `/api/v1/sessions/[id]/export/json|xml` | Serializare | Per export |
| F-16 | Profil companie (CRUD) | `/api/v1/company` | DB read/write | Per request |
| F-17 | Company Profiler (maturitate) | `/api/v1/company/maturity` | Engine in-memory + DB | Per request |
| F-18 | Billing checkout | `/api/v1/billing/checkout` | Stripe API | Per tranzacție |
| F-19 | Jurnal activități | `/api/v1/billing/log-activity` | DB write | Per activitate |
| F-20 | Account export/import/reset | `/api/v1/account/*` | DB + crypto (portabilitate) | Per operație |

---

# 2. CONSUM RESURSE REAL PER SERVICIU

## 2.1 Prețuri resurse (aprilie 2026)

| Resursă | Preț real | Unitate | Sursă |
|---------|-----------|---------|-------|
| Claude Sonnet input | $3.00 | per 1M tokeni | anthropic.com/pricing |
| Claude Sonnet output | $15.00 | per 1M tokeni | anthropic.com/pricing |
| Claude Haiku input | $0.80 | per 1M tokeni | anthropic.com/pricing |
| Claude Haiku output | $4.00 | per 1M tokeni | anthropic.com/pricing |
| Claude Opus 4.6 input | $15.00 | per 1M tokeni | anthropic.com/pricing |
| Claude Opus 4.6 output | $75.00 | per 1M tokeni | anthropic.com/pricing |
| Claude Vision (imagine) | ~$0.02-0.05 | per imagine | incl. în tokeni input |
| Vercel compute | $0.18 | per 1M invocări | vercel.com/pricing |
| Neon DB (storage) | $0.75 | per GiB/lună | neon.tech/pricing |
| Neon DB (compute) | $0.16 | per compute-hour | neon.tech/pricing |
| Stripe comision | 1.5% + €0.25 | per tranzacție | stripe.com/pricing/ro |

## 2.2 Consum detaliat per serviciu AI

| Cod | Serviciu | Input tokeni | Output tokeni | Model | Cost real/unitate | Calcul |
|-----|----------|-------------|---------------|-------|-------------------|--------|
| S-01 | Fișă de post AI | ~8.000 | ~3.000 | Sonnet | **$0.069** | 8K×$3/1M + 3K×$15/1M |
| S-02 | Anunț recrutare | ~6.000 | ~1.500 | Sonnet | **$0.041** | 6K×$3/1M + 1.5K×$15/1M |
| S-03 | Fișă KPI | ~7.000 | ~2.500 | Sonnet | **$0.059** | 7K×$3/1M + 2.5K×$15/1M |
| S-04 | Relevanță (real-time) | ~3.000 | ~400 | Haiku | **$0.004** | 3K×$0.8/1M + 0.4K×$4/1M |
| S-05 | Extragere MVV | ~5.000 | ~600 | Sonnet | **$0.024** | 5K×$3/1M + 0.6K×$15/1M |
| S-06 | Upload fișă structurare | ~6.000 | ~2.000 | Sonnet | **$0.048** | 6K×$3/1M + 2K×$15/1M |
| S-07a | Import stat funcții (XLSX/PDF) | ~8.000 | ~4.000 | Sonnet | **$0.084** | 8K×$3/1M + 4K×$15/1M |
| S-07b | Import stat funcții (imagine) | ~10.000 | ~4.000 | Sonnet+Vision | **$0.090** | ~10K×$3/1M + 4K×$15/1M |
| S-08 | Evaluare AI per poziție | ~8.000 | ~3.000 | Sonnet | **$0.069** | 8K×$3/1M + 3K×$15/1M |
| S-09 | Analiză post-evaluare | ~12.000 | ~5.000 | Sonnet | **$0.111** | 12K×$3/1M + 5K×$15/1M |
| S-10/11/12/13 | Chat mesaj (mediu) | ~6.000 | ~600 | Sonnet | **$0.027** | 6K×$3/1M + 0.6K×$15/1M |

## 2.3 Consum resurse non-AI per serviciu

| Cod | Serviciu | DB queries | Storage | Compute | Cost estimat |
|-----|----------|-----------|---------|---------|-------------|
| F-01..F-20 | Operații DB | 1-10 queries | ~1KB/op | ~50ms | **<$0.001** |
| F-13 | Export PDF | 5-15 queries | ~500KB/doc | ~2s | **~$0.002** |
| F-14 | Export Excel | 5-15 queries | ~200KB/doc | ~1s | **~$0.001** |
| F-12 | Raport pay gap | 20-50 queries | ~2KB | ~5s | **~$0.003** |

**Concluzie:** Costurile non-AI sunt neglijabile (<1% din costul total per serviciu).

---

# 3. COST REAL PER SERVICIU (prețuri curente)

| Cod | Serviciu | Cost AI real | Cost infra | **Cost total/unitate** |
|-----|----------|-------------|-----------|----------------------|
| S-01 | Fișă de post AI | $0.069 | $0.001 | **$0.070** |
| S-02 | Anunț recrutare | $0.041 | $0.001 | **$0.042** |
| S-03 | Fișă KPI | $0.059 | $0.001 | **$0.060** |
| S-04 | Relevanță (real-time) | $0.004 | $0.001 | **$0.005** |
| S-05 | Extragere MVV | $0.024 | $0.001 | **$0.025** |
| S-06 | Upload fișă structurare | $0.048 | $0.001 | **$0.049** |
| S-07 | Import stat funcții | $0.090 | $0.001 | **$0.091** |
| S-08 | Evaluare AI per poziție | $0.069 | $0.001 | **$0.070** |
| S-09 | Analiză post-evaluare | $0.111 | $0.002 | **$0.113** |
| S-10..13 | Chat per mesaj | $0.027 | $0.001 | **$0.028** |

---

# 4. PLASA 1 — Cost maximal (worst-case resurse)

**Principiu:** Totul recalculat la Opus 4.6 ($15/$75 per 1M tokeni) — cel mai scump model.

| Cod | Serviciu | Input tokeni | Output tokeni | Cost Opus/unitate | Factor vs. real |
|-----|----------|-------------|---------------|-------------------|----------------|
| S-01 | Fișă de post AI | 8.000 | 3.000 | **$0.345** | 4.9× |
| S-02 | Anunț recrutare | 6.000 | 1.500 | **$0.203** | 4.8× |
| S-03 | Fișă KPI | 7.000 | 2.500 | **$0.293** | 4.9× |
| S-04 | Relevanță | 3.000 | 400 | **$0.075** | 15× |
| S-05 | Extragere MVV | 5.000 | 600 | **$0.120** | 4.8× |
| S-06 | Upload fișă | 6.000 | 2.000 | **$0.240** | 4.9× |
| S-07 | Import stat funcții | 10.000 | 4.000 | **$0.450** | 4.9× |
| S-08 | Evaluare AI/poz | 8.000 | 3.000 | **$0.345** | 4.9× |
| S-09 | Analiză post-eval | 12.000 | 5.000 | **$0.555** | 4.9× |
| S-10..13 | Chat/mesaj | 6.000 | 600 | **$0.135** | 4.8× |

---

# 5. PLASA 2 — Conversie valutară (BNR + 10%)

**Curs BNR referință:** 4.95 RON/USD (aprilie 2026)
**Curs acoperitor:** 4.95 × 1.10 = **5.445 RON/USD**

| Cod | Serviciu | Cost Opus USD | **Cost acoperitor RON** |
|-----|----------|--------------|------------------------|
| S-01 | Fișă de post AI | $0.345 | **1.88 RON** |
| S-02 | Anunț recrutare | $0.203 | **1.11 RON** |
| S-03 | Fișă KPI | $0.293 | **1.60 RON** |
| S-04 | Relevanță | $0.075 | **0.41 RON** |
| S-05 | Extragere MVV | $0.120 | **0.65 RON** |
| S-06 | Upload fișă | $0.240 | **1.31 RON** |
| S-07 | Import stat funcții | $0.450 | **2.45 RON** |
| S-08 | Evaluare AI/poz | $0.345 | **1.88 RON** |
| S-09 | Analiză post-eval | $0.555 | **3.02 RON** |
| S-10..13 | Chat/mesaj | $0.135 | **0.74 RON** |

---

# 6. STRUCTURA CAPEX / OPEX ȘI VERIFICARE MARJĂ

## 6.1 CAPEX — Costuri fixe lunare (acoperite de abonament)

| Furnizor | Componentă | Cost lunar | Tip | Notă |
|----------|-----------|-----------|-----|------|
| **Vercel** | Hosting + funcții serverless | ~$20 (~109 RON) | Infra | Scalează cu trafic |
| **Neon** | PostgreSQL managed | ~$19 (~103 RON) | DB | Scalează cu volum date |
| **Upstash** | Redis cache + rate limiting | ~$10 (~54 RON) | Cache | |
| **Anthropic** | Organism background (45 agenți) | ~$94 (~512 RON) | AI background | Reflecție, proactivitate, sentinel, distilare, cross-pollination |
| **Registrar** | Domeniu jobgrade.ro + DNS | ~$3 (~16 RON) | Infra | Amortizat anual |
| **Resend** | Email tranzacțional | ~$0 (free tier 3K/lună) | Email | Upgrade ~$20/lună la volum |
| **ntfy.sh** | Notificări push Owner | $0 (gratuit) | Notificări | |
| **Sentry** | Error tracking + monitoring | ~$0 (free tier) | Monitoring | Upgrade ~$26/lună la volum |
| **ElevenLabs** | Voce AI (agent conversațional) | ~$5-22/lună | Voice | Depinde de plan, incert deocamdată |
| **GitHub** | Repository + Actions (CI/CD) | $0 (free tier) | DevOps | GitHub Actions: 2000 min/lună gratuit |
| | | | | |
| **TOTAL CAPEX** | | **~$151-173/lună (~822-942 RON)** | | |
| **Abonament** | | **399 RON/lună** | | |
| **Break-even CAPEX** | | **2-3 clienți** | | 3 × 399 = 1.197 > 942 |

## 6.2 OPEX — Costuri variabile per tranzacție (acoperite de credite)

### Furnizori cu cost variabil per operație

| Furnizor | Componentă | Cost per unitate | Unitate | Când se aplică |
|----------|-----------|-----------------|---------|---------------|
| **Anthropic** | Sonnet input | $3.00/1M tokeni | Per API call | Toate serviciile AI |
| **Anthropic** | Sonnet output | $15.00/1M tokeni | Per API call | Toate serviciile AI |
| **Anthropic** | Haiku input | $0.80/1M tokeni | Per API call | Relevanță real-time |
| **Anthropic** | Haiku output | $4.00/1M tokeni | Per API call | Relevanță real-time |
| **Anthropic** | Vision (imagine) | ~$0.02-0.05 | Per imagine | Import stat funcții PNG/JPG |
| **Stripe** | Comision plată | 1.5% + €0.25 | Per tranzacție | La fiecare checkout |
| **Resend** | Email tranzacțional | $0 (free) / $0.001 (peste 3K) | Per email | Notificări, facturi |
| **Neon** | Compute on-demand | $0.16/compute-hour | Per query complex | Rapoarte, pay gap |
| **Vercel** | Function invocation | $0.18/1M invocări | Per request | Toate endpoint-urile |
| **ElevenLabs** | Text-to-speech | ~$0.01-0.05 | Per mesaj voice | Chat cu voce (când activ) |

### Cost real per credit (de la Plasa 2 — cost acoperitor în RON)

| Cod | Serviciu | Cost acoperitor/unitate | Credite alocate (calculator actual) | **Cost real per credit consumat** |
|-----|----------|------------------------|-----------------------------------|---------------------------------|
| S-01 | Fișă de post AI | 1.88 RON | 12 cr/poz | **0.16 RON/cr** |
| S-02 | Anunț recrutare | 1.11 RON | 4 cr/anunț | **0.28 RON/cr** |
| S-03 | Fișă KPI | 1.60 RON | 3 cr/fișă | **0.53 RON/cr** |
| S-08 | Evaluare AI/poz | 1.88 RON | 60 cr/poz | **0.03 RON/cr** |
| S-09 | Analiză post-eval | 3.02 RON | 3 cr/sesiune | **1.01 RON/cr** |
| S-10..13 | Chat/mesaj | 0.74 RON | ~0.5 cr/msg | **1.48 RON/cr** |
| S-06 | Upload fișă | 1.31 RON | inclus | — |
| S-07 | Import stat funcții | 2.45 RON | inclus | — |

### Cost mediu ponderat per credit

Pachetul Baza (layer 1) cu 10 poziții:
- Evaluare: 10 × 60 = 600 cr → cost 10 × 1.88 = 18.80 RON
- Fișe: 10 × 12 = 120 cr → cost 10 × 1.88 = 18.80 RON  
- Structură: 20 + 10 = 30 cr → cost ~0.10 RON
- **Total: 750 credite → cost acoperitor total: 37.70 RON**

**Cost acoperitor mediu per credit = 37.70 / 750 = 0.050 RON/credit**
**Preț vânzare: 8.00 RON/credit**
**Marja OPEX: (8.00 - 0.050) / 8.00 = 99.4%**

### Verificare la cel mai scump scenariu (chat intensiv)

1.500 credite, din care 500 sunt chat (cel mai scump per credit):
- Chat: 500 cr × 1.48 RON/cr = 740 RON  
- Evaluare+fișe: 1.000 cr × 0.05 RON/cr = 50 RON
- **Total cost: 790 RON / 1.500 credite = 0.53 RON/credit**
- **Marja: (8.00 - 0.53) / 8.00 = 93.4%**

**Concluzie:** Prețul de **1 credit = 8 RON** oferă marjă de **93-99%** chiar și la cost acoperitor worst-case. Prețul e sustenabil.

---

# 7. PACHETE COMPUSE — Ce include fiecare

## 7.1 Pachet BAZA (Ordine internă) — per poziție

| Componentă | Credite/poz (din calculator) | Cost acoperitor/poz |
|-----------|---------------------------|-------------------|
| Evaluare AI (S-08) | ~1.2 cr | 1.88 RON |
| Fișă de post AI (S-01) | ~1.2 cr | 1.88 RON |
| Structură salarială (F-09, non-AI) | ~0.1 cr | <0.01 RON |
| Export PDF (F-13, non-AI) | ~0.1 cr | <0.01 RON |
| Raport master (L-02) | ~1.9 cr | 3.02 RON |
| Chat consiliere inclus | ~5 cr (10 msg) | 7.40 RON |
| **Total cost acoperitor** | | **~14.19 RON/poz** |
| **Preț calculator (60+12 cr = 72 cr/poz)** | 72 cr | **576 RON/10 poz** |
| **Marjă efectivă** | | **~97.5%** |

## 7.2 Cele 4 variante de evaluare — COST DIFERENȚIAT

**DEDUS DIN DB PROD** (provider_costs + ai_operation_tiers, 22.04.2026)

### Varianta A: Evaluare automată AI
| Componentă | Per poziție | Notă |
|-----------|-----------|------|
| S-08: Evaluare AI | $0.070 | O singură rulare AI |
| F-09: JE Process Engine | <$0.001 | Doar calcul DB |
| **Total cost real** | **$0.071** | |
| **Total acoperitor (Plasa 1+2)** | **1.88 RON** | |
| **Preț cu marjă ×5** | **9.40 RON** | → ~1.2 credite/poz |

### Varianta B: Comisie internă mediată AI
| Componentă | Per poziție | Notă |
|-----------|-----------|------|
| F-05: Scorare individuală | <$0.001 | DB write × N evaluatori × 6 criterii |
| F-06/07/08: Consens 3 etape | <$0.001 | DB logic |
| S-04: Relevanță per scorare | $0.005 × N | Haiku, per evaluator |
| S-08: Mediere AI divergențe | $0.070 | Identificare + sugestii consens |
| **Total cost real (5 evaluatori)** | **$0.096** | |
| **Total acoperitor** | **2.55 RON** | |
| **Preț cu marjă ×5** | **12.75 RON** | → ~1.6 credite/poz |
| **Raport față de Varianta A** | **×1.35** | +35% |

### Varianta C: Comisie internă mediată consultant uman
| Componentă | Per poziție | Notă |
|-----------|-----------|------|
| F-05..F-08: Scorare + consens | <$0.001 | DB logic |
| Cost consultant (150 RON/oră) | ~15 RON/poz | ~10 poz/oră facilitare |
| **Total cost real** | **~15 RON** | Dominat de costul uman |
| **Total acoperitor** | **16.50 RON** | +10% buffer |
| **Preț cu marjă ×2** | **33 RON** | Marjă redusă (cost uman) → ~4.1 cr/poz |
| **Raport față de Varianta A** | **×3.5** | +250% |

### Varianta D: Hibrid (AI apoi comisie)
| Componentă | Per poziție | Notă |
|-----------|-----------|------|
| Varianta A complet | 1.88 RON | Prima fază: evaluare AI |
| Varianta B parțial (ajustări) | ~1.00 RON | Comisia pornește de la AI, ajustează ~30% |
| **Total acoperitor** | **2.88 RON** | |
| **Preț cu marjă ×5** | **14.40 RON** | → ~1.8 credite/poz |
| **Raport față de Varianta A** | **×1.53** | +53% |

### Rezumat — credite suplimentare per variantă

**Sursa:** DB prod (provider_costs: human-specialist-min = 150-200 EUR/oră, ai_operation_tiers: mediation-facilitation amp 1.50)

| Varianta | Cost acoperitor/poz | Credite suplimentare/poz | Calcul |
|----------|-------------------|--------------------------|--------|
| A: Auto AI | 2.88 RON | **0** (inclus în 60 cr/poz pachet) | Haiku, amp 1.20 |
| B: Comisie + AI | 5.48 RON | **+1 cr/poz** | mediation-facilitation Sonnet, amp 1.50 |
| C: Comisie + Consultant | 106.54 RON | **+20 cr/poz** | 175 EUR/oră × 7 min/poz, marjă ×1.5 |
| D: Hibrid AI→Comisie | 4.52 RON | **+1 cr/poz** | A complet + B pe ~30% posturi |

**Exemplu 20 poziții:**
- A: 0 suplimentar (inclus)
- B: +20 credite = +160 RON
- C: +400 credite = +3.200 RON
- D: +20 credite = +160 RON

**Verificare fezabilitate:**
- C (20 poz): 3.200 RON vs consultant tradițional ~36.500 RON (100 poz, 40h) → economie 56%
- Marja C: (3.200 - 2.131) / 3.200 = 33% (marjă mică, dominată de cost uman)
- Marja A/B/D: >93% (dominat de AI, cost neglijabil)

**NOTĂ:** Cele 60 cr/poz din pachet acoperă evaluarea AI + fișe + structură + rapoarte + chat. Creditele suplimentare sunt DOAR pentru componenta de evaluare diferențiată.

---

# 8. CATEGORII PACHETE (din calculator implementat)

## 8.1 Pachete servicii (4 layere)

| Layer | Nume | Servicii incluse | Credite/formula |
|-------|------|-----------------|----------------|
| 1 | Ordine internă (Baza) | JE AUTO + Fișe AI + Structură salarială | 60×poz + 12×poz + 20+1×ang |
| 2 | Conformitate (Nivelul 1) | + Pay gap + Benchmark | + 15+0.5×ang + 30+1.5×poz |
| 3 | Competitivitate (Nivelul 2) | + Pachete salariale + Performanță + Impact | + 25+1×poz + 15×ang + 40 |
| 4 | Dezvoltare (Nivelul 3) | + HR + Recrutare + Manual angajat | + 40+1×ang + 60×proiecte + 20+1.5×poz |

## 8.2 Tipuri companii (din discount volum)

| Tip | Poziții | Angajați | Discount | Preț/credit |
|-----|---------|----------|----------|-------------|
| Starter | 1-50 | 1-50 | 0% | 8.00 RON |
| Professional | 51-150 | 51-150 | 12% | 7.00 RON |
| Enterprise | 150+ | 150+ | 25% | 5.50-6.00 RON |

## 8.3 Abonament

| Componentă | Preț | Perioadă |
|-----------|------|---------|
| Abonament lunar | 399 RON | /lună |
| Abonament anual | 3.990 RON | /an (17% discount) |
| Include | Acces portal, dashboard diagnostic, MVV draft, profil sectorial, consultant HR 135 min/lună | |
| NU include | Credite (se cumpără separat) | |

## 8.4 Pachete credite

| Pachet | Credite | RON | Per credit | Discount |
|--------|---------|-----|-----------|----------|
| Micro | 100 | 800 | 8.00 | 0% |
| Mini | 250 | 1.875 | 7.50 | 6% |
| Start | 500 | 3.500 | 7.00 | 12% |
| Business | 1.500 | 9.750 | 6.50 | 19% |
| Professional | 5.000 | 30.000 | 6.00 | 25% |
| Enterprise | 15.000 | 82.500 | 5.50 | 31% |

---

# 9. EXEMPLU APLICAT — Companie 20 poziții, 80 angajați

## 9.1 Pachetul Baza (Layer 1)

| Serviciu | Formula | Credite |
|----------|---------|---------|
| Evaluare posturi JE AUTO | 20 × 60 | 1.200 |
| Fișe de post AI | 20 × 12 | 240 |
| Structură salarială | 20 + 80×1 | 100 |
| **Total** | | **1.540 cr** |

La preț Starter (8 RON/cr): **12.320 RON**
La preț Business (6.50 RON/cr): **10.010 RON**

## 9.2 Dacă alege varianta B (comisie + AI) în loc de A (auto)

Diferența la nivel evaluare: ×1.35 → 1.200 × 1.35 = 1.620 cr
Credite suplimentare: 1.620 - 1.200 = **420 credite**
Cost suplimentar Starter: 420 × 8 = **3.360 RON**

## 9.3 Dacă alege varianta C (comisie + consultant)

Diferența: ×3.5 → 1.200 × 3.5 = 4.200 cr
Credite suplimentare: 4.200 - 1.200 = **3.000 credite**
Cost suplimentar Starter: 3.000 × 8 = **24.000 RON**

## 9.4 Dacă alege varianta D (hibrid)

Diferența: ×1.53 → 1.200 × 1.53 = 1.836 cr
Credite suplimentare: 1.836 - 1.200 = **636 credite**
Cost suplimentar Starter: 636 × 8 = **5.088 RON**

---

# 10. REPLICABILITATE — Cum se adaugă un serviciu nou

1. **Definește serviciul** — cod, rută API, model AI, unitate de consum
2. **Măsoară consumul real** — tokeni input/output, model efectiv folosit
3. **Calculează costul real** — tokeni × preț/1M tokeni
4. **Aplică Plasa 1** — recalculează la Opus 4.6 ($15/$75)
5. **Aplică Plasa 2** — conversie USD→RON la BNR + 10%
6. **Aplică marja** — ×5 pentru servicii AI, ×2 pentru servicii cu cost uman
7. **Convertește în credite** — preț RON / 8 = credite
8. **Integrează în pachet** — adaugă formula la layer-ul corespunzător

---

# 11. INVENTAR COMPLET OPERAȚII CLIENT — PER PAGINĂ ȘI ACȚIUNE

## 11.1 Operații GRATUITE (incluse în abonament, fără consum credite)

| Operație | Pagină/Trigger | Resurse | Cost real | Notă |
|----------|---------------|---------|-----------|------|
| Navigare portal | Portal principal | 7 DB queries paralele | <$0.001 | Stage, profile, jobs, sessions, credits |
| Vizualizare progres (4 pași) | Portal | Calcul client-side | $0 | Profile → Jobs → Evaluate → Report |
| Smart Activation (badge-uri dinamice) | Portal | Company Profiler (cache 60s) | <$0.001 | Ce servicii sunt deblocate |
| Adăugare post manual (cu sugestii) | Tab Posturi | DB write + autocomplete static | <$0.001 | 80+ poziții RO predefinite |
| Import posturi din Excel | Tab Posturi | ExcelJS parse + DB write batch | <$0.001 | Fără AI |
| Import stat salarii XLSX/CSV | Tab Stat salarii | ExcelJS parse + DB write batch | <$0.001 | Fără AI |
| Adăugare angajat manual | Tab Stat salarii | DB write | <$0.001 | |
| Vizualizare sesiuni | Sessions page | DB read | <$0.001 | |
| Creare sesiune evaluare | Sessions new | DB write (sesiune + jobs + participanți) | <$0.001 | |
| Scorare individuală (comisie) | Evaluate page | DB write per criteriu | <$0.001 | 6 criterii × N posturi |
| Consens: vot | Consensus page | DB write | <$0.001 | |
| Consens: recalibrare | Consensus page | DB logic | <$0.001 | |
| Consens: decizie | Consensus page | DB logic | <$0.001 | |
| JE Process Engine (toate acțiunile) | je-process | DB logic complexă | <$0.001 | Pitariu, slotting, benchmarks |
| Finalizare sesiune | Complete | DB finalizare | <$0.001 | |
| Vizualizare rezultate | Results page | DB read | <$0.001 | |
| Vizualizare raport (fără export) | Report flipbook | DB read + render client | <$0.001 | |
| Dashboard pay gap (vizualizare) | Pay gap dashboard | DB read + calcul indicatori | <$0.001 | |
| Profil companie CRUD | Company page | DB read/write | <$0.001 | |
| Lookup ANAF | Company extract | API extern ANAF V9 | $0 | Gratuit, API public |
| Detectare escalare (chat) | Toate chat-urile | Regex matching | $0 | Fără AI |
| Jurnal activități | Billing log | DB write | <$0.001 | |
| Account export/import/reset | Account pages | DB + crypto | <$0.01 | |

## 11.2 Operații PLĂTITE (consum credite)

### Servicii AI per acțiune

| Operație | Trigger | Model AI | Cost acoperitor | Credite debitate | Cod credit |
|----------|---------|----------|----------------|-----------------|------------|
| Generare fișă de post AI | Buton "Compune cu AI" | Sonnet | 1.88 RON | Inclus în 12 cr/poz pachet | — |
| Verificare relevanță (mod manual) | Typing debounced | Haiku | 0.41 RON | Gratuit (inclus) | — |
| Generare anunț recrutare | AI Tools | Sonnet | 1.11 RON | **4 credite** | JOB_AD |
| Generare fișă KPI | AI Tools | Sonnet | 1.60 RON | **3 credite** | KPI_SHEET |
| Extragere MVV website/CAEN | Buton MVV | Sonnet | 0.65 RON | **2 credite** | COMPANY_EXTRACT |
| Upload fișă PDF/Word → structurare | Upload panel | Sonnet | 1.31 RON | Inclus | — |
| Import stat funcții (XLSX/PDF) | Import panel | Sonnet | 2.45 RON | TODO: de definit | — |
| Import stat funcții (imagine PNG/JPG) | Import panel | Sonnet+Vision | 2.45 RON | TODO: de definit | — |
| Evaluare automată AI per poziție | Buton "Pornește evaluarea" | Sonnet | 1.88 RON | Inclus în 60 cr/poz pachet | — |
| Analiză post-evaluare | Post-sesiune | Sonnet | 3.02 RON | **4 credite** | SESSION_ANALYSIS |
| Analiză job aprofundată | AI Tools | Sonnet | 3.02 RON | **4 credite** | JOB_ANALYSIS |
| Generare grade salariale | Salary grades | Sonnet | 1.88 RON | **5 credite** | GENERATE_GRADES |
| Simulare remunerare | Simulator | Sonnet | 1.60 RON | **3 credite** | SIMULATE_REMUNERATION |
| Raport pay gap | Pay gap report | Sonnet | 3.02 RON | **3 credite** | PAY_GAP_REPORT |
| Recalibrare consens | Recalibration | Sonnet | 1.88 RON | **2 credite** | RECALIBRATION_ROUND |

### Export rapoarte

| Export | Format | Cost acoperitor | Credite | Cod |
|--------|--------|----------------|---------|-----|
| Export PDF | PDF | 0.02 RON | **5 credite** | EXPORT_PDF |
| Export Excel | XLSX | 0.01 RON | **5 credite** | EXPORT_EXCEL |
| Export JSON | JSON | <0.01 RON | **5 credite** | EXPORT_JSON |
| Export XML | XML | <0.01 RON | **5 credite** | EXPORT_XML |

### Chat cu agenți AI

| Agent | Rol | Model | Cost/mesaj acoperitor | Credite/mesaj | Abonament inclus |
|-------|-----|-------|----------------------|---------------|-----------------|
| SOA | Vânzări, onboarding | Sonnet | 0.74 RON | ~0.5 cr | 135 min/lună incluse |
| HR Counselor | Facilitare evaluare | Sonnet | 0.74 RON | ~0.5 cr | — |
| CSA | Suport client | Sonnet | 0.74 RON | ~0.5 cr | — |
| CSSA | Suport senior | Sonnet | 0.74 RON | ~0.5 cr | — |

## 11.3 Chat Consultant HR — Tarifare diferențiată (IMPLEMENTAT)

**Componentă:** `src/components/guide/NarrativeGuide.tsx` (commit ae96ae1, 17.04.2026)

### Două moduri tarifare cu indicator permanent:

| Mod | Badge | Cost | Minute incluse | Clasificare |
|-----|-------|------|----------------|-------------|
| **FAMILIARIZARE** | 🟢 gratuit | 0 credite | 135 min/lună (3 × 45 min) | Întrebări despre platformă, servicii, funcționalități |
| **CONSULTANȚĂ** | 🟡 plătit | 3 credite/min | Din soldul client | Întrebări profesionale (norme, lege, cod muncă, ITM, proceduri, audit) |

### Mecanism implementat:
- **Counter minute gratuite** — persistent localStorage, reset lunar automat
- **Clasificare intent** — regex pe keywords profesionale (normă, lege, cod muncă, concediu, demisie, preaviz, ITM, ANAF, salariu, contract, procedură, regulament, audit, conformitate, directivă)
- **Notificare tranziție** — când clientul trece de la familiarizare la consultanță: "Întrebarea ta implică consultanță profesională. De aici se consumă 3 credite/minut."
- **Confirmare explicită** — butoane "Da, continui" / "Rămân pe familiarizare"
- **Badge permanent vizibil** — clientul vede MEREU în ce mod se află

### Cost intern per mod:

| Mod | Cost AI/mesaj (Sonnet) | Cost acoperitor/mesaj | Credite debitate | Marja |
|-----|----------------------|----------------------|-----------------|-------|
| Familiarizare | $0.027 | 0.74 RON | 0 (absorbit de abonament) | Negativ (investiție adopție) |
| Consultanță | $0.027 | 0.74 RON | 3 cr/min ≈ 24 RON/min | ~97% |

### Impact pe CAPEX:
135 min gratuite/lună × $0.027/mesaj × ~2 mesaje/min = **~$7.30/client/lună** absorbit de abonament.
La 399 RON abonament → **~40 RON cost** din 399 = **10% din abonament**.

## 11.4 Flying Wheel / Ghidaj contextual (IMPLEMENTAT)

**Componentă:** `src/components/guide/NarrativeGuide.tsx`

- Bubble flotantă jos-dreapta pe toate paginile portalului
- Mesaje contextuale per pagină (walkthrough cu `return_to` URL)
- Ghidaj pe pașii parcurși + document pe topicele de interes
- **Gratuit** — inclus în experiența de bază
- Cost: doar render client-side (zero AI dacă nu trimite mesaj)

## 11.5 Operații BACKGROUND per client (invizibile)

| Operație | Trigger | Frecvență | Cost/rulare | Notă |
|----------|---------|-----------|-------------|------|
| Company Profiler recalc | Chat, raport, evaluare | Per request (cache 60s) | ~$0.07 | Include coerență AI |
| MVV Progressive Builder | onSignificantAction() | La adăugare post, evaluare, salarii | ~$0.02 | Rebuild draft MVV |
| HR Counselor Shadow | Fiecare chat B2B | Per mesaj | ~$0.03 | Observare invizibilă — maturity, engagement |
| Client Memory update | Shadow detect insight | Per insight | <$0.01 | DB write |
| Escalation chain | Chat detect conflict/legal | Per mesaj (regex) | $0 | Fără AI |

## 11.6 STORAGE per client (OPEX stocare)

| Componentă | Dimensiune estimată | Per ce | Creștere lunară |
|-----------|-------------------|-------|----------------|
| Profil companie + MVV | ~3 KB | Per client | Minimă |
| Posturi + fișe | ~2 KB × nr. posturi | Per poziție | La adăugare |
| Evaluări (scoruri) | ~500 B × posturi × evaluatori × criterii | Per sesiune | La evaluare |
| Sesiuni (metadate) | ~1.5 KB | Per sesiune | La creare |
| Chat history | ~2 KB × nr. mesaje | Per mesaj | Continuu |
| AI Generations (log) | ~8 KB per generare | Per generare | La consum |
| Credit transactions | ~200 B | Per tranzacție | La consum |
| Client Memory (shadow) | ~1 KB per insight | Per insight | Continuu |
| Pay gap reports | ~3 KB | Per an | Anual |
| Export cache | Temporar (nu persistent) | — | 0 |
| **TOTAL estimat client activ** | **~400-600 KB/an** | | |
| **Cost Neon storage** | **<$0.001/an/client** | $0.75/GiB | Neglijabil |

---

# 12. REZUMAT PENTRU APROBARE OWNER

## Ce acoperă abonamentul (399 RON/lună) — CAPEX
- Infrastructură: Vercel, Neon, Upstash, DNS
- Organism background: 45 agenți (reflecție, proactivitate, distilare)
- Furnizori: Resend, Sentry, ntfy, GitHub Actions
- ElevenLabs (voce) — de confirmat plan
- **Total CAPEX: ~822-942 RON/lună**
- **Break-even: 3 clienți**

## Ce acoperă creditele (1 credit = 8 RON) — OPEX
- Toate operațiile AI (Anthropic Sonnet/Haiku)
- Generări documente (fișe, anunțuri, KPI, rapoarte)
- Evaluare automată AI
- Chat cu agenți (SOA, HR Counselor, CSA, CSSA)
- Export rapoarte (PDF, Excel, JSON, XML)
- **Cost acoperitor mediu per credit: 0.05-0.53 RON**
- **Marjă OPEX: 93-99%**

## Ce e GRATUIT (investiție în adopție)
- Navigare, vizualizare, stage tracking
- Adăugare posturi manual, import Excel
- Scorare în comisie (DB only)
- Vizualizare rapoarte (fără export)
- Lookup ANAF
- TODO: chat ghidaj platformă, flying wheel

## PENDING aprobare
- [ ] Multiplicatori variante evaluare (secțiunea 7.2)
- [ ] Prețuri credite pentru import stat funcții (S-07)
- [ ] Chat gratuit: câte mesaje/lună pe ghidaj platformă?
- [ ] ElevenLabs: plan confirmat + cost

---

*Document viu. Se actualizează la fiecare modificare de serviciu, preț resurse, sau model AI.*
*Următoarea revizuire: la schimbarea prețurilor Anthropic sau la adăugarea unui serviciu nou.*
*Responsabil: COG (operațional) + DMA (date) + Marketing (strategie).*
