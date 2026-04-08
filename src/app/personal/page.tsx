import Image from "next/image"
import Link from "next/link"
import dynamic from "next/dynamic"

const ChatWidget = dynamic(() => import("@/components/chat/ChatWidget"), { ssr: false })

export const metadata = {
  title: "JobGrade — Un drum care începe cu tine",
  description: "Descoperă cine ești cu adevărat. Profilare personalizată, dezvoltare autentică, parcurs evolutiv ghidat.",
}

/* ═══════════════════════════════════════════════════════════════════════
   CARDURILE B2C — cele 6 straturi ale onion-ului
   Card 3 și Card 6 active by default, restul se activează progresiv
   ═══════════════════════════════════════════════════════════════════════ */

const cards = [
  {
    id: "CARD_6",
    title: "Spune-mi despre mine",
    subtitle: "Profiler",
    description: "Profilerul tău personal. Te cunoaște din fiecare conversație, din fiecare test, din fiecare alegere pe care o faci aici. Cu cât interacționezi mai mult, cu atât te vede mai clar.",
    active: true,
    color: "coral",
    icon: "/favicon.svg",
  },
  {
    id: "CARD_3",
    title: "Îmi asum un rol profesional",
    subtitle: "Consilier Carieră",
    description: "Descoperă-ți valoarea profesională reală. Încarcă-ți CV-ul, primești o radiografie a profilului tău pe 6 criterii obiective. Găsește rolurile care ți se potrivesc cu adevărat.",
    active: true,
    color: "indigo",
    icon: "/favicon.svg",
  },
  {
    id: "CARD_1",
    title: "Drumul către mine",
    subtitle: "Călăuza",
    description: "Cel mai profund strat. Aici nu mai lucrezi cu ce faci sau cu cine interacționezi. Aici te întâlnești cu cine ești, dincolo de roluri și așteptări.",
    active: false,
    color: "coral",
    icon: "/favicon.svg",
  },
  {
    id: "CARD_2",
    title: "Eu și ceilalți, adică NOI",
    subtitle: "Consilier Dezvoltare Personală",
    description: "Înțelege cum funcționezi în relație cu ceilalți. Construiește o hartă a relațiilor tale și descoperă tiparele care te ajută sau te țin pe loc.",
    active: false,
    color: "indigo",
    icon: "/favicon.svg",
  },
  {
    id: "CARD_4",
    title: "Oameni de succes, oameni de valoare",
    subtitle: "Coach",
    description: "Ce contează cu adevărat? Dincolo de realizări și recunoaștere, există o distincție fundamentală între succes și valoare. Descoper-o.",
    active: false,
    color: "coral",
    icon: "/favicon.svg",
  },
  {
    id: "CARD_5",
    title: "Antreprenoriatul transformațional",
    subtitle: "Coach",
    description: "Pune totul cap la cap într-un proiect care contează. Nu un curs de business, ci integrarea a tot ceea ce ai descoperit despre tine, pus în slujba unui bine mai mare.",
    active: false,
    color: "indigo",
    icon: "/favicon.svg",
  },
]

