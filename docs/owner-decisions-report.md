# Raport Decizii Owner — JobGrade Platform

> **Generat:** 08.04.2026  
> **Status:** BUILD complet, PRODUCTION decis (FINANCIAR amânat post-marketing plan review)  
> **Categorii:** BUILD (tehnic/infrastructură) + PRODUCTION (business/operațional)
> 
> ### Decizii aprobate Owner — 08.04.2026
> | ID | Decizie | Opțiune | Condiție |
> |---|---|---|---|
> | BUILD-001 | Secrets Management | **A** — Vercel Env Vars | Alert la necesitate migrare Vault |
> | BUILD-002 | Transparență AI | **A** — Pagină completă | Validare jurist, termen 2 aug 2026 |
> | BUILD-003 | Fallback AI | **B** — Mod degradat | Mesaj onest client, migrare A post-lansare |
> | BUILD-004 | GDPR Endpoints | **B** — JSON+PDF, soft 30z | Cron purge automat |
> | BUILD-005 | Documentație Securitate | **B** — Draft AI + review DPO | DPO reia 04.04 |
> | BUILD-006 | Chat Endpoints | **A** — HR Counselor → 3→2→1→4→5 | Secvența de evoluție |
> | BUILD-007 | Politică DB | **A** — Retenție GDPR + arhivare 12 luni | Alertă 80% capacitate |
> | BUILD-008 | Cost Monitoring API | **A** — Cap dinamic per client | Praguri proporționale cu valoarea totală client |
> | BUILD-009 | Session Hardening | **C** — Keycloak strict | 30min idle, refresh rotation, invalidare password |
> 
> **PRODUCTION — Decizii aprobate Owner — 08.04.2026**
> | ID | Decizie | Opțiune | Condiție |
> |---|---|---|---|
> | PROD-FIN-001/002/003 | Pricing + Budget + Infra | **AMÂNAT** | Post review plan marketing |
> | PROD-VNZ-001 | Go-to-Market B2C | **A** — 3 luni după 5 clienți B2B | Pilotare serioasă în prealabil |
> | PROD-VNZ-002 | Canale Distribuție | **A+B** — Organic + Paid (Meta 2K, Google, LinkedIn) | Parteneriate evaluate după clienți B2B |
> | PROD-VNZ-003 | Primii 100 Clienți | **C+B** — Closed beta + profesioniști tranziție | A exclus permanent (canibalizare B2B) |
> | PROD-PRD-001 | Ordine Carduri | **3→2→1→4→5** | Secvența de evoluție |
> | PROD-PRD-002 | Comunități B2C | **C** — Agentul AI decide per utilizator | Închisă by default |
> | PROD-PRD-003 | Punte B2B↔B2C | **A + C oportunistic** | Regulă: 3 B2B + 50 B2C Card 3; pilot dacă client solicită |
> | PROD-LEG-001 | AI Act Compliance | **A** — Echipă mixtă + jurist validare | Sprint-uri săptămânale |
> | PROD-LEG-002 | DPIA | **A** — Draft AI + review DPO | TIA Anthropic deja aprobat |
> | PROD-LEG-003 | Licențe Psihometrice | **A activ + C accelerat** | Licențe asigurate, instrumente proprii cu metodologie existentă |
> | PROD-RU-001 | Psiholog #3 | **C iterativ** — 2 psihologi existenți, monitorizare | Decizie din mers |
> | PROD-RU-002 | Mentori per Card | **C definitiv** — doar AI | Excepție doar cerere super-specifică |
> | PROD-RU-003 | Echipă Marketing | **C** — Agenți AI + Owner | Zero cost suplimentar |
> | PROD-MKT-001 | Plan Marketing Unitar | **A** — Plan unitar B2B+B2C | Document creat, în review |
> | PROD-MKT-002 | Brand B2C | **A** — Un singur brand JobGrade | B2B="gradul jobului", B2C="gradul tău"; adaptări semantice delegat resurse suport |
> | PROD-MKT-003 | Content Strategy | **A+C audio/video** — MBooks, storytelling ascultat | Nu text lung; audio/video + subtitrări + rezumate descărcabile |

---

## SECȚIUNEA I — BUILD

Decizii tehnice și de infrastructură care condiționează progresul dezvoltării și conformitatea platformei.

---

### BUILD-001 — VUL-034: Secrets Management

| Câmp | Valoare |
|---|---|
| **Decizia de luat** | Migrare la un secrets manager (Vercel Env Vars encrypted / HashiCorp Vault) sau acceptare risc cu gestionarea curentă |
| **Categorie** | INFRASTRUCTURĂ / SECURITATE |
| **Severitate** | 🔴 RIDICAT |
| **Termen** | Fără deadline extern, dar condiționează audit GDPR |
| **Lanț cauzal** | Decizie migrare → configurare secrets manager → rotare chei → eliminare risc expunere la acces fizic/backup → conformitate GDPR Art.32 → încredere client + audit OK |

**Opțiuni:**

| Opțiune | Pro | Contra |
|---|---|---|
| **A. Vercel Env Vars encrypted** | Zero cost suplimentar, integrare nativă, criptare at-rest | Limitat la deployment Vercel, fără versionare secretelor |
| **B. HashiCorp Vault (managed)** | Rotare automată, audit log, multi-cloud | Cost adițional (~50-100 EUR/lună), complexitate operațională |
| **C. Acceptare risc** | Zero efort | Expunere la acces fizic/backup, non-conformitate GDPR Art.32 |

