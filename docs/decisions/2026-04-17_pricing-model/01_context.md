# Context — De ce am stabilit modelul de pricing

**Data:** 17.04.2026 (seara)
**Participanți:** Owner (Liviu) + Claude

## Problema
Platforma avea nevoie de un model de pricing concret, implementabil în Stripe, bazat pe costuri reale de resurse, nu pe estimări.

## Cerințe Owner
1. Prețul să reflecte costul real + marjă, nu un număr inventat
2. Plase de siguranță: cost furnizor maxim + conversie BNR+10%
3. Model concentric (BAZA + 3 Layere), clientul plătește cumulativ
4. Calculator dinamic: nr poziții + nr salariați → preț exact
5. Discount pe volum, transparent

## Surse utilizate
- `docs/cost-per-interaction-analysis.md` — costuri AI per tip interacțiune (02.04.2026)
- Prețuri Anthropic API (Claude Sonnet: $3/$15 per 1M tokeni)
- Costuri infrastructură (Vercel, Neon, Redis, storage)
- Pricing consultanți tradiționali (Hay, Mercer: 25.000-250.000 RON)
