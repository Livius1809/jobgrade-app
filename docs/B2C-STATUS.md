# B2C Status Audit — 10.04.2026

Raport onest despre stadiul real al scope-ului B2C (cele 5+1 carduri onion).

## Arhitectură documentată (din memory)
5 carduri B2C concentrice — fiecare un strat al onion-ului:
- **Card 1:** "Drumul către mine" — Călăuza (profundă)
- **Card 2:** "Eu și ceilalți (NOI)" — Consilier Dezvoltare Personală
- **Card 3:** "Îmi asum un rol profesional" — Consilier Carieră
- **Card 4:** "Oameni de succes/valoare" — Coach Valoare
- **Card 5:** "Antreprenoriat transformațional" — Coach Antreprenoriat
- **Card 6:** "Spune-mi despre mine" — Profiler (cunoaște utilizatorul transversal)

**Strategie:** Card 3 + Card 6 active by default (carieră + profiling). Celelalte se activează progresiv pe măsură ce utilizatorul cere mai mult.

## Ce există IMPLEMENTAT ✅

### Backend API (8 routes)
- `POST /api/v1/b2c/onboarding` — signup nou cu pseudonim (privacy by design)
- `GET /api/v1/b2c/cards?userId=X` — listează toate cardurile cu status/fază
- `GET/PATCH /api/v1/b2c/profile` — profil utilizator B2C
- `GET/POST /api/v1/b2c/journal` — jurnal personal
- `GET/DELETE /api/v1/b2c/account` — gestionare cont
- `GET /api/v1/b2c/my-data` — GDPR Art. 20 data export
- `POST /api/v1/b2c/calauza/chat` — chat Card 1 (Călăuza)
- `POST /api/v1/b2c/profiler/chat` — chat Card 6 (Profiler)

### Landing page
- `/personal` — pagina publică cu cele 6 carduri prezentate (marketing)
- Card 3 + Card 6 marcate `active: true`, rest `active: false` (UI hint)

### Schema DB
- `b2cUser` cu pseudonim
- `b2cCard` cu fază (LOCKED/INTRO/ACTIVE/PAUSED)
- `b2cInteraction` cu Card1-6 reference
- Privacy: 2 straturi separate (identitate reală vs. pseudonim)

### Middleware
- Public path `/personal` + `/api/v1/b2c/onboarding`
- Token-based auth pentru restul B2C API (`b2c-token` cookie sau Bearer)
- Rate limiter separat pentru B2C (30 req/min)

## Ce LIPSEȘTE ❌

### UI Pages
- **Nicio pagină `/b2c/*`** — doar `/personal` landing
- Nu există **chat interface** pentru Profiler (Card 6)
- Nu există **chat interface** pentru Consilier Carieră (Card 3)
- Nu există **upload CV + analiză** (Card 3 core feature)
- Nu există **jurnal page** (Card 1/Card 6 feature)
- Nu există **my-data page** (GDPR export pentru B2C)
- Nu există **dashboard personal** (home pentru utilizator logat B2C)

### API fără UI
- `profile`, `journal`, `my-data`, `account` — endpoints există, dar zero UI
- Calauza chat, Profiler chat — endpoints există, dar zero UI

### Agents specifici B2C
Din backend agent registry (presupun):
- `CALAUZA` — referenced în /api/v1/b2c/calauza/chat
- `PROFILER` — referenced în /api/v1/b2c/profiler/chat
- **Lipsesc:** Consilier Carieră, Consilier Dezvoltare Personală, Coach Valoare, Coach Antreprenoriat

### Community pages (per memoria din project_b2c_communities.md)
- Nicio implementare pentru cele 5 comunități per card
- Gating by level (Hawkins <200) — neimplementat
- Moderare AI — neimplementat

### Safety Monitor
- `project_safety_monitor.md` documentează 4 niveluri alertă (CRITIC/RIDICAT/MODERAT/INFORMATIV)
- Nu găsesc implementare în cod

### Integrare Business #2
- Card 5 "Antreprenoriat transformațional" e poarta spre Business #2
- Business #2 e confidențial + în planificare
- Zero integrare tehnică momentan

## Estimare efort pentru B2C MVP funcțional

**Minimum viable** (Card 3 + Card 6 cu chat basic):
- Chat UI component (reusable pentru ambele carduri): **4-6h**
- Pagina `/personal/dashboard` post-login: **3-4h**
- Pagina `/personal/card/profiler` cu chat: **3-5h**
- Pagina `/personal/card/cariera` cu chat + CV upload: **5-8h**
- Integrare B2C auth flow (onboarding → login → cards): **3-5h**
- GDPR my-data page: **2-3h**
- Safety Monitor basic (keyword detection): **3-4h**
- Tests E2E pentru flow complet: **2-3h**

**Total minimum: 25-38 ore** pentru scope redus (2 carduri).

**Full MVP cu toate 6 carduri + comunități + safety:**
**Total estimat: 150-200 ore**

## Recomandare pentru "first real client"

B2C **NU e blocker pentru lansare B2B**. Strategic:

1. **Faza 1 (acum):** lansează cu B2B doar. B2B generează cash flow primul.
2. **Faza 2 (lună 2-3 post-lansare):** adaugă Card 3 (Consilier Carieră) ca upsell pentru angajații clienților B2B existenți.
3. **Faza 3 (lună 4-6):** adaugă Card 6 (Profiler) + Card 1 (Călăuza).
4. **Faza 4 (lună 6+):** restul cardurilor + comunități + Business #2 integration.

Asta corespunde principiului documentat în memoria `project_pricing_principle.md`:
> "Fiecare parte primește gratuit ce-l aduce la masă, plătește ce-l ajută să câștige."

B2B aduce cash. B2C construiește comunitate + date pentru evoluție. Nu le forțăm să vină împreună.

## Ce E verificabil AUTOMAT acum

Smoke test pentru ce există:
- `/personal` page se încarcă (public)
- `POST /api/v1/b2c/onboarding` cu date valide → 201 sau 200
- `GET /api/v1/b2c/cards?userId=X` cere auth → 401 fără token
- 6 carduri definite consistent între landing page și API metadata
- Nicio pagină `/b2c/*` nu există (404 așteptat)

Vezi `tests/e2e/b2c-smoke.spec.ts`.
