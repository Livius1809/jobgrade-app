# Cunoștințe șefi departament (~75%)

---

## COA — Chief Operations Architect

### Stack tehnic
- Next.js 16+ App Router, Turbopack, TypeScript
- Prisma 7.7 cu PrismaPg adapter, Neon PostgreSQL
- DB dev: ep-odd-water | DB prod: ep-divine-union (CRITIC: verifică EXPLICIT)
- Vercel deploy automat la push pe main
- GitHub Actions: cron organism, vital-signs, deploy
- Stripe: checkout, webhooks, credit management
- Anthropic Claude API: Haiku (operațional), Sonnet (complex)

### Pattern-uri obligatorii
- `getAppUrl()` pentru URL resolution (nu process.env direct)
- `force-dynamic` pe orice pagină cu DB query
- `MSYS_NO_PATHCONV=1` pentru Vercel CLI pe Windows Git Bash
- Panouri laterale: fixed dreapta, createPortal la body
- Separatoare: inline style height (nu Tailwind mb/pt)
- Input client: amber pattern
- JSX: fără ghilimele românești în atribute

### Fișiere cheie
- prisma/schema.prisma — sursa de adevăr modele
- src/lib/pricing.ts — formule preț shared
- src/lib/stripe.ts — config Stripe + pachete
- src/lib/agents/ — pipeline executor organism
- src/components/portal/ — UI portal B2B
- docs/decisions/ — arbori de decizii
- docs/sops/ — proceduri operaționale

---

## CJA — Chief Juridical Advisor

### Cadru legal aplicabil
- Directiva EU 2023/970: transparență salarială, Art. 4 (criterii evaluare), Art. 6 (structuri salariale), Art. 9 (raportare pay gap), Art. 10 (evaluare comună)
- GDPR Reg. 679/2016: Art. 6 (baze legale), Art. 13-14 (informare), Art. 17 (ștergere), Art. 20 (portabilitate), Art. 30 (registru)
- AI Act Reg. 2024/1689: Art. 14 (supraveghere umană), clasificare risc
- Codul Muncii RO: relații de muncă, discriminare, egalitate
- Codul Fiscal: TVA, facturare, retenție 10 ani
- Proiect lege transpunere directivă (martie 2026): amenzi 10.000-30.000 RON

### GDPR specific platformă
- 17 categorii date procesate (Art. 30 registru completat 02.04.2026)
- DPA template pregătit
- Privacy Policy aprobată
- TIA Anthropic (transfer date SUA) — documentat
- Retenție: 30 zile post-expirare cont, facturi 10 ani
- B2C: pseudonim obligatoriu (privacy by design, 2 straturi)

### Psihobusiness Consulting SRL
- CIF: RO15790994
- Plătitoare TVA
- B2B: fără TVA (reverse charge dacă client RO plătitor TVA)
- B2C: cu TVA inclus

---

## CFO — Chief Financial Officer

### Model financiar
- Venituri: abonamente + servicii one-time + credite
- Costuri fixe: ~$52/lună (Vercel $20, Neon $19, Redis $10, DNS $3)
- Costuri variabile: ~$94/lună organism + cost AI per serviciu
- Marje: 83-98% worst case per layer
- 3 plase siguranță: cost furnizor maxim → BNR+10% → marjă 3-5×

### Prețuri AI (Anthropic)
- Claude Sonnet: $3/$15 per 1M tokeni (input/output)
- Claude Haiku: $0.80/$4 per 1M tokeni
- Cost real JE AUTO: ~$0.10/poziție → preț vânzare 60 credite (480 RON/10 poziții)

---

## DMA — Director Marketing

### Strategie 7P
- Product: evaluare posturi + structură salarială + conformitate EU
- Price: credit-based, transparent, calculator dinamic
- Place: online (portal), piață RO
- Promotion: LinkedIn B2B, Media Books, landing pages
- People: personal specializat (psihologi CPR + AI)
- Process: flow ghidat conversațional
- Physical evidence: rapoarte profesionale, simulator interactiv

### Calendar 2026
- Apr-Jun: dezvoltare platformă + pilot
- Jul-Sep: primii clienți plătitori
- Oct-Dec: lansare comercială completă
- Buget bootstrap: 115K RON

---

## COCSA — Chief Client Success

### Metrici client success
- Time-to-value: cât durează de la plată la primul raport
- Adoption rate: ce % din features cumpărate sunt folosite
- NPS: satisfacție (target >40)
- Churn rate: target <5%/lună
- Credit utilization: câte credite consumă vs câte a cumpărat

### Flow onboarding
1. Plată → toast succes → inputuri deblocate
2. Completare profil (CUI + ANAF auto)
3. Adăugare posturi (autocomplete 80+)
4. Generare fișe AI
5. Evaluare AI → clasament
6. Raport master → validare → semnătură

---

## CIA — Chief Intelligence

### Surse monitorizate
- EUR-Lex: directive EU noi/modificate
- Camera Deputaților/Senat: proiecte lege transpunere
- ANAF/MFP: modificări fiscale
- INS TEMPO: date statistice piață muncii
- Portaluri recrutare: tendințe salariale
- Anthropic/OpenAI blog: modificări API, pricing, modele noi
