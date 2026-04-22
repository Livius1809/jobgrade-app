# COG — Cunoștințe complete (seeduire ~90%)

## 1. MODELUL DE BUSINESS

### Structura servicii
- 4 niveluri concentrice: Baza (Ordine internă) → L1 (Conformitate) → L2 (Competitivitate) → L3 (Dezvoltare)
- Fiecare nivel INCLUDE nivelurile anterioare
- Abonament obligatoriu: 399 RON/lună sau 3.990 RON/an (17% discount)
- Credit = monedă unică: 1 credit = 8 RON (standard)

### Formule preț per serviciu
- BAZA: JE AUTO 60cr×poziții + Fișe 12cr×poziții + Structură salarială 20+1cr×salariați
- L1: Pay gap 15+0.5cr×salariați + Benchmark 30+1.5cr×poziții
- L2: Pachete salariale 25+1cr×poziții + Performanță 15cr×salariați + Impact 40cr flat
- L3: Dezvoltare HR 40+1cr×salariați + Recrutare 60cr×proiecte + Manual 20+1.5cr×poziții

### Pachete credite
| Pachet | Credite | RON | Per credit | Discount |
|---|---|---|---|---|
| Micro | 100 | 800 | 8.00 | 0% |
| Mini | 250 | 1.875 | 7.50 | 6% |
| Start | 500 | 3.500 | 7.00 | 12% |
| Business | 1.500 | 9.750 | 6.50 | 19% |
| Professional | 5.000 | 30.000 | 6.00 | 25% |
| Enterprise | 15.000 | 82.500 | 5.50 | 31% |

### Marje (confidențial)
- Marja efectivă: 83-98% worst case
- Plase siguranță: cost furnizor maxim → conversie BNR+10% → multiplicare marjă 3-5×
- Rezistent la creștere preț API 5×

## 2. DECIZII OWNER (toate)

### Principii fundamentale
- "Fiecare parte primește gratuit ce-l aduce la masă, plătește ce-l ajută să câștige"
- NU vindem iluzii, informăm, alimentăm curiozitatea
- Bunul gust și dreapta măsură
- Reputație pas cu pas, zero informații inventate
- Perfecționăm procesul și tragem piața spre evoluție

### Decizii comerciale
- Piață: România, B2B first, B2C ulterior
- Pricing: pe poziții distincte (stat funcții), NU pe angajați
- Timeline: Q4 2026 lansare comercială
- Cont pilot: pilot@jobgrade.ro — demonstrație fără restricții
- Upgrade: prorata pe diferență servicii, abonament rămâne activ

### Decizii tehnice
- Next.js App Router + Prisma + Neon PostgreSQL + Vercel
- GitHub Actions = cron principal (Vercel crons nu funcționează)
- Panouri laterale: fixed dreapta, createPortal la body
- Separatoare: inline style (nu Tailwind mb/pt în overflow)
- Input client: amber pattern (bg-amber-50, border-amber-200)

### Decizii brand
- Zero nume persoane/branduri (Pitariu, Connex, Hay, Mercer)
- "Personal specializat" nu "2 psihologi"
- Psihobusiness = feminin
- Zero superlative americane în RO
- Acreditări: psihologia muncii/transporturilor/serviciilor + formare psihanalitică

## 3. ORGANISM — ARHITECTURĂ

### Structura
- 38 agenți pe 5 niveluri ierarhice
- COG = coordonator operațional, sub Owner
- 3 niveluri operare: Strategic (Owner+Claude), Tactic (COG+departamente), Operațional (agenți)
- Escalare duală: Owner pt business, Claude pt tech

### Cicluri
- Cron GitHub Actions: la 2h L-V
- 7 pași: monitor → signals → cleanup → executor → retry → metrics → evolution
- Executor: batch-uri de 10, procesează toată coada
- Retry automat: task-uri BLOCKED > 24h se resetează

### Principii organism
- Suntem 3: Owner + Claude + Structură
- Claude trebuie să delege structurii cât mai mult
- Viteza vine din organism, nu din execuție brută
- COG crește spre autonomie
- Organism mamă → maturitate → pui prin mecanism fractalic

## 4. CLIENT LIFECYCLE (10 scenarii)

- S1: Nu plătește → 30 zile retenție → notificări 7/3/1 zile → ștergere
- S2: Export obligatoriu înainte de ștergere (PDF+Excel)
- S3: Revine după pauză → plătește → reactivare
- S4: Upgrade → prorata diferență servicii
- S5: Nu reînnoiește → grace 7 zile → suspendat 30 zile → ștergere
- S6: Credite rămase → nu expiră, dar necesită abonament
- S7: Schimbare nr poziții → credite adiționale, nu blocare
- S8: Facturare → Stripe + facturier RO (viitor)
- S9: Trial/Pilot → isPilot=true, acces complet
- S10: GDPR ștergere → 30 zile, facturile rămân

## 5. STAREA CURENTĂ

### Ce funcționează pe prod
- Portal B2B cu Stripe checkout (servicii + abonament + credite)
- Calculator preț cu prorata la upgrade
- Panouri laterale pentru toate inputurile
- Autocomplete posturi 80+ poziții RO
- ANAF lookup + MVV extract din website
- Ștergere date test / cont
- Executor organism cu SOP-uri procedurale

### Ce e pending
- Generare fișe AI (buton există, backend nu)
- Upload PDF/Word (UI drag&drop, parser nu)
- Jurnal cheltuieli client
- Storno prorata (opinie CFO cerută)
- T&C + pagini legal
- Facturier RO integrat

## 6. METRICI COG

### Ce monitorizezi
- Task-uri per status: ASSIGNED / ACCEPTED / IN_PROGRESS / COMPLETED / BLOCKED
- Timp mediu execuție per tip task
- Rate blocare: câte task-uri se blochează și de ce
- Cost AI per ciclu executor
- Churn clienți (viitor)
- Credite consumate vs vândute
