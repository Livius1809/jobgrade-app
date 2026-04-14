import Image from "next/image"
import Link from "next/link"

export const metadata = {
  title: "Abonamente — JobGrade",
  description: "Planuri de abonament pentru platforma JobGrade. Acces la portal, găzduire date, suport și consultanță HR inclusă.",
}

export default function AbonamentePage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/logo.svg" alt="JobGrade" width={160} height={40} className="h-9 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/" className="text-slate-600 hover:text-indigo-600">Pagina principală</Link>
            <a href="#planuri" className="text-slate-600 hover:text-indigo-600">Planuri</a>
            <a href="#compara" className="text-slate-600 hover:text-indigo-600">Compară</a>
            <Link href="/register" className="bg-[#E85D43] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#d04e36] transition-colors">
              Creează cont
            </Link>
          </nav>
        </div>
      </header>

      {/* ══════════ HERO ══════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50/30" />
        <div className="relative max-w-4xl mx-auto px-6 py-20 md:py-28 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight tracking-tight">
            Un abonament,{" "}
            <span className="text-indigo-600">tot ce ai nevoie</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Accesul la portal, găzduirea datelor, suportul tehnic și prima oră de consultanță HR sunt incluse în fiecare plan. Plătești pentru resursele pe care le folosești.
          </p>
        </div>
      </section>

      {/* ══════════ CE INCLUDE ORICE ABONAMENT ══════════ */}
      <section className="bg-slate-50 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-10">
            Inclus în orice abonament
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <IncludedCard icon="🏠" title="Acces la portal" text="Platforma completă, disponibilă 24/7, actualizări legislative incluse" />
            <IncludedCard icon="💾" title="Găzduire date" text="Datele organizației tale, stocate securizat, conforme GDPR" />
            <IncludedCard icon="🎧" title="Suport" text="Asistență tehnică și funcțională pe parcursul utilizării" />
            <IncludedCard icon="👤" title="1h consultanță/lună" text="O oră de consultanță cu un specialist HR, inclusă în abonament" />
          </div>
        </div>
      </section>

      {/* ══════════ PLANURI ══════════ */}
      <section id="planuri" className="py-24">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-center text-base font-bold uppercase tracking-widest text-slate-400 mb-4">
            Alege planul potrivit
          </h2>
          <p className="text-center text-slate-500 text-sm mb-16 max-w-xl mx-auto">
            Trei planuri, diferențiate după volumul de date, resursele de procesare și prețul per credit de consultanță.
          </p>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            {/* Esențial */}
            <div className="rounded-2xl p-6 border-2 border-slate-200">
              <div className="pt-2">
                <h3 className="text-lg font-bold text-slate-900">Esențial</h3>
                <p className="text-xs text-slate-400 mt-1">Pentru organizații mici, la început de drum</p>
              </div>
              <div className="mt-5 mb-8">
                <span className="text-3xl font-extrabold text-slate-900">—</span>
                <span className="text-sm text-slate-500"> RON/lună</span>
              </div>
              <ul className="space-y-3 mb-8">
                <FeatureItem text="Acces portal + găzduire date" />
                <FeatureItem text="Până la 50 poziții distincte" />
                <FeatureItem text="1h consultanță HR/lună inclusă" />
                <FeatureItem text="Suport email" />
                <FeatureItem text="Credite consultanță AI la preț standard" />
                <FeatureItem text="Rapoarte de bază (evaluare + conformitate)" />
                <FeatureItem text="Export PDF pentru audit" />
              </ul>
              <Link href="/register" className="block text-center py-3 rounded-lg font-semibold text-sm transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200">
                Solicită ofertă
              </Link>
            </div>

            {/* Professional */}
            <div className="rounded-2xl p-6 border-2 border-indigo-500 shadow-xl shadow-indigo-100 relative">
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full z-10">
                Recomandat
              </span>
              <div className="pt-2">
                <h3 className="text-lg font-bold text-slate-900">Professional</h3>
                <p className="text-xs text-slate-400 mt-1">Pentru organizații în creștere, cu nevoi avansate</p>
              </div>
              <div className="mt-5 mb-8">
                <span className="text-3xl font-extrabold text-slate-900">—</span>
                <span className="text-sm text-slate-500"> RON/lună</span>
              </div>
              <ul className="space-y-3 mb-8">
                <FeatureItem text="Tot din Esențial, plus:" highlight />
                <FeatureItem text="Până la 150 poziții distincte" />
                <FeatureItem text="Import date salariale (payroll)" />
                <FeatureItem text="Benchmark salarial" />
                <FeatureItem text="Calendar conformitate" />
                <FeatureItem text="1 sesiune psiholog acreditat inclusă" />
                <FeatureItem text="Credite consultanță AI la preț redus" />
                <FeatureItem text="Suport prioritar + sesiuni video" />
              </ul>
              <Link href="/register" className="block text-center py-3 rounded-lg font-semibold text-sm transition-colors bg-[#E85D43] text-white hover:bg-[#d04e36]">
                Solicită ofertă
              </Link>
            </div>

            {/* Enterprise */}
            <div className="rounded-2xl p-6 border-2 border-slate-200">
              <div className="pt-2">
                <h3 className="text-lg font-bold text-slate-900">Enterprise</h3>
                <p className="text-xs text-slate-400 mt-1">Pentru organizații mari, cu cerințe complexe</p>
              </div>
              <div className="mt-5 mb-8">
                <span className="text-3xl font-extrabold text-slate-900">—</span>
                <span className="text-sm text-slate-500"> RON/lună</span>
              </div>
              <ul className="space-y-3 mb-8">
                <FeatureItem text="Tot din Professional, plus:" highlight />
                <FeatureItem text="Poziții distincte nelimitate" />
                <FeatureItem text="Evaluare comună Art. 10 inclus" />
                <FeatureItem text="Portal angajați Art. 7" />
                <FeatureItem text="3 sesiuni psiholog acreditat incluse" />
                <FeatureItem text="Credite consultanță AI la cel mai mic preț" />
                <FeatureItem text="Integrare cu sisteme HR existente" />
                <FeatureItem text="Responsabil de cont dedicat" />
              </ul>
              <Link href="/register" className="block text-center py-3 rounded-lg font-semibold text-sm transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200">
                Solicită ofertă
              </Link>
            </div>
          </div>

          <div className="mt-10 max-w-lg mx-auto text-xs text-slate-400 space-y-2 leading-relaxed text-center">
            <p>Prețuri fără TVA. Facturare lunară. Fără angajament minim.</p>
            <p>Serviciile (evaluare posturi, analiză decalaj salarial, evaluare comună) se adaugă separat, cu preț per proiect sau per credit.</p>
            <p className="text-slate-500 font-medium">Prețurile definitive vor fi publicate în curând. Contactați-ne pentru o ofertă personalizată.</p>
          </div>
        </div>
      </section>

      {/* ══════════ TABEL COMPARATIV ══════════ */}
      <section id="compara" className="bg-slate-50 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-10">
            Comparație detaliată
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 text-slate-500 font-medium border-b border-slate-200">Dimensiune</th>
                  <th className="text-center py-3 px-4 text-slate-900 font-bold border-b border-slate-200">Esențial</th>
                  <th className="text-center py-3 px-4 text-indigo-600 font-bold border-b border-slate-200">Professional</th>
                  <th className="text-center py-3 px-4 text-slate-900 font-bold border-b border-slate-200">Enterprise</th>
                </tr>
              </thead>
              <tbody className="text-xs text-slate-600">
                <CompareSection title="Date și stocare" />
                <CompareRow label="Poziții distincte" v1="Până la 50" v2="Până la 150" v3="Nelimitat" />
                <CompareRow label="Angajați (date salariale)" v1="Până la 200" v2="Până la 1.000" v3="Nelimitat" />
                <CompareRow label="Istoric date (retenție)" v1="12 luni" v2="36 luni" v3="Nelimitat" />

                <CompareSection title="Procesare și rapoarte" />
                <CompareRow label="Evaluare posturi" v1="✓" v2="✓" v3="✓" />
                <CompareRow label="Raport conformitate Art. 4" v1="✓" v2="✓" v3="✓" />
                <CompareRow label="Raport decalaj salarial Art. 9" v1="✓" v2="✓" v3="✓" />
                <CompareRow label="Import payroll" v1="—" v2="✓" v3="✓" />
                <CompareRow label="Benchmark salarial" v1="—" v2="✓" v3="✓" />
                <CompareRow label="Evaluare comună Art. 10" v1="—" v2="—" v3="✓" />
                <CompareRow label="Portal angajați Art. 7" v1="—" v2="—" v3="✓" />
                <CompareRow label="Calendar conformitate" v1="—" v2="✓" v3="✓" />
                <CompareRow label="Monitorizare continuă + alerte" v1="—" v2="✓" v3="✓" />

                <CompareSection title="Consultanță și suport" />
                <CompareRow label="Consultanță HR (inclusă/lună)" v1="1h" v2="1h" v3="1h" />
                <CompareRow label="Sesiuni psiholog acreditat" v1="La cerere" v2="1 inclusă" v3="3 incluse" />
                <CompareRow label="Credite consultanță AI" v1="Preț standard" v2="Preț redus" v3="Cel mai mic preț" />
                <CompareRow label="Suport" v1="Email" v2="Email + Chat + Video" v3="Dedicat" />

                <CompareSection title="Integrări" />
                <CompareRow label="Export PDF/Excel" v1="✓" v2="✓" v3="✓" />
                <CompareRow label="Integrare sisteme HR" v1="—" v2="—" v3="✓" />
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ══════════ FAQ ══════════ */}
      <section className="py-20">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-10">
            Întrebări frecvente
          </h2>
          <div className="space-y-6">
            <FaqItem
              q="Ce plătesc lunar și ce plătesc separat?"
              a="Abonamentul lunar include: accesul la portal, găzduirea datelor, suportul tehnic și 1h de consultanță HR. Serviciile (evaluare posturi, analiză decalaj salarial etc.) se plătesc separat, per proiect sau per credit."
            />
            <FaqItem
              q="Pot schimba planul ulterior?"
              a="Da. Puteți trece la un plan superior oricând. Diferența de preț se calculează proporțional pentru perioada rămasă."
            />
            <FaqItem
              q="Ce sunt creditele de consultanță AI?"
              a="Creditele vă permit să interacționați cu consultantul AI al platformei pentru întrebări despre evaluare, legislație, interpretare rapoarte. Prețul per credit scade pe măsură ce planul crește."
            />
            <FaqItem
              q="Ce se întâmplă cu datele mele dacă renunț?"
              a="Datele vă aparțin. La încheierea abonamentului, aveți 30 de zile să le exportați. După aceea sunt șterse conform politicii GDPR."
            />
            <FaqItem
              q="Trebuie să semnez un contract?"
              a="Da. Semnăm un contract de prestări servicii înainte de activarea contului. Contractul standard este disponibil pentru descărcare după înregistrare."
            />
          </div>
        </div>
      </section>

      {/* ══════════ CTA ══════════ */}
      <section className="bg-slate-900 py-16">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Începe cu un cont gratuit
          </h2>
          <p className="text-slate-400 mb-8">
            Înregistrarea e gratuită. Alegi planul și plătești doar când ești pregătit.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center px-8 py-3 rounded-xl text-base font-semibold text-white transition-all hover:shadow-xl"
            style={{ backgroundColor: "var(--coral)" }}
          >
            Creează cont
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-3">
          <p className="text-xs">&copy; 2026 Psihobusiness Consulting SRL &middot; CIF RO15790994</p>
          <div className="flex justify-center gap-6 text-xs">
            <Link href="/privacy" className="hover:text-white">Confidențialitate</Link>
            <Link href="/terms" className="hover:text-white">Termeni</Link>
            <Link href="/transparenta-ai" className="hover:text-white">Transparența AI</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── Componente ──────────────────────────────────────────────────────────────

function IncludedCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="text-center p-4">
      <span className="text-2xl">{icon}</span>
      <h3 className="text-sm font-bold text-slate-900 mt-2 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{text}</p>
    </div>
  )
}

function FeatureItem({ text, highlight }: { text: string; highlight?: boolean }) {
  return (
    <li className="flex items-start gap-2 text-sm text-slate-600">
      <span className="text-indigo-500 mt-0.5 shrink-0">&#10003;</span>
      <span className={highlight ? "font-semibold text-slate-900" : ""}>{text}</span>
    </li>
  )
}

function CompareSection({ title }: { title: string }) {
  return (
    <tr>
      <td colSpan={4} className="pt-6 pb-2 px-4 text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-200">
        {title}
      </td>
    </tr>
  )
}

function CompareRow({ label, v1, v2, v3 }: { label: string; v1: string; v2: string; v3: string }) {
  return (
    <tr className="border-b border-slate-100">
      <td className="py-2.5 px-4 text-slate-700">{label}</td>
      <td className="py-2.5 px-4 text-center">{v1}</td>
      <td className="py-2.5 px-4 text-center font-medium text-indigo-600">{v2}</td>
      <td className="py-2.5 px-4 text-center">{v3}</td>
    </tr>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="border-b border-slate-100 pb-5">
      <h3 className="text-sm font-semibold text-slate-900 mb-2">{q}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{a}</p>
    </div>
  )
}
