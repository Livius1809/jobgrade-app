# Decizia finală — Pricing Model JobGrade B2B

**Data deciziei:** 17.04.2026
**Aprobat de:** Owner (Liviu)

## Structura aprobată

### Abonament obligatoriu
- 399 RON/lună sau 3.990 RON/an (17% discount)
- Include: acces portal, dashboard diagnostic, MVV draft, profil sectorial, consultant HR 135 min/lună
- NU include credite

### Credit = monedă unică
- 1 credit = 8 RON (preț standard)
- Tot ce se consumă pe platformă se exprimă în credite

### Pachete credite
| Pachet | Credite | RON | Per credit | Discount |
|---|---|---|---|---|
| Micro | 100 | 800 | 8.00 | 0% |
| Mini | 250 | 1.875 | 7.50 | 6% |
| Start | 500 | 3.500 | 7.00 | 12% |
| Business | 1.500 | 9.750 | 6.50 | 19% |
| Professional | 5.000 | 30.000 | 6.00 | 25% |
| Enterprise | 15.000 | 82.500 | 5.50 | 31% |

### Formulele per layer (din PackageSelector.tsx)
**BAZA:**
- Evaluare posturi JE AUTO: 60 credite × poziții
- Fișe de post AI: 12 credite × poziții
- Structură salarială: 20 + 1 × angajați

**Layer 1 — Conformitate:**
- Pay gap Art. 9: 15 + 0.5 × angajați
- Benchmark salarial: 30 + 1.5 × poziții

**Layer 2 — Competitivitate:**
- Pachete salariale: 25 + 1 × poziții
- Evaluare performanță: 15 × angajați
- Impact bugetar: 40 flat

**Layer 3 — Dezvoltare:**
- Dezvoltare HR: 40 + 1 × angajați
- Recrutare: 60 × proiecte (20% din poziții)
- Manual angajat: 20 + 1.5 × poziții

### Implementare
- `src/lib/stripe.ts` — pachete credite + abonament
- `src/components/portal/PackageSelector.tsx` — calculator dinamic
- `src/components/portal/PackageExplorer.tsx` — noul calculator portal
- Stripe checkout cu `price_data` on-the-fly
- Webhook: creditare automată post-plată
