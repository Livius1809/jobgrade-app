"use client"

import { useState, useEffect } from "react"

interface JournalData {
  session: {
    name: string
    status: string
    createdAt: string
    startedAt: string | null
    completedAt: string | null
    evaluationType: string
  }
  journal: {
    setup: {
      sessionName: string
      createdAt: string
      startedAt: string | null
      evaluationType: string
      members: { name: string; jobTitle: string | null; email: string; joinedAt: string }[]
      jobs: { title: string; department: string | null }[]
    }
    preScoring: {
      evaluator: string
      job: string
      criterion: string
      letter: string
      justification: string | null
      timestamp: string
    }[]
    discussion: {
      author: string
      isAi: boolean
      criterion: string
      content: string
      round: number
      timestamp: string
    }[]
    voting: {
      voter: string
      criterion: string
      letter: string
      round: number
      timestamp: string
    }[]
    mediation: {
      facilitator: string
      criterion: string
      decision: string
      rationale: string
      timestamp: string
    }[]
    validation: {
      member: string
      criterion: string
      preScore: string
      consensus: string
      accepted: boolean
      acceptedAt: string | null
      timestamp: string
    }[]
    consensusResults: {
      criterion: string
      status: string
      finalLetter: string | null
      updatedAt: string
    }[]
  }
  totals: Record<string, number>
}

type Category = "setup" | "preScoring" | "discussion" | "voting" | "mediation" | "validation"

const CATEGORY_LABELS: Record<Category, string> = {
  setup: "Setup",
  preScoring: "Pre-scorare",
  discussion: "Discuție grup",
  voting: "Voturi",
  mediation: "Mediere AI",
  validation: "Validare",
}

interface Props {
  sessionId: string
}

