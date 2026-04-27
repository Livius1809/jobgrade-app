"use client"

import { useState, useEffect } from "react"

interface Group {
  id: string
  name: string
  type: string
  members: Array<{ code: string; name: string }>
  responseCount: number
  memberCount: number
  completionPct: number
  status: string
  results: Result[] | null
  createdAt: string
}

interface Result {
  memberCode: string
  memberName: string
  totalScore: number
  totalPreferences: number
  totalRejections: number
  avgPreferenceRank: number
  avgRejectionRank: number
  reciprocalPrefs: string[]
  reciprocalRejs: string[]
  isIsolated: boolean
  isControversial: boolean
  rank: number
}

export default function SociogramPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [scenario, setScenario] = useState("")
  const [instructions, setInstructions] = useState("")
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Create form
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newType, setNewType] = useState("DEPARTMENT")
  const [newMembers, setNewMembers] = useState<Array<{ code: string; name: string }>>([{ code: "", name: "" }, { code: "", name: "" }, { code: "", name: "" }])
  const [submitting, setSubmitting] = useState(false)

  // Response form — 2 pasi
  const [respondGroup, setRespondGroup] = useState<Group | null>(null)
  const [respondFrom, setRespondFrom] = useState("")
  const [step, setStep] = useState<1 | 2>(1) // pas 1: ✓/✗, pas 2: ranking
  const [choices, setChoices] = useState<Record<string, boolean>>({})    // true=✓, false=✗
  const [rankings, setRankings] = useState<Record<string, number>>({})   // ranking numeric

  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/sociogram")
      const data = await res.json()
      setGroups(data.groups || [])
      setScenario(data.scenario || "")
      setInstructions(data.instructions || "")
      setStats(data.stats || null)
    } catch {}
    setLoading(false)
  }

  async function createGroup() {
    const validMembers = newMembers.filter(m => m.code && m.name)
    if (!newName || validMembers.length < 3) return
    setSubmitting(true)
    await fetch("/api/v1/sociogram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create-group", name: newName, type: newType, members: validMembers }),
    })
    setShowCreate(false)
    setNewName(""); setNewMembers([{ code: "", name: "" }, { code: "", name: "" }, { code: "", name: "" }])
    setSubmitting(false)
    loadData()
  }

  async function submitResponse() {
    if (!respondGroup || !respondFrom) return
    setSubmitting(true)
    await fetch("/api/v1/sociogram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit-response", groupId: respondGroup.id, fromCode: respondFrom, choices, scores: rankings }),
    })
    setRespondGroup(null); setRespondFrom(""); setChoices({}); setRankings({}); setStep(1)
    setSubmitting(false)
    loadData()
  }

  async function finalizeGroup(groupId: string) {
    setSubmitting(true)
    await fetch("/api/v1/sociogram", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId }),
    })
    setSubmitting(false)
    loadData()
  }

  function addMember() {
    setNewMembers(prev => [...prev, { code: "", name: "" }])
  }

  function updateMember(idx: number, field: "code" | "name", value: string) {
    setNewMembers(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m))
  }

  function startResponding(group: Group) {
    setRespondGroup(group)
    setRespondFrom("")
    setChoices({})
    setRankings({})
    setStep(1)
  }

  // Colegi (fara cel care completeaza)
  const colleagues = respondGroup?.members.filter(m => m.code !== respondFrom) || []
  const preferred = Object.entries(choices).filter(([_, v]) => v === true).map(([k]) => k)
  const rejected = Object.entries(choices).filter(([_, v]) => v === false).map(([k]) => k)
  const allMarked = Object.keys(choices).length === colleagues.length
  const allRanked = preferred.every(c => rankings[c] > 0) && rejected.every(c => rankings[c] > 0)

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Sociograma echipei</h1>
          <p className="text-sm text-text-secondary mt-1">Masurare preferinte naturale de colaborare intre membrii echipei</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="text-sm font-medium bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors">
          {showCreate ? "Anuleaza" : "Grup nou"}
        </button>
      </div>

      {loading && <p className="text-sm text-text-secondary">Se incarca...</p>}

      {!loading && (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="rounded-lg px-3 py-2 text-center bg-teal-50">
                <div className="text-lg font-bold text-teal-700">{stats.totalGroups}</div>
                <div className="text-[10px] text-teal-600">Grupuri</div>
              </div>
              <div className="rounded-lg px-3 py-2 text-center bg-amber-50">
                <div className="text-lg font-bold text-amber-700">{stats.collecting}</div>
                <div className="text-[10px] text-amber-600">In colectare</div>
              </div>
              <div className="rounded-lg px-3 py-2 text-center bg-emerald-50">
                <div className="text-lg font-bold text-emerald-700">{stats.completed}</div>
                <div className="text-[10px] text-emerald-600">Finalizate</div>
              </div>
            </div>
          )}

          {/* Create group */}
          {showCreate && (
            <div className="mb-6 rounded-xl border border-teal-200 bg-teal-50 p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Numele grupului</label>
                  <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                    placeholder="ex: Echipa Marketing"
                    className="w-full px-3 py-2 rounded-lg border border-teal-200 bg-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Tip</label>
                  <select value={newType} onChange={e => setNewType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-teal-200 bg-white text-sm">
                    <option value="DEPARTMENT">Departament (permanent)</option>
                    <option value="PROJECT_TEAM">Echipa proiect (temporar)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-2">Membri (minim 3)</label>
                {newMembers.map((m, idx) => (
                  <div key={idx} className="flex gap-2 mb-1">
                    <input type="text" value={m.code} onChange={e => updateMember(idx, "code", e.target.value)}
                      placeholder="Cod" className="w-24 px-2 py-1.5 rounded border border-teal-200 bg-white text-xs" />
                    <input type="text" value={m.name} onChange={e => updateMember(idx, "name", e.target.value)}
                      placeholder="Nume" className="flex-1 px-2 py-1.5 rounded border border-teal-200 bg-white text-xs" />
                  </div>
                ))}
                <button onClick={addMember} className="text-[10px] text-teal-600 hover:underline mt-1">+ Adauga membru</button>
              </div>
              <button onClick={createGroup} disabled={submitting || !newName || newMembers.filter(m => m.code && m.name).length < 3}
                className="bg-teal-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">
                {submitting ? "..." : "Creaza grupul"}
              </button>
            </div>
          )}

          {/* Response form — 2 pasi */}
          {respondGroup && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-4">
              <h3 className="text-sm font-bold text-amber-800">Completare sociograma — {respondGroup.name}</h3>

              {/* Scenariul */}
              <div className="bg-white rounded-lg p-3 border border-amber-100 text-xs text-slate-600 whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto">
                {scenario}
              </div>

              {/* Cine completeaza */}
              <div>
                <label className="block text-xs font-medium mb-1">Cine completeaza?</label>
                <select value={respondFrom} onChange={e => { setRespondFrom(e.target.value); setChoices({}); setRankings({}); setStep(1) }}
                  className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white text-sm">
                  <option value="">Selecteaza...</option>
                  {respondGroup.members.map(m => <option key={m.code} value={m.code}>{m.name}</option>)}
                </select>
              </div>

              {respondFrom && (
                <>
                  {/* Instructiuni */}
                  <div className="bg-amber-100/50 rounded-lg p-2 text-[10px] text-amber-700 whitespace-pre-line">
                    {step === 1
                      ? "PAS 1: Marcheaza cu \u2713 colegii cu care DORESTI sa colaborezi si cu \u2717 pe cei cu care NU doresti."
                      : `PAS 2: Acorda fiecarui coleg un scor unic de la ${colleagues.length} (cel mai preferat) la 1 (cel mai respins). Scorurile mari merg la cei cu \u2713, scorurile mici la cei cu \u2717.`
                    }
                  </div>

                  {/* PAS 1: Checkmark / X */}
                  {step === 1 && (
                    <div className="space-y-1">
                      {colleagues.map(m => (
                        <div key={m.code} className="flex items-center justify-between py-2 border-t border-amber-100">
                          <span className="text-xs font-medium">{m.name}</span>
                          <div className="flex gap-2">
                            <button onClick={() => setChoices(prev => ({ ...prev, [m.code]: true }))}
                              className={`w-10 h-10 rounded-lg text-lg font-bold transition-all ${
                                choices[m.code] === true ? "bg-emerald-500 text-white ring-2 ring-emerald-300" : "bg-white border border-slate-200 text-slate-300 hover:border-emerald-300"
                              }`}>{"\u2713"}</button>
                            <button onClick={() => setChoices(prev => ({ ...prev, [m.code]: false }))}
                              className={`w-10 h-10 rounded-lg text-lg font-bold transition-all ${
                                choices[m.code] === false ? "bg-red-500 text-white ring-2 ring-red-300" : "bg-white border border-slate-200 text-slate-300 hover:border-red-300"
                              }`}>{"\u2717"}</button>
                          </div>
                        </div>
                      ))}

                      <div className="flex justify-between items-center pt-2">
                        <span className="text-[10px] text-slate-400">
                          {preferred.length} preferinte, {rejected.length} respingeri
                          {allMarked ? "" : ` (mai ai de marcat ${colleagues.length - Object.keys(choices).length})`}
                        </span>
                        <button onClick={() => setStep(2)} disabled={!allMarked}
                          className="bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-amber-700 disabled:opacity-40 transition-colors">
                          Pasul 2 — Scorare
                        </button>
                      </div>
                    </div>
                  )}

                  {/* PAS 2: Ranking numeric — o singura scala N la 1 */}
                  {step === 2 && (
                    <div className="space-y-4">
                      <p className="text-xs text-slate-600">
                        Acorda fiecarui coleg un scor unic. Scorurile mari ({colleagues.length}, {colleagues.length - 1}...) pentru preferati, scorurile mici (1, 2...) pentru respinsi.
                      </p>

                      {/* Preferinte (✓) — scoruri mari */}
                      {preferred.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-emerald-700 mb-1 uppercase tracking-wide">
                            {"\u2713"} Preferinte ({preferred.length}) — scoruri mari
                          </p>
                          {preferred.map(code => {
                            const m = colleagues.find(c => c.code === code)
                            return (
                              <div key={code} className="flex items-center justify-between py-1.5 border-t border-emerald-100">
                                <span className="text-xs">{m?.name} <span className="text-emerald-500">{"\u2713"}</span></span>
                                <select value={rankings[code] || ""}
                                  onChange={e => setRankings(prev => ({ ...prev, [code]: Number(e.target.value) }))}
                                  className="w-16 text-xs text-center border border-emerald-200 rounded px-1 py-1 bg-emerald-50">
                                  <option value="">—</option>
                                  {Array.from({ length: colleagues.length }, (_, i) => colleagues.length - i).map(n => (
                                    <option key={n} value={n}>{n}</option>
                                  ))}
                                </select>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Respingeri (✗) — scoruri mici */}
                      {rejected.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-red-700 mb-1 uppercase tracking-wide">
                            {"\u2717"} Respingeri ({rejected.length}) — scoruri mici
                          </p>
                          {rejected.map(code => {
                            const m = colleagues.find(c => c.code === code)
                            return (
                              <div key={code} className="flex items-center justify-between py-1.5 border-t border-red-100">
                                <span className="text-xs">{m?.name} <span className="text-red-500">{"\u2717"}</span></span>
                                <select value={rankings[code] || ""}
                                  onChange={e => setRankings(prev => ({ ...prev, [code]: Number(e.target.value) }))}
                                  className="w-16 text-xs text-center border border-red-200 rounded px-1 py-1 bg-red-50 text-red-700 font-bold">
                                  <option value="">—</option>
                                  {Array.from({ length: colleagues.length }, (_, i) => i + 1).map(n => (
                                    <option key={n} value={n}>-{n}</option>
                                  ))}
                                </select>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Verificare: fiecare scor folosit o singura data */}
                      {(() => {
                        const usedScores = Object.values(rankings).filter(v => v > 0)
                        const duplicates = usedScores.filter((v, i) => usedScores.indexOf(v) !== i)
                        if (duplicates.length > 0) {
                          return <p className="text-[10px] text-red-600">Atentie: scorul {duplicates[0]} este folosit de mai multe ori. Fiecare coleg trebuie sa aiba un scor unic.</p>
                        }
                        return null
                      })()}

                      <div className="flex gap-2 pt-2">
                        <button onClick={() => setStep(1)}
                          className="text-xs text-amber-600 px-3 py-2 hover:underline">
                          Inapoi la Pasul 1
                        </button>
                        <button onClick={submitResponse} disabled={submitting || !allRanked}
                          className="flex-1 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-40 transition-colors">
                          {submitting ? "..." : "Trimite raspunsul"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              <button onClick={() => setRespondGroup(null)} className="text-xs text-amber-600 hover:underline">Inchide</button>
            </div>
          )}

          {/* Lista grupuri */}
          {groups.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-slate-200 bg-slate-50">
              <p className="text-sm text-slate-500">Niciun grup creat.</p>
              <p className="text-xs text-slate-400 mt-1">Creaza un grup (departament sau echipa proiect) pentru a incepe.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map(group => {
                const expanded = expandedGroup === group.id
                return (
                  <div key={group.id} className={`rounded-xl border p-4 ${
                    group.status === "COMPLETED" ? "border-emerald-200 bg-emerald-50/30" : "border-teal-200 bg-white"
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-sm font-semibold">{group.name}</h3>
                        <span className="text-[10px] text-slate-500">
                          {group.type === "DEPARTMENT" ? "Departament" : "Echipa proiect"} · {group.memberCount} membri
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {group.status === "COLLECTING" && (
                          <>
                            <span className="text-[10px] text-amber-600 font-medium">{group.completionPct}% completat</span>
                            <button onClick={() => startResponding(group)}
                              className="text-[10px] px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200">
                              Completeaza
                            </button>
                            {group.responseCount >= 3 && (
                              <button onClick={() => finalizeGroup(group.id)}
                                className="text-[10px] px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                                Finalizeaza
                              </button>
                            )}
                          </>
                        )}
                        {group.status === "COMPLETED" && (
                          <button onClick={() => setExpandedGroup(expanded ? null : group.id)}
                            className="text-[10px] px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                            {expanded ? "Ascunde" : "Vezi rezultate"}
                          </button>
                        )}
                      </div>
                    </div>

                    {group.status === "COLLECTING" && (
                      <div className="w-full h-1.5 rounded-full bg-slate-100 mt-2">
                        <div className="h-full rounded-full bg-teal-400 transition-all" style={{ width: `${group.completionPct}%` }} />
                      </div>
                    )}

                    {/* Rezultate */}
                    {expanded && group.results && (
                      <div className="mt-4 pt-3 border-t border-emerald-200">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-slate-500">
                              <th className="text-left py-1 w-8">#</th>
                              <th className="text-left py-1">Membru</th>
                              <th className="text-center py-1 w-16">Scor</th>
                              <th className="text-center py-1 w-12">{"\u2713"}</th>
                              <th className="text-center py-1 w-12">{"\u2717"}</th>
                              <th className="text-center py-1 w-20">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.results.map(r => (
                              <tr key={r.memberCode} className="border-t border-emerald-100">
                                <td className="py-1.5 text-slate-400 font-mono">{r.rank}</td>
                                <td className="py-1.5 font-medium">{r.memberName}</td>
                                <td className="py-1.5 text-center">
                                  <span className={`font-bold ${r.totalScore > 0 ? "text-emerald-600" : r.totalScore < 0 ? "text-red-600" : "text-slate-400"}`}>
                                    {r.totalScore > 0 ? "+" : ""}{r.totalScore}
                                  </span>
                                </td>
                                <td className="py-1.5 text-center text-emerald-600">{r.totalPreferences}</td>
                                <td className="py-1.5 text-center text-red-600">{r.totalRejections}</td>
                                <td className="py-1.5 text-center">
                                  {r.isIsolated && <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">Izolat</span>}
                                  {r.isControversial && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-700">Controversat</span>}
                                  {!r.isIsolated && !r.isControversial && r.totalScore > 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-700">Preferat</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Perechi reciproce */}
                        {group.results.some(r => r.reciprocalPrefs.length > 0) && (
                          <div className="mt-3 p-2 bg-emerald-100 rounded-lg">
                            <p className="text-[10px] font-bold text-emerald-700 mb-1">Preferinte reciproce (chimie naturala):</p>
                            {group.results.filter(r => r.reciprocalPrefs.length > 0).map(r => (
                              <p key={r.memberCode} className="text-[10px] text-emerald-600">
                                {r.memberName} {"\u2194"} {r.reciprocalPrefs.map(p => group.results?.find(x => x.memberCode === p)?.memberName || p).join(", ")}
                              </p>
                            ))}
                          </div>
                        )}
                        {group.results.some(r => r.reciprocalRejs.length > 0) && (
                          <div className="mt-2 p-2 bg-red-100 rounded-lg">
                            <p className="text-[10px] font-bold text-red-700 mb-1">Respingeri reciproce (tensiuni):</p>
                            {group.results.filter(r => r.reciprocalRejs.length > 0).map(r => (
                              <p key={r.memberCode} className="text-[10px] text-red-600">
                                {r.memberName} {"\u2194"} {r.reciprocalRejs.map(p => group.results?.find(x => x.memberCode === p)?.memberName || p).join(", ")}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
