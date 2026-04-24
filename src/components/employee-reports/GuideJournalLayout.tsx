"use client"

import { useState, useMemo } from "react"

// ── Tipuri ───────────────────────────────────────────────────
interface JournalEntry {
  id: string
  page: string
  question: string
  answer: string
  helpful: boolean | null
  category: string | null
  delegatedTo: string | null
  createdAt: string
}

interface JournalStats {
  byCategory: { category: string | null; count: number }[]
  byPage: { page: string; count: number }[]
  satisfaction: { helpful: number; notHelpful: number }
}

// ── Mapare pagini la nume prietenoase ────────────────────────
const PAGE_LABELS: Record<string, string> = {
  "/portal": "Dashboard principal",
  "/company": "Profil companie",
  "/jobs": "Posturi de lucru",
  "/sessions": "Sesiuni evaluare",
  "/reports": "Rapoarte",
  "/pay-gap": "Transparenta salariala",
  "/pay-gap/assessments": "Evaluare comuna Art. 10",
  "/employee-portal": "Portal angajati",
  "/settings": "Setari",
  "/settings/roles": "Roluri organizationale",
  "/benchmark": "Benchmark piata",
}

const AGENT_LABELS: Record<string, string> = {
  SOA: "Specialist evaluare",
  CSSA: "Specialist salarizare",
  CSA: "Specialist conformitate",
  HR_COUNSELOR: "Consilier HR",
  Profiler_FrontDesk: "Receptie",
}

