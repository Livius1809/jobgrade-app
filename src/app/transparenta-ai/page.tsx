import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Transparenta AI",
  description:
    "Cum foloseste JobGrade inteligenta artificiala, ce date prelucram si cum va protejam drepturile. Conform AI Act (UE) 2024/1689.",
}

/* ═══════════════════════════════════════════════════════════════════════
   DATA — sectiuni pagina transparenta AI
   ═══════════════════════════════════════════════════════════════════════ */

const LAST_UPDATED = "8 aprilie 2026"

const NAV_ITEMS = [
  { id: "ce-este", label: "Ce este JobGrade" },
  { id: "evaluare-b2b", label: "Evaluare B2B" },
  { id: "dezvoltare-b2c", label: "Dezvoltare B2C" },
  { id: "supraveghere", label: "Supraveghere umana" },
  { id: "date", label: "Datele folosite" },
  { id: "drepturi", label: "Drepturile tale" },
  { id: "limitari", label: "Limitarile AI-ului" },
  { id: "contact", label: "Contact" },
] as const

const CRITERIA = [
  {
    name: "Educatie si experienta",
    desc: "Nivelul de pregatire necesar pentru indeplinirea atributiilor postului",
  },
  {
    name: "Comunicare",
    desc: "Complexitatea si frecventa interactiunilor cerute de post",
  },
  {
    name: "Rezolvarea problemelor",
    desc: "Tipul si dificultatea provocarilor pe care titularul le intampina",
  },
  {
    name: "Luarea deciziilor",
    desc: "Nivelul de autonomie si impactul deciziilor asociate postului",
  },
  {
    name: "Impactul asupra afacerii",
    desc: "Contributia postului la rezultatele organizatiei",
  },
  {
    name: "Conditiile de munca",
    desc: "Factorii de mediu, efort fizic sau psihic specifici postului",
  },
] as const

const SAFETY_LEVELS = [
  {
    level: "INFORMATIV",
    color: "bg-blue-100 text-blue-800",
    desc: "Semnale de atentie usoare",
    action: "Agentul adapteaza tonul conversatiei",
  },
  {
    level: "MODERAT",
    color: "bg-yellow-100 text-yellow-800",
    desc: "Indicii de disconfort emotional",
    action: "Agentul redirectioneaza catre resurse de suport",
  },
  {
    level: "RIDICAT",
    color: "bg-orange-100 text-orange-800",
    desc: "Semne de distres psihologic",
    action: "Sesiunea se opreste; contact direct cu psihologul",
  },
  {
    level: "CRITIC",
    color: "bg-red-100 text-red-800",
    desc: "Indicii de criza",
    action: "Afisare imediata: Telefonul Sperantei (0800 801 200)",
  },
] as const

/* ═══════════════════════════════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════════════════════════════ */

function SectionHeading({
  id,
  number,
  children,
}: {
  id: string
  number: number
  children: React.ReactNode
}) {
  return (
    <h2
      id={id}
      className="text-2xl md:text-3xl font-semibold text-indigo-dark mt-16 mb-6 scroll-mt-24 flex items-baseline gap-3"
    >
      <span className="text-indigo/40 font-normal text-lg">{number}.</span>
      {children}
    </h2>
  )
}

function InfoCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6 mb-4">
      <h4 className="font-semibold text-indigo-dark mb-3">{title}</h4>
      <div className="text-text-warm text-sm leading-relaxed">{children}</div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════ */

