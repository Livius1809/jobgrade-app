import Image from "next/image"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen">

      {/* ═══════════════════════════════════════════════════════════
           ZONA 1 — HEADER NAVIGARE (sticky, glassmorphism on scroll)
         ═══════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 header-glass">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo + Wordmark */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/logo.svg"
              alt="JobGrade"
              width={36}
              height={36}
              className="transition-transform duration-500 group-hover:rotate-45"
            />
            <span className="text-lg font-semibold text-indigo-dark">JobGrade</span>
          </Link>

          {/* Navigare centrală — hidden on mobile */}
          <nav className="hidden md:flex items-center gap-8">
            <a href="#despre" className="text-sm font-medium text-text-warm hover:text-indigo transition-colors duration-200">Despre</a>
            <a href="#companii" className="text-sm font-medium text-text-warm hover:text-indigo transition-colors duration-200">Pentru companii</a>
            <a href="#pentru-tine" className="text-sm font-medium text-text-warm hover:text-indigo transition-colors duration-200">Pentru tine</a>
            <a href="#contact" className="text-sm font-medium text-text-warm hover:text-indigo transition-colors duration-200">Contact</a>
          </nav>

          {/* Buton Intră în cont */}
          <Link
            href="/login"
            className="hidden sm:inline-flex text-sm font-medium text-indigo border border-indigo/20 rounded-lg px-5 py-2 hover:bg-indigo/5 hover:border-indigo/40 transition-all duration-200"
          >
            Intră în cont
          </Link>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════
           ZONA 2 — HERO / PRIMA RESPIRAȚIE (90vh)
         ═══════════════════════════════════════════════════════════ */}
      <section
        className="relative flex items-center justify-center min-h-[90vh] px-6 overflow-hidden"
        style={{ background: "linear-gradient(180deg, var(--hero-bg-top) 0%, var(--hero-bg-bottom) 100%)" }}
      >
        <div className="max-w-[56rem] mx-auto flex flex-col items-center text-center py-16">

          {/* Ilustrația Constelație — deasupra textului, centrată */}
          <div
            className="mb-10 w-full flex justify-center"
            style={{ animation: "fadeInUp 0.6s ease-out both" }}
          >
            <svg
              viewBox="0 0 600 500"
              className="w-full max-w-[360px] h-auto"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="coralToIndigo" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--coral)" />
                  <stop offset="100%" stopColor="var(--indigo)" />
                </linearGradient>
                <linearGradient id="indigoToCoral" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--indigo)" />
                  <stop offset="100%" stopColor="var(--coral)" />
                </linearGradient>
                <linearGradient id="coralFade" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--coral)" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="var(--coral)" stopOpacity="0.15" />
                </linearGradient>
                <linearGradient id="indigoFade" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="var(--indigo)" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="var(--indigo)" stopOpacity="0.15" />
                </linearGradient>
              </defs>

              {/* Connection lines (curved) */}
              <path d="M 180 140 Q 250 100 320 160" stroke="url(#coralToIndigo)" strokeWidth="1.5" fill="none" opacity="0.3" />
              <path d="M 320 160 Q 400 200 420 300" stroke="url(#coralToIndigo)" strokeWidth="1.5" fill="none" opacity="0.25" />
              <path d="M 180 140 Q 150 220 200 310" stroke="url(#indigoToCoral)" strokeWidth="1.5" fill="none" opacity="0.3" />
              <path d="M 200 310 Q 280 350 380 320" stroke="url(#coralToIndigo)" strokeWidth="1.2" fill="none" opacity="0.2" />
              <path d="M 320 160 Q 280 240 200 310" stroke="url(#indigoToCoral)" strokeWidth="1" fill="none" opacity="0.2" />
              <path d="M 420 300 Q 440 370 380 420" stroke="url(#coralToIndigo)" strokeWidth="1.2" fill="none" opacity="0.2" />
              <path d="M 120 260 Q 160 290 200 310" stroke="url(#indigoToCoral)" strokeWidth="1" fill="none" opacity="0.2" />
              <path d="M 480 180 Q 450 230 420 300" stroke="url(#coralToIndigo)" strokeWidth="1" fill="none" opacity="0.15" />
              <path d="M 260 400 Q 320 430 380 420" stroke="url(#indigoToCoral)" strokeWidth="1" fill="none" opacity="0.2" />
              <path d="M 200 310 Q 230 370 260 400" stroke="url(#coralToIndigo)" strokeWidth="1" fill="none" opacity="0.2" />

              {/* Constellation nodes — varying sizes, breathing animation */}
              {/* Node 1 — large, coral */}
              <circle cx="180" cy="140" r="22" fill="url(#coralFade)" className="node-breathe" style={{ "--duration": "5s", "--delay": "0s" } as React.CSSProperties} />
              <circle cx="180" cy="140" r="14" fill="var(--coral)" opacity="0.4" />

              {/* Node 2 — large, indigo */}
              <circle cx="320" cy="160" r="24" fill="url(#indigoFade)" className="node-breathe" style={{ "--duration": "6s", "--delay": "0.8s" } as React.CSSProperties} />
              <circle cx="320" cy="160" r="16" fill="var(--indigo)" opacity="0.35" />

              {/* Node 3 — medium, coral-indigo */}
              <circle cx="200" cy="310" r="20" fill="url(#coralToIndigo)" opacity="0.3" className="node-breathe" style={{ "--duration": "5.5s", "--delay": "1.2s" } as React.CSSProperties} />
              <circle cx="200" cy="310" r="12" fill="var(--coral)" opacity="0.3" />

              {/* Node 4 — large, indigo */}
              <circle cx="420" cy="300" r="18" fill="url(#indigoFade)" className="node-breathe" style={{ "--duration": "4.5s", "--delay": "0.4s" } as React.CSSProperties} />
              <circle cx="420" cy="300" r="10" fill="var(--indigo)" opacity="0.4" />

              {/* Node 5 — small */}
              <circle cx="120" cy="260" r="10" fill="var(--coral)" opacity="0.25" className="node-breathe" style={{ "--duration": "5s", "--delay": "2s" } as React.CSSProperties} />

              {/* Node 6 — medium */}
              <circle cx="480" cy="180" r="12" fill="var(--indigo)" opacity="0.2" className="node-breathe" style={{ "--duration": "6.5s", "--delay": "1.5s" } as React.CSSProperties} />

              {/* Node 7 — small */}
              <circle cx="380" cy="420" r="14" fill="url(#coralFade)" className="node-breathe" style={{ "--duration": "5.2s", "--delay": "0.6s" } as React.CSSProperties} />
              <circle cx="380" cy="420" r="8" fill="var(--coral)" opacity="0.3" />

              {/* Node 8 — small accent */}
              <circle cx="260" cy="400" r="9" fill="var(--indigo)" opacity="0.2" className="node-breathe" style={{ "--duration": "4.8s", "--delay": "1.8s" } as React.CSSProperties} />

              {/* Node 9 — tiny */}
              <circle cx="380" cy="320" r="8" fill="var(--coral)" opacity="0.15" className="node-breathe" style={{ "--duration": "5.8s", "--delay": "2.2s" } as React.CSSProperties} />

              {/* Node 10 — medium */}
              <circle cx="280" cy="240" r="16" fill="url(#indigoToCoral)" opacity="0.15" className="node-breathe" style={{ "--duration": "5.4s", "--delay": "1s" } as React.CSSProperties} />

              {/* Node 11 — tiny accent */}
              <circle cx="520" cy="250" r="6" fill="var(--coral)" opacity="0.15" className="node-breathe" style={{ "--duration": "4s", "--delay": "2.5s" } as React.CSSProperties} />

              {/* Node 12 — tiny */}
              <circle cx="150" cy="380" r="7" fill="var(--indigo)" opacity="0.12" className="node-breathe" style={{ "--duration": "5.6s", "--delay": "0.3s" } as React.CSSProperties} />
            </svg>
          </div>

          {/* Text centrat sub ilustrație */}
          <div style={{ animation: "fadeInUp 0.8s ease-out 0.3s both" }}>
            {/* Pre-heading */}
            <p className="text-base font-normal text-coral mb-4 tracking-wide">
              Evaluăm posturi. Construim echitate.
            </p>

            {/* Heading principal */}
            <h1 className="text-3xl md:text-4xl lg:text-[48px] font-semibold leading-[1.1] tracking-[-0.02em] text-indigo-dark mb-6">
              Fiecare post merită
              <br />
              o evaluare corectă.
            </h1>

            {/* Paragraf filozofic */}
            <p className="text-lg md:text-xl font-normal leading-relaxed text-text-warm max-w-xl mx-auto mb-8">
              Un instrument de evaluare a posturilor, construit pentru realitățile de aici. Ajută companiile să construiască grile salariale coerente — nu din obligație, ci din convingerea că echitatea ține oamenii aproape.
            </p>

            {/* Butoane centrate */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-3">
              <Link
                href="/register"
                className="btn-coral inline-flex items-center justify-center bg-coral text-white font-semibold text-base px-8 py-4 rounded-[10px] focus:outline-2 focus:outline-indigo focus:outline-offset-2 w-full sm:w-auto"
              >
                Începe evaluarea
              </Link>

              <span className="btn-indigo-outline relative inline-flex items-center justify-center border-2 border-indigo text-indigo font-semibold text-base px-8 py-4 rounded-[10px] opacity-60 cursor-not-allowed w-full sm:w-auto">
                Descoperă-ți profilul
                <span className="absolute -top-2.5 -right-2 bg-white border border-coral/30 text-coral text-[10px] font-semibold uppercase tracking-[1px] px-2 py-0.5 rounded">
                  În curând
                </span>
              </span>
            </div>

            {/* Micro-text */}
            <p className="text-[13px] text-text-micro leading-snug">
              Fără card. Fără obligații.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
           ZONA 3 — PUNTE DE CURIOZITATE
         ═══════════════════════════════════════════════════════════ */}
      <section
        className="py-20 px-6"
        style={{ background: "var(--warm-bg)" }}
      >
        <p className="text-2xl font-normal text-indigo-dark text-center max-w-3xl mx-auto leading-relaxed scroll-fade-in">
          Cele mai multe companii plătesc pe simț. Noi propunem o alternativă.
        </p>
      </section>

      {/* ═══════════════════════════════════════════════════════════
           ZONA 4 — CELE DOUĂ DRUMURI (B2B + B2C)
         ═══════════════════════════════════════════════════════════ */}
      <section id="companii" className="py-20 lg:py-28 px-6">
        <div className="max-w-[56rem] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* ── Card B2B ─────────────────────────────────────────── */}
          <div className="card-hover bg-white rounded-2xl border border-indigo/[0.08] p-8 flex flex-col">
            {/* Ilustrație — Geometric hierarchy blocks */}
            <div className="w-full h-[200px] flex items-center justify-center mb-6 rounded-xl bg-gradient-to-br from-indigo/[0.03] to-indigo/[0.07]">
              <svg viewBox="0 0 400 180" className="w-full max-w-[320px] h-auto" aria-hidden="true">
                {/* Ascending blocks — hierarchy/structure */}
                <rect x="40" y="130" width="70" height="36" rx="6" fill="var(--indigo)" opacity="0.15" />
                <rect x="130" y="100" width="70" height="66" rx="6" fill="var(--indigo)" opacity="0.25" />
                <rect x="220" y="70" width="70" height="96" rx="6" fill="var(--indigo)" opacity="0.4" />
                <rect x="310" y="36" width="70" height="130" rx="6" fill="var(--indigo)" opacity="0.55" />
                {/* Connecting line across tops */}
                <path d="M 75 130 Q 165 80 255 70 Q 335 40 345 36" stroke="var(--coral)" strokeWidth="2" fill="none" opacity="0.5" strokeDasharray="4 4" />
                {/* Accent dots on top of blocks */}
                <circle cx="75" cy="130" r="4" fill="var(--coral)" opacity="0.7" />
                <circle cx="165" cy="100" r="4" fill="var(--coral)" opacity="0.7" />
                <circle cx="255" cy="70" r="5" fill="var(--coral)" opacity="0.8" />
                <circle cx="345" cy="36" r="5" fill="var(--coral)" opacity="0.9" />
              </svg>
            </div>

            {/* Text */}
            <h3 className="text-2xl md:text-[28px] font-semibold text-indigo-dark mb-4">Pentru companii</h3>
            <p className="text-base leading-relaxed text-text-warm mb-8 flex-1">
              Evaluezi posturile sistematic. Construiești o grilă salarială coerentă. Demonstrezi conformitatea cu Directiva UE 2023/970. Totul într-un singur loc, cu suport AI la fiecare pas.
            </p>

            {/* CTA */}
            <Link
              href="/login"
              className="btn-indigo-solid block w-full text-center bg-indigo text-white font-semibold text-base py-3.5 rounded-[10px] focus:outline-2 focus:outline-coral focus:outline-offset-2"
            >
              Intră în platformă
            </Link>
          </div>

          {/* ── Card B2C ─────────────────────────────────────────── */}
          <div id="pentru-tine" className="card-hover bg-white rounded-2xl border border-indigo/[0.08] p-8 flex flex-col">
            {/* Ilustrație — Spiral with branches */}
            <div className="w-full h-[200px] flex items-center justify-center mb-6 rounded-xl bg-gradient-to-br from-coral/[0.03] to-coral/[0.07]">
              <svg viewBox="0 0 400 180" className="w-full max-w-[320px] h-auto" aria-hidden="true">
                {/* Spiral path */}
                <path
                  d="M 200 140 C 200 140 240 140 250 120 C 260 100 230 85 210 90 C 190 95 185 115 200 120 C 215 125 230 110 225 95 C 220 80 200 75 190 85 C 180 95 190 110 200 110"
                  stroke="var(--coral)"
                  strokeWidth="2.5"
                  fill="none"
                  opacity="0.6"
                />
                {/* Branches growing from spiral */}
                <path d="M 250 120 Q 290 100 310 80" stroke="var(--coral)" strokeWidth="1.5" fill="none" opacity="0.3" />
                <circle cx="310" cy="80" r="5" fill="var(--coral)" opacity="0.4" />
                <path d="M 225 95 Q 260 70 280 50" stroke="var(--indigo)" strokeWidth="1.5" fill="none" opacity="0.3" />
                <circle cx="280" cy="50" r="4" fill="var(--indigo)" opacity="0.35" />
                <path d="M 210 90 Q 170 65 140 55" stroke="var(--coral)" strokeWidth="1.5" fill="none" opacity="0.25" />
                <circle cx="140" cy="55" r="5" fill="var(--coral)" opacity="0.3" />
                <path d="M 190 85 Q 155 80 130 90" stroke="var(--indigo)" strokeWidth="1.2" fill="none" opacity="0.2" />
                <circle cx="130" cy="90" r="3.5" fill="var(--indigo)" opacity="0.3" />
                <path d="M 200 140 Q 180 155 150 150" stroke="var(--coral)" strokeWidth="1.2" fill="none" opacity="0.2" />
                <circle cx="150" cy="150" r="4" fill="var(--coral)" opacity="0.25" />
                {/* Accent dots along spiral */}
                <circle cx="200" cy="110" r="3" fill="var(--coral)" opacity="0.5" />
                <circle cx="200" cy="140" r="4" fill="var(--coral)" opacity="0.5" />
                {/* Additional small branches */}
                <path d="M 240 140 Q 270 145 290 135" stroke="var(--coral)" strokeWidth="1" fill="none" opacity="0.2" />
                <circle cx="290" cy="135" r="3" fill="var(--indigo)" opacity="0.25" />
              </svg>
            </div>

            {/* Text */}
            <h3 className="text-2xl md:text-[28px] font-semibold text-indigo-dark mb-4">Pentru tine</h3>
            <p className="text-base leading-relaxed text-text-warm mb-8 flex-1">
              Explorează-ți punctele forte. Descoperă ce rol ți se potrivește. Construiește-ți un profil profesional pe care să-l înțelegi cu adevărat — nu doar un CV, ci o hartă a ta.
            </p>

            {/* CTA — disabled */}
            <span className="btn-indigo-outline relative block w-full text-center border-2 border-indigo text-indigo font-semibold text-base py-3.5 rounded-[10px] opacity-60 cursor-not-allowed">
              Explorează (în curând)
              <span className="absolute -top-2.5 right-4 bg-white border border-coral/30 text-coral text-[10px] font-semibold uppercase tracking-[1px] px-2 py-0.5 rounded">
                În curând
              </span>
            </span>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
           ZONA 5 — SOCIAL PROOF (format conversațional)
         ═══════════════════════════════════════════════════════════ */}
      <section
        className="py-20 lg:py-28 px-6"
        style={{ background: "var(--warm-bg)" }}
      >
        <div className="max-w-[48rem] mx-auto">
          <h2 className="text-3xl md:text-4xl font-semibold text-indigo-dark mb-16 text-center scroll-fade-in">
            Întrebări pe care le auzim des
          </h2>

          {/* Q&A 1 */}
          <div className="mb-12 scroll-fade-in">
            <p className="text-lg font-medium text-indigo-dark mb-3 leading-relaxed">
              „De ce aș avea nevoie de asta? Am funcționat bine și fără."
            </p>
            <p className="text-base leading-relaxed text-text-warm pl-4 border-l-2 border-coral/30">
              Poate că da. Dar vine un moment în care un coleg bun pleacă, și nu înțelegi de ce. De multe ori, răspunsul e în grila salarială.
            </p>
          </div>

          {/* Q&A 2 */}
          <div className="mb-12 scroll-fade-in">
            <p className="text-lg font-medium text-indigo-dark mb-3 leading-relaxed">
              „E complicat? N-am echipă de HR structurată."
            </p>
            <p className="text-base leading-relaxed text-text-warm pl-4 border-l-2 border-coral/30">
              Instrumentul e construit tocmai pentru companiile care nu au departament de HR dedicat. Interfața te ghidează pas cu pas.
            </p>
          </div>

          {/* Q&A 3 */}
          <div className="mb-12 scroll-fade-in">
            <p className="text-lg font-medium text-indigo-dark mb-3 leading-relaxed">
              „Asta e doar pentru Directiva UE?"
            </p>
            <p className="text-base leading-relaxed text-text-warm pl-4 border-l-2 border-coral/30">
              Directiva e un context. Dar evaluarea posturilor e utilă indiferent de legislație — ajută la retenție, la decizii corecte, la claritate internă.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
           ZONA 6 — FOOTER
         ═══════════════════════════════════════════════════════════ */}
      <footer id="contact" className="bg-indigo-dark text-white">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">

            {/* Col 1 — Logo + Tagline */}
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <Image
                  src="/logo.svg"
                  alt="JobGrade"
                  width={28}
                  height={28}
                  className="brightness-0 invert"
                />
                <span className="text-lg font-semibold">JobGrade</span>
              </div>
              <p className="text-sm text-white/60 leading-relaxed mb-4">
                Evaluăm posturi. Construim echitate.
              </p>
              <p className="text-xs text-white/40">
                &copy; 2026 Psihobusiness Consulting SRL
              </p>
            </div>

            {/* Col 2 — Platformă */}
            <div>
              <h4 className="text-sm font-semibold mb-4 text-white/80">Platformă</h4>
              <ul className="space-y-2.5">
                <li><a href="#despre" className="text-sm text-white/50 hover:text-white transition-colors duration-200">Despre</a></li>
                <li><a href="#" className="text-sm text-white/50 hover:text-white transition-colors duration-200">Prețuri</a></li>
                <li><a href="#contact" className="text-sm text-white/50 hover:text-white transition-colors duration-200">Contact</a></li>
                <li><a href="#" className="text-sm text-white/50 hover:text-white transition-colors duration-200">FAQ</a></li>
              </ul>
            </div>

            {/* Col 3 — Legal */}
            <div>
              <h4 className="text-sm font-semibold mb-4 text-white/80">Legal</h4>
              <ul className="space-y-2.5">
                <li><a href="#" className="text-sm text-white/50 hover:text-white transition-colors duration-200">Termeni și condiții</a></li>
                <li><a href="#" className="text-sm text-white/50 hover:text-white transition-colors duration-200">Confidențialitate</a></li>
                <li><a href="#" className="text-sm text-white/50 hover:text-white transition-colors duration-200">Cookies</a></li>
                <li><a href="#" className="text-sm text-white/50 hover:text-white transition-colors duration-200">GDPR</a></li>
              </ul>
            </div>

            {/* Col 4 — Contact */}
            <div>
              <h4 className="text-sm font-semibold mb-4 text-white/80">Contact</h4>
              <ul className="space-y-2.5">
                <li>
                  <a href="mailto:contact@jobgrade.ro" className="text-sm text-white/50 hover:text-white transition-colors duration-200">
                    contact@jobgrade.ro
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Linie separatoare + compliance */}
          <div className="mt-12 pt-6 border-t border-white/10">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-white/30">
                CIF: RO15790994
              </p>
              <div className="flex items-center gap-4">
                <span className="text-xs text-white/30 border border-white/10 px-2.5 py-1 rounded">GDPR</span>
                <span className="text-xs text-white/30 border border-white/10 px-2.5 py-1 rounded">AI Act UE</span>
                <span className="text-xs text-white/30 border border-white/10 px-2.5 py-1 rounded">Directiva 2023/970</span>
              </div>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
