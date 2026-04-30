import Link from "next/link"

export const metadata = { title: "Ghid sănătate organism — JobGrade" }

export default function HealthGuidePage() {
  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div>
        <Link href="/owner" className="text-sm text-text-secondary hover:text-coral transition-colors">
          ← Owner Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-indigo-dark mt-4 mb-2">
          Ghid interpretare sănătate organism viu
        </h1>
        <p className="text-text-warm">
          Cum citești cele 8 straturi și semnele vitale de pe dashboard.
        </p>
      </div>

      {/* Verdict global */}
      <Section title="Organism Pulse — verdictul global">
        <p className="text-sm text-text-secondary mb-4">
          Panoul de sus agregă testele vital signs într-un singur verdict:
        </p>
        <div className="grid grid-cols-2 gap-3">
          <VerdictCard emoji="🟢" label="ALIVE" desc="Toate semnele vitale în parametri. Organismul funcționează autonom." />
          <VerdictCard emoji="🟡" label="WEAKENED" desc="Funcțional dar cu semne de slăbire. Atenție recomandată." />
          <VerdictCard emoji="🔴" label="CRITICAL" desc="Intervenție urgentă necesară. Funcții vitale compromise." />
          <VerdictCard emoji="⚪" label="NERULAT" desc="Testele vital signs nu au rulat încă." />
        </div>
      </Section>

      {/* Cum citești */}
      <Section title="Cum citești un strat">
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Verde = în parametri normali</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-400" /> Galben = deviație moderată, monitorizează</span>
          <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500" /> Roșu = critic, acțiune imediată</span>
        </div>
      </Section>

      {/* Rezolvare galben */}
      <Section title="Cum se rezolvă un status galben">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm space-y-3 text-text-warm">
          <p>
            Statusurile galbene se <strong>auto-rezolvă</strong> atunci când condiția subiacentă se îmbunătățește
            — de exemplu, un cron rulează cu succes, un task blocat se completează sau o metrică revine în parametri.
          </p>
          <p>
            Dashboard-ul se actualizează la fiecare încărcare a paginii. Nu este necesară nicio acțiune manuală
            pentru a vedea statusul curent — reîncarcă pagina și vezi starea reală.
          </p>
          <p className="text-amber-700 font-medium">
            Dacă un status galben persistă mai mult de 24h, indică o problemă structurală (nu doar de timing)
            — verifică cauza din stratul respectiv și intervino punctual.
          </p>
          <p className="text-xs text-text-secondary italic mt-2">
            Statusurile se actualizează automat la fiecare încărcare a paginii.
          </p>
        </div>
      </Section>

      {/* 8 Straturi */}
      <Section title="Cele 8 straturi">
        <div className="space-y-6">
          <LayerGuide
            icon="👁" name="Conștiință" tag="Awareness"
            question="Organismul vede ce se pe mediul extern?"
            factors={[
              { name: "Semnale 24h", green: "≥1 semnal captat", yellow: "0 (nu vede nimic)", red: "—" },
              { name: "Teme strategice", green: "0 teme critice", yellow: "HIGH prezente", red: "CRITICAL prezente" },
              { name: "Semnale neprocesate", green: "≤10 backlog", yellow: "11-50", red: ">50" },
            ]}
            causeIfRed="Organismul nu percepe mediul extern. Semnale legislative sau competitive pot fi ratate."
            checkFirst="Filtrul signals e pe nivel critical? FLUX-047 e activ?"
            affects="Obiective (nu detectează riscuri) → Acțiune (nu creează tasks reactive)"
          />
          <LayerGuide
            icon="🎯" name="Obiective" tag="Goals"
            question="Obiectivele organizaționale sunt sănătoase?"
            factors={[
              { name: "Active", green: "obiective active", yellow: "—", red: "—" },
              { name: "Sănătate medie", green: "≥60%", yellow: "<60%", red: "—" },
              { name: "Obiective CRITICAL", green: "0", yellow: "—", red: "≥1 în risc CRITICAL" },
            ]}
            causeIfRed="Un obiectiv strategic e sub risc. Termen depășit sau KPI neîndeplinit."
            checkFirst="Care obiectiv e CRITICAL? Termen depășit? Contribuitori inactivi?"
            affects="Acțiune (tasks nu avansează) → Ritm (outcomes sub target)"
          />
          <LayerGuide
            icon="⚡" name="Acțiune" tag="Action"
            question="Organismul FACE ceva concret? Tasks-urile se execută?"
            factors={[
              { name: "Tasks executate 24h", green: ">70% succes rate", yellow: "<70%", red: ">5 eșuate" },
              { name: "Cicluri proactive", green: "≥1 ciclu 24h", yellow: "0 cicluri", red: "—" },
              { name: "Patch-uri pending", green: "0 >24h", yellow: "pending >24h", red: ">3 pending >48h" },
            ]}
            causeIfRed="Organismul e paralizat. Tasks se blochează sau eșuează în serie."
            checkFirst="Toggle Executor activ e ON? Credit API disponibil? Câte tasks FAILED?"
            affects="Metabolism (costuri fără output) → Evoluție (nu se acumulează experiență)"
          />
          <LayerGuide
            icon="⚖️" name="Homeostazie" tag="Homeostasis"
            question="Valorile cheie ale organismului sunt în echilibru?"
            factors={[
              { name: "Targets monitorizate", green: "toate", yellow: "—", red: "—" },
              { name: "Optime", green: "toate în zona optimală", yellow: "WARNING", red: "CRITICAL" },
              { name: "Devieri", green: "0", yellow: "warning prezente", red: "critical prezente" },
            ]}
            causeIfRed="O metrică vitală a depășit pragul critic: cost/zi, latency, error rate."
            checkFirst="Care target a deviat? E cost, latency sau error rate?"
            affects="Metabolism (costuri) → Imunitate (poate indica abuz)"
          />
          <LayerGuide
            icon="🛡" name="Imunitate" tag="Immune"
            question="Există breșuri de securitate sau violări de reguli?"
            factors={[
              { name: "Violări 24h", green: "0", yellow: "HIGH", red: "CRITICAL" },
              { name: "Carantină", green: "0 elemente", yellow: ">0", red: "—" },
            ]}
            causeIfRed="Un agent sau proces a încălcat o regulă critică. Poate fi acces neautorizat sau conținut care încalcă L1."
            checkFirst="Ce regulă s-a încălcat? Care agent? Verifică boundary violations."
            affects="Tot organismul — imunitatea protejează integritatea"
          />
          <LayerGuide
            icon="🔋" name="Metabolism" tag="Metabolism"
            question="Organismul consumă resurse eficient?"
            factors={[
              { name: "Cost 24h", green: "<$10", yellow: "$10-50", red: ">$50" },
              { name: "Bugete depășite", green: "0 agenți", yellow: ">0 peste 100%", red: ">0 peste 120%" },
              { name: "Cron executor", green: "ON", yellow: "—", red: "—" },
            ]}
            causeIfRed="Consum excesiv. Credit API se epuizează rapid. Posibil signals full sau cron prea frecvent."
            checkFirst="Filtrul signals (Focusat vs Complet)? Frecvența cron? Cost/task?"
            affects="Acțiune (executor se oprește la credit zero) → Tot organismul se oprește"
          />
          <LayerGuide
            icon="🧬" name="Evoluție" tag="Evolution"
            question="Organismul crește sau stagnează?"
            factors={[
              { name: "Pruning pending", green: "0 candidați", yellow: "1-10", red: ">10" },
            ]}
            causeIfRed="Există procese sau agenți care nu mai servesc și consumă resurse degeaba."
            checkFirst="Câți agenți inactivi >7 zile? KB entries stale?"
            affects="Metabolism (costuri inutile) → Eficiență generală"
          />
          <LayerGuide
            icon="🕐" name="Ritm" tag="Rhythm"
            question="Organismul are un puls regulat?"
            factors={[
              { name: "Vital signs", green: "ALIVE", yellow: "WEAKENED", red: "CRITICAL" },
              { name: "Outcomes măsurate", green: "toate pe target", yellow: "unele sub target", red: ">50% sub target" },
              { name: "Ritualuri overdue", green: "0", yellow: "1-2 întârziate", red: ">2 întârziate" },
              { name: "Gaps date", green: "0", yellow: ">0 nemăsurate", red: "—" },
            ]}
            causeIfRed="Organismul a pierdut ritmul. Ritualurile nu se mai execută, datele nu se colectează."
            checkFirst="FLUX-024 activ? n8n workflows active? Cicluri proactive configurate?"
            affects="Tot — ritmul e pulsul. Fără ritm, nu există regularitate"
          />
        </div>
      </Section>

      {/* Cascada */}
      <Section title="Cascada tipică de problemă">
        <div className="rounded-xl border border-coral/20 bg-coral/5 p-5 text-sm space-y-2">
          <p className="font-semibold text-coral">Cea mai frecventă cascadă:</p>
          <div className="font-mono text-xs space-y-1 text-text-warm">
            <p>💰 Metabolism ROȘU (credit API epuizat)</p>
            <p className="pl-4">→ ⚡ Acțiune ROȘU (executor oprit)</p>
            <p className="pl-8">→ 🎯 Obiective GALBEN (tasks stagnează)</p>
            <p className="pl-12">→ 🕐 Ritm GALBEN (cicluri nu rulează)</p>
            <p className="pl-16">→ 👁 Conștiință GALBEN (signals neprocesate)</p>
          </div>
          <p className="text-text-secondary mt-3">
            <strong>Fix:</strong> rezolvă cauza de la bază (reîncarcă credit / reduce consum) → totul revine cascadat.
          </p>
        </div>
      </Section>

      {/* Regula de aur */}
      <Section title="Regula de aur">
        <div className="rounded-xl border border-indigo/20 bg-indigo/5 p-5 text-sm text-text-warm">
          <p>
            <strong>Dacă un singur strat e roșu</strong> — caută cauza acolo, fix direct.
          </p>
          <p className="mt-2">
            <strong>Dacă mai multe straturi sunt roșu/galben</strong> — caută cauza în cel de jos
            (Metabolism sau Ritm). De obicei o problemă de resurse sau de ritm se propagă în cascadă în sus.
          </p>
        </div>
      </Section>

      {/* Stare ideală */}
      <Section title="Stare ideală (tot verde)">
        <div className="grid grid-cols-2 gap-2 text-sm text-text-warm">
          <p>👁 <strong>Vede</strong> mediul extern</p>
          <p>🎯 <strong>Știe</strong> unde merge</p>
          <p>⚡ <strong>Face</strong> concret (&gt;70% succes)</p>
          <p>⚖️ <strong>E echilibrat</strong> (zero devieri)</p>
          <p>🛡 <strong>E protejat</strong> (zero violări)</p>
          <p>🔋 <strong>Consumă eficient</strong> (cost sub control)</p>
          <p>🧬 <strong>Evoluează</strong> (KB crește)</p>
          <p>🕐 <strong>Are ritm</strong> (ritualuri la timp)</p>
        </div>
        <p className="mt-4 text-sm text-text-secondary italic">
          Organismul funcționează autonom. Owner observă, validează, dă direcție strategică — nu intervine operațional.
        </p>
      </Section>
    </div>
  )
}

