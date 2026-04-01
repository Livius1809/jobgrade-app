import Image from "next/image"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen">

      {/* ═══════════════════════════════════════════════════════════
           ZONA 1 — HEADER NAVIGARE (sticky, glassmorphism on scroll)
         ═══════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 header-glass">
        <div className="px-6 h-16 flex items-center justify-between" style={{ maxWidth: "56rem", margin: "0 auto" }}>
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
            <Link href="/personal" className="text-sm font-medium text-text-warm hover:text-indigo transition-colors duration-200">Pentru tine</Link>
          </nav>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════
           ZONA 2 — HERO / PRIMA RESPIRAȚIE (90vh)
         ═══════════════════════════════════════════════════════════ */}
      <section
        className="relative flex items-center justify-center min-h-[90vh] px-6 overflow-hidden"
        style={{ background: "linear-gradient(180deg, var(--hero-bg-top) 0%, var(--hero-bg-bottom) 100%)" }}
      >
        <div className="flex flex-col items-center text-center py-16" style={{ maxWidth: "56rem", margin: "0 auto" }}>

          {/* Ilustrația Hero — Constelația rolurilor (Firefly) */}
          <div
            className="mb-10 w-full flex justify-center"
            style={{ animation: "fadeInUp 0.6s ease-out both" }}
          >
            <Image
              src="/hero-constellation.svg"
              alt="Constelația rolurilor — ilustrație JobGrade"
              width={420}
              height={420}
              className="w-full h-auto"
              style={{ maxWidth: "420px" }}
              priority
            />
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
            <p className="text-lg md:text-xl font-normal leading-relaxed text-text-warm mb-8" style={{ maxWidth: "36rem", margin: "0 auto" }}>
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
        <p className="text-2xl font-normal text-indigo-dark text-center leading-relaxed scroll-fade-in" style={{ maxWidth: "48rem", margin: "0 auto" }}>
          Cele mai multe companii plătesc pe simț. Noi propunem o alternativă.
        </p>
      </section>

      {/* ═══════════════════════════════════════════════════════════
           ZONA 4 — CELE DOUĂ DRUMURI (B2B + B2C)
         ═══════════════════════════════════════════════════════════ */}
      <section id="companii" className="py-20 lg:py-28 px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8" style={{ maxWidth: "56rem", margin: "0 auto" }}>

          {/* ── Card B2B ─────────────────────────────────────────── */}
          <div className="card-hover bg-white rounded-2xl border border-indigo/[0.08] p-8 flex flex-col">
            {/* Ilustrație B2B — Firefly generated */}
            <div className="w-full h-[200px] flex items-center justify-center mb-6 rounded-xl bg-gradient-to-br from-indigo/[0.03] to-indigo/[0.07]">
              <Image
                src="/card-b2b-structure.svg"
                alt="Structura care crește"
                width={320}
                height={180}
                className="w-full h-auto"
                style={{ maxWidth: "320px" }}
              />
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
            {/* Ilustrație B2C — Spirala logo */}
            <div className="w-full h-[200px] flex items-center justify-center mb-6 rounded-xl bg-gradient-to-br from-coral/[0.03] to-coral/[0.07]">
              <Image
                src="/favicon.svg"
                alt="Spirala descoperirii"
                width={140}
                height={140}
                className="opacity-80"
              />
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
        <div style={{ maxWidth: "48rem", margin: "0 auto" }}>
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
        <div className="px-6 py-16" style={{ maxWidth: "56rem", margin: "0 auto" }}>
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
