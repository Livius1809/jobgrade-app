# Handover sesiune 30.04.2026 (MARATHON)

## Cifre sesiune
- 14 commits pe prod
- ~4.000 linii noi
- 71 teste autotest (70 PASS)
- 73 posturi reale pe JG_itself
- 0 erori TypeScript

## Livrări majore

### Autotest + PIE
- Autotest JG_itself complet: 71 teste, 13 faze, toggle HUMAN/AI/MIXED
- PIE full-check intern: 22 verificări, escalare QLA→COA, cron 6h
- Fix AI JSON parsing (sanitizer + retry) — fișe post + manual calitate
- Fix FW chat (threadType + buildClientContext system user)
- GET /api/v1/jobs/[id] adăugat (lipsea)

### AI de Continuitate
- KB-first pipeline: buffer intermediar activ (nu fallback pasiv)
- Knowledge meter: contor cunoaștere per card/agent, 60+ agenți pe 13 categorii
- Knowledge debt: follow-up email "V-am rămas dator..." la revenire Claude
- Resilience endpoint: GET /api/v1/health/resilience
- Nivel maturitate: AVANSAT (79%), autonomie 35%

### Organizația reală
- Seed JG_itself: 73 posturi (71 AI + 2 HUMAN), 6 departamente
- 2 experți umani: 14.910 vs 15.904 RON (pay gap 6,7%)
- 10 salary records cu gender pentru pay gap
- KPI AI generate, hartă procese, compensare variabilă
- POST /api/v1/salary-data endpoint nou

### Demo & Pricing
- Demo snapshot anonimizat: GET /api/v1/demo/snapshot
- 3 tier-uri abonament: Essentials (299), Business (599), Enterprise (999)
- Preț/credit per tier: 8.00 / 6.50 / 5.50 RON
- Calculator per card (C1=poziții, C2=angajați)
- Delta incrementală (creștere + scădere + conversie downgrade)
- Validare fiscală RO (art. 134 Cod Fiscal)

## Decizii strategice salvate
- Sandbox public pre-înregistrare + validare culturală L2
- Transparență totală pe piața RO (nu freemium anglo-saxon)
- 3 abonamente cu logică inversă credite
- Calculator per card (input progresiv)
- Credite nu expiră niciodată
- Downgrade nelimitat + conversie în credite
- Pauză gratuită, date păstrate 24 luni
- Delta: plătești doar diferența, nu de la zero
- AI de Continuitate: KB = buffer intermediar activ, nu fallback
- Dependența Claude scade cantitativ dar CREȘTE calitativ

## Blockers pentru primul client (P3) — actualizat
1. ~~Stripe price IDs~~ — REZOLVAT (12 price IDs test mode pe Vercel)
2. **Sandbox public** — /b2b/sandbox LIVE dar fără dashboard vizual (chat-only). PRIORITATE #1 sesiune viitoare. Trebuie: organigramă vizuală, calendar obligații, scor structură, benchmark — toate live pe măsură ce clientul introduce date.
3. Calculator UI per card (1 zi, Claude) — pricing.ts gata, UI de refactorizat
4. Pagina prețuri 3 tier-uri (1 zi, Claude + L2)

## Decizii Stripe
- Monthly = recurring subscription
- Annual = one-off (reînnoire manuală, decizie Owner)
- Credite = one-off
- Test mode activ (sk_test), live mode pregătit (sk_live în .env local)
- 12 price IDs configurate pe Vercel prod
- Checkout funcțional: Essentials ✅, Business ✅, Credite ✅

## Middleware
- authorized callback în auth.ts — public paths whitelist
- /b2b/* confirmat public (sandbox funcționează la /b2b/sandbox)
- Next-Auth v5 generează middleware automat — nu șterge, configurează prin authorized

## Cont JG_itself
- Email: demo@jobgrade.ro / Demo2026!
- Tenant: cmolbwrlr000004jplchaxsy8
- 73 posturi, 6 departamente, 10 salary records, pay gap 6,7%
