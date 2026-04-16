import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Politica de cookies",
  description:
    "Ce cookie-uri folosește JobGrade, scopul fiecăruia și cum le puteți gestiona.",
}

const LAST_UPDATED = "16 aprilie 2026"

const COOKIES = [
  {
    name: "next-auth.session-token",
    type: "Esențial",
    purpose: "Menține sesiunea autentificată după login",
    duration: "30 de zile (sliding)",
    provider: "JobGrade (intern)",
  },
  {
    name: "next-auth.csrf-token",
    type: "Esențial",
    purpose: "Protecție împotriva atacurilor CSRF la formulare",
    duration: "Sesiune browser",
    provider: "JobGrade (intern)",
  },
  {
    name: "next-auth.callback-url",
    type: "Esențial",
    purpose: "Memorează unde ați vrut să mergeți înainte de login",
    duration: "Sesiune browser",
    provider: "JobGrade (intern)",
  },
] as const

const STORAGE = [
  {
    key: "jobgrade_consultant_intro_seen_v2",
    purpose: "Reține că ați văzut prima oară Consultantul HR",
    type: "localStorage",
  },
] as const

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image src="/logo.svg" alt="JobGrade" width={160} height={40} className="h-9 w-auto" />
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/" className="text-slate-600 hover:text-indigo-600">Acasă</Link>
            <Link href="/login" className="text-slate-600 hover:text-indigo-600">Intră în platformă</Link>
          </nav>
        </div>
      </header>

      <main className="px-6 py-10" style={{ maxWidth: "56rem", margin: "0 auto" }}>
        <div className="mb-12">
          <p className="text-xs text-text-micro uppercase tracking-wider mb-2">
            Conformă Directivei ePrivacy (2002/58/CE) și Legii nr. 506/2004
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold text-indigo-dark leading-tight mb-4">
            Politica de cookies
          </h1>
          <p className="text-lg text-text-warm leading-relaxed mb-3">
            Cum folosim cookie-uri pe jobgrade.ro și ce alegeri aveți.
            Pe scurt: doar cookie-uri esențiale, fără urmărire publicitară.
            Politica se aplică tuturor vizitatorilor — companii (B2B) și
            persoane fizice (B2C).
          </p>
          <p className="text-sm text-text-secondary">Ultima actualizare: {LAST_UPDATED}</p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 mb-10">
          <p className="text-sm font-semibold text-emerald-900 mb-2">Politica noastră în 3 puncte</p>
          <ul className="text-sm text-emerald-800 space-y-1.5">
            <li>✓ Folosim doar <strong>cookie-uri esențiale</strong> pentru funcționarea autentificării</li>
            <li>✓ <strong>Nu folosim</strong> Google Analytics, Facebook Pixel sau alte instrumente de tracking</li>
            <li>✓ <strong>Nu folosim</strong> cookie-uri de marketing terț sau publicitate comportamentală</li>
          </ul>
        </div>

        <h2 className="text-2xl md:text-3xl font-semibold text-indigo-dark mb-6">Ce sunt cookie-urile</h2>
        <p className="text-text-warm leading-relaxed mb-8">
          Cookie-urile sunt fișiere text mici stocate de browser pe
          dispozitivul dumneavoastră atunci când vizitați un site. Permit
          site-ului să recunoască browser-ul la următoarele vizite — de
          exemplu, ca să rămâneți autentificat.
        </p>

        <h2 className="text-2xl md:text-3xl font-semibold text-indigo-dark mb-6">Cookie-urile pe care le folosim</h2>
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm">
            <thead className="bg-warm-bg border-b border-border">
              <tr>
                <th className="text-left px-3 py-2 text-text-secondary font-medium">Nume</th>
                <th className="text-left px-3 py-2 text-text-secondary font-medium">Categorie</th>
                <th className="text-left px-3 py-2 text-text-secondary font-medium">Scop</th>
                <th className="text-left px-3 py-2 text-text-secondary font-medium">Durată</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {COOKIES.map((c) => (
                <tr key={c.name}>
                  <td className="px-3 py-2 font-mono text-xs text-indigo-dark">{c.name}</td>
                  <td className="px-3 py-2"><span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">{c.type}</span></td>
                  <td className="px-3 py-2 text-text-warm">{c.purpose}</td>
                  <td className="px-3 py-2 text-text-secondary">{c.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl md:text-3xl font-semibold text-indigo-dark mb-6">Stocare locală browser</h2>
        <p className="text-text-warm leading-relaxed mb-4">
          În plus față de cookie-uri, folosim <code className="text-xs bg-surface border border-border px-1.5 py-0.5 rounded">localStorage</code> pentru
          preferințe minore care îmbunătățesc experiența:
        </p>
        <div className="overflow-x-auto mb-8">
          <table className="w-full text-sm">
            <thead className="bg-warm-bg border-b border-border">
              <tr>
                <th className="text-left px-3 py-2 text-text-secondary font-medium">Cheie</th>
                <th className="text-left px-3 py-2 text-text-secondary font-medium">Tip</th>
                <th className="text-left px-3 py-2 text-text-secondary font-medium">Scop</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {STORAGE.map((s) => (
                <tr key={s.key}>
                  <td className="px-3 py-2 font-mono text-xs text-indigo-dark">{s.key}</td>
                  <td className="px-3 py-2 text-xs text-text-secondary">{s.type}</td>
                  <td className="px-3 py-2 text-text-warm">{s.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-2xl md:text-3xl font-semibold text-indigo-dark mb-6">Ce nu folosim</h2>
        <div className="rounded-xl border border-coral/20 bg-coral/5 p-5 mb-8">
          <ul className="text-sm text-text-warm space-y-2">
            <li>❌ Google Analytics, Plausible, Matomo sau alte instrumente de analiză</li>
            <li>❌ Facebook Pixel, LinkedIn Insight Tag, Twitter Pixel sau alte pixeli publicitari</li>
            <li>❌ Cookie-uri de retargeting, remarketing sau publicitate comportamentală</li>
            <li>❌ Fingerprinting de browser sau alte tehnici de identificare invizibilă</li>
          </ul>
          <p className="text-xs text-text-secondary italic mt-3">
            Pe scurt: nu avem nevoie de consimțământul dumneavoastră
            explicit pentru cookie-uri, fiindcă folosim doar cookie-uri
            strict necesare exceptate de Directiva ePrivacy.
          </p>
        </div>

        <h2 className="text-2xl md:text-3xl font-semibold text-indigo-dark mb-6">Cum gestionați cookie-urile</h2>
        <p className="text-text-warm leading-relaxed mb-4">
          Puteți șterge sau bloca cookie-urile din setările browser-ului:
        </p>
        <ul className="text-text-warm text-sm leading-relaxed space-y-2 mb-6 list-disc pl-6">
          <li><strong>Chrome:</strong> Setări → Confidențialitate și securitate → Cookie-uri</li>
          <li><strong>Firefox:</strong> Preferințe → Confidențialitate și securitate → Cookie-uri</li>
          <li><strong>Safari:</strong> Preferințe → Confidențialitate → Gestionează datele site-ului</li>
          <li><strong>Edge:</strong> Setări → Confidențialitate, căutare și servicii → Cookie-uri</li>
        </ul>
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 mb-8">
          <p className="text-sm text-amber-900">
            <strong>Atenție:</strong> dacă blocați cookie-urile esențiale,
            nu vă veți putea autentifica și platforma nu va funcționa
            corect.
          </p>
        </div>

        <h2 className="text-2xl md:text-3xl font-semibold text-indigo-dark mb-6">Modificări</h2>
        <p className="text-text-warm leading-relaxed mb-8">
          Această politică poate fi actualizată dacă adăugăm noi
          funcționalități. Versiunea curentă e mereu disponibilă la
          jobgrade.ro/cookies. La modificări semnificative, vă notificăm
          prin email.
        </p>

        <h2 className="text-2xl md:text-3xl font-semibold text-indigo-dark mb-6">Contact</h2>
        <p className="text-text-warm leading-relaxed mb-8">
          Pentru întrebări despre cookie-uri sau prelucrarea datelor:{" "}
          <a href="mailto:dpo@jobgrade.ro" className="text-indigo hover:underline">dpo@jobgrade.ro</a>
        </p>

        <div className="mt-16 pt-8 border-t border-border/50">
          <p className="text-xs text-text-micro leading-relaxed">
            Document redactat conform Directivei 2002/58/CE (ePrivacy) și
            Legii nr. 506/2004 privind prelucrarea datelor cu caracter
            personal și protecția vieții private în sectorul comunicațiilor
            electronice.
          </p>
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-400 py-12 mt-16">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-3">
          <p className="text-sm">&copy; 2026 Psihobusiness Consulting SRL &middot; CIF RO15790994</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs">
            <Link href="/termeni" className="hover:text-white transition-colors">Termeni și condiții</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Politica de confidențialitate</Link>
            <Link href="/transparenta-ai" className="hover:text-white transition-colors">Transparență AI</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
