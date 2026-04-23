# TABEL COMPLET PRICING — JobGrade Platform
## Generat automat din DB producție

**Data generare:** 2026-04-23
**Sursă:** DB prod (22 provider_costs + 14 ai_operation_tiers + 1 credit_value)
**Curs:** 1 USD = 5.2185 RON (BNR 4.97 + buffer 5%)
**Credit:** 1 credit = 8 RON

---

## 1. VALOAREA CREDITULUI

| Parametru | Valoare | Sursă |
|-----------|---------|-------|
| Curs BNR USD/RON | 4.97 | bnr.ro |
| Curs BNR EUR/RON | — | bnr.ro |
| Buffer valutar | +5% | Decizie COG |
| Curs efectiv USD/RON | 5.2185 | BNR × (1 + buffer) |
| Valoare 1 credit | 8 RON | Decizie COG+Owner |
| Notă | COG Q1: 1 credit = 8 RON. Buffer BNR +5% (Q7). | |
| Efectiv din | 2026-04-17 | |

## 2. PREȚURI FURNIZORI (provider_costs)

### 2.1 CAPEX — Costuri fixe lunare

| Furnizor | Resursă | Unitate | Cost real USD | Cost acoperitor USD | Notă |
|----------|---------|---------|-------------|-------------------|------|
| anthropic | claude-api-baseline-monthly | 1 month | $50.00 | $75.00 | Claude API baseline |
| domain | domain-ssl-monthly | 1 month | $2.00 | $3.00 | Domain + SSL |
| legal | legal-compliance-monthly | 1 month | $40.00 | $50.00 | Legal/Compliance |
| marketing | marketing-baseline-monthly | 1 month | $60.00 | $75.00 | Marketing content |
| n8n | n8n-cloud-monthly | 1 month | $30.00 | $40.00 | n8n Cloud workflows |
| neon | neon-launch-monthly | 1 month | $19.00 | $25.00 | Plan Neon Launch Frankfurt |
| support | support-baseline-monthly | 1 month | $30.00 | $40.00 | Support email/ticket |
| vercel | vercel-pro-monthly | 1 month | $20.00 | $25.00 | Plan Vercel Pro |
| **TOTAL** | | | **$251.00** | **$333.00** | **=1738 RON** |

### 2.2 OPEX per client — Costuri fixe per cont activ

| Furnizor | Resursă | Unitate | Cost real USD | Cost acoperitor USD |
|----------|---------|---------|-------------|-------------------|
| neon | neon-storage-per-client-monthly | 1 client/month | $0.50 | $1.00 |
| resend | resend-transactional-per-client | 1 client/month | $0.20 | $0.50 |

### 2.3 OPEX per execuție — Costuri variabile

| Furnizor | Resursă | Unitate | Cost real USD | Cost acoperitor USD |
|----------|---------|---------|-------------|-------------------|
| anthropic | claude-haiku-4-5-input-tokens | 1M tokens | $0.800000 | $1.000000 |
| anthropic | claude-haiku-4-5-output-tokens | 1M tokens | $4.000000 | $5.000000 |
| anthropic | claude-opus-4-6-input-tokens | 1M tokens | $15.000000 | $20.000000 |
| anthropic | claude-opus-4-6-output-tokens | 1M tokens | $75.000000 | $100.000000 |
| anthropic | claude-sonnet-4-6-input-tokens | 1M tokens | $3.000000 | $4.000000 |
| anthropic | claude-sonnet-4-6-output-tokens | 1M tokens | $15.000000 | $20.000000 |
| internal | human-specialist-min | 1 minute | $2.500000 | $3.500000 |
| neon | neon-data-transfer-gb | 1 GB transfer | $0.090000 | $0.150000 |
| resend | resend-email | 1 email | $0.001000 | $0.002000 |
| vercel | vercel-active-cpu-min | 1 minute compute | $0.006000 | $0.010000 |
| vercel | vercel-bandwidth-gb | 1 GB transfer | $0.150000 | $0.200000 |
| vercel | vercel-blob-gb | 1 GB stored/month | $0.023000 | $0.050000 |

## 3. TIERING AI (ai_operation_tiers)

