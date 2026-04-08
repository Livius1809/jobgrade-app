# Transparenta AI — JobGrade

> Document de continut pentru pagina /transparenta-ai
> Conform AI Act Art.13 + Art.14 + Anexa III
> Status: DRAFT — necesita validare avocat
> Ultima actualizare: 08.04.2026

---

## Sectiunea 1: Ce este JobGrade si cum folosim Inteligenta Artificiala

JobGrade este o platforma de evaluare a posturilor si dezvoltare profesionala, operata de Psihobusiness Consulting SRL (CIF: RO15790994).

Platforma foloseste modele lingvistice mari (Large Language Models — LLM), furnizate de Anthropic (modelul Claude), pentru a asista procesele de evaluare si ghidare.

**Folosim AI pentru doua scopuri principale:**

- **B2B (pentru companii):** asistarea procesului de evaluare a posturilor — structurarea informatiilor, analiza comparativa a rolurilor si propunerea de scoruri pe criterii obiective. Decizia finala apartine intotdeauna comitetului uman de evaluare.

- **B2C (pentru persoane):** ghidarea dialogurilor de dezvoltare personala si profesionala prin agenti specializati care adapteaza conversatia la profilul si nevoile utilizatorului.

**Ce NU face AI-ul nostru:**
- Nu ia decizii autonome privind angajarea, concedierea sau salarizarea
- Nu inlocuieste specialistii umani (psihologi, consilieri, juristi)
- Nu opereaza fara supraveghere umana

---

## Sectiunea 2: Cum functioneaza AI-ul in procesul de evaluare (B2B)

Evaluarea posturilor in JobGrade se bazeaza pe 6 criterii obiective:

1. **Educatie si experienta** — nivelul de pregatire necesar pentru indeplinirea atributiilor postului
2. **Comunicare** — complexitatea si frecventa interactiunilor cerute de post
3. **Rezolvarea problemelor** — tipul si dificultatea provocarilor pe care titularul le intampina
4. **Luarea deciziilor** — nivelul de autonomie si impactul deciziilor asociate postului
5. **Impactul asupra afacerii** — contributia postului la rezultatele organizatiei
6. **Conditiile de munca** — factorii de mediu, efort fizic sau psihic specifici postului

**Rolul AI-ului in acest proces:**
- Structureaza informatiile din fisele de post
- Analizeaza si compara posturile pe baza criteriilor de mai sus
- Propune scoruri initiale — ca punct de plecare pentru discutie
- Genereaza rapoarte comparative

**Rolul oamenilor:**
- Comitetul de evaluare (format din reprezentanti ai companiei si facilitatorul JobGrade) valideaza fiecare scor
- Procesul include minimum 3 etape de consens inainte de finalizare
- Orice evaluare poate fi contestata si reevaluata de comitet

Metodologia este neutra din perspectiva genului — criteriile evalueaza postul, nu persoana care il ocupa. Aceasta abordare sustine conformitatea cu Directiva UE 2023/970 privind transparenta salariala.

---

## Sectiunea 3: Cum functioneaza AI-ul in dezvoltarea personala (B2C)

Modulul B2C ofera dialoguri ghidate cu agenti AI specializati. Fiecare agent are un rol precis si opereaza in limitele unei metodologii validate.

**Ce face AI-ul:**
- Adapteaza conversatia la profilul si ritmul utilizatorului
- Pune intrebari care ajuta la reflectie si auto-cunoastere
- Ofera perspective bazate pe cadre psihologice validate (Herrmann, Hawkins)
- Genereaza rapoarte de progres si recomandari

**Ce NU face AI-ul:**
- Nu diagnosticheaza — nu este un instrument clinic si nu inlocuieste evaluarea psihologica
- Nu trateaza — nu ofera terapie si nu prescrie interventii
- Nu manipuleaza — ghideaza prin intrebari, nu prin directive

