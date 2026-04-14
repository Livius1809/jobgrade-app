import Image from "next/image"
import Link from "next/link"
import { ChatWidgetLoader } from "@/components/chat/ChatWidgetLoader"
import { ScrollReveal } from "@/components/home/ScrollReveal"
import { ServiceNode } from "@/components/home/ServiceNode"
import { PersistentLabels } from "@/components/home/PersistentLabels"
import { SpiralPath } from "@/components/home/SpiralPath"
import { ApexVisual } from "@/components/home/ApexVisual"
import { FloatingCTA } from "@/components/home/FloatingCTA"


/* ═══════════════════════════════════════════════════════════════════════
   STORY DATA — fiecare secvență din povestea Spirala-Oglindă
   ═══════════════════════════════════════════════════════════════════════ */

const sequences = [
  {
    id: "omul",
    text: [
      "Totul începe cu un om.",
      "Nu cu un CV. Nu cu o organigramă. Nu cu un salariu.",
      "Cu cineva care se trezește dimineața și alege — conștient sau nu — cine e... azi.",
    ],
    b2c: {
      evocative: "Cine ești... când nu mai trebuie să demonstrezi nimic?",
      service: "Drumul către mine",
    },
  },
  {
    id: "rolurile",
    text: [
      "Apoi... omul își asumă un rol.",
      "Într-o echipă. Într-un proiect. Într-o companie care depinde de el... mai mult decât ar recunoaște.",
      "Rolul nu-l definește — dar îl poate limita sau elibera. Depinde cine l-a gândit... și cât de bine se potrivește cu omul din spatele lui.",
    ],
    b2c: {
      evocative: "Cine ești dincolo de rolul pe care ți-l asumi?",
      service: "Evaluarea personalului",
    },
    b2b: {
      evocative: "Fiecare post are o greutate. Întrebarea e... dacă o măsori sau o presupui.",
      service: "Evaluarea posturilor",
    },
  },
] as const

const breathing1 = {
  lines: [
    "Până aici... lucrurile par simple.",
    "Un om. Un rol.",
    "Dar nimic nu există... izolat.",
  ],
}

const sequences2 = [
  {
    id: "contextele",
    text: [
      "Rolurile trăiesc... în contexte.",
      `Într-o companie cu 30 de oameni, salariile se stabilesc \u201Edupă ureche\u201D. La 100, \u201Edupă ureche\u201D devine \u201Epe noroc\u201D. La 300... devine risc. Și riscul are un cost pe care aproape nimeni nu-l calculează — până când un om bun pleacă, iar motivul nu e salariul în sine. E sentimentul... că nu e drept.`,
    ],
    b2c: {
      evocative: "Un rol profesional nu se găsește. Se asumă.",
      service: "Profilul tău profesional",
    },
    b2b: {
      evocative: "Când grila salarială e construită corect, oamenii rămân. Nu din loialitate — din echitate.",
      service: "Structuri salariale echitabile",
    },
  },
  {
    id: "echilibrul",
    text: [
      "Există un moment — rar, dar real — în care omul, rolul și contextul... se aliniază.",
      "Nu e un accident. E rezultatul a ceva construit cu grijă: cineva a înțeles ce poate omul, cineva a gândit rolul cum trebuie... cineva a creat un context în care să poată respira.",
      "Când se întâmplă asta... nu trebuie să motivezi pe nimeni. Oamenii vin la muncă și lucrurile merg.",
    ],
    b2c: {
      evocative: "Relațiile tale vorbesc despre tine mai mult decât crezi.",
      service: "Eu și ceilalți",
    },
    b2b: {
      evocative: "Nu știi cât valorează echipa ta până nu vezi cum funcționează împreună.",
      service: "Evaluarea personalului și armonizarea echipelor de lucru",
    },
  },
] as const

const breathing2 = {
  lines: [
    "Echilibrul nu e un punct de sosire.",
    "E un mod de a merge.",
  ],
}

