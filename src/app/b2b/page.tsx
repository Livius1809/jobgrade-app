import Image from "next/image"
import Link from "next/link"
import dynamic from "next/dynamic"
import DemoForm from "./DemoForm"

const ChatWidget = dynamic(() => import("@/components/chat/ChatWidget"), { ssr: false })

export const metadata = {
  title: "JobGrade B2B — Evaluare posturi conformă cu Directiva EU 2023/970",
  description: "Platformă de evaluare și ierarhizare a posturilor pentru companii românești. Metodologie validată, 5-10x mai accesibilă decât consultanța tradițională.",
}

export default function B2BLanding() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="JobGrade" width={32} height={32} />
            <span className="text-lg font-semibold text-indigo-700">JobGrade</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#problema" className="text-slate-600 hover:text-indigo-600">Problema</a>
            <a href="#solutia" className="text-slate-600 hover:text-indigo-600">Soluția</a>
            <a href="#pricing" className="text-slate-600 hover:text-indigo-600">Prețuri</a>
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
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">
            Trei probleme reale, un singur termen-limită
          </h2>
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <PainCard
              icon="📅"
              title="Sancțiuni din 2027"
              text="Directiva EU impune transparență salarială. Companiile cu 100+ angajați vor raporta diferențele. Lipsa unui sistem obiectiv devine risc juridic."
            />
            <PainCard
              icon="💰"
              title="Consultanța costă 30.000–150.000 EUR"
              text="Metodologiile clasice (Hay, Mercer, WTW) au fost create pentru multinaționale. Pentru o companie românească de 500 angajați, prețul depășește 80.000 EUR."
            />
            <PainCard
              icon="⚖️"
              title="Excel-ul nu e apărabil juridic"
              text="Sarcina probei e inversată: angajatorul demonstrează că nu discriminează. Un spreadsheet fără audit trail nu rezistă la inspecție ITM."
            />
          </div>
        </div>
      </section>

      {/* ══════════ S3: SOLUȚIA ══════════ */}
      <section id="solutia" className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">
            Cum funcționează JobGrade
          </h2>
          <div className="grid md:grid-cols-3 gap-10 mt-12">
            <StepCard
              step="1"
              title="Definești posturile"
              text="Importați fișele de post sau creați-le direct. JobGrade extrage elementele relevante pentru evaluare. Intrare minimă: obiectul de activitate."
            />
            <StepCard
              step="2"
              title="Evaluezi cu comitetul"
              text="Comitetul intern evaluează pe 6 criterii obiective. AI-ul asistă și semnalează inconsistențe — dar decizia rămâne umană, conform Art. 14 AI Act."
            />
            <StepCard
              step="3"
              title="Primești rapoarte conforme"
              text="Grading, analiză pay gap, documentație audit — generate automat, gata pentru raportare, inspecție sau negociere colectivă."
            />
          </div>
        </div>
      </section>

      {/* ══════════ S4: DE CE JOBGRADE ══════════ */}
      <section className="bg-indigo-50/50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-12">
            Ce ne diferențiază
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <DiffCard icon="📉" title="5–10x mai accesibil" text="Aceeași rigurozitate metodologică, fără costurile consultanței tradiționale." />
            <DiffCard icon="⚡" title="Zile, nu luni" text="Implementare în 2–4 săptămâni, nu 4–8 luni. Comitetul lucrează în ritmul propriu." />
            <DiffCard icon="⚖️" title="6 criterii neutre gen" text="Educație, Comunicare, Rezolvare probleme, Decizii, Impact afaceri, Condiții muncă." />
            <DiffCard icon="🔒" title="Audit trail complet" text="Fiecare evaluare, vot, ajustare — înregistrate cu timestamp și justificare." />
            <DiffCard icon="🏢" title="Per poziție, nu per angajat" text="Plătiți pentru cele 80 de posturi distincte, nu pentru cei 800 de angajați." />
            <DiffCard icon="🧠" title="AI + psihologi acreditați" text="2 psihologi CPR supervizează. AI-ul procesează date, nu ia decizii." />
          </div>
        </div>
      </section>

      {/* ══════════ S5: PRICING ══════════ */}
      <section id="pricing" className="py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">
            Prețuri transparente — ca și serviciul nostru
          </h2>
          <p className="text-center text-indigo-600 font-semibold mt-2 mb-12">
            Ofertă de lansare: -25% pentru primele 20 de companii
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <PricingCard
              tier="Starter"
              subtitle="1–50 poziții distincte"
              price="150"
              originalPrice="200"
              features={[
                "Evaluare pe 6 criterii",
                "Comitet — până la 4 membri",
                "Raport grading final",
                "Export PDF audit",
                "Asistență AI",
                "Suport e-mail",
              ]}
            />
            <PricingCard
              tier="Professional"
              subtitle="51–150 poziții distincte"
              price="112"
              originalPrice="150"
              recommended
              features={[
                "Tot din Starter, plus:",
                "Comitet — până la 8 membri",
                "Analiză pay gap pe gen",
                "Integrare cu MVV",
                "Suport prioritar + video call",
                "Sesiune onboarding (60 min)",
              ]}
            />
            <PricingCard
              tier="Enterprise"
              subtitle="150+ poziții distincte"
              price="90"
              originalPrice="120"
              features={[
                "Tot din Professional, plus:",
                "Comitet — fără limită",
                "Dashboard management avansat",
                "API integrare HR",
                "Account manager dedicat",
                "SLA răspuns 24h",
              ]}
            />
          </div>

          <p className="text-center text-xs text-slate-400 mt-8">
            Prețuri RON/poziție, fără TVA. Facturare unică. Reînnoire anuală 50%.
          </p>
        </div>
      </section>

      {/* ══════════ S6: ROI ══════════ */}
      <section className="bg-slate-900 text-white py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-12">
            Numerele vorbesc
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
              <p className="text-sm text-slate-400 uppercase tracking-wider mb-3">ROI concret</p>
              <p className="text-3xl font-bold text-emerald-400 mb-4">50.000 – 90.000 RON</p>
              <p className="text-slate-300 text-sm leading-relaxed">
                economie pentru o companie cu 80 de poziții distincte vs. consultanță tradițională.
                JobGrade: 7.500–12.000 RON. Consultanță: 60.000–100.000 RON.
              </p>
            </div>
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
              <p className="text-sm text-slate-400 uppercase tracking-wider mb-3">Costul inacțiunii</p>
              <p className="text-3xl font-bold text-red-400 mb-4">180.000 – 750.000 RON/an</p>
              <p className="text-slate-300 text-sm leading-relaxed">
                risc anual estimat de non-conformitate pentru o companie cu 200–500 angajați
                (amenzi, litigii, daune reputaționale). Investiția JobGrade: sub 1% din risc.
              </p>
            </div>
          </div>
          <div className="mt-12 text-center space-y-2">
            <p className="text-slate-400 text-sm">Psihobusiness Consulting SRL &middot; 2 psihologi acreditați CPR &middot; Metodologie validată</p>
            <p className="text-slate-500 text-xs">Conform AI Act Art. 14 — supervizare umană obligatorie</p>
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
        <div className="max-w-5xl mx-auto px-6 text-center space-y-3">
          <p className="text-sm">&copy; 2026 Psihobusiness Consulting SRL &middot; CIF RO15790994</p>
          <div className="flex justify-center gap-6 text-xs">
            <Link href="/privacy" className="hover:text-white">Politica de confidențialitate</Link>
            <Link href="/terms" className="hover:text-white">Termeni și condiții</Link>
            <Link href="/cookies" className="hover:text-white">Cookie-uri</Link>
          </div>
        </div>
      </footer>

      {/* Agent host: HR_COUNSELOR — consilier dedicat pe pagina B2B */}
      <ChatWidget />
    </div>
  )
}

