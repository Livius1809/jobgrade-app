import Image from "next/image"
import Link from "next/link"
import { ChatWidgetLoader } from "@/components/chat/ChatWidgetLoader"
import DemoForm from "./DemoForm"

export const metadata = {
  title: "Evaluare și ierarhizare posturi — JobGrade",
  description: "Serviciu de evaluare și ierarhizare a posturilor conform Directivei EU 2023/970. Metodologie validată, accesibilă companiilor românești.",
}

export default function B2BLanding() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/logo.svg" alt="JobGrade" width={160} height={40} className="h-9 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#problema" className="text-slate-600 hover:text-indigo-600">Problema</a>
            <a href="#solutia" className="text-slate-600 hover:text-indigo-600">Soluția</a>
            <a href="#pricing" className="text-slate-600 hover:text-indigo-600">Prețuri</a>
            <Link href="/demo" className="text-slate-600 hover:text-indigo-600">Exemple rapoarte</Link>
            <a href="#demo" className="bg-[#E85D43] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#d04e36] transition-colors">
              Programează demo
            </a>
          </nav>
        </div>
      </header>

      {/* ══════════ S1: HERO ══════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-orange-50/30" />
        <div className="relative max-w-4xl mx-auto px-6 py-24 md:py-32 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight tracking-tight">
            Transparența salarială devine lege.{" "}
            <span className="text-indigo-600">Sunteți pregătiți?</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            JobGrade evaluează și ierarhizează posturile din organizația dumneavoastră
            conform Directivei EU 2023/970. Platformă digitală cu metodologie validată,
            pentru companii românești.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#demo" className="inline-flex items-center justify-center bg-[#E85D43] text-white px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-[#d04e36] transition-colors shadow-lg shadow-orange-200">
              Programează un demo gratuit
            </a>
            <a href="#pricing" className="inline-flex items-center justify-center border-2 border-indigo-200 text-indigo-700 px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-indigo-50 transition-colors">
              Vezi prețurile
            </a>
          </div>
          <p className="mt-8 text-sm text-slate-400">
            Metodologie validată &middot; Echipă acreditată &middot; Conform EU 2023/970
          </p>
        </div>
      </section>

      {/* ══════════ S2: PROBLEMA ══════════ */}
      <section id="problema" className="bg-slate-900 text-white py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">
            Trei probleme reale pe care le rezolvăm
          </h2>
          <p className="text-center text-slate-500 text-sm mb-4">Un singur termen-limită</p>
          <div className="grid md:grid-cols-3 gap-8 mt-14">
            <PainCard
              icon="📅"
              title="Sancțiuni din 2027"
              text="Directiva EU impune transparență salarială. Companiile cu 100+ angajați vor raporta diferențele. Lipsa unui sistem obiectiv devine risc juridic."
            />
            <PainCard
              icon="💰"
              title="Costul ridicat cu consultanța clasică"
              text="Consultanța tradițională costă între 30.000 și 150.000 EUR. Metodologiile clasice (Hay, Mercer, WTW) au fost create pentru multinaționale. Pentru o companie românească de 500 angajați, prețul depășește 80.000 EUR."
            />
            <PainCard
              icon="⚖️"
              title="Tabelele în Excel nu constituie probe juridice"
              text="Sarcina probei e inversată: angajatorul trebuie să demonstreze că nu discriminează. O foaie de calcul fără un registru complet al modificărilor nu rezistă la o inspecție ITM."
            />
          </div>
        </div>
      </section>

      {/* ══════════ S3: SOLUȚIA ══════════ */}
      <section id="solutia" className="py-24">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-base font-bold uppercase tracking-widest text-slate-400 mb-4">
            Cum funcționează JobGrade
          </h2>
          <div className="grid md:grid-cols-3 gap-10 mt-14">
            <StepCard
              step="1"
              title="Definești posturile"
              text="Importați fișele de post sau creați-le direct. JobGrade extrage elementele relevante pentru evaluare. Efort minim din partea dvs. — introduceți doar fișele de post existente."
            />
            <StepCard
              step="2"
              title="Evaluezi cu comitetul"
              text="Comitetul intern desemnat de organizația-client evaluează pe 4 criterii primare de evaluare (conform legislației UE), detaliate în 6 criterii secundare. AI-ul asistă și semnalează inconsistențe — dar decizia rămâne umană, conform Art. 14 AI Act."
            />
            <StepCard
              step="3"
              title="Primești rapoarte conforme cu Directiva EU 2023/970"
              text="Ierarhizarea posturilor, analiza decalajului salarial conform Directivei EU 2023/970, documentație de audit — generate automat, gata pentru raportare, inspecție sau negociere colectivă."
              link="/media-books/job-grading"
              linkLabel="Vezi ghidul complet →"
            />
          </div>
        </div>
      </section>

      {/* ══════════ S4: DE CE JOBGRADE ══════════ */}
      <section className="bg-indigo-50/50 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-12">
            Ce ne diferențiază
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <DiffCard icon="📉" title="5–10x mai accesibil" text="Aceeași rigurozitate metodologică, fără costurile consultanței tradiționale." />
            <DiffCard icon="⚡" title="Zile, nu luni" text="Implementare în 2–4 săptămâni, nu 4–8 luni. Durata efectivă e sub controlul dvs. — comitetul lucrează în ritmul propriu." />
            <DiffCard icon="⚖️" title="4 criterii primare + 6 criterii secundare" text="Criterii obiective de evaluare neutre din perspectiva genului, conforme cu cerințele legislației europene privind transparența salarială." />
            <DiffCard icon="🔒" title="Trasabilitate completă" text="Fiecare evaluare, vot și ajustare — înregistrate cu dată, oră și justificare. Registru de audit accesibil oricând." />
            <DiffCard icon="🏢" title="Tarifare pe poziții și salariați" text="Costul se calculează pe baza numărului de poziții distincte din statul de funcții și a numărului de salariați. Calculator transparent în portal." />
            <DiffCard icon="🧠" title="AI + personal acreditat" text="Personal acreditat de Colegiul Psihologilor din România în domeniul psihologiei muncii, transporturilor și serviciilor, cu formare psihanalitică și experiență în resurse umane și proiecte pentru organizații din România. AI-ul procesează date, nu ia decizii." />
          </div>
        </div>
      </section>

      {/* ══════════ S5: PRICING ══════════ */}
      <section id="pricing" className="py-24">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-base font-bold uppercase tracking-widest text-slate-400 mb-4">
            Prețuri transparente — ca și serviciul nostru
          </h2>
          <p className="text-center text-indigo-600 font-semibold mt-4 mb-16">
            Cost calculat pe baza organizației dvs. — poziții + salariați
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
            <PricingCard
              tier="Ordine internă"
              subtitle="Baza"
              price="—"
              features={[
                "Evaluare pe 4 criterii neutre + 6 subcriterii",
                "Ierarhizare completă a posturilor",
                "Fișe de post AI",
                "Structură salarială",
                "Raport RDA + export PDF",
                "Comitet evaluare + mediere AI",
                "Jurnal proces complet",
              ]}
            />
            <PricingCard
              tier="Conformitate"
              subtitle="Nivelul 1"
              price="—"
              features={[
                "Tot din Ordine internă, plus:",
                "Analiză decalaj salarial (Art. 9 Dir. EU 2023/970)",
                "Benchmark salarial pe piață",
                "Raport CIA (Conformitate Internă)",
              ]}
            />
            <PricingCard
              tier="Competitivitate"
              subtitle="Nivelul 2"
              price="—"
              recommended
              features={[
                "Tot din Conformitate, plus:",
                "Pachete salariale competitive",
                "Evaluare performanță",
                "Impact bugetar simulat",
              ]}
            />
            <PricingCard
              tier="Dezvoltare"
              subtitle="Nivelul 3"
              price="—"
              features={[
                "Tot din Competitivitate, plus:",
                "Dezvoltare HR integrată",
                "Recrutare asistată AI",
                "Manual angajat personalizat",
              ]}
            />
          </div>

          <div className="mt-10 max-w-lg mx-auto text-center">
            <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-5">
              <p className="text-sm text-indigo-800 font-medium mb-2">Costul se calculează pe baza organizației dvs.</p>
              <p className="text-xs text-indigo-600 leading-relaxed">
                Prețul depinde de numărul de <strong>poziții distincte</strong> din statul de funcții
                și de numărul de <strong>salariați</strong>. Creați un cont gratuit pentru a vedea
                calculatorul de preț personalizat.
              </p>
              <div className="mt-4">
                <a href="/register" className="inline-block px-6 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors">
                  Calculator preț gratuit →
                </a>
              </div>
            </div>
          </div>

          <div className="mt-6 max-w-lg mx-auto text-xs text-slate-400 space-y-2 leading-relaxed text-center">
            <p>Prețuri RON, fără TVA. Facturare unică per proiect de evaluare.</p>
            <p className="text-slate-500">
              <strong>Discount volum automat:</strong> cu cât organizația are mai multe poziții și salariați,
              cu atât costul pe unitate scade (până la 25% reducere Enterprise).
            </p>
          </div>
        </div>
      </section>

      {/* ══════════ S6: ROI ══════════ */}
      <section className="bg-slate-900 text-white py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-12">
            Cifrele vorbesc
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
              <p className="text-sm text-slate-400 uppercase tracking-wider mb-3">Economie vs. consultanță tradițională</p>
              <p className="text-3xl font-bold text-emerald-400 mb-4">50.000 – 90.000 RON</p>
              <p className="text-slate-300 text-sm leading-relaxed text-justify">
                Economie estimată pentru o companie cu 80 de poziții distincte.
                JobGrade: 7.500–12.000 RON. Consultanță tradițională: 60.000–100.000 RON.
              </p>
            </div>
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
              <p className="text-sm text-slate-400 uppercase tracking-wider mb-3">Riscul non-conformității</p>
              <p className="text-slate-300 text-sm leading-relaxed space-y-3 text-justify">
                <span className="block">Directiva EU 2023/970 prevede consecințe concrete pentru angajatorii non-conformi:</span>
                <span className="block">• <strong className="text-slate-200">Art. 23</strong> — Sancțiuni efective, proporționale și disuasive, stabilite de fiecare stat membru</span>
                <span className="block">• <strong className="text-slate-200">Art. 16</strong> — Dreptul lucrătorului la compensare integrală, fără limită superioară stabilită</span>
                <span className="block">• <strong className="text-slate-200">Art. 20</strong> — Sarcina probei inversată: angajatorul demonstrează că nu a discriminat</span>
                <span className="block mt-2 text-slate-400 text-xs">Riscurile includ: sancțiuni administrative, litigii individuale și colective, compensări retroactive și daune reputaționale.</span>
              </p>
            </div>
          </div>
          <div className="mt-14 text-center space-y-2">
            <p className="text-slate-400 text-sm">Psihobusiness Consulting SRL &middot; Personal acreditat CPR &middot; Metodologie validată</p>
            <p className="text-slate-500 text-xs">Conform AI Act Art. 14 — supervizare umană obligatorie</p>
          </div>
        </div>
      </section>

      {/* ══════════ S6.5: RESURSE ══════════ */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-base font-bold uppercase tracking-widest text-slate-400 mb-4">
            Resurse pentru organizația dvs.
          </h2>
          <p className="text-center text-slate-500 text-sm mb-14 max-w-xl mx-auto">
            Ghiduri interactive despre evaluarea posturilor, conformitate salarială
            și cerințele Directivei EU 2023/970. Citiți înainte de demo.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            <ResourceCard
              icon="📊"
              title="Ierarhizarea posturilor"
              text="Ghid complet: metodologie, criterii, pași practici și context legislativ românesc."
              href="/media-books/job-grading"
            />
            <ResourceCard
              icon="⚖️"
              title="Analiza decalajului salarial"
              text="Ce presupune raportul de decalaj salarial pe gen, conform Art. 9 Directiva EU 2023/970."
              href="/media-books/pay-gap-analysis"
            />
            <ResourceCard
              icon="🤝"
              title="Evaluarea comună"
              text="Cum funcționează evaluarea comună angajator-angajați, conform Art. 10 Directiva EU 2023/970."
              href="/media-books/joint-assessment"
            />
          </div>
          <div className="mt-8 text-center">
            <Link href="/media-books" className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors">
              Toate ghidurile →
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════ S7: CTA + FORMULAR DEMO ══════════ */}
      <section id="demo" className="py-20 bg-gradient-to-b from-white to-indigo-50/30">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
            Termenul este 7 iunie 2026. Sunteți pregătiți?
          </h2>
          <p className="text-slate-600 mb-10">
            Un demo durează 20 de minute și nu presupune nicio obligație.
            Vedeți platforma, puneți întrebări, decideți în cunoștință de cauză.
          </p>

          <DemoForm />
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-3">
          <p className="text-sm">&copy; 2026 Psihobusiness Consulting SRL &middot; CIF RO15790994</p>
          <div className="flex flex-wrap justify-center gap-6 text-xs">
            <Link href="/privacy" className="hover:text-white">Politica de confidențialitate</Link>
            <Link href="/termeni" className="hover:text-white">Termeni și condiții</Link>
            <Link href="/cookies" className="hover:text-white">Cookie-uri</Link>
            <Link href="/transparenta-ai" className="hover:text-white">Transparență AI</Link>
          </div>
        </div>
      </footer>

      {/* Agent host: HR_COUNSELOR — consilier dedicat pe pagina B2B */}
      <ChatWidgetLoader />
    </div>
  )
}

