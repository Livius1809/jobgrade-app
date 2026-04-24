# STRUCTURA DE PREȚ FINALĂ — JobGrade Platform
## Document de referință permanent

**Data:** 22.04.2026
**Elaborat de:** Claude (tehnic) + COG (operațional)
**Aprobat de:** Owner — PENDING REVIEW
**Versiune:** FINALĂ (înlocuiește toate documentele anterioare de pricing)
**Salvat la:** Marketing (strategie), COG (operațional), DMA (date), Owner (aprobare)

---

> **ACEST DOCUMENT NU SE PIERDE.** Este salvat în:
> 1. `docs/pricing-final-v2.md` (repository git — versioned)
> 2. Memoria Claude (`project_pricing_final.md`)
> 3. KB agenți (Marketing, COG, DMA)
> 4. Handover permanent

---

# PARTEA I: METODOLOGIE

## Algoritmul de stabilire a prețului

```
1. INVENTAR: Ce serviciu oferim, ce resurse consumă
2. CONSUM REAL: Tokeni + compute + storage + uman (măsurat din cod)
3. COST REAL: Consum × preț furnizor actual
4. PLASA 1: Recalculare la cel mai scump model (Opus 4.6) + token amplification
5. PLASA 2: Conversie USD→RON la BNR + 5% buffer
6. VERIFICARE MARJĂ: Cost acoperitor vs preț de vânzare (credite × 8 RON)
7. AJUSTARE: Dacă marja < 30%, se cresc creditele; dacă > 99%, se verifică competitivitatea
```

## Surse de date

| Sursă | Locație | Ce conține |
|-------|---------|-----------|
| Prețuri furnizori | DB prod: `provider_costs` (22 entries) | Cost real + covering per resursă |
| Tiering AI | DB prod: `ai_operation_tiers` (8 entries) | Model real + covering + amplification per operație |
| Valoare credit | DB prod: `credit_values` | BNR 4.97, buffer 5%, 1 credit = 8 RON |
| Credite per serviciu | `src/lib/credits.ts` | CREDIT_COSTS mapping |
| Formule pachete | `src/lib/pricing.ts` | calcLayerCredits() |
| Budget caps | `src/lib/ai/budget-cap.ts` | Limite zilnice/lunare per tier |
| Cost calculator | `src/lib/pricing/cost-calculator.ts` | 4 plase siguranță, calcul automat |
| Usage logger | `src/lib/pricing/usage-logger.ts` | Telemetry per execuție |

---

# PARTEA II: STRUCTURA COSTURILOR

## A. CAPEX — Costuri fixe lunare (acoperite de abonament)

| Furnizor | Resursă | Cost real USD | Cost covering USD | Categorie |
|----------|---------|-------------|-------------------|-----------|
| Vercel | Hosting Pro | $20.00 | $25.00 | Infra |
| Neon | PostgreSQL Launch | $19.00 | $25.00 | DB |
| Anthropic | Organism background (45 agenți) | $50.00 | $75.00 | AI background |
| n8n | Automatizări cloud | $30.00 | $40.00 | Workflow |
| Marketing | Baseline lunar | $60.00 | $75.00 | Marketing |
| Legal | Compliance lunar | $40.00 | $50.00 | Legal |
| Support | Baseline suport | $30.00 | $40.00 | Suport |
| Domeniu | DNS + SSL | $2.00 | $3.00 | Infra |
| Jitsi Meet | Video conferință comisie (Faza 1) | $0.00 | $0.00 | Video |
| LiveKit + ElevenLabs | Voce AI mediator (Faza 2, planificat) | $30.00 | $50.00 | Video+Voce |
| **TOTAL CAPEX** | | **$281.00** | **$383.00** | |
| **CAPEX RON** | | **~1.310 RON** | **~1.738 RON** | la 5.2185 RON/USD |

**Abonament:** 399 RON/lună
**Break-even CAPEX:** 1.738 / 399 = **~4.4 clienți** (la cost covering)
**La 10 clienți:** 3.990 RON venituri - 1.738 RON CAPEX = **2.252 RON profit fix/lună**

## B. OPEX per client — Costuri fixe per cont activ

| Furnizor | Resursă | Cost real USD | Cost covering USD | Per |
|----------|---------|-------------|-------------------|-----|
| Neon | Storage per client | $0.50 | $1.00 | client/lună |
| Resend | Email tranzacțional | $0.20 | $0.50 | client/lună |
| **TOTAL OPEX/client** | | **$0.70** | **$1.50** | |
| **OPEX/client RON** | | **~3.65 RON** | **~7.83 RON** | |

