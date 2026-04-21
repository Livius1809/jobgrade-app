# Context — Ciclul de viață al contului client B2B

**Data:** 21.04.2026
**Participanți:** Owner (Liviu) + Claude
**Status:** DE VERIFICAT cu COG, CJA, COA

## Problema
Platforma are nevoie de reguli clare pentru toate scenariile de viață ale unui cont client:
- Ce se întâmplă când nu plătește?
- Când revine după o pauză?
- Când vrea să-și șteargă contul?
- Când face upgrade/downgrade?

Aceste scenarii afectează: UI portal, schema DB, cron jobs, billing, GDPR, fiscal.

## Sursa discuției
Sesiunea de lucru pe portalul B2B (21.04.2026) — implementarea fluxului plată → activare → inputuri → rapoarte. Owner a identificat scenarii intermediare critice care trebuie rezolvate înainte de finalizarea UI.

## De verificat cu structura
- **COG**: implicații operaționale, automatizări, cron jobs
- **CJA**: GDPR (drept la ștergere, retenție), contracte, clauze abonament
- **COA**: implicații tehnice, schema DB, migrări, backup/restore
- **CFO**: implicații fiscale, facturare, TVA, stornări