export default function SessionJournal({ sessionId }: Props) {
  const [data, setData] = useState<JournalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<Category>("setup")

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/sessions/${sessionId}/journal`)
        if (res.ok) {
          setData(await res.json())
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!data) return <div className="text-gray-500">Nu s-au putut încărca datele.</div>

  async function handleExportPdf() {
    try {
      const res = await fetch(`/api/v1/sessions/${sessionId}/journal/export-pdf`)
      if (!res.ok) { alert("Eroare la export PDF."); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `jurnal-proces-${sessionId.slice(0, 8)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert("Eroare de rețea.")
    }
  }

  const fmt = (d: string) =>
    new Date(d).toLocaleString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  return (
    <div className="space-y-4">
      {/* Export button */}
      <div className="flex justify-end">
        <button
          onClick={handleExportPdf}
          className="px-4 py-2 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
        >
          Export PDF
        </button>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(data.totals).map(([key, val]) => (
          <div key={key} className="bg-white rounded-lg border border-gray-200 p-3 text-center">
            <div className="text-xl font-bold text-gray-900">{val}</div>
            <div className="text-xs text-gray-500 capitalize">{key}</div>
          </div>
        ))}
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
              activeCategory === cat
                ? "bg-white text-gray-900 font-medium shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Content per category */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {activeCategory === "setup" && (
          <div className="p-5 space-y-4">
            <div className="text-sm text-gray-500">
              Sesiune creată: {fmt(data.journal.setup.createdAt)}
              {data.journal.setup.startedAt && ` · Începută: ${fmt(data.journal.setup.startedAt)}`}
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Membri comisie ({data.journal.setup.members.length})</div>
              <div className="space-y-1">
                {data.journal.setup.members.map((m, i) => (
                  <div key={i} className="text-sm text-gray-600 flex gap-2">
                    <span className="font-medium">{m.name}</span>
                    {m.jobTitle && <span className="text-gray-400">· {m.jobTitle}</span>}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Posturi în evaluare ({data.journal.setup.jobs.length})</div>
              <div className="space-y-1">
                {data.journal.setup.jobs.map((j, i) => (
                  <div key={i} className="text-sm text-gray-600">
                    {j.title} {j.department && <span className="text-gray-400">· {j.department}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeCategory === "preScoring" && (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-600">Evaluator</th>
                  <th className="text-left px-4 py-2 text-gray-600">Post</th>
                  <th className="text-left px-4 py-2 text-gray-600">Criteriu</th>
                  <th className="text-center px-4 py-2 text-gray-600">Litera</th>
                  <th className="text-right px-4 py-2 text-gray-600">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.journal.preScoring.map((e, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-gray-900">{e.evaluator}</td>
                    <td className="px-4 py-2 text-gray-600">{e.job}</td>
                    <td className="px-4 py-2 text-gray-600">{e.criterion}</td>
                    <td className="px-4 py-2 text-center font-bold">{e.letter}</td>
                    <td className="px-4 py-2 text-right text-gray-400 text-xs">{fmt(e.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.journal.preScoring.length === 0 && (
              <div className="text-center text-gray-400 py-8 text-sm">Nicio evaluare înregistrată</div>
            )}
          </div>
        )}

        {activeCategory === "discussion" && (
          <div className="max-h-96 overflow-y-auto p-4 space-y-2">
            {data.journal.discussion.length === 0 ? (
              <div className="text-center text-gray-400 py-8 text-sm">Nicio discuție</div>
            ) : (
              data.journal.discussion.map((c, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    c.isAi ? "bg-purple-50 border border-purple-200" : "bg-gray-50 border border-gray-200"
                  }`}
                >
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span className="font-medium">{c.author} · {c.criterion} · R{c.round}</span>
                    <span>{fmt(c.timestamp)}</span>
                  </div>
                  <div className="text-gray-800">{c.content}</div>
                </div>
              ))
            )}
          </div>
        )}

        {activeCategory === "voting" && (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-600">Votant</th>
                  <th className="text-left px-4 py-2 text-gray-600">Criteriu</th>
                  <th className="text-center px-4 py-2 text-gray-600">Litera</th>
                  <th className="text-center px-4 py-2 text-gray-600">Runda</th>
                  <th className="text-right px-4 py-2 text-gray-600">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.journal.voting.map((v, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 text-gray-900">{v.voter}</td>
                    <td className="px-4 py-2 text-gray-600">{v.criterion}</td>
                    <td className="px-4 py-2 text-center font-bold">{v.letter}</td>
                    <td className="px-4 py-2 text-center">{v.round}</td>
                    <td className="px-4 py-2 text-right text-gray-400 text-xs">{fmt(v.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.journal.voting.length === 0 && (
              <div className="text-center text-gray-400 py-8 text-sm">Niciun vot</div>
            )}
          </div>
        )}

        {activeCategory === "mediation" && (
          <div className="max-h-96 overflow-y-auto p-4 space-y-3">
            {data.journal.mediation.length === 0 ? (
              <div className="text-center text-gray-400 py-8 text-sm">Nicio decizie de mediere</div>
            ) : (
              data.journal.mediation.map((m, i) => (
                <div key={i} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span className="font-medium">{m.facilitator} · {m.criterion}</span>
                    <span>{fmt(m.timestamp)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-bold text-blue-700">Decizie: {m.decision}</span>
                  </div>
                  <div className="text-sm text-gray-700 mt-1">{m.rationale}</div>
                </div>
              ))
            )}
          </div>
        )}

        {activeCategory === "validation" && (
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-600">Membru</th>
                  <th className="text-left px-4 py-2 text-gray-600">Criteriu</th>
                  <th className="text-center px-4 py-2 text-gray-600">Pre-scor</th>
                  <th className="text-center px-4 py-2 text-gray-600">Consens</th>
                  <th className="text-center px-4 py-2 text-gray-600">Status</th>
                  <th className="text-right px-4 py-2 text-gray-600">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.journal.validation.map((v, i) => (
                  <tr key={i} className={v.accepted ? "bg-green-50/50" : ""}>
                    <td className="px-4 py-2 text-gray-900">{v.member}</td>
                    <td className="px-4 py-2 text-gray-600">{v.criterion}</td>
                    <td className="px-4 py-2 text-center font-bold">{v.preScore}</td>
                    <td className="px-4 py-2 text-center font-bold text-blue-700">{v.consensus}</td>
                    <td className="px-4 py-2 text-center">
                      {v.accepted ? (
                        <span className="text-green-600 text-xs font-medium">Acceptat</span>
                      ) : (
                        <span className="text-amber-600 text-xs">În așteptare</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-400 text-xs">
                      {v.acceptedAt ? fmt(v.acceptedAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.journal.validation.length === 0 && (
              <div className="text-center text-gray-400 py-8 text-sm">Nicio validare</div>
            )}
          </div>
        )}
      </div>

      {/* Consensus Results summary */}
      {data.journal.consensusResults.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Rezultate consens</h3>
          <div className="grid grid-cols-3 gap-2">
            {data.journal.consensusResults.map((cr, i) => (
              <div
                key={i}
                className={`rounded-lg px-3 py-2 text-sm ${
                  cr.status === "CONSENSUS" || cr.status === "FACILITATED" || cr.status === "RESOLVED"
                    ? "bg-green-50 border border-green-200"
                    : "bg-gray-50 border border-gray-200"
                }`}
              >
                <div className="font-medium text-gray-900">{cr.criterion}</div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-500">{cr.status}</span>
                  {cr.finalLetter && (
                    <span className="font-bold text-green-700">{cr.finalLetter}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
