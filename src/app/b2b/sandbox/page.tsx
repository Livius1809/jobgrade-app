"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"

/* ═══════════════════════════════════════════════════════════════
   SANDBOX PUBLIC — Diagnostic organizațional gratuit
   Dashboard LIVE (stânga) + Chat ghidat (dreapta)
   Design consistent cu platforma reală.
   ═══════════════════════════════════════════════════════════════ */

interface OrgData {
  companyName: string
  industry: string
  employeeCount: number
  departments: string[]
  positions: string[]
  mainChallenge: string
}

interface ChatMessage {
  role: "assistant" | "user"
  content: string
}

// Obligații legale funcție de dimensiune
function getLegalObligations(empCount: number): Array<{ name: string; deadline: string; applies: boolean }> {
  return [
    { name: "Regulament Intern", deadline: "Obligatoriu de la 1 angajat", applies: empCount >= 1 },
    { name: "Evaluare riscuri SSM", deadline: "La angajare + anual", applies: empCount >= 1 },
    { name: "Fișe de post", deadline: "Obligatoriu per CIM", applies: empCount >= 1 },
    { name: "GDPR — Registru prelucrări", deadline: "Permanent", applies: empCount >= 1 },
    { name: "Revisal — Registru angajați", deadline: "La fiecare modificare", applies: empCount >= 1 },
    { name: "Raport transparență salarială", deadline: "Directiva EU 2023/970", applies: empCount >= 50 },
    { name: "Plan egalitate de șanse", deadline: "Anual, peste 50 ang.", applies: empCount >= 50 },
    { name: "Comitet SSM", deadline: "Obligatoriu peste 50 ang.", applies: empCount >= 50 },
    { name: "Audit pay gap detaliat", deadline: "Obligatoriu peste 100 ang.", applies: empCount >= 100 },
    { name: "Raportare nefinanciară", deadline: "Directiva CSRD, peste 250 ang.", applies: empCount >= 250 },
  ]
}

// Benchmark sectorial
function getBenchmark(industry: string, empCount: number): { avgPositions: number; avgDeptRatio: string; insight: string } {
  const benchmarks: Record<string, { posRatio: number; insight: string }> = {
    "producție": { posRatio: 0.15, insight: "Companiile din producție au nevoie de fișe de post detaliate pentru conformitate SSM" },
    "it": { posRatio: 0.25, insight: "Sectorul IT are cele mai diverse tipuri de posturi — evaluarea precisă previne inechitățile salariale" },
    "servicii": { posRatio: 0.18, insight: "În servicii, rotația personalului face evaluarea posturilor esențială pentru retenție" },
    "retail": { posRatio: 0.12, insight: "Retail-ul beneficiază de grile salariale clare — reduce fluctuația de personal" },
    "construcții": { posRatio: 0.13, insight: "Construcțiile necesită atenție specială la condițiile de muncă în evaluarea posturilor" },
    "sănătate": { posRatio: 0.20, insight: "Sectorul medical are cerințe stricte de calificări — fișele de post bine structurate sunt esențiale" },
  }
  const match = Object.entries(benchmarks).find(([k]) => industry.toLowerCase().includes(k))
  const bm = match?.[1] || { posRatio: 0.17, insight: "Evaluarea structurată a posturilor aduce claritate și conformitate legală" }
  const avgPositions = Math.max(3, Math.round(empCount * bm.posRatio))
  return { avgPositions, avgDeptRatio: `1 dept. la ${Math.round(empCount / Math.max(1, Math.round(empCount / 15)))} ang.`, insight: bm.insight }
}

const INITIAL_MESSAGE = `Sunt ghidul platformei JobGrade.

Veți primi gratuit un diagnostic vizual al structurii organizaționale, cu obligațiile legale aplicabile și recomandări concrete.

Ca să începem, spuneți-mi: **cum se numește compania dumneavoastră?**`