// ── Layout 3.2 — Jurnal Ghid JobGrade ────────────────────────
export default function GuideJournalLayout({
  entries,
  stats,
  total,
  onFeedback,
}: {
  entries: JournalEntry[]
  stats: JournalStats
  total: number
  onFeedback?: (id: string, helpful: boolean) => void
}) {
  const [view, setView] = useState<"entries" | "stats" | "recommendations">("entries")
  const [filterPage, setFilterPage] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (filterPage && e.page !== filterPage) return false
      if (filterCategory && e.category !== filterCategory) return false
      return true
    })
  }, [entries, filterPage, filterCategory])

  const satisfactionRate = useMemo(() => {
    const total = stats.satisfaction.helpful + stats.satisfaction.notHelpful
    if (total === 0) return null
    return Math.round((stats.satisfaction.helpful / total) * 100)
  }, [stats])

  // Recomandări contextuale bazate pe frecvența întrebărilor
  const recommendations = useMemo(() => {
    const recs: { title: string; description: string; priority: "high" | "medium" | "low" }[] = []

    // Pagini cu multe întrebări = posibil confuze
    stats.byPage.forEach((p) => {
      if (p.count >= 10) {
        recs.push({
          title: `Pagina "${PAGE_LABELS[p.page] || p.page}" genereaza multe intrebari`,
          description: `${p.count} intrebari — se recomanda imbunatatirea ghidajului contextual sau simplificarea interfetei.`,
          priority: p.count >= 20 ? "high" : "medium",
        })
      }
    })

    // Satisfacție scăzută
    if (satisfactionRate !== null && satisfactionRate < 70) {
      recs.push({
        title: "Rata de satisfactie sub 70%",
        description: `Doar ${satisfactionRate}% din raspunsuri au fost marcate ca utile. Se recomanda rafinarea raspunsurilor Ghidului.`,
        priority: "high",
      })
    }

    // Categorii frecvente = oportunități de instruire
    stats.byCategory
      .filter((c) => c.category && c.count >= 5)
      .forEach((c) => {
        recs.push({
          title: `Intrebari frecvente pe tema "${c.category}"`,
          description: `${c.count} intrebari — se recomanda adaugarea unei sectiuni FAQ dedicata sau a unui tutorial.`,
          priority: c.count >= 15 ? "high" : "low",
        })
      })

    return recs.sort((a, b) => {
      const p = { high: 0, medium: 1, low: 2 }
      return p[a.priority] - p[b.priority]
    })
  }, [stats, satisfactionRate])

  return (
    <div className="max-w-4xl mx-auto">
      {/* ── Header ───────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Jurnal Ghid JobGrade</h1>
            <p className="text-sm text-gray-500 mt-1">
              {total} interactiuni inregistrate — frecventa antreneaza precizia Ghidului
            </p>
          </div>
          {satisfactionRate !== null && (
            <div className="text-center">
              <p className={`text-2xl font-bold ${satisfactionRate >= 80 ? "text-green-600" : satisfactionRate >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                {satisfactionRate}%
              </p>
              <p className="text-xs text-gray-500">satisfactie</p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 bg-gray-100 rounded-lg p-1">
          {([
            { key: "entries", label: "Intrebari si raspunsuri" },
            { key: "stats", label: "Statistici" },
            { key: "recommendations", label: "Recomandari" },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key)}
              className={`flex-1 text-sm py-2 rounded-md transition-colors ${
                view === tab.key
                  ? "bg-white text-indigo-700 font-medium shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              {tab.label}
              {tab.key === "recommendations" && recommendations.length > 0 && (
                <span className="ml-1 bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded-full">
                  {recommendations.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── View: Entries ────────────────────────────── */}
      {view === "entries" && (
        <>
          {/* Filtre */}
          <div className="flex gap-3 mb-4">
            <select
              value={filterPage || ""}
              onChange={(e) => setFilterPage(e.target.value || null)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
            >
              <option value="">Toate paginile</option>
              {stats.byPage.map((p) => (
                <option key={p.page} value={p.page}>
                  {PAGE_LABELS[p.page] || p.page} ({p.count})
                </option>
              ))}
            </select>
            <select
              value={filterCategory || ""}
              onChange={(e) => setFilterCategory(e.target.value || null)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
            >
              <option value="">Toate categoriile</option>
              {stats.byCategory
                .filter((c) => c.category)
                .map((c) => (
                  <option key={c.category} value={c.category!}>
                    {c.category} ({c.count})
                  </option>
                ))}
            </select>
          </div>

          {/* Lista intrări */}
          <div className="space-y-3">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{entry.question}</p>
                    <p className="text-sm text-gray-600 mt-2 leading-relaxed">{entry.answer}</p>
                  </div>
                  {onFeedback && entry.helpful === null && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => onFeedback(entry.id, true)}
                        className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors"
                        title="Util"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onFeedback(entry.id, false)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                        title="Nu a fost util"
                      >
                        <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                        </svg>
                      </button>
                    </div>
                  )}
                  {entry.helpful !== null && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${entry.helpful ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                      {entry.helpful ? "Util" : "Neutil"}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
                  <span>{PAGE_LABELS[entry.page] || entry.page}</span>
                  {entry.category && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span className="bg-gray-100 px-1.5 py-0.5 rounded">{entry.category}</span>
                    </>
                  )}
                  {entry.delegatedTo && (
                    <>
                      <span className="text-gray-300">|</span>
                      <span className="text-indigo-500">
                        {AGENT_LABELS[entry.delegatedTo] || entry.delegatedTo}
                      </span>
                    </>
                  )}
                  <span className="text-gray-300">|</span>
                  <span>{new Date(entry.createdAt).toLocaleDateString("ro-RO")}</span>
                </div>
              </div>
            ))}
            {filteredEntries.length === 0 && (
              <p className="text-center text-sm text-gray-500 py-8">
                Nu exista interactiuni {filterPage || filterCategory ? "cu filtrele selectate" : "inregistrate"}.
              </p>
            )}
          </div>
        </>
      )}

      {/* ── View: Stats ──────────────────────────────── */}
      {view === "stats" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Per pagina */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Intrebari per pagina</h3>
            <div className="space-y-2">
              {stats.byPage.map((p) => {
                const pct = total > 0 ? Math.round((p.count / total) * 100) : 0
                return (
                  <div key={p.page} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-40 truncate">
                      {PAGE_LABELS[p.page] || p.page}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-indigo-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-8 text-right">{p.count}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Per categorie */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Intrebari per categorie</h3>
            <div className="space-y-2">
              {stats.byCategory
                .filter((c) => c.category)
                .map((c) => {
                  const pct = total > 0 ? Math.round((c.count / total) * 100) : 0
                  return (
                    <div key={c.category} className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 w-40 truncate">{c.category}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{c.count}</span>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Satisfactie */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 md:col-span-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Feedback utilizatori</h3>
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-gray-600">
                  Util: <span className="font-medium">{stats.satisfaction.helpful}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-gray-600">
                  Neutil: <span className="font-medium">{stats.satisfaction.notHelpful}</span>
                </span>
              </div>
              {satisfactionRate !== null && (
                <div className="ml-auto">
                  <span className="text-sm text-gray-600">
                    Rata:{" "}
                    <span className={`font-bold ${satisfactionRate >= 80 ? "text-green-600" : satisfactionRate >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                      {satisfactionRate}%
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── View: Recommendations ────────────────────── */}
      {view === "recommendations" && (
        <div className="space-y-3">
          {recommendations.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-sm text-gray-500">
                Nu exista recomandari momentan. Ghidul functioneaza in parametri normali.
              </p>
            </div>
          )}
          {recommendations.map((rec, i) => (
            <div
              key={i}
              className={`bg-white rounded-lg border p-4 ${
                rec.priority === "high"
                  ? "border-red-200 bg-red-50/30"
                  : rec.priority === "medium"
                    ? "border-yellow-200 bg-yellow-50/30"
                    : "border-gray-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    rec.priority === "high" ? "bg-red-500" : rec.priority === "medium" ? "bg-yellow-500" : "bg-gray-400"
                  }`}
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">{rec.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                </div>
              </div>
            </div>
          ))}

          <div className="mt-6 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <h3 className="text-sm font-medium text-indigo-800 mb-2">
              Cum functioneaza feedback loop-ul
            </h3>
            <ul className="text-sm text-indigo-700 space-y-1">
              <li>1. Frecventa intrebarilor per pagina identifica zone confuze</li>
              <li>2. Categoriile frecvente semnaleaza nevoi de instruire</li>
              <li>3. Feedback-ul (util/neutil) rafineaza raspunsurile Ghidului</li>
              <li>4. Rapoartele individuale instruiesc Ghidul pentru contexte similare</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
