# Decizie: Organism reliable — sesiune dedicată

**Data:** 21.04.2026
**Status:** DE IMPLEMENTAT (prioritate #1 sesiunea următoare)

## Problema descoperită azi
- Alignment checker prea strict → 42 task-uri blocked pe "RESOURCE" (label greșit)
- Kill-switch EXECUTOR_CRON_ENABLED=false local (true pe Vercel)
- Guard ore bloca executorul la 22:00 EET
- 0 task-uri in progress, 63 overdue — organismul era mort

## Fix aplicat azi
- isRoutine = orice task FĂRĂ taguri sensibile (bypass alignment)
- Guard ore: skip pentru apeluri manuale (x-internal-key)
- Deblocat task-uri pe prod (BLOCKED → ASSIGNED)
- Executorul a rulat: 5 procesate, 1 COMPLETED, de la 44 blocked → 8 blocked

## Decizie Owner (21.04.2026 seara)

### Lanț escalare corect
```
Task blocat → COG investighează → rezolvă cu resurse proprii
                                  SAU escalează la Claude (ticket tech)
                                  
Owner NU vede blocaje tehnice.
Owner vede DOAR decizii strategice care necesită input-ul lui.
```

### Ce trebuie implementat (sesiune dedicată)
1. **Scos guard ore complet** — task-urile se execută când există
2. **Kill-switch ON by default** — nu OFF
3. **Alignment check simplificat** — Nivel 1 (interzise) + bypass. Task creat de COG/Owner = deja validat
4. **Retry automat** pe task-uri eșuate — nu BLOCKED permanent
5. **COG monitorizează blocaje** — rezolvă sau escalează la Claude ca ticket tech
6. **Zero notificări Owner** pentru blocaje tehnice — doar decizii strategice
7. **Executor procesează toată coada** — nu doar batch de 5

### Principiu
Organismul trebuie să fie RELIABLE — nu supus hazardului, nu dependent de cron-uri care merg sau nu merg, nu de kill-switch-uri uitate pe false.
