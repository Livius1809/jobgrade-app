"use client"

import { useState, useEffect } from "react"

interface GroupStat {
  groupLabel: string
  count: number
  avgSalary: number
  medianSalary: number
}

interface Dimension {
  name: string
  label: string
  source: string
  groups: GroupStat[]
  maxGapPct: number
  gapStatus: string
}

const GAP_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  OK: { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", label: "OK" },
  ATTENTION: { color: "text-amber-700", bg: "bg-amber-50 border-amber-200", label: "Atentie" },
  CRITICAL: { color: "text-red-700", bg: "bg-red-50 border-red-200", label: "Critic" },
}

export default function EquityPage() {
  const [dimensions, setDimensions] = useState<Dimension[]>([])
  const [stats, setStats] = useState<any>(null)
  const [employeeCount, setEmployeeCount] = useState(0)
  const [message, setMessage] = useState("")
  const [extraAvailable, setExtraAvailable] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedDim, setExpandedDim] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/compliance/equity")
      const data = await res.json()
      setDimensions(data.dimensions || [])
      setStats(data.stats || null)
      setEmployeeCount(data.employeeCount || 0)
      setMessage(data.message || "")
      setExtraAvailable(data.extraDimensionsAvailable || [])
    } catch {}
    setLoading(false)
  }

  function formatSalary(val: number): string {
    return val.toLocaleString("ro-RO") + " RON"
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-xl font-bold text-foreground mb-1">Raport echitate interna</h1>
      <p className="text-sm text-text-secondary mb-6">Analiza gap salarial pe multiple dimensiuni — conformitate Directiva EU 2023/970</p>

      {loading && <p className="text-sm text-text-secondary">Se incarca...</p>}

      {!loading && employeeCount === 0 && (
        <div className="text-center py-12 rounded-xl border border-slate-200 bg-slate-50">
          <p className="text-sm text-slate-500">Nu exista date salariale.</p>
          <p className="text-xs text-slate-400 mt-2">Importa statul de salarii din sectiunea "Stat salarii" din portal.</p>
        </div>
      )}

      {!loading && employeeCount > 0 && (
        <>
          {/* Mesaj sumar */}
          <div className={`mb-6 p-4 rounded-xl border ${
            stats?.critical > 0 ? "bg-red-50 border-red-200" :
            stats?.attention > 0 ? "bg-amber-50 border-amber-200" :
            "bg-emerald-50 border-emerald-200"
          }`}>
            <p className={`text-sm font-medium ${
              stats?.critical > 0 ? "text-red-700" :
              stats?.attention > 0 ? "text-amber-700" :
              "text-emerald-700"
            }`}>{message}</p>
            <p className="text-[10px] text-slate-500 mt-1">{employeeCount} angajati analizati pe {stats?.totalDimensions || 0} dimensiuni ({stats?.autoDimensions || 0} automate + {stats?.clientDimensions || 0} de la dvs.)</p>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-4 gap-3 mb-6">
              <div className="rounded-lg px-3 py-2 text-center bg-slate-50">
                <div className="text-lg font-bold text-slate-700">{stats.totalDimensions}</div>
                <div className="text-[10px] text-slate-500">Dimensiuni</div>
              </div>
              <div className="rounded-lg px-3 py-2 text-center bg-emerald-50">
                <div className="text-lg font-bold text-emerald-700">{stats.ok}</div>
                <div className="text-[10px] text-emerald-600">OK (&lt;5%)</div>
              </div>
              <div className="rounded-lg px-3 py-2 text-center bg-amber-50">
                <div className="text-lg font-bold text-amber-700">{stats.attention}</div>
                <div className="text-[10px] text-amber-600">Atentie (5-10%)</div>
              </div>
              <div className="rounded-lg px-3 py-2 text-center bg-red-50">
                <div className="text-lg font-bold text-red-700">{stats.critical}</div>
                <div className="text-[10px] text-red-600">Critic (&gt;10%)</div>
              </div>
            </div>
          )}

          {/* Dimensiuni extra disponibile */}
          {extraAvailable.length > 0 && (
            <div className="mb-6 p-3 rounded-lg bg-indigo-50 border border-indigo-200">
              <p className="text-xs text-indigo-700">
                <strong>Puteti adauga dimensiuni suplimentare:</strong> {extraAvailable.map(d => {
                  const labels: Record<string, string> = { vechime: "Vechime", nivel: "Nivel ierarhic", varsta: "Grupa varsta", studii: "Nivel studii" }
                  return labels[d] || d
                }).join(", ")}. Completati datele per angajat pentru o analiza mai precisa.
              </p>
            </div>
          )}

          {/* Lista dimensiuni */}
          <div className="space-y-3">
            {dimensions.map(dim => {
              const st = GAP_STYLES[dim.gapStatus] || GAP_STYLES.OK
              const expanded = expandedDim === dim.name

              return (
                <div key={dim.name} className={`rounded-xl border p-4 ${st.bg}`}>
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedDim(expanded ? null : dim.name)}>
                    <div className="flex items-center gap-3">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${st.color} bg-white/60`}>{st.label}</span>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{dim.label}</h3>
                        <span className="text-[10px] text-slate-500">{dim.source === "AUTO" ? "Calculat automat" : "Date de la dvs."} · {dim.groups.length} grupuri</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${st.color}`}>{dim.maxGapPct}%</div>
                      <div className="text-[9px] text-slate-400">decalaj maxim</div>
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-3 pt-3 border-t border-black/5">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-slate-500">
                            <th className="text-left py-1">Grup</th>
                            <th className="text-right py-1">Angajati</th>
                            <th className="text-right py-1">Salariu mediu</th>
                            <th className="text-right py-1">Salariu median</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dim.groups.map(g => (
                            <tr key={g.groupLabel} className="border-t border-black/5">
                              <td className="py-1.5 font-medium">{g.groupLabel}</td>
                              <td className="py-1.5 text-right text-slate-500">{g.count}</td>
                              <td className="py-1.5 text-right">{formatSalary(g.avgSalary)}</td>
                              <td className="py-1.5 text-right text-slate-500">{formatSalary(g.medianSalary)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {dim.maxGapPct > 5 && (
                        <p className="text-[10px] text-red-600 mt-2">
                          Decalaj &gt;5% — conform Directivei EU 2023/970, Art.10, trebuie justificat prin criterii obiective sau initiat evaluare comuna.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
