"use client"

import { useState } from "react"

interface AgentCard {
  role: string
  name: string
  level: string
  total: number
  learnedWeek: number
  pctInternal: number
  pctClients: number
  pctClaude: number
}

const TABS = [
  { key: "ALL", label: "Toti", color: "slate" },
  { key: "L2", label: "L2 Suport", color: "violet" },
  { key: "STRATEGIC", label: "Strategic", color: "red" },
  { key: "TACTICAL", label: "Tactic", color: "amber" },
  { key: "OPERATIONAL", label: "Operational", color: "indigo" },
]

const L2_ROLES = new Set([
  "PPA", "PSE", "PSYCHOLINGUIST", "SCA", "PPMO", "MGA", "SVHA", "SOC", "STA", "ACEA",
  "NSA", "PCM", "PTA", "SAFETY_MONITOR",
])

export default function LearningBookTabs({ agentCards }: { agentCards: AgentCard[] }) {
  const [activeTab, setActiveTab] = useState("ALL")

  const filtered = agentCards.filter(a => {
    if (activeTab === "ALL") return true
    if (activeTab === "L2") return L2_ROLES.has(a.role)
    return a.level === activeTab
  }).sort((a, b) => b.total - a.total)

  const tabCounts: Record<string, number> = {
    ALL: agentCards.length,
    L2: agentCards.filter(a => L2_ROLES.has(a.role)).length,
    STRATEGIC: agentCards.filter(a => a.level === "STRATEGIC").length,
    TACTICAL: agentCards.filter(a => a.level === "TACTICAL").length,
    OPERATIONAL: agentCards.filter(a => a.level === "OPERATIONAL").length,
  }

  return (
    <section className="bg-white rounded-xl border border-slate-200 p-6">
      <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-1">5. Cartea de invatare per agent</h2>
      <p className="text-[10px] text-slate-400 mb-4">{agentCards.length} agenti cu KB</p>

      {/* Taburi */}
      <div className="flex gap-1 mb-4 border-b border-slate-100 pb-3">
        {TABS.map(tab => (
          <button key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-indigo-600 text-white"
                : "bg-slate-50 text-slate-500 hover:bg-slate-100"
            }`}>
            {tab.label}
            <span className={`ml-1.5 text-[9px] ${activeTab === tab.key ? "text-indigo-200" : "text-slate-400"}`}>
              {tabCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Legenda */}
      <div className="flex gap-3 mb-4 text-[9px]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400" /> Intern/Expert</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-400" /> Distilat din clienti</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-300" /> Cold start (Claude)</span>
      </div>

      {/* Grid agenți */}
      {filtered.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-6">Niciun agent in aceasta categorie</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {filtered.map(a => (
            <div key={a.role} className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 hover:border-indigo-200 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-700 truncate" title={a.role}>{a.name}</span>
                <span className="text-[9px] text-slate-400 shrink-0 ml-1">{a.total}</span>
              </div>
              <p className="text-[9px] text-slate-400 mb-1">{a.role}</p>
              {a.learnedWeek > 0 && (
                <p className="text-[9px] text-emerald-600 mb-1">+{a.learnedWeek} sapt. aceasta</p>
              )}
              <div className="flex rounded-full h-1.5 overflow-hidden bg-slate-200">
                {a.pctInternal > 0 && <div className="bg-indigo-400 h-full" style={{ width: `${a.pctInternal}%` }} />}
                {a.pctClients > 0 && <div className="bg-violet-400 h-full" style={{ width: `${a.pctClients}%` }} />}
                {a.pctClaude > 0 && <div className="bg-amber-300 h-full" style={{ width: `${a.pctClaude}%` }} />}
              </div>
              <div className="flex gap-2 mt-1 text-[8px] text-slate-400">
                <span>{a.pctInternal}% int</span>
                <span>{a.pctClients}% cli</span>
                <span>{a.pctClaude}% AI</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary per tab */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex gap-6 text-[10px] text-slate-400">
        <span>Total KB: <strong className="text-slate-600">{filtered.reduce((s, a) => s + a.total, 0).toLocaleString("ro-RO")}</strong></span>
        <span>Invatat sapt.: <strong className="text-emerald-600">+{filtered.reduce((s, a) => s + a.learnedWeek, 0)}</strong></span>
        <span>Agenti: <strong className="text-slate-600">{filtered.length}</strong></span>
      </div>
    </section>
  )
}
