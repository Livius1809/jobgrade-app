import Image from "next/image"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.svg" alt="JobGrade" width={32} height={32} />
            <span className="text-xl font-bold text-foreground">JobGrade</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm text-text-secondary">
            <a href="#cum-functioneaza" className="hover:text-foreground transition-colors">
              Cum funcționează
            </a>
            <a href="#despre" className="hover:text-foreground transition-colors">
              Despre
            </a>
            <a href="#intrebari" className="hover:text-foreground transition-colors">
              Întrebări
            </a>
            <a href="#preturi" className="hover:text-foreground transition-colors">
              Prețuri
            </a>
          </nav>

          <a
            href="mailto:contact@jobgrade.ro"
            className="bg-coral text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-coral-dark transition-colors"
          >
            Vorbește cu noi
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6 text-foreground">
              Fiecare post din compania ta
              <br />
              merită să fie evaluat echitabil.
            </h1>

            <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-4">
              Construim împreună un sistem de ierarhizare salarială care reflectă
              ceea ce faci cu adevărat — nu ceea ce dictează obiceiul.
            </p>

            <p className="text-base italic text-text-secondary mb-16">
              Începe cu CINE alegi să fii... Evoluăm împreună!
            </p>

            {/* B2B / B2C Cards */}
            <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto mb-16">
              {/* B2B Card */}
              <Link
                href="/login"
                className="group relative bg-surface border border-border rounded-2xl p-8 shadow-sm hover:shadow-md transition-all hover:border-coral-light"
              >
                <div className="w-12 h-12 rounded-xl bg-coral/10 flex items-center justify-center mb-5">
                  <svg
                    className="w-6 h-6 text-coral"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">
                  Cont Business
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  Evaluare posturi, ierarhizare salarială și rapoarte pentru compania ta.
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-coral group-hover:gap-2.5 transition-all">
                  Începe acum
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </Link>

              {/* B2C Card */}
              <div className="relative bg-surface border border-border rounded-2xl p-8 shadow-sm opacity-75 cursor-default">
                {/* Coming Soon Banner */}
                <div className="absolute top-4 right-4 bg-indigo text-white text-xs font-semibold px-3 py-1 rounded-full">
                  În curând
                </div>

                <div className="w-12 h-12 rounded-xl bg-indigo/10 flex items-center justify-center mb-5">
                  <svg
                    className="w-6 h-6 text-indigo"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-foreground">
                  Cont Personal
                </h3>
                <p className="text-sm text-text-secondary mb-4">
                  Descoperă-ți profilul profesional și traiectoria ideală de carieră.
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo">
                  Disponibil în curând
                </span>
              </div>
            </div>

            {/* EU Directive Banner */}
            <div className="max-w-3xl mx-auto bg-indigo/5 border border-indigo/10 rounded-xl px-6 py-4 text-sm text-text-secondary">
              <span className="font-medium text-indigo">Directiva UE 2023/970</span>{" "}
              — Transparența salarială devine obligatorie. JobGrade te pregătește din timp cu un sistem
              de evaluare conform, obiectiv și auditabil.
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-16 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <Image src="/logo.svg" alt="JobGrade" width={24} height={24} />
            <span className="font-semibold text-foreground">JobGrade</span>
          </div>

          <p className="text-sm text-text-secondary mb-6">
            JobGrade este un produs{" "}
            <span className="font-medium text-foreground">Psihobusiness Consulting SRL</span>
          </p>

          <div className="flex items-center justify-center gap-4 mb-8">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo bg-indigo/5 border border-indigo/10 px-3 py-1.5 rounded-full">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              GDPR Compliant
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo bg-indigo/5 border border-indigo/10 px-3 py-1.5 rounded-full">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
              </svg>
              EU AI Act Ready
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
