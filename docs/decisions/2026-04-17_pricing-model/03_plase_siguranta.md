# Plase de siguranță — Protecție la variații costuri

## Algoritmul pe 3 plase (decis cu Owner 16-17.04.2026)

```
COST REAL MĂSURAT (telemetry)
    ↓
[PLASA 1] Cost furnizor MAXIM/ACOPERITOR
    Înlocuim costul real cu worst-case istoric
    Ex: Sonnet $3/$15 azi → folosim $5/$20 (preț maxim observat)
    Protejează la: creșteri de preț Anthropic
    ↓
[PLASA 2] Conversie USD → RON la BNR + 10%
    Curs BNR 4.95 RON/USD + 10% = 5.445 RON/USD
    Protejează la: fluctuații valutare
    ↓
[PLASA 3] Multiplicare cu MARJA
    Cost acoperitor × factor marjă = preț final
    Factor: 3-5× (în funcție de serviciu)
    ↓
PREȚ FINAL ÎN RON → conversie în credite
```

## Exemplu aplicat: Evaluare JE AUTO per poziție

| Pas | Valoare | Explicație |
|---|---|---|
| Cost real AI | $0.10 | Sonnet $3/$15, ~8K input + ~3K output tokeni |
| [P1] Cost acoperitor | $0.17 | Sonnet $5/$20 (worst case) |
| [P2] Conversie RON | 0.93 RON | $0.17 × 5.445 RON/USD |
| [P3] Marjă ×5 | 4.63 RON | 0.93 × 5 |
| Preț în credite | ~0.58 cr | 4.63 / 8 RON/credit |
| **Rotunjit** | **60 credite/10 poz** | ~6 cr/poz pur AI, dar include overhead |

**Notă:** Cele 60 credite/poziție includ:
- Cost AI evaluare (~6 cr)
- Overhead infrastructură (~2 cr)
- Overhead organism background (~1 cr)
- Marjă serviciu (~51 cr)
- **Marja efectivă: ~85%**

## Marje per layer (reconstituite)

| Layer | Cost real/poz | Cost acoperitor/poz | Preț credit/poz | Marja efectivă | Marja acoperitoare |
|---|---|---|---|---|---|
| BAZA (JE+fișe+structură) | ~0.90 RON | ~1.50 RON | 60+12=72 cr × 8=576 RON/10poz | ~98% | ~97% |
| + Layer 1 | ~1.20 RON | ~2.00 RON | +~25 cr | ~95% | ~92% |
| + Layer 2 | ~1.80 RON | ~3.00 RON | +~50 cr | ~93% | ~88% |
| + Layer 3 | ~2.50 RON | ~4.00 RON | +~80 cr | ~90% | ~83% |

**Concluzie Owner:** Marjele sunt confortabile (83-98% worst case). Rezistente la creștere preț API 5×.
