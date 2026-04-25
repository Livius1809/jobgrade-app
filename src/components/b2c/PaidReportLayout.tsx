"use client"

/**
 * Layout-uri pentru conținutul PLĂTIT B2C Card 3
 *
 * Principiu: fiecare pas plătit oferă valoare vizibilă care justifică
 * următorul pas. Clientul simte progres, nu captivitate.
 *
 * 4 layout-uri plătite:
 *   A. Raport compatibilitate (scor 6 criterii + gap analysis)
 *   B. Consiliere interviu (pregătire specifică pe post)
 *   C. Ghid alegere joburi (personalizat pe profil)
 *   D. Trend carieră (proiecții + benchmarks)
 */

// ═══════════════════════════════════════════════════════════════
// A. RAPORT COMPATIBILITATE (plătit — scor detaliat)
// ═══════════════════════════════════════════════════════════════

interface MatchCriterion {
  criterion: string
  label: string
  candidateLevel: string
  jobLevel: string
  match: "ABOVE" | "MATCH" | "CLOSE" | "GAP"
  gap: number
  recommendation: string
}

interface MatchData {
  overallScore: number
  overallMatch: string
  criteria: MatchCriterion[]
  forCandidate: string
}

interface JobInfo {
  title: string
  company?: string
  department?: string
}

const MATCH_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  ABOVE: { label: "Peste cerință", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: "↑" },
  MATCH: { label: "Potrivire exactă", color: "text-indigo-700", bg: "bg-indigo-50 border-indigo-200", icon: "=" },
  CLOSE: { label: "Aproape", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: "~" },
  GAP: { label: "Diferență", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: "↓" },
}

