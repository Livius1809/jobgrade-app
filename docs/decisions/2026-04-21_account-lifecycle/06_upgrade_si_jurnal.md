# Upgrade, credite suplimentare și jurnal cheltuieli

**Data:** 21.04.2026
**Status:** DE IMPLEMENTAT

## 3 scenarii de checkout

### Scenariu A — Client nou, prima achiziție
- **Flow actual** (implementat): alege pachet → completează poziții/salariați → opțional credite → Plătește → Stripe
- Funcționează corect

### Scenariu B — Client vechi, upgrade pachet
- Are deja L1 (Baza), vrea L2 (Conformitate)
- **Calculatorul arată:**
  - Situație curentă: "Ai activ: Ordine internă (Baza) — plătit X RON"
  - Servicii noi: preț L2 complet
  - Prorata abonament: zile rămase din abonamentul curent → credit
  - Diferență abonament nou: proporția din noul abonament
  - **Rest de plată** = servicii L2 - credit prorata + diferență abonament
  - Opțional: credite suplimentare
- **După plată:** ServicePurchase.layer se actualizează, taburi noi se activează
- **Facturare:** pe noul pachet complet (nu pe diferență)

### Scenariu C — Client vechi, doar credite
- Are deja pachet activ, vrea doar credite suplimentare
- **Flow:** selectează pachet credite din tabel → Plătește → doar creditele
- NU se recalculează servicii sau abonament
- Calculatorul arată: "Situație curentă: Ordine internă (Baza) — X credite disponibile"

## Jurnal cheltuieli client

### Ce conține
Fiecare acțiune care consumă credite, cu:
- **Data și ora** exactă
- **Tipul acțiunii**: evaluare JE, generare fișă, simulare, raport, consultanță AI, validare
- **Credite consumate** per acțiune
- **Durata** (pentru consultanță AI: minute vorbite)
- **Detalii**: ce post, ce raport, ce simulare
- **Sold rămas** după acțiune

### Exemplu jurnal
```
21.04.2026 14:32  Evaluare JE AUTO — Director Financiar        -60 cr   Sold: 440 cr
21.04.2026 14:33  Evaluare JE AUTO — Analist IT                -60 cr   Sold: 380 cr
21.04.2026 14:35  Fișă post AI — Director Financiar            -12 cr   Sold: 368 cr
21.04.2026 15:10  Consultanță AI — 8 min conversație           -4 cr    Sold: 364 cr
21.04.2026 15:45  Simulare salarială — scenariu "creștere 10%" -5 cr    Sold: 359 cr
22.04.2026 09:00  Generare raport master                       -20 cr   Sold: 339 cr
22.04.2026 09:15  Revalidare evaluare — Director Financiar     -15 cr   Sold: 324 cr
```

### Unde se afișează
- **În portal**: secțiune "Istoric cheltuieli" — tabel paginat, filtrabil pe tip/perioadă
- **Export**: descărcare Excel/PDF — "factura detaliată" pe creditele consumate
- **În calculatorul de preț**: "Situație curentă: X credite disponibile" cu link la jurnal

### Implementare tehnică
- Modelul `CreditTransaction` EXISTĂ deja cu câmpurile necesare
- Trebuie extins cu: `metadata Json?` (tip acțiune, durata, detalii)
- Trebuie UI: pagină jurnal + widget sold în portal
- Fiecare funcție care apelează `deductCredits()` trebuie să pase metadata
