"use client"

import { useState, useMemo } from "react"

/**
 * Layout anunț angajare Art. 5 — Directiva (UE) 2023/970
 *
 * PRINCIPIU: Anunțul NU are date proprii — trage din Fișa de post (Job).
 * Aceleași informații (description, responsibilities, requirements, criterii)
 * sunt narate ca poveste adaptată destinatarului (limbaj, cultură, vârstă).
 *
 * Două surse posibile:
 *  - Post evaluat prin JE → criterii preîncărcate, justificări evaluatori
 *  - Post nou (fișă completată manual sau AI) → criterii selectabile
 *
 * Structură:
 * - Header post + departament + bandă salarială
 * - Configurator narare (profil destinatar + ton)
 * - 6 criterii (fixe din JE sau selectabile)
 * - Previzualizare narare generată (storytelling, nu copie)
 * - Nota legală Art. 5
 */

// ── Tipuri ───────────────────────────────────────────────────
interface JobPostingData {
  title: string
  code?: string
  department?: string
  purpose?: string
  description?: string
  responsibilities?: string
  requirements?: string
  salaryMin?: number
  salaryMax?: number
  currency?: string
  criteriaLevels?: Record<string, string> // ex: { Knowledge: "D", Communications: "C", ... }
  /** True dacă postul a trecut prin Job Evaluation (JE) — criteriile vin din evaluare */
  evaluatedByJE?: boolean
  /** Scorul total din evaluare (dacă există) */
  totalScore?: number
  /** Justificările evaluatorilor per criteriu (pentru narare) */
  criteriaJustifications?: Record<string, string>
}

type GenerationProfile = "junior" | "mid" | "senior" | "executive"
type ToneStyle = "formal" | "accesibil" | "dinamic"

// ── Mapare criterii ──────────────────────────────────────────
const CRITERIA_CONFIG: {
  key: string
  label: string
  legalGroup: string
  icon: string
  levels: { letter: string; label: string; educationHint?: string; experienceHint?: string }[]
}[] = [
  {
    key: "Knowledge",
    label: "Educatie si experienta",
    legalGroup: "Cunostinte si deprinderi profesionale",
    icon: "🎓",
    levels: [
      { letter: "A", label: "Pregatire minimala", educationHint: "Fara cerinte specifice", experienceHint: "Fara experienta" },
      { letter: "B", label: "Studii medii, juniorate", educationHint: "Studii medii (liceu/scoala profesionala)", experienceHint: "6-12 luni experienta in domeniu" },
      { letter: "C", label: "Studii medii + specializare", educationHint: "Studii medii cu specializare sau cursuri", experienceHint: "1-2 ani experienta relevanta" },
      { letter: "D", label: "Studii superioare, mid-level", educationHint: "Studii superioare sau colegiu", experienceHint: "2-3 ani experienta" },
      { letter: "E", label: "Studii universitare, senior", educationHint: "Studii universitare de lunga durata", experienceHint: "4-6 ani experienta relevanta" },
      { letter: "F", label: "Expert, expertiza avansata", educationHint: "Studii universitare + dezvoltare profesionala continua", experienceHint: "8-10 ani experienta, expertiza avansata" },
      { letter: "G", label: "Expert recunoscut, postuniversitar", educationHint: "Studii postuniversitare (master, doctorat)", experienceHint: "Peste 10 ani, expert recunoscut in domeniu" },
    ],
  },
  {
    key: "Communications",
    label: "Comunicare",
    legalGroup: "Cunostinte si deprinderi profesionale",
    icon: "💬",
    levels: [
      { letter: "A", label: "Comunicare de baza" },
      { letter: "B", label: "Comunicare moderata" },
      { letter: "C", label: "Comunicare dezvoltata" },
      { letter: "D", label: "Comunicare avansata" },
      { letter: "E", label: "Comunicare strategica" },
    ],
  },
  {
    key: "ProblemSolving",
    label: "Rezolvarea problemelor",
    legalGroup: "Efort intelectual si/sau fizic",
    icon: "🧩",
    levels: [
      { letter: "A", label: "Probleme simple, repetitive" },
      { letter: "B", label: "Probleme similare, analiza de baza" },
      { letter: "C", label: "Probleme variate, analiza moderata" },
      { letter: "D", label: "Probleme diverse, creativitate" },
      { letter: "E", label: "Probleme complexe, gandire abstracta" },
      { letter: "F", label: "Cercetare si analiza avansata" },
      { letter: "G", label: "Probleme strategice, functie critica" },
    ],
  },
  {
    key: "DecisionMaking",
    label: "Luarea deciziilor",
    legalGroup: "Responsabilitati",
    icon: "⚖️",
    levels: [
      { letter: "A", label: "Decizii simple, proceduri fixe" },
      { letter: "B", label: "Decizii de rutina" },
      { letter: "C", label: "Decizii standard" },
      { letter: "D", label: "Decizii independente" },
      { letter: "E", label: "Decizii complexe, autoritate" },
      { letter: "F", label: "Decizii multiple complexe" },
      { letter: "G", label: "Decizii cu impact strategic" },
    ],
  },
  {
    key: "BusinessImpact",
    label: "Impact asupra afacerii",
    legalGroup: "Responsabilitati",
    icon: "📊",
    levels: [
      { letter: "A", label: "Impact limitat" },
      { letter: "B", label: "Impact minor" },
      { letter: "C", label: "Impact semnificativ" },
      { letter: "D", label: "Impact direct si major" },
    ],
  },
  {
    key: "WorkingConditions",
    label: "Conditii de munca",
    legalGroup: "Conditii de munca",
    icon: "🏗️",
    levels: [
      { letter: "A", label: "Conditii minimale, birou" },
      { letter: "B", label: "Conditii moderate, unele riscuri" },
      { letter: "C", label: "Conditii dificile, presiune constanta" },
    ],
  },
]