**Recomandare echipă AI:** Opțiunea A (Vercel Env Vars encrypted) — acoperă nevoile actuale la cost zero, cu migrare la Vault dacă se adaugă furnizori non-Vercel.

---

### BUILD-002 — VUL-025: Pagina Transparență AI

| Câmp | Valoare |
|---|---|
| **Decizia de luat** | Creare pagină `/transparenta-ai` cu detalii training data, model usage, human oversight |
| **Categorie** | LEGAL / CONFORMITATE |
| **Severitate** | 🔴 CRITIC |
| **Termen** | **2 august 2026** (AI Act Art.13 — deadline obligatoriu) |
| **Lanț cauzal** | Decizie conținut pagină → implementare pagină → publicare → conformitate AI Act Art.13 → evitare amendă 2-4% cifră afaceri → credibilitate piață |

**Opțiuni:**

| Opțiune | Pro | Contra |
|---|---|---|
| **A. Pagină completă cu toate detaliile AI Act** | Conformitate 100%, diferențiere pe piață prin transparență | Efort 3-5 zile, necesită validare jurist |
| **B. Pagină minimală (doar obligatorii Art.13)** | Efort redus (1-2 zile), conformitate de bază | Nu valorifică oportunitatea de diferențiere |
| **C. Amânare post-2 august** | Zero efort acum | Risc amendă 2-4% cifră afaceri, pierdere credibilitate |

**Recomandare echipă AI:** Opțiunea A — pagină completă, redactată în tandem cu juristul. Termenul legal nu este negociabil. Transparența devine avantaj competitiv.

---

### BUILD-003 — VUL-028: Fallback Provider AI

| Câmp | Valoare |
|---|---|
| **Decizia de luat** | Implementare fallback (model local / alt provider) sau mod degradat sau acceptare risc dependență unică Anthropic |
| **Categorie** | OPERAȚIONAL / REZILIENȚĂ |
| **Severitate** | 🔴 CRITIC |
| **Termen** | Înainte de lansare B2B (Q4 2026) |
| **Lanț cauzal** | Decizie arhitectură fallback → implementare provider alternativ + cache → disponibilitate 99.9% → zero downtime client → retenție + SLA respectat |

**Opțiuni:**

| Opțiune | Pro | Contra |
|---|---|---|
| **A. Fallback pe alt provider cloud (OpenAI / Mistral)** | Reziliență ridicată, switchover automat | Cost dublu testare, diferențe comportament model, system prompts de adaptat |
| **B. Mod degradat (cache + mesaje pre-generate)** | Cost scăzut, implementare rapidă | Experiență degradată vizibil, funcționalitate limitată |
| **C. Acceptare risc (single provider)** | Zero efort | SLA compromis, pierdere clienți la orice outage Anthropic |

**Recomandare echipă AI:** Opțiunea B pentru MVP, cu migrare la A post-lansare. Cache-ul răspunsurilor frecvente acoperă 60-70% din scenarii. Mod degradat cu mesaj onest: "Serviciul funcționează cu capacitate redusă."

---

### BUILD-004 — VUL-027: Endpoint-uri GDPR

| Câmp | Valoare |
|---|---|
| **Decizia de luat** | Implementare `GET /my-data` (export date personale) + `DELETE /account` (ștergere cont) — ce date exact se includ, format export |
| **Categorie** | LEGAL / GDPR |
| **Severitate** | 🔴 RIDICAT |
| **Termen** | Obligatoriu la lansare (GDPR Art.15 + Art.17) |
| **Lanț cauzal** | Decizie format export + procedură ștergere → implementare endpoints → conformitate GDPR Art.15+17 → drepturi utilizator respectate → evitare plângeri ANSPDCP |

**Opțiuni:**

| Opțiune | Pro | Contra |
|---|---|---|
| **A. Export JSON complet + ștergere hard** | Conformitate maximă, simplitate | Pierdere date agregate utile, fără posibilitate recuperare |
| **B. Export JSON + PDF human-readable + ștergere soft (30 zile) apoi hard** | UX excelent, perioadă de grație | Efort mai mare, trebuie gestionat cron de purge |
| **C. Export minimal (doar PII) + anonimizare în loc de ștergere** | Păstrare date agregate, GDPR-compliant dacă anonimizarea e ireversibilă | Complexitate anonimizare, risc re-identificare |

**Recomandare echipă AI:** Opțiunea B — export JSON + PDF, ștergere soft 30 zile apoi hard delete. Oferă UX profesional și perioadă de siguranță pentru erori utilizator.

---

### BUILD-005 — VUL-039: Documentație Securitate

| Câmp | Valoare |
|---|---|
| **Decizia de luat** | Elaborare SECURITY.md + DPIA (Data Protection Impact Assessment) + Incident Response Plan |
| **Categorie** | LEGAL / SECURITATE |
| **Severitate** | 🟡 MODERAT |
| **Termen** | DPIA obligatorie înainte de lansare (GDPR Art.35 — prelucrare risc ridicat) |
| **Lanț cauzal** | Decizie prioritate documentație → redactare DPIA (obligatoriu GDPR risc ridicat) → Incident Response Plan → pregătire audit → conformitate completă |

**Opțiuni:**

| Opțiune | Pro | Contra |
|---|---|---|
| **A. Redactare completă internă (echipă AI + Owner)** | Cost zero, control total | Timp 2-3 săptămâni, lipsă validare externă |
| **B. Redactare internă + review DPO extern** | Echilibru cost-calitate, validare profesională | Cost review ~500-1000 EUR |
| **C. Externalizare completă la firmă specializată** | Calitate garantată, responsabilitate transferată | Cost 3000-5000 EUR, pierdere know-how intern |

