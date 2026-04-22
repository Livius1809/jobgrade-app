"use client"

import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"

// Departamente standard + mapare titlu → departament sugerat
const STANDARD_DEPARTMENTS = [
  "Management General",
  "Financiar-Contabil",
  "Resurse Umane",
  "IT & Tehnologie",
  "Producție",
  "Vânzări",
  "Marketing",
  "Logistică",
  "Juridic",
  "Calitate",
  "Achiziții",
  "Administrativ",
  "Cercetare & Dezvoltare",
  "Relații Clienți",
]

// Cuvinte cheie din titlu → departament sugerat
const TITLE_DEPT_MAP: Array<{ keywords: string[]; dept: string }> = [
  { keywords: ["director general", "ceo", "administrator"], dept: "Management General" },
  { keywords: ["financiar", "contabil", "economist", "cfo", "trezorier", "buget"], dept: "Financiar-Contabil" },
  { keywords: ["hr", "resurse umane", "recrutare", "personal", "salarizare", "payroll"], dept: "Resurse Umane" },
  { keywords: ["it", "programator", "developer", "devops", "sysadmin", "software", "cto", "data"], dept: "IT & Tehnologie" },
  { keywords: ["producție", "inginer", "tehnician", "mecanic", "operator", "montator"], dept: "Producție" },
  { keywords: ["vânzări", "sales", "comercial", "account", "business develop"], dept: "Vânzări" },
  { keywords: ["marketing", "comunicare", "pr", "brand", "content", "social media", "cmo"], dept: "Marketing" },
  { keywords: ["logistică", "transport", "depozit", "warehouse", "curier", "livrare", "supply chain"], dept: "Logistică" },
  { keywords: ["juridic", "avocat", "legal", "compliance", "conformitate"], dept: "Juridic" },
  { keywords: ["calitate", "quality", "qc", "qa", "auditor", "inspector"], dept: "Calitate" },
  { keywords: ["achiziții", "procurement", "cumpărări", "aprovizionare"], dept: "Achiziții" },
  { keywords: ["administrativ", "secretar", "asistent", "office", "recepți"], dept: "Administrativ" },
  { keywords: ["cercetare", "r&d", "inovare", "laborator"], dept: "Cercetare & Dezvoltare" },
  { keywords: ["client", "suport", "helpdesk", "customer", "relații"], dept: "Relații Clienți" },
]

function suggestDepartment(title: string): string | null {
  const lower = title.toLowerCase()
  for (const { keywords, dept } of TITLE_DEPT_MAP) {
    if (keywords.some(kw => lower.includes(kw))) return dept
  }
  return null
}

// Poziții standard RO — bază de sugestii
const STANDARD_POSITIONS = [
  // Management
  "Director General", "Director Executiv", "Director Operațional", "Director Financiar",
  "Director Comercial", "Director Marketing", "Director IT", "Director Resurse Umane",
  "Director Producție", "Director Logistică", "Director Calitate", "Director Juridic",
  "Director Administrativ", "Director Vânzări", "Director Tehnic",
  // Management mediu
  "Manager Departament", "Manager Proiect", "Manager Operațional", "Manager Zonal",
  "Manager Produs", "Manager Cont", "Manager Achiziții", "Manager Supply Chain",
  "Șef Serviciu", "Șef Birou", "Șef Secție", "Șef Atelier", "Șef Tură",
  "Coordonator Echipă", "Team Leader",
  // Financiar-Contabil
  "Contabil Șef", "Contabil", "Economist", "Analist Financiar", "Controller Financiar",
  "Trezorier", "Auditor Intern", "Referent Salarizare", "Specialist Buget",
  // HR
  "Specialist Resurse Umane", "Recrutor", "Specialist Salarizare", "Inspector SSM",
  "Specialist Formare Profesională", "Specialist Relații Muncă", "Psiholog Organizațional",
  // IT
  "Programator", "Developer Senior", "Analist Programator", "Administrator Sistem",
  "DevOps Engineer", "Specialist Securitate IT", "Analist Date", "Tester QA",
  "Arhitect Software", "Specialist Suport IT", "Administrator Baze de Date",
  // Vânzări / Marketing
  "Agent Vânzări", "Reprezentant Comercial", "Specialist Marketing", "Specialist PR",
  "Content Manager", "Specialist Social Media", "Analist Piață", "Key Account Manager",
  // Producție / Tehnic
  "Inginer Producție", "Inginer Calitate", "Inginer Proiectant", "Tehnician",
  "Operator CNC", "Operator Producție", "Maistru", "Mecanic", "Electrician",
  "Sudor", "Strungar", "Lăcătuș", "Montator",
  // Logistică
  "Specialist Logistică", "Gestionar", "Magaziner", "Șofer", "Curier",
  "Operator Depozit", "Dispecer",
  // Administrativ / Suport
  "Asistent Manager", "Secretar", "Recepționer", "Administrator",
  "Specialist Administrativ", "Arhivar", "Referent",
  // Juridic
  "Consilier Juridic", "Specialist Conformitate", "Specialist GDPR",
  // Calitate
  "Specialist Calitate", "Inspector Calitate", "Auditor Calitate",
  // Altele
  "Specialist Achiziții", "Specialist Relații Clienți", "Operator Call Center",
  "Casier", "Paznic", "Îngrijitor",
]

