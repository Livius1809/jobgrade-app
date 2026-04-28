"use client"

import { useState, useEffect } from "react"

type Stage = "READINESS" | "CONFIG" | "L1_SEED" | "AGENTS" | "L2_COLD_START" | "L3_CONFIG" | "ACTIVATE"

interface ReadinessCheck {
  name: string
  passed: boolean
  detail: string
}

interface ReadinessData {
  ready: boolean
  score: number
  checks: ReadinessCheck[]
  blockers: string[]
}

const STAGES: Array<{ id: Stage; label: string; description: string }> = [
  { id: "READINESS", label: "1. Readiness", description: "Verificare: organism-mama e suficient de stabil?" },
  { id: "CONFIG", label: "2. Configurare", description: "Definire business: nume, piata, descriere" },
  { id: "L1_SEED", label: "3. L1 Mostenire", description: "Copiere CAMP, moral core, meta-organism KB" },
  { id: "AGENTS", label: "4. Agenti", description: "Creare agenti minimali (COG, COA, PMA, SOA)" },
  { id: "L2_COLD_START", label: "5. L2 Cunoastere", description: "Cold start: initializare KB domeniu" },
  { id: "L3_CONFIG", label: "6. L3 Reglementari", description: "Configurare legi, norme, jurisdictie" },
  { id: "ACTIVATE", label: "7. Activare", description: "Business operational — incepe sa functioneze" },
]

