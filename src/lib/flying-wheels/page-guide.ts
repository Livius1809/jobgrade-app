/**
 * page-guide.ts — Harta contextuala a platformei pentru Flying Wheels
 *
 * Fiecare pagina are: titlu, descriere scurta (afisata automat la navigare),
 * si ghidaj detaliat (trimis ca system prompt la intrebari).
 *
 * Ghidajul este GRATUIT — nu consuma minute.
 * Intrebarile clientului consuma minute.
 */

export interface PageGuide {
  pattern: RegExp
  title: string
  shortGuide: string
  detailedGuide: string
  layer?: number // 0 = mereu vizibil
}

export const PAGE_GUIDES: PageGuide[] = [
  // ── Portal principal ──
  {
    pattern: /^\/portal$/,
    title: "Tabloul de bord",
    shortGuide:
      "Acesta este tabloul principal. De aici vedeti progresul companiei: " +
      "profil, posturi, evaluari si rapoarte. Fiecare sectiune se deblocheaza " +
      "pe masura ce completati pasii anteriori.",
    detailedGuide:
      "Tabloul de bord arata starea curenta a companiei in platforma. " +
      "Parcurgeti etapele de sus in jos: completati profilul companiei, " +
      "adaugati posturile, rulati evaluarea si generati rapoartele. " +
      "Sectiunile gri devin active dupa finalizarea pasului anterior.",
  },
  // ── Profil companie ──
  {
    pattern: /^\/company/,
    title: "Detalii companie",
    shortGuide:
      "Aici configurati profilul companiei. Datele se preiau automat " +
      "de la ANAF dupa CUI. Misiunea, viziunea si valorile se construiesc " +
      "progresiv impreuna cu platforma.",
    detailedGuide:
      "Profilul companiei alimenteaza toate rapoartele si analizele. " +
      "CUI-ul sincronizeaza automat datele ANAF (denumire, adresa, CAEN). " +
      "Sectiunea MVV (Misiune-Viziune-Valori) creste prin interactiune.",
  },
  // ── Posturi ──
  {
    pattern: /^\/jobs$/,
    title: "Gestiune posturi",
    shortGuide:
      "Lista posturilor din organizatie. Puteti adauga manual, importa " +
      "din stat de functii (Excel/PDF/imagine) sau crea din fisa postului.",
    detailedGuide:
      "Fiecare post are: titlu, departament, cod, descriere, responsabilitati, " +
      "cerinte. Posturile sunt evaluate in sesiunile de evaluare si primesc " +
      "un scor pe 6 criterii. Scorul determina clasa salariala.",
  },
  // ── Sesiuni evaluare ──
  {
    pattern: /^\/sessions$/,
    title: "Sesiuni de evaluare",
    shortGuide:
      "Aici creati si gestionati sesiunile de evaluare a posturilor. " +
      "Fiecare sesiune evalueaza unul sau mai multe posturi pe 6 criterii " +
      "standardizate (Directiva EU 2023/970).",
    detailedGuide:
      "O sesiune de evaluare parcurge: pre-scorare individuala → " +
      "discutie grup (cu AI mediator) → vot de consens → validare → " +
      "semnatura. Rezultatul: ierarhia posturilor cu scoruri obiective.",
  },
  {
    pattern: /^\/sessions\/[^/]+\/discussion/,
    title: "Discutie grup",
    shortGuide:
      "Camera de discutie pentru atingerea consensului. Membrii comisiei " +
      "dezbat fiecare criteriu, cu suport AI mediator si videoconferinta.",
    detailedGuide:
      "Discutia se desfasoara per criteriu. AI mediatorul ofera perspective " +
      "bazate pe date obiective. Videoconferinta Jitsi e disponibila. " +
      "Dupa discutie se voteaza — daca nu se atinge consens, se reia.",
  },
  {
    pattern: /^\/sessions\/[^/]+$/,
    title: "Detalii sesiune",
    shortGuide:
      "Vizualizati starea sesiunii: membrii, posturile, progresul " +
      "evaluarii, consensul atins si actiunile disponibile.",
    detailedGuide:
      "De aici puteti: lansa evaluarea, vedea pre-scorurile, accesa " +
      "discutia de grup, verifica consensul, valida rezultatele, " +
      "semna si exporta raportul final (PDF/Excel/JSON/XML).",
  },
  // ── Rapoarte ──
  {
    pattern: /^\/reports/,
    title: "Rapoarte",
    shortGuide:
      "Rapoartele generate din evaluarile validate. Export in mai " +
      "multe formate: PDF profesional, Excel, JSON si XML.",
    detailedGuide:
      "Raportul principal contine ierarhia posturilor cu scoruri, " +
      "clasificare pe grade si recomandari salariale. Raportul master " +
      "include toate sesiunile validate intr-un document unitar.",
  },
  // ── Pay Gap ──
  {
    pattern: /^\/pay-gap$/,
    title: "Analiza decalaj salarial",
    shortGuide:
      "Dashboard-ul de transparenta salariala (Art. 9). Vedeti cei " +
      "7 indicatori obligatorii, defalcati pe gen, cu k-anonimitate.",
    detailedGuide:
      "Indicatorii Art. 9: decalaj medie/mediana salariu baza, " +
      "compensatie variabila, distributie quartile, per grad salarial. " +
      "Daca un decalaj depaseste 5%, se activeaza evaluarea comuna Art. 10.",
    layer: 2,
  },
  {
    pattern: /^\/pay-gap\/assessments/,
    title: "Evaluari comune Art. 10",
    shortGuide:
      "Procesele de remediere pentru decalaje salariale >5%. " +
      "Fiecare evaluare are comisie, vot per capitol, semnaturi si termen legal.",
    detailedGuide:
      "Evaluarea comuna parcurge: configurare comisie → raport 6 capitole → " +
      "vot per capitol (4 dimensiuni) → discutie grup → semnatura fiecare " +
      "membru → monitorizare. Termen legal: 6 luni de la declansare.",
    layer: 2,
  },
  // ── Employee Portal ──
  {
    pattern: /^\/employee-portal/,
    title: "Portal angajati — cereri Art. 7",
    shortGuide:
      "Gestionati cererile de transparenta salariala ale angajatilor. " +
      "Raspunsul se pre-genereaza automat din datele din stat.",
    detailedGuide:
      "Angajatii trimit cereri prin formularul public. Platforma " +
      "pre-genereaza raspunsul cu date anonimizate (k>=5). " +
      "Dvs. completati numele real si trimiteti. Termen legal: 2 luni.",
  },
  // ── Setari ──
  {
    pattern: /^\/settings\/roles/,
    title: "Configurare roluri organizationale",
    shortGuide:
      "Alocati roluri din departamentul HR persoanelor din echipa. " +
      "Drepturile se activeaza automat pe baza rolurilor si modulelor cumparate.",
    detailedGuide:
      "13 roluri disponibile: DG, Director HR, Responsabil Salarizare, " +
      "Recrutare, Administrare Personal, L&D, Facilitator JE/Art.10, " +
      "Reprezentant Salariati/Management, Consultant Extern, Salariat. " +
      "Puteti invita persoane noi direct cu email + rol.",
  },
  {
    pattern: /^\/settings/,
    title: "Setari",
    shortGuide:
      "Configurati contul: utilizatori, securitate, facturare si " +
      "roluri organizationale.",
    detailedGuide:
      "Setarile includ: gestiune utilizatori (invitare, roluri, dezactivare), " +
      "securitate (parole, 2FA), facturare (Stripe, credite, istoric), " +
      "si configurarea rolurilor organizationale.",
  },
  // ── Fallback ──
  {
    pattern: /./,
    title: "Platforma JobGrade",
    shortGuide:
      "Explorati platforma. Pot sa va ghidez spre orice sectiune sau " +
      "sa va explic ce puteti face de aici.",
    detailedGuide:
      "JobGrade este o platforma de evaluare si ierarhizare a posturilor, " +
      "conformitate salariala (Directiva EU 2023/970) si dezvoltare " +
      "organizationala. Intrebati orice si va ghidez.",
  },

  // ── Rapoarte angajati ──
  {
    pattern: /^\/employee-reports$/,
    title: "Rapoarte angajati",
    shortGuide:
      "Aici gestionati rapoartele continue ale angajatilor. " +
      "Fiecare raport creste automat cu modulele achizitionate. " +
      "Puteti activa vizibilitatea pentru angajat (GDPR Art. 15).",
    detailedGuide:
      "Raportul continuu este un document viu care se imbogateste " +
      "pe masura ce utilizati modulele platformei. Creati un raport " +
      "per angajat, iar sectiunile se adauga automat din evaluari, " +
      "transparenta salariala, benchmark si dezvoltare organizationala.",
  },
  {
    pattern: /^\/employee-reports\/[^/]+$/,
    title: "Detalii raport angajat",
    shortGuide:
      "Vizualizati raportul complet al angajatului. Sectiunile sunt " +
      "grupate pe module si pot fi expandate individual.",
    detailedGuide:
      "Raportul arata toate informatiile agregate transversal. " +
      "Ca angajator, puteti modifica statusul si vizibilitatea. " +
      "Ca angajat (daca e activata vizibilitatea), vedeti doar datele.",
  },

  // ── Jurnal Ghid ──
  {
    pattern: /^\/guide-journal$/,
    title: "Jurnal Ghid JobGrade",
    shortGuide:
      "Aici vedeti toate interactiunile cu Ghidul. " +
      "Feedback-ul dumneavoastra antreneaza precizia raspunsurilor.",
    detailedGuide:
      "Jurnalul Ghidului arata istoricul intrebarilor si raspunsurilor, " +
      "statistici per pagina si categorie, rata de satisfactie si " +
      "recomandari automate bazate pe frecventa intrebarilor.",
  },
]

/**
 * Gaseste ghidul pentru o pagina data.
 */
export function getPageGuide(pathname: string): PageGuide {
  return PAGE_GUIDES.find((g) => g.pattern.test(pathname)) ?? PAGE_GUIDES[PAGE_GUIDES.length - 1]
}
