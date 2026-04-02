# Analiză Cost per Tip de Interacțiune
## Fundament pentru strategia de produs și pricing

**Data:** 02.04.2026
**Destinatari:** Owner, COG, COCSA, PMA (strategie produs/preț)
**Model AI:** Claude Sonnet 4 ($3/1M tokeni input, $15/1M tokeni output)

---

## 1. CATALOGUL INTERACȚIUNILOR

### A. CHAT / DIALOG (conversație cu agent AI)

| Cod | Tip interacțiune | Input tokeni | Output tokeni | Cost estimat | Notă |
|-----|-------------------|-------------|---------------|-------------|------|
| C-01 | **Mesaj simplu** — întrebare scurtă, răspuns scurt | 4.500-5.500 | 200-400 | **$0.015-0.02** | Întrebare de clarificare, confirmare |
| C-02 | **Mesaj conversațional** — dialog cu context | 6.000-8.000 | 400-800 | **$0.02-0.04** | Discuție ghidată, explorare temă |
| C-03 | **Mesaj complex** — analiză, argumentare, history lungă | 8.000-12.000 | 800-1.500 | **$0.04-0.06** | Consiliere, interpretare rezultate |
| C-04 | **Mesaj de profunzime** — reflecție, insight, reframare | 10.000-15.000 | 1.000-2.000 | **$0.05-0.08** | Sesiune de coaching, moment „aha" |
| C-05 | **Sesiune completă** (10-15 mesaje medii) | Suma | Suma | **$0.30-0.50** | O sesiune tipică de consiliere |

### B. CHESTIONARE / TESTE (B2C)

| Cod | Tip interacțiune | Input tokeni | Output tokeni | Cost estimat | Notă |
|-----|-------------------|-------------|---------------|-------------|------|
| Q-01 | **Generare chestionar** — AI creează întrebări adaptate | 5.000-8.000 | 1.500-3.000 | **$0.04-0.07** | O singură dată per chestionar |
| Q-02 | **Interpretare răspunsuri** — AI analizează completarea | 6.000-10.000 | 1.000-2.000 | **$0.04-0.06** | Per completare de chestionar |
| Q-03 | **Profil generat** — sinteză din multiple chestionare | 10.000-15.000 | 2.000-3.000 | **$0.07-0.10** | Profil complet Herrmann/VIA/etc. |
| Q-04 | **Feedback pe chestionar** — explicare rezultate prin chat | 8.000-12.000 | 1.000-2.000 | **$0.05-0.08** | Dialog post-chestionar |

### C. LIVRABILE (documente generate)

| Cod | Tip interacțiune | Input tokeni | Output tokeni | Cost estimat | Notă |
|-----|-------------------|-------------|---------------|-------------|------|
| L-01 | **Fișă de post generată** — AI scrie fișa completă | 6.000-8.000 | 2.000-4.000 | **$0.05-0.08** | Per fișă |
| L-02 | **Raport evaluare posturi** — ierarhie + explicații | 8.000-12.000 | 3.000-5.000 | **$0.07-0.10** | Per sesiune de evaluare |
| L-03 | **Raport pay gap** — analiză diferențe salariale | 10.000-15.000 | 3.000-5.000 | **$0.08-0.12** | Per generare |
| L-04 | **Raport conformitate UE** — audit trail Directiva 2023/970 | 8.000-12.000 | 2.000-4.000 | **$0.06-0.10** | Per generare |
| L-05 | **Anunț recrutare** — text generat AI | 5.000-7.000 | 1.000-2.000 | **$0.03-0.05** | Per anunț |
| L-06 | **Conținut social media** — postare LinkedIn | 5.000-7.000 | 500-1.000 | **$0.02-0.04** | Per postare |
| L-07 | **Fișă KPI** — indicatori per post | 6.000-8.000 | 1.500-3.000 | **$0.04-0.07** | Per fișă |
| L-08 | **Plan dezvoltare personală** (B2C) — parcurs ghidat | 10.000-15.000 | 3.000-5.000 | **$0.08-0.12** | Per plan generat |
| L-09 | **Raport evoluție** (Owner/Client) — 8 dimensiuni | 8.000-12.000 | 2.000-3.000 | **$0.05-0.08** | Per generare |

