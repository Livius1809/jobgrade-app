"use client"

/**
 * Layout-uri pentru conținutul GRATUIT B2C Card 3
 *
 * Principiu: clientul dă informație → primește cunoaștere.
 * Fiecare gratuit arată suficientă valoare cât să justifice pasul plătit.
 * Dar niciodată nu simte captivitate — relație onestă.
 *
 * 3 layout-uri gratuite:
 *   A. Profil profesional extras (din CV)
 *   B. Situație posturi disponibile (agregate)
 *   C. Insight-uri puncte forte (din chestionar)
 */

// ═══════════════════════════════════════════════════════════════
// A. PROFIL PROFESIONAL EXTRAS (gratuit — clientul a dat CV)
// ═══════════════════════════════════════════════════════════════

interface ExtractedProfile {
  title?: string
  purpose?: string
  responsibilities?: string
  requirements?: string
  experience?: string
  education?: string
  languages?: string
  criteriaEstimate?: Record<string, string>
}

const CRITERIA_LABELS: Record<string, string> = {
  Knowledge: "Cunoștințe și experiență",
  Communications: "Comunicare",
  ProblemSolving: "Rezolvarea problemelor",
  DecisionMaking: "Luarea deciziilor",
  BusinessImpact: "Impact asupra activității",
  WorkingConditions: "Condiții de lucru",
}

const LEVEL_DESCRIPTIONS: Record<string, string> = {
  A: "Nivel de bază", B: "Nivel începător", C: "Nivel intermediar",
  D: "Nivel avansat", E: "Nivel expert", F: "Nivel expert senior", G: "Expert recunoscut",
}