| Operație | Descriere | Model real | Model covering | Amplif. |
|----------|-----------|-----------|---------------|---------|
| consultant-hr-chat | Consultanta HR | claude-sonnet-4-6 | claude-opus-4-6 | ×1.2 |
| import-stat-functii | Import stat funcții (XLSX/PDF/PNG Vision) | claude-sonnet-4-6 | claude-opus-4-6 | ×1.3 |
| intent-classification | Clasificare intent chat | claude-haiku-4-5-20251001 | claude-opus-4-6 | ×1.0 |
| job-ad-generation | Generare anunț recrutare per platformă | claude-sonnet-4-6 | claude-opus-4-6 | ×1.1 |
| job-auto-evaluation | Evaluare JE AUTO | claude-haiku-4-5-20251001 | claude-opus-4-6 | ×1.2 |
| job-description-ai | Generare fise post | claude-haiku-4-5-20251001 | claude-sonnet-4-6 | ×1.1 |
| kpi-generation | Generare fișă KPI per post | claude-sonnet-4-6 | claude-opus-4-6 | ×1.1 |
| mediation-facilitation | Facilitare mediere | claude-sonnet-4-6 | claude-opus-4-6 | ×1.5 |
| pay-gap-analysis | Analiza decalaj salarial | claude-sonnet-4-6 | claude-opus-4-6 | ×1.2 |
| relevance-check | Verificare relevanță fișă de post în timp real | claude-haiku-4-5-20251001 | claude-sonnet-4-6 | ×1.0 |
| report-generation | Generare rapoarte | claude-sonnet-4-6 | claude-opus-4-6 | ×1.3 |
| session-analysis | Analiză post-evaluare sesiune | claude-sonnet-4-6 | claude-opus-4-6 | ×1.2 |
| social-media-generation | Generare postare social media HR | claude-sonnet-4-6 | claude-opus-4-6 | ×1.0 |
| website-extraction | Extractie profil website | claude-haiku-4-5-20251001 | claude-sonnet-4-6 | ×1.0 |

## 4. COST PER SERVICIU AI — Calculat din tokeni reali

| Serviciu | Model real | Input tok | Output tok | Amp | Cost real USD | Cost real RON | Plasa 1+2 RON | Credite | Preț RON | Marja | Cod credit | Notă |
|----------|-----------|-----------|------------|-----|-------------|--------------|---------------|---------|----------|-------|------------|------|
| consultant-hr-chat | sonnet-4-6 | 2217 | 1500 | ×1.2 | $0.02915 | 0.152 RON | **1.217 RON** | — | — | **inclus** | 3 cr/min consultanță; 60 min/lună gratuit familiarizare | per mesaj |
| import-stat-functii | sonnet-4-6 | 2650 | 4000 | ×1.3 | $0.06795 | 0.355 RON | **3.073 RON** | — | — | **inclus** | contra credite — de stabilit | per fișier |
| intent-classification | haiku-4-5 | 2000 | 200 | ×1.0 | $0.00240 | 0.013 RON | **0.313 RON** | — | — | **inclus** | intern organism (nu client) | per clasificare |
| job-ad-generation | sonnet-4-6 | 850 | 1500 | ×1.1 | $0.02505 | 0.131 RON | **0.959 RON** | 4 | 32 RON | **97%** | JOB_AD | per anunț |
| job-auto-evaluation | haiku-4-5 | 1900 | 1000 | ×1.2 | $0.00552 | 0.029 RON | **0.864 RON** | — | — | **inclus** | 60 cr / 10 poz inclus în pachetul Baza | per poziție |
| job-description-ai | haiku-4-5 | 975 | 1500 | ×1.1 | $0.00678 | 0.035 RON | **0.195 RON** | — | — | **inclus** | 12 cr / 10 poz inclus în pachetul Baza | per fișă |
| kpi-generation | sonnet-4-6 | 375 | 1200 | ×1.1 | $0.01912 | 0.100 RON | **0.732 RON** | 3 | 24 RON | **97%** | KPI_SHEET | per fișă KPI |
| mediation-facilitation | sonnet-4-6 | 2000 | 1500 | ×1.5 | $0.02850 | 0.149 RON | **1.487 RON** | — | — | **inclus** | +1 cr/poz (var B,D); +20 cr/poz (var C consultant) | per rundă |
| pay-gap-analysis | sonnet-4-6 | 1500 | 2000 | ×1.2 | $0.03450 | 0.180 RON | **1.440 RON** | 3 | 24 RON | **94%** | PAY_GAP_REPORT | per raport |
| relevance-check | haiku-4-5 | 800 | 400 | ×1.0 | $0.00224 | 0.012 RON | **0.058 RON** | — | — | **inclus** | gratuit (Haiku, cost minimal) | per verificare |
| report-generation | sonnet-4-6 | 1750 | 2000 | ×1.3 | $0.03525 | 0.184 RON | **1.594 RON** | — | — | **inclus** | inclus în pachetul Baza | per sesiune |
| session-analysis | sonnet-4-6 | 1750 | 2000 | ×1.2 | $0.03525 | 0.184 RON | **1.472 RON** | 4 | 32 RON | **95%** | SESSION_ANALYSIS | per sesiune |
| social-media-generation | sonnet-4-6 | 500 | 800 | ×1.0 | $0.01350 | 0.070 RON | **0.470 RON** | 2 | 16 RON | **97%** | SOCIAL_MEDIA_PER_PLATFORM | per postare |
| website-extraction | haiku-4-5 | 850 | 600 | ×1.0 | $0.00308 | 0.016 RON | **0.080 RON** | 2 | 16 RON | **99%** | COMPANY_EXTRACT | per companie |

