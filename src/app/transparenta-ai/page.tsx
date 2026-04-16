import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Transparență AI",
  description:
    "Cum folosește JobGrade inteligența artificială, ce date prelucrăm și cum vă protejăm drepturile. Conform AI Act (UE) 2024/1689.",
}

/* ═══════════════════════════════════════════════════════════════════════
   DATA — sectiuni pagina transparenta AI
   ═══════════════════════════════════════════════════════════════════════ */

const LAST_UPDATED = "8 aprilie 2026"

const NAV_ITEMS = [
  { id: "ce-este", label: "Ce este JobGrade" },
  { id: "evaluare-b2b", label: "Evaluare B2B" },
  { id: "dezvoltare-b2c", label: "Dezvoltare B2C" },
  { id: "supraveghere", label: "Supraveghere umană" },
  { id: "date", label: "Datele folosite" },
  { id: "drepturi", label: "Drepturile tale" },
  { id: "limitari", label: "Limitările AI-ului" },
  { id: "contact", label: "Contact" },
] as const

const CRITERIA = [
  {
    name: "Educație și experiență",
    desc: "Nivelul de pregătire necesar pentru îndeplinirea atribuțiilor postului",
  },
  {
    name: "Comunicare",
    desc: "Complexitatea și frecvența interacțiunilor cerute de post",
  },
  {
    name: "Rezolvarea problemelor",
    desc: "Tipul și dificultatea provocărilor pe care titularul le întâmpină",
  },
  {
    name: "Luarea deciziilor",
    desc: "Nivelul de autonomie și impactul deciziilor asociate postului",
  },
  {
    name: "Impactul asupra afacerii",
    desc: "Contribuția postului la rezultatele organizației",
  },
  {
    name: "Condițiile de muncă",
    desc: "Factorii de mediu, efort fizic sau psihic specifici postului",
  },
] as const