export default function PersonalPage() {
  return (
    <div className="min-h-screen text-foreground">

      {/* ── Background ──────────────────────────────────────────── */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo/5 via-background to-coral/3" />
        <div className="absolute top-[-15%] left-[50%] -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-indigo/6 blur-[160px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-coral/6 blur-[120px]" />
      </div>

      {/* ═══════════════════════════════════════════════════════════
           HEADER
         ═══════════════════════════════════════════════════════════ */}
      <header className="relative z-50 sticky top-0 bg-white/80 backdrop-blur-md border-b border-indigo/10">
        <div className="flex items-center justify-between px-6 h-16" style={{ maxWidth: "56rem", margin: "0 auto" }}>
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
          <nav className="flex items-center gap-6">
            <a href="#carduri" className="hidden md:inline text-sm font-medium text-text-warm hover:text-coral transition-colors">Cardurile</a>
            <a href="#cum-functioneaza" className="hidden md:inline text-sm font-medium text-text-warm hover:text-coral transition-colors">Cum funcționează</a>
            <Link href="/" className="text-sm text-text-secondary hover:text-indigo transition-colors">
              Pagina principală
            </Link>
          </nav>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════
           HERO — Metamorfoza
         ═══════════════════════════════════════════════════════════ */}
      <section className="flex flex-col items-center justify-center px-6 py-16 md:py-24 min-h-[50vh]">
        <div className="relative mb-10">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-60 h-60 rounded-full bg-gradient-to-br from-indigo/10 to-coral/8 blur-3xl animate-pulse" />
          </div>
          <Image
            src="/favicon.svg"
            alt="Spirala JobGrade"
            width={120}
            height={120}
            className="relative z-10 drop-shadow-xl"
          />
        </div>

        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight text-center mb-6 text-foreground">
          Începem cu cine alegi să{" "}
          <span className="bg-gradient-to-r from-coral via-coral to-indigo bg-clip-text text-transparent">
            fii.
          </span>
        </h1>

        <p className="text-center text-base md:text-lg text-text-secondary leading-relaxed mb-4" style={{ maxWidth: "36rem" }}>
          Un drum de evoluție care începe cu tine. Nu cu un test. Nu cu o etichetă.
          Cu o conversație sinceră despre cine ești și cine vrei să devii.
        </p>

        <p className="text-center text-sm text-text-secondary/60 italic mb-8">
          Evoluăm împreună.
        </p>

        <div className="flex items-center gap-2 text-xs text-text-secondary/40">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
          Descoperă cardurile
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
           CUM FUNCȚIONEAZĂ — 3 pași simpli
         ═══════════════════════════════════════════════════════════ */}
      <section id="cum-functioneaza" className="px-6 py-16 md:py-20">
        <div style={{ maxWidth: "48rem", margin: "0 auto" }}>
          <h2 className="text-xl md:text-2xl font-semibold text-center text-foreground mb-3">
            Cum funcționează
          </h2>
          <p className="text-sm text-text-secondary text-center mb-12">
            Trei pași. Fără obligații. La ritmul tău.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-coral/10 text-coral font-bold text-lg flex items-center justify-center mx-auto mb-4">1</div>
              <h3 className="font-semibold text-foreground mb-2">Alege-ți un alias</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Numele tău de crisalidă. Nu avem nevoie de date personale ca să te cunoaștem. Primești o adresă de email pe domeniul nostru.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-coral/10 text-coral font-bold text-lg flex items-center justify-center mx-auto mb-4">2</div>
              <h3 className="font-semibold text-foreground mb-2">Vorbește cu Profiler-ul</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Prima conversație. Spune-i ce te aduce aici — sau nu. El te ascultă, te observă, și începe să te cunoască din fiecare cuvânt.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-coral/10 text-coral font-bold text-lg flex items-center justify-center mx-auto mb-4">3</div>
              <h3 className="font-semibold text-foreground mb-2">Explorează la ritmul tău</h3>
              <p className="text-sm text-text-secondary leading-relaxed">
                Două carduri sunt deschise din start. Restul se deschid pe măsură ce ești pregătit. Nimeni nu te grăbește.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
           CARDURILE — Cele 6 straturi
         ═══════════════════════════════════════════════════════════ */}
      <section id="carduri" className="px-6 py-16 md:py-20">
        <div style={{ maxWidth: "56rem", margin: "0 auto" }}>
          <h2 className="text-xl md:text-2xl font-semibold text-center text-foreground mb-3">
            Șase carduri. Un singur drum.
          </h2>
          <p className="text-sm text-text-secondary text-center mb-12" style={{ maxWidth: "32rem", margin: "0 auto 3rem auto" }}>
            Fiecare card e un strat al aceluiași lucru: tu.
            Nu sunt paralele — sunt concentrice. Fiecare strat conține și transcende pe cele dinaintea lui.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cards.map((card) => (
              <div
                key={card.id}
                className={`relative rounded-2xl border p-8 transition-all duration-500 ${
                  card.active
                    ? `border-${card.color}/20 bg-gradient-to-br from-${card.color}/5 to-${card.color}/2 hover:shadow-lg hover:border-${card.color}/30`
                    : "border-indigo/10 bg-surface/40 opacity-60"
                }`}
              >
                {/* Badge activ/locked */}
                <div className="absolute top-4 right-4">
                  {card.active ? (
                    <span className="text-xs font-medium text-coral bg-coral/10 px-2.5 py-1 rounded-full">
                      Deschis
                    </span>
                  ) : (
                    <svg className="w-4 h-4 text-indigo/30" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                  )}
                </div>

                {/* Conținut */}
                <p className="text-xs font-medium text-text-secondary/50 uppercase tracking-wider mb-2">
                  {card.subtitle}
                </p>
                <h3 className={`text-lg font-semibold mb-3 ${card.active ? "text-foreground" : "text-foreground/50"}`}>
                  {card.title}
                </h3>
                <p className={`text-sm leading-relaxed ${card.active ? "text-text-secondary" : "text-text-secondary/40"}`}>
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
           METAMORFOZA — Povestea vizuală
         ═══════════════════════════════════════════════════════════ */}
      <section className="px-6 py-16 md:py-20 bg-gradient-to-b from-transparent to-coral/3">
        <div className="text-center" style={{ maxWidth: "36rem", margin: "0 auto" }}>
          <p className="text-lg md:text-xl text-foreground font-medium leading-relaxed mb-6">
            Totul începe cu o crisalidă.
          </p>
          <p className="text-base text-text-secondary leading-relaxed mb-6">
            Nu e o rupere de ce ai fost. E o transfigurare a aceleiași esențe.
            Mătasea din care e țesută crisalida este chiar substanța din care se naște fluturele.
          </p>
          <p className="text-base text-text-secondary leading-relaxed mb-8">
            Drumul tău aici e simplu: din crisalidă, prin metamorfoză, spre zbor.
            La ritmul tău. Cu sprijinul nostru. Fără grabă.
          </p>

          <div className="w-12 h-0.5 rounded-full bg-gradient-to-r from-coral to-indigo mb-6" style={{ margin: "0 auto 1.5rem auto" }} />

          <p className="text-lg font-semibold text-foreground mb-2">
            Începem cu CINE alegi să fii.
          </p>
          <p className="text-base text-coral font-medium">
            Evoluăm împreună.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
           CTA — Intră
         ═══════════════════════════════════════════════════════════ */}
      <section className="px-6 py-16 text-center">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="px-8 py-3 rounded-xl bg-coral text-white text-sm font-semibold hover:bg-coral/90 transition-colors shadow-md hover:shadow-lg"
          >
            Intră în platformă
          </Link>
          <Link
            href="/"
            className="px-8 py-3 rounded-xl border border-indigo/20 text-sm font-medium text-indigo hover:bg-indigo/5 transition-colors"
          >
            Pagina principală
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="bg-indigo-dark text-white">
        <div className="px-6 py-12" style={{ maxWidth: "56rem", margin: "0 auto" }}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <Image src="/logo.svg" alt="JobGrade" width={24} height={24} className="brightness-0 invert" />
              <span className="text-sm font-semibold">JobGrade</span>
              <span className="text-xs text-white/40 ml-2">&copy; 2026 Psihobusiness Consulting SRL</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-white/40">
              <span className="border border-white/10 px-2 py-0.5 rounded">GDPR</span>
              <span className="border border-white/10 px-2 py-0.5 rounded">AI Act UE</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Agent host: PROFILER — primul contact pe pagina B2C */}
      <ChatWidget />
    </div>
  )
}