### D. OPERAȚIUNI AUTOMATE (fără interacțiune directă client)

| Cod | Tip interacțiune | Input tokeni | Output tokeni | Cost estimat | Notă |
|-----|-------------------|-------------|---------------|-------------|------|
| A-01 | **Ciclul proactiv** — evaluare subordonați | 6.000-10.000 | 1.000-2.000 | **$0.04-0.06** | Per ciclu per manager |
| A-02 | **Reflecție zilnică** — auto-evaluare agent | 5.000-8.000 | 800-1.500 | **$0.03-0.05** | Per agent per zi |
| A-03 | **Cross-pollination** — cafea virtuală | 6.000-8.000 | 1.000-1.500 | **$0.03-0.05** | Per pereche |
| A-04 | **Brainstorming** — generare idei | 6.000-10.000 | 1.500-2.500 | **$0.04-0.06** | Per agent per sesiune |
| A-05 | **KB Distilare** — extragere cunoaștere | 6.000-8.000 | 1.000-2.000 | **$0.03-0.05** | Per agent |
| A-06 | **Sentinel** — detectare pattern-uri | 5.000-8.000 | 500-1.000 | **$0.02-0.04** | Per rulare |
| A-07 | **Calibrare Owner** — verificare L1+L2+L3 | 0 (regex) | 0 | **$0.00** | Fără cost AI — e pattern matching |

---

## 2. PACHETE TIPICE DE SERVICII

### Pachet B2B „Evaluare posturi" (o sesiune completă)

| Componentă | Cantitate | Cost unitar | Cost total |
|-----------|----------|-------------|------------|
| Generare fișe de post (AI) | 10 fișe | $0.07 | $0.70 |
| Sesiune evaluare (facilitare consens) | 1 | $0.10 | $0.10 |
| Raport ierarhie + grade | 1 | $0.10 | $0.10 |
| Raport conformitate UE | 1 | $0.10 | $0.10 |
| Chat consiliere HR (10 mesaje) | 10 | $0.03 | $0.30 |
| **TOTAL COST AI** | | | **$1.30** |

### Pachet B2B „Monitorizare lunară"

| Componentă | Cantitate | Cost unitar | Cost total |
|-----------|----------|-------------|------------|
| Chat consiliere (50 mesaje/lună) | 50 | $0.03 | $1.50 |
| Raport pay gap lunar | 1 | $0.10 | $0.10 |
| Raport conformitate | 1 | $0.10 | $0.10 |
| Anunțuri recrutare (3/lună) | 3 | $0.04 | $0.12 |
| Conținut social (4/lună) | 4 | $0.03 | $0.12 |
| **TOTAL COST AI** | | | **$1.94** |

### Pachet B2C „Descoperă-te" (parcurs individual)

| Componentă | Cantitate | Cost unitar | Cost total |
|-----------|----------|-------------|------------|
| Sesiuni chat Călăuza (5 × 12 mesaje) | 60 | $0.04 | $2.40 |
| Chestionare generate (3) | 3 | $0.06 | $0.18 |
| Interpretare chestionare (3) | 3 | $0.06 | $0.18 |
| Profil complet generat | 1 | $0.10 | $0.10 |
| Plan dezvoltare personală | 1 | $0.10 | $0.10 |
| Raport evoluție (2) | 2 | $0.07 | $0.14 |
| Feedback pe rezultate (3 sesiuni) | 36 | $0.04 | $1.44 |
| **TOTAL COST AI** | | | **$4.54** |

---

## 3. COSTURI OPERAȚIONALE AUTOMATE (background, fără client)

### Cost zilnic al organizației (45 agenți activi):