export function ProfileInsightLayout({ profile }: { profile: ExtractedProfile }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 px-6 py-5 text-white">
        <p className="text-indigo-200 text-xs font-medium">Profilul tău profesional</p>
        <h2 className="text-xl font-bold mt-1">{profile.title || "Profil în construcție"}</h2>
        {profile.purpose && (
          <p className="text-indigo-100 text-sm mt-2 leading-relaxed">{profile.purpose}</p>
        )}
      </div>

      <div className="p-6 space-y-5">
        {/* Experiență + Educație */}
        <div className="grid grid-cols-2 gap-4">
          {profile.experience && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1">Experiență</p>
              <p className="text-sm text-gray-800 leading-relaxed">{profile.experience}</p>
            </div>
          )}
          {profile.education && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-1">Educație</p>
              <p className="text-sm text-gray-800 leading-relaxed">{profile.education}</p>
            </div>
          )}
        </div>

        {/* Ce faci cel mai bine */}
        {profile.responsibilities && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-2">Ce faci cel mai bine</p>
            <div className="space-y-1.5">
              {profile.responsibilities.split(";").map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-indigo-400 mt-0.5">•</span>
                  <span className="text-gray-700">{r.trim()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 6 Dimensiuni — vizualizare prietenoasă */}
        {profile.criteriaEstimate && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium mb-3">
              Profilul tău pe 6 dimensiuni
            </p>
            <div className="space-y-2">
              {Object.entries(profile.criteriaEstimate).map(([key, level]) => {
                const idx = "ABCDEFG".indexOf(level)
                const pct = idx >= 0 ? Math.round(((idx + 1) / 7) * 100) : 0
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className="text-gray-600">{CRITERIA_LABELS[key] || key}</span>
                      <span className="text-gray-400">{LEVEL_DESCRIPTIONS[level] || level}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all"
                        style={{ width: `${Math.max(pct, 5)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-[10px] text-gray-400 mt-3">
              Aceste estimări sunt orientative, bazate pe CV-ul tău.
              Pentru o evaluare precisă pe un post specific, verifică compatibilitatea.
            </p>
          </div>
        )}

        {/* Limbi */}
        {profile.languages && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Limbi:</span>
            <span className="text-xs text-gray-700">{profile.languages}</span>
          </div>
        )}
      </div>

      {/* CTA spre plătit */}
      <div className="bg-indigo-50 px-6 py-4 border-t border-indigo-100">
        <p className="text-sm text-indigo-800 font-medium">
          Vrei să afli cum te potrivești pe un post concret?
        </p>
        <p className="text-xs text-indigo-600 mt-1">
          Verifică compatibilitatea — scor detaliat pe cele 6 dimensiuni, cu recomandări concrete.
        </p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// B. SITUAȚIE POSTURI DISPONIBILE (gratuit — din surse publice + B2B)
// ═══════════════════════════════════════════════════════════════

interface JobSummary {
  id: string
  title: string
  company?: string
  department?: string
  purpose?: string
  salaryMin?: number
  salaryMax?: number
}

export function JobsOverviewLayout({
  jobs,
  profileTitle,
  onCheckMatch,
}: {
  jobs: JobSummary[]
  profileTitle?: string
  onCheckMatch?: (jobId: string) => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">Posturi disponibile</h2>
        <p className="text-sm text-gray-500 mt-1">
          {jobs.length > 0
            ? `${jobs.length} posturi de la companii care evaluează corect${profileTitle ? ` — relevante pentru profilul tău (${profileTitle})` : ""}.`
            : "Momentan nu sunt posturi disponibile. Revino curând."}
        </p>
      </div>

      <div className="divide-y divide-gray-50">
        {jobs.map(job => (
          <div key={job.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900">{job.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {job.company}{job.department ? ` · ${job.department}` : ""}
                </p>
                {job.purpose && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{job.purpose}</p>
                )}
                {job.salaryMin && job.salaryMax && (
                  <p className="text-xs text-indigo-600 font-medium mt-1">
                    {job.salaryMin.toLocaleString("ro-RO")} – {job.salaryMax.toLocaleString("ro-RO")} RON
                  </p>
                )}
              </div>
              {onCheckMatch && (
                <button
                  onClick={() => onCheckMatch(job.id)}
                  className="shrink-0 text-xs bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Verifică potrivirea
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {jobs.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-gray-400">Revino curând — posturile se actualizează periodic.</p>
        </div>
      )}

      {/* Notă */}
      <div className="bg-gray-50 px-6 py-3 text-[10px] text-gray-400">
        Posturile sunt de la companii care folosesc evaluarea JobGrade — criterii obiective și neutre.
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// C. INSIGHT-URI PUNCTE FORTE (gratuit — din chestionar)
// ═══════════════════════════════════════════════════════════════

interface QuestionnaireInsight {
  experienceLevel: string
  contractType: string
  relocation: string
  geography: string
  salaryExpectation: string
}

const EXP_LABELS: Record<string, { label: string; insight: string }> = {
  junior: {
    label: "La început de drum",
    insight: "Ești în faza de explorare — cel mai important acum e să descoperi ce te pasionează, nu să cauți perfecțiunea. Fiecare experiență contează.",
  },
  mid: {
    label: "Experiență solidă",
    insight: "Ai fundament. Acum e momentul să te întrebi: fac ce mă împlinește, sau fac ce știu să fac? Diferența asta contează.",
  },
  senior: {
    label: "Expert în domeniu",
    insight: "Expertiza ta e valoroasă. Întrebarea e: vrei să o aprofundezi sau vrei să o extinzi? Ambele sunt corecte.",
  },
  executive: {
    label: "Nivel executiv",
    insight: "La nivelul tău, nu mai cauți un job — cauți un context în care poți avea impact real. Și contextul contează mai mult decât titlul.",
  },
}

export function QuestionnaireInsightLayout({ data }: { data: QuestionnaireInsight }) {
  const exp = EXP_LABELS[data.experienceLevel]

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-5 border-b border-emerald-100">
        <p className="text-emerald-600 text-xs font-medium">Insight din răspunsurile tale</p>
        <h2 className="text-lg font-bold text-gray-900 mt-1">{exp?.label || data.experienceLevel}</h2>
      </div>

      <div className="p-6 space-y-4">
        {/* Insight principal */}
        {exp && (
          <div className="bg-emerald-50 rounded-xl p-4">
            <p className="text-sm text-emerald-800 leading-relaxed">{exp.insight}</p>
          </div>
        )}

        {/* Detalii */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Colaborare dorită</p>
            <p className="text-sm text-gray-800 mt-0.5">{
              data.contractType === "full-time" ? "Angajare normă întreagă" :
              data.contractType === "part-time" ? "Part-time" :
              data.contractType === "freelance" ? "Freelance / proiecte" :
              "Deschis la variante"
            }</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Relocare</p>
            <p className="text-sm text-gray-800 mt-0.5">{
              data.relocation === "da" ? "Deschis la relocare" :
              data.relocation === "nu" ? "Preferă zona actuală" :
              "Depinde de oportunitate"
            }</p>
          </div>
          {data.geography && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Zonă preferată</p>
              <p className="text-sm text-gray-800 mt-0.5">{data.geography}</p>
            </div>
          )}
          {data.salaryExpectation && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Așteptări salariale</p>
              <p className="text-sm text-gray-800 mt-0.5">{data.salaryExpectation}</p>
            </div>
          )}
        </div>
      </div>

      {/* CTA spre plătit */}
      <div className="bg-emerald-50 px-6 py-4 border-t border-emerald-100">
        <p className="text-sm text-emerald-800 font-medium">
          Vrei un ghid personalizat — cum să-ți alegi joburile?
        </p>
        <p className="text-xs text-emerald-600 mt-1">
          Pe baza profilului tău, îți arătăm ce criterii contează cu adevărat pentru tine.
        </p>
      </div>
    </div>
  )
}
