"use client"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"

interface TabDef {
  id: string
  label: string
  icon: string
  description: string
  status: "empty" | "partial" | "done"
  count?: number
  actions: Array<{
    label: string
    href?: string
    onClick?: () => void
    primary?: boolean
    opensPanel?: boolean
  }>
}

const STATUS_STYLES = {
  empty: { dot: "bg-slate-300", text: "text-slate-400", label: "Lipsă" },
  partial: { dot: "bg-amber-400", text: "text-amber-600", label: "Parțial" },
  done: { dot: "bg-emerald-500", text: "text-emerald-600", label: "Complet" },
}

interface ClientDataTabsProps {
  jobCount: number
  employeeCount?: number
  hasDepartments?: boolean
  hasSalaryData?: boolean
}

export default function ClientDataTabs({ jobCount, employeeCount = 0, hasDepartments = false, hasSalaryData = false }: ClientDataTabsProps) {
  const [activeTab, setActiveTab] = useState<string>("posturi")
  const [panelOpen, setPanelOpen] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [panelLeft, setPanelLeft] = useState(0)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (panelOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setPanelLeft(rect.right + 24)
    }
  }, [panelOpen])

  const tabs: TabDef[] = [
    {
      id: "posturi",
      label: "Posturi",
      icon: "📋",
      description: "Lista pozițiilor distincte din companie. Minim 3 pentru evaluare.",
      status: jobCount >= 3 ? "done" : jobCount > 0 ? "partial" : "empty",
      count: jobCount,
      actions: [
        { label: "Adaugă manual", href: "/jobs/new", primary: jobCount === 0 },
        { label: "Importă din Excel", href: "/jobs/import" },
      ],
    },
    {
      id: "fise",
      label: "Fișe de post",
      icon: "📄",
      description: "Descrierile detaliate ale fiecărei poziții. Se pot genera automat cu AI din titlu.",
      status: "empty",
      actions: [
        { label: "Compune fișe", onClick: () => setPanelOpen("fise"), primary: true, opensPanel: true },
        { label: "Încarcă fișe (PDF/Word)", href: "/jobs/import?type=descriptions" },
      ],
    },
    {
      id: "stat-functii",
      label: "Stat de funcții",
      icon: "👥",
      description: "Lista angajaților cu poziția, departamentul și salariul actual. Necesar pentru pay gap.",
      status: employeeCount > 0 ? "done" : "empty",
      count: employeeCount,
      actions: [
        { label: "Importă din Excel", href: "/pay-gap/employees", primary: true },
        { label: "Adaugă manual", href: "/pay-gap/employees?mode=manual" },
      ],
    },
    {
      id: "departamente",
      label: "Departamente",
      icon: "🏢",
      description: "Structura organizatorică — departamente, echipe, linii de raportare.",
      status: hasDepartments ? "done" : "empty",
      actions: [
        { label: "Definește structura", href: "/company/departments", primary: true },
      ],
    },
    {
      id: "salarii",
      label: "Date salariale",
      icon: "💰",
      description: "Grila salarială actuală, beneficii, compensații. Necesar pentru benchmark și pachete.",
      status: hasSalaryData ? "done" : "empty",
      actions: [
        { label: "Importă grila", href: "/compensation", primary: true },
      ],
    },
  ]

  const activeTabDef = tabs.find(t => t.id === activeTab)
  const st = activeTabDef ? STATUS_STYLES[activeTabDef.status] : STATUS_STYLES.empty

  return (
    <>
      <div ref={containerRef}>
        {/* Taburi */}
        <div className="flex border-b border-slate-200">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id
            const tabSt = STATUS_STYLES[tab.status]
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setPanelOpen(null) }}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
                  isActive
                    ? "border-indigo-500 text-indigo-700"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span className={`w-2 h-2 rounded-full ${tabSt.dot}`} />
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">{tab.count}</span>
                )}
              </button>
            )
          })}
        </div>

        <div style={{ height: "20px" }} />

        {/* Conținut tab activ */}
        {activeTabDef && (
          <div>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${st.dot}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${st.text}`}>{st.label}</span>
                </div>
                <div style={{ height: "8px" }} />
                <p className="text-sm text-slate-600 leading-relaxed">{activeTabDef.description}</p>
              </div>
            </div>

            <div style={{ height: "20px" }} />

            {/* Acțiuni */}
            <div className="flex gap-3">
              {activeTabDef.actions.map((action, i) => {
                const cls = action.primary
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"

                if (action.onClick) {
                  return (
                    <button
                      key={i}
                      onClick={action.onClick}
                      className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors ${cls}`}
                    >
                      {action.label} {action.opensPanel && "→"}
                    </button>
                  )
                }
                return (
                  <Link
                    key={i}
                    href={action.href || "#"}
                    className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-colors ${cls}`}
                  >
                    {action.label}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Panou lateral — același pattern ca PackageExplorer (portal, fixed, ancorat la conținut) */}
      {panelOpen && mounted && createPortal(
        <div
          style={{ borderWidth: "3px", top: "100px", left: `${panelLeft}px`, right: "24px", maxHeight: "calc(100vh - 130px)", padding: "28px" }}
          className="fixed rounded-2xl border-indigo-400 bg-indigo-50 overflow-y-auto shadow-xl z-40"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📄</span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Compune fișe de post</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded inline-block bg-indigo-100 text-indigo-700">Generare AI</span>
              </div>
            </div>
            <button onClick={() => setPanelOpen(null)} className="text-indigo-700 hover:opacity-70 text-xl font-bold leading-none p-1 rounded transition-opacity" title="Închide">✕</button>
          </div>

          <div style={{ height: "20px" }} />

          <p className="text-sm text-slate-600 leading-relaxed">
            Introduceți titlul postului și o scurtă descriere. AI generează fișa completă: responsabilități, competențe, cerințe.
          </p>

          <div style={{ height: "20px" }} />

          {/* Formular compunere fișe */}
          <div className="bg-amber-50 rounded-xl border border-amber-200" style={{ padding: "16px" }}>
            <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wide">Date intrare client</p>
            <div style={{ height: "12px" }} />
            <div>
              <label className="text-xs text-slate-600 font-medium">Titlul postului</label>
              <div style={{ height: "4px" }} />
              <input
                type="text"
                placeholder="ex: Director Financiar"
                className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white"
              />
            </div>
            <div style={{ height: "12px" }} />
            <div>
              <label className="text-xs text-slate-600 font-medium">Descriere pe scurt (opțional)</label>
              <div style={{ height: "4px" }} />
              <textarea
                rows={3}
                placeholder="Ce face persoana pe acest post? Ce responsabilități are?"
                className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white resize-none"
              />
            </div>
            <div style={{ height: "12px" }} />
            <div>
              <label className="text-xs text-slate-600 font-medium">Departament</label>
              <div style={{ height: "4px" }} />
              <input
                type="text"
                placeholder="ex: Financiar-Contabil"
                className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white"
              />
            </div>
          </div>

          <div style={{ height: "20px" }} />

          <button className="w-full py-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
            Generează fișa de post cu AI
          </button>

          <div style={{ height: "12px" }} />

          <p className="text-[9px] text-slate-400 text-center">Consumă 12 credite per fișă generată. Poți edita rezultatul.</p>
        </div>,
        document.body
      )}
    </>
  )
}