export function CompatibilityReportLayout({
  match,
  job,
}: {
  match: MatchData
  job: JobInfo
}) {
  const aboveCount = match.criteria.filter(c => c.match === "ABOVE").length
  const matchCount = match.criteria.filter(c => c.match === "MATCH").length
  const gapCount = match.criteria.filter(c => c.match === "GAP").length

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden" id="compatibility-report">
      {/* Header cu scor */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-6 text-white text-center">
        <p className="text-indigo-200 text-xs font-medium">Raport compatibilitate</p>
        <p className={`text-5xl font-bold mt-2 ${
          match.overallScore >= 70 ? "text-emerald-300" :
          match.overallScore >= 45 ? "text-amber-300" : "text-red-300"
        }`}>
          {match.overallScore}%
        </p>
        <p className="text-indigo-100 text-sm mt-2">{job.title}</p>
        <p className="text-indigo-300 text-xs">{job.company}{job.department ? ` · ${job.department}` : ""}</p>
      </div>

      {/* Sumar */}
      <div className="px-6 py-4 border-b border-gray-100">
        <p className="text-sm text-gray-700 leading-relaxed">{match.forCandidate}</p>
        <div className="flex gap-4 mt-3">
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-600">{aboveCount + matchCount}</p>
            <p className="text-[10px] text-gray-500">criterii acoperite</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-amber-600">{match.criteria.filter(c => c.match === "CLOSE").length}</p>
            <p className="text-[10px] text-gray-500">aproape</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-red-600">{gapCount}</p>
            <p className="text-[10px] text-gray-500">de dezvoltat</p>
          </div>
        </div>
      </div>

      {/* Criterii detaliate */}
      <div className="px-6 py-4 space-y-3">
        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Analiza pe 6 dimensiuni</p>

        {match.criteria.map(c => {
          const cfg = MATCH_CONFIG[c.match]
          return (
            <div key={c.criterion} className={`rounded-xl border p-4 ${cfg.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${cfg.color}`}>{cfg.icon}</span>
                  <span className="text-sm font-semibold text-gray-900">{c.label}</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.color} ${cfg.bg}`}>
                  {cfg.label}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs mb-2">
                <div>
                  <span className="text-gray-500">Tu: </span>
                  <span className="font-medium text-gray-800">Nivel {c.candidateLevel}</span>
                </div>
                <span className="text-gray-300">→</span>
                <div>
                  <span className="text-gray-500">Post: </span>
                  <span className="font-medium text-gray-800">Nivel {c.jobLevel}</span>
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">{c.recommendation}</p>
            </div>
          )
        })}
      </div>

      {/* Recomandare finală */}
      <div className="bg-indigo-50 px-6 py-4 border-t border-indigo-100">
        {match.overallScore >= 65 ? (
          <>
            <p className="text-sm text-indigo-800 font-medium">Potrivire bună — merită să aplici.</p>
            <p className="text-xs text-indigo-600 mt-1">
              Vrei pregătire specifică pentru interviu pe acest post? Îți arătăm ce întrebări să aștepți și cum să răspunzi.
            </p>
          </>
        ) : match.overallScore >= 45 ? (
          <>
            <p className="text-sm text-amber-800 font-medium">Potrivire parțială — poți să crești.</p>
            <p className="text-xs text-amber-600 mt-1">
              Concentrează-te pe dimensiunile unde ai gap. Un ghid personalizat te poate ajuta să-ți alegi joburile potrivite.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-gray-800 font-medium">Acest post cere competențe pe care le poți dezvolta.</p>
            <p className="text-xs text-gray-600 mt-1">
              Nu e o ușă închisă — e o direcție de creștere. Vrei să explorăm ce posturi se potrivesc mai bine acum?
            </p>
          </>
        )}
      </div>

      {/* Footer legal */}
      <div className="px-6 py-3 text-[10px] text-gray-400">
        Evaluarea se bazează pe criteriile Directivei (UE) 2023/970 — obiective și neutre din punct de vedere al genului.
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// B. CONSILIERE INTERVIU (plătit — pregătire specifică)
// ═══════════════════════════════════════════════════════════════

interface InterviewPrep {
  jobTitle: string
  company?: string
  strengths: string[]          // ce să evidențieze
  watchPoints: string[]        // la ce să fie atent
  likelyQuestions: string[]    // întrebări posibile
  suggestedAnswers: string[]   // direcții de răspuns
  dresscode?: string
  cultureFit?: string
}

export function InterviewPrepLayout({ prep }: { prep: InterviewPrep }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden" id="interview-prep">
      <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-6 py-5 text-white">
        <p className="text-violet-200 text-xs font-medium">Pregătire interviu</p>
        <h2 className="text-lg font-bold mt-1">{prep.jobTitle}</h2>
        {prep.company && <p className="text-violet-200 text-sm">{prep.company}</p>}
      </div>

      <div className="p-6 space-y-5">
        {/* Puncte forte de evidențiat */}
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-2">Ce să evidențiezi</p>
          <div className="space-y-1.5">
            {prep.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-emerald-500 mt-0.5">✓</span>
                <span className="text-gray-700">{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* La ce să fie atent */}
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-2">La ce să fii atent</p>
          <div className="space-y-1.5">
            {prep.watchPoints.map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span className="text-amber-500 mt-0.5">⚠</span>
                <span className="text-gray-700">{w}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Întrebări posibile */}
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-2">Întrebări pe care să te aștepți</p>
          <div className="space-y-3">
            {prep.likelyQuestions.map((q, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3">
                <p className="text-sm font-medium text-gray-800">{q}</p>
                {prep.suggestedAnswers[i] && (
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                    <span className="text-indigo-500 font-medium">Direcție: </span>
                    {prep.suggestedAnswers[i]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Cultura companiei */}
        {prep.cultureFit && (
          <div className="bg-violet-50 rounded-xl p-4">
            <p className="text-xs text-violet-600 font-medium mb-1">Despre cultura companiei</p>
            <p className="text-sm text-violet-800 leading-relaxed">{prep.cultureFit}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// C. GHID ALEGERE JOBURI (plătit — personalizat)
// ═══════════════════════════════════════════════════════════════

interface JobSelectionGuide {
  profileSummary: string
  topCriteria: Array<{ criterion: string; why: string; weight: string }>
  redFlags: string[]
  greenFlags: string[]
  salaryBenchmark?: { min: number; max: number; median: number; currency: string }
  careerPaths: Array<{ direction: string; description: string; fit: "HIGH" | "MEDIUM" | "LOW" }>
}

export function JobSelectionGuideLayout({ guide }: { guide: JobSelectionGuide }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden" id="job-selection-guide">
      <div className="bg-gradient-to-r from-teal-600 to-cyan-700 px-6 py-5 text-white">
        <p className="text-teal-200 text-xs font-medium">Ghid personalizat</p>
        <h2 className="text-lg font-bold mt-1">Cum să-ți alegi joburile</h2>
      </div>

      <div className="p-6 space-y-5">
        <p className="text-sm text-gray-700 leading-relaxed">{guide.profileSummary}</p>

        {/* Ce criterii contează pentru tine */}
        <div>
          <p className="text-sm font-semibold text-gray-900 mb-3">Ce contează pentru tine (în ordinea importanței)</p>
          <div className="space-y-2">
            {guide.topCriteria.map((c, i) => (
              <div key={i} className="flex items-start gap-3 bg-teal-50 rounded-xl p-3">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{c.criterion}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{c.why}</p>
                  <p className="text-[10px] text-teal-600 mt-0.5">Importanță: {c.weight}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Green flags + Red flags */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-emerald-700 mb-2">Semne bune (caută asta)</p>
            {guide.greenFlags.map((f, i) => (
              <p key={i} className="text-xs text-gray-700 flex items-start gap-1.5 mb-1">
                <span className="text-emerald-500">✓</span> {f}
              </p>
            ))}
          </div>
          <div>
            <p className="text-xs font-semibold text-red-700 mb-2">Semne de atenție (evită)</p>
            {guide.redFlags.map((f, i) => (
              <p key={i} className="text-xs text-gray-700 flex items-start gap-1.5 mb-1">
                <span className="text-red-500">✗</span> {f}
              </p>
            ))}
          </div>
        </div>

        {/* Benchmark salarial */}
        {guide.salaryBenchmark && (
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-2">Benchmark salarial pentru profilul tău</p>
            <div className="flex items-center justify-center gap-6">
              <div>
                <p className="text-xs text-gray-500">Minim</p>
                <p className="text-sm font-bold text-gray-700">{guide.salaryBenchmark.min.toLocaleString("ro-RO")}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Median</p>
                <p className="text-lg font-bold text-indigo-600">{guide.salaryBenchmark.median.toLocaleString("ro-RO")}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Maxim</p>
                <p className="text-sm font-bold text-gray-700">{guide.salaryBenchmark.max.toLocaleString("ro-RO")}</p>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{guide.salaryBenchmark.currency} brut/lună</p>
          </div>
        )}

        {/* Direcții de carieră */}
        {guide.careerPaths.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-2">Direcții posibile</p>
            <div className="space-y-2">
              {guide.careerPaths.map((p, i) => (
                <div key={i} className="flex items-start gap-3 border border-gray-200 rounded-lg p-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${
                    p.fit === "HIGH" ? "bg-emerald-100 text-emerald-700" :
                    p.fit === "MEDIUM" ? "bg-amber-100 text-amber-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {p.fit === "HIGH" ? "Se potrivește" : p.fit === "MEDIUM" ? "Posibil" : "Necesită creștere"}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{p.direction}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{p.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
