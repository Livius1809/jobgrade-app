import Image from "next/image"
import Link from "next/link"
import { PricingSection } from "@/components/b2b/PricingSection"

export const metadata = {
  title: "Abonament și credite — JobGrade",
  description: "Un singur abonament, toate serviciile. Plătești cu credite, doar pentru ce folosești.",
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
            <a href="#abonament" className="text-slate-600 hover:text-indigo-600">Abonament</a>
            <a href="#credite" className="text-slate-600 hover:text-indigo-600">Credite</a>
            <a href="#servicii" className="text-slate-600 hover:text-indigo-600">Servicii</a>
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
            Un singur abonament.{" "}
            <span className="text-indigo-600">Toate serviciile.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Accesul la portal, găzduirea datelor, suportul și consultanța sunt incluse.
            Serviciile le plătești cu credite, doar pentru ce folosești.
          </p>
        </div>
      </section>

      {/* ══════════ CE INCLUDE ABONAMENTUL ══════════ */}
      <section className="bg-slate-50 py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-10">
            Inclus în abonament
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <IncludedCard icon="🏠" title="Acces la portal" text="Platforma completă, disponibilă 24/7, actualizări legislative incluse" />
            <IncludedCard icon="💾" title="Găzduire date" text="Datele organizației tale, stocate securizat, conforme GDPR" />
            <IncludedCard icon="🎧" title="Suport" text="Asistență tehnică și funcțională pe parcursul utilizării" />
            <IncludedCard icon="👤" title="1h consultanță/lună" text="O oră de consultanță cu un specialist HR, inclusă în abonament" />
          </div>
        </div>
      </section>

      {/* ══════════ CUM FUNCȚIONEAZĂ ══════════ */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-12">
            Cum funcționează
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 font-bold text-xl flex items-center justify-center mx-auto mb-4">1</div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Te abonezi</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Un singur abonament, același pentru toți. Include accesul la portal, găzduirea datelor, suportul și 1h de consultanță HR pe lună.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-600 font-bold text-xl flex items-center justify-center mx-auto mb-4">2</div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Cumperi credite</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Creditele sunt moneda platformei. Cumperi un pachet, cu cât mai mare, cu atât prețul per credit scade. Creditele nu expiră.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-fuchsia-100 text-fuchsia-600 font-bold text-xl flex items-center justify-center mx-auto mb-4">3</div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Folosești servicii</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Fiecare serviciu are un cost în credite: evaluarea posturilor, analiza salarială, consultanța AI. Plătești doar ce folosești.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 font-bold text-xl flex items-center justify-center mx-auto mb-4">4</div>
              <h3 className="text-sm font-bold text-slate-900 mb-2">Crești natural</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Pe măsură ce descoperi noi servicii, consumi mai multe credite. Fără upgrade de plan, fără limite artificiale, fără surprize.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ ABONAMENT — CARD UNIC ══════════ */}
      <PricingSection />

      {/* ══════════ CREDITE ══════════ */}
      <section id="credite" className="bg-slate-50 py-24">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-base font-bold uppercase tracking-widest text-slate-400 mb-4">
            Credite
          </h2>
          <p className="text-center text-slate-500 text-sm mb-16 max-w-xl mx-auto">
            Creditele sunt moneda platformei. Fiecare serviciu are un cost în credite.
            Cumperi pachete de credite — cu cât cumperi mai multe, cu atât prețul per credit scade.
          </p>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            <CreditPackCard
              name="Pachet Start"
              credits="—"
              pricePerCredit="—"
              total="—"
              description="Pentru primele evaluări și rapoarte"
            />
            <CreditPackCard
              name="Pachet Business"
              credits="—"
              pricePerCredit="—"
              total="—"
              description="Pentru utilizare regulată"
              recommended
              discount="10%"
            />
            <CreditPackCard
              name="Pachet Enterprise"
              credits="—"
              pricePerCredit="—"
              total="—"
              description="Pentru organizații cu volum mare"
              discount="20%"
            />
          </div>

          <div className="mt-10 max-w-lg mx-auto text-xs text-slate-400 space-y-2 leading-relaxed text-center">
            <p>Creditele nu expiră. Se pot achiziționa oricând pachete suplimentare.</p>
            <p className="text-slate-500 font-medium">Prețurile per credit vor fi publicate în curând.</p>
          </div>
        </div>
      </section>

      {/* ══════════ CE COSTĂ FIECARE SERVICIU ══════════ */}
      <section id="servicii" className="py-24">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-base font-bold uppercase tracking-widest text-slate-400 mb-4">
            Cât costă fiecare serviciu
          </h2>
          <p className="text-center text-slate-500 text-sm mb-14 max-w-xl mx-auto">
            Fiecare serviciu are un cost exprimat în credite. Costul depinde de volumul de date procesate.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-3 px-4 text-slate-500 font-medium border-b border-slate-200">Serviciu</th>
                  <th className="text-center py-3 px-4 text-slate-500 font-medium border-b border-slate-200">Unitate</th>
                  <th className="text-center py-3 px-4 text-slate-500 font-medium border-b border-slate-200">Cost (credite)</th>
                </tr>
              </thead>
              <tbody className="text-xs text-slate-600">
                <ServiceRow service="Evaluarea posturilor" unit="per poziție" credits="—" active />
                <ServiceRow service="Structuri salariale + benchmark" unit="per proiect" credits="—" active />
                <ServiceRow service="Analiza decalajului salarial" unit="per angajat" credits="—" active />
                <ServiceRow service="Evaluarea comună (Art. 10)" unit="per proiect" credits="—" active />
                <ServiceRow service="Consultanță AI (peste 1h inclusă)" unit="per sesiune" credits="—" active />
                <ServiceRow service="Sesiune psiholog acreditat" unit="per oră" credits="—" active />
                <ServiceRow service="Evaluarea personalului" unit="per angajat" credits="—" />
                <ServiceRow service="Diagnoză organizațională" unit="per proiect" credits="—" />
                <ServiceRow service="Managementul structurilor om-AI" unit="per proiect" credits="—" />
                <ServiceRow service="Procese interne + Manual calitate" unit="per proiect" credits="—" />
                <ServiceRow service="Cultură organizațională" unit="per proiect" credits="—" />
              </tbody>
            </table>
          </div>

          <div className="mt-8 text-center text-xs text-slate-400">
            <p>Serviciile fără cost specificat sunt în pregătire. Costurile vor fi publicate la activare.</p>
          </div>
        </div>
      </section>

      {/* ══════════ FAQ ══════════ */}
      <section className="bg-slate-50 py-20">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-10">
            Întrebări frecvente
          </h2>
          <div className="space-y-6">
            <FaqItem
              q="Cum funcționează creditele?"
              a="Creditele sunt moneda platformei. Cumperi un pachet de credite și le folosești pentru orice serviciu: evaluare posturi, analiză salarială, consultanță AI. Cu cât cumperi mai multe, cu atât prețul per credit scade."
            />
            <FaqItem
              q="Creditele expiră?"
              a="Nu. Creditele rămân în cont cât timp abonamentul este activ."
            />
            <FaqItem
              q="Ce se întâmplă dacă rămân fără credite?"
              a="Poți achiziționa oricând un pachet suplimentar. Serviciile nu se opresc, doar nu poți lansa altele noi până nu ai credite disponibile."
            />
            <FaqItem
              q="De ce un singur abonament?"
              a="Pentru simplitate. Nu vrem să te gândești la ce plan ți se potrivește. Toți clienții au acces la aceleași funcționalități. Diferența o faci prin ce servicii folosești și cât de des."
            />
            <FaqItem
              q="Pot plăti anual?"
              a="Da. Plata anuală vine cu un discount de 20% față de plata lunară."
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
            Simplu. Un abonament. Toate serviciile.
          </h2>
          <p className="text-slate-400 mb-8">
            Înregistrarea e gratuită. Alegi abonamentul, semnezi contractul, plătești și ești gata.
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


function CreditPackCard({
  name, credits, pricePerCredit, total, description, recommended, discount,
}: {
  name: string; credits: string; pricePerCredit: string; total: string
  description: string; recommended?: boolean; discount?: string
}) {
  return (
    <div className={`rounded-2xl p-6 border-2 ${
      recommended ? "border-indigo-500 shadow-xl shadow-indigo-100 relative" : "border-slate-200"
    }`}>
      {recommended && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full z-10">
          Cel mai popular
        </span>
      )}
      <div className="pt-2">
        <h3 className="text-lg font-bold text-slate-900">{name}</h3>
        <p className="text-xs text-slate-400 mt-1">{description}</p>
      </div>
      <div className="mt-5 mb-2">
        <span className="text-3xl font-extrabold text-slate-900">{credits}</span>
        <span className="text-sm text-slate-500"> credite</span>
      </div>
      <div className="mb-6 space-y-1">
        <p className="text-xs text-slate-500">{pricePerCredit} RON/credit</p>
        <p className="text-sm font-semibold text-slate-700">{total} RON total</p>
        {discount && (
          <p className="text-xs text-emerald-600 font-medium">Discount {discount} față de prețul standard</p>
        )}
      </div>
      <Link href="/register" className={`block text-center py-3 rounded-lg font-semibold text-sm transition-colors ${
        recommended
          ? "bg-[#E85D43] text-white hover:bg-[#d04e36]"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
      }`}>
        Solicită ofertă
      </Link>
    </div>
  )
}

function ServiceRow({ service, unit, credits, active }: { service: string; unit: string; credits: string; active?: boolean }) {
  return (
    <tr className={`border-b border-slate-100 ${!active ? "opacity-50" : ""}`}>
      <td className="py-3 px-4 text-slate-700 font-medium">
        {service}
        {!active && <span className="ml-2 text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full">în pregătire</span>}
      </td>
      <td className="py-3 px-4 text-center text-slate-500">{unit}</td>
      <td className="py-3 px-4 text-center font-semibold">{credits}</td>
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
