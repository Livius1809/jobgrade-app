# MCP Integration Plan — Viziune globală

## A) CONSTRUCȚIE (Claude + Owner) — implementare tehnică

### A1. Tools de scriere MCP (punct 3 — inputuri prin MCP)
- [ ] `submit_salary_data` — import date salariale (JSON, nu CSV upload)
- [ ] `submit_employee` — adaugă/actualizează angajat
- [ ] `add_job` — adaugă post nou cu titlu, departament, responsabilități
- [ ] `configure_kpi` — setează KPI-uri per post
- [ ] `configure_compensation` — configurează pachet salarial (fix + variabil)
- [ ] `submit_climate_response` — completează chestionarul CO (40 răspunsuri)
- [ ] `create_sociogram_group` — creează grup sociogramă + adaugă membri
- [ ] `submit_sociogram_response` — completează scorare sociogramă per membru
- [ ] `upload_document` — ingestie document în pâlnia de cunoaștere
- [ ] `update_company_profile` — actualizează MVV, date companie
- [ ] `submit_psychometric_result` — upload rezultat test (scoruri, nu PDF)

### A2. Adaptări configuratoare existente
- [ ] Toate panouri C3/C4 → apelabile și prin MCP (nu doar UI)
- [ ] Formularele portal → dual: UI + MCP tool echivalent
- [ ] Validări identice pe ambele canale (UI + MCP)
- [ ] Răspunsuri MCP formatate pentru afișare mobilă (scurt + structurat)

### A3. Adaptări infrastructură
- [ ] Rate limiting per tenant pe MCP tools (previne abuz)
- [ ] Logging MCP: fiecare apel = audit trail per client
- [ ] Credit deduction automat pe tools ACTION
- [ ] MCP health check tool (`ping` / `get_status`)

---

## B) COG DELEGĂ LA STRUCTURĂ — amenajare + comunicare

### B1. Marketing & Comunicare (COCSA → MKA, CWA, CMA)
- [ ] Listare features MCP — ce poate face clientul prin fiecare tool
- [ ] Conținut landing page: "Accesează datele tale de oriunde"
- [ ] Comparație vizuală: portal (click) vs MCP (conversație) vs FW (proactiv)
- [ ] Beneficii per rol: HR Director (rapoarte instant), CEO (simulări din taxi), CFO (cost real-time)
- [ ] USP diferențiator: "Primul serviciu HR cu acces MCP — datele tale, în limbajul tău"
- [ ] Template email introducere MCP către clienți existenți
- [ ] Social media: 3 clipuri scurte — "Cum arată HR-ul conversațional"
- [ ] FAQ MCP: ce e, cum funcționează, ce costuri are, securitate date

### B2. Conținut client-facing (SOA, CSA, HR_COUNSELOR)
- [ ] Script onboarding MCP: cum învăț clientul să folosească
- [ ] Ghid "primii 5 pași" per rol (HR, CEO, CFO, Manager departament)
- [ ] Exemple conversații: "Întreabă-mă orice despre compania ta"
- [ ] Răspunsuri template per tool (ton adaptat la rol — cf feedback_soa_adaptive_language)
- [ ] Escalare: ce întrebări NU poate răspunde MCP → redirect la consultant uman
- [ ] Integrare cu ghidul JobGrade (chatbot-ul din portal) — MCP ca backend

### B3. Produs & Pricing (PMA, CFO, DMA)
- [ ] Cost per tool MCP vs cost portal — e identic sau diferențiat?
- [ ] Pachete MCP: inclus în abonament sau add-on?
- [ ] Contor utilizare MCP per client (analytics)
- [ ] Dashboard utilizare: câte interogări, ce tools, frecvență — insight comportament client
- [ ] Propunere pricing mobilă (app) — include MCP
- [ ] ROI MCP: câte ore economisite client/lună vs preț

### B4. Legal & Conformitate (CJA, CCIA)
- [ ] GDPR: datele transmise prin MCP — sunt procesate identic cu portalul?
- [ ] Consimțământ: clientul trebuie să accepte terms pentru MCP separat?
- [ ] Audit trail: fiecare interogare MCP logată (cine, când, ce a cerut)
- [ ] Drept la ștergere: datele returnate prin MCP sunt efemere? Se cachează?
- [ ] AI Act: MCP ca sistem AI — clasificare risc, transparență
- [ ] Contract: clauze noi pentru acces MCP (anexă la contract standard)

