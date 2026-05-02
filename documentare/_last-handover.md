# Handover sesiune 02.05.2026

## Fix-uri organism
- KB Health: promoteValidatedArtifacts() — appliedCount>=3 → validated:true
- Review Queue: autoApproveStaleReviews() — >3 zile → auto-approve
- Operational Engine: praguri reduse (5→3 zile review, 14→7 zile zombie)
- Landing pages verificate: CURATE (zero autori/scale pe toate)

## Dual mode Stripe + switch-uri plată
- getStripe(mode): test vs live, instanțe separate
- detectStripeMode(): automat din context (sandbox/pilot/client real)
- Switch: billing (monthly/annual) × renewal (auto/manual)
- STRIPE_MODE=test pe Vercel, fallback pe STRIPE_SECRET_KEY
- DE FĂCUT: 18 price IDs (3 annual recurring test + 15 live) — Owner

## Identitate Rareș — Ghidul JobGrade
- Chip aprobat: public/guide-avatar.jpg (Firefly, Owner approved)
- Nume: Rareș (AI) — Ghidul JobGrade
- Owner: Liviu — Senior Consultant, Echipa de proiect JobGrade
- Voice persona completă: voice-persona.ts
- Identitate vizuală: guide-visual-identity.ts
- 10 variante vestimentare: 4 B2B + 6 B2C — Owner generează
- 5 scripturi audiție voce ElevenLabs
- Sală virtuală 3D: concept salvat, 3 niveluri

## Video-uri
- Script 01: Prezentare Owner (2-3 min)
- Script 02: Interviu Rareș × Liviu (5-7 min)
- Clipuri per platformă: YT, LinkedIn, FB, Reels

## Brief unificat conținut
- documentare/brief-continut-unificat.md — pentru toată structura
- 6 reguli, workflow 7 pași, checklist 10 puncte

## DE FĂCUT
1. 10 variante avatar Rareș (Owner — Firefly)
2. 18 price IDs Stripe (Owner — Dashboard)
3. Voce ElevenLabs RO (Owner + Claude)
4. Filmare video prezentare (Owner)
5. Animare Rareș interviu (Claude + D-ID/HeyGen)
6. Montaj (Owner — Premiere)
7. Clipuri per platformă (Owner)
8. Test onboarding e2e (Owner + Claude)
9. Integrare avatar Rareș în chat (Claude)
10. Sală virtuală Nivel 1 (Claude)

## Cont JG_itself
- demo@jobgrade.ro / Demo2026!
- 73 posturi, 6 departamente, 10 salary records