**Neglijabil** — sub 2% din abonament.

## C. OPEX per execuție — Costuri variabile (acoperite de credite)

### Prețuri furnizori per resursă (din DB prod)

| Furnizor | Resursă | Real USD | Covering USD | Unitate |
|----------|---------|---------|-------------|---------|
| Anthropic | Haiku input | $0.80 | $1.00 | 1M tokeni |
| Anthropic | Haiku output | $4.00 | $5.00 | 1M tokeni |
| Anthropic | Sonnet input | $3.00 | $4.00 | 1M tokeni |
| Anthropic | Sonnet output | $15.00 | $20.00 | 1M tokeni |
| Anthropic | Opus input (covering) | $15.00 | $20.00 | 1M tokeni |
| Anthropic | Opus output (covering) | $75.00 | $100.00 | 1M tokeni |
| Vercel | Compute (CPU) | $0.006 | $0.010 | 1 min |
| Vercel | Bandwidth | $0.15 | $0.20 | 1 GB |
| Vercel | Blob storage | $0.023 | $0.050 | 1 GB/lună |
| Neon | Data transfer | $0.09 | $0.15 | 1 GB |
| Resend | Email | $0.001 | $0.002 | 1 email |
| Stripe | Comision | 1.5% + €0.25 | — | per tranzacție |
| Intern | Consultant uman | $2.50 | $3.50 | 1 minut |

---

# PARTEA III: COST PER SERVICIU (din tokeni reali din cod)

## Servicii AI — Cost exact calculat

| Cod | Serviciu | Model real | Input tok | Output tok | Amp | Cost real USD | Cost acop. RON |
|-----|----------|-----------|-----------|------------|-----|-------------|----------------|
| S-01 | Fișă de post AI | Sonnet | 975 | 1.500 | 1.10 | $0.034 | **0.97 RON** |
| S-02 | Anunț recrutare | Sonnet | 850 | 1.500 | 1.10 | $0.033 | **0.96 RON** |
| S-03 | Fișă KPI | Sonnet | 375 | 1.200 | 1.10 | $0.026 | **0.73 RON** |
| S-04 | Relevanță real-time | Haiku | 800 | 400 | 1.00 | $0.003 | **0.29 RON** |
| S-05 | Extragere MVV | Sonnet | 850 | 600 | 1.00 | $0.015 | **0.40 RON** |
| S-06 | Upload fișă PDF/Word | Sonnet | 2.400 | 2.000 | 1.10 | $0.050 | **1.42 RON** |
| S-07 | Import stat funcții | Sonnet | 2.650 | 4.000 | 1.10 | $0.091 | **2.60 RON** |
| S-08 | Evaluare AI per poziție | Haiku | 1.900 | 1.000 | 1.20 | $0.007 | **0.86 RON** |
| S-09 | Analiză post-evaluare | Sonnet | 1.750 | 2.000 | 1.30 | $0.047 | **1.59 RON** |
| S-10 | Chat HR Counselor/msg | Sonnet | 2.217 | 1.500 | 1.20 | $0.039 | **1.22 RON** |
| S-11 | Chat SOA/msg | Sonnet | 1.929 | 1.500 | 1.20 | $0.038 | **1.18 RON** |
| S-12 | Chat CSA/msg | Sonnet | 1.862 | 1.500 | 1.20 | $0.037 | **1.17 RON** |
| S-13 | Chat CSSA/msg | Sonnet | 1.297 | 1.500 | 1.20 | $0.035 | **1.10 RON** |
| S-14 | Mediere AI consens | Sonnet | 2.000 | 1.500 | 1.50 | $0.038 | **1.49 RON** |

## Servicii non-AI — Cost neglijabil

| Cod | Serviciu | Resurse | Cost acop. RON |
|-----|----------|---------|----------------|
| F-01..F-20 | Operații DB (CRUD, consens, scorare) | DB queries | **<0.01 RON** |
| F-13 | Export PDF | Render + DB | **~0.02 RON** |
| F-14 | Export Excel | ExcelJS + DB | **~0.01 RON** |
| F-12 | Raport pay gap | Calcul complex | **~0.03 RON** |

---

# PARTEA IV: PREȚURI DE VÂNZARE ÎN CREDITE

## A. Servicii individuale (debitate la consum)

