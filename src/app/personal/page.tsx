import Image from "next/image"
import Link from "next/link"

export default function PersonalPage() {
  return (
    <div className="min-h-screen flex flex-col text-foreground">

      {/* ── Background ──────────────────────────────────────────── */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo/5 via-background to-coral/3" />
        <div className="absolute top-[-15%] left-[50%] -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-indigo/6 blur-[160px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-coral/6 blur-[120px]" />
      </div>

      {/* ═══════════════════════════════════════════════════════════
           HEADER
         ═══════════════════════════════════════════════════════════ */}
      <header className="relative z-50 flex items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image
            src="/logo.svg"
            alt="JobGrade"
            width={32}
            height={32}
            className="transition-transform duration-500 group-hover:rotate-45"
          />
          <span className="text-lg font-semibold text-foreground">JobGrade</span>
        </Link>
        <Link
          href="/"
          className="text-sm text-text-secondary hover:text-indigo transition-colors duration-300"
        >
          &larr; Pagina principală
        </Link>
      </header>

      {/* ═══════════════════════════════════════════════════════════
           HERO — 60vh, centrat, contemplativ
         ═══════════════════════════════════════════════════════════ */}
      <section className="flex flex-col items-center justify-center px-6 py-16 md:py-24 min-h-[60vh]">

        {/* Spirala mare cu glow */}
        <div className="relative mb-10">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-60 h-60 rounded-full bg-gradient-to-br from-indigo/10 to-coral/8 blur-3xl animate-pulse" />
          </div>
          <Image
            src="/favicon.svg"
            alt="Spirala JobGrade"
            width={140}
            height={140}
            className="relative z-10 drop-shadow-xl"
          />
        </div>

        {/* Heading */}
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-center mb-6 text-foreground animate-[fadeIn_1.5s_ease-out]">
          Un drum care începe{" "}
          <span className="bg-gradient-to-r from-indigo via-indigo to-coral bg-clip-text text-transparent">
            cu tine.
          </span>
        </h1>

        {/* Subheading */}
        <p className="max-w-xl text-center text-base md:text-lg text-text-secondary leading-relaxed mb-6 animate-[fadeIn_2s_ease-out]">
          Construim un spațiu dedicat dezvoltării tale profesionale — unde să-ți
          descoperi punctele forte, să-ți înțelegi profilul și să crești autentic.
        </p>

        {/* Linia gradient */}
        <div className="w-12 h-0.5 rounded-full bg-gradient-to-r from-indigo to-coral mb-6 animate-[fadeIn_2.5s_ease-out]" />

        {/* Slogan */}
        <p className="text-base md:text-lg italic text-indigo/60 tracking-wide text-center animate-[fadeIn_3s_ease-out]">
          Începe cu CINE alegi să fii...
        </p>
      </section>

      {/* ═══════════════════════════════════════════════════════════
           PREVIEW CARDS — Ce pregătim
         ═══════════════════════════════════════════════════════════ */}
      <section className="px-6 py-16 md:py-20">
        <h2 className="text-xl md:text-2xl font-semibold text-center text-foreground mb-4">
          Ce pregătim pentru tine
        </h2>
        <p className="text-sm text-text-secondary/60 text-center mb-12">
          Trei direcții. Un singur scop: să crești pe drumul tău.
        </p>

        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Card 1 — Profil */}
          <div className="relative group rounded-2xl border border-indigo/15 bg-gradient-to-br from-indigo/5 to-indigo/2 p-8 text-center opacity-50 transition-all duration-500 hover:opacity-70">
            <div className="absolute top-4 right-4">
              <svg className="w-4 h-4 text-indigo/30" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <div className="w-20 h-20 mx-auto mb-5">
              <Image src="/b2c-profile.svg" alt="Profil" width={80} height={80} className="opacity-60" />
            </div>
            <h3 className="text-lg font-semibold text-foreground/60 mb-2">
              Profilul tău profesional
            </h3>
            <p className="text-sm text-text-secondary/50 leading-relaxed">
              Descoperă-ți punctele forte și stilul natural de lucru.
            </p>
          </div>

          {/* Card 2 — Traiectorie */}
          <div className="relative group rounded-2xl border border-indigo/15 bg-gradient-to-br from-indigo/5 to-indigo/2 p-8 text-center opacity-50 transition-all duration-500 hover:opacity-70">
            <div className="absolute top-4 right-4">
              <svg className="w-4 h-4 text-indigo/30" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <div className="w-20 h-20 mx-auto mb-5">
              <Image src="/b2c-career.svg" alt="Traiectorie" width={80} height={80} className="opacity-60" />
            </div>
            <h3 className="text-lg font-semibold text-foreground/60 mb-2">
              Traiectoria de carieră
            </h3>
            <p className="text-sm text-text-secondary/50 leading-relaxed">
              Găsește rolurile care ți se potrivesc cu adevărat.
            </p>
          </div>

          {/* Card 3 — Dezvoltare */}
          <div className="relative group rounded-2xl border border-indigo/15 bg-gradient-to-br from-indigo/5 to-indigo/2 p-8 text-center opacity-50 transition-all duration-500 hover:opacity-70">
            <div className="absolute top-4 right-4">
              <svg className="w-4 h-4 text-indigo/30" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
            <div className="w-20 h-20 mx-auto mb-5">
              <Image src="/b2c-growth.svg" alt="Dezvoltare" width={80} height={80} className="opacity-60" />
            </div>
            <h3 className="text-lg font-semibold text-foreground/60 mb-2">
              Dezvoltare personală
            </h3>
            <p className="text-sm text-text-secondary/50 leading-relaxed">
              Parcursuri de creștere ghidate, la ritmul tău.
            </p>
          </div>

        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
           EMAIL SIGNUP — Lista de așteptare
         ═══════════════════════════════════════════════════════════ */}
      <section className="px-6 py-16 md:py-20">
        <div className="max-w-md mx-auto text-center">
          <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-3">
            Vrei să fii printre primii care explorează?
          </h2>
          <p className="text-sm text-text-secondary mb-8 leading-relaxed">
            Lasă-ne adresa de email și te anunțăm când portalul personal e gata.
          </p>

          {/* Form UI (no backend) */}
          <form
            action="#"
            onSubmit={undefined}
            className="flex flex-col sm:flex-row items-stretch gap-3 mb-4"
          >
            <input
              type="email"
              placeholder="adresa@email.ro"
              className="flex-1 px-4 py-3 rounded-xl border border-indigo/20 bg-surface/60 text-foreground placeholder:text-text-secondary/40 focus:outline-none focus:ring-2 focus:ring-indigo/30 focus:border-indigo/40 transition-all duration-300 text-sm"
              readOnly
            />
            <button
              type="button"
              className="px-6 py-3 rounded-xl bg-indigo text-white text-sm font-semibold hover:bg-indigo/90 transition-colors duration-300 shadow-sm hover:shadow-md whitespace-nowrap"
            >
              Anunță-mă
            </button>
          </form>

          <p className="text-xs text-text-secondary/40 italic">
            Fără spam. Te anunțăm când e gata — atât.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
           CLOSING
         ═══════════════════════════════════════════════════════════ */}
      <section className="px-6 py-12 text-center">
        <div className="w-8 h-0.5 rounded-full bg-gradient-to-r from-indigo to-coral mx-auto mb-6" />
        <p className="text-base text-text-secondary italic mb-6">
          Construim cu grijă, nu cu grabă.
        </p>
        <Link
          href="/"
          className="text-sm font-medium text-indigo hover:text-indigo/80 transition-colors duration-300"
        >
          &larr; Înapoi la pagina principală
        </Link>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="mt-auto bg-surface/50 backdrop-blur-sm border-t border-border/30 py-3 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-xs text-text-secondary/60">
            Un produs <span className="font-medium text-foreground/50">Psihobusiness Consulting SRL</span>
            {" · "}GDPR{" · "}AI Act UE{" · "}Directiva 2023/970
          </span>
          <p className="text-xs italic text-text-secondary/40">
            Începe cu CINE alegi să fii...
          </p>
        </div>
      </footer>

    </div>
  )
}
