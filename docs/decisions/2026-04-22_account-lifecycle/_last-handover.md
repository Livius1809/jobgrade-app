# Handover sesiune 22.04.2026 (sesiunea 2 — continuare)

## Ce s-a realizat

### Sesiunea 1 (mai devreme)
- Commit cod sesiune anterioară (Company Profiler + Account lifecycle)
- OwnerInbox refăcut complet (5 tipuri cereri, traducere, lanț escalare, active/rezolvate)
- Sincronizare realitate → KB prod (6 entries, 9 notificări rezolvate)
- 4 commit-uri deploy-uite pe prod

### Sesiunea 2
1. **Upload PDF/Word** E2E funcțional — pdf-parse v2 (PDFParse class), mammoth Word
2. **Evaluare inline** — EvaluationPanel în panou lateral (fetch jobs+user, auto-evaluate, tabel rezultate)
3. **Rapoarte inline** — card dependent de validare
4. **Un singur panou activ** — activePanel centralizat, mutual exclusion calculator↔date↔evaluare↔profil
5. **Lățime uniformă panouri** — parentPanelLeft din sectionRef
6. **Company Profiler badge-uri** — `/api/v1/company/maturity` cu fallback robust, badge-uri PREGĂTIT/ratio/missing pe carduri
7. **Restructurare tab-uri**:
   - Card 1: Posturi ("Adaugă" + "Import stat funcții" XLSX/PDF/PNG Vision) + Fișe de post
   - Card 2: + Stat salarii (XLSX/XML/CSV) — NOU
   - Card 3, 4: de revizuit (nu e prioritar acum)
8. **Import stat funcții** — API cu Claude Vision pentru organigrame imagine
9. **GET /api/v1/sessions** adăugat (lipsea)
10. **Sessions API fix** — EvaluationPanel trimite jobIds+participantIds corect

## Stare curentă portal Card 1 (Ordine internă)

### FUNCȚIONAL
- Profil companie (ANAF, CAEN, MVV)
- Posturi: Adaugă (AI) + Import stat funcții (XLSX/PDF/PNG)
- Fișe de post: Compune AI + Upload PDF/Word
- Raport MasterReportFlipbook cu validare+semnătură (electronică+olografă)
- Company Profiler badge-uri dinamice pe carduri servicii

### DE IMPLEMENTAT — Panoul Evaluare complet (4 variante)

**Cele 4 procese de evaluare (din discuții Owner):**

1. **Automat AI** — AI evaluează, supervizat de personal acreditat nostru
   - AI citește fișe → scoruri 6 criterii → verificare
   - Clientul validează raportul + semnează
   - Cel mai rapid/ieftin

2. **Cu comisie, mediat AI** — comisia clientului evaluează, AI mediază
   - Membrii scorează individual → AI compară → 3 etape consens
   - Consens: automat → recalibrare → facilitare AI
   - NU include personal acreditat de la noi
   - Clientul validează + semnează

3. **Cu comisie, mediat consultant uman** — comisia evaluează, consultant nostru mediază
   - Același flux, dar etapa 3 = consultant nostru (personal acreditat)
   - Cel mai scump

4. **Hibrid AI → Comisie** — rulează mai întâi 1 (automat), apoi comisia folosește raportul ca bază
   - Pricing: A + 30-40%
   - Comisia pornește de la rezultatul AI, nu de la zero

**REGULĂ:** Cele 3 moduri NU SE AMESTECĂ. "Personal acreditat" e DOAR la varianta automată.

**Validare:** În TOATE variantele, clientul (Owner/DG/reprezentanți) validează și semnează raportul.
Implementat deja: declarație formală + semnătură electronică + loc olografă + nr. înregistrare + L.S.

**Backend existent (4096 linii):**
- je-process-engine.ts (1810 linii): startPreScoring, submitPreScore, revealScores, flagForMediation, suggestBenchmarks, confirmBenchmarks, suggestSlotting, confirmSlotting, startOwnerValidation, getHierarchyForValidation, proposeGradeAdjustment, confirmAdjustment, getAdjustmentImpact, finalizeSession, getSessionJournal
- NewSessionWizard (311): alege posturi + evaluatori
- EvaluationForm (303): formular scorare 6 criterii per post
- ConsensusView (414): vizualizare consens + divergențe
- JEResultsTable (902): tabel rezultate ierarhie
- ClassCountSelector (186): selector nr. grade
- SessionActions (128): butoane status sesiune
- auto-evaluate (42): evaluare automată AI