**Recomandare echipă AI:** Opțiunea B — redactare internă (draft AI) cu review DPO. DPIA este obligatorie legal pentru prelucrări cu risc ridicat (profilare, date sensibile).

---

### BUILD-006 — VUL-040: Chat Endpoints Incomplete

| Câmp | Valoare |
|---|---|
| **Decizia de luat** | Prioritizare creare endpoint-uri chat: HR Counselor B2B, Admin Card 2-5 B2C |
| **Categorie** | PRODUS / FUNCȚIONALITATE |
| **Severitate** | 🔴 RIDICAT |
| **Termen** | HR Counselor: înainte de lansare B2B; Carduri B2C: înainte de lansare B2C |
| **Lanț cauzal** | Decizie ordine implementare → creare endpoint + system prompt + securitate → funcționalitate completă B2C → lansare B2C → revenue stream nou |

**Opțiuni:**

| Opțiune | Pro | Contra |
|---|---|---|
| **A. HR Counselor B2B primul, apoi Card 3 → 1 → 2 → 4 → 5** | Aliniare cu strategia B2B-first, Card 3+6 gratuite deja active | Card 1-2 (nucleu, relații) amânate — dar sunt carduri plătite |
| **B. Toate endpoint-urile B2B+B2C în paralel** | Lansare simultană | Risc calitate, efort dispersat |
| **C. Doar B2B acum, B2C amânat complet post-validare B2B** | Focus maxim, calitate B2B | Întârziere B2C cu 3-6 luni |

**Recomandare echipă AI:** Opțiunea A — HR Counselor B2B prioritar (condiționează revenue), apoi carduri B2C în ordinea valorii: Card 3 (carieră) → Card 1 (nucleu) → Card 2 (relații) → Card 4 → Card 5.

---

### BUILD-007 — Politică Creștere Bază de Date

| Câmp | Valoare |
|---|---|
| **Decizia de luat** | Definire politică retenție date, arhivare, și praguri de alertă pentru creșterea bazei de date |
| **Categorie** | INFRASTRUCTURĂ / OPERAȚIONAL |
| **Severitate** | 🟡 MODERAT |
| **Termen** | Înainte de lansare B2B |
| **Lanț cauzal** | Decizie politică retenție → implementare cron arhivare + alertă dimensiune → costuri DB predictibile → zero surprize facturare → buget controlat |

**Opțiuni:**

| Opțiune | Pro | Contra |
|---|---|---|
| **A. Retenție conform GDPR (perioade din project_gdpr_retention) + arhivare cold storage la 12 luni** | Conformitate, costuri optimizate | Necesită implementare pipeline arhivare |
| **B. Retenție nelimitată + monitorizare manuală** | Simplu | Costuri crescătoare, non-conformitate GDPR |
| **C. Retenție GDPR + partițonare automată PostgreSQL** | Performanță optimă la scale | Complexitate setup inițial |

**Recomandare echipă AI:** Opțiunea A — aliniere la termenele GDPR deja definite, cu alerte automate la 80% capacitate și arhivare automată.

---

### BUILD-008 — Monitorizare Costuri API Anthropic

| Câmp | Valoare |
|---|---|
| **Decizia de luat** | Implementare budget caps, alerte cost per client, și rate limiting pe API-ul Anthropic |
| **Categorie** | FINANCIAR / INFRASTRUCTURĂ |
| **Severitate** | 🔴 RIDICAT |
| **Termen** | Obligatoriu înainte de lansare |
| **Lanț cauzal** | Decizie budget caps → implementare rate limiter + alerte → prevenire facturi surpriză → profitabilitate per client controlată → sustenabilitate financiară |

**Opțiuni:**

| Opțiune | Pro | Contra |
|---|---|---|
| **A. Budget cap hard per client + alerte la 70%/90%** | Control total, zero surprize | Risc experiență degradată dacă limita e prea mică |
| **B. Soft cap (alerte fără blocare) + review săptămânal** | Flexibilitate, fără impact UX | Risc depășire buget |
| **C. Rate limiting per minut/oră + budget cap lunar global** | Protecție abuz, control global | Nu diferențiază între clienți |

**Recomandare echipă AI:** Opțiunea A cu praguri generoase inițial (ajustate după primele 30 zile de date reale). Cap hard previne scenarii catastrofale.

---

### BUILD-009 — Întărire Gestiune Sesiuni

| Câmp | Valoare |
|---|---|
| **Decizia de luat** | Hardening session management: durata sesiune, refresh token rotation, invalidare la schimbare parolă, protecție session fixation |
| **Categorie** | SECURITATE |
| **Severitate** | 🟡 MODERAT |
| **Termen** | Înainte de lansare |
| **Lanț cauzal** | Decizie parametri sesiune → implementare refresh rotation + invalidare → eliminare vectori atac sesiune → securitate cont utilizator → conformitate OWASP Top 10 |

**Opțiuni:**

| Opțiune | Pro | Contra |
|---|---|---|
| **A. Sesiune 30 min idle + refresh rotation + invalidare la password change** | Securitate solidă, standard industrie | UX ușor afectat (re-login mai frecvent) |
| **B. Sesiune 8h + refresh fără rotation** | UX convenabil | Vulnerabil la token theft |
| **C. Delegare completă la Keycloak cu configurare strictă** | Centralizat, un singur loc de configurat | Dependență totală de Keycloak |