// ── Profiluri generaționale/lingvistice ───────────────────────
const GENERATION_PROFILES: Record<GenerationProfile, {
  label: string
  description: string
  toneAdjustment: string
  vocabulary: string[]
  avoid: string[]
}> = {
  junior: {
    label: "Juniori (Gen Z, 20-28 ani)",
    description: "Limbaj accesibil, direct, orientat pe oportunitate de invatare",
    toneAdjustment: "Inlocuieste 'se solicita' cu 'ai nevoie de', 'candidatul ideal' cu 'te potrivesti daca'. Tonul e prietenos si orientat pe dezvoltare.",
    vocabulary: ["oportunitate de invatare", "echipa", "mentoring", "crestere profesionala", "flexibilitate", "mediu colaborativ"],
    avoid: ["se solicita imperios", "minimum X ani experienta in domeniu", "candidatul ideal poseda"],
  },
  mid: {
    label: "Mid-level (Millennials, 28-40 ani)",
    description: "Limbaj profesional dar accesibil, accent pe impact si autonomie",
    toneAdjustment: "Echilibru intre profesionalism si accesibilitate. Accent pe responsabilitate concreta si impact masurabil.",
    vocabulary: ["responsabilitate", "autonomie", "impact", "proiecte", "rezultate masurabile", "dezvoltare continua"],
    avoid: ["junior entry-level", "treburi administrative simple"],
  },
  senior: {
    label: "Seniori (Gen X, 40-55 ani)",
    description: "Limbaj profesional, accent pe expertiza, conducere si stabilitate",
    toneAdjustment: "Tonul e profesional, respectuos, pune accent pe expertiza si leadership. Evita informalitatea excesiva.",
    vocabulary: ["expertiza", "conducere", "strategie", "echipa", "viziune", "experienta substantiala", "responsabilitate sporita"],
    avoid: ["cool", "super", "startup vibe"],
  },
  executive: {
    label: "Executivi (55+ ani, C-level)",
    description: "Limbaj formal dar nu rigid, accent pe viziune strategica si impact organizational",
    toneAdjustment: "Formalitate crescuta, accent pe viziune, impact, reputatie profesionala. Respect si gravitate.",
    vocabulary: ["viziune strategica", "impact organizational", "conducere executiva", "guvernanta", "reputatie profesionala"],
    avoid: ["distractiv", "fun", "energia echipei"],
  },
}

const TONE_STYLES: Record<ToneStyle, { label: string; cssClass: string }> = {
  formal: { label: "Formal (corporatist)", cssClass: "prose-slate" },
  accesibil: { label: "Accesibil (profesional)", cssClass: "prose-indigo" },
  dinamic: { label: "Dinamic (startup/tech)", cssClass: "prose-emerald" },
}