| Cod | Serviciu | Credite | Preț RON | Cost acop. RON | Marja |
|-----|----------|---------|----------|----------------|-------|
| S-02 | Anunț recrutare | **4 cr** | 32 RON | 0.96 RON | **97.0%** |
| S-03 | Fișă KPI | **3 cr** | 24 RON | 0.73 RON | **97.0%** |
| S-05 | Extragere MVV | **2 cr** | 16 RON | 0.40 RON | **97.5%** |
| S-09 | Analiză post-evaluare | **4 cr** | 32 RON | 1.59 RON | **95.0%** |
| S-09b | Analiză job aprofundată | **4 cr** | 32 RON | 1.59 RON | **95.0%** |
| — | Generare grade salariale | **5 cr** | 40 RON | ~1.00 RON | **97.5%** |
| — | Simulare remunerare | **3 cr** | 24 RON | ~0.80 RON | **96.7%** |
| — | Raport pay gap | **3 cr** | 24 RON | ~1.60 RON | **93.3%** |
| — | Recalibrare consens | **2 cr** | 16 RON | 1.49 RON | **90.7%** |
| — | Videoconferință comisie (Faza 1) | **0 cr** | GRATUIT | $0 | **inclus** |
| — | Videoconferință comisie (Faza 2) | **2 cr** | 16 RON | ~1 RON | **93.8%** |
| — | Voce AI mediator/minut (Faza 2) | **3 cr** | 24 RON | ~2 RON | **91.7%** |

## B. Exporturi

| Export | Credite | Preț RON | Cost acop. RON | Marja |
|--------|---------|----------|----------------|-------|
| PDF | **5 cr** | 40 RON | 0.02 RON | **99.9%** |
| Excel | **5 cr** | 40 RON | 0.01 RON | **99.9%** |
| JSON | **5 cr** | 40 RON | <0.01 RON | **99.9%** |
| XML | **5 cr** | 40 RON | <0.01 RON | **99.9%** |

## C. Chat consultant HR

| Mod | Cost | Inclus | Marja |
|-----|------|--------|-------|
| **Familiarizare** (platformă) | **0 cr** | 135 min/lună gratuit | Negativ (investiție adopție) |
| **Consultanță** (profesională) | **3 cr/min** | Din sold credite | **~95%** |

Cost intern familiarizare: ~1.20 RON/msg × ~2 msg/min × 135 min = **~324 RON/lună/client**
Absorbit de: marja pe credite consumate (93-99%)

## D. Servicii incluse în pachete (fără debitare separată)

| Serviciu | Inclus în | Credite pachet | Cost acop./unitate |
|----------|----------|----------------|-------------------|
| S-01 Fișă de post AI | 12 cr/poz | Pachet Baza | 0.97 RON |
| S-04 Relevanță real-time | 0 | Gratuit | 0.29 RON |
| S-06 Upload fișă PDF/Word | 0 | Gratuit | 1.42 RON |
| S-08 Evaluare AI per poziție | 60 cr/poz | Pachet Baza | 0.86 RON |

---

# PARTEA V: PACHETE SERVICII (formule din calculator)

## A. Formule credite per layer

| Layer | Servicii | Formula credite |
|-------|---------|----------------|
| **1. Ordine internă (Baza)** | Evaluare JE AUTO + Fișe AI + Structură salarială | `60×poz + 12×poz + 20+1×ang` |
| **2. Conformitate (Nivelul 1)** | + Pay gap + Benchmark | `+ 15+0.5×ang + 30+1.5×poz` |
| **3. Competitivitate (Nivelul 2)** | + Pachete salariale + Performanță + Impact | `+ 25+1×poz + 15×ang + 40` |
| **4. Dezvoltare (Nivelul 3)** | + HR + Recrutare + Manual angajat | `+ 40+1×ang + 60×proiecte + 20+1.5×poz` |

## B. Exemple calculate (cost acoperitor vs preț)

### Companie mică: 10 poziții, 40 angajați

| Layer | Credite | Preț RON (8 RON/cr) | Cost acop. RON | Marja |
|-------|---------|---------------------|----------------|-------|
| Baza | 780 | 6.240 | ~20 | **99.7%** |
| + Conformitate | 850 | 6.800 | ~23 | **99.7%** |
| + Competitivitate | 1.505 | 12.040 | ~30 | **99.8%** |
| + Dezvoltare | 1.727 | 13.816 | ~35 | **99.7%** |

### Companie medie: 50 poziții, 200 angajați

