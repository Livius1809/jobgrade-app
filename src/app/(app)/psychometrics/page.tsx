"use client"

import { useState, useEffect, useRef } from "react"

interface Instrument {
  id: string
  name: string
  provider: string
  type: string
  required: boolean
  description: string
  costPerAdmin: number | null
}

interface Battery {
  jobId: string
  jobTitle: string
  instruments: string[]
  configuredAt: string
}

interface Result {
  employeeCode: string
  employeeName: string
  jobId: string
  instrumentId: string
  status: string
  resultFileName: string | null
  completedAt: string | null
}

export default function PsychometricsPage() {
  const [instruments, setInstruments] = useState<Instrument[]>([])
  const [batteries, setBatteries] = useState<Battery[]>([])
  const [results, setResults] = useState<Result[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"config" | "results">("config")

  // Config form
  const [cfgJobId, setCfgJobId] = useState("")
  const [cfgJobTitle, setCfgJobTitle] = useState("")
  const [cfgInstruments, setCfgInstruments] = useState<string[]>([])
  const [showConfig, setShowConfig] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Assign form
  const [assignJobId, setAssignJobId] = useState("")
  const [assignEmpCode, setAssignEmpCode] = useState("")
  const [assignEmpName, setAssignEmpName] = useState("")
  const [showAssign, setShowAssign] = useState(false)

  // Upload
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadTarget, setUploadTarget] = useState<{ empCode: string; instrId: string; jobId: string } | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/psychometrics")
      const data = await res.json()
      setInstruments(data.instruments || [])
      setBatteries(data.batteries || [])
      setResults(data.results || [])
      setStats(data.stats || null)
    } catch {}
    setLoading(false)
  }

  async function configureBattery() {
    if (!cfgJobId || cfgInstruments.length === 0) return
    setSubmitting(true)
    await fetch("/api/v1/psychometrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "configure-battery", jobId: cfgJobId, jobTitle: cfgJobTitle || cfgJobId, instruments: cfgInstruments }),
    })
    setShowConfig(false)
    setCfgJobId(""); setCfgJobTitle(""); setCfgInstruments([])
    setSubmitting(false)
    loadData()
  }

  async function assignEmployee() {
    if (!assignJobId || !assignEmpCode) return
    setSubmitting(true)
    await fetch("/api/v1/psychometrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "assign-employee", jobId: assignJobId, employeeCode: assignEmpCode, employeeName: assignEmpName }),
    })
    setShowAssign(false)
    setAssignEmpCode(""); setAssignEmpName(""); setAssignJobId("")
    setSubmitting(false)
    loadData()
  }

  async function uploadResult(file: File) {
    if (!uploadTarget) return
    const formData = new FormData()
    formData.append("employeeCode", uploadTarget.empCode)
    formData.append("instrumentId", uploadTarget.instrId)
    formData.append("jobId", uploadTarget.jobId)
    formData.append("file", file)
    await fetch("/api/v1/psychometrics", { method: "POST", body: formData })
    setUploadTarget(null)
    loadData()
  }

  const getInstrName = (id: string) => instruments.find(i => i.id === id)?.name || id

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Baterie psihometrica</h1>
          <p className="text-sm text-text-secondary mt-1">Configurare instrumente per post si administrare per angajat</p>
        </div>
      </div>

      {loading && <p className="text-sm text-text-secondary">Se incarca...</p>}

      {!loading && (
        <>
          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="rounded-lg px-3 py-2 text-center bg-violet-50">
                <div className="text-lg font-bold text-violet-700">{stats.batteriesConfigured}</div>
                <div className="text-[10px] text-violet-600">Baterii configurate</div>
              </div>
              <div className="rounded-lg px-3 py-2 text-center bg-slate-50">
                <div className="text-lg font-bold text-slate-700">{stats.totalAssignments}</div>
                <div className="text-[10px] text-slate-500">Administrari</div>
              </div>
              <div className="rounded-lg px-3 py-2 text-center bg-emerald-50">
                <div className="text-lg font-bold text-emerald-700">{stats.completed}</div>
                <div className="text-[10px] text-emerald-600">Completate</div>
              </div>
              <div className="rounded-lg px-3 py-2 text-center bg-amber-50">
                <div className="text-lg font-bold text-amber-700">{stats.pending}</div>
                <div className="text-[10px] text-amber-600">In asteptare</div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-4 border-b border-border">
            <button onClick={() => setActiveTab("config")}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === "config" ? "border-violet-500 text-violet-700" : "border-transparent text-text-secondary"}`}>
              Configurare baterii
            </button>
            <button onClick={() => setActiveTab("results")}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === "results" ? "border-violet-500 text-violet-700" : "border-transparent text-text-secondary"}`}>
              Rezultate angajati
            </button>
          </div>

          {/* TAB: Configurare baterii per post */}
          {activeTab === "config" && (
            <>
              <div className="flex justify-end mb-4">
                <button onClick={() => setShowConfig(!showConfig)}
                  className="text-sm font-medium bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors">
                  {showConfig ? "Anuleaza" : "Configureaza baterie"}
                </button>
              </div>

              {showConfig && (
                <div className="mb-6 rounded-xl border border-violet-200 bg-violet-50 p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Post (ID sau cod)</label>
                      <input type="text" value={cfgJobId} onChange={e => setCfgJobId(e.target.value)}
                        placeholder="ex: CTO-001"
                        className="w-full px-3 py-2 rounded-lg border border-violet-200 bg-white text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Titlu post</label>
                      <input type="text" value={cfgJobTitle} onChange={e => setCfgJobTitle(e.target.value)}
                        placeholder="ex: Director Tehnic"
                        className="w-full px-3 py-2 rounded-lg border border-violet-200 bg-white text-sm" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-2">Instrumente (obligatorii pre-selectate)</label>
                    <div className="space-y-2">
                      {instruments.map(instr => (
                        <label key={instr.id} className={`flex items-start gap-3 p-2 rounded-lg border ${
                          instr.required ? "border-violet-300 bg-violet-100/50" : "border-slate-200 bg-white"
                        }`}>
                          <input type="checkbox"
                            checked={instr.required || cfgInstruments.includes(instr.id)}
                            disabled={instr.required}
                            onChange={e => {
                              if (e.target.checked) setCfgInstruments(prev => [...prev, instr.id])
                              else setCfgInstruments(prev => prev.filter(id => id !== instr.id))
                            }}
                            className="mt-0.5 rounded border-slate-300" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium">{instr.name}</span>
                              {instr.required && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-violet-200 text-violet-700">OBLIGATORIU</span>}
                              {instr.type === "EXTERNAL" && <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-600">EXTERN</span>}
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">{instr.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button onClick={configureBattery} disabled={submitting || !cfgJobId}
                    className="bg-violet-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
                    {submitting ? "Se salveaza..." : "Salveaza bateria"}
                  </button>
                </div>
              )}

              {/* Lista baterii configurate */}
              {batteries.length === 0 ? (
                <div className="text-center py-12 rounded-xl border border-slate-200 bg-slate-50">
                  <p className="text-sm text-slate-500">Nicio baterie configurata.</p>
                  <p className="text-xs text-slate-400 mt-1">Configureaza ce instrumente se aplica per post.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {batteries.map(bat => (
                    <div key={bat.jobId} className="rounded-xl border border-violet-200 bg-white p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold">{bat.jobTitle}</h3>
                        <span className="text-[10px] text-slate-400">{bat.instruments.length} instrumente</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {bat.instruments.map(instrId => (
                          <span key={instrId} className="text-[9px] px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                            {getInstrName(instrId)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* TAB: Rezultate angajati */}
          {activeTab === "results" && (
            <>
              <div className="flex justify-end mb-4">
                <button onClick={() => setShowAssign(!showAssign)}
                  className="text-sm font-medium bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors">
                  {showAssign ? "Anuleaza" : "Atribuie angajat"}
                </button>
              </div>

              {showAssign && (
                <div className="mb-6 rounded-xl border border-violet-200 bg-violet-50 p-5 space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">Post</label>
                      <select value={assignJobId} onChange={e => setAssignJobId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-violet-200 bg-white text-sm">
                        <option value="">Selecteaza...</option>
                        {batteries.map(b => <option key={b.jobId} value={b.jobId}>{b.jobTitle}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Cod angajat</label>
                      <input type="text" value={assignEmpCode} onChange={e => setAssignEmpCode(e.target.value)}
                        placeholder="ex: ANG001"
                        className="w-full px-3 py-2 rounded-lg border border-violet-200 bg-white text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Nume (optional)</label>
                      <input type="text" value={assignEmpName} onChange={e => setAssignEmpName(e.target.value)}
                        placeholder="ex: Ion Popescu"
                        className="w-full px-3 py-2 rounded-lg border border-violet-200 bg-white text-sm" />
                    </div>
                  </div>
                  <button onClick={assignEmployee} disabled={submitting || !assignJobId || !assignEmpCode}
                    className="bg-violet-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors">
                    {submitting ? "..." : "Atribuie"}
                  </button>
                </div>
              )}

              {/* Lista rezultate per angajat */}
              {results.length === 0 ? (
                <div className="text-center py-12 rounded-xl border border-slate-200 bg-slate-50">
                  <p className="text-sm text-slate-500">Niciun angajat atribuit.</p>
                  <p className="text-xs text-slate-400 mt-1">Configureaza o baterie si atribuie angajati.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Grupare per angajat */}
                  {[...new Set(results.map(r => r.employeeCode))].map(empCode => {
                    const empResults = results.filter(r => r.employeeCode === empCode)
                    const empName = empResults[0]?.employeeName || empCode
                    const allDone = empResults.every(r => r.status === "COMPLETED")

                    return (
                      <div key={empCode} className={`rounded-xl border p-4 ${allDone ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200 bg-white"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold">{empName} <span className="text-slate-400 font-normal">({empCode})</span></h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            allDone ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            {empResults.filter(r => r.status === "COMPLETED").length}/{empResults.length}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {empResults.map(r => {
                            const instr = instruments.find(i => i.id === r.instrumentId)
                            return (
                              <div key={`${r.employeeCode}-${r.instrumentId}`} className="flex items-center justify-between py-1 border-t border-slate-100 first:border-t-0">
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${
                                    r.status === "COMPLETED" ? "bg-emerald-400" :
                                    r.status === "IN_PROGRESS" ? "bg-blue-400" : "bg-slate-300"
                                  }`} />
                                  <span className="text-xs">{instr?.name || r.instrumentId}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {r.resultFileName && (
                                    <span className="text-[9px] text-emerald-600">{r.resultFileName}</span>
                                  )}
                                  {r.status !== "COMPLETED" && instr?.type === "EXTERNAL" && (
                                    <button onClick={() => { setUploadTarget({ empCode: r.employeeCode, instrId: r.instrumentId, jobId: r.jobId }); fileRef.current?.click() }}
                                      className="text-[10px] px-2 py-1 rounded bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors">
                                      Upload PDF
                                    </button>
                                  )}
                                  {r.status !== "COMPLETED" && instr?.type === "INTERNAL" && (
                                    <span className="text-[10px] text-slate-400">In platforma</span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                onChange={e => { if (e.target.files?.[0]) uploadResult(e.target.files[0]) }} />
            </>
          )}
        </>
      )}
    </div>
  )
}