**Recomandare echipă AI:** Opțiunea C cu parametrii din A — Keycloak gestionează deja autentificarea, configurarea strictă se face din admin console.

---

## SECȚIUNEA II — PRODUCTION

Decizii de business și operaționale care condiționează lansarea, creșterea și sustenabilitatea platformei.

---

### FINANCIAR

---

#### PROD-FIN-001 — Pricing Final B2C

| Câmp | Valoare |
|---|---|
| **Decizia de luat** | Stabilire model pricing B2C: credite per card, abonament lunar, limite freemium |
| **Categorie** | FINANCIAR |
| **Severitate** | 🔴 CRITIC |
| **Termen** | Minim 60 zile înainte de lansare B2C |
| **Lanț cauzal** | Decizie pricing → configurare Stripe → implementare paywall → monetizare B2C → revenue stream → sustenabilitate |

**Opțiuni:**

| Opțiune | Pro | Contra |
|---|---|---|
| **A. Freemium (Card 3+6 gratuite) + abonament 49 RON/lună pentru restul** | Barieră joasă intrare, upsell natural | Revenue per user mic, necesită volum |
| **B. Pay-per-card (29-79 RON per card deblocat)** | Revenue predictibil per acțiune, aliniare la principiul pricing | Fricțiune la fiecare decizie de cumpărare |
| **C. Credite (pachete 50/100/200 RON) consumate per interacțiune** | Flexibilitate maximă, gamification | Complexitate UX, risc percepție "taximetru" |

**Recomandare echipă AI:** Opțiunea A — freemium cu Card 3+6 gratuite (deja decis) + abonament lunar accesibil. Principiul "primește gratuit ce-l aduce la masă, plătește ce-l ajută să câștige" se aplică natural.

---

#### PROD-FIN-002 — Budget Marketing Q2-Q4 2026

| Câmp | Valoare |
|---|---|
| **Decizia de luat** | Alocare buget marketing conform planului 7P (115K RON planificat) — confirmare sau ajustare |
| **Categorie** | FINANCIAR |
| **Severitate** | 🔴 RIDICAT |
| **Termen** | Decizie necesară mai 2026 pentru execuție Q3-Q4 |
| **Lanț cauzal** | Decizie buget → alocare pe canale → execuție campanii → lead generation → conversie → revenue |

**Opțiuni:**

| Opțiune | Pro | Contra |
|---|---|---|
| **A. Confirmare 115K RON (plan existent)** | Plan deja validat, execuție imediată | Buget bootstrap — acoperire limitată |
| **B. Reducere la 70K RON (doar organic + events)** | Conservare cash | Viteză achiziție clienți redusă |
| **C. Majorare la 160K RON (adăugare paid ads)** | Accelerare vizibilitate | Risc cash-flow dacă conversiile întârzie |

**Recomandare echipă AI:** Opțiunea A cu flexibilitate — 115K RON alocat, dar cu review lunar și realocare între canale pe baza performanței. Fără angajamente fixe pe termen lung.

---

#### PROD-FIN-003 — Investiție Infrastructură vs. Revenue Proiectat

| Câmp | Valoare |
|---|---|
| **Decizia de luat** | Stabilire plafon cost infrastructură lunar raportat la revenue proiectat (hosting, API, servicii terțe) |
| **Categorie** | FINANCIAR |
| **Severitate** | 🟡 MODERAT |
| **Termen** | Înainte de lansare |
| **Lanț cauzal** | Decizie plafon → monitorizare costuri → alertă depășire → ajustare plan → cash-flow pozitiv → sustenabilitate |

**Opțiuni:**

| Opțiune | Pro | Contra |
|---|---|---|
| **A. Max 30% din revenue proiectat pentru infrastructură** | Marjă sănătoasă, sustenabil | Poate limita scalarea rapidă |
| **B. Cost fix 2000 EUR/lună primele 12 luni, apoi % din revenue** | Predictibilitate, permite focus pe produs | Rigiditate dacă revenue depășește proiecțiile |
| **C. Pay-as-you-grow fără plafon** | Scalare nelimitată | Risc pierdere control costuri |

**Recomandare echipă AI:** Opțiunea B — cost fix controlat în faza de lansare, tranziție la % din revenue după validare model.

---

### VANZARI

---

#### PROD-VNZ-001 — Strategie Go-to-Market B2C

| Câmp | Valoare |
|---|---|
| **Decizia de luat** | Timing lansare B2C relativ la maturitatea B2B — simultan, secvențial, sau pilotat |
| **Categorie** | VANZARI |
| **Severitate** | 🔴 CRITIC |
| **Termen** | Decizie strategică Q2 2026 |
| **Lanț cauzal** | Decizie timing → plan dezvoltare → alocare resurse → lansare → primii utilizatori → feedback → iterație → scale |

**Opțiuni:**

| Opțiune | Pro | Contra |
|---|---|---|
| **A. B2C la 3 luni după primii 5 clienți B2B plătitori** | Engine validat, testimoniale reale, learnings aplicate | Întârziere B2C 6-9 luni |
| **B. Lansare B2C pilot (100 utilizatori) simultan cu B2B** | Validare paralelă, feedback dublu | Resurse dispersate, risc calitate |
| **C. B2C doar după atingerea breakeven B2B** | Focus maxim, zero risc financiar | Poate dura 12-18 luni, pierdere fereastră piață |

**Recomandare echipă AI:** Opțiunea A — B2B-first (deja decis P1-P4), B2C pilot la 3 luni după primii clienți B2B. Engine-ul se validează pe B2B, se aplică learnings pe B2C.