| Layer | Credite | Preț RON | Cost acop. RON | Marja |
|-------|---------|----------|----------------|-------|
| Baza | 3.820 | 30.560 | ~100 | **99.7%** |
| + Conformitate | 3.990 | 31.920 | ~110 | **99.7%** |
| + Competitivitate | 7.115 | 56.920 | ~140 | **99.8%** |
| + Dezvoltare | 7.937 | 63.496 | ~160 | **99.7%** |

### Companie mare: 150 poziții, 800 angajați

| Layer | Credite | Preț RON | Cost acop. RON | Marja |
|-------|---------|----------|----------------|-------|
| Baza | 11.620 | 63.910 (5.50/cr) | ~310 | **99.5%** |
| + Conformitate | 12.255 | 67.403 | ~340 | **99.5%** |
| + Competitivitate | 24.430 | 134.365 | ~420 | **99.7%** |
| + Dezvoltare | 27.422 | 150.821 | ~480 | **99.7%** |

## C. Discount pe volum credite

| Pachet | Credite | RON | Per credit | Discount |
|--------|---------|-----|-----------|----------|
| Micro | 100 | 800 | 8.00 | 0% |
| Mini | 250 | 1.875 | 7.50 | 6% |
| Start | 500 | 3.500 | 7.00 | 12% |
| Business | 1.500 | 9.750 | 6.50 | 19% |
| Professional | 5.000 | 30.000 | 6.00 | 25% |
| Enterprise | 15.000 | 82.500 | 5.50 | 31% |

## D. Discount pe dimensiune companie

| Tip | Poziții | Angajați | Discount servicii |
|-----|---------|----------|-------------------|
| Starter | 1-50 | 1-50 | 0% |
| Professional | 51-150 | 51-150 | 12% |
| Enterprise | 150+ | 150+ | 25% |

---

# PARTEA VI: VARIANTE EVALUARE — CREDITE SUPLIMENTARE

## Deduse din DB prod (provider_costs + ai_operation_tiers)

| Variantă | Componente | Cost acop./poz | Credite suplim./poz | Sursa DB |
|----------|-----------|----------------|---------------------|----------|
| **A: Auto AI** | job-auto-evaluation (Haiku, amp 1.20) | 0.86 RON | **0** (inclus în 60 cr/poz) | ai_operation_tiers |
| **B: Comisie + AI** | mediation-facilitation (Sonnet, amp 1.50) | 1.49 RON | **+1 cr/poz** | ai_operation_tiers |
| **C: Comisie + Consultant** | human-specialist-min ($3.50 cov, ~7 min/poz) | 127.88 RON | **+20 cr/poz** | provider_costs |
| **D: Hibrid** | A complet + B pe ~30% posturi | 1.31 RON | **+1 cr/poz** | calcul derivat |

### Exemplu: 20 poziții

| Variantă | Credite pachet | Credite suplim. | Total credite | Total RON |
|----------|---------------|----------------|---------------|-----------|
| A: Auto AI | 1.200 | 0 | 1.200 | 9.600 |
| B: Comisie + AI | 1.200 | +20 | 1.220 | 9.760 |
| C: Comisie + Consultant | 1.200 | +400 | 1.600 | 12.800 |
| D: Hibrid | 1.200 | +20 | 1.220 | 9.760 |

### Comparație cu piața

| Provider | Cost 100 poz | Durată |
|----------|-------------|--------|
| Hay/Mercer | 25.000-75.000 RON | 3-6 luni |
| Consultant local | 15.000-40.000 RON | 2-4 luni |
| **JobGrade A (Auto AI)** | **~6.000 RON** | **minute** |
| **JobGrade C (Consultant)** | **~16.000 RON** | **1-2 săpt** |

---

# PARTEA VII: CONSULTANT HR — CHAT DIFERENȚIAT

## Implementat în `src/components/guide/NarrativeGuide.tsx`

| Mod | Badge | Cost | Inclus lunar | Clasificare |
|-----|-------|------|-------------|-------------|
| **FAMILIARIZARE** | 🟢 | 0 cr | 60 min/lună | Platformă, servicii, funcționalități |
| **CONSULTANȚĂ** | 🟡 | 3 cr/min | Din sold credite | Norme, lege, cod muncă, ITM, proceduri |

