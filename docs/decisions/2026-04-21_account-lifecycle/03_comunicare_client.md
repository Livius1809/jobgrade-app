# Comunicare către client — DMA + T&C

**De verificat cu:** DMA (comunicare), CJA (formulare juridică), COG (automatizări)

## Principiu
Clientul trebuie să înțeleagă CLAR ce se întâmplă cu datele și contul lui în fiecare moment. Zero surprize. Comunicare proactivă, nu reactivă.

## Canale de comunicare per scenariu

### S1 — Nu plătește / abandon
| Moment | Canal | Mesaj |
|---|---|---|
| Ziua 0 | Portal | Banner: "Ai 30 de zile pentru a activa un pachet" |
| Ziua 23 (7 zile rămase) | Email + Portal | "Datele tale vor fi șterse în 7 zile. Descarcă-le acum." |
| Ziua 27 (3 zile) | Email + Portal | "Ultimele 3 zile. Activează un pachet sau descarcă datele." |
| Ziua 29 (1 zi) | Email | "Mâine ștergem datele. Link rapid: descarcă / activează." |
| Ziua 30 | Email | "Datele au fost șterse. Poți reveni oricând cu un cont nou." |

### S2 — Export înainte de ștergere
| Moment | Canal | Mesaj |
|---|---|---|
| La cerere ștergere | Portal | Buton "Descarcă arhiva completă" ÎNAINTE de confirmare |
| După descărcare | Portal | Confirmare: "Arhiva a fost descărcată. Poți continua cu ștergerea." |
| Fără descărcare | Portal | Avertisment: "Nu ai descărcat datele. Sigur vrei să continui?" |

### S3 — Revine după pauză
| Moment | Canal | Mesaj |
|---|---|---|
| La login (cont suspendat) | Portal | "Bine ai revenit! Contul tău e suspendat. Reactivează-l cu un abonament." |
| La login (cont șters) | Portal | "Contul anterior a fost șters. Poți crea unul nou și importa datele exportate." |
| După reactivare | Email + Portal | "Contul a fost reactivat. Datele și creditele tale sunt disponibile." |

### S5 — Abonament expirat
| Moment | Canal | Mesaj |
|---|---|---|
| Plata eșuată | Email | "Plata abonamentului nu a reușit. Actualizează metoda de plată." |
| Grace period (7 zile) | Portal | Banner roșu: "Abonamentul a expirat. Ai 7 zile pentru reînnoire." |
| Suspendare | Email + Portal | "Contul a fost suspendat. Datele sunt disponibile read-only 30 zile." |

### S6 — Credite rămase
| Moment | Canal | Mesaj |
|---|---|---|
| La suspendare | Portal | "Ai X credite disponibile. Reactivează abonamentul pentru a le folosi." |
| La ștergere | Email | "Contul va fi șters. X credite nefolosite vor fi pierdute." |

### S7 — Credite insuficiente
| Moment | Canal | Mesaj |
|---|---|---|
| La generare | Portal | "Această operație consumă X credite. Ai Y disponibile. Cumpără Z credite." |
| Preventiv | Portal | Banner informativ: "Îți mai rămân X credite. Pentru pachetul complet ai nevoie de Y." |

## Unde se documentează — Termeni și Condiții

Toate scenariile de mai sus TREBUIE reflectate în T&C. Secțiuni obligatorii:

### Secțiuni T&C necesare
1. **Cont și acces** — creare, trial, conversie, suspendare, ștergere
2. **Abonament** — durată, reînnoire automată, anulare, grace period
3. **Credite** — achiziție, utilizare, expirare (nu expiră), nerambursare, pierdere la ștergere
4. **Pachete servicii** — ce include fiecare nivel, upgrade, downgrade
5. **Date și confidențialitate** — retenție 30 zile post-expirare, export, GDPR
6. **Facturare** — TVA, moment emitere, format, retenție 10 ani
7. **Dreptul la ștergere** — procedură, termen 30 zile, ce se păstrează (fiscal)
8. **Răspundere** — disponibilitate platformă, backup, pierdere date

### Ton comunicare (reguli DMA)
- **Clar, direct, fără jargon juridic** — clientul trebuie să înțeleagă fără avocat
- **Empatic dar ferm** — "Înțelegem, dar regulile sunt clare"
- **Proactiv** — comunicăm ÎNAINTE să se întâmple, nu după
- **Soluții, nu probleme** — fiecare avertisment vine cu un buton de acțiune
- **Zero presiune agresivă** — nu "ULTIMUL EMAIL!!!", ci "Voiam să te asigurăm că..."
- **Storytelling** — fiecare email are context, nu doar o notificare seacă

### Template email exemplu (S5 — abonament expirat)

**Subiect:** Abonamentul tău JobGrade — ce urmează

**Corp:**
Bună [Prenume],

Abonamentul tău JobGrade a expirat pe [data]. Înțelegem — uneori prioritățile se schimbă.

Ce se întâmplă acum:
- Datele tale sunt în siguranță încă 30 de zile
- Poți descărca rapoartele și datele oricând
- Creditele tale (X disponibile) nu expiră

Ce poți face:
→ [Reactivează abonamentul] — accesul revine instant
→ [Descarcă arhiva completă] — tot ce ai generat, într-un click
→ [Contactează-ne] — dacă ai întrebări

Cu respect,
Echipa JobGrade

*Acest email a fost trimis automat. Nu vrem să te deranjăm — dacă ai ales să nu continui, acesta este ultimul email pe acest subiect.*