**SafetyMonitor — protectie automata:**

Platforma include un sistem de monitorizare cu 4 niveluri de alerta:

| Nivel | Descriere | Actiune |
|-------|-----------|---------|
| INFORMATIV | Semnale de atentie usoare | Agentul adapteaza tonul conversatiei |
| MODERAT | Indicii de disconfort emotional | Agentul redirectioneaza catre resurse de suport |
| RIDICAT | Semne de distres psihologic | Sesiunea se opreste; utilizatorul primeste contact direct cu psihologul |
| CRITIC | Indicii de criza (ganduri auto-vatamante) | Afisare imediata: Telefonul Sperantei (0800 801 200) + alte resurse de criza |

**Limita platformei:** AI-ul opereaza in zona rationala si reflexiva. Pentru aspecte care tin de experienta traita profunda, platforma recomanda ghizi umani calificati.

---

## Sectiunea 4: Supravegherea umana (Art.14 AI Act)

Conformitatea cu Art.14 al Regulamentului UE privind Inteligenta Artificiala presupune supraveghere umana efectiva. In JobGrade aceasta se realizeaza prin:

**Echipa de supraveghere:**
- 2 psihologi angajati, acreditati de Colegiul Psihologilor din Romania (CPR)
- Specializari: psihologia muncii si psihologia transporturilor
- Atestat de libera practica — pot exercita independent

**Cum se aplica supravegherea:**

*In procesele B2B:*
- Psihologul supervizeaza metodologia de evaluare
- Comitetele de evaluare sunt formate exclusiv din oameni
- AI-ul propune, oamenii decid
- Fiecare sesiune de evaluare genereaza un trail de audit complet

*In procesele B2C:*
- SafetyMonitor escaleaza automat la psiholog atunci cand detecteaza semne de distres
- Psihologul poate interveni in orice moment al interactiunii
- Rapoartele generate de AI sunt validate inainte de livrare pentru continut sensibil

**Principiul fundamental:** Nicio decizie cu impact asupra unei persoane nu este luata exclusiv de AI. Intotdeauna exista un om care valideaza, aproba sau intervine.

---

## Sectiunea 5: Datele pe care le folosim

**Surse de date:**
- Informatii furnizate direct de utilizator: raspunsuri la chestionare, continut de dialog, documente incarcate (CV, fise de post)
- Date de navigare si interactiune in platforma (pentru imbunatatirea experientei)

**Ce NU facem cu datele:**
- **Nu antrenam modele AI pe datele clientilor.** Folosim modele pre-antrenate (Claude, furnizat de Anthropic). Datele clientilor sunt procesate, nu folosite pentru antrenament.
- **Nu colectam date din surse externe** fara consimtamantul explicit al utilizatorului
- **Nu vindem si nu partajam date** cu terti in scopuri de marketing

**Masuri de protectie:**
- **B2C: pseudonim obligatoriu** — utilizatorii B2C opereaza sub pseudonim (privacy by design). Identitatea reala este stocata separat si nu este accesibila agentilor AI.
- **Doua straturi de separare** — datele de identitate si datele de interactiune sunt stocate in baze de date separate
- **Criptare** — datele sunt criptate in tranzit (TLS) si in repaus

**Termene de retentie:**
- Date de evaluare B2B: pe durata contractului + 5 ani (obligatie legala)
- Date de interactiune B2C: 3 ani de la ultima activitate
- Cont B2C inactiv: notificare la 24 luni, stergere la 36 luni
- Date de audit: 10 ani (obligatie legala)

Pentru detalii complete, consultati [Politica de confidentialitate](/confidentialitate).

---

## Sectiunea 6: Drepturile tale

Ca utilizator al platformei JobGrade, ai urmatoarele drepturi:

**Drepturi specifice AI Act:**

- **Dreptul de a sti ca interactionezi cu un AI.** Toti agentii din platforma se identifica clar ca fiind asistenti AI. Nu simulam interactiuni umane.

