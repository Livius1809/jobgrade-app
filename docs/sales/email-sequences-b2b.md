# Email Sequences — Onboarding B2B

## Secvența 1: Post-Demo (lead nurturing)

### Email 1 — Imediat după demo
**Subiect:** Rezumatul conversației noastre + pașii următori

Bună [Prenume],

Mulțumesc pentru timpul acordat azi.

Am discutat despre [rezumat personalizat — 2 fraze]. Ce am reținut ca prioritar pentru [Companie]:
- [Punct 1 specific din discuție]
- [Punct 2 specific din discuție]

Atașez:
- One-pager cu rezumatul platformei
- Estimare personalizată pentru [X] poziții distincte: [Y] RON

Dacă aveți întrebări sau doriți să implicați un coleg în decizie, sunt la dispoziție.

Cu respect,
[Nume] | JobGrade

---

### Email 2 — Ziua 3
**Subiect:** Un lucru pe care companiile îl descoperă târziu

Bună [Prenume],

Majoritatea companiilor cu care discutăm nu știu câte poziții distincte au de fapt. Cred că au 40, dar la inventariere descoperă 85.

Diferența contează: atât pentru costul evaluării, cât și pentru acuratețea grilei salariale.

Am pregătit un ghid scurt (2 pagini) pentru inventarierea poziițiilor distincte — util indiferent dacă alegeți JobGrade sau nu.

[Link ghid]

Spor,
[Nume]

---

### Email 3 — Ziua 7
**Subiect:** Ce se întâmplă pe 7 iunie 2026?

Bună [Prenume],

România transpune Directiva EU 2023/970. De la acea dată, companiile cu 100+ angajați trebuie să demonstreze că au criterii obiective de salarizare.

Ce înseamnă concret:
- Sarcina probei e inversată — compania demonstrează non-discriminarea
- Angajații pot solicita informații despre media salarială pe categorie
- Amenzi și litigii pentru lipsa unui sistem documentat

Nu e urgență — e planificare. Companiile care încep acum ajung pregătite.

Dacă aveți întrebări, sunt aici.

[Nume]

---

### Email 4 — Ziua 14
**Subiect:** [Companie] + JobGrade: estimare personalizată

Bună [Prenume],

Am pregătit o estimare mai detaliată pentru [Companie], pe baza a ceea ce am discutat:

- Poziții estimate: [X]
- Plan recomandat: [Professional]
- Investiție: [Y] RON (preț de lansare, -25%)
- Durată estimată: 2-3 săptămâni
- Economie vs. consultanță: [Z] RON

Prețul de lansare e garantat pentru primele 20 de companii. Momentan [N] locuri rămase.

Doriți să începem?

[Nume]

---

## Secvența 2: Post-Signup (onboarding client activ)

### Email 1 — Imediat după activare cont
**Subiect:** Bine ați venit în JobGrade — primii 3 pași

Bună [Prenume],

Contul [Companie] este activ. Iată ce urmează:

**Pasul 1 — Completați profilul companiei** (5 min)
Obiectul de activitate și câteva detalii de bază. [Link]

**Pasul 2 — Adăugați primele posturi** (10-15 min)
Importați din Excel sau creați manual. [Link]

**Pasul 3 — Formați comitetul** (2 min)
Invitați 3-5 colegi care vor evalua. [Link]

Aveți o sesiune de onboarding inclusă (60 min). Programați-o oricând: [Link calendar]

[Nume] — Account Manager

---

### Email 2 — Ziua 2
**Subiect:** Cum alegi membrii comitetului de evaluare

Bună [Prenume],

Comitetul face diferența între o evaluare formală și una utilă. Recomandarea noastră:

- **HR Director / Manager** — cunoaște fișele de post
- **Director operațional** — cunoaște complexitatea reală
- **Director financiar** — validează impactul bugetar
- **1-2 manageri de linie** — cunoasc posturile din teren

Ideal: 3-5 persoane. Mai puțini = subiectivitate, mai mulți = logistică grea.

Când sunteți gata, invitați-i din [Settings → Users]. [Link]

---

### Email 3 — Ziua 5
**Subiect:** Prima sesiune de evaluare — ce să așteptați

Bună [Prenume],

Ați adăugat [X] posturi și [Y] membri în comitet.

La prima sesiune de evaluare:
1. Fiecare membru scorează independent pe 6 criterii
2. Platforma calculează convergența automat
3. Unde sunt divergențe, se deschide runda de consens
4. Facilitatorul arbitrează dacă e necesar

Durata medie: 30-60 min pentru 10 posturi.

Sfat: începeți cu posturile pe care le cunoașteți cel mai bine — creează un benchmark natural.

---

### Email 4 — Ziua 10
**Subiect:** Primele rezultate sunt gata

Bună [Prenume],

Observ că ați finalizat evaluarea pe [X] posturi.

Ce puteți face acum:
- **Raport grading** — ierarhia posturilor cu scor și grad [Link]
- **Analiza pay gap** — dacă ați importat date salariale [Link]
- **Export PDF** — documentație gata pentru audit [Link]

Dacă ceva nu arată cum v-ați așteptat, nu e greșit — e un semnal. Exact pentru asta e evaluarea: face vizibil ce intuiția simțea dar nu putea demonstra.

---

### Email 5 — Ziua 21
**Subiect:** Un pas dincolo de conformitate

Bună [Prenume],

Ați implementat evaluarea. Sunteți conformi. Dar asta e doar fundația.

Ce puteți construi pe ea:
- **Grile salariale coerente** — bazate pe complexitate reală, nu pe negociere
- **Plan de succesiune** — știți care posturi sunt critice
- **Buget de compensare** — simulări what-if înainte de a promite

Acestea sunt disponibile în plan [Professional/Enterprise]. Dacă doriți o sesiune de 15 min să explorăm, sunt aici.

---

## Note de implementare

- Secvența 1 (lead nurturing) se declanșează la submit formular demo
- Secvența 2 (onboarding) se declanșează la activare cont
- Provider: Resend (configurat în .env)
- Personalizare: [Prenume], [Companie], [X poziții], [Plan], [Preț]
- Tracking: open rate, click rate pe link-uri
- Stop: dacă clientul răspunde, secvența se oprește, preia SOA/CSA
