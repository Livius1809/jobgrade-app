import Image from "next/image"
import Link from "next/link"
import { ChatWidgetLoader } from "@/components/chat/ChatWidgetLoader"
import DemoForm from "../je/DemoForm"

export const metadata = {
  title: "Evaluarea comună — JobGrade",
  description: "Evaluare comună angajator-angajați conform Art. 10 din Directiva EU 2023/970. Proces structurat pentru remedierea decalajelor salariale peste 5%.",
}

export default function EvaluareComunaLanding() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/logo.svg" alt="JobGrade" width={160} height={40} className="h-9 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#problema" className="text-slate-600 hover:text-fuchsia-600">Contextul</a>
            <a href="#solutia" className="text-slate-600 hover:text-fuchsia-600">Procesul</a>
            <a href="#pricing" className="text-slate-600 hover:text-fuchsia-600">Prețuri</a>
            <a href="#demo" className="bg-[#E85D43] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#d04e36] transition-colors">
              Programează demo
            </a>
          </nav>
        </div>
      </header>

      {/* ══════════ S1: HERO ══════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-50 via-white to-violet-50/30" />
        <div className="relative max-w-4xl mx-auto px-6 py-24 md:py-32 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight tracking-tight">
            Decalaj salarial peste 5%?{" "}
            <span className="text-fuchsia-600">Evaluarea comună e obligatorie.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Art. 10 din Directiva EU 2023/970 impune un proces structurat de evaluare
            comună între angajator și reprezentanții lucrătorilor. Pregătirea contează
            mai mult decât termenul.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#demo" className="inline-flex items-center justify-center bg-[#E85D43] text-white px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-[#d04e36] transition-colors shadow-lg shadow-orange-200">
              Programează un demo gratuit
            </a>
            <a href="#solutia" className="inline-flex items-center justify-center border-2 border-fuchsia-200 text-fuchsia-700 px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-fuchsia-50 transition-colors">
              Cum funcționează
            </a>
          </div>
          <p className="mt-8 text-sm text-slate-400">
            Conform Art. 10 Directiva EU 2023/970 &middot; Termen: 6 luni de la raportare
          </p>
        </div>
      </section>

      {/* ══════════ S2: CONTEXTUL ══════════ */}
      <section id="problema" className="bg-slate-900 text-white py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">
            Când se declanșează
          </h2>
          <p className="text-center text-slate-500 text-sm mb-4">Art. 10 — evaluarea comună nu e opțională</p>
          <div className="grid md:grid-cols-3 gap-8 mt-14">
            <PainCard
              icon="📊"
              title="Decalaj ≥ 5%"
              text="Raportul de transparență salarială (Art. 9) relevă o diferență de cel puțin 5% între remunerarea lucrătorilor de sex feminin și cei de sex masculin, într-o categorie."
            />
            <PainCard
              icon="❓"
              title="Fără justificare obiectivă"
              text="Angajatorul nu poate demonstra că diferența se bazează integral pe criterii obiective și neutre din punct de vedere al genului."
            />
            <PainCard
              icon="⏰"
              title="6 luni termen"
              text="Evaluarea comună trebuie efectuată în termen de 6 luni de la publicarea raportului. Cu reprezentanții lucrătorilor, nu unilateral."
            />
          </div>
        </div>
      </section>

      {/* ══════════ S3: PROCESUL ══════════ */}
      <section id="solutia" className="py-24">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-base font-bold uppercase tracking-widest text-slate-400 mb-4">
            Cum funcționează evaluarea comună
          </h2>
          <div className="grid md:grid-cols-3 gap-10 mt-14">
            <StepCard
              step="1"
              title="Analiza cauzelor"
              text="Platforma identifică cauzele decalajului per categorie: care diferențe sunt justificate prin factori obiectivi (experiență, performanță, responsabilități) și care nu."
            />
            <StepCard
              step="2"
              title="Dialog fundamentat pe date"
              text="Angajatorul și reprezentanții lucrătorilor analizează aceleași date obiective. Platforma oferă baza comună de discuție, nu interpretări subiective."
            />
            <StepCard
              step="3"
              title="Plan de remediere agreat"
              text="Rezultatul e un plan concret: ce salarii necesită ajustare, în ce ordine, cu ce impact bugetar și în ce termen. Documentat și monitorizat."
              link="/media-books/joint-assessment"
              linkLabel="Citește ghidul complet →"
            />
          </div>
        </div>
      </section>

      {/* ══════════ S4: CE NE DIFERENȚIAZĂ ══════════ */}
      <section className="bg-fuchsia-50/50 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-12">
            Ce ne diferențiază
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <DiffCard icon="🤝" title="Colaborare, nu confruntare" text="Platforma fundamentează dialogul pe date obiective. Ambele părți văd aceleași informații, prezentate neutru." />
            <DiffCard icon="📋" title="Toate elementele din Art. 10" text="Raportul include automat: proporția pe gen, detalii diferențe, cauze identificate, măsuri propuse, monitorizare." />
            <DiffCard icon="📈" title="Plan de remediere cu impact bugetar" text="Nu doar diagnostic, ci plan concret: ce ajustezi, când, cu ce cost. Sustenabil financiar pentru organizație." />
            <DiffCard icon="🔒" title="Documentație de audit" text="Fiecare pas al procesului e documentat: decizii, justificări, termene. Dovada bunei-credințe în fața oricărei verificări." />
            <DiffCard icon="🔔" title="Monitorizare post-remediere" text="Platforma urmărește dacă măsurile adoptate produc efectul dorit. Alertare automată dacă decalajul persistă." />
            <DiffCard icon="🧠" title="AI + personal acreditat" text="Personal acreditat de Colegiul Psihologilor din România în domeniul psihologiei muncii, transporturilor și serviciilor, cu formare psihanalitică. AI-ul procesează și identifică tipare, interpretarea rămâne umană." />
          </div>
        </div>
      </section>

      {/* ══════════ S5: PRICING ══════════ */}
      <section id="pricing" className="py-24">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-base font-bold uppercase tracking-widest text-slate-400 mb-4">
            Prețuri
          </h2>
          <p className="text-center text-fuchsia-600 font-semibold mt-4 mb-16">
            Tarifare per proiect de evaluare comună
          </p>

          <div className="grid md:grid-cols-2 gap-6 items-start max-w-2xl mx-auto">
            <PricingCard
              tier="Evaluare comună standard"
              subtitle="Până la 500 angajați"
              price="—"
              unit="/proiect"
              features={[
                "Raport structurat conform Art. 10 alin. (2)",
                "Analiza cauzelor justificate vs. nejustificate",
                "Plan de remediere cu priorități",
                "Documentație completă de audit",
                "Suport în procesul de dialog social",
              ]}
            />
            <PricingCard
              tier="Enterprise"
              subtitle="500+ angajați"
              price="—"
              unit="/proiect"
              recommended
              features={[
                "Tot din Standard, plus:",
                "Analiză multi-entitate",
                "Monitorizare continuă post-remediere",
                "Simulare scenarii bugetare",
                "Responsabil de cont dedicat",
              ]}
            />
          </div>

          <div className="mt-10 max-w-lg mx-auto text-xs text-slate-400 space-y-2 leading-relaxed text-center">
            <p>Tarifare per proiect, fără TVA. Prețul depinde de complexitatea organizației. Contactați-ne pentru o ofertă personalizată.</p>
          </div>
        </div>
      </section>

      {/* ══════════ S6: RESURSE ══════════ */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-base font-bold uppercase tracking-widest text-slate-400 mb-4">
            Resurse
          </h2>
          <div className="max-w-md mx-auto mt-14">
            <ResourceCard
              icon="🤝"
              title="Ghid: Evaluarea comună"
              text="Ce presupune procesul conform Art. 10, cine participă, ce produce, la ce să te aștepți."
              href="/media-books/joint-assessment"
            />
          </div>
        </div>
      </section>

      {/* ══════════ S7: CTA + FORMULAR DEMO ══════════ */}
      <section id="demo" className="py-20 bg-gradient-to-b from-white to-fuchsia-50/30">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
            Pregătește-te înainte de termen
          </h2>
          <p className="text-slate-600 mb-10">
            Un demo durează 20 de minute și nu presupune nicio obligație.
            Vedeți cum funcționează procesul de evaluare comună pe platforma JobGrade.
          </p>

          <DemoForm />
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-3">
          <p className="text-sm">&copy; 2026 Psihobusiness Consulting SRL &middot; CIF RO15790994</p>
          <div className="flex justify-center gap-6 text-xs">
            <Link href="/privacy" className="hover:text-white">Politica de confidențialitate</Link>
            <Link href="/termeni" className="hover:text-white">Termeni și condiții</Link>
            <Link href="/cookies" className="hover:text-white">Cookie-uri</Link>
            <Link href="/transparenta-ai" className="hover:text-white">Transparență AI</Link>
          </div>
        </div>
      </footer>

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
      <div className="w-12 h-12 rounded-xl bg-fuchsia-100 text-fuchsia-600 font-bold text-xl flex items-center justify-center mx-auto mb-4">
        {step}
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed text-justify">{text}</p>
      {link && (
        <Link href={link} className="inline-block mt-3 text-xs text-fuchsia-600 hover:text-fuchsia-800 transition-colors">
          {linkLabel || "Află mai mult →"}
        </Link>
      )}
    </div>
  )
}