const sequences3 = [
  {
    id: "performanta",
    text: [
      "Din echilibru... vine performanța reală.",
      "Nu cea storsă din ore suplimentare și presiune. Cea care apare când oamenii știu ce fac, de ce fac... și simt că e drept. Performanța care nu are nevoie de monitorizare — pentru că vine din interior.",
      "Dar performanța reală nu se susține singură. Are nevoie de procese care nu împiedică... de o cultură care nu contrazice ce scrie pe pereți... și de o structură care ține pasul cu oamenii ei.",
    ],
    b2b: {
      evocative: "Cultura nu e ce scrie pe perete. E ce se întâmplă când nimeni nu se uită.",
      service: "Cultură organizațională și performanță",
    },
  },
  {
    id: "procesele",
    text: [
      `Un proces bun nu se simte. Unul prost se simte în fiecare zi — în întârzieri, în frustrări, în lucruri care \u201Enu se știe de cine depind\u201D.`,
      "Când procesele reflectă realitatea — nu un ideal desenat în PowerPoint — oamenii nu mai pierd energie pe sistem. O investesc în muncă.",
    ],
    b2c: {
      evocative: "Succesul se vede. Valoarea se simte. Care pe care?",
      service: "Oameni de succes / Oameni de valoare",
    },
    b2b: {
      evocative: "Procesele bune nu se simt. Cele proaste se simt în fiecare zi.",
      service: "Armonizarea proceselor interne și Manualul calității",
    },
  },
  {
    id: "evolutia",
    text: [
      "Ce e corect azi... nu e suficient mâine.",
      "Oamenii cresc. Rolurile se transformă. Contextele se schimbă. Generații diferite aduc limbaje diferite la aceeași masă — și fiecare are dreptate... din locul său.",
      "Cine nu evoluează... nu rămâne pe loc. Rămâne în urmă — nu față de piață, ci față de sine.",
    ],
    b2b: {
      evocative: "Patru generații în aceeași sală. Același obiectiv. Limbaje diferite.",
      service: "Management multigenerațional",
    },
  },
] as const

const breathing3 = {
  lines: [
    "Dar evoluția... nu e un drum solitar.",
    "Niciodată nu a fost.",
  ],
}

const sequences4 = [
  {
    id: "impreuna",
    text: [
      "Oamenii cresc... împreună. În echipe care se văd. În organizații care se cunosc. În comunități care se susțin.",
      "O companie care își evaluează posturile corect nu face doar conformitate — construiește un loc în care oamenii aleg să rămână. Un om care se descoperă pe sine nu devine doar mai bun la ce face — devine mai prezent în tot ce este.",
      "Lucrurile astea nu se întâmplă separat. Se întâmplă împreună. Se hrănesc reciproc. Omul crește, organizația crește, piața crește — nu prin obligație, ci prin evoluție.",
    ],
    b2c: {
      evocative: "Ce s-ar întâmpla dacă ai construi ceva care te depășește?",
      service: "Antreprenoriat transformațional",
    },
    b2b: {
      evocative: "Directiva UE 2023/970 nu e o amenințare. E momentul în care faci ce trebuia făcut oricum.",
      service: "Conformitate și transparență salarială",
    },
  },
  {
    id: "oglinda",
    text: [
      "Înainte de orice drum... e un moment de liniște în care te uiți la tine.",
      "Nu la ce ai realizat. La cine... ești.",
    ],
    b2c: {
      evocative: "Înainte de orice răspuns, trebuie o întrebare bună despre tine.",
      service: "Spune-mi despre mine",
    },
    b2b: {
      evocative: "Înainte de orice schimbare, trebuie să vezi clar unde ești azi.",
      service: "Diagnoză organizațională",
    },
  },
] as const

/* ═══════════════════════════════════════════════════════════════════════
   SECTION COMPONENTS
   ═══════════════════════════════════════════════════════════════════════ */

// Servicii active la lansare
const ACTIVE_B2B = new Set([
  "Evaluarea posturilor",
  "Structuri salariale echitabile",
  "Conformitate și transparență salarială",
])
const ACTIVE_B2C = new Set([
  "Profilul tău profesional",
])

function StorySection({
  text,
  b2c,
  b2b,
}: {
  text: readonly string[]
  b2c?: { evocative: string; service: string }
  b2b?: { evocative: string; service: string }
}) {
  return (
    <div className="story-section">
      {/* Left column — B2C */}
      <div className="flex items-center justify-center min-h-[60px] md:min-h-0 order-2 md:order-1">
        {b2c ? (
          <ServiceNode side="left" evocative={b2c.evocative} service={b2c.service} delay={200} active={ACTIVE_B2C.has(b2c.service)} />
        ) : (
          <div className="hidden md:block" />
        )}
      </div>

      {/* Center column — Story (first on mobile) */}
      <ScrollReveal className="order-1 md:order-2">
        <div>
          {text.map((paragraph, i) => (
            <p
              key={i}
              className={`leading-relaxed text-justify ${
                i === 0
                  ? "text-xl md:text-2xl font-semibold text-indigo-dark mb-7"
                  : "text-base md:text-lg text-text-warm mb-5"
              }`}
            >
              {paragraph}
            </p>
          ))}
        </div>
      </ScrollReveal>

      {/* Right column — B2B */}
      <div className="flex items-center justify-center min-h-[60px] md:min-h-0 order-3">
        {b2b ? (
          <ServiceNode side="right" evocative={b2b.evocative} service={b2b.service} delay={400} active={ACTIVE_B2B.has(b2b.service)} />
        ) : (
          <div className="hidden md:block" />
        )}
      </div>
    </div>
  )
}

