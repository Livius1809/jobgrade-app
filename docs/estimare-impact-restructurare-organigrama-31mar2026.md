# ESTIMAREA NATURII ȘI ANVERGURII IMPACTULUI SCHIMBĂRII ORGANIGRAMEI
**Data: 31.03.2026**

---

## Schimbarea propusă
Restructurare COCSA: din 12 agenți flat → sub-manageri dedicați (marketing, vânzări, operațiuni).

---

## IMPACT PER PUNCT DIN CARACTERIZARE

### 1. ORGANIZAȚIONAL — Impact MARE

| Aspect | Ce se schimbă | Risc |
|---|---|---|
| Relații ierarhice | Agenții SOA, ACA, CMA, CWA, MKA, BCA, CDIA capătă manageri noi | Reconfigurare AgentRelationship în DB |
| Manageri noi | +2-3 manageri → noi cicluri proactive, noi niveluri distilare | Crește adâncimea ierarhiei (verificat max 5) |
| COCSA | Se ușurează (de la 12 direct reports la 3-4) | Risc mic — e o îmbunătățire |
| PMA | Deja are 13 subordonați — și el ar trebui evaluat | Posibil PMA e și el supraîncărcat |

### 2. TEHNIC — Impact MEDIU

| Aspect | Ce se schimbă | Risc |
|---|---|---|
| manager-configs.ts | Adăugare configurări noi manageri | Trebuie actualizat (sau automat din DB) |
| escalation-chain.ts | Noi căi de escaladare | Automat dacă folosim DB registry |
| proactive-loop.ts | Noi cicluri la 4h/12h | Consum suplimentar Claude API (~$5/lună) |
| Teste E2E | Pot necesita ajustare | Retestare post-restructurare |

### 3. CUNOAȘTERE — Impact MARE (pozitiv)

| Aspect | Ce se schimbă | Efect |
|---|---|---|
| Distilare | Manageri noi filtrează informații → mai puține duplicate | REZOLVĂ problema KB poluat |
| Propagare | Fluxurile devin mai precise (manager filtrează) | Calitate mai bună |
| Knowledge request | Mai multe niveluri de cascadare | Rutare mai inteligentă |
| Brainstorming | Manageri noi pot iniția brainstorm cu echipa lor | Idei mai focusate per domeniu |

### 4. MORAL/ETIC — Impact ZERO

| Aspect | Ce se schimbă |
|---|---|
| CÂMPUL | NU se schimbă — e transcendent |
| BINELE | NU se schimbă — e principiu fundamental |
| UMBRA | NU se schimbă — SCA operează la fel |
| Comunicare externă | NU se schimbă |
| Veto | NU se schimbă |

### 5. BUSINESS — Impact MIC

| Aspect | Ce se schimbă |
|---|---|
| Holding vision | NU se schimbă |
| Idea Refinery | Funcționează la fel (7 dimensiuni) |
| Execution layer | Marketing/Sales executor funcționează mai bine cu manageri dedicați |
| Research | NU se schimbă (RDA+CIA în curs) |

### 6. LEGAL/CONFORMITATE — Impact ZERO

| Aspect | Ce se schimbă |
|---|---|
| GDPR | NU — nu depinde de organigramă |
| Directiva EU | NU — platforma rămâne aceeași |
| AI Act | Documentația tehnică (Art.11) trebuie actualizată cu noua structură |

### 7. AUTONOMIE — Impact MEDIU

| Aspect | Ce se schimbă |
|---|---|
| Cron-uri | Trebuie adăugate cicluri proactive pentru managerii noi |
| FLUX-024 | Se extinde automat dacă managerii noi sunt în manager-configs |
| FLUX-037 (distilare) | Funcționează automat — detectează manageri din DB |
| Raport zilnic | Se actualizează automat (numără din DB) |

### 8. PRODUS/SERVICII — Impact ZERO

| Aspect | Ce se schimbă |
|---|---|
| B2B funcționalități | NU — codul platformei nu se schimbă |
| B2C planificare | NU |
| Manuale | NU |
| Evaluare posturi | NU |

### 9. LIVRABILE — Impact MIC

| Aspect | Ce se schimbă |
|---|---|
| Organigrama | Trebuie regenerată |
| Raport COG | Se actualizează automat |
| Restul documentelor | NU se schimbă |

### 10. BLOCANTE — Impact POZITIV

| Aspect | Ce se schimbă |
|---|---|
| KB poluat duplicate | SE REZOLVĂ — manageri filtrează |
| Escalare zero COCSA | SE REZOLVĂ — manageri noi au cicluri |
| COG micro-management | SE REZOLVĂ — delegare la manageri |

---

## CE NU TREBUIE SCHIMBAT

| # | Element | De ce NU se schimbă |
|---|---|---|
| 1 | CÂMPUL + BINELE + UMBRA | Fundament moral transcendent — independent de organigramă |
| 2 | Resursele suport (9 agenți) | Sunt nucleul de cunoaștere — nu se mută, nu se reorganizează |
| 3 | Raportarea resurselor suport la PMA | PMA coordonează produsul + suportul — separarea ar fragmenta |
| 4 | COG → COA + COCSA | Structura strategică e corectă — doi piloni (tehnic + business) |
| 5 | COA și sub-structura lui | EMA, QLA, PMA — funcționează bine, testat |
| 6 | Mecanismele de cunoaștere | Distilare, support dept, knowledge request — funcționează independent de organigramă |
| 7 | Ciclurile proactive existente | EMA (4h), QLA (4h), CSSA (4h) — validate |
| 8 | HR_COUNSELOR ca client-facing | NU e resursă suport — e interfața cu clientul B2B |
| 9 | SAFETY_MONITOR direct la COG | Siguranța B2C raportează direct strategic — nu prin intermediari |
| 10 | CIA, CJA, CCIA direct la COG | Intelligence + legal + counter-intel = funcții strategice, nu operaționale |
| 11 | Schema Prisma | Structura de date nu se schimbă — AgentRelationship acoperă orice organigramă |
| 12 | API-urile existente | Toate endpoint-urile funcționează indiferent de organigramă |
| 13 | Regula comunicare externă | Independentă de structură |
| 14 | Procesul brainstorming + scoring | Funcționează pe orice structură |
| 15 | Adâncimea max 5 niveluri | Nu se încalcă — suntem la 4, adăugăm manageri la nivel existent |

---

## REZUMAT IMPACT

| Punct caracterizare | Impact | Natură |
|---|---|---|
| 1. Organizațional | MARE | Restructurare relații |
| 2. Tehnic | MEDIU | Configurări noi manageri |
| 3. Cunoaștere | MARE POZITIV | Rezolvă duplicate + escalare |
| 4. Moral/Etic | ZERO | Transcendent |
| 5. Business | MIC | Execution mai bun |
| 6. Legal | ZERO | Independent |
| 7. Autonomie | MEDIU | Noi cicluri proactive |
| 8. Produs | ZERO | Codul nu se schimbă |
| 9. Livrabile | MIC | Regenerare organigramă |
| 10. Blocante | POZITIV | Rezolvă 3 blocante |

---

## CONCLUZIE

Restructurarea COCSA are impact **localizat** (doar relații ierarhice + configurări manageri) dar efect **sistemic pozitiv** (rezolvă KB duplicate, escalare zero, micro-management).

Fundația (CÂMPUL, mecanisme cunoaștere, API-uri, schemă, produs) **NU se schimbă**.

Anvergura schimbării: **MEDIE** — nu e refactoring major, ci adăugare de noduri manageriale în structură existentă, cu efecte pozitive în cascadă.
