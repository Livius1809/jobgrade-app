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
  selectedLayer: number | null
  purchasedLayer: number
  employeeCount?: number
  hasDepartments?: boolean
  hasSalaryData?: boolean
}

// Culori per tab — corelate cu cardurile servicii
const TAB_COLORS: Record<string, { bar: string; fill: string; text: string; border: string }> = {
  posturi:       { bar: "bg-indigo-500",  fill: "rgba(99,102,241,0.15)",  text: "text-indigo-700",  border: "border-indigo-300" },
  fise:          { bar: "bg-indigo-500",  fill: "rgba(99,102,241,0.15)",  text: "text-indigo-700",  border: "border-indigo-300" },
  "stat-functii":{ bar: "bg-violet-500",  fill: "rgba(139,92,246,0.15)",  text: "text-violet-700",  border: "border-violet-300" },
  salarii:       { bar: "bg-fuchsia-500", fill: "rgba(217,70,239,0.15)",  text: "text-fuchsia-700", border: "border-fuchsia-300" },
  departamente:  { bar: "bg-orange-500",  fill: "rgba(249,115,22,0.15)",  text: "text-orange-700",  border: "border-orange-300" },
}

// Ce taburi apar per layer:
// Baza (1): Posturi, Fișe de post
// Nivelul 1 (2): + Stat de funcții (pay gap)
// Nivelul 2 (3): + Date salariale (benchmark)
// Nivelul 3 (4): + Departamente (dezvoltare org)
const TABS_PER_LAYER: Record<number, string[]> = {
  1: ["posturi", "fise"],
  2: ["posturi", "fise", "stat-functii"],
  3: ["posturi", "fise", "stat-functii", "salarii"],
  4: ["posturi", "fise", "stat-functii", "salarii", "departamente"],
}

