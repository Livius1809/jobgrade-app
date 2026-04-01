import Image from "next/image"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header minimal ──────────────────────────────────────────── */}
      <header className="absolute top-0 left-0 right-0 z-50 px-6 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="JobGrade" width={36} height={36} />
            <span className="text-xl font-semibold text-foreground">JobGrade</span>
          </Link>
          <a
            href="mailto:contact@jobgrade.ro"
            className="text-sm text-text-secondary hover:text-foreground transition-colors"
          >
            contact@jobgrade.ro
          </a>
        </div>
      </header>

      {/* ── Hero — Filosofia ────────────────────────────────────────── */}
      <main>
        <section className="min-h-screen flex flex-col justify-center px-6 pt-24 pb-16">
          <div className="max-w-3xl mx-auto text-center">
            {/* Spirala — ancora vizuală */}
            <div className="mb-12">
              <Image
                src="/favicon.svg"
                alt="Spirala JobGrade"
                width={72}
                height={72}
                className="mx-auto"
              />
            </div>

            {/* Sloganul — deschiderea */}
            <p className="text-lg md:text-xl italic text-text-secondary mb-10 tracking-wide">
              Începe cu CINE alegi să fii... Evoluăm împreună!
            </p>

            {/* Headline — esența */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight mb-8 text-foreground">
              Un loc de întâlnire pentru cei care aleg
              <br className="hidden md:block" />
              <span className="bg-gradient-to-r from-coral to-indigo bg-clip-text text-transparent">
                {" "}să crească.
              </span>
            </h1>

            {/* Filosofia — textul cald */}
            <div className="max-w-2xl mx-auto space-y-5 text-lg text-text-secondary leading-relaxed mb-16">
              <p>
                Poate cauți să te înțelegi mai bine pe tine.
                Poate cauți un loc de muncă unde să fii apreciat corect.
                Poate construiești o echipă și vrei să o tratezi echitabil.
              </p>
              <p>
                Indiferent de unde pornești, drumul e același:
                <span className="text-foreground font-medium"> de la ceea ce faci la ceea ce ești.</span>
              </p>
              <p>
                JobGrade e locul unde acest drum începe.
                Te însoțim — fie că ești individ, antreprenor sau companie.
              </p>
            </div>

            {/* ── B2B / B2C — Cele două porți ──────────────────────── */}
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-20">

              {/* B2B — Cont Business */}
              <Link
                href="/login"
                className="group relative bg-surface border border-border rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all hover:border-coral/40 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-coral/10 flex items-center justify-center mb-5">
                  <svg className="w-5 h-5 text-coral" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  Sunt companie
                </h3>
                <p className="text-sm text-text-secondary mb-5 leading-relaxed">
                  Evaluez posturile echitabil, construiesc o structură salarială transparentă
                  și mă aliniez la Directiva UE.
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-coral group-hover:gap-2.5 transition-all">
                  Intră în cont
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </Link>

              {/* B2C — Cont Personal */}
              <div className="relative bg-surface border border-border rounded-2xl p-8 shadow-sm text-left opacity-60 cursor-default">
                {/* Badge „În curând" */}
                <div className="absolute top-4 right-4 bg-indigo/90 text-white text-xs font-medium px-3 py-1 rounded-full">
                  În curând
                </div>

                <div className="w-10 h-10 rounded-xl bg-indigo/10 flex items-center justify-center mb-5">
                  <svg className="w-5 h-5 text-indigo" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2 text-foreground">
                  Sunt individ
                </h3>
                <p className="text-sm text-text-secondary mb-5 leading-relaxed">
                  Îmi descopăr profilul, îmi înțeleg punctele forte
                  și îmi construiesc traiectoria profesională.
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm text-indigo/70">
                  Lucrăm la asta — revenim în curând
                </span>
              </div>
            </div>

            {/* ── Ancora de încredere ──────────────────────────────── */}
            <div className="max-w-xl mx-auto text-center text-sm text-text-secondary space-y-3">
              <p>
                Construim cu grijă, nu cu grabă.
                Fiecare funcționalitate e gândită să servească omul din spatele ecranului.
              </p>
              <p className="text-xs">
                Aliniat <span className="font-medium">GDPR</span> · Pregătit pentru <span className="font-medium">AI Act UE</span> · Conform <span className="font-medium">Directiva 2023/970</span>
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer minimal ──────────────────────────────────────────── */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Image src="/logo.svg" alt="JobGrade" width={20} height={20} />
            <span className="text-sm text-text-secondary">
              Un produs <span className="font-medium text-foreground">Psihobusiness Consulting SRL</span>
            </span>
          </div>
          <p className="text-xs italic text-text-secondary">
            Începe cu CINE alegi să fii... Evoluăm împreună!
          </p>
        </div>
      </footer>
    </div>
  )
}
