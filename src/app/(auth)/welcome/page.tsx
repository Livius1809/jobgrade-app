import Link from "next/link"

export const metadata = {
  title: "Bine ai venit — JobGrade",
}

export default function WelcomePage() {
  return (
    <div className="w-full" style={{ maxWidth: "32rem", margin: "0 auto" }}>
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Cont creat cu succes</h1>
        <p className="text-slate-500">Mai ai câțiva pași până la activarea completă a portalului.</p>
      </div>

      <div className="bg-slate-50 rounded-xl p-6 space-y-5">
        {/* Pas 1 — realizat */}
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Alegere abonament</p>
            <p className="text-xs text-emerald-600">Poți reveni oricând la <a href="/b2b/abonamente" className="underline">planurile disponibile</a></p>
          </div>
        </div>

        {/* Pas 2 — realizat */}
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Înregistrare</p>
            <p className="text-xs text-emerald-600">Realizat</p>
          </div>
        </div>

        {/* Pas 3 — de făcut */}
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 text-xs font-bold">3</span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Semnarea contractului</p>
            <div className="mt-3 space-y-2">
              <div className="flex items-start">
                <span className="text-xs font-bold text-amber-600 w-8 shrink-0">3.1</span>
                <a href="#" className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                  </svg>
                  Descarcă contractul standard (PDF)
                </a>
              </div>
              <div className="flex items-start">
                <span className="text-xs font-bold text-amber-600 w-8 shrink-0">3.2</span>
                <p className="text-xs text-slate-500">Trimite contractul semnat la <span className="text-slate-700 font-medium">contract@jobgrade.ro</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Pas 4 — blocat */}
        <div className="flex items-start gap-3 opacity-50">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">4</span>
          <div>
            <p className="text-sm font-semibold text-slate-400">Plata abonamentului</p>
            <p className="text-xs text-slate-400">Disponibil după semnarea contractului</p>
          </div>
        </div>

        {/* Pas 5 — blocat */}
        <div className="flex items-start gap-3 opacity-50">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">5</span>
          <div>
            <p className="text-sm font-semibold text-slate-400">Activare automată</p>
            <p className="text-xs text-slate-400">Portalul se activează imediat după confirmarea plății. Prima oră de consultanță cu un specialist HR este inclusă.</p>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center space-y-3">
        <p className="text-xs text-slate-400">
          Ai întrebări? Scrie-ne la <a href="mailto:contact@jobgrade.ro" className="text-indigo-600 hover:underline">contact@jobgrade.ro</a>
        </p>
        <Link href="/login" className="inline-block text-sm text-indigo-600 hover:underline font-medium">
          Intră în cont →
        </Link>
      </div>
    </div>
  )
}