## 5. EXPORTURI ȘI SERVICII NON-AI (contra credite)

| Serviciu | Credite | Preț RON | Cost acoperitor RON | Marja | Cod credit |
|----------|---------|----------|-------------------|-------|------------|
| Export PDF | 5 cr | 40 RON | 0.02 RON | **100%** | EXPORT_PDF |
| Export Excel | 5 cr | 40 RON | 0.01 RON | **100%** | EXPORT_EXCEL |
| Export JSON | 5 cr | 40 RON | 0.005 RON | **100%** | EXPORT_JSON |
| Export XML | 5 cr | 40 RON | 0.005 RON | **100%** | EXPORT_XML |
| Generare grade salariale | 5 cr | 40 RON | 1 RON | **98%** | GENERATE_GRADES |
| Simulare remunerare | 3 cr | 24 RON | 0.8 RON | **97%** | SIMULATE_REMUNERATION |
| Recalibrare consens | 2 cr | 16 RON | 1.49 RON | **91%** | RECALIBRATION_ROUND |

## 6. OPERAȚII GRATUITE (incluse în abonament)

| Operație | Resurse | Cost intern |
|----------|---------|-------------|
| Adăugare/editare post | DB write | <0.001 |
| Import posturi din Excel | ExcelJS + DB write | <0.001 |
| Import stat salarii XLSX/CSV | ExcelJS + DB write | <0.001 |
| Adăugare angajat manual | DB write | <0.001 |
| Creare sesiune evaluare | DB write | <0.001 |
| Scorare individuală (comisie) | DB write × 6 criterii | <0.001 |
| Consens: vot | DB write | <0.001 |
| Consens: recalibrare | DB logic | <0.001 |
| Consens: decizie | DB logic | <0.001 |
| JE Process Engine (toate acțiunile) | DB logic complexă (Pitariu) | <0.001 |
| Finalizare sesiune | DB finalizare | <0.001 |
| Vizualizare rezultate | DB read | <0.001 |
| Vizualizare raport (fără export) | DB read + render | <0.001 |
| Dashboard pay gap | DB read + calcul indicatori | <0.001 |
| Profil companie CRUD | DB read/write | <0.001 |
| Lookup ANAF | API extern public | $0 |
| Navigare portal / progres | 7 DB queries paralele | <0.001 |
| Smart Activation (badge-uri) | Company Profiler cache | <0.001 |
| Jurnal activități | DB write | <0.001 |
| Account export/import/reset | DB + crypto | <0.01 |
| Verificare relevanță fișă (real-time) | Haiku API | 0.012 RON |

## 7. VARIANTE EVALUARE — Credite suplimentare per poziție