**De făcut:**
- Panou lateral cu 4 opțiuni (selectare variantă)
- Per variantă: configurare (comisie, evaluatori — doar pt 2/3/4)
- Rulare proces inline (nu navigare la /sessions)
- Progres vizibil
- Rezultate inline (tabel ierarhie)
- Link la raport (MasterReportFlipbook) pentru validare+semnătură

## PRICING METHODOLOGY v2 — Status

**Document:** `docs/pricing-methodology-v2.md` (553 linii, commit 76374b3)

### Ce conține:
- Inventar complet 33 servicii din cod (13 AI + 20 non-AI)
- Consum resurse real per serviciu (tokeni, model AI, DB, compute)
- Toți furnizorii CAPEX+OPEX (Anthropic, Vercel, Neon, Upstash, Stripe, Resend, ElevenLabs, Sentry, ntfy, GitHub)
- Cost real → Plasa 1 (Opus worst-case) → Plasa 2 (BNR+10%) → Verificare marjă
- Chat consultant HR implementat: familiarizare 🟢 135min/lună gratuit, consultanță 🟡 3cr/min
- Flying wheel implementat: NarrativeGuide.tsx bubble contextual gratuit
- Storage: ~400-600 KB/an/client (<$0.001/an)
- Cod existent avansat: cost-calculator.ts, usage-logger.ts, anthropic-tracked.ts, budget-cap.ts, cost-gate.ts

### Sistem pricing din cod (deja implementat):
- `src/lib/pricing/cost-calculator.ts` — 4 plase siguranță, ProviderCost din DB, AIOperationTier, token amplification
- `src/lib/pricing/usage-logger.ts` — loghează fiecare execuție cu toate resursele
- `src/lib/pricing/anthropic-tracked.ts` — wrapper SDK cu telemetry automat
- `src/lib/ai/budget-cap.ts` — budget tiers (FREE/STARTER/PROFESSIONAL/ENTERPRISE), limită zilnică/lunară USD
- `src/lib/agents/cost-gate.ts` — alege model AI optimal per complexitate + verifică buget

### TODO — de finalizat cu structura:
- Multiplicatori variante evaluare (auto/comisie-AI/comisie-consultant/hibrid) — deducere din costuri reale
- Verificare fezabilitate prețuri implementate vs costuri calculate
- Populare tabel ProviderCost în DB prod cu prețuri reale furnizori
- Populare AIOperationTier pentru fiecare serviciu
- Validare Owner pe document final

## REZOLVAT: Pricing per variantă de evaluare (commit f470ea6)
Multiplicatori deduși din DB prod (provider_costs + ai_operation_tiers):
- A (Auto AI): 0 credite suplimentare (inclus în 60 cr/poz pachet)
- B (Comisie + AI): +1 cr/poz (mediation-facilitation Sonnet, amp 1.50)
- C (Comisie + Consultant): +20 cr/poz (175 EUR/oră × 7 min/poz)
- D (Hibrid): +1 cr/poz (A complet + B parțial)
Human-specialist-min corectat pe prod: real 2.50, covering 3.50 USD/min.

## ÎN CURS: Elaborare document pricing final
**Directivă Owner:** Claude + COG elaborează varianta finală a structurii de preț pe TOATE serviciile platformei. Fără confirmare Owner necesară până la documentul final. La final: fine tuning + asigurare permanență (nu se mai pierde NICIODATĂ).

## Commit-uri sesiunea 2
- eb34aba — Company Profiler + Account lifecycle
- e20a754 — OwnerInbox cereri structurate
- 650f084 — INFORMATION itemi concreți
- d863759 — active/rezolvate toggle
- 250b4e9 — Upload PDF/Word
- 1b702d2 — Evaluare+Rapoarte inline
- 2eac09f, 3898666, 7e797c8 — fix-uri pdf-parse
- 5892f0a, 386d9a4 — panel coordination
- 3c530e0 — bidirectional panels
- 42650a2 — EvaluationPanel fix + Import Excel + GET sessions
- eb51753 — Company Profiler badge-uri
- 5e4fb12 — maturity fallback robust
- 92c73eb — restructurare tab-uri + import stat funcții