function ResourceCard({ icon, title, text, href }: { icon: string; title: string; text: string; href: string }) {
  return (
    <Link href={href} className="block rounded-xl border border-slate-200 bg-white p-6 hover:border-fuchsia-300 hover:shadow-md transition-all group">
      <span className="text-2xl">{icon}</span>
      <h3 className="text-base font-bold text-slate-900 mt-3 mb-2 group-hover:text-fuchsia-600 transition-colors">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed text-justify">{text}</p>
      <span className="inline-block mt-3 text-xs text-fuchsia-600 group-hover:translate-x-1 transition-transform">Citește ghidul →</span>
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
  tier, subtitle, price, unit, features, recommended,
}: {
  tier: string; subtitle: string; price: string; unit: string
  features: string[]; recommended?: boolean
}) {
  return (
    <div className={`rounded-2xl p-6 border-2 ${
      recommended ? "border-fuchsia-500 shadow-xl shadow-fuchsia-100 relative" : "border-slate-200"
    }`}>
      {recommended && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-fuchsia-600 text-white text-xs font-bold px-3 py-1 rounded-full z-10">
          Recomandat
        </span>
      )}
      <div className="pt-2">
        <h3 className="text-lg font-bold text-slate-900">{tier}</h3>
        <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
      </div>
      <div className="mt-5 mb-8">
        <span className="text-3xl font-extrabold text-slate-900">{price}</span>
        <span className="text-sm text-slate-500"> {unit}</span>
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
            <span className="text-fuchsia-500 mt-0.5 shrink-0">&#10003;</span>
            {f}
          </li>
        ))}
      </ul>
      <a href="#demo" className={`block text-center py-3 rounded-lg font-semibold text-sm transition-colors ${
        recommended
          ? "bg-[#E85D43] text-white hover:bg-[#d04e36]"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}>
        Solicită ofertă
      </a>
    </div>
  )
}