export default function ClientDataTabs({ jobCount, selectedLayer, purchasedLayer, employeeCount = 0, hasDepartments = false, hasSalaryData = false }: ClientDataTabsProps) {
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

  const allTabs: TabDef[] = [
    {
      id: "posturi",
      label: "Posturi",
      icon: "📋",
      description: "Lista pozițiilor distincte din companie. Minim 3 pentru evaluare.",
      status: jobCount >= 3 ? "done" : jobCount > 0 ? "partial" : "empty",
      count: jobCount,
      actions: [
        { label: "Adaugă manual", onClick: () => setPanelOpen("posturi"), primary: jobCount === 0, opensPanel: true },
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
        { label: "Compune cu AI", onClick: () => setPanelOpen("fise"), primary: true, opensPanel: true },
        { label: "Încarcă PDF/Word", onClick: () => setPanelOpen("upload-fise"), opensPanel: true },
      ],
    },
    {
      id: "stat-functii",
      label: "Stat de funcții",
      icon: "👥",
      description: "Lista angajaților cu poziția, departamentul și salariul actual. Necesar pentru analiza pay gap.",
      status: employeeCount > 0 ? "done" : "empty",
      count: employeeCount,
      actions: [
        { label: "Importă din Excel", href: "/pay-gap/employees", primary: true },
        { label: "Adaugă manual", onClick: () => setPanelOpen("stat-functii"), opensPanel: true },
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
  ]

  // Filtrare taburi: show pe baza max(purchasedLayer, selectedLayer) — dar activabile doar dacă e plătit
  const displayLayer = Math.max(purchasedLayer, selectedLayer || 0) || 1
  const visibleTabIds = TABS_PER_LAYER[displayLayer] || TABS_PER_LAYER[1]
  const tabs = allTabs.filter(t => visibleTabIds.includes(t.id))

  // Progress per tab (0-100)
  const tabProgress: Record<string, number> = {
    posturi: Math.min(100, Math.round((jobCount / Math.max(3, 1)) * 100)),
    fise: 0,
    "stat-functii": employeeCount > 0 ? 100 : 0,
    salarii: hasSalaryData ? 100 : 0,
    departamente: hasDepartments ? 100 : 0,
  }

  const activeTabDef = tabs.find(t => t.id === activeTab)
  const st = activeTabDef ? STATUS_STYLES[activeTabDef.status] : STATUS_STYLES.empty

  return (
    <>
      <div ref={containerRef}>
        {/* Taburi */}
        <div className="flex border-b border-slate-200">
          {tabs.map((tab, idx) => {
            const isActive = activeTab === tab.id
            const tc = TAB_COLORS[tab.id] || TAB_COLORS.posturi
            const progress = tabProgress[tab.id] || 0
            const isLocked = purchasedLayer === 0
            return (
              <button
                key={tab.id}
                onClick={() => { if (!isLocked) { setActiveTab(tab.id); setPanelOpen(null) } }}
                disabled={isLocked}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
                  isLocked
                    ? "border-transparent text-slate-300 cursor-not-allowed"
                    : isActive
                      ? `${tc.border} ${tc.text}`
                      : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                  progress === 100 ? `${tc.bar} text-white` : "bg-slate-100 text-slate-500"
                }`}>{idx + 1}</span>
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">{tab.count}</span>
                )}
                {isLocked && <span className="text-[10px]">🔒</span>}
              </button>
            )
          })}
        </div>

        <div style={{ height: "20px" }} />

        {/* Conținut tab activ */}
        {purchasedLayer === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-slate-400">Cumpărați un pachet pentru a introduce datele.</p>
          </div>
        )}
        {activeTabDef && purchasedLayer > 0 && (() => {
          const tc = TAB_COLORS[activeTabDef.id] || TAB_COLORS.posturi
          const progress = tabProgress[activeTabDef.id] || 0
          return (
          <div
            style={progress === 100 ? { backgroundColor: tc.fill } : {}}
            className={`rounded-xl ${progress === 100 ? tc.border : ""}`}
          >
            {/* Bară relevanță */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${tc.bar} rounded-full transition-all duration-500`} style={{ width: `${progress}%` }} />
              </div>
              <span className={`text-[10px] font-bold ${tc.text}`}>{progress}%</span>
            </div>

            <div style={{ height: "16px" }} />

            <p className="text-sm text-slate-600 leading-relaxed">{activeTabDef.description}</p>

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
          )
        })()}
      </div>

      {/* Panou lateral — același pattern ca PackageExplorer (portal, fixed, ancorat la conținut) */}
      {panelOpen && mounted && createPortal(
        <div
          style={{ borderWidth: "3px", top: "100px", left: `${panelLeft}px`, right: "24px", maxHeight: "calc(100vh - 130px)", padding: "28px" }}
          className="fixed rounded-2xl border-indigo-400 bg-indigo-50 overflow-y-auto shadow-xl z-40"
        >
          {/* Header comun */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {panelOpen === "posturi" && "📋"}
                {panelOpen === "fise" && "📄"}
                {panelOpen === "upload-fise" && "📤"}
                {panelOpen === "stat-functii" && "👥"}
              </span>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {panelOpen === "posturi" && "Adaugă post"}
                  {panelOpen === "fise" && "Compune fișă de post"}
                  {panelOpen === "upload-fise" && "Încarcă fișe de post"}
                  {panelOpen === "stat-functii" && "Adaugă angajat"}
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded inline-block bg-indigo-100 text-indigo-700">
                  {panelOpen === "fise" ? "Generare AI" : panelOpen === "upload-fise" ? "Import PDF/Word" : "Manual"}
                </span>
              </div>
            </div>
            <button onClick={() => setPanelOpen(null)} className="text-indigo-700 hover:opacity-70 text-xl font-bold leading-none p-1 rounded transition-opacity" title="Închide">✕</button>
          </div>

          <div style={{ height: "20px" }} />

          {/* ─── Adaugă post manual ─── */}
          {panelOpen === "posturi" && (
            <>
              <p className="text-sm text-slate-600 leading-relaxed">
                Introduceți datele postului. Minim titlul și departamentul.
              </p>
              <div style={{ height: "20px" }} />
              <div className="bg-amber-50 rounded-xl border border-amber-200" style={{ padding: "16px" }}>
                <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wide">Date intrare client</p>
                <div style={{ height: "12px" }} />
                <div>
                  <label className="text-xs text-slate-600 font-medium">Titlul postului</label>
                  <div style={{ height: "4px" }} />
                  <input type="text" placeholder="ex: Director Financiar" className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white" />
                </div>
                <div style={{ height: "12px" }} />
                <div>
                  <label className="text-xs text-slate-600 font-medium">Departament</label>
                  <div style={{ height: "4px" }} />
                  <input type="text" placeholder="ex: Financiar-Contabil" className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white" />
                </div>
                <div style={{ height: "12px" }} />
                <div>
                  <label className="text-xs text-slate-600 font-medium">Nivel ierarhic (opțional)</label>
                  <div style={{ height: "4px" }} />
                  <input type="text" placeholder="ex: Management, Specialist, Execuție" className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white" />
                </div>
              </div>
              <div style={{ height: "20px" }} />
              <button className="w-full py-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
                Salvează postul
              </button>
            </>
          )}

          {/* ─── Compune fișă AI ─── */}
          {panelOpen === "fise" && (
            <>
              <p className="text-sm text-slate-600 leading-relaxed">
                Introduceți titlul postului și o scurtă descriere. AI generează fișa completă: responsabilități, competențe, cerințe.
              </p>
              <div style={{ height: "20px" }} />
              <div className="bg-amber-50 rounded-xl border border-amber-200" style={{ padding: "16px" }}>
                <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wide">Date intrare client</p>
                <div style={{ height: "12px" }} />
                <div>
                  <label className="text-xs text-slate-600 font-medium">Titlul postului</label>
                  <div style={{ height: "4px" }} />
                  <input type="text" placeholder="ex: Director Financiar" className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white" />
                </div>
                <div style={{ height: "12px" }} />
                <div>
                  <label className="text-xs text-slate-600 font-medium">Descriere pe scurt (opțional)</label>
                  <div style={{ height: "4px" }} />
                  <textarea rows={3} placeholder="Ce face persoana pe acest post? Ce responsabilități are?" className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white resize-none" />
                </div>
                <div style={{ height: "12px" }} />
                <div>
                  <label className="text-xs text-slate-600 font-medium">Departament</label>
                  <div style={{ height: "4px" }} />
                  <input type="text" placeholder="ex: Financiar-Contabil" className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white" />
                </div>
              </div>
              <div style={{ height: "20px" }} />
              <button className="w-full py-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
                Generează fișa de post cu AI
              </button>
              <div style={{ height: "8px" }} />
              <p className="text-[9px] text-slate-400 text-center">Consumă 12 credite per fișă generată. Poți edita rezultatul.</p>
            </>
          )}

          {/* ─── Upload PDF/Word ─── */}
          {panelOpen === "upload-fise" && (
            <>
              <p className="text-sm text-slate-600 leading-relaxed">
                Încărcați fișele de post existente în format PDF sau Word. Le procesăm automat și extragem informațiile relevante.
              </p>
              <div style={{ height: "20px" }} />
              <div className="bg-amber-50 rounded-xl border-2 border-dashed border-amber-300 flex flex-col items-center justify-center text-center" style={{ padding: "32px" }}>
                <span className="text-3xl">📤</span>
                <div style={{ height: "12px" }} />
                <p className="text-sm font-medium text-slate-700">Trageți fișierele aici</p>
                <p className="text-xs text-slate-400">sau</p>
                <div style={{ height: "8px" }} />
                <button className="px-4 py-2 rounded-lg bg-white border border-amber-300 text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors">
                  Alegeți fișiere
                </button>
                <div style={{ height: "8px" }} />
                <p className="text-[10px] text-slate-400">PDF, DOC, DOCX · max 10 MB per fișier</p>
              </div>
              <div style={{ height: "20px" }} />
              <button className="w-full py-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
                Procesează fișierele
              </button>
              <div style={{ height: "8px" }} />
              <p className="text-[9px] text-slate-400 text-center">AI extrage automat: titlu, responsabilități, competențe, cerințe.</p>
            </>
          )}

          {/* ─── Adaugă angajat manual ─── */}
          {panelOpen === "stat-functii" && (
            <>
              <p className="text-sm text-slate-600 leading-relaxed">
                Introduceți datele angajatului. Necesar: nume, post, salariu brut.
              </p>
              <div style={{ height: "20px" }} />
              <div className="bg-amber-50 rounded-xl border border-amber-200" style={{ padding: "16px" }}>
                <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wide">Date intrare client</p>
                <div style={{ height: "12px" }} />
                <div>
                  <label className="text-xs text-slate-600 font-medium">Nume angajat</label>
                  <div style={{ height: "4px" }} />
                  <input type="text" placeholder="ex: Popescu Ion" className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white" />
                </div>
                <div style={{ height: "12px" }} />
                <div>
                  <label className="text-xs text-slate-600 font-medium">Post ocupat</label>
                  <div style={{ height: "4px" }} />
                  <input type="text" placeholder="ex: Analist financiar" className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white" />
                </div>
                <div style={{ height: "12px" }} />
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-slate-600 font-medium">Salariu brut (RON)</label>
                    <div style={{ height: "4px" }} />
                    <input type="number" placeholder="–" className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-600 font-medium">Gen (F/M)</label>
                    <div style={{ height: "4px" }} />
                    <select className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white">
                      <option value="">–</option>
                      <option value="F">F</option>
                      <option value="M">M</option>
                    </select>
                  </div>
                </div>
              </div>
              <div style={{ height: "20px" }} />
              <button className="w-full py-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
                Salvează angajatul
              </button>
            </>
          )}
        </div>,
        document.body
      )}
    </>
  )
}
