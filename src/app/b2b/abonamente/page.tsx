import Image from "next/image"
import Link from "next/link"
import { CostCalculator } from "@/components/b2b/CostCalculator"
import { CREDIT_COSTS } from "@/lib/credits"
// GhidulPublic vine din layout B2B comun

export const metadata = {
  title: "Pachete și prețuri — JobGrade",
  description: "Trei abonamente adaptate dimensiunii organizației. Calculator interactiv. Prețuri transparente.",
}

export default function AbonamentePage() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── Header ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/favicon.svg" alt="JobGrade" width={28} height={28} />
            <span className="text-base font-semibold text-slate-800">JobGrade</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/" className="text-slate-600 hover:text-indigo-600">Acasă</Link>
            <a href="#pachete" className="text-slate-600 hover:text-indigo-600">Pachete</a>
            <a href="#calculator" className="text-slate-600 hover:text-indigo-600">Calculator</a>
            <a href="#servicii" className="text-slate-600 hover:text-indigo-600">Servicii</a>
            <Link href="/b2b/sandbox" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors">
              Diagnostic gratuit
            </Link>
          </nav>
        </div>
      </header>

      {/* ══════════ HERO ══════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50/30" />
        <div className="relative max-w-4xl mx-auto px-6 py-16 md:py-24 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight tracking-tight">
            Prețuri transparente.
          </h1>
          <p className="text-2xl md:text-4xl font-extrabold text-indigo-600 mt-1 tracking-tight">
            Plătești cât folosești.
          </p>
          <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Trei variante de abonament adaptate necesităților de dezvoltare a organizației tale.
            Serviciile se plătesc cu credite.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Creditele nu expiră. Poți schimba abonamentul oricând. Fără surprize.
          </p>
        </div>
      </section>

      {/* ══════════ CELE 3 PACHETE ══════════ */}
      <section id="pachete" className="bg-slate-50 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-10">
            Alege pachetul potrivit
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Essentials */}
            <TierCard
              name="Essentials"
              segment="1-50 angajați"
              monthlyPrice={299}
              annualPrice={2990}
              creditPrice="8,00"
              features={[
                "1 operator",
                "90 min consultanță/lună",
                "Până la 30 posturi",
                "Stocare 500 MB",
                "Suport standard (48h)",
              ]}
            />

            {/* Business */}
            <TierCard
              name="Business"
              segment="51-200 angajați"
              monthlyPrice={599}
              annualPrice={5990}
              creditPrice="6,50"
              discount="19%"
              recommended
              features={[
                "3 operatori",
                "150 min consultanță/lună",
                "Până la 100 posturi",
                "Stocare 2 GB",
                "Suport prioritar (24h)",
                "Account manager partajat",
              ]}
            />

            {/* Enterprise */}
            <TierCard
              name="Enterprise"
              segment="200+ angajați"
              monthlyPrice={999}
              annualPrice={9990}
              creditPrice="5,50"
              discount="31%"
              features={[
                "5+ operatori",
                "250 min consultanță/lună",
                "Posturi nelimitate",
                "Stocare 10 GB",
                "Suport premium (4h)",
                "Account manager dedicat",
                "Customizări disponibile",
              ]}
            />
          </div>

          {/* Explicație transparentă */}
          <div className="mt-10 max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">De ce prețul per credit scade cu abonamentul mai mare?</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Organizațiile mai mari au nevoie de volume mai mari de analiză — mai multe posturi de evaluat, mai mulți
              angajați de monitorizat, mai multe rapoarte de generat. Cu Essentials plătiți mai puțin lunar dar fiecare
              serviciu costă prețul standard. Cu Enterprise investiți mai mult lunar dar fiecare serviciu costă cu 31%
              mai puțin — pentru că volumul permite eficiență. Puteți schimba oricând.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════ CE INCLUDE ABONAMENTUL ══════════ */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-10">
            Inclus în orice abonament
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <IncludedCard icon="🏠" title="Acces la portal" text="Platforma completă, disponibilă 24/7, actualizări legislative incluse" />
            <IncludedCard icon="💾" title="Găzduire date" text="Datele organizației, stocate securizat, conforme GDPR" />
            <IncludedCard icon="🎧" title="Suport tehnic" text="Asistență tehnică și funcțională pe parcursul utilizării" />
            <IncludedCard icon="👤" title="Consultanță HR" text="Minute de consultanță cu specialist HR, incluse lunar" />
          </div>
        </div>
      </section>

      {/* ══════════ CALCULATOR INTERACTIV ══════════ */}
      <section id="calculator" className="bg-slate-50 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">
            Calculator de costuri
          </h2>
          <p className="text-center text-lg font-semibold text-slate-800 mb-2">
            Cât m-ar costa dacă...
          </p>
          <p className="text-center text-xs text-emerald-600 font-medium mb-8">
            Prețurile afișate sunt reale și se aplică la activarea contului
          </p>

          <CostCalculator />
        </div>
      </section>

      {/* ══════════ CREDITE ══════════ */}
      <section id="credite" className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">
            Pachete de credite
          </h2>
          <p className="text-center text-sm text-slate-500 mb-10 max-w-xl mx-auto">
            Creditele sunt moneda platformei. Cu cât cumperi mai multe, cu atât prețul per credit scade.
            Creditele nu expiră niciodată.
          </p>

          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
            <CreditPack name="Micro" credits={100} price={800} perCredit="8,00" showPrice />
            <CreditPack name="Mini" credits={250} price={1875} perCredit="7,50" discount="6%" />
            <CreditPack name="Start" credits={500} price={3500} perCredit="7,00" discount="12%" />
            <CreditPack name="Business" credits={1500} price={9750} perCredit="6,50" discount="19%" popular />
            <CreditPack name="Professional" credits={5000} price={30000} perCredit="6,00" discount="25%" />
            <CreditPack name="Enterprise" credits={15000} price={82500} perCredit="5,50" discount="31%" />
          </div>
        </div>
      </section>

      {/* ══════════ SERVICII CU PREȚURI REALE ══════════ */}
      <section id="servicii" className="bg-slate-50 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-3">
            Cât costă fiecare serviciu
          </h2>
          <p className="text-center text-xs text-emerald-600 font-medium mb-10">
            Prețuri reale, exprimate în credite
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse bg-white rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left py-3 px-4 text-slate-600 font-semibold">Serviciu</th>
                  <th className="text-center py-3 px-4 text-slate-600 font-semibold">Credite</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                <ServiceRow name="Anunț recrutare" credits={CREDIT_COSTS.JOB_AD} />
                <ServiceRow name="Fișă KPI (per post)" credits={CREDIT_COSTS.KPI_SHEET} />
                <ServiceRow name="Extract MVV companie" credits={CREDIT_COSTS.COMPANY_EXTRACT} />
                <ServiceRow name="Analiză evaluare post" credits={CREDIT_COSTS.JOB_ANALYSIS} />
                <ServiceRow name="Generare grilă salarială" credits={CREDIT_COSTS.GENERATE_GRADES} />
                <ServiceRow name="Simulare remunerare" credits={CREDIT_COSTS.SIMULATE_REMUNERATION} />
                <ServiceRow name="Raport pay gap" credits={CREDIT_COSTS.PAY_GAP_REPORT} />
                <ServiceRow name="Recalibrare evaluare" credits={CREDIT_COSTS.RECALIBRATION_ROUND} />
                <ServiceRow name="Export PDF/Excel" credits={CREDIT_COSTS.EXPORT_PDF} />
                <ServiceRow name="Mediere AI (per rundă)" credits={CREDIT_COSTS.AI_MEDIATION_ROUND} />
                <ServiceRow name="Consultanță HR (per minut)" credits={3} note="peste minutele gratuite" />
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ══════════ FAQ ══════════ */}
      <section className="py-16">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-10">
            Întrebări frecvente
          </h2>
          <div className="space-y-5">
            <FaqItem q="Creditele expiră?" a="Nu. Creditele rămân în cont fără limită de timp. Ați plătit pentru ele, sunt ale dumneavoastră." />
            <FaqItem q="Pot schimba abonamentul?" a="Da, oricând. Upgrade instant. Downgrade de luna viitoare — diferența se convertește în credite." />
            <FaqItem q="Ce se întâmplă dacă rămân fără credite?" a="Puteți achiziționa oricând un pachet suplimentar. Serviciile existente rămân funcționale, doar nu puteți lansa altele noi." />
{/* Pauză — de discutat termenii exact (retenție date 30 zile vs 24 luni) */}
            <FaqItem q="Dacă adaug posturi noi, plătesc de la zero?" a="Nu. Plătiți doar pentru diferența nouă. Evaluările existente se păstrează intact." />
            <FaqItem q="Cum se alege abonamentul potrivit?" a="Automat, funcție de numărul de angajați și posturi. Calculatorul de mai sus vă arată exact." />
          </div>
        </div>
      </section>

      {/* ══════════ CTA ══════════ */}
      <section className="bg-slate-900 py-16">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Vedeți cum funcționează pe datele dumneavoastră
          </h2>
          <p className="text-slate-400 mb-8">
            Diagnostic organizațional gratuit, fără cont, fără obligații.
          </p>
          <Link
            href="/b2b/sandbox"
            className="inline-flex items-center justify-center px-8 py-3 rounded-xl text-base font-semibold text-white transition-all hover:shadow-xl bg-indigo-600 hover:bg-indigo-700"
          >
            Începe diagnosticul gratuit
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-8">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-3">
          <p className="text-xs">&copy; 2026 Psihobusiness Consulting SRL &middot; CIF RO15790994</p>
          <div className="flex justify-center gap-6 text-xs">
            <Link href="/privacy" className="hover:text-white">Confidențialitate</Link>
            <Link href="/termeni" className="hover:text-white">Termeni și condiții</Link>
            <Link href="/transparenta-ai" className="hover:text-white">Transparența AI</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── Componente ──────────────────────────────────────────────────

