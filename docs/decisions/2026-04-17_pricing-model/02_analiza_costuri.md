# Analiză costuri — Cost real per serviciu

**Sursa:** docs/cost-per-interaction-analysis.md + prețuri Anthropic + infrastructură

## Cost AI per serviciu (Claude Sonnet $3/$15 per 1M tokeni)

### BAZA — Ordine internă
| Serviciu | Componente AI | Cost AI/unitate | Unitate |
|---|---|---|---|
| Evaluare JE AUTO | Evaluare 6 criterii per post | ~$0.10 | per poziție |
| Fișe de post AI | Generare fișă completă | ~$0.07 | per fișă |
| Structură salarială | Calcul clase + trepte (Pitariu) | ~$0.05 | per proiect + $0.005/sal |

### LAYER 1 — Conformitate
| Serviciu | Componente AI | Cost AI/unitate | Unitate |
|---|---|---|---|
| Pay gap Art. 9 | Analiză categorii, justificări | ~$0.08 | per proiect + $0.003/sal |
| Benchmark salarial | Comparație percentile piață | ~$0.06 | per proiect + $0.01/poz |

### LAYER 2 — Competitivitate
| Serviciu | Componente AI | Cost AI/unitate | Unitate |
|---|---|---|---|
| Pachete salariale | Compensații + beneficii | ~$0.05 | per proiect + $0.005/poz |
| Evaluare performanță | KPI per angajat | ~$0.08 | per angajat |
| Impact bugetar | Simulare ajustări | ~$0.05 | flat |

### LAYER 3 — Dezvoltare
| Serviciu | Componente AI | Cost AI/unitate | Unitate |
|---|---|---|---|
| Dezvoltare HR | Plan + aspirații | ~$0.05 | per proiect + $0.005/sal |
| Recrutare | Design proces + gestionare | ~$0.10 | per proiect |
| Manual angajat | Generare document | ~$0.05 | per proiect + $0.008/poz |

## Costuri infrastructură (lunare, fixe = CAPEX)
| Componentă | Cost lunar |
|---|---|
| Vercel Pro | ~$20 |
| Neon DB | ~$19 |
| Upstash Redis | ~$10 |
| Domeniu + DNS | ~$3 |
| **Total CAPEX** | **~$52/lună** |

## Cost operațional organism (background)
- ~$94/lună (45 agenți activi, cicluri proactive)
