import Image from "next/image"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen text-foreground overflow-hidden">

      {/* ── Background gradient — coral cald sus, alb jos ──────── */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-coral/5 via-background to-indigo/3" />
        {/* Cercuri decorative blur — forme organice */}
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-coral/8 blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo/8 blur-[120px]" />
      </div>

      {/* ── Header minimal ──────────────────────────────────────── */}
      <header className="relative z-50 px-6 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/logo.svg"
              alt="JobGrade"
              width={36}
              height={36}
              className="transition-transform duration-500 group-hover:rotate-45"
            />
            <span className="text-xl font-semibold text-foreground">JobGrade</span>
          </Link>
          <a
            href="mailto:contact@jobgrade.ro"
            className="text-sm text-text-secondary hover:text-coral transition-colors duration-300"
          >
            contact@jobgrade.ro
          </a>
        </div>
      </header>

      {/* ── Hero — Filosofia ────────────────────────────────────── */}
      <main>
        <section className="min-h-[calc(100vh-88px)] flex flex-col justify-center px-6 pb-16">
          <div className="max-w-3xl mx-auto text-center">

            {/* Spirala — ancora vizuală cu animație */}
            <div className="mb-14 relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-coral/10 to-indigo/10 blur-2xl animate-pulse" />
              </div>
              <Image
                src="/favicon.svg"
                alt="Spirala JobGrade"
                width={80}
                height={80}
                className="mx-auto relative z-10 drop-shadow-lg"
              />
            </div>

            {/* Sloganul — deschiderea */}
            <p className="text-lg md:text-xl italic text-text-secondary mb-12 tracking-wide animate-[fadeIn_1.5s_ease-out]">
              Începe cu CINE alegi să fii... Evoluăm împreună!
            </p>

            {/* Headline — esența, cu gradient pe cuvântul cheie */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-10 text-foreground animate-[fadeIn_2s_ease-out]">
              Un loc de întâlnire
              <br className="hidden md:block" />
              pentru cei care aleg
              <span className="bg-gradient-to-r from-coral via-coral-dark to-indigo bg-clip-text text-transparent">
                {" "}să crească
              </span>
            </h1>

            {/* Linia decorativă gradient */}
            <div className="w-24 h-1 mx-auto rounded-full bg-gradient-to-r from-coral to-indigo mb-12 animate-[fadeIn_2.5s_ease-out]" />

            {/* Filosofia — textul cald */}
            <div className="max-w-2xl mx-auto space-y-5 text-lg text-text-secondary leading-relaxed mb-20 animate-[fadeIn_3s_ease-out]">
              <p>
                Poate cauți să te <span className="text-foreground font-medium">înțelegi mai bine</span> pe tine.
                <br className="hidden sm:block" />
                Poate cauți un loc de muncă unde să fii <span className="text-foreground font-medium">apreciat corect</span>.
                <br className="hidden sm:block" />
                Poate construiești o echipă și vrei să o <span className="text-foreground font-medium">tratezi echitabil</span>.
              </p>
              <p className="text-base">
                Indiferent de unde pornești, drumul e același:
              </p>
              <p className="text-xl text-foreground font-semibold">
                De la ceea ce faci la ceea ce ești.
              </p>
            </div>

            {/* ── B2B / B2C — Cele două porți ──────────────────── */}
            <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto mb-24">

              {/* B2B — Sunt companie */}
              <Link
                href="/login"
                className="group relative bg-surface/80 backdrop-blur-sm border border-coral/20 rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-500 hover:border-coral/50 hover:-translate-y-1 text-left"
              >
                {/* Gradient accent top */}
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-coral to-coral-light" />

                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-coral/15 to-coral/5 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-6 h-6 text-coral" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">
                  Sunt companie
                </h3>
                <p className="text-sm text-text-secondary mb-6 leading-relaxed">
                  Evaluez posturile echitabil, construiesc o structură salarială transparentă
                  și cresc împreună cu echipa mea.
                </p>
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-coral group-hover:gap-3 transition-all duration-300">
                  Intră în cont
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </Link>

              {/* B2C — Sunt individ */}
              <div className="group relative bg-surface/60 backdrop-blur-sm border border-indigo/15 rounded-2xl p-8 shadow-md text-left cursor-default">
                {/* Gradient accent top */}
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-indigo/40 to-indigo-light/40" />

                {/* Badge „În curând" */}
                <div className="absolute top-5 right-5 flex items-center gap-1.5 bg-indigo/90 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
                  În curând
                </div>

                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo/15 to-indigo/5 flex items-center justify-center mb-5">
                  <svg className="w-6 h-6 text-indigo/60" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground/60">
                  Sunt individ
                </h3>
                <p className="text-sm text-text-secondary/70 mb-6 leading-relaxed">
                  Îmi descopăr profilul, îmi înțeleg punctele forte
                  și îmi construiesc traiectoria profesională.
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm text-indigo/50">
                  Lucrăm la asta — revenim în curând
                </span>
              </div>
            </div>

            {/* ── Ancora de încredere — linie subtilă ──────────── */}
            <div className="max-w-lg mx-auto">
              <div className="w-12 h-px mx-auto bg-gradient-to-r from-transparent via-border to-transparent mb-8" />
              <p className="text-sm text-text-secondary leading-relaxed mb-4">
                Construim cu grijă, nu cu grabă.
                <br />
                Fiecare funcționalitate e gândită să servească
                omul din spatele ecranului.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary/70 bg-surface border border-border px-3 py-1.5 rounded-full">
                  <svg className="w-3 h-3 text-coral/60" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                  GDPR
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary/70 bg-surface border border-border px-3 py-1.5 rounded-full">
                  <svg className="w-3 h-3 text-indigo/60" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
                  </svg>
                  AI Act UE
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary/70 bg-surface border border-border px-3 py-1.5 rounded-full">
                  <svg className="w-3 h-3 text-coral/60" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0 0 12 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 0 1-2.031.352 5.988 5.988 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971Zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0 2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 0 1-2.031.352 5.989 5.989 0 0 1-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971Z" />
                  </svg>
                  Directiva 2023/970
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer minimal ──────────────────────────────────────── */}
      <footer className="relative border-t border-border/50 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="JobGrade" width={18} height={18} className="opacity-60" />
            <span className="text-xs text-text-secondary">
              Un produs <span className="font-medium text-foreground/70">Psihobusiness Consulting SRL</span>
            </span>
          </div>
          <p className="text-xs italic text-text-secondary/60">
            Începe cu CINE alegi să fii... Evoluăm împreună!
          </p>
        </div>
      </footer>

    </div>
  )
}