| Variantă | Componente | Cost acoperitor/poz | +Credite/poz | Exemplu 20 poz | Marja |
|----------|-----------|-------------------|-------------|----------------|-------|
| **A: Auto AI** | job-auto-evaluation (Haiku, amp 1.2) | 0.86 RON | 0 (inclus) | 0 cr / 0 RON | inclus |
| **B: Comisie + AI** | mediation-facilitation (Sonnet, amp 1.5) | 1.49 RON | +1 cr | +20 cr / +160 RON | ~90% |
| **C: Comisie + Consultant** | human-specialist-min ($3.5/min × 7 min) | 127.85 RON | +20 cr | +400 cr / +3.200 RON | ~33% |
| **D: Hibrid AI→Comisie** | A complet + B pe ~30% posturi | 1.31 RON | +1 cr | +20 cr / +160 RON | ~90% |

## 8. CHAT CONSULTANT HR — Tarifare diferențiată

| Mod | Badge | Cost/mesaj acoperitor | Credite | Inclus lunar | Clasificare |
|-----|-------|---------------------|---------|-------------|-------------|
| **Familiarizare** | 🟢 | 1.22 RON | 0 | 60 min (~120 mesaje) | Platformă, servicii, funcționalități |
| **Consultanță** | 🟡 | 1.22 RON | 3 cr/min | Din sold credite | Norme, lege, cod muncă, proceduri |

**Cost familiarizare/client/lună:** ~146 RON (absorbit de abonament 399 RON = 37%)

## 9. PACHETE CREDITE

| Pachet | Credite | RON | Per credit | Discount | Stripe Price ID |
|--------|---------|-----|-----------|----------|-----------------|
| Micro | 100 | 800 RON | 8.00 RON | 0% | env var |
| Mini | 250 | 1875 RON | 7.50 RON | 6% | env var |
| Start | 500 | 3500 RON | 7.00 RON | 12% | env var |
| Business | 1500 | 9750 RON | 6.50 RON | 19% | env var |
| Professional | 5000 | 30000 RON | 6.00 RON | 25% | env var |
| Enterprise | 15000 | 82500 RON | 5.50 RON | 31% | env var |

## 10. FORMULE PACHETE SERVICII (din pricing.ts)

| Layer | Nume | Componente | Formula credite |
|-------|------|-----------|----------------|
| 1 | Ordine internă (Baza) | JE AUTO + Fișe AI + Structură salarială | `60×poz + 12×poz + 20+1×ang` |
| 2 | Conformitate (Nivelul 1) | + Pay gap + Benchmark | `+ 15+0.5×ang + 30+1.5×poz` |
| 3 | Competitivitate (Nivelul 2) | + Pachete salariale + Performanță + Impact | `+ 25+1×poz + 15×ang + 40` |
| 4 | Dezvoltare (Nivelul 3) | + HR + Recrutare + Manual angajat | `+ 40+1×ang + 60×proiecte + 20+1.5×poz` |

## 11. DISCOUNT PE DIMENSIUNE COMPANIE

| Tip | Poziții | Angajați | Discount servicii |
|-----|---------|----------|-------------------|
| Starter | 1-50 | 1-50 | 0% |
| Professional | 51-150 | 51-150 | 12% |
| Enterprise | 150+ | 150+ | 25% |

## 12. ABONAMENT

| Componentă | Preț | Include |
|-----------|------|--------|
| Lunar | 399 RON (fără TVA) | Acces portal, dashboard, MVV draft, profil sectorial, consultant HR 60 min/lună |
| Anual | 3.990 RON (17% discount) | Idem |
| NU include | — | Credite (se cumpără separat) |

## 13. VERIFICARE FEZABILITATE

| Metrică | Valoare |
|---------|---------|
| CAPEX total (covering) | $333.00/lună = 1738 RON |
| Abonament | 399 RON/lună |
| Break-even CAPEX | 5 clienți |
| Chat familiarizare/client | ~146 RON/lună |
| Marjă servicii AI | 94-99% |
| Marjă consultant uman | ~33% |
| Marjă exporturi | 96-99% |

---

*Generat automat din DB producție. Script: scripts/pricing-table-full.mjs*
*Responsabil actualizare: COG + DMA. Aprobare: Owner.*
*La fiecare schimbare de preț furnizor → regenerează acest document.*