function TierCard({
  name, segment, monthlyPrice, annualPrice, creditPrice, discount, recommended, features,
}: {
  name: string; segment: string; monthlyPrice: number; annualPrice: number
  creditPrice: string; discount?: string; recommended?: boolean; features: string[]
}) {
  return (
    <div className={`rounded-2xl p-6 border-2 bg-white ${
      recommended ? "border-indigo-500 shadow-xl shadow-indigo-100 relative" : "border-slate-200"
    }`}>
      {recommended && (
        <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
          Recomandat
        </span>
      )}
      <div className="pt-1">
        <p className="text-xs text-slate-500">{segment}</p>
        <h3 className="text-xl font-bold text-slate-900 mt-1">{name}</h3>
      </div>
      <div className="mt-4">
        <span className="text-sm font-bold text-indigo-600">{creditPrice} RON/credit</span>
        {discount && <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded ml-2">-{discount}</span>}
      </div>
      <ul className="mt-5 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-slate-600">
            <span className="text-indigo-500 mt-0.5">✓</span>
            {f}
          </li>
        ))}
      </ul>
      <Link
        href="/b2b/sandbox"
        className={`block text-center mt-6 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
          recommended
            ? "bg-indigo-600 text-white hover:bg-indigo-700"
            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`}
      >
        Începe diagnostic gratuit
      </Link>
    </div>
  )
}

function IncludedCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="text-center p-4">
      <span className="text-2xl">{icon}</span>
      <h3 className="text-sm font-bold text-slate-900 mt-2 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed">{text}</p>
    </div>
  )
}

function CreditPack({ name, credits, price, perCredit, discount, popular, showPrice }: {
  name: string; credits: number; price: number; perCredit: string; discount?: string; popular?: boolean; showPrice?: boolean
}) {
  return (
    <div className={`rounded-xl border p-4 text-center bg-white ${popular ? "border-indigo-300 ring-1 ring-indigo-100" : "border-slate-200"}`}>
      <p className="text-xs font-bold text-slate-800">{name}</p>
      <p className="text-lg font-extrabold text-slate-900 mt-1">{credits.toLocaleString("ro-RO")}</p>
      <p className="text-[10px] text-slate-400">credite</p>
      {showPrice ? (
        <>
          <p className="text-sm font-bold text-slate-700 mt-2">{price.toLocaleString("ro-RO")} RON</p>
          <p className="text-[10px] text-slate-500">{perCredit} RON/credit</p>
        </>
      ) : (
        <div className="mt-2">
          {discount && <p className="text-sm font-bold text-emerald-600">-{discount}</p>}
          <p className="text-[10px] text-slate-500">{perCredit} RON/credit</p>
        </div>
      )}
    </div>
  )
}

function ServiceRow({ name, credits, note }: { name: string; credits: number; note?: string }) {
  return (
    <tr className="border-b border-slate-100">
      <td className="py-2.5 px-4 text-slate-700 font-medium">
        {name}
        {note && <span className="text-[10px] text-slate-400 ml-1">({note})</span>}
      </td>
      <td className="py-2.5 px-4 text-center font-semibold text-slate-800">{credits}</td>
    </tr>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <div className="border-b border-slate-100 pb-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-1.5">{q}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{a}</p>
    </div>
  )
}
