# Handover sesiune 21.04.2026

## Ce funcționează ACUM pe prod (jobgrade.ro)

### Portal B2B — flow complet
1. **Login** → pagina portal cu progres vizual
2. **Compania ta** → panou lateral cu ANAF lookup + MVV extrase din website + salvare API
3. **Pachete servicii** → 4 carduri (Baza/Conformitate/Competitivitate/Dezvoltare)
4. **Calculator preț** → servicii + abonament (toggle lunar/anual) + credite opționale → un singur "Plătește"
5. **Stripe checkout** → plată test (4242...) → redirect portal cu toast
6. **Post-plată**: card colorat 20% + badge ACTIV, inputuri deblocate
7. **Upgrade**: carduri superioare cu badge UPGRADE, prorata (diferență servicii), poziții/salariați read-only
8. **Credite-only**: selectează din tabel → Plătește direct
9. **Buton "Cumpără" în navbar** → deschide direct calculatorul cu situația curentă

### Date intrare client
10. **Tab Posturi**: autocomplete 80+ poziții RO, sugestie departament, dropdown 14 dept standard + "Altele", salvare API, lista posturilor cu ✕ pentru ștergere
11. **Tab Fișe de post**: dropdown populat din posturile adăugate (buton AI neconectat)
12. **Tab Stat de funcții**: formular UI (neconectat)
13. **Tab Date salariale**: link la /compensation
14. **Upload PDF/Word**: drag&drop zone UI (neconectat)

### Cont Pilot
15. **"Cont Pilot" în navbar**: Șterge date (raw SQL) / Șterge cont (CASCADE)

### Alte
16. **Credite disponibile** afișate în header
17. **Bara relevanță** colorată per tab (0-100%)
18. **Secțiunile Evaluare/Rapoarte** cu stări locked/active/done

## Ce NU funcționează / PENDING

### Critice (blocker pentru pilot real)
- [ ] **Generare fișe AI**: buton există dar nu e wired la Claude API
- [ ] **Upload PDF/Word**: UI drag&drop există, backend parser lipsește (pdf-parse + mammoth.js)
- [ ] **Stat de funcții**: formular UI există, nu salvează
- [ ] **Ștergere date test**: funcționează parțial (unele FK pot bloca)

### Importante (pre-lansare)
- [ ] **Jurnalul cheltuieli client** (docs/decisions/2026-04-21_account-lifecycle/06_upgrade_si_jurnal.md)
- [ ] **Upgrade cu storno prorata** (opinia CFO cerută, task creat)
- [ ] **T&C + comunicare client** (10 scenarii lifecycle documentate, 5 task-uri în organism)
- [ ] **Pagini legal**: Termeni, Confidențialitate, Cookies
- [ ] **Profilul firmei**: câmpul "Denumire" nu se pre-completează din ANAF automat (trebuie click "Preia din ANAF")

### Nice to have
- [ ] Autocomplete posturi din DB client (nu doar lista statică)
- [ ] Departamentele custom se adaugă în dropdown viitor
- [ ] Export date client (ZIP cu tot)
- [ ] Facturier RO integrat (SmartBill/Oblio)

## Decizii documentate (arbore complet)
```
docs/decisions/2026-04-21_account-lifecycle/
├── 01_context.md          — de ce am stabilit lifecycle
├── 02_scenarii.md         — 10 scenarii cu implicații COG/CJA/COA/CFO
├── 03_comunicare_client.md — canale, template email, T&C
├── 04_schema_db.md        — câmpuri noi, stări, tranziții
├── 05_todo_verificare.md  — checklist per departament
├── 06_upgrade_si_jurnal.md — upgrade/credite/jurnal specificații
├── 07_upgrade_prorata.md  — decizie Owner: storno + preț întreg
└── _last-handover.md      — ACEST FIȘIER
```

## Task-uri active în organism
- COG: verificare scenarii lifecycle (HIGH)
- CJA: GDPR + T&C (HIGH)
- COA: schema DB + API export (HIGH)
- DMA: template-uri comunicare (MEDIUM)
- CFO: implicații fiscale + opinie storno upgrade (HIGH)

## Pattern-uri stabilite (obligatorii)
- **Panouri laterale**: fixed dreapta, createPortal la body, ancorat la conținut
- **Input client**: bg-amber-50, border-amber-200, text-[10px] text-amber-700 uppercase
- **Separatoare**: inline style `div style={{ height }}` — NU Tailwind mb/pt
- **Checkout**: un singur "Plătește" care agregă tot
- **Carduri servicii**: icon dreapta-sus, include notes, nr + titlu – nivel

## Fișiere cheie modificate azi
- `src/components/portal/PackageExplorer.tsx` — calculator preț complet
- `src/components/portal/ClientDataTabs.tsx` — taburi input cu autocomplete
- `src/components/portal/PortalClientSection.tsx` — wrapper state + profil companie
- `src/components/portal/AccountMenu.tsx` — Cont Pilot dropdown
- `src/components/portal/BuyButton.tsx` — Cumpără din navbar
- `src/app/(portal)/portal/page.tsx` — portal page server
- `src/app/(portal)/layout.tsx` — layout cu navbar
- `src/app/api/v1/billing/checkout/route.ts` — checkout service + credits + upgrade
- `src/app/api/v1/billing/webhook/route.ts` — webhook service purchase
- `src/app/api/v1/account/reset/route.ts` — ștergere date/cont
- `src/app/api/v1/jobs/route.ts` — GET + POST jobs
- `src/app/api/v1/departments/route.ts` — upsert + GET departments
- `src/lib/pricing.ts` — formule pricing shared client+server
- `prisma/schema.prisma` — ServicePurchase model