// ── Componenta principală ────────────────────────────────────
export default function JobPostingLayout({
  job,
  companyName,
  jobId,
  narration,
  onGenerate,
}: {
  job: JobPostingData
  companyName: string
  jobId?: string
  narration?: string
  onGenerate?: (config: {
    profile: GenerationProfile
    tone: ToneStyle
    criteriaLevels: Record<string, string>
  }) => void
}) {
  const [exporting, setExporting] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<GenerationProfile>("mid")
  const [selectedTone, setSelectedTone] = useState<ToneStyle>("accesibil")
  const isFromJE = !!job.evaluatedByJE && !!job.criteriaLevels && Object.keys(job.criteriaLevels).length > 0

  const [criteriaLevels, setCriteriaLevels] = useState<Record<string, string>>(
    job.criteriaLevels || {}
  )

  // Determinăm automat profilul din criteriul Knowledge — doar pentru posturi NOI
  // Posturile evaluate prin JE au deja structura textului mapată din evaluare
  const knowledgeLevel = criteriaLevels.Knowledge || ""
  const suggestedProfile = useMemo((): GenerationProfile => {
    if (["A", "B"].includes(knowledgeLevel)) return "junior"
    if (["C", "D"].includes(knowledgeLevel)) return "mid"
    if (["E", "F"].includes(knowledgeLevel)) return "senior"
    if (knowledgeLevel === "G") return "executive"
    return "mid"
  }, [knowledgeLevel])

  // Variante de conținut selectabile per educație/experiență
  const knowledgeCriterion = CRITERIA_CONFIG.find((c) => c.key === "Knowledge")!
  const selectedKnowledgeLevel = knowledgeCriterion.levels.find((l) => l.letter === knowledgeLevel)

  const profileMeta = GENERATION_PROFILES[selectedProfile]

  return (
    <div className="max-w-4xl mx-auto" id="job-posting-pdf">
      {/* ── Export buttons ───────────────────────────── */}
      {jobId && (
        <div className="flex items-center justify-end gap-2 mb-3">
          <button
            onClick={() => window.print()}
            className="text-sm border border-gray-300 text-gray-700 px-4 py-1.5 rounded-lg hover:bg-gray-50"
          >
            Tipareste HTML
          </button>
          <button
            disabled={exporting}
            onClick={async () => {
              setExporting(true)
              try {
                const res = await fetch("/api/v1/job-posting-pdf", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ jobId, narration }),
                })
                if (!res.ok) return
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `anunt-${job.code || "post"}-art5.pdf`
                a.click()
                URL.revokeObjectURL(url)
              } finally {
                setExporting(false)
              }
            }}
            className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {exporting ? "Se genereaza..." : "Descarca PDF"}
          </button>
        </div>
      )}

      {/* ── Header ───────────────────────────────────── */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-t-xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-indigo-200 text-sm font-medium">{companyName}</p>
            <h1 className="text-2xl font-bold mt-1">{job.title}</h1>
            <div className="mt-2 flex items-center gap-3 text-indigo-200 text-sm">
              {job.code && <span>Cod: {job.code}</span>}
              {job.department && (
                <>
                  <span className="text-indigo-400">|</span>
                  <span>{job.department}</span>
                </>
              )}
            </div>
          </div>
          {/* Banda salarială Art. 5 */}
          {job.salaryMin && job.salaryMax && (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 text-center">
              <p className="text-xs text-indigo-200">Banda salariala</p>
              <p className="text-lg font-bold">
                {job.salaryMin.toLocaleString("ro-RO")} – {job.salaryMax.toLocaleString("ro-RO")}
              </p>
              <p className="text-xs text-indigo-200">{job.currency || "RON"} brut/luna</p>
            </div>
          )}
        </div>
        {job.purpose && (
          <p className="mt-3 text-indigo-100 text-sm leading-relaxed">{job.purpose}</p>
        )}
      </div>

      {/* ── Sursa datelor (JE vs. manual) ────────────── */}
      {isFromJE && (
        <div className="bg-emerald-50 border-x border-gray-200 px-5 py-3 flex items-center gap-2 text-sm">
          <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-emerald-700">
            Postul a fost evaluat prin <span className="font-medium">Job Evaluation</span> —
            criteriile sunt preincarcate din evaluare.
            {job.totalScore && (
              <span className="ml-1 text-emerald-600">Scor total: {job.totalScore} puncte.</span>
            )}
          </span>
        </div>
      )}

      {/* ── Configurator generare ─────────────────────── */}
      <div className="bg-white border-x border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          {isFromJE ? "Configurare narare" : "Configurare anunt"}
        </h2>
        {isFromJE && (
          <p className="text-xs text-gray-500 mb-3">
            Criteriile sunt fixe (din evaluare). Alege profilul destinatarului si tonul nararii.
            Textul va fi o poveste adaptata — nu o copie a fiselor de evaluare.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Profil generațional */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              Profil destinatar
              {!isFromJE && knowledgeLevel && (
                <span className="text-indigo-500 ml-1">
                  (sugerat: {GENERATION_PROFILES[suggestedProfile].label.split(" ")[0]})
                </span>
              )}
            </label>
            <select
              value={selectedProfile}
              onChange={(e) => setSelectedProfile(e.target.value as GenerationProfile)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
            >
              {Object.entries(GENERATION_PROFILES).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">{profileMeta.description}</p>
          </div>

          {/* Ton */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Tonul comunicarii</label>
            <select
              value={selectedTone}
              onChange={(e) => setSelectedTone(e.target.value as ToneStyle)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2"
            >
              {Object.entries(TONE_STYLES).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Variante conținut educație/experiență */}
        {selectedKnowledgeLevel && (
          <div className="bg-indigo-50 rounded-lg p-3 mb-4">
            <p className="text-xs font-medium text-indigo-700 mb-1">
              Cerinte educatie si experienta (nivel {selectedKnowledgeLevel.letter})
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-indigo-600 font-medium">Educatie: </span>
                <span className="text-gray-700">{selectedKnowledgeLevel.educationHint}</span>
              </div>
              <div>
                <span className="text-indigo-600 font-medium">Experienta: </span>
                <span className="text-gray-700">{selectedKnowledgeLevel.experienceHint}</span>
              </div>
            </div>
          </div>
        )}

        {/* Adaptare lingvistică */}
        <div className="bg-amber-50 rounded-lg p-3 text-xs">
          <p className="font-medium text-amber-700 mb-1">Adaptare lingvistica activa</p>
          <p className="text-amber-600">{profileMeta.toneAdjustment}</p>
          <div className="mt-2 flex gap-4">
            <div>
              <span className="text-amber-700 font-medium">Vocabular preferat: </span>
              <span className="text-amber-600">{profileMeta.vocabulary.slice(0, 4).join(", ")}</span>
            </div>
            <div>
              <span className="text-amber-700 font-medium">De evitat: </span>
              <span className="text-amber-600">{profileMeta.avoid.slice(0, 2).join(", ")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 6 Criterii scorabile ──────────────────────── */}
      <div className="bg-white border-x border-b border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">
          Criterii obiective de evaluare
        </h2>
        <p className="text-xs text-gray-400 mb-4">
          Conform Directivei (UE) 2023/970, Art. 4 — criterii neutre din punct de vedere al genului
          {isFromJE && " (nivelurile provin din evaluarea postului)"}
        </p>

        <div className="space-y-4">
          {CRITERIA_CONFIG.map((criterion) => {
            const selected = criteriaLevels[criterion.key] || ""
            const selectedLevel = criterion.levels.find((l) => l.letter === selected)
            const justification = job.criteriaJustifications?.[criterion.key]

            return (
              <div key={criterion.key} className={`border rounded-lg p-3 ${
                isFromJE && selected ? "border-emerald-200 bg-emerald-50/30" : "border-gray-200"
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span>{criterion.icon}</span>
                    <span className="text-sm font-medium text-gray-800">{criterion.label}</span>
                    <span className="text-xs text-gray-400">({criterion.legalGroup})</span>
                  </div>
                  {selected && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      isFromJE ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"
                    }`}>
                      Nivel {selected}{isFromJE ? " (evaluat)" : ""}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {criterion.levels.map((level) => (
                    <button
                      key={level.letter}
                      onClick={() => {
                        if (!isFromJE) {
                          setCriteriaLevels((prev) => ({ ...prev, [criterion.key]: level.letter }))
                        }
                      }}
                      disabled={isFromJE}
                      className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                        selected === level.letter
                          ? isFromJE
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-indigo-600 text-white border-indigo-600"
                          : isFromJE
                            ? "bg-gray-50 text-gray-400 border-gray-200 cursor-default"
                            : "bg-white text-gray-600 border-gray-300 hover:border-indigo-300"
                      }`}
                      title={level.label}
                    >
                      {level.letter}
                    </button>
                  ))}
                </div>

                {selectedLevel && (
                  <p className="mt-2 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1">
                    {selectedLevel.label}
                  </p>
                )}

                {/* Justificarea evaluatorilor — doar pentru posturi evaluate prin JE */}
                {isFromJE && justification && (
                  <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 rounded px-2 py-1.5 border border-emerald-100">
                    <span className="font-medium">Context evaluare: </span>
                    {justification}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Sursa: datele din fișa de post ─────────────── */}
      {(job.description || job.responsibilities || job.requirements) && (
        <div className="bg-white border-x border-b border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Date sursa (fisa de post)</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              informatia bruta — nararea se genereaza automat
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Aceste date provin din fisa de post si sunt sursa din care se construieste
            nararea anuntului. Ele NU apar ca atare in anuntul final.
          </p>

          <div className="space-y-3 opacity-75">
            {job.description && (
              <details className="group">
                <summary className="text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-800">
                  Descrierea postului
                </summary>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-gray-200">
                  {job.description}
                </p>
              </details>
            )}
            {job.responsibilities && (
              <details className="group">
                <summary className="text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-800">
                  Responsabilitati
                </summary>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-gray-200">
                  {job.responsibilities}
                </p>
              </details>
            )}
            {job.requirements && (
              <details className="group">
                <summary className="text-xs font-medium text-gray-600 cursor-pointer hover:text-gray-800">
                  Cerinte
                </summary>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed whitespace-pre-wrap pl-3 border-l-2 border-gray-200">
                  {job.requirements}
                </p>
              </details>
            )}
          </div>
        </div>
      )}

      {/* ── Zona narare generată ──────────────────────── */}
      <div className="bg-white border-x border-b border-gray-200 p-5">
        <NarrationPreview
          profile={selectedProfile}
          tone={selectedTone}
          knowledgeLevel={knowledgeLevel}
          job={job}
          isFromJE={isFromJE}
        />
      </div>

      {/* ── Nota legală Art. 5 ────────────────────────── */}
      <div className="bg-gray-50 border-x border-b border-gray-200 rounded-b-xl p-5">
        <div className="flex items-start gap-2 text-xs text-gray-500 mb-3">
          <svg className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="space-y-1">
            <p>
              Conform Art. 5 al Directivei (UE) 2023/970, angajatorul pune la dispozitia
              candidatilor informatii privind nivelul salarial initial sau intervalul acestuia,
              stabilite pe baza unor criterii obiective si neutre din punct de vedere al genului.
            </p>
            <p>
              Nivelul exact al salariului se stabileste in functie de complexitatea postului,
              responsabilitatile aferente, competentele cerute si conditiile de munca —
              fara discriminare.
            </p>
            <p className="font-medium">
              Art. 5 alin. (2): Angajatorul nu solicita informatii privind remuneratia anterioara.
            </p>
          </div>
        </div>

        {/* Buton generare */}
        {onGenerate && (
          <div className="pt-3 border-t border-gray-200">
            <button
              onClick={() => onGenerate({
                profile: selectedProfile,
                tone: selectedTone,
                criteriaLevels,
              })}
              disabled={!isFromJE && Object.keys(criteriaLevels).length < 3}
              className="bg-indigo-600 text-white text-sm px-6 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isFromJE
                ? `Nareaza anuntul (${profileMeta.label.split(" ")[0]}, ${TONE_STYLES[selectedTone].label.split(" ")[0].toLowerCase()})`
                : `Genereaza anunt adaptat (${profileMeta.label.split(" ")[0]}, ${TONE_STYLES[selectedTone].label.split(" ")[0].toLowerCase()})`
              }
            </button>
            {!isFromJE && Object.keys(criteriaLevels).length < 3 && (
              <p className="text-xs text-gray-400 mt-1">Selectati cel putin 3 criterii pentru a genera anuntul.</p>
            )}
            {isFromJE && (
              <p className="text-xs text-gray-400 mt-1">
                Textul va fi o narare adaptata destinatarului — nu o copie a fiselor de evaluare.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Preview narare (structura storytelling) ──────────────────

function NarrationPreview({
  profile,
  tone,
  knowledgeLevel,
  job,
  isFromJE,
}: {
  profile: GenerationProfile
  tone: ToneStyle
  knowledgeLevel: string
  job: JobPostingData
  isFromJE: boolean
}) {
  const profileMeta = GENERATION_PROFILES[profile]
  const knowledgeCriterion = CRITERIA_CONFIG.find((c) => c.key === "Knowledge")!
  const selectedKnowledge = knowledgeCriterion.levels.find((l) => l.letter === knowledgeLevel)

  // Structura storytelling — cum va fi narată informația
  const sections = [
    {
      title: "Deschidere — cine suntem si ce cautam",
      hint: tone === "dinamic"
        ? "Incepe cu o intrebare sau provocare legata de domeniu"
        : tone === "formal"
          ? "Prezentare concisa a companiei si a oportunitatii"
          : "Poveste scurta despre echipa si rolul in organizatie",
      source: "description + purpose",
    },
    {
      title: "Ce vei face — responsabilitatile, narate",
      hint: profile === "junior"
        ? "Accent pe ce va invata, nu pe ce i se cere; activitati concrete, nu abstracte"
        : profile === "executive"
          ? "Accent pe impact strategic, guvernanta, viziune"
          : "Echilibru intre responsabilitate si autonomie; rezultate masurabile",
      source: "responsibilities",
    },
    {
      title: "Ce aduci cu tine — profilul candidatului",
      hint: selectedKnowledge
        ? `Adaptat pentru nivel ${selectedKnowledge.letter}: ${selectedKnowledge.educationHint || ""}, ${selectedKnowledge.experienceHint || ""}`
        : "Se va adapta automat la nivelul de educatie si experienta selectat",
      source: "requirements + Knowledge criterion",
    },
    {
      title: "Ce iti oferim — pachetul si mediul",
      hint: job.salaryMin && job.salaryMax
        ? `Banda salariala ${job.salaryMin.toLocaleString("ro-RO")}–${job.salaryMax.toLocaleString("ro-RO")} ${job.currency || "RON"}, plus beneficii narate`
        : "Banda salariala (Art. 5) + beneficii, narate in limbajul destinatarului",
      source: "salary band + working conditions criterion",
    },
    {
      title: "Inchidere — invitatie la actiune",
      hint: profile === "junior"
        ? "Ton incurajator: 'Daca te-ai regasit, aplica — nu trebuie sa bifezi totul'"
        : profile === "executive"
          ? "Ton profesional: invitatie discreta la dialog confidential"
          : "Ton echilibrat: pasi concreti de aplicare, termen, persoana de contact",
      source: "CTA adaptat",
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">
          Structura nararii
        </h2>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className={`px-2 py-0.5 rounded ${
            profile === "junior" ? "bg-blue-100 text-blue-700" :
            profile === "mid" ? "bg-indigo-100 text-indigo-700" :
            profile === "senior" ? "bg-purple-100 text-purple-700" :
            "bg-slate-100 text-slate-700"
          }`}>
            {profileMeta.label.split("(")[0].trim()}
          </span>
          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-600">
            {TONE_STYLES[tone].label}
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        {isFromJE
          ? "Datele din evaluarea postului se transforma in narare. Fiecare sectiune preia informatia din fisa de post si o reformuleaza ca poveste."
          : "Informatia din fisa de post se transforma in narare adaptata. Selectati criteriile pentru a vedea cum se adapteaza structura."
        }
      </p>

      <div className="space-y-2">
        {sections.map((section, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-3 hover:border-indigo-200 transition-colors">
            <div className="flex items-start gap-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800">{section.title}</p>
                <p className="text-xs text-gray-500 mt-1">{section.hint}</p>
                <p className="text-xs text-gray-400 mt-0.5 italic">
                  Sursa: {section.source}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Vocabular activ */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-4 text-xs">
          <div>
            <span className="text-gray-500">Vocabular activ: </span>
            <span className="text-indigo-600">{profileMeta.vocabulary.join(", ")}</span>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-4 text-xs">
          <div>
            <span className="text-gray-500">Se evita: </span>
            <span className="text-red-400">{profileMeta.avoid.join(", ")}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