// ── Componente ──────────────────────────────────────────────────────────────

function PainCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
      <span className="text-2xl">{icon}</span>
      <h3 className="text-lg font-bold text-white mt-3 mb-2">{title}</h3>
      <p className="text-slate-300 text-sm leading-relaxed">{text}</p>
    </div>
  )
}

function StepCard({ step, title, text }: { step: string; title: string; text: string }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 font-bold text-xl flex items-center justify-center mx-auto mb-4">
        {step}
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed">{text}</p>
    </div>
  )
}

function DiffCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm">
      <span className="text-xl">{icon}</span>
      <h3 className="text-sm font-bold text-slate-900 mt-2 mb-1">{title}</h3>
      <p className="text-slate-500 text-xs leading-relaxed">{text}</p>
    </div>
  )
}

function PricingCard({
  tier, subtitle, price, originalPrice, features, recommended,
}: {
  tier: string; subtitle: string; price: string; originalPrice: string
  features: string[]; recommended?: boolean
}) {
  return (
    <div className={`rounded-2xl p-6 border-2 ${
      recommended ? "border-indigo-500 shadow-xl shadow-indigo-100 relative" : "border-slate-200"
    }`}>
      {recommended && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
          Recomandat
        </span>
      )}
      <h3 className="text-lg font-bold text-slate-900">{tier}</h3>
      <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
      <div className="mt-4 mb-6">
        <span className="text-slate-400 text-sm line-through mr-2">{originalPrice} RON</span>
        <span className="text-3xl font-extrabold text-slate-900">{price}</span>
        <span className="text-sm text-slate-500"> RON/poziție</span>
      </div>
      <ul className="space-y-2 mb-6">
        {features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
            <span className="text-indigo-500 mt-0.5">&#10003;</span>
            {f}
          </li>
        ))}
      </ul>
      <a href="#demo" className={`block text-center py-2.5 rounded-lg font-semibold text-sm transition-colors ${
        recommended
          ? "bg-[#E85D43] text-white hover:bg-[#d04e36]"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}>
        Începe acum
      </a>
    </div>
  )
}
