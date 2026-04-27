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
  relationships: Relationship[] | null
  createdAt: string
}

interface Result {
  memberCode: string
  memberName: string
  totalScore: number
  preferenceCount: number
  rejectionCount: number
  rank: number
  isIsolated: boolean
  isControversial: boolean
}

interface Relationship {
  from: string
  to: string
  type: "ATTRACTION" | "REJECTION" | "MIXED"
}

export default function SociogramPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [scenario, setScenario] = useState("")
  const [instructions, setInstructions] = useState("")
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newType, setNewType] = useState("DEPARTMENT")
  const [newMembers, setNewMembers] = useState<Array<{ code: string; name: string }>>([{ code: "", name: "" }, { code: "", name: "" }, { code: "", name: "" }])
  const [submitting, setSubmitting] = useState(false)

  const [respondGroup, setRespondGroup] = useState<Group | null>(null)
  const [respondFrom, setRespondFrom] = useState("")
  const [step, setStep] = useState<1 | 2>(1)
  const [choices, setChoices] = useState<Record<string, boolean>>({})
  const [scores, setScores] = useState<Record<string, number>>({})

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
    const valid = newMembers.filter(m => m.code && m.name)
    if (!newName || valid.length < 3) return
    setSubmitting(true)
    await fetch("/api/v1/sociogram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create-group", name: newName, type: newType, members: valid }),
    })
    setShowCreate(false); setNewName(""); setNewMembers([{ code: "", name: "" }, { code: "", name: "" }, { code: "", name: "" }])
    setSubmitting(false); loadData()
  }

  async function submitResponse() {
    if (!respondGroup || !respondFrom) return
    // Construim ratings: scor + isRejection
    const ratings: Record<string, { score: number; isRejection: boolean }> = {}
    for (const [code, isPreferred] of Object.entries(choices)) {
      ratings[code] = { score: scores[code] || 0, isRejection: !isPreferred }
    }
    setSubmitting(true)
    await fetch("/api/v1/sociogram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "submit-response", groupId: respondGroup.id, fromCode: respondFrom, ratings }),
    })
    setRespondGroup(null); setRespondFrom(""); setChoices({}); setScores({}); setStep(1)
    setSubmitting(false); loadData()
  }

  async function finalizeGroup(groupId: string) {
    setSubmitting(true)
    await fetch("/api/v1/sociogram", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ groupId }) })
    setSubmitting(false); loadData()
  }

  const colleagues = respondGroup?.members.filter(m => m.code !== respondFrom) || []
  const N = colleagues.length
  const allMarked = Object.keys(choices).length === N
  const preferred = Object.entries(choices).filter(([_, v]) => v).map(([k]) => k)
  const rejected = Object.entries(choices).filter(([_, v]) => !v).map(([k]) => k)
  const usedScores = Object.values(scores).filter(v => v > 0)
  const hasDuplicates = usedScores.length !== new Set(usedScores).size
  const allScored = usedScores.length === N && !hasDuplicates

  function getName(code: string, group: Group) {
    return group.results?.find(r => r.memberCode === code)?.memberName || group.members.find(m => m.code === code)?.name || code
  }

  const REL_STYLES = {
    ATTRACTION: { label: "Atractie reciproca", color: "text-emerald-700", bg: "bg-emerald-100", icon: "\u2194" },
    REJECTION: { label: "Respingere reciproca", color: "text-red-700", bg: "bg-red-100", icon: "\u2194" },
    MIXED: { label: "Relatie mixta", color: "text-amber-700", bg: "bg-amber-100", icon: "\u21C4" },
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Sociograma echipei</h1>
          <p className="text-sm text-text-secondary mt-1">Preferinte naturale de colaborare intre membrii echipei</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="text-sm font-medium bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors">
          {showCreate ? "Anuleaza" : "Grup nou"}
        </button>
      </div>

      {loading && <p className="text-sm text-text-secondary">Se incarca...</p>}

      {!loading && (
        <>
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
                  <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="ex: Echipa Marketing"
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
                    <input type="text" value={m.code} onChange={e => setNewMembers(prev => prev.map((mm, i) => i === idx ? { ...mm, code: e.target.value } : mm))}
                      placeholder="Cod" className="w-24 px-2 py-1.5 rounded border border-teal-200 bg-white text-xs" />
                    <input type="text" value={m.name} onChange={e => setNewMembers(prev => prev.map((mm, i) => i === idx ? { ...mm, name: e.target.value } : mm))}
                      placeholder="Nume" className="flex-1 px-2 py-1.5 rounded border border-teal-200 bg-white text-xs" />
                  </div>
                ))}
                <button onClick={() => setNewMembers(p => [...p, { code: "", name: "" }])} className="text-[10px] text-teal-600 hover:underline mt-1">+ Adauga membru</button>
              </div>
              <button onClick={createGroup} disabled={submitting || !newName || newMembers.filter(m => m.code && m.name).length < 3}
                className="bg-teal-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">
                {submitting ? "..." : "Creaza grupul"}
              </button>
            </div>
          )}

          {/* Response form */}
          {respondGroup && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-4">
              <h3 className="text-sm font-bold text-amber-800">Completare — {respondGroup.name}</h3>
              <div className="bg-white rounded-lg p-3 border border-amber-100 text-xs text-slate-600 whitespace-pre-line leading-relaxed max-h-36 overflow-y-auto">{scenario}</div>

              <div>
                <label className="block text-xs font-medium mb-1">Cine completeaza?</label>
                <select value={respondFrom} onChange={e => { setRespondFrom(e.target.value); setChoices({}); setScores({}); setStep(1) }}
                  className="w-full px-3 py-2 rounded-lg border border-amber-200 bg-white text-sm">
                  <option value="">Selecteaza...</option>
                  {respondGroup.members.map(m => <option key={m.code} value={m.code}>{m.name}</option>)}
                </select>
              </div>

              {respondFrom && (
                <>
                  <div className="bg-amber-100/50 rounded-lg p-2 text-[10px] text-amber-700">
                    {step === 1
                      ? "PAS 1: Marcheaza cu \u2713 pe cei cu care doresti sa colaborezi si cu \u2717 pe cei cu care nu doresti."
                      : `PAS 2: Acorda fiecarui coleg un scor unic de la ${N} (cel mai preferat) la 1. Toti primesc scor — cei cu \u2717 vor avea un asterisc (*) in raport.`}
                  </div>

                  {/* PAS 1 */}
                  {step === 1 && (
                    <div className="space-y-1">
                      {colleagues.map(m => (
                        <div key={m.code} className="flex items-center justify-between py-2 border-t border-amber-100">
                          <span className="text-xs font-medium">{m.name}</span>
                          <div className="flex gap-2">
                            <button onClick={() => setChoices(p => ({ ...p, [m.code]: true }))}
                              className={`w-10 h-10 rounded-lg text-lg font-bold transition-all ${choices[m.code] === true ? "bg-emerald-500 text-white ring-2 ring-emerald-300" : "bg-white border border-slate-200 text-slate-300"}`}>{"\u2713"}</button>
                            <button onClick={() => setChoices(p => ({ ...p, [m.code]: false }))}
                              className={`w-10 h-10 rounded-lg text-lg font-bold transition-all ${choices[m.code] === false ? "bg-red-500 text-white ring-2 ring-red-300" : "bg-white border border-slate-200 text-slate-300"}`}>{"\u2717"}</button>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-[10px] text-slate-400">{preferred.length} preferinte, {rejected.length} respingeri{allMarked ? "" : ` (mai ai ${N - Object.keys(choices).length})`}</span>
                        <button onClick={() => setStep(2)} disabled={!allMarked}
                          className="bg-amber-600 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-amber-700 disabled:opacity-40 transition-colors">
                          Pasul 2
                        </button>
                      </div>
                    </div>
                  )}

                  {/* PAS 2 */}
                  {step === 2 && (
                    <div className="space-y-3">
                      {/* Preferinte — scoruri mari */}
                      {preferred.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-emerald-700 mb-1 uppercase tracking-wide">{"\u2713"} Preferinte ({preferred.length}) — scoruri mari</p>
                          {preferred.map(code => {
                            const m = colleagues.find(c => c.code === code)
                            return (
                              <div key={code} className="flex items-center justify-between py-1.5 border-t border-emerald-100">
                                <span className="text-xs">{m?.name} <span className="text-emerald-500">{"\u2713"}</span></span>
                                <select value={scores[code] || ""} onChange={e => setScores(p => ({ ...p, [code]: Number(e.target.value) }))}
                                  className="w-14 text-xs text-center border border-emerald-200 rounded px-1 py-1 bg-emerald-50 font-bold text-emerald-700">
                                  <option value="">—</option>
                                  {Array.from({ length: N }, (_, i) => N - i).map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {/* Respingeri — scoruri mici + asterisc */}
                      {rejected.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold text-red-700 mb-1 uppercase tracking-wide">{"\u2717"} Respingeri ({rejected.length}) — scoruri mici, marcate cu *</p>
                          {rejected.map(code => {
                            const m = colleagues.find(c => c.code === code)
                            return (
                              <div key={code} className="flex items-center justify-between py-1.5 border-t border-red-100">
                                <span className="text-xs">{m?.name} <span className="text-red-500">{"\u2717"}</span></span>
                                <div className="flex items-center gap-1">
                                  <select value={scores[code] || ""} onChange={e => setScores(p => ({ ...p, [code]: Number(e.target.value) }))}
                                    className="w-14 text-xs text-center border border-red-200 rounded px-1 py-1 bg-red-50 font-bold text-red-700">
                                    <option value="">—</option>
                                    {Array.from({ length: N }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                                  </select>
                                  <span className="text-red-500 font-bold text-sm">*</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {hasDuplicates && <p className="text-[10px] text-red-600">Fiecare coleg trebuie sa aiba un scor unic.</p>}

                      <div className="flex gap-2 pt-2">
                        <button onClick={() => setStep(1)} className="text-xs text-amber-600 px-3 py-2 hover:underline">Inapoi</button>
                        <button onClick={submitResponse} disabled={submitting || !allScored}
                          className="flex-1 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-40 transition-colors">
                          {submitting ? "..." : "Trimite"}
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
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map(group => {
                const expanded = expandedGroup === group.id
                return (
                  <div key={group.id} className={`rounded-xl border p-4 ${group.status === "COMPLETED" ? "border-emerald-200 bg-emerald-50/30" : "border-teal-200 bg-white"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-sm font-semibold">{group.name}</h3>
                        <span className="text-[10px] text-slate-500">{group.type === "DEPARTMENT" ? "Departament" : "Echipa proiect"} · {group.memberCount} membri</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {group.status === "COLLECTING" && (
                          <>
                            <span className="text-[10px] text-amber-600 font-medium">{group.completionPct}%</span>
                            <button onClick={() => { setRespondGroup(group); setRespondFrom(""); setChoices({}); setScores({}); setStep(1) }}
                              className="text-[10px] px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200">Completeaza</button>
                            {group.responseCount >= 3 && (
                              <button onClick={() => finalizeGroup(group.id)}
                                className="text-[10px] px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200">Finalizeaza</button>
                            )}
                          </>
                        )}
                        {group.status === "COMPLETED" && (
                          <button onClick={() => setExpandedGroup(expanded ? null : group.id)}
                            className="text-[10px] px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200">
                            {expanded ? "Ascunde" : "Rezultate"}
                          </button>
                        )}
                      </div>
                    </div>

                    {group.status === "COLLECTING" && (
                      <div className="w-full h-1.5 rounded-full bg-slate-100 mt-2">
                        <div className="h-full rounded-full bg-teal-400 transition-all" style={{ width: `${group.completionPct}%` }} />
                      </div>
                    )}

                    {expanded && group.results && (
                      <div className="mt-4 pt-3 border-t border-emerald-200 space-y-4">
                        {/* Clasament */}
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-slate-500">
                              <th className="text-left py-1 w-8">#</th>
                              <th className="text-left py-1">Membru</th>
                              <th className="text-center py-1 w-16">Scor</th>
                              <th className="text-center py-1 w-12">{"\u2713"}</th>
                              <th className="text-center py-1 w-12">*</th>
                              <th className="text-center py-1 w-20">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.results.map(r => (
                              <tr key={r.memberCode} className="border-t border-emerald-100">
                                <td className="py-1.5 text-slate-400 font-mono">{r.rank}</td>
                                <td className="py-1.5 font-medium">{r.memberName}</td>
                                <td className="py-1.5 text-center font-bold text-slate-700">{r.totalScore}</td>
                                <td className="py-1.5 text-center text-emerald-600">{r.preferenceCount}</td>
                                <td className="py-1.5 text-center text-red-500">{r.rejectionCount > 0 ? `${r.rejectionCount}*` : "—"}</td>
                                <td className="py-1.5 text-center">
                                  {r.isIsolated && <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">Izolat</span>}
                                  {r.isControversial && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-700">Controversat</span>}
                                  {!r.isIsolated && !r.isControversial && r.rank <= 3 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-700">Preferat</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Relatii reciproce — 3 tipuri */}
                        {group.relationships && group.relationships.length > 0 && (
                          <div className="space-y-2">
                            {(["ATTRACTION", "REJECTION", "MIXED"] as const).map(type => {
                              const rels = group.relationships!.filter(r => r.type === type)
                              if (rels.length === 0) return null
                              const st = REL_STYLES[type]
                              return (
                                <div key={type} className={`p-2 rounded-lg ${st.bg}`}>
                                  <p className={`text-[10px] font-bold ${st.color} mb-1`}>{st.label} ({rels.length})</p>
                                  {rels.map((rel, i) => (
                                    <p key={i} className={`text-[10px] ${st.color}`}>
                                      {getName(rel.from, group)} {st.icon} {getName(rel.to, group)}
                                    </p>
                                  ))}
                                </div>
                              )
                            })}
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