### Logica minutelor gratuite:
- **Scop:** familiarizare cu platforma — clientul nou explorează, întreabă cum funcționează
- **60 min/lună** — suficient pentru onboarding, scade natural cu vechimea clientului
- Clientul vechi nu mai are nevoie — știe deja platforma
- Consumul real estimat: 30-40 min luna 1, sub 10 min din luna 3+

### Mecanism:
- Counter minute gratuite: localStorage, reset lunar
- Clasificare intent: regex pe keywords profesionale
- Notificare tranziție: "Întrebarea ta implică consultanță profesională"
- Confirmare explicită: "Da, continui" / "Rămân pe familiarizare"
- Badge permanent vizibil

### Cost intern familiarizare (absorbit de abonament):
- ~1.20 RON/mesaj × ~2 mesaje/min × 60 min = **~144 RON/client/lună**
- La abonament 399 RON → **36% din abonament** — sustenabil
- Consumul real scade cu vechimea → cost efectiv ~30-50 RON/lună din luna 3+

---

# PARTEA VIII: ABONAMENT

| Componentă | Preț | Perioadă |
|-----------|------|---------|
| Abonament lunar | **399 RON** (fără TVA) | /lună |
| Abonament anual | **3.990 RON** (17% discount) | /an |

### Ce include abonamentul:
- Acces portal complet
- Dashboard diagnostic
- MVV draft din CAEN/website
- Profil sectorial
- Consultant HR familiarizare: 135 min/lună
- Smart activation (badge-uri servicii deblocate)
- Flying wheel (ghidaj contextual)
- Progres vizual (4 pași)
- Account export/import/reset (GDPR)

### Ce NU include (contra credite):
- Evaluare posturi
- Generare fișe de post
- Anunțuri recrutare
- KPI sheets
- Rapoarte (pay gap, analiză, export)
- Chat consultanță profesională
- Recalibrare consens

---

# PARTEA IX: VERIFICARE FEZABILITATE

## A. Scenariul cel mai favorabil (Auto AI, companie mică)

| Metric | Valoare |
|--------|---------|
| Venituri: abonament + 780 cr | 399 + 6.240 = **6.639 RON** |
| Costuri: CAPEX share + OPEX | 435 + 20 = **455 RON** |
| **Profit** | **6.184 RON (93%)** |

## B. Scenariul cel mai defavorabil (Consultant uman, chat intensiv)

| Metric | Valoare |
|--------|---------|
| Venituri: abonament + 1.600 cr (20 poz C) | 399 + 12.800 = **13.199 RON** |
| Costuri: CAPEX share + OPEX + consultant | 435 + 2.558 + 324 = **3.317 RON** |
| **Profit** | **9.882 RON (75%)** |

## C. Break-even platform

| Clienți | Venit lunar (abo) | CAPEX | Profit abo pur |
|---------|-------------------|-------|----------------|
| 1 | 399 | 1.738 | -1.339 |
| 3 | 1.197 | 1.738 | -541 |
| **5** | **1.995** | **1.738** | **+257** |
| 10 | 3.990 | 1.738 | +2.252 |

**Break-even CAPEX: 5 clienți** (doar din abonamente, fără credite).

---

# PARTEA X: REPLICABILITATE

## Cum se adaugă un serviciu nou

1. Definește serviciul (cod, rută API, model AI, unitate de consum)
2. Implementează cu `trackedAnthropic` (telemetry automat)
3. Adaugă `AIOperationTier` în DB (model real, model covering, amplification)
4. Măsoară tokeni reali din primele 10 execuții
5. Calculează cost acoperitor (Plasa 1 + Plasa 2)
6. Stabilește credite: `cost_acoperitor_RON / 8 × marjă_inversă`
7. Adaugă în `CREDIT_COSTS` din `src/lib/credits.ts`
8. Integrează în pachetul corespunzător din `src/lib/pricing.ts`
9. Actualizează acest document

## Cum se actualizează prețurile

1. Anthropic schimbă prețurile → actualizezi `provider_costs` în DB
2. Cursul BNR se schimbă semnificativ → actualizezi `credit_values`
3. Adaugi model nou → adaugi `ai_operation_tiers` + `provider_costs`
4. Recalculezi marjele → verifici fezabilitate
5. Dacă marja scade sub 80% pe un serviciu → crești creditele sau treci pe model mai ieftin

---

*Acest document este PERMANENT. Se actualizează, nu se înlocuiește.*
*Fiecare modificare se face cu data, autor, justificare.*
*Responsabili actualizare: COG (operațional), DMA (date), Marketing (strategie)*
*Owner aprobă modificările de preț final.*