- **Dreptul de a cere explicatie.** Poti solicita o explicatie despre cum a ajuns AI-ul la o recomandare sau la un scor propus. Echipa noastra iti va furniza o explicatie clara si accesibila.

- **Dreptul de a contesta o evaluare.** Daca nu esti de acord cu o evaluare generata de AI, comitetul uman reevalueaza integral — AI-ul nu are ultimul cuvant.

- **Dreptul la interventie umana.** In orice moment al interactiunii cu platforma, poti cere sa vorbesti cu un psiholog din echipa noastra.

**Drepturi GDPR (Art.15-17 RGPD):**

- **Dreptul de acces** — poti solicita o copie a tuturor datelor pe care le detinem despre tine
- **Dreptul la rectificare** — poti corecta orice date inexacte
- **Dreptul la stergere** — poti cere stergerea contului si a datelor asociate
- **Dreptul la portabilitate** — poti exporta datele tale in format structurat

**Cum iti exerciti drepturile:**
- Export date personale: din contul tau, sectiunea "Datele mele" (sau prin API: `GET /api/v1/b2c/my-data`)
- Stergere cont: din setari, sectiunea "Sterge contul" (sau prin API: `DELETE /api/v1/b2c/account`). Dupa solicitare, exista o perioada de gratie de 30 de zile in care poti reveni.
- Pentru orice alta solicitare: contact@jobgrade.ro

---

## Sectiunea 7: Limitarile AI-ului

Credem in transparenta. De aceea va spunem deschis ce NU poate face AI-ul nostru:

- **AI-ul poate gresi.** Recomandarile si scorurile propuse de AI sunt sugestii informate, nu certitudini. De aceea fiecare proces include validare umana.

- **AI-ul nu inlocuieste un specialist.** Nu este psiholog, terapeut, consilier juridic sau medic. Pentru situatii care necesita expertiza profesionala, va recomandam sa consultati un specialist acreditat.

- **AI-ul nu are experienta traita.** Ghideaza din cunoastere acumulata, nu din experienta personala. Aceasta distinctie este importanta — cunoasterea fara experienta are limite pe care le recunoastem.

- **AI-ul opereaza pe baza informatiilor primite.** Calitatea recomandarilor depinde de calitatea si completitudinea informatiilor furnizate.

- **AI-ul nu poate garanta rezultate.** Platforma ofera instrumente si ghidare. Rezultatele depind de modul in care sunt utilizate.

**La situatii de criza:**
Daca te afli intr-o situatie dificila sau ai nevoie de ajutor imediat, te rugam sa contactezi:
- **Telefonul Sperantei:** 0800 801 200 (gratuit, 24/7)
- **Telefonul Sufletului:** 116 123 (gratuit)
- **Urgente:** 112

---

## Sectiunea 8: Cum ne poti contacta

**Psihobusiness Consulting SRL**
- Email: contact@jobgrade.ro
- Telefon: [de completat]
- Adresa: [de completat]

**Responsabil cu Protectia Datelor (DPO):**
- Email: dpo@jobgrade.ro

**Autoritatea de supraveghere GDPR:**
- Autoritatea Nationala de Supraveghere a Prelucrarii Datelor cu Caracter Personal (ANSPDCP)
- Website: www.dataprotection.ro
- Email: anspdcp@dataprotection.ro
- Adresa: B-dul G-ral Gheorghe Magheru nr. 28-30, Sector 1, Bucuresti

---

*Aceasta pagina este actualizata ori de cate ori apar modificari in modul de functionare al AI-ului in platforma JobGrade. Data ultimei actualizari este afisata in antetul paginii.*

*Document redactat conform cerintelor Regulamentului (UE) 2024/1689 privind Inteligenta Artificiala (AI Act), Art.13 (Transparenta si furnizarea de informatii) si Art.14 (Supraveghere umana).*