// ── Componente ──────────────────────────────────────────────────────────────

function PainCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
      <span className="text-2xl">{icon}</span>
      <h3 className="text-lg font-bold text-white mt-3 mb-2">{title}</h3>
      <p className="text-slate-300 text-sm leading-relaxed text-justify">{text}</p>
    </div>
  )
}

function StepCard({ step, title, text, link, linkLabel }: { step: string; title: string; text: string; link?: string; linkLabel?: string }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 font-bold text-xl flex items-center justify-center mx-auto mb-4">
        {step}
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed text-justify">{text}</p>
      {link && (
        <Link href={link} className="inline-block mt-3 text-xs text-indigo-600 hover:text-indigo-800 transition-colors">
          {linkLabel || "Află mai mult →"}
        </Link>
      )}
    </div>
  )
}

function ResourceCard({ icon, title, text, href }: { icon: string; title: string; text: string; href: string }) {
  return (
    <Link href={href} className="block rounded-xl border border-slate-200 bg-white p-6 hover:border-indigo-300 hover:shadow-md transition-all group">
      <span className="text-2xl">{icon}</span>
      <h3 className="text-base font-bold text-slate-900 mt-3 mb-2 group-hover:text-indigo-600 transition-colors">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed text-justify">{text}</p>
      <span className="inline-block mt-3 text-xs text-indigo-600 group-hover:translate-x-1 transition-transform">Citește ghidul →</span>
    </Link>
  )
}

function DiffCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
      <span className="text-xl">{icon}</span>
      <h3 className="text-sm font-bold text-slate-900 mt-2 mb-1">{title}</h3>
      <p className="text-slate-500 text-xs leading-relaxed text-justify">{text}</p>
    </div>
  )
}

function PricingCard({
  tier, subtitle, price, features, recommended,
}: {
  tier: string; subtitle: string; price: string
  features: string[]; recommended?: boolean
}) {
  return (
    <div className={`rounded-2xl p-6 border-2 ${
      recommended ? "border-indigo-500 shadow-xl shadow-indigo-100 relative" : "border-slate-200"
    }`}>
      {recommended && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full z-10">
          Recomandat
        </span>
      )}
      <div className="pt-2">
        <h3 className="text-lg font-bold text-slate-900">{tier}</h3>
        <p className="text-xs text-indigo-500 font-medium mt-1">{subtitle}</p>
      </div>
      <div className="mt-5 mb-8">
        <span className="text-sm text-slate-500">{price}</span>
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
            <span className="text-indigo-500 mt-0.5 shrink-0">&#10003;</span>
            {f}
          </li>
        ))}
      </ul>
      <a href="#demo" className={`block text-center py-3 rounded-lg font-semibold text-sm transition-colors ${
        recommended
          ? "bg-[#E85D43] text-white hover:bg-[#d04e36]"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}>
        Începe acum
      </a>
    </div>
  )
}