export default function SandboxPage() {
  const [step, setStep] = useState(0)
  const [orgData, setOrgData] = useState<OrgData>({
    companyName: "",
    industry: "",
    employeeCount: 0,
    departments: [],
    positions: [],
    mainChallenge: "",
  })
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: INITIAL_MESSAGE },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [diagnosticText, setDiagnosticText] = useState("")
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const STEPS = [
    { field: "companyName", nextQ: "În ce domeniu activați? (ex: producție, IT, servicii, retail, construcții)" },
    { field: "industry", nextQ: "Aproximativ câți angajați aveți?" },
    { field: "employeeCount", nextQ: "Care sunt departamentele principale? (separate prin virgulă)" },
    { field: "departments", nextQ: "Menționați 2-3 posturi cheie (ex: Director General, Manager Producție, Specialist HR)" },
    { field: "positions", nextQ: "Care este principala provocare organizațională acum?\n(ex: restructurare, conformitate EU, optimizare costuri, retenție personal)" },
    { field: "mainChallenge", nextQ: null },
  ]

  async function handleSend() {
    if (!input.trim() || isLoading) return
    const userMsg = input.trim()
    setInput("")
    setMessages(prev => [...prev, { role: "user", content: userMsg }])

    const currentStep = STEPS[step]
    if (currentStep) {
      const field = currentStep.field as keyof OrgData
      if (field === "departments" || field === "positions") {
        setOrgData(prev => ({ ...prev, [field]: userMsg.split(",").map(s => s.trim()).filter(Boolean) }))
      } else if (field === "employeeCount") {
        setOrgData(prev => ({ ...prev, employeeCount: parseInt(userMsg) || 0 }))
      } else {
        setOrgData(prev => ({ ...prev, [field]: userMsg }))
      }
    }

    setIsLoading(true)

    if (step < STEPS.length - 1 && STEPS[step].nextQ) {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: "assistant", content: STEPS[step].nextQ! }])
        setStep(prev => prev + 1)
        setIsLoading(false)
      }, 500)
    } else {
      setStep(prev => prev + 1)
      await generateDiagnostic(userMsg)
    }
  }

  async function generateDiagnostic(challenge: string) {
    const updatedData = { ...orgData, mainChallenge: challenge }
    try {
      const res = await fetch("/api/v1/flying-wheels/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Compania "${updatedData.companyName}" din domeniul ${updatedData.industry}, cu ${updatedData.employeeCount} angajați. Departamente: ${updatedData.departments.join(", ")}. Posturi cheie: ${updatedData.positions.join(", ")}. Provocare: ${updatedData.mainChallenge}. Oferă un diagnostic organizațional scurt (3-4 paragrafe) cu recomandări concrete.`,
          currentPage: "/b2b/sandbox",
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setDiagnosticText(data.response)
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `Diagnosticul este gata — îl vedeți în panoul din stânga.\n\nPentru a salva diagnosticul și a continua cu analiza completă, creați un cont gratuit. Datele introduse se păstrează automat.`,
        }])
      } else {
        setDiagnosticText(`Diagnostic de bază pentru ${updatedData.companyName}: ${updatedData.employeeCount} angajați, ${updatedData.departments.length} departamente, ${updatedData.positions.length} posturi cheie. Provocare principală: ${updatedData.mainChallenge}.`)
        setMessages(prev => [...prev, { role: "assistant", content: "Diagnosticul de bază este gata — îl vedeți în stânga." }])
      }
    } catch {
      setDiagnosticText(`${updatedData.companyName}: ${updatedData.employeeCount} angajați, ${updatedData.departments.length} departamente.`)
      setMessages(prev => [...prev, { role: "assistant", content: "Diagnosticul de bază este gata." }])
    }
    setIsLoading(false)
  }

  const progress = Math.min(100, Math.round((step / STEPS.length) * 100))
  const obligations = getLegalObligations(orgData.employeeCount)
  const applicableObligations = obligations.filter(o => o.applies)
  const benchmark = orgData.industry ? getBenchmark(orgData.industry, orgData.employeeCount) : null
  const structureScore = orgData.departments.length > 0 && orgData.positions.length > 0
    ? Math.min(100, Math.round((orgData.positions.length / Math.max(1, orgData.departments.length)) * 20 + (orgData.departments.length > 2 ? 30 : 10) + (orgData.employeeCount > 10 ? 20 : 5)))
    : 0

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--hero-bg-bottom)" }}>
      {/* Banner test mode */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-center">
        <p className="text-xs text-amber-700">
          Versiune demonstrativă — nu include acțiuni sau tranzacții cu impact real
        </p>
      </div>

      {/* Header — consistent cu platforma */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center justify-between px-6 h-14" style={{ maxWidth: "72rem", margin: "0 auto" }}>
          <Link href="/" className="flex items-center gap-2">
            <Image src="/favicon.svg" alt="JobGrade" width={28} height={28} />
            <span className="text-base font-semibold" style={{ color: "var(--indigo-dark)" }}>JobGrade</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:inline">Diagnostic gratuit</span>
            <Link
              href="/b2b/abonamente"
              className="text-sm font-medium px-4 py-1.5 rounded-full border transition-colors hover:bg-indigo-50"
              style={{ borderColor: "var(--indigo)", color: "var(--indigo)" }}
            >
              Pachete și prețuri
            </Link>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="px-6 pt-3">
        <div style={{ maxWidth: "72rem", margin: "0 auto" }}>
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: "var(--indigo)" }} />
          </div>
        </div>
      </div>

      {/* Main — dashboard stânga + chat dreapta */}
      <main className="flex-1 flex" style={{ maxWidth: "72rem", margin: "0 auto", width: "100%", padding: "16px 24px" }}>

        {/* ═══ DASHBOARD STÂNGA (65%) ═══ */}
        <div className="flex-1 pr-4 overflow-y-auto space-y-4" style={{ maxHeight: "calc(100vh - 120px)" }}>

          {/* Card: Structură organizațională */}
          <div className={`bg-white rounded-xl border p-5 transition-all duration-500 ${orgData.companyName ? "opacity-100 border-gray-200" : "opacity-40 border-dashed border-gray-300"}`}>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Structura organizațională</h3>
            {orgData.companyName ? (
              <div>
                <p className="text-lg font-bold" style={{ color: "var(--indigo-dark)" }}>{orgData.companyName}</p>
                {orgData.industry && <p className="text-sm text-gray-500 mt-0.5">Domeniu: {orgData.industry}</p>}
                {orgData.employeeCount > 0 && <p className="text-sm text-gray-500">{orgData.employeeCount} angajați</p>}

                {orgData.departments.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-gray-400 mb-1.5">DEPARTAMENTE</p>
                    <div className="flex flex-wrap gap-1.5">
                      {orgData.departments.map((d, i) => (
                        <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">{d}</span>
                      ))}
                    </div>
                  </div>
                )}

                {orgData.positions.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-gray-400 mb-1.5">POSTURI CHEIE</p>
                    <div className="flex flex-wrap gap-1.5">
                      {orgData.positions.map((p, i) => (
                        <span key={i} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">{p}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scor structură */}
                {structureScore > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Scor structură organizațională</span>
                      <span className="text-sm font-bold" style={{ color: structureScore > 60 ? "#059669" : structureScore > 30 ? "#D97706" : "#DC2626" }}>
                        {structureScore}/100
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{
                        width: `${structureScore}%`,
                        background: structureScore > 60 ? "#059669" : structureScore > 30 ? "#D97706" : "#DC2626",
                      }} />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Se completează pe măsură ce introduceți date...</p>
            )}
          </div>

          {/* Card: Obligații legale */}
          <div className={`bg-white rounded-xl border p-5 transition-all duration-500 ${orgData.employeeCount > 0 ? "opacity-100 border-gray-200" : "opacity-40 border-dashed border-gray-300"}`}>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Calendar obligații legale
              {applicableObligations.length > 0 && (
                <span className="ml-2 text-xs font-normal px-2 py-0.5 bg-red-50 text-red-600 rounded-full">
                  {applicableObligations.length} obligații aplicabile
                </span>
              )}
            </h3>
            {orgData.employeeCount > 0 ? (
              <div className="space-y-1.5">
                {obligations.map((ob, i) => (
                  <div key={i} className={`flex items-center justify-between py-1.5 px-2 rounded text-xs ${ob.applies ? "bg-red-50" : "bg-gray-50 opacity-50"}`}>
                    <span className={ob.applies ? "text-gray-800 font-medium" : "text-gray-400"}>{ob.name}</span>
                    <span className={ob.applies ? "text-red-600 font-medium" : "text-gray-300"}>{ob.applies ? ob.deadline : "Nu se aplică"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Introduceți numărul de angajați pentru a vedea obligațiile aplicabile</p>
            )}
          </div>

          {/* Card: Benchmark sectorial */}
          {benchmark && orgData.industry && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Benchmark sectorial</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-indigo-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold" style={{ color: "var(--indigo)" }}>{benchmark.avgPositions}</p>
                  <p className="text-xs text-gray-500">Posturi medii în sector</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold" style={{ color: "var(--indigo)" }}>{benchmark.avgDeptRatio}</p>
                  <p className="text-xs text-gray-500">Ratio departamente</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{benchmark.insight}</p>
            </div>
          )}

          {/* Card: Diagnostic AI */}
          {diagnosticText && (
            <div className="bg-white rounded-xl border border-indigo-200 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "var(--indigo)" }}>Diagnostic organizațional</h3>
              <div className="text-sm text-gray-700 leading-relaxed space-y-2">
                {diagnosticText.split("\n\n").filter(Boolean).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          )}

          {/* Card: Premium — marcat clar */}
          <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm">🔒</span>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Disponibil cu abonament</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                "Evaluare AI pe 6 criterii",
                "Pay gap analysis",
                "Simulări salariale",
                "Rapoarte PDF",
                "Grilă salarială",
                "Manual calitate",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-xs text-gray-400 py-1">
                  <span className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center text-gray-300">✦</span>
                  {feature}
                </div>
              ))}
            </div>
            <Link
              href="/b2b/abonamente"
              className="inline-block mt-3 text-xs font-medium underline"
              style={{ color: "var(--indigo)" }}
            >
              Vezi pachete și prețuri →
            </Link>
          </div>

          {/* CTA salvare */}
          {step >= STEPS.length && (
            <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-5 text-center">
              <p className="text-sm text-gray-700 mb-3">Vreți să salvați acest diagnostic și să continuați cu analiza completă?</p>
              <Link
                href="/register"
                className="inline-block px-6 py-2.5 rounded-full text-white text-sm font-semibold transition-transform hover:scale-105"
                style={{ background: "var(--indigo)" }}
              >
                Creează cont gratuit — datele se păstrează
              </Link>
            </div>
          )}
        </div>

        {/* ═══ CHAT DREAPTA (35%) ═══ */}
        <div className="w-[360px] flex-shrink-0 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ maxHeight: "calc(100vh - 120px)" }}>
          {/* Chat header */}
          <div className="px-4 py-3 border-b border-gray-100" style={{ background: "var(--indigo)" }}>
            <p className="text-white text-sm font-semibold">Ghidul JobGrade</p>
            <p className="text-indigo-200 text-xs">Diagnostic gratuit pas cu pas</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "text-gray-800"
                    : "bg-gray-50 text-gray-700"
                }`} style={msg.role === "user" ? { background: "#EEF2FF" } : {}}>
                  {msg.content.split("\n").map((line, j) => {
                    if (line.startsWith("**") && line.endsWith("**")) return <p key={j} className="font-semibold my-0.5">{line.replace(/\*\*/g, "")}</p>
                    if (line.startsWith("- ")) return <p key={j} className="ml-2 my-0.5 text-xs">• {line.replace("- ", "")}</p>
                    if (line.trim() === "") return <br key={j} />
                    return <p key={j} className="my-0.5">{line}</p>
                  })}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-50 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-100 p-3">
            <form onSubmit={(e) => { e.preventDefault(); handleSend() }} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Scrieți aici..."
                className="flex-1 px-3.5 py-2 rounded-full border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                disabled={isLoading || step > STEPS.length}
                autoFocus
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading || step > STEPS.length}
                className="px-4 py-2 rounded-full text-white text-sm font-medium transition-opacity disabled:opacity-40"
                style={{ background: "var(--indigo)" }}
              >
                ➤
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