---

#### PROD-VNZ-002 — Canale Distribuție B2C

| Câmp | Valoare |
|---|---|
| **Decizia de luat** | Selecție canale principale: organic (SEO, content), paid (Meta, Google), partnerships (psihologi, coachi) |
| **Categorie** | VANZARI |
| **Severitate** | 🟡 MODERAT |
| **Termen** | 60 zile înainte de lansare B2C |
| **Lanț cauzal** | Decizie canale → creare conținut/campanii → atragere trafic → conversie → utilizatori activi → comunitate → retenție |

**Opțiuni:**

| Opțiune | Pro | Contra |
|---|---|---|
| **A. Organic-first (blog, SEO, LinkedIn personal branding)** | Cost redus, credibilitate, durabil | Lent (3-6 luni până la tracțiune) |
| **B. Paid-first (Meta Ads + Google Ads)** | Rezultate rapide, testare mesaje | Cost ridicat per achiziție, dependență de buget |
| **C. Partnerships (psihologi, coachi, HR independenți)** | Credibilitate prin asociere, cost per achiziție mic | Greu de scalat, dependent de relații |

**Recomandare echipă AI:** Mix A+C — organic pentru fundație + parteneriate pentru credibilitate și primii adoptatori. Paid doar după validare mesaj și conversie organică.

---

#### PROD-VNZ-003 — Target Primii 100 Clienți B2C

| Câmp | Valoare |
|---|---|
| **Decizia de luat** | Definire profil ideal, canal de achiziție și timeline pentru primii 100 utilizatori B2C plătitori |
| **Categorie** | VANZARI |
| **Severitate** | 🟡 MODERAT |
| **Termen** | La lansare B2C |
| **Lanț cauzal** | Decizie profil → targetare precisă → onboarding personalizat → conversie freemium→paid → primii 100 → testimoniale → scalare |

**Opțiuni:**

| Opțiune | Pro | Contra |
|---|---|---|
| **A. Angajați din companiile client B2B (punte B2B→B2C)** | Familiar cu brandul, conversie ridicată | Dependent de succes B2B, potențial conflict de interese |
| **B. Profesioniști 25-40 ani în tranziție de carieră** | Nevoie reală și urgentă, willing to pay | Segment fragmentat, greu de targetat |
| **C. Comunitate closed beta (invitații din rețea profesională)** | Feedback de calitate, exclusivitate, word-of-mouth | Scalare lentă, risc echo chamber |

**Recomandare echipă AI:** Opțiunea C pentru primii 100, apoi B pentru scalare. Beta închisă generează exclusivitate și feedback de calitate.

---

### PRODUS

---

#### PROD-PRD-001 — Ordine Implementare Carduri B2C

| Câmp | Valoare |
|---|---|
| **Decizia de luat** | După Card 3 (carieră) și Card 6 (comunitate) gratuite — care card urmează și în ce ordine |
| **Categorie** | PRODUS |
| **Severitate** | 🔴 RIDICAT |
| **Termen** | Decizie necesară la planificarea sprint-urilor B2C |
| **Lanț cauzal** | Decizie ordine → dezvoltare endpoint-uri + system prompts → testare cu beta users → lansare progresivă → diversificare ofertă → revenue per user crescut |

**Opțiuni:**

| Opțiune | Pro | Contra |
|---|---|---|
| **A. Card 1 (Nucleu) → Card 2 (Relații) → Card 4 (Succes) → Card 5 (Antreprenoriat)** | Parcurs natural de dezvoltare personală, spirala logică | Card 1 e cel mai complex (Călăuza, bypass spiritual) |
| **B. Card 4 (Succes) → Card 1 → Card 2 → Card 5** | Card 4 mai accesibil, monetizare rapidă | Rupe parcursul narativ al metamorfozei |
| **C. Toate simultan, utilizatorul alege** | Libertate maximă, venit diversificat | Risc experiență superficială, contra-filozofiei ghidaj |

**Recomandare echipă AI:** Opțiunea A — parcursul natural al metamorfozei (crisalidă → fluture). Card 1 (Nucleu) e fundamentul — fără el, celelalte carduri sunt exerciții fără rădăcină.

---

#### PROD-PRD-002 — Activare Comunități B2C

| Câmp | Valoare |
|---|---|
| **Decizia de luat** | Când se activează comunitățile per card — la lansarea cardului sau la atingerea unui prag de utilizatori |
| **Categorie** | PRODUS |
| **Severitate** | 🟡 MODERAT |
| **Termen** | Post-lansare B2C |
| **Lanț cauzal** | Decizie activare → implementare moderare AI → comunitate activă → retenție crescută → engagement → network effects → creștere organică |

**Opțiuni:**

| Opțiune | Pro | Contra |
|---|---|---|
| **A. Activare la minim 20 utilizatori per card cu calibrare AI confirmată** | Masă critică, conversații relevante | Risc așteptare lungă pentru carduri mai puțin populare |
| **B. Activare la lansarea fiecărui card** | Disponibilitate imediată | Comunitate goală = experiență negativă |
| **C. Activare progresivă (agentul AI decide per utilizator)** | Aliniare cu regula universală (comunitate ÎNCHISĂ by default) | Complexitate implementare |

**Recomandare echipă AI:** Opțiunea C — consistent cu decizia existentă (comunitate închisă by default, agentul calibrează și activează). Respectă principiul Hawkins <200 = emoție reactivă.

---

#### PROD-PRD-003 — Punte B2B ↔ B2C — Timing Conectare

