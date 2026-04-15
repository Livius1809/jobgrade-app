"use client"

import { useState, useMemo, useRef, useEffect } from "react"

interface CriterionInfo {
  id: string
  name: string
  shortName: string
  order: number
  subfactors: Array<{
    id: string
    code: string
    points: number
    description: string
  }>
}

interface JobResult {
  jobId: string
  jobTitle: string
  department: string
  selectedSubfactors: Record<string, string> // criterionId → subfactorId
}

interface Props {
  criteria: CriterionInfo[]
  jobs: JobResult[]
  sessionId: string
  canEdit: boolean
}

// Mapare criterii legale
const LEGAL_CRITERIA = [
  { name: "Cunoștințe și deprinderi", criteriaIds: [] as string[], color: "indigo" },
  { name: "Efort intelectual/fizic", criteriaIds: [] as string[], color: "violet" },
  { name: "Responsabilități", criteriaIds: [] as string[], color: "fuchsia" },
  { name: "Condiții de muncă", criteriaIds: [] as string[], color: "slate" },
]

const CRITERIA_SHORT = ["Educ.", "Com.", "Rez.pb.", "Decizii", "Impact", "Condiții"]

export default function JEResultsTable({ criteria, jobs: initialJobs, sessionId, canEdit }: Props) {
  const [jobs, setJobs] = useState(initialJobs)
  const [saving, setSaving] = useState(false)
  const [validated, setValidated] = useState(false)

  // Build lookup: subfactorId → points, code
  const sfLookup = useMemo(() => {
    const map: Record<string, { points: number; code: string; criterionId: string }> = {}
    for (const crit of criteria) {
      for (const sf of crit.subfactors) {
        map[sf.id] = { points: sf.points, code: sf.code, criterionId: crit.id }
      }
    }
    return map
  }, [criteria])

  // Calculate scores
  const scoredJobs = useMemo(() => {
    return jobs.map(job => {
      const criterionScores: Record<string, { points: number; letter: string }> = {}
      let total = 0

      for (const crit of criteria) {
        const sfId = job.selectedSubfactors[crit.id]
        if (sfId && sfLookup[sfId]) {
          const sf = sfLookup[sfId]
          criterionScores[crit.id] = { points: sf.points, letter: sf.code }
          total += sf.points
        } else {
          criterionScores[crit.id] = { points: 0, letter: "—" }
        }
      }

      return { ...job, criterionScores, total }
    }).sort((a, b) => b.total - a.total)
  }, [jobs, criteria, sfLookup])

  const [changeLog, setChangeLog] = useState<Array<{
    timestamp: string; jobTitle: string; criterion: string; from: string; to: string
  }>>([])

  function handleLetterChange(jobId: string, criterionId: string, subfactorId: string) {
    const job = jobs.find(j => j.jobId === jobId)
    const crit = criteria.find(c => c.id === criterionId)
    const oldSfId = job?.selectedSubfactors[criterionId]
    const oldCode = oldSfId ? sfLookup[oldSfId]?.code || "?" : "—"
    const newCode = sfLookup[subfactorId]?.code || "?"

    if (oldCode !== newCode) {
      setChangeLog(prev => [...prev, {
        timestamp: new Date().toLocaleString("ro-RO"),
        jobTitle: job?.jobTitle || "",
        criterion: crit?.name || "",
        from: oldCode,
        to: newCode,
      }])
    }

    setJobs(prev => prev.map(j => {
      if (j.jobId !== jobId) return j
      return { ...j, selectedSubfactors: { ...j.selectedSubfactors, [criterionId]: subfactorId } }
    }))
    setValidated(false)
  }

  async function handleValidate() {
    setSaving(true)
    try {
      await fetch(`/api/v1/sessions/${sessionId}/validate-results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobs: scoredJobs.map(j => ({
            jobId: j.jobId,
            total: j.total,
            subfactors: j.selectedSubfactors,
          })),
          changeLog,
        }),
      })
      setValidated(true)
    } catch (e) {
      console.error("Validation failed:", e)
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Ierarhizarea posturilor</h2>
          <p className="text-sm text-slate-500">
            {canEdit ? "Ajustați nivelul per criteriu dacă e cazul." : ""}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={handleValidate}
            disabled={saving || validated}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              validated
                ? "bg-emerald-100 text-emerald-700"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            } disabled:opacity-50`}
          >
            {validated ? "✓ Raport validat" : saving ? "Se salvează..." : "Validează raportul final"}
          </button>
        )}
      </div>

      {/* Legendă criterii */}
      <div className="bg-slate-50 rounded-lg p-4 text-xs text-slate-500 grid grid-cols-3 sm:grid-cols-6 gap-2">
        {criteria.map((c, i) => (
          <div key={c.id}>
            <span className="font-bold text-slate-700">{CRITERIA_SHORT[i] || c.name}</span>
            <p className="mt-0.5">{c.name}</p>
            <p className="text-slate-400">{c.subfactors.length} niveluri (A–{String.fromCharCode(64 + c.subfactors.length)})</p>
          </div>
        ))}
      </div>

      {/* Tabel */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase w-8">#</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase">Poziție</th>
              <th className="text-right px-4 py-3 text-xs font-bold text-indigo-600 uppercase">Scor</th>
              {criteria.map((c, i) => (
                <th key={c.id} className="text-center px-3 py-3 text-xs font-medium text-slate-500 uppercase" title={c.name}>
                  {CRITERIA_SHORT[i] || c.name.substring(0, 6)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scoredJobs.map((job, rank) => (
              <tr key={job.jobId} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-4 py-3 text-slate-400 font-medium">{rank + 1}</td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{job.jobTitle}</p>
                  {job.department && <p className="text-xs text-slate-400">{job.department}</p>}
                </td>
                <td className="px-4 py-3 text-right font-bold text-indigo-600">{job.total}</td>
                {criteria.map(crit => {
                  const score = job.criterionScores[crit.id]
                  return (
                    <td key={crit.id} className="px-2 py-3 text-center">
                      {canEdit ? (
                        <CriterionDropdown
                          currentSfId={job.selectedSubfactors[crit.id] || ""}
                          currentLetter={score?.letter || "—"}
                          criterionName={crit.name}
                          subfactors={crit.subfactors}
                          onChange={(sfId) => handleLetterChange(job.jobId, crit.id, sfId)}
                        />
                      ) : (
                        <span className="font-bold text-slate-700">
                          {score?.letter || "—"}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Jurnal modificări */}
      {changeLog.length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-amber-700 mb-3">
            Jurnal modificări ({changeLog.length})
          </h3>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {changeLog.map((entry, i) => (
              <div key={i} className="flex items-center gap-3 text-xs text-amber-800">
                <span className="text-amber-500 flex-shrink-0">{entry.timestamp}</span>
                <span className="font-medium">{entry.jobTitle}</span>
                <span className="text-amber-600">{entry.criterion}:</span>
                <span className="line-through text-amber-400">{entry.from}</span>
                <span>→</span>
                <span className="font-bold">{entry.to}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grade salariale */}
      <div className="bg-slate-50 rounded-lg p-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
          Interpretare scoruri → Grade salariale
        </h3>
        <p className="text-xs text-slate-500 mb-2">
          Scorul total determină gradul salarial al poziției. Gradele sunt intervale de punctaj asociate cu intervale salariale orientative.
          Fiecare modificare a nivelului per criteriu este înregistrată automat în jurnalul de audit.
        </p>
      </div>
    </div>
  )
}

// ── Custom dropdown cu descrieri ─────────────────────────────────────

function CriterionDropdown({
  currentSfId, currentLetter, criterionName, subfactors, onChange,
}: {
  currentSfId: string
  currentLetter: string
  criterionName: string
  subfactors: Array<{ id: string; code: string; points: number; description: string }>
  onChange: (sfId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className={`px-2.5 py-1 rounded text-sm font-bold border transition-colors cursor-pointer ${
          open ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"
        }`}
      >
        {currentLetter}
        <svg className="inline-block ml-1 w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <>
          {/* Fade overlay */}
          <div className="fixed inset-0 bg-black/10 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown panel — anchored to table width */}
          <div className="absolute z-50 mt-1 right-0 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
            style={{ width: "min(500px, 90vw)", maxHeight: "320px" }}
          >
            <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-100">
              <p className="text-xs font-bold text-indigo-700">{criterionName}</p>
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: "270px" }}>
              {subfactors.map(sf => (
                <button
                  key={sf.id}
                  onClick={() => { onChange(sf.id); setOpen(false) }}
                  className={`w-full text-left px-3 py-2.5 text-xs transition-colors cursor-pointer flex items-start gap-2 ${
                    sf.id === currentSfId
                      ? "bg-indigo-50 text-indigo-900"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                    sf.id === currentSfId ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    {sf.code}
                  </span>
                  <span className="leading-relaxed">{sf.description}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