const SAFETY_LEVELS = [
  {
    level: "INFORMATIV",
    color: "bg-blue-100 text-blue-800",
    desc: "Semnale de atenție ușoare",
    action: "Agentul adaptează tonul conversației",
  },
  {
    level: "MODERAT",
    color: "bg-yellow-100 text-yellow-800",
    desc: "Indicii de disconfort emoțional",
    action: "Agentul redirecționează către resurse de suport",
  },
  {
    level: "RIDICAT",
    color: "bg-orange-100 text-orange-800",
    desc: "Semne de distres psihologic",
    action: "Sesiunea se oprește; contact direct cu personalul specializat",
  },
  {
    level: "CRITIC",
    color: "bg-red-100 text-red-800",
    desc: "Indicii de criză",
    action: "Afișare imediată: Telefonul Speranței (0800 801 200)",
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
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.svg"
              alt="JobGrade"
              width={160}
              height={40}
              className="h-9 w-auto"
            />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/" className="text-slate-600 hover:text-indigo-600">Acasă</Link>
            <Link href="/login" className="text-slate-600 hover:text-indigo-600">Intră în platformă</Link>
          </nav>
        </div>
      </header>

      {/* ── Content ────────────────────────────────────────────── */}
      <main className="px-6 py-10" style={{ maxWidth: "56rem", margin: "0 auto" }}>
        {/* Title block */}
        <div className="mb-12">
          <p className="text-xs text-text-micro uppercase tracking-wider mb-2">
            Conform AI Act (UE) 2024/1689 — Art. 13 și Art. 14
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold text-indigo-dark leading-tight mb-4">
            Transparență AI
          </h1>
          <p className="text-lg text-text-warm leading-relaxed mb-3">
            Vă explicăm cum funcționează inteligența artificială în platforma
            JobGrade, ce date folosim, cum luăm deciziile și ce drepturi aveți.
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

        {/* ─── Secțiunea 1: Ce este JobGrade ──────────────────── */}
        <SectionHeading id="ce-este" number={1}>
          Ce este JobGrade și cum folosim Inteligența Artificială
        </SectionHeading>

        <p className="text-text-warm leading-relaxed mb-4">
          JobGrade este o platformă de evaluare a posturilor și dezvoltare
          profesională, operată de Psihobusiness Consulting SRL (CIF:
          RO15790994).
        </p>
        <p className="text-text-warm leading-relaxed mb-6">
          Platforma folosește modele lingvistice mari (Large Language Models),
          furnizate de Anthropic (modelul Claude), pentru a asista procesele de
          evaluare și ghidare.
        </p>

        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <InfoCard title="B2B — pentru companii">
            <p>
              Asistăm procesul de evaluare a posturilor: structurarea
              informațiilor, analiza comparativă a rolurilor și propunerea de
              scoruri pe criterii obiective. Decizia finală aparține întotdeauna
              comitetului uman de evaluare.
            </p>
          </InfoCard>
          <InfoCard title="B2C — pentru persoane">
            <p>
              Ghidăm dialoguri de dezvoltare personală și profesională prin
              agenți specializați care adaptează conversația la profilul și
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
              Nu înlocuiește specialiștii umani (psihologi, consilieri, juriști)
            </li>
            <li>Nu operează fără supraveghere umană</li>
          </ul>
        </div>

        {/* ─── Secțiunea 2: Evaluare B2B ──────────────────────── */}
        <SectionHeading id="evaluare-b2b" number={2}>
          Cum funcționează AI-ul în procesul de evaluare (B2B)
        </SectionHeading>

        <p className="text-text-warm leading-relaxed mb-6">
          Evaluarea posturilor în JobGrade se bazează pe 6 criterii obiective.
          Acestea evaluează postul, nu persoana care îl ocupă — asigurând
          neutralitate din perspectiva genului și conformitate cu Directiva UE
          2023/970 privind transparența salarială.
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
              <li>Structurează informațiile din fișele de post</li>
              <li>Analizează și compară posturile pe baza criteriilor</li>
              <li>Propune scoruri inițiale — ca punct de plecare</li>
              <li>Generează rapoarte comparative</li>
            </ul>
          </InfoCard>
          <InfoCard title="Rolul oamenilor">
            <ul className="space-y-1.5">
              <li>Comitetul de evaluare validează fiecare scor</li>
              <li>Minimum 3 etape de consens înainte de finalizare</li>
              <li>Orice evaluare poate fi contestată și reevaluată</li>
            </ul>
          </InfoCard>
        </div>

        {/* ─── Secțiunea 3: B2C ───────────────────────────────── */}
        <SectionHeading id="dezvoltare-b2c" number={3}>
          Cum funcționează AI-ul în dezvoltarea personală (B2C)
        </SectionHeading>

        <p className="text-text-warm leading-relaxed mb-6">
          Modulul B2C oferă dialoguri ghidate cu agenți AI specializați. Fiecare
          agent are un rol precis și operează în limitele unei metodologii
          validate.
        </p>

        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <InfoCard title="Ce face AI-ul">
            <ul className="space-y-1.5">
              <li>Adaptează conversația la profilul și ritmul utilizatorului</li>
              <li>Pune întrebări calibrate care ajută la reflecție și în procesul de auto-cunoaștere</li>
              <li>
                Oferă perspective bazate pe cadre psihologice validate
              </li>
              <li>Generează rapoarte de progres</li>
            </ul>
          </InfoCard>
          <InfoCard title="Ce NU face AI-ul">
            <ul className="space-y-1.5">
              <li>
                Nu diagnostichează — nu este instrument clinic
              </li>
              <li>Nu tratează — nu oferă terapie</li>
              <li>Nu manipulează — ghidează prin întrebări, nu directive</li>
            </ul>
          </InfoCard>
        </div>

        <h3 className="text-lg font-semibold text-indigo-dark mb-4">
          SafetyMonitor — protecție automată
        </h3>
        <p className="text-text-warm text-sm leading-relaxed mb-4">
          Platforma include un sistem de monitorizare cu 4 niveluri de alertă
          care protejează utilizatorul în situații sensibile:
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
          AI-ul operează în zona rațională și reflexivă. Pentru aspecte care țin
          de experiența trăită profundă, platforma recomandă consilieri umani
          calificați.
        </p>

        {/* ─── Sectiunea 4: Supraveghere umana ────────────────── */}
        <SectionHeading id="supraveghere" number={4}>
          Supravegherea umană (Art. 14 AI Act)
        </SectionHeading>

        <div className="rounded-xl border border-indigo/20 bg-indigo/5 p-6 mb-6">
          <p className="text-sm font-semibold text-indigo-dark mb-3">
            Echipa de supraveghere
          </p>
          <ul className="text-sm text-text-warm space-y-2">
            <li>
              Personal specializat acreditat de Colegiul Psihologilor din
              România (CPR)
            </li>
            <li>
              Specializări: psihologia muncii, transporturilor și serviciilor
            </li>
            <li>Formare psihanalitică (relevantă pentru interacțiunile B2C)</li>
            <li>Atestat de liberă practică — conferă dreptul de exercitare independentă a profesiei de psiholog</li>
          </ul>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <InfoCard title="În procesele B2B">
            <ul className="space-y-1.5">
              <li>Personalul specializat supervizează metodologia de evaluare</li>
              <li>Comitetele de evaluare sunt formate exclusiv din oameni</li>
              <li>AI-ul propune, oamenii decid</li>
              <li>Jurnal de audit complet pentru fiecare sesiune</li>
            </ul>
          </InfoCard>
          <InfoCard title="În procesele B2C">
            <ul className="space-y-1.5">
              <li>
                SafetyMonitor escaladează automat la personalul specializat
                când detectează distres
              </li>
              <li>Personalul specializat poate interveni în orice moment</li>
              <li>Rapoartele sensibile sunt validate de personalul specializat</li>
            </ul>
          </InfoCard>
        </div>

        <div className="rounded-xl border border-border bg-warm-bg p-5 mb-6">
          <p className="text-sm text-text-warm leading-relaxed">
            <strong className="text-indigo-dark">Principiul fundamental:</strong>{" "}
            Nicio decizie cu impact asupra unei persoane nu este luată exclusiv
            de AI. Întotdeauna există un om care validează, aprobă sau
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
            Informații furnizate direct de utilizator: răspunsuri la
            chestionare, conținut de dialog, documente încărcate (CV, fișe de
            post)
          </li>
          <li>
            Date de navigare și interacțiune în platformă (pentru îmbunătățirea
            experienței)
          </li>
        </ul>

        <div className="rounded-xl border border-coral/20 bg-coral/5 p-5 mb-6">
          <p className="text-sm font-semibold text-coral-dark mb-2">
            Ce NU facem cu datele
          </p>
          <ul className="text-sm text-text-warm space-y-1.5">
            <li>
              <strong>Nu antrenăm modele AI cu datele clienților.</strong>{" "}
              Folosim modele pre-antrenate (Claude, furnizat de Anthropic).
              Datele sunt procesate, nu folosite pentru antrenament.
            </li>
            <li>
              <strong>Nu colectăm date din surse externe</strong> fără
              consimțământul explicit al utilizatorului
            </li>
            <li>
              <strong>Nu vindem și nu partajăm date</strong> cu terți în scopuri
              de marketing
            </li>
          </ul>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mb-6">
          <InfoCard title="Măsuri de protecție">
            <ul className="space-y-1.5">
              <li>
                B2C: pseudonim obligatoriu — identitatea reală nu este accesibilă
                agenților AI
              </li>
              <li>
                Două straturi de separare — date de identitate și de interacțiune
                în baze separate
              </li>
              <li>Criptare în tranzit (TLS) și în repaus</li>
            </ul>
          </InfoCard>
          <InfoCard title="Termene de retenție">
            <ul className="space-y-1.5">
              <li>Date evaluare B2B: durata contractului + 5 ani</li>
              <li>Date interacțiune B2C: 3 ani de la ultima activitate</li>
              <li>Cont B2C inactiv: notificare la 24 luni, ștergere la 36</li>
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
              title: "Dreptul de a ști că interacționezi cu un AI",
              desc: "Toți agenții din platformă se identifică clar ca fiind asistenți AI. Nu simulăm interacțiuni umane.",
            },
            {
              title: "Dreptul de a cere explicație",
              desc: "Poți solicita o explicație despre cum a ajuns AI-ul la o recomandare sau un scor propus.",
            },
            {
              title: "Dreptul de a contesta o evaluare",
              desc: "Comitetul uman reevaluează integral — AI-ul nu are ultimul cuvânt.",
            },
            {
              title: "Dreptul la intervenție umană",
              desc: "În orice moment al interacțiunii cu platforma, poți cere să vorbești cu personalul specializat din echipa noastră.",
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
          Drepturi GDPR (Art. 15-17 RGPD)
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 mb-8">
          {[
            {
              title: "Dreptul de acces",
              desc: "Solicită o copie a tuturor datelor pe care le deținem despre tine",
            },
            {
              title: "Dreptul la rectificare",
              desc: "Corectează orice date inexacte",
            },
            {
              title: "Dreptul la ștergere",
              desc: "Cere ștergerea contului și a datelor asociate",
            },
            {
              title: "Dreptul la portabilitate",
              desc: "Exportă datele tale în format structurat",
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
            Cum îți exerciți drepturile
          </p>
          <ul className="text-sm text-text-warm space-y-1.5">
            <li>
              <strong>Export date:</strong> din contul tău, secțiunea
              &quot;Datele mele&quot; (sau prin API:{" "}
              <code className="text-xs bg-surface border border-border px-1.5 py-0.5 rounded">
                GET /api/v1/b2c/my-data
              </code>
              )
            </li>
            <li>
              <strong>Ștergere cont:</strong> din setări, secțiunea
              &quot;Șterge contul&quot; (sau prin API:{" "}
              <code className="text-xs bg-surface border border-border px-1.5 py-0.5 rounded">
                DELETE /api/v1/b2c/account
              </code>
              ). Perioadă de grație: 30 de zile.
            </li>
            <li>
              <strong>Alte solicitări:</strong>{" "}
              <a
                href="mailto:contact@jobgrade.ro"
                className="text-indigo hover:text-indigo-dark transition-colors"
              >
                contact@jobgrade.ro
              </a>
            </li>
          </ul>
        </div>

        {/* ─── Secțiunea 7: Limitări ──────────────────────────── */}
        <SectionHeading id="limitari" number={7}>
          Limitările AI-ului
        </SectionHeading>

        <p className="text-text-warm leading-relaxed mb-6">
          Credem în transparență. De aceea vă spunem deschis ce nu poate face
          AI-ul nostru:
        </p>

        <div className="grid gap-3 mb-8">
          {[
            {
              title: "AI-ul poate greși",
              desc: "Recomandările și scorurile propuse sunt sugestii informate, nu certitudini. De aceea fiecare proces include validare umană.",
            },
            {
              title: "AI-ul nu înlocuiește un specialist",
              desc: "Nu este psiholog, terapeut, consilier juridic sau medic. Pentru situații care necesită expertiză profesională, vă recomandăm un specialist acreditat.",
            },
            {
              title: "AI-ul nu are experiență trăită",
              desc: "Ghidează din cunoaștere acumulată, nu din experiență personală. Cunoașterea fără experiență are limite pe care le recunoaștem.",
            },
            {
              title: "AI-ul operează pe baza informațiilor primite",
              desc: "Calitatea recomandărilor depinde de calitatea și completitudinea informațiilor furnizate.",
            },
            {
              title: "AI-ul nu poate garanta rezultate",
              desc: "Platforma oferă instrumente și ghidare. Rezultatele depind de modul în care sunt utilizate.",
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
            La situații de criză
          </p>
          <p className="text-sm text-text-warm mb-3">
            Dacă te afli într-o situație dificilă sau ai nevoie de ajutor
            imediat:
          </p>
          <ul className="text-sm text-text-warm space-y-1.5">
            <li>
              <strong>Telefonul Speranței:</strong> 0800 801 200 (gratuit, 24/7)
            </li>
            <li>
              <strong>Telefonul Sufletului:</strong> 116 123 (gratuit)
            </li>
            <li>
              <strong>Urgențe:</strong> 112
            </li>
          </ul>
        </div>

        {/* ─── Secțiunea 8: Contact ───────────────────────────── */}
        <SectionHeading id="contact" number={8}>
          Cum ne poți contacta
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
          <InfoCard title="Responsabil Protecția Datelor (DPO)">
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
            Această pagină este actualizată ori de câte ori apar modificări în
            modul de funcționare al AI-ului în platforma JobGrade. Document
            redactat conform cerințelor Regulamentului (UE) 2024/1689 privind
            Inteligența Artificială (AI Act), Art. 13 (Transparența și
            furnizarea de informații) și Art. 14 (Supraveghere umană).
          </p>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 py-12 mt-16">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-4">
          <p className="text-sm">&copy; 2026 Psihobusiness Consulting SRL &middot; CIF RO15790994</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs">
            <Link href="/termeni" className="hover:text-white transition-colors">Termeni și condiții</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Politica de confidențialitate</Link>
            <Link href="/cookies" className="hover:text-white transition-colors">Cookie-uri</Link>
          </div>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <span className="border border-slate-700 px-2 py-0.5 rounded text-[10px] text-slate-500">GDPR</span>
            <span className="border border-slate-700 px-2 py-0.5 rounded text-[10px] text-slate-500">AI Act UE</span>
            <span className="border border-slate-700 px-2 py-0.5 rounded text-[10px] text-slate-500">Directiva 2023/970</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
