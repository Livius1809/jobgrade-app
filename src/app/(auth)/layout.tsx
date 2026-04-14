import Image from "next/image"
import Link from "next/link"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="flex items-center justify-between px-6 h-16" style={{ maxWidth: "56rem", margin: "0 auto" }}>
          <Link href="/">
            <Image src="/logo.svg" alt="JobGrade" width={160} height={40} className="h-9 w-auto" />
          </Link>
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors duration-200"
          >
            ← Pagina principală
          </Link>
        </div>
      </header>

      {/* ── Layout doi coloane: context + formular ───────────── */}
      <main className="flex items-center justify-center px-6 py-12" style={{ minHeight: "calc(100vh - 4rem)" }}>
        <div className="w-full grid md:grid-cols-2 gap-12 items-center" style={{ maxWidth: "56rem" }}>

          {/* Coloana stânga — context */}
          <div className="hidden md:block">
            <h1 className="text-2xl font-bold text-slate-900 mb-6 leading-tight">
              Portalul organizației tale
            </h1>
            <div className="space-y-5 text-sm text-slate-600 leading-relaxed">
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 text-sm font-bold">1</span>
                <div>
                  <p className="font-semibold text-slate-900">Evaluarea posturilor</p>
                  <p>Ierarhizează posturile pe criterii obiective. Comitet intern, asistență AI, rapoarte conforme cu Directiva EU 2023/970.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600 text-sm font-bold">2</span>
                <div>
                  <p className="font-semibold text-slate-900">Analiza decalajului salarial</p>
                  <p>Identifică diferențele, înțelege cauzele, primește plan de acțiune. Monitorizare continuă cu alertare.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-fuchsia-50 flex items-center justify-center text-fuchsia-600 text-sm font-bold">3</span>
                <div>
                  <p className="font-semibold text-slate-900">Evaluarea comună</p>
                  <p>Proces structurat angajator-angajați conform Art. 10. Dialog fundamentat pe date obiective.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 text-sm font-bold">+</span>
                <div>
                  <p className="font-semibold text-slate-900">Și altele, dacă îți dorești mai mult</p>
                  <p>Evaluarea personalului, structuri salariale, procese interne, cultură organizațională — disponibile progresiv.</p>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-100 space-y-3">
              <p className="text-sm font-semibold text-slate-900">Cum funcționează</p>
              <div className="text-xs text-slate-500 space-y-2">
                <p>✓ Semnăm un contract de prestări servicii</p>
                <p>✓ Alegi abonamentul și serviciile de care ai nevoie</p>
                <p>✓ Prima oră de consultanță cu un specialist HR este inclusă</p>
                <p>✓ Plata per serviciu sau abonament lunar, fără angajament minim</p>
              </div>
              <p className="text-xs text-slate-400 mt-4">
                Psihobusiness Consulting SRL &middot; CIF RO15790994
              </p>
              <p className="text-xs text-slate-400">
                Conform Directiva EU 2023/970 &middot; GDPR &middot; AI Act Art. 14
              </p>
            </div>
          </div>

          {/* Coloana dreapta — formular */}
          <div className="w-full" style={{ maxWidth: "24rem", margin: "0 auto" }}>
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
