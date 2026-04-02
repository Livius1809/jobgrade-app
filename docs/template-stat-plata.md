# Template Import Stat de Plată — JobGrade

## Instrucțiuni

Completați fișierul Excel conform structurii de mai jos.
Fiecare rând = un post din organizație.
**NU includeți nume de angajați, CNP sau alte date cu caracter personal.**

## Structura fișierului (21 coloane)

| Coloană | Denumire | Obligatoriu | Format | Exemplu | Observații |
|---------|----------|-------------|--------|---------|------------|
| A | Cod post intern | DA | Text | FIN-003 | Codul folosit intern |
| B | Denumire post | DA | Text | Contabil senior | Fără abrevieri |
| C | Departament | DA | Text | Financiar | Numele departamentului |
| D | Nivel ierarhic | DA | Lista | N-2 | N=CEO, N-1=Director, N-2=Manager, N-3=Specialist, N-4=Execuție, N-5+=Entry |
| E | Familie de posturi | DA | Text | Financiar-Contabilitate | Grupare funcțională |
| F | Grad/clasă salarială | NU | Număr | 6 | Dacă aveți deja clasificare; altfel lăsați gol |
| G | Salariu bază brut (RON/lună) | DA | Număr | 7200 | Fără punct mii, fără „RON" |
| H | Sporuri fixe (RON/lună) | DA | Număr | 500 | 0 dacă nu are |
| I | Bonusuri/prime (RON/an) | DA | Număr | 3600 | Total anual; 0 dacă nu are |
| J | Comisioane (RON/an) | DA | Număr | 0 | Total anual; 0 dacă nu are |
| K | Beneficii în natură (RON echiv/lună) | DA | Număr | 800 | Estimare lunară; 0 dacă nu are |
| L | Tichete masă/vacanță (RON/lună) | DA | Număr | 400 | 0 dacă nu are |
| M | Gen | DA | Lista | F | F sau M |
| N | Norma de lucru | DA | Lista | 8h | 2h, 4h, 6h, 8h |
| O | Tip contract | DA | Lista | CIM nedeterminat | CIM nedeterminat / CIM determinat / Convenție |
| P | Vechime organizație (ani) | DA | Număr | 5 | Ani completi |
| Q | Vechime post (ani) | DA | Număr | 3 | Ani completi |
| R | Loc de muncă | DA | Lista | Sediu | Sediu / Remote / Hibrid |
| S | Localitate | DA | Text | București | Orașul unde lucrează |
| T | Studii | DA | Lista | Superioare | Medii / Superioare / Master / Doctorat |
| U | Certificări/Atestări | NU | Text | Auditor CAFR | Libere; gol dacă nu are |

## Note importante

1. **Confidențialitate:** NU includeți nume, prenume, CNP sau adresa angajaților
2. **Un rând per post:** Dacă aveți 3 contabili seniori, sunt 3 rânduri separate
3. **Norma de lucru:** Salariile vor fi normalizate automat la 8h pentru comparabilitate
4. **Sporuri/Bonusuri:** Includeți TOATE componentele — legea cere raportare pe fix + variabil
5. **Gen:** Obligatoriu — necesar pentru raportarea pay gap conform legii
6. **Grad existent:** Dacă aveți deja o clasificare internă, completați coloana F. Platforma va compara cu evaluarea obiectivă.

## Validări automate la import

Platforma verifică automat:
- Salariu bază > 0
- Gen = F sau M
- Norma = 2h, 4h, 6h sau 8h
- Departament completat
- Nivel ierarhic valid (N, N-1, N-2, N-3, N-4, N-5+)

Rândurile invalide sunt semnalate dar nu blochează importul celorlalte.