function BreathingSection({ lines }: { lines: readonly string[] }) {
  return (
    <div className="breathing-section">
      <ScrollReveal>
        <div className="space-y-2">
          {lines.map((line, i) => (
            <p
              key={i}
              className="text-xl md:text-2xl font-normal text-indigo-dark/80 leading-relaxed"
            >
              {line}
            </p>
          ))}
        </div>
      </ScrollReveal>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════════════════════════ */

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <PersistentLabels />
      <FloatingCTA />

      {/* ═══════════════════════════════════════════════════════════
           HEADER
         ═══════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 header-glass">
        <div className="px-6 h-16 flex items-center justify-between" style={{ maxWidth: "56rem", margin: "0 auto" }}>
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

          <nav className="hidden md:flex items-center gap-8">
            <a href="#poveste" className="text-sm font-medium text-text-warm hover:text-indigo transition-colors duration-200">Povestea</a>
            <a href="#convergence" className="text-sm font-medium text-text-warm hover:text-indigo transition-colors duration-200">Despre noi</a>
            <Link href="/login" className="text-sm font-medium text-text-warm hover:text-coral transition-colors duration-200">Intră în platformă</Link>
          </nav>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════
           HERO — Prima respirație
         ═══════════════════════════════════════════════════════════ */}
      <section
        className="relative flex flex-col items-center justify-center min-h-[40vh] px-6 overflow-hidden"
        style={{ background: "linear-gradient(180deg, var(--hero-bg-top) 0%, var(--hero-bg-bottom) 100%)" }}
      >
        <div className="flex flex-col items-center text-center py-16" style={{ maxWidth: "48rem" }}>
          {/* Spiral logo — breathing */}
          <div className="mb-12 spiral-hero-pulse" style={{ animation: "fadeInUp 0.6s ease-out both" }}>
            <Image
              src="/favicon.svg"
              alt="Spirala JobGrade"
              width={120}
              height={120}
              priority
            />
          </div>

          {/* Slogan principal */}
          <div style={{ animation: "fadeInUp 0.8s ease-out 0.3s both" }}>
            <h1 className="text-3xl md:text-4xl lg:text-[48px] font-semibold leading-[1.15] tracking-[-0.02em] text-indigo-dark mb-5">
              Începem cu CINE alegi să FII.
            </h1>

            <p className="text-lg md:text-xl font-normal leading-relaxed text-text-warm mb-3" style={{ maxWidth: "42rem", margin: "0 auto" }}>
              O poveste despre oameni, roluri și contexte. Despre ce înseamnă să construiești cum trebuie, pentru tine și ceilalți.
            </p>
          </div>

          {/* Scroll hint */}
          <div className="mt-12 scroll-hint" style={{ animation: "fadeIn 1s ease-out 1.2s both" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-micro">
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
           BIFURCAȚIE — Spirala se desparte
         ═══════════════════════════════════════════════════════════ */}
      <section id="poveste" className="py-12 px-6">
        <ScrollReveal>
          <div className="grid items-center gap-8 px-6" style={{ gridTemplateColumns: "1fr 2fr 1fr", maxWidth: "64rem", margin: "0 auto" }}>
            <span className="text-sm font-medium tracking-wider text-coral uppercase text-right">
              Pentru tine
            </span>
            <div className="flex justify-center">
              <div className="w-2 h-2 rounded-full bg-indigo-dark/20" />
            </div>
            <span className="text-sm font-medium tracking-wider text-indigo uppercase text-left">
              Pentru companii
            </span>
          </div>
        </ScrollReveal>
      </section>

      {/* ═══════════════════════════════════════════════════════════
           POVESTEA — Secvențele 1-9 cu respirații
         ═══════════════════════════════════════════════════════════ */}
      <div id="spiral-zone" className="relative flex flex-col gap-6 md:gap-10 py-8">
        <SpiralPath />

        {/* Secv 1: Omul */}
        <div data-cone-section="0">
          <StorySection text={sequences[0].text} b2c={sequences[0].b2c} />
        </div>
        {/* Secv 2: Rolurile */}
        <div data-cone-section="1">
          <StorySection text={sequences[1].text} b2b={sequences[1].b2b} />
        </div>
        {/* Respirație 1 */}
        <div data-cone-section="2">
          <BreathingSection lines={breathing1.lines} />
        </div>
        {/* Secv 3: Contextele */}
        <div data-cone-section="3">
          <StorySection text={sequences2[0].text} b2c={sequences2[0].b2c} b2b={sequences2[0].b2b} />
        </div>
        {/* Secv 4: Echilibrul */}
        <div data-cone-section="4">
          <StorySection text={sequences2[1].text} b2c={sequences2[1].b2c} b2b={sequences2[1].b2b} />
        </div>
        {/* Respirație 2 */}
        <div data-cone-section="5">
          <BreathingSection lines={breathing2.lines} />
        </div>
        {/* Secv 5: Performanța */}
        <div data-cone-section="6">
          <StorySection text={sequences3[0].text} b2b={sequences3[0].b2b} />
        </div>
        {/* Secv 6: Procesele */}
        <div data-cone-section="7">
          <StorySection text={sequences3[1].text} b2c={sequences3[1].b2c} b2b={sequences3[1].b2b} />
        </div>
        {/* Secv 7: Evoluția */}
        <div data-cone-section="8">
          <StorySection text={sequences3[2].text} b2b={sequences3[2].b2b} />
        </div>
        {/* Respirație 3 */}
        <div data-cone-section="9">
          <BreathingSection lines={breathing3.lines} />
        </div>
        {/* Secv 8: Împreună */}
        <div data-cone-section="10">
          <StorySection text={sequences4[0].text} b2c={sequences4[0].b2c} b2b={sequences4[0].b2b} />
        </div>
        {/* Secv 9: Oglinda */}
        <div data-cone-section="11">
          <StorySection text={sequences4[1].text} b2c={sequences4[1].b2c} b2b={sequences4[1].b2b} />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
           CONVERGENȚA — Spirala se reunește
         ═══════════════════════════════════════════════════════════ */}
      {/* ── Apex conului — linii convergente + punct (activat la scroll) ──── */}
      <ApexVisual />

      <section id="convergence" className="convergence-glow pt-10 pb-20 lg:pb-28 px-6">
        <ScrollReveal>
          <div className="flex flex-col items-center text-center" style={{ maxWidth: "40rem", margin: "0 auto" }}>
            {/* Spiral logo — aproape de apex */}
            <div className="spiral-hero-pulse" style={{ marginBottom: "3.5rem" }}>
              <Image
                src="/favicon.svg"
                alt="Spirala JobGrade"
                width={64}
                height={64}
                className="opacity-70"
              />
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-[44px] font-semibold leading-[1.15] tracking-[-0.02em] text-indigo-dark" style={{ marginBottom: "1.5rem" }}>
              Începem cu CINE alegi să FII.
            </h2>
            <p className="text-2xl md:text-3xl font-normal text-coral" style={{ marginBottom: "5rem" }}>
              Evoluăm împreună.
            </p>

            {/* CTA-uri — aceeași formă, culori diferite */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
              <Link
                href="/login"
                className="inline-flex items-center justify-center font-semibold text-sm rounded-full shadow-lg hover:bg-indigo-dark hover:shadow-xl transition-all duration-200"
                style={{ width: "155px", height: "40px", backgroundColor: "var(--indigo)", color: "white" }}
              >
                Intră în platformă
              </Link>

              <span
                className="inline-flex items-center justify-center font-semibold text-sm rounded-full shadow-lg cursor-not-allowed"
                style={{ width: "155px", height: "40px", backgroundColor: "var(--coral-light)", color: "rgba(255,255,255,0.8)" }}
              >
                Intră în platformă
              </span>

            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ═══════════════════════════════════════════════════════════
           FOOTER
         ═══════════════════════════════════════════════════════════ */}
      <footer className="bg-indigo-dark text-white">
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
                Începem cu CINE alegi să FII.
                <br />
                Evoluăm împreună.
              </p>
              <p className="text-xs text-white/40">
                &copy; 2026 Psihobusiness Consulting SRL
              </p>
            </div>

            {/* Col 2 — Platformă */}
            <div>
              <h4 className="text-sm font-semibold mb-4 text-white/80">Platformă</h4>
              <ul className="space-y-2.5">
                <li><a href="#poveste" className="text-sm text-white/50 hover:text-white transition-colors duration-200">Povestea</a></li>
                <li><Link href="/login" className="text-sm text-white/50 hover:text-white transition-colors duration-200">Pentru companii</Link></li>
                <li><Link href="/personal" className="text-sm text-white/50 hover:text-white transition-colors duration-200">Pentru tine</Link></li>
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
                <li><Link href="/transparenta-ai" className="text-sm text-white/50 hover:text-white transition-colors duration-200">Transparenta AI</Link></li>
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

          {/* Compliance badges */}
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

      {/* Agent host: SOA — ghid de vânzări pe pagina principală */}
      <ChatWidgetLoader />
    </div>
  )
}