| Câmp | Valoare |
|---|---|
| **Decizia de luat** | Când se activează fluxul de matching automat B2B↔B2C (recrutare, anonimizare progresivă, revelare identitate) |
| **Categorie** | PRODUS |
| **Severitate** | 🔴 RIDICAT |
| **Termen** | Post-validare ambele platforme |
| **Lanț cauzal** | Decizie activare → implementare matching + anonimizare → flux recrutare funcțional → valoare adăugată B2B+B2C → diferențiator unic piață → monetizare volum mic preț |

**Opțiuni:**

| Opțiune | Pro | Contra |
|---|---|---|
| **A. La minim 3 clienți B2B activi + 50 utilizatori B2C cu Card 3 completat** | Date suficiente pentru matching relevant | Poate dura 6-12 luni post-lansare |
| **B. La lansarea B2C (cu date sintetice inițial)** | Demonstrație imediată a valorii | Matching nerelevant, experiență falsă |
| **C. Pilot cu 1 client B2B partner + 20 candidați B2C selectați** | Validare reală, risc controlat | Necesită partener B2B dispus la experiment |

**Recomandare echipă AI:** Opțiunea C — pilot controlat cu un client B2B de încredere. Validează fluxul complet (6 pași, anonimizare, revelare) pe un caz real.

---

### LEGAL

---

#### PROD-LEG-001 — AI Act Compliance Timeline

| Câmp | Valoare |
|---|---|
| **Decizia de luat** | Plan complet de conformitate AI Act cu termen 2 august 2026 — priorități, responsabilități, buget |
| **Categorie** | LEGAL |
| **Severitate** | 🔴 CRITIC |
| **Termen** | **2 august 2026** (deadline legal) |
| **Lanț cauzal** | Decizie plan → execuție per articol → documentare → audit intern → conformitate completă → operare legală UE → evitare amenzi |

**Opțiuni:**

| Opțiune | Pro | Contra |
|---|---|---|
| **A. Echipă mixtă AI+umani (deja confirmat) — sprint-uri săptămânale** | Viteză, cost redus, know-how intern | Necesită coordonare strictă, jurist extern pentru validare |
| **B. Externalizare completă la firmă de consultanță AI Act** | Responsabilitate transferată, expertiza dedicată | Cost 10-20K EUR, pierdere control |
| **C. Minimalist — doar cerințele obligatorii pentru high-risk** | Efort redus, focus pe esențial | Risc interpretare greșită a categoriei de risc |

**Recomandare echipă AI:** Opțiunea A — echipa mixtă e deja confirmată, sprint-urile sunt pornite. Jurist extern doar pentru validare finală.

---

#### PROD-LEG-002 — DPIA Completare

| Câmp | Valoare |
|---|---|
| **Decizia de luat** | Finalizare DPIA (Data Protection Impact Assessment) — cine redactează, cine validează, termen |
| **Categorie** | LEGAL |
| **Severitate** | 🔴 RIDICAT |
| **Termen** | Obligatoriu înainte de lansare (GDPR Art.35) |
| **Lanț cauzal** | Decizie responsabil → redactare DPIA → consultare DPO → aprobare → documentare riscuri reziduale → operare legală |

**Opțiuni:**

| Opțiune | Pro | Contra |
|---|---|---|
| **A. Draft intern (echipă AI) + review DPO (reia 04.04.2026)** | Cost minim, aliniere cu timeline DPO | Dependent de disponibilitatea DPO |
| **B. Redactare completă de DPO** | Calitate garantată, responsabilitate clară | Cost mai mare, timeline DPO |
| **C. Template ANSPDCP completat intern** | Rapid, format recunoscut de autoritate | Poate fi superficial pentru complexitatea platformei |

**Recomandare echipă AI:** Opțiunea A — draftul AI acoperă 80% din conținut (avem deja TIA Anthropic aprobat), DPO validează și completează.

---

#### PROD-LEG-003 — Contracte Licență Instrumente Psihometrice

| Câmp | Valoare |
|---|---|
| **Decizia de luat** | Negociere și semnare contracte licență pentru instrumentele psihometrice utilizate în S1 (evaluare personal) |
| **Categorie** | LEGAL |
| **Severitate** | 🔴 RIDICAT |
| **Termen** | Obligatoriu înainte de lansare serviciu S1 |
| **Lanț cauzal** | Decizie furnizori → negociere licențe → semnare contracte → integrare instrumente → serviciu S1 operațional → revenue B2B |

**Opțiuni:**

| Opțiune | Pro | Contra |
|---|---|---|
| **A. Licențe prin contracte terți (deja planificat)** | Model validat, instrumente recunoscute | Cost per utilizare, dependență de furnizor |
| **B. Dezvoltare instrumente proprii validate științific** | Zero dependență, proprietate intelectuală | Timp 12-24 luni validare, cost cercetare |
| **C. Mix — licențiate pentru lansare, proprii pe termen lung** | Lansare rapidă + independență pe termen lung | Complexitate duală |

**Recomandare echipă AI:** Opțiunea C — licențiate pentru MVP/lansare (S1 funcțional rapid), dezvoltare instrumente proprii ca obiectiv pe 18-24 luni.

---

### RESURSE UMANE

---

#### PROD-RU-001 — Angajare Psiholog #3