| Operațiune | Frecvență | Agenți | Cost/run | Cost/zi |
|-----------|----------|--------|----------|---------|
| Reflecție zilnică | zilnic | 45 | $0.04 | $1.80 |
| Metrici colectare | zilnic | 1 run | $0.05 | $0.05 |
| Raport zilnic Owner | zilnic | 1 run | $0.07 | $0.07 |
| Cross-pollination | zilnic, 3 perechi | 3 | $0.04 | $0.12 |
| Sentinel | zilnic | 1 run | $0.03 | $0.03 |
| Ciclu proactiv (7 manageri × 3/zi) | 3×/zi | 7 | $0.05 | $1.05 |
| **TOTAL/ZI** | | | | **$3.12** |
| **TOTAL/LUNĂ** | | | | **~$94** |

### Cost la 3 zile (rapoarte periodice):

| Operațiune | Cost |
|-----------|------|
| Raport evoluție agenți | $0.07 |
| Raport evoluție Owner | $0.07 |
| KB distilare | $0.05 × 45 = $2.25 |
| Business plan (săptămânal) | $0.07 |
| **TOTAL/3 zile** | **~$2.46** |

---

## 4. FACTORI DE VARIAȚIE

### Ce crește costul:
- **History lungă** — conversații cu 20+ mesaje acumulează context
- **KB mare** — agent cu 200+ entries injectează mai mult
- **Documente din bibliotecă** — fiecare doc adaugă tokeni
- **Răspunsuri detaliate** — analize lungi costă mai mult la output
- **Calibrare L1+L2+L3** — adaugă ~1.000-2.000 tokeni la input

### Ce reduce costul:
- **Cache** — răspunsuri identice servite fără apel AI
- **Model Haiku** — 10x mai ieftin ($0.25/$1.25 per 1M tokeni) pentru interacțiuni simple
- **Reducere KB injectat** — 3 entries în loc de 8
- **Prompt optimization** — eliminare redundanțe din system prompt
- **Batch processing** — gruparea operațiunilor automate

### Strategie model hibrid (recomandat):
| Complexitate | Model | Cost relativ |
|-------------|-------|-------------|
| Chat simplu, FAQ | **Haiku** | 10x mai ieftin |
| Consiliere, analiză | **Sonnet** | Standard |
| Rapoarte complexe, profiling | **Sonnet** | Standard |
| Evaluare psihometrică | **Opus** (dacă e necesar) | 5x mai scump |

---

## 5. METRICI CHEIE PENTRU PRICING

| Metrică | Valoare |
|---------|---------|
| Cost AI mediu per interacțiune | **$0.03** |
| Cost AI per sesiune completă (15 mesaje) | **$0.45** |
| Cost AI per pachet B2B de bază | **$1.30** |
| Cost AI per pachet B2C complet | **$4.54** |
| Cost operațional lunar (background) | **~$94** |
| Markup minim recomandat | **10x-20x** costul AI |
| Preț minim viabil pachet B2B | **~50-100 RON/lună** |
| Preț minim viabil pachet B2C | **~30-50 RON/parcurs** |

---

## 6. RECOMANDĂRI PENTRU STRATEGIE PRICING

1. **Nu vinde pe mesaj** — vinde pe valoare livrată (pachet, parcurs, rezultat)
2. **Costul AI e neglijabil** — ~2-5% din prețul final; restul e valoare expertă
3. **Diferențiază pe complexitate** — chat simplu vs. consiliere profundă
4. **Include operațiunile background** — ele fac platforma „vie" și sunt diferențiator
5. **Model freemium posibil** — 10 mesaje gratuite/lună (cost: $0.30) atrag clienți
6. **Scalabilitate excelentă** — costul marginal per client e foarte mic

---

*Acest document trebuie actualizat la fiecare modificare de model AI sau de preț Anthropic.*
*Prețurile Anthropic pot varia — verifică [anthropic.com/pricing](https://www.anthropic.com/pricing)*