export default function BusinessBirthPage() {
  const [currentStage, setCurrentStage] = useState<Stage>("READINESS")
  const [readiness, setReadiness] = useState<ReadinessData | null>(null)
  const [loading, setLoading] = useState(false)
  const [birthResult, setBirthResult] = useState<any>(null)
  const [completedStages, setCompletedStages] = useState<Set<Stage>>(new Set())

  // Config inputs
  const [bizName, setBizName] = useState("")
  const [bizSlug, setBizSlug] = useState("")
  const [bizDesc, setBizDesc] = useState("")
  const [bizMarket, setBizMarket] = useState("")
  const [bizJurisdiction, setBizJurisdiction] = useState("RO")
  const [bizIndustry, setBizIndustry] = useState("")
  const [bizRegulations, setBizRegulations] = useState("")
  const [selectedAgents, setSelectedAgents] = useState<string[]>(["COG", "COA", "PMA", "SOA"])

  const availableAgents = ["COG", "COA", "COCSA", "PMA", "EMA", "QLA", "CSSA", "SOA", "CJA", "CIA", "CFO", "CMA", "MKA"]

  async function checkReadiness() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/business-birth", { headers: { "x-internal-key": "from-session" } })
      if (res.ok) {
        const data = await res.json()
        setReadiness(data)
        if (data.ready) setCompletedStages(prev => new Set([...prev, "READINESS"]))
      }
    } catch {}
    setLoading(false)
  }

  async function launchBirth() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/business-birth", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-internal-key": "from-session" },
        body: JSON.stringify({
          businessName: bizName,
          businessSlug: bizSlug,
          description: bizDesc,
          targetMarket: bizMarket,
          initialAgents: selectedAgents,
          l3Config: {
            jurisdiction: bizJurisdiction,
            industry: bizIndustry,
            specificRegulations: bizRegulations.split("\n").filter(Boolean),
          },
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setBirthResult(data)
        if (data.success) {
          setCompletedStages(prev => new Set([...prev, "CONFIG", "L1_SEED", "AGENTS"]))
          setCurrentStage("L2_COLD_START")
        }
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { checkReadiness() }, [])

  const currentIdx = STAGES.findIndex(s => s.id === currentStage)
  const overallProgress = Math.round((completedStages.size / STAGES.length) * 100)

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <a href="/owner" className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 mb-4">
        <span>←</span> Dashboard
      </a>
      <h1 className="text-xl font-bold text-slate-900 mb-1">Nastere business nou</h1>
      <p className="text-sm text-slate-500 mb-6">Organism-mama naste un pui — mostenire L1 + motoare CORE</p>

      {/* Progress bar global */}
      <div className="mb-6">
        <div className="flex justify-between text-[10px] text-slate-500 mb-1">
          <span>Progres general</span>
          <span>{overallProgress}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${overallProgress}%` }} />
        </div>
      </div>

      {/* Etape */}
      <div className="flex gap-1 mb-6 overflow-x-auto">
        {STAGES.map((stage, idx) => {
          const isCompleted = completedStages.has(stage.id)
          const isCurrent = stage.id === currentStage
          const isLocked = idx > currentIdx && !isCompleted
          return (
            <button key={stage.id}
              onClick={() => !isLocked && setCurrentStage(stage.id)}
              disabled={isLocked}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-[10px] font-medium border transition-colors ${
                isCurrent ? "bg-indigo-100 border-indigo-300 text-indigo-700" :
                isCompleted ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                "bg-slate-50 border-slate-200 text-slate-400"
              } ${isLocked ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:bg-indigo-50"}`}>
              {isCompleted ? "\u2713 " : ""}{stage.label}
            </button>
          )
        })}
      </div>

      {/* ETAPA 1: READINESS */}
      {currentStage === "READINESS" && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5 space-y-4">
          <h2 className="text-sm font-bold text-indigo-800">Verificare readiness organism-mama</h2>
          <p className="text-xs text-indigo-600">Organismul-mama trebuie sa fie stabil inainte de a naste un pui.</p>

          {readiness ? (
            <>
              <div className={`rounded-lg p-3 ${readiness.ready ? "bg-emerald-100" : "bg-red-100"}`}>
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-bold ${readiness.ready ? "text-emerald-700" : "text-red-700"}`}>
                    {readiness.ready ? "GATA — organismul poate naste" : "NU E GATA — rezolvati blockerele"}
                  </span>
                  <span className="text-lg font-bold">{readiness.score}%</span>
                </div>
              </div>

              <div className="space-y-1">
                {readiness.checks.map((check, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className={`w-2 h-2 rounded-full ${check.passed ? "bg-emerald-400" : "bg-red-400"}`} />
                    <span className={check.passed ? "text-slate-600" : "text-red-600"}>{check.name}: {check.detail}</span>
                  </div>
                ))}
              </div>

              {readiness.blockers.length > 0 && (
                <div className="bg-red-50 p-2 rounded-lg">
                  <p className="text-[10px] font-bold text-red-700 mb-1">Blockere:</p>
                  {readiness.blockers.map((b, i) => <p key={i} className="text-[10px] text-red-600">- {b}</p>)}
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={checkReadiness} disabled={loading}
                  className="text-xs px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40">
                  {loading ? "..." : "Re-verifica"}
                </button>
                {readiness.ready && (
                  <button onClick={() => setCurrentStage("CONFIG")}
                    className="text-xs px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
                    Pasul urmator: Configurare
                  </button>
                )}
              </div>
            </>
          ) : (
            <button onClick={checkReadiness} disabled={loading}
              className="text-xs px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40">
              {loading ? "Se verifica..." : "Verifica readiness"}
            </button>
          )}
        </div>
      )}

      {/* ETAPA 2: CONFIGURARE */}
      {currentStage === "CONFIG" && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-5 space-y-4">
          <h2 className="text-sm font-bold text-violet-800">Configurare business nou</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Numele businessului *</label>
              <input type="text" value={bizName} onChange={e => { setBizName(e.target.value); setBizSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "-")) }}
                placeholder="ex: Edu4Life" className="w-full px-3 py-2 rounded-lg border border-violet-200 bg-white text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Slug (auto-generat)</label>
              <input type="text" value={bizSlug} onChange={e => setBizSlug(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-violet-200 bg-white text-sm text-slate-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Descriere</label>
            <textarea value={bizDesc} onChange={e => setBizDesc(e.target.value)} rows={2}
              placeholder="Ce face acest business?" className="w-full px-3 py-2 rounded-lg border border-violet-200 bg-white text-sm resize-y" />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Piata tinta</label>
            <input type="text" value={bizMarket} onChange={e => setBizMarket(e.target.value)}
              placeholder="ex: educatie, antreprenoriat, HR" className="w-full px-3 py-2 rounded-lg border border-violet-200 bg-white text-sm" />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Agenti initiali (minim COG + COA)</label>
            <div className="flex flex-wrap gap-1">
              {availableAgents.map(role => (
                <button key={role} onClick={() => setSelectedAgents(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role])}
                  className={`text-[10px] px-2 py-1 rounded-full border ${
                    selectedAgents.includes(role) ? "bg-violet-200 border-violet-400 text-violet-800" : "bg-white border-slate-200 text-slate-400"
                  }`}>{role}</button>
              ))}
            </div>
          </div>

          <button onClick={() => { setCompletedStages(prev => new Set([...prev, "CONFIG"])); setCurrentStage("L1_SEED") }}
            disabled={!bizName || !bizSlug}
            className="text-xs px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40">
            Pasul urmator: Mostenire L1
          </button>
        </div>
      )}

      {/* ETAPA 3+4: L1 SEED + AGENTI (lansare automata) */}
      {(currentStage === "L1_SEED" || currentStage === "AGENTS") && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 space-y-4">
          <h2 className="text-sm font-bold text-emerald-800">Lansare nastere: L1 + Agenti</h2>
          <p className="text-xs text-emerald-600">Se copiaza L1 (CAMPUL, moral core) si se creeaza agentii.</p>

          <div className="bg-white rounded-lg p-3 border border-emerald-200 text-xs space-y-1">
            <p><strong>Business:</strong> {bizName} ({bizSlug})</p>
            <p><strong>Piata:</strong> {bizMarket || "—"}</p>
            <p><strong>Agenti:</strong> {selectedAgents.join(", ")}</p>
          </div>

          {birthResult ? (
            <div className={`rounded-lg p-3 ${birthResult.success ? "bg-emerald-100" : "bg-red-100"}`}>
              <p className={`text-sm font-bold ${birthResult.success ? "text-emerald-700" : "text-red-700"}`}>
                {birthResult.success ? "Nascut cu succes!" : "Eroare la nastere"}
              </p>
              <p className="text-xs mt-1">Agenti creati: {birthResult.agentsCreated} | KB L1 seeded: {birthResult.kbSeeded}</p>
              {birthResult.errors?.length > 0 && (
                <div className="mt-2">{birthResult.errors.map((e: string, i: number) => <p key={i} className="text-[10px] text-red-600">{e}</p>)}</div>
              )}
            </div>
          ) : (
            <button onClick={launchBirth} disabled={loading}
              className="text-xs px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40">
              {loading ? "Se naste..." : "Lanseaza nasterea"}
            </button>
          )}

          {birthResult?.success && (
            <button onClick={() => setCurrentStage("L2_COLD_START")}
              className="text-xs px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
              Pasul urmator: Cold Start L2
            </button>
          )}
        </div>
      )}

      {/* ETAPA 5: L2 COLD START */}
      {currentStage === "L2_COLD_START" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-4">
          <h2 className="text-sm font-bold text-amber-800">Cold Start — Cunoastere de domeniu (L2)</h2>
          <p className="text-xs text-amber-600">Agentii au schelet (L1) dar nu stiu domeniul. Cold start-ul initializeaza KB-ul cu cunoastere specifica.</p>

          <div className="bg-white rounded-lg p-3 border border-amber-200 text-xs">
            <p className="font-bold mb-2">Ce trebuie furnizat:</p>
            <ul className="space-y-1 text-slate-600">
              <li>- Documente de referinta despre domeniu (PDF, link-uri)</li>
              <li>- Obiective initiale ale businessului (ce vrea sa atinga)</li>
              <li>- Competitorii principali (daca exista)</li>
              <li>- Reglementari specifice domeniului</li>
              <li>- Profil client tinta (cine sunt clientii)</li>
            </ul>
          </div>

          <p className="text-[10px] text-amber-500">Dupa ce furnizati materialele, apasati "Lanseaza cold start" — fiecare agent isi genereaza KB prin self-interview.</p>

          <div className="flex gap-2">
            <button onClick={() => { setCompletedStages(prev => new Set([...prev, "L2_COLD_START"])); setCurrentStage("L3_CONFIG") }}
              className="text-xs px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700">
              Pasul urmator: Reglementari L3
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 6: L3 CONFIG */}
      {currentStage === "L3_CONFIG" && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-4">
          <h2 className="text-sm font-bold text-blue-800">Configurare reglementari (L3)</h2>
          <p className="text-xs text-blue-600">Ce legi si norme se aplica pe piata acestui business?</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Jurisdictie</label>
              <select value={bizJurisdiction} onChange={e => setBizJurisdiction(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-blue-200 bg-white text-sm">
                <option value="RO">Romania</option>
                <option value="EU">Uniunea Europeana</option>
                <option value="GLOBAL">Global</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Industrie</label>
              <input type="text" value={bizIndustry} onChange={e => setBizIndustry(e.target.value)}
                placeholder="ex: Educatie, Sanatate, IT" className="w-full px-3 py-2 rounded-lg border border-blue-200 bg-white text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Reglementari specifice (una per linie)</label>
            <textarea value={bizRegulations} onChange={e => setBizRegulations(e.target.value)} rows={3}
              placeholder="ex: Legea educatiei nr. 1/2011&#10;GDPR&#10;AI Act"
              className="w-full px-3 py-2 rounded-lg border border-blue-200 bg-white text-sm resize-y" />
          </div>

          <button onClick={() => { setCompletedStages(prev => new Set([...prev, "L3_CONFIG"])); setCurrentStage("ACTIVATE") }}
            className="text-xs px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            Pasul urmator: Activare
          </button>
        </div>
      )}

      {/* ETAPA 7: ACTIVARE */}
      {currentStage === "ACTIVATE" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 space-y-4">
          <h2 className="text-sm font-bold text-emerald-800">Activare business</h2>
          <p className="text-xs text-emerald-600">Totul e configurat. Business-ul e gata sa functioneze.</p>

          <div className="bg-white rounded-lg p-4 border border-emerald-200 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Business</span>
              <span className="font-bold text-slate-800">{bizName}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Piata</span>
              <span className="text-slate-800">{bizMarket || "—"}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Agenti</span>
              <span className="text-slate-800">{selectedAgents.length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">L1 (moral core)</span>
              <span className="text-emerald-600 font-bold">Mostenit</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">L2 (domeniu)</span>
              <span className="text-amber-600 font-bold">Cold start initiat</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">L3 (reglementari)</span>
              <span className="text-blue-600 font-bold">{bizJurisdiction} — {bizIndustry || "configurat"}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Motoare CORE</span>
              <span className="text-indigo-600 font-bold">WIF + Learning + Operational (mostenite)</span>
            </div>
          </div>

          <button onClick={() => setCompletedStages(prev => new Set([...prev, "ACTIVATE"]))}
            className="w-full py-3 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700">
            Activeaza business-ul
          </button>

          {completedStages.has("ACTIVATE") && (
            <div className="bg-emerald-100 rounded-lg p-3 text-center">
              <p className="text-sm font-bold text-emerald-700">Business activat cu succes!</p>
              <p className="text-xs text-emerald-600 mt-1">Puiul respira. Motoarele CORE il deservesc automat.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