| Câmp | Valoare |
|---|---|
| **Decizia de luat** | Angajare al treilea psiholog pentru acoperire capacitate B2C (supraveghere umană Art.14 AI Act) |
| **Categorie** | RESURSE UMANE |
| **Severitate** | 🟡 MODERAT |
| **Termen** | 3 luni înainte de lansare B2C |
| **Lanț cauzal** | Decizie angajare → recrutare → onboarding → capacitate supraveghere B2C → conformitate Art.14 → lansare B2C posibilă |

**Opțiuni:**

| Opțiune | Pro | Contra |
|---|---|---|
| **A. Angajare full-time psiholog clinic cu experiență digital** | Disponibilitate permanentă, integrare echipă | Cost salarial ~5000-7000 RON/lună |
| **B. Colaborare part-time/proiect** | Cost redus, flexibilitate | Disponibilitate limitată, integrare mai lentă |
| **C. Amânare — 2 psihologi existenți acoperă și B2C inițial** | Zero cost suplimentar | Supraîncărcare, risc burnout, risc conformitate |

**Recomandare echipă AI:** Opțiunea B pentru lansare, tranziție la A la 200+ utilizatori B2C activi. Cei 2 psihologi existenți (1 acreditat CPR) sunt suficienți pentru pilot.

---

#### PROD-RU-002 — Poziții Mentor per Card

| Câmp | Valoare |
|---|---|
| **Decizia de luat** | Dacă se introduc mentori umani per card B2C și în ce format (voluntar, plătit, supervizor AI) |
| **Categorie** | RESURSE UMANE |
| **Severitate** | 🟡 MODERAT |
| **Termen** | Post-validare B2C |
| **Lanț cauzal** | Decizie model mentoring → recrutare/selecție → training → integrare în flux card → experiență îmbogățită → retenție → diferențiere piață |

**Opțiuni:**

| Opțiune | Pro | Contra |
|---|---|---|
| **A. Mentori umani plătiți per sesiune (psihologi/coachi)** | Calitate, credibilitate, experiență premium | Cost ridicat, scalare dificilă |
| **B. Mentori voluntari din comunitate (utilizatori avansați)** | Cost zero, comunitate activă, peer learning | Risc calitate, necesită supraveghere |
| **C. Doar AI, fără mentori umani** | Scalabil, consistent, cost zero | Lipsă conexiune umană, posibil limitant pentru Card 1-2 |

**Recomandare echipă AI:** Opțiunea C pentru lansare (AI-ul e suficient de sofisticat), cu evaluare la 6 luni dacă se adaugă mentori umani pentru carduri premium.

---

#### PROD-RU-003 — Echipă Marketing Dedicată

| Câmp | Valoare |
|---|---|
| **Decizia de luat** | Angajare/contractare echipă marketing dedicată sau continuare cu agenții AI + Owner |
| **Categorie** | RESURSE UMANE |
| **Severitate** | 🟡 MODERAT |
| **Termen** | Q3 2026 |
| **Lanț cauzal** | Decizie echipă → recrutare/contractare → execuție plan marketing → vizibilitate crescută → lead-uri → clienți → revenue |

**Opțiuni:**

| Opțiune | Pro | Contra |
|---|---|---|
| **A. Freelancer marketing digital (part-time)** | Cost controlat (~3000-5000 RON/lună), flexibil | Disponibilitate limitată, lipsă dedicare |
| **B. Agenție marketing externalizată** | Echipă completă, experiență | Cost 5000-10000 RON/lună, pierdere control |
| **C. Continuare cu agenții AI + Owner execuție** | Cost zero, control total | Timp Owner consumat, limitare creativitate umană |

**Recomandare echipă AI:** Opțiunea A — freelancer specializat pe digital/LinkedIn pentru B2B. Agenții AI pregătesc conținutul, freelancerul execută și optimizează. Owner rămâne strategic.

---

### MARKETING

---

#### PROD-MKT-001 — Plan Marketing Unitar B2B+B2C

| Câmp | Valoare |
|---|---|
| **Decizia de luat** | Un singur plan marketing integrat B2B+B2C sau planuri separate cu puncte de intersecție |
| **Categorie** | MARKETING |
| **Severitate** | 🔴 RIDICAT |
| **Termen** | Q2 2026 |
| **Lanț cauzal** | Decizie structură plan → alocare resurse → execuție coerentă → brand consistent → piață educată → conversii ambele segmente |

**Opțiuni:**

| Opțiune | Pro | Contra |
|---|---|---|
| **A. Plan unitar cu secțiuni dedicate B2B/B2C** | Coerență brand, eficiență resurse, sinergie mesaje | Complexitate coordonare, risc mesaj diluat |
| **B. Planuri separate cu calendar comun** | Focus pe segment, mesaje specifice | Risc inconsistență, efort dublu |
| **C. B2B acum, B2C se adaugă organic când e gata** | Simplitate, focus | Lipsă pregătire, lansare B2C improvizată |

**Recomandare echipă AI:** Opțiunea A — plan unitar. Povestea e aceeași (spirala evoluției), publicul e diferit. Un singur fir narativ, două tonalități.

---

#### PROD-MKT-002 — Brand B2C

| Câmp | Valoare |
|---|---|
| **Decizia de luat** | Identitate vizuală B2C: sub-brand JobGrade, brand separat, sau brand umbrelă cu variante |
| **Categorie** | MARKETING |
| **Severitate** | 🔴 RIDICAT |
| **Termen** | 90 zile înainte de lansare B2C |
| **Lanț cauzal** | Decizie brand → design identitate → implementare UI → materiale marketing → lansare cu identitate clară → recunoaștere piață |

**Opțiuni:**

