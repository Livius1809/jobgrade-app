import Image from "next/image"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="h-screen flex flex-col text-foreground overflow-hidden">

      {/* ── Background ──────────────────────────────────────────── */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-coral/5 via-background to-indigo/3" />
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-coral/8 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo/8 blur-[120px]" />
      </div>

      {/* ═══════════════════════════════════════════════════════════
           JUMĂTATEA SUPERIOARĂ — Filosofie + Spirală
         ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-6">

        {/* Logo + Nume — colț stânga sus, absolut */}
        <div className="absolute top-6 left-6 z-50">
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
        </div>

        {/* Contact — colț dreapta sus, absolut */}
        <div className="absolute top-7 right-6 z-50">
          <a
            href="mailto:contact@jobgrade.ro"
            className="text-sm text-text-secondary hover:text-coral transition-colors duration-300"
          >
            contact@jobgrade.ro
          </a>
        </div>

        {/* Spirala centrală cu glow */}
        <div className="relative mb-8">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-coral/12 to-indigo/12 blur-2xl animate-pulse" />
          </div>
          <Image
            src="/favicon.svg"
            alt="Spirala JobGrade"
            width={64}
            height={64}
            className="relative z-10 drop-shadow-lg"
          />
        </div>

        {/* Sloganul */}
        <p className="text-base md:text-lg italic text-text-secondary mb-6 tracking-wide text-center animate-[fadeIn_1.5s_ease-out]">
          Începe cu CINE alegi să fii... Evoluăm împreună!
        </p>

        {/* Headline */}
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold leading-tight text-center mb-5 text-foreground animate-[fadeIn_2s_ease-out]">
          Un loc de întâlnire pentru cei care aleg
          <span className="bg-gradient-to-r from-coral via-coral-dark to-indigo bg-clip-text text-transparent">
            {" "}să crească
          </span>
        </h1>

        {/* Linia gradient */}
        <div className="w-20 h-0.5 rounded-full bg-gradient-to-r from-coral to-indigo mb-6 animate-[fadeIn_2.5s_ease-out]" />

        {/* Filosofia — condensată */}
        <p className="max-w-xl text-center text-base text-text-secondary leading-relaxed animate-[fadeIn_3s_ease-out]">
          Fie că vrei să te <span className="text-foreground font-medium">cunoști mai bine</span>,
          să găsești un loc unde ești <span className="text-foreground font-medium">apreciat corect</span>,
          sau să construiești o echipă <span className="text-foreground font-medium">echitabilă</span> —
          drumul începe aici.
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════
           JUMĂTATEA INFERIOARĂ — Cele două cadrane
         ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-0">

        {/* ── CADRAN STÂNG — B2B (Companie) ────────────────────── */}
        <div className="relative group bg-gradient-to-br from-coral/5 to-coral/10 border-t border-r border-border/50 flex flex-col items-center justify-center px-8 py-10 text-center transition-all duration-500 hover:from-coral/8 hover:to-coral/15">

          {/* Ilustrație — iconografie mare */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-coral/20 to-coral/8 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-sm">
            <svg className="w-8 h-8 text-coral" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
          </div>

          {/* Text descriptiv */}
          <p className="text-base text-text-secondary leading-relaxed mb-6 max-w-xs">
            Dacă ești o <span className="text-foreground font-semibold">companie</span> care
            vrea să evalueze posturile echitabil, să construiască o structură salarială
            transparentă și să crească împreună cu echipa —
          </p>

          {/* Butoane */}
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="bg-coral text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-coral-dark transition-colors duration-300 shadow-sm hover:shadow-md"
            >
              Intră în cont
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium text-coral hover:text-coral-dark transition-colors duration-300"
            >
              Cont nou →
            </Link>
          </div>
        </div>

        {/* ── CADRAN DREPT — B2C (Individ) ─────────────────────── */}
        <div className="relative bg-gradient-to-br from-indigo/5 to-indigo/10 border-t border-border/50 flex flex-col items-center justify-center px-8 py-10 text-center">

          {/* Badge „În curând" */}
          <div className="absolute top-5 right-5 flex items-center gap-1.5 bg-indigo/85 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
            În curând
          </div>

          {/* Ilustrație */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo/15 to-indigo/5 flex items-center justify-center mb-6 shadow-sm opacity-70">
            <svg className="w-8 h-8 text-indigo/60" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          </div>

          {/* Text descriptiv */}
          <p className="text-base text-text-secondary/70 leading-relaxed mb-6 max-w-xs">
            Dacă ești o <span className="text-foreground/50 font-semibold">persoană</span> aflată
            în căutarea drumului profesional potrivit, care vrea să-și descopere
            punctele forte și să crească autentic —
          </p>

          {/* Butoane — inactive */}
          <div className="flex items-center gap-4 opacity-40 pointer-events-none">
            <span className="bg-indigo text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-sm">
              Intră în cont
            </span>
            <span className="text-sm font-medium text-indigo">
              Cont nou →
            </span>
          </div>

          <p className="mt-4 text-xs text-indigo/40 italic">
            Lucrăm la asta — revenim în curând
          </p>
        </div>
      </div>

      {/* ── Footer — linie subțire ──────────────────────────────── */}
      <footer className="bg-surface/50 backdrop-blur-sm border-t border-border/30 py-3 px-6">
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
