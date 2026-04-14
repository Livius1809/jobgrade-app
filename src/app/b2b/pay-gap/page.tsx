import Image from "next/image"
import Link from "next/link"
import { ChatWidgetLoader } from "@/components/chat/ChatWidgetLoader"
import DemoForm from "../je/DemoForm"

export const metadata = {
  title: "Analiza decalajului salarial — JobGrade",
  description: "Analiză a decalajului salarial de gen, conformă cu Art. 9 din Directiva EU 2023/970. Hartă detaliată a echității salariale din organizația ta.",
}

export default function PayGapLanding() {
  return (
    <div className="min-h-screen bg-white">

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/logo.svg" alt="JobGrade" width={160} height={40} className="h-9 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#problema" className="text-slate-600 hover:text-violet-600">Problema</a>
            <a href="#solutia" className="text-slate-600 hover:text-violet-600">Soluția</a>
            <a href="#pricing" className="text-slate-600 hover:text-violet-600">Prețuri</a>
            <a href="#demo" className="bg-[#E85D43] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#d04e36] transition-colors">
              Programează demo
            </a>
          </nav>
        </div>
      </header>

      {/* ══════════ S1: HERO ══════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-indigo-50/30" />
        <div className="relative max-w-4xl mx-auto px-6 py-24 md:py-32 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 leading-tight tracking-tight">
            Știi dacă plătești echitabil?{" "}
            <span className="text-violet-600">Acum poți demonstra.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Analiza decalajului salarial transformă întrebarea &ldquo;Există inechitate la noi?&rdquo;
            în răspunsul &ldquo;Iată exact unde, cât este și de ce.&rdquo;
            Rapoarte conforme cu Art. 9 din Directiva EU 2023/970.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#demo" className="inline-flex items-center justify-center bg-[#E85D43] text-white px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-[#d04e36] transition-colors shadow-lg shadow-orange-200">
              Programează un demo gratuit
            </a>
            <a href="#pricing" className="inline-flex items-center justify-center border-2 border-violet-200 text-violet-700 px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-violet-50 transition-colors">
              Vezi prețurile
            </a>
          </div>
          <p className="mt-8 text-sm text-slate-400">
            Conform Art. 9 Directiva EU 2023/970 &middot; Echipă acreditată &middot; Monitorizare continuă
          </p>
        </div>
      </section>

      {/* ══════════ S2: PROBLEMA ══════════ */}
      <section id="problema" className="bg-slate-900 text-white py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-2">
            De ce contează acum
          </h2>
          <p className="text-center text-slate-500 text-sm mb-4">Trei realități pe care nu le poți ignora</p>
          <div className="grid md:grid-cols-3 gap-8 mt-14">
            <PainCard
              icon="📊"
              title="Raportare obligatorie din 2027"
              text="Companiile cu 250+ angajați trebuie să raporteze anual decalajul salarial de gen. Dacă depășește 5%, trebuie justificat sau corectat. Raportul va fi public."
            />
            <PainCard
              icon="🔍"
              title="Nu știi ce nu măsori"
              text="Majoritatea organizațiilor cred că sunt echitabile, dar nu au instrumentele să demonstreze. Sentimentul nu e dovadă. Datele sunt."
            />
            <PainCard
              icon="⚖️"
              title="Sarcina probei e inversată"
              text="Art. 20 din Directivă: angajatorul trebuie să demonstreze că nu discriminează. Fără metodologie obiectivă, orice decizie salarială devine vulnerabilă."
            />
          </div>
        </div>
      </section>

      {/* ══════════ S3: SOLUȚIA ══════════ */}
      <section id="solutia" className="py-24">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-base font-bold uppercase tracking-widest text-slate-400 mb-4">
            Cum funcționează
          </h2>
          <div className="grid md:grid-cols-3 gap-10 mt-14">
            <StepCard
              step="1"
              title="Introduci datele"
              text="Importați datele salariale existente: posturi, salarii, gen, experiență, performanță. Platforma procesează automat, luând în calcul variabilele relevante."
            />
            <StepCard
              step="2"
              title="Primești harta completă"
              text="Vezi decalajul per departament, per nivel ierarhic, per tip de rol. Înțelegi care diferențe sunt justificate prin factori obiectivi și care necesită corecție."
            />
            <StepCard
              step="3"
              title="Acționezi cu plan"
              text="Platforma generează automat planul de acțiune: ce salarii necesită ajustare, în ce ordine, cu ce impact bugetar. Plus documentația de conformitate gata pentru raportare."
              link="/media-books/pay-gap-analysis"
              linkLabel="Citește ghidul complet →"
            />
          </div>
        </div>
      </section>

      {/* ══════════ S4: CE NE DIFERENȚIAZĂ ══════════ */}
      <section className="bg-violet-50/50 py-20">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-sm font-bold uppercase tracking-widest text-slate-400 mb-12">
            Ce ne diferențiază
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <DiffCard icon="🗺️" title="Hartă, nu doar cifră" text="Nu primești un procent global. Primești analiza pe departamente, niveluri, roluri — vezi exact unde sunt inechitățile." />
            <DiffCard icon="📋" title="Plan de acțiune automat" text="Ce salarii necesită ajustare, când, cu ce impact bugetar. Nu doar diagnostic — ci și tratament." />
            <DiffCard icon="🔔" title="Monitorizare continuă" text="Platforma alertează automat când decizii salariale noi creează sau agravează inechități. Nu doar anual — continuu." />
            <DiffCard icon="📄" title="Conformitate completă" text="Raportul anual, justificările pentru diferențe peste 5%, planurile de corecție — generate automat, conforme cu Directiva EU." />
            <DiffCard icon="🔒" title="Confidențialitate garantată" text="Datele salariale sunt protejate prin criptare. Rapoartele agregate respectă anonimizarea (k-anonymity, minim 5 persoane per grup)." />
            <DiffCard icon="🧠" title="AI + personal acreditat" text="Personal acreditat CPR în psihologia muncii. AI-ul procesează date și identifică tipare, dar interpretarea rămâne umană." />
          </div>
        </div>
      </section>

      {/* ══════════ S5: PRICING ══════════ */}
      <section id="pricing" className="py-24">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-base font-bold uppercase tracking-widest text-slate-400 mb-4">
            Prețuri transparente
          </h2>
          <p className="text-center text-violet-600 font-semibold mt-4 mb-16">
            Tarifare per angajat analizat — plătiți doar pentru ce folosiți
          </p>

          <div className="grid md:grid-cols-3 gap-6 items-start">
            <PricingCard
              tier="Analiză"
              subtitle="Până la 200 angajați"
              price="—"
              unit="/angajat"
              features={[
                "Raport decalaj salarial pe gen",
                "Analiză per departament și nivel ierarhic",
                "Identificare diferențe justificate vs. nejustificate",
                "Documentație conformitate Art. 9",
                "Export pentru raportare",
              ]}
            />
            <PricingCard
              tier="Analiză + Plan"
              subtitle="200–500 angajați"
              price="—"
              unit="/angajat"
              recommended
              features={[
                "Tot din Analiză, plus:",
                "Plan de acțiune cu priorități și impact bugetar",
                "Simulare scenarii de corecție",
                "Monitorizare continuă cu alerte",
                "Suport prioritar",
              ]}
            />
            <PricingCard
              tier="Enterprise"
              subtitle="500+ angajați"
              price="—"
              unit="/angajat"
              features={[
                "Tot din Analiză + Plan, plus:",
                "Benchmark față de piață și industrie",
                "Raportare multi-entitate",
                "Responsabil de cont dedicat",
                "Integrare cu sisteme HR existente",
              ]}
            />
          </div>

          <div className="mt-10 max-w-lg mx-auto text-xs text-slate-400 space-y-2 leading-relaxed text-center">
            <p>Prețurile vor fi publicate în curând. Contactați-ne pentru o ofertă personalizată.</p>
          </div>
        </div>
      </section>

      {/* ══════════ S6: RESURSE ══════════ */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-center text-base font-bold uppercase tracking-widest text-slate-400 mb-4">
            Resurse
          </h2>
          <div className="grid md:grid-cols-2 gap-6 mt-14 max-w-2xl mx-auto">
            <ResourceCard
              icon="⚖️"
              title="Ghid: Analiza decalajului salarial"
              text="Tot ce trebuie să știi: context, proces, ce poți aștepta, cine suntem."
              href="/media-books/pay-gap-analysis"
            />
            <ResourceCard
              icon="🤝"
              title="Ghid: Evaluarea comună"
              text="Ce se întâmplă când decalajul depășește 5%. Procesul conform Art. 10."
              href="/media-books/joint-assessment"
            />
          </div>
        </div>
      </section>

      {/* ══════════ S7: CTA + FORMULAR DEMO ══════════ */}
      <section id="demo" className="py-20 bg-gradient-to-b from-white to-violet-50/30">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
            Află unde stai cu echitatea salarială
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
          <div className="flex justify-center gap-6 text-xs">
            <Link href="/privacy" className="hover:text-white">Politica de confidențialitate</Link>
            <Link href="/terms" className="hover:text-white">Termeni și condiții</Link>
            <Link href="/cookies" className="hover:text-white">Cookie-uri</Link>
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
      <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-600 font-bold text-xl flex items-center justify-center mx-auto mb-4">
        {step}
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed text-justify">{text}</p>
      {link && (
        <Link href={link} className="inline-block mt-3 text-xs text-violet-600 hover:text-violet-800 transition-colors">
          {linkLabel || "Află mai mult →"}
        </Link>
      )}
    </div>
  )
}

function ResourceCard({ icon, title, text, href }: { icon: string; title: string; text: string; href: string }) {
  return (
    <Link href={href} className="block rounded-xl border border-slate-200 bg-white p-6 hover:border-violet-300 hover:shadow-md transition-all group">
      <span className="text-2xl">{icon}</span>
      <h3 className="text-base font-bold text-slate-900 mt-3 mb-2 group-hover:text-violet-600 transition-colors">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed text-justify">{text}</p>
      <span className="inline-block mt-3 text-xs text-violet-600 group-hover:translate-x-1 transition-transform">Citește ghidul →</span>
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
      recommended ? "border-violet-500 shadow-xl shadow-violet-100 relative" : "border-slate-200"
    }`}>
      {recommended && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-bold px-3 py-1 rounded-full z-10">
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
            <span className="text-violet-500 mt-0.5 shrink-0">&#10003;</span>
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