// ── Sub-componente ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary/70 mb-4">{title}</h2>
      {children}
    </section>
  )
}

function VerdictCard({ emoji, label, desc }: { emoji: string; label: string; desc: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-lg font-bold mb-1">{emoji} {label}</p>
      <p className="text-xs text-text-secondary">{desc}</p>
    </div>
  )
}

function LayerGuide({
  icon, name, tag, question, factors, causeIfRed, checkFirst, affects,
}: {
  icon: string
  name: string
  tag: string
  question: string
  factors: { name: string; green: string; yellow: string; red: string }[]
  causeIfRed: string
  checkFirst: string
  affects: string
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <h3 className="text-base font-semibold text-foreground">{name}</h3>
        <span className="text-[10px] text-text-secondary/50 font-mono">({tag})</span>
      </div>
      <p className="text-sm text-indigo font-medium mb-3 italic">{question}</p>

      <table className="w-full text-xs mb-4">
        <thead>
          <tr className="text-text-secondary/60">
            <th className="text-left py-1 font-normal">Sub-factor</th>
            <th className="text-left py-1 font-normal">🟢 Verde</th>
            <th className="text-left py-1 font-normal">🟡 Galben</th>
            <th className="text-left py-1 font-normal">🔴 Roșu</th>
          </tr>
        </thead>
        <tbody>
          {factors.map((f, i) => (
            <tr key={i} className="border-t border-border/30">
              <td className="py-1.5 font-medium text-foreground">{f.name}</td>
              <td className="py-1.5 text-text-secondary">{f.green}</td>
              <td className="py-1.5 text-text-secondary">{f.yellow}</td>
              <td className="py-1.5 text-text-secondary">{f.red}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="space-y-1.5 text-xs">
        <p><span className="font-semibold text-coral">Dacă e roșu:</span> <span className="text-text-secondary">{causeIfRed}</span></p>
        <p><span className="font-semibold text-indigo">Verifică primul:</span> <span className="text-text-secondary">{checkFirst}</span></p>
        <p><span className="font-semibold text-text-secondary/70">Afectează:</span> <span className="text-text-secondary">{affects}</span></p>
      </div>
    </div>
  )
}
