import Image from "next/image"
import Link from "next/link"
import { ChatWidgetLoader } from "@/components/chat/ChatWidgetLoader"

export const metadata = {
  title: "JobGrade — Un drum care începe cu tine",
  description: "Un demers evolutiv care începe cu tine. Profilare personalizată, dezvoltare autentică, parcurs ghidat.",
}

/* ═══════════════════════════════════════════════════════════════════════
   CARDURILE B2C — cele 6 straturi ale onion-ului
   Card 3 și Card 6 active by default, restul se activează progresiv
   ═══════════════════════════════════════════════════════════════════════ */

const cards = [
  {
    id: "CARD_6",
    title: "Spune-mi despre mine",
    subtitle: "Profiler AI",
    description: "Profilerul tău personal. Învață despre tine pe măsură ce interacționezi cu el, cu fiecare conversație, fiecare test, fiecare alegere pe care o faci aici. Cu cât interacționezi mai mult, cu atât te vede mai clar, cu atât imaginea ta din oglinda pe care ți-o arată este mai precisă și te poți cunoaște mai bine.",
    active: true,
    color: "coral",
    icon: "/favicon.svg",
    layout: "full" as const, // capac sus — full width
  },
  {
    id: "CARD_3",
    title: "Îmi asum un rol profesional",
    subtitle: "Consilier Carieră AI",
    description: "Evoluția profesională este parte din drumul tău. Aici poți descoperi ce înseamnă să evaluezi cât valorezi din punct de vedere profesional nu numai pentru un job prin care să câștigi bine, ci mai ales pentru a câștiga mai bine, bucurându-te de ceea ce faci.\n\nÎncarcă-ți CV-ul și primești o radiografie a profilului tău pe criterii obiective. Găsește rolurile care ți se potrivesc cu adevărat.",
    active: true,
    color: "indigo",
    icon: "/favicon.svg",
    layout: "half" as const, // stânga sus
  },
  {
    id: "CARD_2",
    title: "Eu și ceilalți, adică NOI",
    subtitle: "Consilier Dezvoltare Personală AI",
    description: `Viața nu poate fi împlinită altfel decât în cadrul relațiilor pe care le construim. Suntem ființe sociale iar interacțiunile cu ceilalți configurează o parte importantă din drumul nostru evolutiv. Vei înțelege diferența dintre „ce trebuie să știu/fac pentru a avea o relație fericită cu X" și „cum pot să evoluez, ca să creez contexte în care tipul de relații dorite să se manifeste".\n\nÎnțelege cum funcționezi în relație cu ceilalți. Construiește o hartă a relațiilor tale și descoperă tiparele care te ajută sau te țin pe loc.`,
    active: false,
    color: "indigo",
    icon: "/favicon.svg",
    layout: "half" as const, // dreapta sus
  },
  {
    id: "CARD_4",
    title: "Oameni de succes, oameni de valoare",
    subtitle: "Coach AI",
    description: `Ce contează cu adevărat? Și pentru cine? Răspunsul la cele două întrebări face diferența. Ele pot fi privite ca etichete atașate oamenilor care adoptă un anumit tip de comportament, au o anume atitudine față de tot și toate. Efectele succesului se văd, se măsoară și se… uită. Efectele valorii se simt; ele construiesc la rândul lor, contexte de evoluție.\n\nA fi om de succes sau unul de valoare este din nou, o chestiune de alegere.\n\nDacă vrei să afli ce înseamnă și ce ți se potrivește, ai ajuns în locul potrivit.`,
    active: false,
    color: "coral",
    icon: "/favicon.svg",
    layout: "half" as const, // stânga jos
  },
  {
    id: "CARD_1",
    title: "Drumul către mine",
    subtitle: "Călăuza AI",
    description: `E timpul să cunoști care este dimensiunea ta cea mai profundă, vom vorbi despre evoluția ta spirituală, dincolo de condiționările pe care societatea ți le-a confecționat de-a lungul existenței tale, de până acum.\n\nAici nu mai lucrezi cu „ce faci" sau cu „cine interacționezi", ci te întâlnești cu „Cine ești", dincolo de roluri și așteptări. Vei afla mult și multe despre esența ta adevărată… Însă explorarea profunzimilor ființei tale nu se termină aici, ci începe… de aici.\n\nSe continuă natural cu experimentarea nemijlocită a celor aflate. Este timpul să trăiești pe viu, experimentând cunoașterea acumulată până acum, însă de data asta împreună și sub îndrumarea directă a Călăuzelor umane. Drumul către TINE continuă, doar CĂLĂUZA se schimbă.`,
    active: false,
    color: "coral",
    icon: "/favicon.svg",
    layout: "half" as const, // dreapta jos
  },
  {
    id: "CARD_5",
    title: "Antreprenoriatul transformațional",
    subtitle: "Coach AI",
    description: `Atunci când tot ceea ce faci se aliniază esenței tale adevărate, redevii autentic, rolurile asumate creează spații de dezvoltare pentru tine și ceilalți. Totul capătă sens, totul are o semnificație, viața devine un scenariu evolutiv iar binele capătă nuanțe și profunzimi pe care nu le bănuiai până acum.\n\nOrice acțiune a ta naște un proiect în care binele se manifestă la niveluri din ce în ce mai cuprinzătoare, care la rândul său generează un alt nivel mai evoluat de… bine. Aici nu vorbim de un bine punctual și limitat în timp ci de baza creării unui nivel de bine care susține viața sub toate formele și aspectele ei și care se auto-propagă.\n\nPune totul cap la cap într-un proiect care contează. Nu vorbim numai de cum să construiești un business, ci mai ales de cum să fii exemplul viu al unui drum evolutiv coerent, care prin contagiune va conta pentru ceilalți.\n\nAici vei experimenta integrarea a tot ceea ce ai descoperit despre tine, pus în slujba unui bine mai înalt, indiferent de finalitatea proiectului tău.`,
    active: false,
    color: "indigo",
    icon: "/favicon.svg",
    layout: "full" as const, // capac jos — full width
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
          <Link href="/" className="flex items-center">
            <Image src="/logo.svg" alt="JobGrade" width={160} height={40} className="h-9 w-auto" />
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
            FII.
          </span>
        </h1>

        <p className="text-justify text-base md:text-lg text-text-secondary leading-relaxed mb-4" style={{ maxWidth: "36rem" }}>
          Un demers evolutiv care începe cu tine. Nu cu un test. Nu cu o etichetă.
          Cu o conversație sinceră despre cine ești și cine vrei să devii.
        </p>

        <p className="text-center text-sm text-text-secondary/60 italic mb-10">
          Evoluăm împreună.
        </p>

        <div className="text-center mb-10" style={{ maxWidth: "36rem" }}>
          <p className="text-lg md:text-xl text-foreground font-medium leading-relaxed mb-4">
            Totul începe cu o crisalidă.
          </p>
          <p className="text-sm text-text-secondary leading-relaxed text-justify mb-4">
            Nu e o rupere de ce ai fost. E o transfigurare a aceleiași esențe.
            Mătasea din care e țesută crisalida este chiar substanța din care
            se naște fluturele.
          </p>
          <p className="text-sm text-text-secondary leading-relaxed text-justify">
            Drumul tău aici e simplu: din crisalidă, prin metamorfoză, ajungi
            un fluture frumos care învață să zboare. La ritmul tău. Cu sprijinul
            nostru. Fără grabă.
          </p>
        </div>

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
              <p className="text-sm text-text-secondary leading-relaxed text-justify">
                Va fi numele tău de crisalidă. Nu avem nevoie de date personale ca să te cunoaștem. Primești o adresă de email pe domeniul nostru.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-coral/10 text-coral font-bold text-lg flex items-center justify-center mx-auto mb-4">2</div>
              <h3 className="font-semibold text-foreground mb-2">Vorbește cu Profiler-ul AI</h3>
              <p className="text-sm text-text-secondary leading-relaxed text-justify">
                Prima conversație. Spune-i ce te aduce aici — sau nu. Te ascultă, te observă și începe să te cunoască odată cu fiecare cuvânt.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-coral/10 text-coral font-bold text-lg flex items-center justify-center mx-auto mb-4">3</div>
              <h3 className="font-semibold text-foreground mb-2">Explorează la ritmul tău</h3>

              <p className="text-sm text-text-secondary leading-relaxed text-justify">
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
          <div className="text-sm text-text-secondary text-justify mb-12 leading-relaxed space-y-4" style={{ maxWidth: "40rem", margin: "0 auto 3rem auto" }}>
            <p>
              Fiecare card reprezintă o dimensiune a existenței tale. Ele sunt
              dimensiuni concentrice. Începem cu nivele mai &bdquo;superficiale&rdquo;
              dar importante, legate de rolurile pe care ți le asumi, profesionale
              și sociale și navigăm împreună către &bdquo;CINE EȘTI TU&rdquo;, cel
              din spatele acestora.
            </p>
            <p>
              Nu este un drum oarecare, este drumul către &bdquo;TINE&rdquo;; noi
              suntem pe rând, doar&hellip; &bdquo;consilieri&rdquo;,
              &bdquo;antrenori&rdquo;, &bdquo;călăuze&rdquo;.
            </p>
            <p>
              Fiecare dintre noi reprezintă de fapt oglinda a ceea ce tu ai
              devenit pe fiecare nivel al existenței tale.
            </p>
            <p>
              Decizia de a merge mai departe este totdeauna, a ta&hellip; Ca și
              alegerile pe care le faci. Și să nu uiți că și atunci când nu știi
              încotro să mergi, este tot alegerea ta, nu faci o
              &bdquo;pauză&rdquo; ci alegi să stagnezi.
            </p>
            <p>
              Scopul nostru este ca tu să-ți trăiești viața conștient și să poți
              extrage sensuri și semnificații folositoare, indiferent de
              împrejurările în care te afli sau de contextele de învățare pe care
              ți le creezi, conștient sau nu.
            </p>
            <p>
              Dacă acesta este și scopul tău, te așteptăm în portal, pentru a
              evolua împreună&hellip;
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cards.map((card) => (
              <div
                key={card.id}
                className={`relative rounded-2xl border p-8 transition-all duration-500 ${
                  card.layout === "full" ? "md:col-span-2" : ""
                } ${
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
                <div className={`text-sm leading-relaxed text-justify space-y-3 ${card.active ? "text-text-secondary" : "text-text-secondary/40"}`}>
                  {card.description.split("\n\n").map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
           CONVERGENȚĂ — înainte de CTA
         ═══════════════════════════════════════════════════════════ */}
      <section className="px-6 py-16 md:py-20 bg-gradient-to-b from-transparent to-coral/3">
        <div className="text-center" style={{ maxWidth: "36rem", margin: "0 auto" }}>
          <div className="w-12 h-0.5 rounded-full bg-gradient-to-r from-coral to-indigo mb-6" style={{ margin: "0 auto 1.5rem auto" }} />
          <p className="text-lg font-semibold text-foreground mb-2">
            Începem cu CINE alegi să FII.
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

      {/* ── Încredere — cine suntem ──────────────────────────── */}
      <section className="px-6 py-12 bg-indigo/3">
        <div className="text-center" style={{ maxWidth: "36rem", margin: "0 auto" }}>
          <p className="text-xs font-bold uppercase tracking-widest text-text-secondary/50 mb-4">
            Cine ne susține
          </p>
          <p className="text-sm text-text-secondary leading-relaxed text-justify mb-3">
            Platforma este dezvoltată de personal acreditat de Colegiul
            Psihologilor din România în domeniul psihologiei muncii,
            transporturilor și serviciilor, cu formare psihanalitică.
          </p>
          <p className="text-sm text-text-secondary leading-relaxed text-justify">
            Toți agenții din platformă sunt agenți AI. Interacțiunile
            sensibile sunt monitorizate automat (SafetyMonitor) iar
            cazurile care necesită atenție suplimentară sunt escaladate
            la personalul uman specializat.
          </p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-4">
          <p className="text-sm">&copy; 2026 Psihobusiness Consulting SRL &middot; CIF RO15790994</p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs">
            <Link href="/termeni" className="hover:text-white transition-colors">Termeni și condiții</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Politica de confidențialitate</Link>
            <Link href="/cookies" className="hover:text-white transition-colors">Cookie-uri</Link>
            <Link href="/transparenta-ai" className="hover:text-white transition-colors">Transparență AI</Link>
          </div>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <span className="border border-slate-700 px-2 py-0.5 rounded text-[10px] text-slate-500">GDPR</span>
            <span className="border border-slate-700 px-2 py-0.5 rounded text-[10px] text-slate-500">AI Act UE</span>
          </div>
        </div>
      </footer>

      {/* Agent host: PROFILER — primul contact pe pagina B2C */}
      <ChatWidgetLoader />
    </div>
  )
}