### B5. Tehnic & Securitate (COA, SA, SQA)
- [ ] Autentificare MCP: token per client (nu doar internal key)
- [ ] Rotație token-uri: expirare + regenerare
- [ ] IP whitelist (opțional): clientul poate restricționa accesul
- [ ] Encryption in transit (HTTPS — deja) + at rest (datele returnate)
- [ ] Penetration testing pe endpoint MCP
- [ ] Rate limiting: max 100 req/min per client (previne scraping)
- [ ] Monitoring: alertă când un client face >1000 req/zi (anormal)

### B6. Experiență Client & Suport (CSSA, CSA)
- [ ] Ghid troubleshooting: "MCP nu răspunde" → checklist
- [ ] Canal suport dedicat MCP (sau integrat în suport existent)
- [ ] Feedback collection: satisfacție MCP per interacțiune
- [ ] Onboarding walkthrough: email series (ziua 1, 3, 7, 14)
- [ ] Template răspunsuri suport: "Cum configurez MCP pe telefonul meu"
- [ ] Video tutorial: 60 secunde — "Cum funcționează"

### B7. Business Development (COCSA → SOA, MKA)
- [ ] Demo MCP live în prezentări sales
- [ ] Propunere parteneriate: integrare MCP cu HRIS existente (SAP, Charisma)
- [ ] Canal revenditori: consultanți HR pot folosi MCP pentru clienții lor
- [ ] Studiu de caz: "Client X a redus timpul de raportare de la 3 zile la 3 minute prin MCP"
- [ ] Pitch deck slide: "Acces conversațional la toate datele HR"

### B8. Dezvoltare continuă (PMA → EMA, BDA)
- [ ] Roadmap tools noi: trimestrial, bazat pe usage analytics
- [ ] A/B testing: formulate răspunsuri MCP — care convertesc mai bine
- [ ] Integrare webhook: MCP poate trimite notificări push la schimbări
- [ ] SDK client: librărie NPM/Python pentru dezvoltatori terți
- [ ] Documentație API publică (OpenAPI/Swagger)
- [ ] Versionare MCP: v1 stabil, v2 beta cu features noi

### B9. Adaptări agenți existenți la MCP
- [ ] SOA: verifică dacă clientul are acces MCP → personalizează recomandări
- [ ] FW (Flying Wheels): folosește MCP tools intern pentru notificări proactive
- [ ] Company Profiler: alimentează MCP cu context actualizat la fiecare interacțiune
- [ ] HR Counselor: răspunsurile consiliere accesibile prin MCP (nu doar chat portal)
- [ ] KPI Monitor: alertare automată prin MCP când KPI scade sub prag
- [ ] Compliance Agent: termene transmise proactiv prin MCP → email/push

### B10. Monitorizare & Învățare
- [ ] Dashboard MCP usage per client (integrat în Owner Dashboard)
- [ ] Top 10 tools folosite — insight: ce contează pentru clienți
- [ ] Conversii: client care folosește MCP → retenție vs client fără MCP
- [ ] Learning: fiecare interacțiune MCP alimentează pâlnia de cunoaștere
- [ ] Feedback loop: tool folosit greșit → sugerează tool corect
- [ ] Anomaly detection: client folosește doar 1 tool → proactiv oferă altele

---

## Priorități implementare

### Imediat (sesiunea curentă)
- A1: Tools scriere MCP (submit data)
- A2: Validări identice UI + MCP

### Săptămâna aceasta
- B1: Listare features + conținut comunicare (COG delegă)
- B5: Token per client + rate limiting
- B9: FW integrare MCP tools

### Luna aceasta
- B2: Script onboarding + ghid primii 5 pași
- B3: Pricing MCP + analytics
- B4: GDPR + contract clauze
- B6: Suport + tutorial video

### Q3 2026
- B7: Demo live + parteneriate
- B8: SDK + API publică + webhook
- B10: Dashboard analytics MCP