export default function TransparentaAIPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 header-glass">
        <div
          className="flex items-center justify-between px-6 h-16"
          style={{ maxWidth: "56rem", margin: "0 auto" }}
        >
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/logo.svg"
              alt="JobGrade"
              width={32}
              height={32}
              className="transition-transform duration-500 group-hover:rotate-45"
            />
            <span className="text-lg font-semibold text-indigo-dark">
              JobGrade
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium text-text-warm hover:text-indigo transition-colors duration-200"
            >
              Acasa
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-text-warm hover:text-coral transition-colors duration-200"
            >
              Intra in platforma
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────── */}
      <main className="px-6 py-10" style={{ maxWidth: "56rem", margin: "0 auto" }}>
        {/* Title block */}
        <div className="mb-12">
          <p className="text-xs text-text-micro uppercase tracking-wider mb-2">
            Conform AI Act (UE) 2024/1689 — Art.13 si Art.14
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold text-indigo-dark leading-tight mb-4">
            Transparenta AI
          </h1>
          <p className="text-lg text-text-warm leading-relaxed mb-3">
            Va explicam cum functioneaza inteligenta artificiala in platforma
            JobGrade, ce date folosim, cum luam deciziile si ce drepturi aveti.
          </p>
          <p className="text-sm text-text-secondary">
            Ultima actualizare: {LAST_UPDATED}
          </p>
        </div>

        {/* Navigation */}
        <nav className="mb-12 rounded-xl border border-border bg-warm-bg p-6">
          <p className="text-sm font-semibold text-indigo-dark mb-3">
            Cuprins
          </p>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {NAV_ITEMS.map((item, i) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="text-sm text-indigo hover:text-indigo-dark transition-colors duration-200"
                >
                  <span className="text-text-micro mr-1.5">{i + 1}.</span>
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* ─── Sectiunea 1: Ce este JobGrade ──────────────────── */}
        <SectionHeading id="ce-este" number={1}>
          Ce este JobGrade si cum folosim Inteligenta Artificiala
        </SectionHeading>

        <p className="text-text-warm leading-relaxed mb-4">
          JobGrade este o platforma de evaluare a posturilor si dezvoltare
          profesionala, operata de Psihobusiness Consulting SRL (CIF:
          RO15790994).
        </p>
        <p className="text-text-warm leading-relaxed mb-6">
          Platforma foloseste modele lingvistice mari (Large Language Models),
          furnizate de Anthropic (modelul Claude), pentru a asista procesele de
          evaluare si ghidare.
        </p>

        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <InfoCard title="B2B — pentru companii">
            <p>
              Asistam procesul de evaluare a posturilor: structurarea
              informatiilor, analiza comparativa a rolurilor si propunerea de
              scoruri pe criterii obiective. Decizia finala apartine intotdeauna
              comitetului uman de evaluare.
            </p>
          </InfoCard>
          <InfoCard title="B2C — pentru persoane">
            <p>
              Ghidam dialoguri de dezvoltare personala si profesionala prin
              agenti specializati care adapteaza conversatia la profilul si
              nevoile utilizatorului.
            </p>
          </InfoCard>
        </div>

        <div className="rounded-xl border border-coral/20 bg-coral/5 p-5 mb-6">
          <p className="text-sm font-semibold text-coral-dark mb-2">
            Ce NU face AI-ul nostru
          </p>
          <ul className="text-sm text-text-warm space-y-1.5">
            <li>
              Nu ia decizii autonome privind angajarea, concedierea sau
              salarizarea
            </li>
            <li>
              Nu inlocuieste specialistii umani (psihologi, consilieri, juristi)
            </li>
            <li>Nu opereaza fara supraveghere umana</li>
          </ul>
        </div>

        {/* ─── Sectiunea 2: Evaluare B2B ──────────────────────── */}
        <SectionHeading id="evaluare-b2b" number={2}>
          Cum functioneaza AI-ul in procesul de evaluare (B2B)
        </SectionHeading>

        <p className="text-text-warm leading-relaxed mb-6">
          Evaluarea posturilor in JobGrade se bazeaza pe 6 criterii obiective.
          Acestea evalueaza postul, nu persoana care il ocupa — asigurand
          neutralitate din perspectiva genului si conformitate cu Directiva UE
          2023/970 privind transparenta salariala.
        </p>

        <div className="grid gap-3 mb-8">
          {CRITERIA.map((c) => (
            <div
              key={c.name}
              className="flex items-start gap-3 rounded-lg border border-border/60 bg-surface px-4 py-3"
            >
              <div className="w-2 h-2 rounded-full bg-indigo mt-2 shrink-0" />
              <div>
                <span className="font-medium text-indigo-dark text-sm">
                  {c.name}
                </span>
                <span className="text-text-secondary text-sm"> — {c.desc}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <InfoCard title="Rolul AI-ului">
            <ul className="space-y-1.5">
              <li>Structureaza informatiile din fisele de post</li>
              <li>Analizeaza si compara posturile pe baza criteriilor</li>
              <li>Propune scoruri initiale — ca punct de plecare</li>
              <li>Genereaza rapoarte comparative</li>
            </ul>
          </InfoCard>
          <InfoCard title="Rolul oamenilor">
            <ul className="space-y-1.5">
              <li>Comitetul de evaluare valideaza fiecare scor</li>
              <li>Minimum 3 etape de consens inainte de finalizare</li>
              <li>Orice evaluare poate fi contestata si reevaluata</li>
            </ul>
          </InfoCard>
        </div>

        {/* ─── Sectiunea 3: B2C ───────────────────────────────── */}
        <SectionHeading id="dezvoltare-b2c" number={3}>
          Cum functioneaza AI-ul in dezvoltarea personala (B2C)
        </SectionHeading>

        <p className="text-text-warm leading-relaxed mb-6">
          Modulul B2C ofera dialoguri ghidate cu agenti AI specializati. Fiecare
          agent are un rol precis si opereaza in limitele unei metodologii
          validate.
        </p>

        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <InfoCard title="Ce face AI-ul">
            <ul className="space-y-1.5">
              <li>Adapteaza conversatia la profilul si ritmul utilizatorului</li>
              <li>Pune intrebari care ajuta la reflectie si auto-cunoastere</li>
              <li>
                Ofera perspective bazate pe cadre psihologice validate
              </li>
              <li>Genereaza rapoarte de progres</li>
            </ul>
          </InfoCard>
          <InfoCard title="Ce NU face AI-ul">
            <ul className="space-y-1.5">
              <li>
                Nu diagnosticheaza — nu este instrument clinic
              </li>
              <li>Nu trateaza — nu ofera terapie</li>
              <li>Nu manipuleaza — ghideaza prin intrebari, nu directive</li>
            </ul>
          </InfoCard>
        </div>

        <h3 className="text-lg font-semibold text-indigo-dark mb-4">
          SafetyMonitor — protectie automata
        </h3>
        <p className="text-text-warm text-sm leading-relaxed mb-4">
          Platforma include un sistem de monitorizare cu 4 niveluri de alerta
          care protejeaza utilizatorul in situatii sensibile:
        </p>

        <div className="grid gap-3 mb-6">
          {SAFETY_LEVELS.map((s) => (
            <div
              key={s.level}
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-lg border border-border/60 bg-surface px-4 py-3"
            >
              <span
                className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded-full w-fit ${s.color}`}
              >
                {s.level}
              </span>
              <span className="text-sm text-text-secondary">{s.desc}</span>
              <span className="text-sm text-text-warm sm:ml-auto">
                {s.action}
              </span>
            </div>
          ))}
        </div>

        <p className="text-sm text-text-secondary italic mb-6">
          AI-ul opereaza in zona rationala si reflexiva. Pentru aspecte care tin
          de experienta traita profunda, platforma recomanda ghizi umani
          calificati.
        </p>

        {/* ─── Sectiunea 4: Supraveghere umana ────────────────── */}
        <SectionHeading id="supraveghere" number={4}>
          Supravegherea umana (Art.14 AI Act)
        </SectionHeading>

        <div className="rounded-xl border border-indigo/20 bg-indigo/5 p-6 mb-6">
          <p className="text-sm font-semibold text-indigo-dark mb-3">
            Echipa de supraveghere
          </p>
          <ul className="text-sm text-text-warm space-y-2">
            <li>
              2 psihologi angajati, acreditati de Colegiul Psihologilor din
              Romania (CPR)
            </li>
            <li>Specializari: psihologia muncii si psihologia transporturilor</li>
            <li>Atestat de libera practica — pot exercita independent</li>
          </ul>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <InfoCard title="In procesele B2B">
            <ul className="space-y-1.5">
              <li>Psihologul supervizeaza metodologia de evaluare</li>
              <li>Comitetele de evaluare sunt formate exclusiv din oameni</li>
              <li>AI-ul propune, oamenii decid</li>
              <li>Trail de audit complet pentru fiecare sesiune</li>
            </ul>
          </InfoCard>
          <InfoCard title="In procesele B2C">
            <ul className="space-y-1.5">
              <li>
                SafetyMonitor escaleaza automat la psiholog cand detecteaza
                distres
              </li>
              <li>Psihologul poate interveni in orice moment</li>
              <li>Rapoartele sensibile sunt validate de psiholog</li>
            </ul>
          </InfoCard>
        </div>

        <div className="rounded-xl border border-border bg-warm-bg p-5 mb-6">
          <p className="text-sm text-text-warm leading-relaxed">
            <strong className="text-indigo-dark">Principiul fundamental:</strong>{" "}
            Nicio decizie cu impact asupra unei persoane nu este luata exclusiv
            de AI. Intotdeauna exista un om care valideaza, aproba sau
            intervine.
          </p>
        </div>

        {/* ─── Sectiunea 5: Date ──────────────────────────────── */}
        <SectionHeading id="date" number={5}>
          Datele pe care le folosim
        </SectionHeading>

        <h3 className="text-lg font-semibold text-indigo-dark mb-3">
          Surse de date
        </h3>
        <ul className="text-text-warm text-sm leading-relaxed space-y-2 mb-6">
          <li>
            Informatii furnizate direct de utilizator: raspunsuri la
            chestionare, continut de dialog, documente incarcate (CV, fise de
            post)
          </li>
          <li>
            Date de navigare si interactiune in platforma (pentru imbunatatirea
            experientei)
          </li>
        </ul>

        <div className="rounded-xl border border-coral/20 bg-coral/5 p-5 mb-6">
          <p className="text-sm font-semibold text-coral-dark mb-2">
            Ce NU facem cu datele
          </p>
          <ul className="text-sm text-text-warm space-y-1.5">
            <li>
              <strong>Nu antrenam modele AI pe datele clientilor.</strong>{" "}
              Folosim modele pre-antrenate (Claude, furnizat de Anthropic).
              Datele sunt procesate, nu folosite pentru antrenament.
            </li>
            <li>
              <strong>Nu colectam date din surse externe</strong> fara
              consimtamantul explicit al utilizatorului
            </li>
            <li>
              <strong>Nu vindem si nu partajam date</strong> cu terti in scopuri
              de marketing
            </li>
          </ul>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <InfoCard title="Masuri de protectie">
            <ul className="space-y-1.5">
              <li>
                B2C: pseudonim obligatoriu — identitatea reala nu este accesibila
                agentilor AI
              </li>
              <li>
                Doua straturi de separare — date de identitate si de interactiune
                in baze separate
              </li>
              <li>Criptare in tranzit (TLS) si in repaus</li>
            </ul>
          </InfoCard>
          <InfoCard title="Termene de retentie">
            <ul className="space-y-1.5">
              <li>Date evaluare B2B: durata contractului + 5 ani</li>
              <li>Date interactiune B2C: 3 ani de la ultima activitate</li>
              <li>Cont B2C inactiv: notificare la 24 luni, stergere la 36</li>
              <li>Date audit: 10 ani</li>
            </ul>
          </InfoCard>
        </div>

        {/* ─── Sectiunea 6: Drepturi ──────────────────────────── */}
        <SectionHeading id="drepturi" number={6}>
          Drepturile tale
        </SectionHeading>

        <h3 className="text-lg font-semibold text-indigo-dark mb-4">
          Drepturi specifice AI Act
        </h3>
        <div className="grid gap-3 mb-8">
          {[
            {
              title: "Dreptul de a sti ca interactionezi cu un AI",
              desc: "Toti agentii din platforma se identifica clar ca fiind asistenti AI. Nu simulam interactiuni umane.",
            },
            {
              title: "Dreptul de a cere explicatie",
              desc: "Poti solicita o explicatie despre cum a ajuns AI-ul la o recomandare sau un scor propus.",
            },
            {
              title: "Dreptul de a contesta o evaluare",
              desc: "Comitetul uman reevalueaza integral — AI-ul nu are ultimul cuvant.",
            },
            {
              title: "Dreptul la interventie umana",
              desc: "In orice moment al interactiunii cu platforma, poti cere sa vorbesti cu un psiholog din echipa noastra.",
            },
          ].map((r) => (
            <div
              key={r.title}
              className="rounded-lg border border-border/60 bg-surface px-4 py-3"
            >
              <p className="font-medium text-indigo-dark text-sm mb-1">
                {r.title}
              </p>
              <p className="text-sm text-text-secondary">{r.desc}</p>
            </div>
          ))}
        </div>

        <h3 className="text-lg font-semibold text-indigo-dark mb-4">
          Drepturi GDPR (Art.15-17 RGPD)
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 mb-8">
          {[
            {
              title: "Dreptul de acces",
              desc: "Solicita o copie a tuturor datelor pe care le detinem despre tine",
            },
            {
              title: "Dreptul la rectificare",
              desc: "Corecteaza orice date inexacte",
            },
            {
              title: "Dreptul la stergere",
              desc: "Cere stergerea contului si a datelor asociate",
            },
            {
              title: "Dreptul la portabilitate",
              desc: "Exporta datele tale in format structurat",
            },
          ].map((r) => (
            <div
              key={r.title}
              className="rounded-lg border border-border/60 bg-surface px-4 py-3"
            >
              <p className="font-medium text-indigo-dark text-sm mb-1">
                {r.title}
              </p>
              <p className="text-sm text-text-secondary">{r.desc}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-warm-bg p-5 mb-6">
          <p className="text-sm font-semibold text-indigo-dark mb-2">
            Cum iti exerciti drepturile
          </p>
          <ul className="text-sm text-text-warm space-y-1.5">
            <li>
              <strong>Export date:</strong> din contul tau, sectiunea
              &quot;Datele mele&quot; (sau prin API:{" "}
              <code className="text-xs bg-surface border border-border px-1.5 py-0.5 rounded">
                GET /api/v1/b2c/my-data
              </code>
              )
            </li>
            <li>
              <strong>Stergere cont:</strong> din setari, sectiunea
              &quot;Sterge contul&quot; (sau prin API:{" "}
              <code className="text-xs bg-surface border border-border px-1.5 py-0.5 rounded">
                DELETE /api/v1/b2c/account
              </code>
              ). Perioada de gratie: 30 de zile.
            </li>
            <li>
              <strong>Alte solicitari:</strong>{" "}
              <a
                href="mailto:contact@jobgrade.ro"
                className="text-indigo hover:text-indigo-dark transition-colors"
              >
                contact@jobgrade.ro
              </a>
            </li>
          </ul>
        </div>

        {/* ─── Sectiunea 7: Limitari ──────────────────────────── */}
        <SectionHeading id="limitari" number={7}>
          Limitarile AI-ului
        </SectionHeading>

        <p className="text-text-warm leading-relaxed mb-6">
          Credem in transparenta. De aceea va spunem deschis ce nu poate face
          AI-ul nostru:
        </p>

        <div className="grid gap-3 mb-8">
          {[
            {
              title: "AI-ul poate gresi",
              desc: "Recomandarile si scorurile propuse sunt sugestii informate, nu certitudini. De aceea fiecare proces include validare umana.",
            },
            {
              title: "AI-ul nu inlocuieste un specialist",
              desc: "Nu este psiholog, terapeut, consilier juridic sau medic. Pentru situatii care necesita expertiza profesionala, va recomandam un specialist acreditat.",
            },
            {
              title: "AI-ul nu are experienta traita",
              desc: "Ghideaza din cunoastere acumulata, nu din experienta personala. Cunoasterea fara experienta are limite pe care le recunoastem.",
            },
            {
              title: "AI-ul opereaza pe baza informatiilor primite",
              desc: "Calitatea recomandarilor depinde de calitatea si completitudinea informatiilor furnizate.",
            },
            {
              title: "AI-ul nu poate garanta rezultate",
              desc: "Platforma ofera instrumente si ghidare. Rezultatele depind de modul in care sunt utilizate.",
            },
          ].map((r) => (
            <div
              key={r.title}
              className="rounded-lg border border-border/60 bg-surface px-4 py-3"
            >
              <p className="font-medium text-indigo-dark text-sm mb-1">
                {r.title}
              </p>
              <p className="text-sm text-text-secondary">{r.desc}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border-2 border-coral/30 bg-coral/5 p-6 mb-6">
          <p className="text-sm font-semibold text-coral-dark mb-3">
            La situatii de criza
          </p>
          <p className="text-sm text-text-warm mb-3">
            Daca te afli intr-o situatie dificila sau ai nevoie de ajutor
            imediat:
          </p>
          <ul className="text-sm text-text-warm space-y-1.5">
            <li>
              <strong>Telefonul Sperantei:</strong> 0800 801 200 (gratuit, 24/7)
            </li>
            <li>
              <strong>Telefonul Sufletului:</strong> 116 123 (gratuit)
            </li>
            <li>
              <strong>Urgente:</strong> 112
            </li>
          </ul>
        </div>

        {/* ─── Sectiunea 8: Contact ───────────────────────────── */}
        <SectionHeading id="contact" number={8}>
          Cum ne poti contacta
        </SectionHeading>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <InfoCard title="Psihobusiness Consulting SRL">
            <ul className="space-y-1.5">
              <li>
                <a
                  href="mailto:contact@jobgrade.ro"
                  className="text-indigo hover:text-indigo-dark transition-colors"
                >
                  contact@jobgrade.ro
                </a>
              </li>
              <li>CIF: RO15790994</li>
            </ul>
          </InfoCard>
          <InfoCard title="Responsabil Protectia Datelor (DPO)">
            <a
              href="mailto:dpo@jobgrade.ro"
              className="text-indigo hover:text-indigo-dark transition-colors"
            >
              dpo@jobgrade.ro
            </a>
          </InfoCard>
          <InfoCard title="Autoritate GDPR (ANSPDCP)">
            <ul className="space-y-1.5">
              <li>
                <a
                  href="https://www.dataprotection.ro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo hover:text-indigo-dark transition-colors"
                >
                  www.dataprotection.ro
                </a>
              </li>
              <li>
                <a
                  href="mailto:anspdcp@dataprotection.ro"
                  className="text-indigo hover:text-indigo-dark transition-colors"
                >
                  anspdcp@dataprotection.ro
                </a>
              </li>
            </ul>
          </InfoCard>
        </div>

        {/* ── Compliance notice ────────────────────────────────── */}
        <div className="mt-16 pt-8 border-t border-border/50">
          <p className="text-xs text-text-micro leading-relaxed">
            Aceasta pagina este actualizata ori de cate ori apar modificari in
            modul de functionare al AI-ului in platforma JobGrade. Document
            redactat conform cerintelor Regulamentului (UE) 2024/1689 privind
            Inteligenta Artificiala (AI Act), Art.13 (Transparenta si furnizarea
            de informatii) si Art.14 (Supraveghere umana).
          </p>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="border-t border-border/50 py-6 px-6 mt-8">
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-secondary/50"
          style={{ maxWidth: "56rem", margin: "0 auto" }}
        >
          <span>JobGrade &middot; Psihobusiness Consulting SRL</span>
          <div className="flex items-center gap-3">
            <span className="border border-border/50 px-2 py-0.5 rounded text-text-micro">
              GDPR
            </span>
            <span className="border border-border/50 px-2 py-0.5 rounded text-text-micro">
              AI Act UE
            </span>
            <span className="border border-border/50 px-2 py-0.5 rounded text-text-micro">
              Directiva 2023/970
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}