const LEVEL_OPTIONS = ["Top Management", "Management", "Specialist / Expert", "Execuție"]

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
  const [jobs, setJobs] = useState<Array<{ id: string; title: string }>>([])

  // Fetch joburile existente pentru dropdown fișe de post
  useEffect(() => {
    if (purchasedLayer > 0) {
      fetch("/api/v1/jobs").then(r => r.json()).then(data => {
        const list = Array.isArray(data) ? data : (data.jobs || [])
        setJobs(list.map((j: any) => ({ id: j.id, title: j.title })))
      }).catch(() => {})
    }
  }, [purchasedLayer, panelOpen])

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

  // Progress per tab (0-100) — folosim jobs.length (live) dacă e disponibil
  const liveJobCount = jobs.length > 0 ? jobs.length : jobCount
  const tabProgress: Record<string, number> = {
    posturi: Math.min(100, Math.round((liveJobCount / Math.max(3, 1)) * 100)),
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

            {/* Lista posturilor existente — doar pe tab Posturi */}
            {activeTabDef.id === "posturi" && jobs.length > 0 && (
              <>
                <div style={{ height: "16px" }} />
                <div className="bg-white rounded-lg border border-slate-200" style={{ padding: "12px" }}>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">{jobs.length} {jobs.length === 1 ? "post adăugat" : "posturi adăugate"}</p>
                  <div style={{ height: "8px" }} />
                  <div className="flex flex-wrap gap-2">
                    {jobs.map(j => (
                      <span key={j.id} className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg font-medium flex items-center gap-1">
                        {j.title}
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            try {
                              const res = await fetch(`/api/v1/jobs/${j.id}`, { method: "DELETE" })
                              if (res.ok) {
                                setJobs(prev => prev.filter(p => p.id !== j.id))
                              }
                            } catch {}
                          }}
                          className="text-indigo-400 hover:text-red-500 transition-colors ml-0.5"
                          title="Șterge"
                        >✕</button>
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

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
            <AddJobPanel onClose={() => setPanelOpen(null)} onJobAdded={() => {
              // Refresh lista de joburi
              fetch("/api/v1/jobs").then(r => r.json()).then(data => {
                const list = Array.isArray(data) ? data : (data.jobs || [])
                setJobs(list.map((j: any) => ({ id: j.id, title: j.title })))
              }).catch(() => {})
            }} />
          )}

          {/* ─── Compune fișă AI ─── */}
          {panelOpen === "fise" && (
            <GenerateJobDescPanel jobs={jobs} onSwitchToPosturi={() => setPanelOpen("posturi")} />
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

// ─── Panou adăugare post cu autocomplete ──────────────────────────────

function AddJobPanel({ onClose, onJobAdded }: { onClose: () => void; onJobAdded?: () => void }) {
  const [title, setTitle] = useState("")
  const [dept, setDept] = useState("")
  const [customDept, setCustomDept] = useState("")
  const [level, setLevel] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Sugestii titlu + departament la schimbarea titlului
  const handleTitleChange = (val: string) => {
    setTitle(val)
    // Sugestii poziții
    if (val.length >= 2) {
      const lower = val.toLowerCase()
      const matches = STANDARD_POSITIONS.filter(p => p.toLowerCase().includes(lower)).slice(0, 6)
      setTitleSuggestions(matches)
      setShowSuggestions(matches.length > 0)
    } else {
      setTitleSuggestions([])
      setShowSuggestions(false)
    }
    // Sugestie departament
    if (val.length >= 3) {
      const suggested = suggestDepartment(val)
      if (suggested && dept !== suggested) {
        setSuggestion(suggested)
      } else {
        setSuggestion(null)
      }
    } else {
      setSuggestion(null)
    }
  }

  const selectTitle = (t: string) => {
    setTitle(t)
    setShowSuggestions(false)
    setTitleSuggestions([])
    const suggested = suggestDepartment(t)
    if (suggested) { setDept(suggested); setSuggestion(null) }
    else { setSuggestion(null) }
  }

  const acceptSuggestion = () => {
    if (suggestion) {
      setDept(suggestion)
      setSuggestion(null)
    }
  }

  const finalDept = dept === "__other__" ? customDept : dept

  const handleSave = async () => {
    if (!title.trim()) { setError("Titlul postului e obligatoriu."); return }
    setSaving(true); setError(null)
    try {
      // Creăm/găsim departamentul (opțional)
      let departmentId: string | undefined
      if (finalDept && finalDept.trim()) {
        const deptRes = await fetch("/api/v1/departments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: finalDept.trim() }),
        })
        if (deptRes.ok) {
          const deptData = await deptRes.json()
          departmentId = deptData.id
        }
      }

      const res = await fetch("/api/v1/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          departmentId,
          purpose: level ? `Nivel: ${level}` : undefined,
          status: "ACTIVE",
        }),
      })
      if (res.ok) {
        setSaved(true)
        onJobAdded?.()
        setTimeout(() => { setTitle(""); setDept(""); setCustomDept(""); setLevel(""); setSaved(false) }, 1500)
      } else {
        const data = await res.json()
        setError(data.message || "Eroare la salvare")
      }
    } catch { setError("Eroare de rețea") }
    finally { setSaving(false) }
  }

  return (
    <>
      <p className="text-sm text-slate-600 leading-relaxed">
        Introduceți datele postului. Departamentul se sugerează automat din titlu.
      </p>
      <div style={{ height: "20px" }} />
      <div className="bg-amber-50 rounded-xl border border-amber-200" style={{ padding: "16px" }}>
        <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wide">Date intrare client</p>

        <div style={{ height: "12px" }} />
        <div className="relative">
          <label className="text-xs text-slate-600 font-medium">Titlul postului</label>
          <div style={{ height: "4px" }} />
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            onFocus={() => { if (titleSuggestions.length > 0) setShowSuggestions(true) }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Începe să scrii... ex: Director"
            className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white"
          />
          {showSuggestions && titleSuggestions.length > 0 && (
            <div className="absolute z-10 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden" style={{ top: "100%", marginTop: "4px" }}>
              {titleSuggestions.map(s => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={() => selectTitle(s)}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          {suggestion && !showSuggestions && (
            <button
              onClick={acceptSuggestion}
              className="mt-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Departament sugerat: <span className="font-bold">{suggestion}</span> — click pentru a accepta
            </button>
          )}
        </div>

        <div style={{ height: "12px" }} />
        <div>
          <label className="text-xs text-slate-600 font-medium">Departament</label>
          <div style={{ height: "4px" }} />
          <select
            value={dept}
            onChange={(e) => { setDept(e.target.value); setSuggestion(null) }}
            className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white"
          >
            <option value="">— Selectează —</option>
            {STANDARD_DEPARTMENTS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
            <option value="__other__">Altele...</option>
          </select>
          {dept === "__other__" && (
            <>
              <div style={{ height: "8px" }} />
              <input
                type="text"
                value={customDept}
                onChange={(e) => setCustomDept(e.target.value)}
                placeholder="Numele departamentului"
                className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white"
              />
              <p className="text-[9px] text-slate-400 mt-1">Va fi adăugat automat în lista de departamente.</p>
            </>
          )}
        </div>

        <div style={{ height: "12px" }} />
        <div>
          <label className="text-xs text-slate-600 font-medium">Nivel ierarhic</label>
          <div style={{ height: "4px" }} />
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white"
          >
            <option value="">— Selectează (opțional) —</option>
            {LEVEL_OPTIONS.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ height: "16px" }} />

      {error && (
        <>
          <p className="text-[10px] text-red-500 font-medium text-center">{error}</p>
          <div style={{ height: "8px" }} />
        </>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-colors shadow-sm ${
            saved ? "bg-emerald-500 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          }`}
        >
          {saved ? "✓ Salvat — poți adăuga altul" : saving ? "Se salvează..." : "Salvează postul"}
        </button>
      </div>

      <div style={{ height: "8px" }} />
      <p className="text-[9px] text-slate-400 text-center">Poți adăuga mai multe posturi fără a închide panoul.</p>
    </>
  )
}

// ─── Generare fișă de post cu AI ──────────────────────────────────────

function GenerateJobDescPanel({ jobs, onSwitchToPosturi }: { jobs: Array<{ id: string; title: string }>; onSwitchToPosturi: () => void }) {
  const [selectedJobId, setSelectedJobId] = useState("")
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{ purpose: string; responsibilities: string; requirements: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const selectedJob = jobs.find(j => j.id === selectedJobId)

  const handleGenerate = async () => {
    if (!selectedJob) { setError("Selectează un post."); return }
    setGenerating(true); setError(null); setResult(null); setSaved(false)
    try {
      const res = await fetch("/api/v1/ai/job-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: selectedJob.title }),
      })
      const data = await res.json()
      if (res.ok && data.purpose) {
        setResult(data)
      } else {
        setError(data.message || "Eroare la generare.")
      }
    } catch { setError("Eroare de rețea.") }
    finally { setGenerating(false) }
  }

  const handleSave = async () => {
    if (!result || !selectedJobId) return
    setSaved(false)
    try {
      await fetch(`/api/v1/jobs/${selectedJobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: result.purpose,
          responsibilities: result.responsibilities,
          requirements: result.requirements,
        }),
      })
      setSaved(true)
    } catch { setError("Eroare la salvare.") }
  }

  if (jobs.length === 0) {
    return (
      <>
        <p className="text-sm text-slate-600">Adaugă mai întâi posturi, apoi revino aici pentru a genera fișele.</p>
        <div style={{ height: "16px" }} />
        <div className="bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center" style={{ padding: "24px" }}>
          <p className="text-xs text-slate-400">Nu ai posturi adăugate.</p>
          <div style={{ height: "8px" }} />
          <button onClick={onSwitchToPosturi} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
            Adaugă posturi mai întâi →
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <p className="text-sm text-slate-600 leading-relaxed">
        Selectează un post. AI generează fișa completă: scop, responsabilități, cerințe.
      </p>
      <div style={{ height: "20px" }} />

      <div className="bg-amber-50 rounded-xl border border-amber-200" style={{ padding: "16px" }}>
        <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wide">Date intrare client</p>
        <div style={{ height: "12px" }} />
        <div>
          <label className="text-xs text-slate-600 font-medium">Selectează postul</label>
          <div style={{ height: "4px" }} />
          <select
            value={selectedJobId}
            onChange={(e) => { setSelectedJobId(e.target.value); setResult(null); setSaved(false) }}
            className="w-full text-sm border-2 border-amber-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-200 bg-white"
          >
            <option value="">— Alege un post —</option>
            {jobs.map(j => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ height: "16px" }} />

      <button
        onClick={handleGenerate}
        disabled={generating || !selectedJobId}
        className="w-full py-3 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {generating ? "Se generează..." : "Generează fișa de post cu AI"}
      </button>

      <div style={{ height: "8px" }} />
      <p className="text-[9px] text-slate-400 text-center">Consumă 12 credite per fișă generată. Poți edita rezultatul.</p>

      {error && (
        <>
          <div style={{ height: "12px" }} />
          <p className="text-[10px] text-red-500 font-medium text-center">{error}</p>
        </>
      )}

      {result && (
        <>
          <div style={{ height: "20px" }} />
          <div className="bg-white rounded-xl border border-emerald-200" style={{ padding: "16px" }}>
            <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wide">Fișă generată — {selectedJob?.title}</p>

            <div style={{ height: "12px" }} />
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Scopul postului</p>
              <div style={{ height: "4px" }} />
              <p className="text-xs text-slate-700 leading-relaxed">{result.purpose}</p>
            </div>

            <div style={{ height: "12px" }} />
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Responsabilități</p>
              <div style={{ height: "4px" }} />
              <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{result.responsibilities}</div>
            </div>

            <div style={{ height: "12px" }} />
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Cerințe</p>
              <div style={{ height: "4px" }} />
              <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{result.requirements}</div>
            </div>
          </div>

          <div style={{ height: "12px" }} />
          <button
            onClick={handleSave}
            disabled={saved}
            className={`w-full py-3 rounded-lg text-sm font-semibold transition-colors shadow-sm ${
              saved ? "bg-emerald-500 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {saved ? "✓ Salvat pe post" : "Salvează fișa pe post"}
          </button>
        </>
      )}
    </>
  )
}
