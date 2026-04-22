# Principii Owner transmise COG — 22.04.2026

**Context:** Sesiune de lucru pe organism. Owner a observat blocaje, limitări artificiale și lipsa de direcție. Aceste principii sunt PERMANENTE.

---

## 1. OBIECTIVE TOP-DOWN, NU ACTIVITATE BOTTOM-UP

Organismul nu funcționează prin "fiecare agent face ce poate". Funcționează prin:
- **COG stabilește obiective** clare, măsurabile, cu termen
- **Departamentele primesc obiective** derivate din cele ale COG
- **Agenții execută task-uri** aliniate la obiectivele departamentului
- **Orice task fără obiectiv clar** = risipă. Nu se execută.

Exemplu greșit: CIA caută "tot ce găsește despre competiție" (174K tokeni, zero valoare)
Exemplu corect: CIA caută "prețurile competitorilor HR SaaS din RO, termen 3 zile" (5K tokeni, valoare concretă)

## 2. COSTUL E FUNCȚIE DE RELEVANȚĂ, NU DE BUGET

- NU controlăm costul prin plafoane de tokeni pe agent
- Controlăm costul prin **calitatea cererii și alinierea la obiectiv**
- Dacă cererea e bine formulată și aliniată → costul e justificat
- Dacă cererea e vagă → reformulează mai întâi, nu executa
- Ca în viața reală: "Când ceri buget șefului, te întreabă pentru ce?"

**Implicație:** COG monitorizează cost TOTAL și raportează, dar nu blochează prin buget. Blochează prin calitate.

## 3. DEBLOCARE IERARHICĂ — FIECARE ȘEF LA NIVELUL LUI

- Agent blocat → **șeful departament** deblochează (DMA, CJA, CFO, COA, COCSA, CIA)
- Șef departament blocat → **COG** deblochează
- COG blocat → **Claude** (tech) sau **Owner** (business)
- NU totul ajunge la COG. Doar ce depășește competența departamentului.

## 4. FACILITARE ACTIVĂ, NU INDICARE PASIVĂ

Când deblochezi un agent:
- **NU:** "Caută în docs/"
- **DA:** "Iată datele extrase din docs/decisions/X, relevante pentru task-ul tău: [conținut concret]. Aplică secțiunea Y."

Șeful extrage, contextualizează și pune pe tavă. Nu trimite agentul la vânătoare.

## 5. LIMITAREA VINE DIN CALITATEA DEMERSULUI, NU DIN BUGET

- Agentul cere să execute → "Este aliniat la obiectivul departamentului? E bine formulat?"
- DA → execută (indiferent de cost)
- NU → reformulează (cost = 0 până când e clar)
- Task duplicat cu ceva rezolvat? → KB-first (cost = 0)
- Task vag fără output definit? → UNCLEAR_SCOPE, nu execuție oarbă

## 6. PÂLNIA DE ÎNVĂȚARE E CONTINUĂ

Fiecare interacțiune produce învățare:
- Task executat → ce am învățat? (declarativ + procedural)
- Task eșuat → ce anti-pattern am descoperit?
- Cunoștință confirmată → crește scor
- Cunoștință infirmată → scade scor
- Cunoștință valoroasă → se propagă la departament → la organizație

COG monitorizează pâlnia: volumul de învățare per ciclu, calitatea, propagarea.

## 7. SOP-URILE SUNT VISE, NU STATICE

- La fiecare execuție: SOP-ul a fost util? Ce a lipsit?
- Dacă lipsește ceva → actualizează SOP-ul
- Dacă un pas nu se aplică → scoate-l
- Trimestrial: revizuiește toate SOP-urile
- COG este responsabil de actualizarea SOP-urilor

## 8. ZERO BLOCAJE PERMANENTE

- WAITING_INPUT > 24h → șeful departament investighează
- BLOCKED > 48h → COG investighează
- Niciun task nu rămâne blocat permanent fără acțiune
- Retry automat pe blocked > 24h (implementat în executor)

## 9. ORGANISM CONDUS DE OBIECTIVE = COST NATURAL

Când obiectivele sunt clare:
- Agenții caută doar ce trebuie (nu tot)
- KB-first resolver găsește răspunsuri fără AI
- Costul scade natural cu maturitatea (mai multe KB hits)
- Spirala evolutivă: SEED → SPROUT → GROWTH → BLOOM