| Opțiune | Pro | Contra |
|---|---|---|
| **A. Sub-brand: "JobGrade Personal" sau "JobGrade Me"** | Capitalizare pe brandul existent, transfer credibilitate B2B | Asociere cu "job/grade" poate limita percepția B2C (e mai mult decât carieră) |
| **B. Brand complet separat (Metamorfoză / alt nume)** | Libertate creativă, identitate proprie, aliniare cu metafora crisalidă | Zero capital de brand, cost dublu marketing |
| **C. Brand umbrelă cu identitate vizuală diferențiată** | Sinergie fără confuzie, flexibilitate | Complexitate identitate, risc confuzie inițială |

**Recomandare echipă AI:** Opțiunea C — brand umbrelă. JobGrade rămâne B2B, B2C primește identitate vizuală proprie (crisalidă/fluture) sub aceeași umbrelă. Aliniare cu viziunea holding ("fabrică de afaceri").

---

#### PROD-MKT-003 — Content Strategy B2C

| Câmp | Valoare |
|---|---|
| **Decizia de luat** | Tipul de conținut, frecvența, canalele și tonul comunicării B2C |
| **Categorie** | MARKETING |
| **Severitate** | 🟡 MODERAT |
| **Termen** | 60 zile înainte de lansare B2C |
| **Lanț cauzal** | Decizie strategie conținut → creare calendar editorial → producție conținut → publicare → atragere audiență → conversie → comunitate |

**Opțiuni:**

| Opțiune | Pro | Contra |
|---|---|---|
| **A. Storytelling long-form (blog, newsletter, studii caz anonimizate)** | Profunzime, SEO, încredere, aliniare cu filozofia platformei | Efort mare producție, rezultate lente |
| **B. Short-form social (Instagram, TikTok, Reels)** | Reach mare, viralitate, generație tânără | Superficialitate, nu se potrivește cu profunzimea produsului |
| **C. Mix: articole lungi pe blog + clips din conversații AI (cu acord) pe social** | Dublu canal, conținut reutilizat | Necesită skills diverse (scriere + video) |

**Recomandare echipă AI:** Opțiunea A cu elemente din C — storytelling este fundamental (tot ce comunicăm extern e POVESTE). Blog + newsletter, cu fragmente adaptate pentru LinkedIn/Instagram. Fiecare paragraf crește interesul.

---

## SUMAR EXECUTIV

### Decizii CRITICE (necesită acțiune imediată)

| # | Decizie | Termen | Secțiune |
|---|---|---|---|
| BUILD-002 | Pagina Transparență AI | 2 aug 2026 | BUILD |
| BUILD-003 | Fallback Provider AI | Lansare B2B | BUILD |
| PROD-FIN-001 | Pricing B2C | Pre-lansare B2C | PRODUCTION |
| PROD-VNZ-001 | Go-to-Market B2C | Q2 2026 | PRODUCTION |
| PROD-LEG-001 | AI Act Compliance | 2 aug 2026 | PRODUCTION |
| PROD-MKT-001 | Plan Marketing Unitar | Q2 2026 | PRODUCTION |
| PROD-MKT-002 | Brand B2C | Pre-lansare B2C | PRODUCTION |

### Decizii RIDICATE (necesită planificare)

| # | Decizie | Termen | Secțiune |
|---|---|---|---|
| BUILD-001 | Secrets Management | Pre-audit | BUILD |
| BUILD-004 | Endpoint-uri GDPR | Lansare | BUILD |
| BUILD-006 | Chat Endpoints Incomplete | Lansare B2B/B2C | BUILD |
| BUILD-008 | Cost Monitoring API | Lansare | BUILD |
| PROD-FIN-002 | Budget Marketing | Mai 2026 | PRODUCTION |
| PROD-PRD-001 | Ordine Carduri B2C | Sprint planning | PRODUCTION |
| PROD-PRD-003 | Punte B2B↔B2C | Post-validare | PRODUCTION |
| PROD-LEG-002 | DPIA | Pre-lansare | PRODUCTION |
| PROD-LEG-003 | Licențe Psihometrice | Pre-lansare S1 | PRODUCTION |

### Decizii MODERATE (pot fi planificate)

| # | Decizie | Termen | Secțiune |
|---|---|---|---|
| BUILD-005 | Documentație Securitate | Pre-lansare | BUILD |
| BUILD-007 | Politică Creștere DB | Pre-lansare | BUILD |
| BUILD-009 | Session Hardening | Pre-lansare | BUILD |
| PROD-FIN-003 | Infrastructură vs Revenue | Pre-lansare | PRODUCTION |
| PROD-VNZ-002 | Canale Distribuție B2C | Pre-lansare B2C | PRODUCTION |
| PROD-VNZ-003 | Target 100 Clienți | Lansare B2C | PRODUCTION |
| PROD-PRD-002 | Comunități B2C | Post-lansare | PRODUCTION |
| PROD-RU-001 | Psiholog #3 | Pre-lansare B2C | PRODUCTION |
| PROD-RU-002 | Mentori per Card | Post-validare | PRODUCTION |
| PROD-RU-003 | Echipă Marketing | Q3 2026 | PRODUCTION |
| PROD-MKT-003 | Content Strategy B2C | Pre-lansare B2C | PRODUCTION |

---

> **Total decizii:** 24 (7 CRITICE, 9 RIDICATE, 8 MODERATE)  
> **Următorul review recomandat:** săptămânal, cu prioritate pe cele 7 CRITICE  
> **Document generat de:** Echipa AI JobGrade — 08.04.2026
