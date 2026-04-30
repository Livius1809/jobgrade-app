"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"

/* ═══════════════════════════════════════════════════════════════
   SANDBOX PUBLIC — Diagnostic organizațional gratuit
   Fără login. Date proprii. Transparență totală.
   ═══════════════════════════════════════════════════════════════ */

interface OrgData {
  companyName: string
  industry: string
  employeeCount: string
  departments: string[]
  positions: string[]
  mainChallenge: string
}

interface ChatMessage {
  role: "assistant" | "user"
  content: string
}

const INITIAL_MESSAGE = `Bine ați venit! Sunt ghidul platformei JobGrade.

Vă ajut să vedeți cum arată o analiză organizațională pe datele companiei dumneavoastră — complet gratuit, fără obligații.

**Ce primiți gratuit:**
- Diagnostic de bază al structurii organizaționale
- Calendar cu obligațiile legale aplicabile
- Evaluarea primelor 2-3 posturi
- Recomandări personalizate

**Ce este premium (cu abonament):**
- Rapoarte complete (pay gap, audit, 3C)
- Export PDF/Excel
- Simulări și scenarii
- Consultant HR dedicat

Ca să începem, spuneți-mi: **cum se numește compania dumneavoastră?**`

export default function SandboxPage() {
  const [step, setStep] = useState(0)
  const [orgData, setOrgData] = useState<OrgData>({
    companyName: "",
    industry: "",
    employeeCount: "",
    departments: [],
    positions: [],
    mainChallenge: "",
  })
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: INITIAL_MESSAGE },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Pașii ghidajului
  const STEPS = [
    { field: "companyName", nextQ: "În ce domeniu activați? (ex: producție, IT, servicii, retail)" },
    { field: "industry", nextQ: "Aproximativ câți angajați aveți?" },
    { field: "employeeCount", nextQ: "Care sunt departamentele principale? (separate prin virgulă)" },
    { field: "departments", nextQ: "Menționați 2-3 posturi cheie din organizație (ex: Director General, Manager Producție, Specialist HR)" },
    { field: "positions", nextQ: "Care este principala provocare organizațională acum? (ex: restructurare, conformitate EU, optimizare costuri, retenție personal)" },
    { field: "mainChallenge", nextQ: null },
  ]

  async function handleSend() {
    if (!input.trim() || isLoading) return

    const userMsg = input.trim()
    setInput("")
    setMessages(prev => [...prev, { role: "user", content: userMsg }])

    // Salvăm datele per pas
    const currentStep = STEPS[step]
    if (currentStep) {
      const field = currentStep.field as keyof OrgData
      if (field === "departments" || field === "positions") {
        setOrgData(prev => ({ ...prev, [field]: userMsg.split(",").map(s => s.trim()).filter(Boolean) }))
      } else {
        setOrgData(prev => ({ ...prev, [field]: userMsg }))
      }
    }

    setIsLoading(true)

    // Dacă mai avem pași, răspundem cu următoarea întrebare
    if (step < STEPS.length - 1 && STEPS[step].nextQ) {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: "assistant", content: STEPS[step].nextQ! }])
        setStep(prev => prev + 1)
        setIsLoading(false)
      }, 500)
    } else {
      // Ultimul pas — generăm diagnosticul
      setStep(prev => prev + 1)
      await generateDiagnostic(userMsg)
    }
  }

  async function generateDiagnostic(challenge: string) {
    const updatedData = { ...orgData, mainChallenge: challenge }

    try {
      // Apelăm FW chat cu contextul organizației
      const res = await fetch("/api/v1/flying-wheels/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Compania "${updatedData.companyName}" din domeniul ${updatedData.industry}, cu aproximativ ${updatedData.employeeCount} angajați. Departamente: ${updatedData.departments.join(", ")}. Posturi cheie: ${updatedData.positions.join(", ")}. Provocare principală: ${updatedData.mainChallenge}. Oferă un diagnostic organizațional scurt și recomandări concrete.`,
          currentPage: "/sandbox",
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `## Diagnostic ${updatedData.companyName}\n\n${data.response}\n\n---\n\n**Vreți să salvați acest diagnostic și să continuați cu analiza completă?**\n\nCreați un cont gratuit — datele introduse se păstrează automat.\n\n[Creează cont și continuă →](/register)`,
        }])
      } else {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `Am pregătit o primă analiză pentru **${updatedData.companyName}**:\n\n- **${updatedData.employeeCount} angajați** în **${updatedData.departments.length} departamente**\n- **${updatedData.positions.length} posturi cheie** identificate\n- Provocare: ${updatedData.mainChallenge}\n\nPentru un diagnostic detaliat cu evaluare pe cele 6 criterii, pay gap analysis și recomandări concrete, creați un cont gratuit.\n\nDatele introduse se păstrează automat.\n\n[Creează cont și continuă →](/register)`,
        }])
      }
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Am înregistrat datele pentru **${updatedData.companyName}** (${updatedData.employeeCount} angajați, ${updatedData.departments.length} departamente).\n\nPentru diagnosticul complet, creați un cont gratuit — totul se păstrează.\n\n[Creează cont și continuă →](/register)`,
      }])
    }

    setIsLoading(false)
  }

  // Progress indicator
  const progress = Math.min(100, Math.round((step / STEPS.length) * 100))

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, var(--hero-bg-top) 0%, var(--hero-bg-bottom) 100%)" }}>
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/favicon.svg" alt="JobGrade" width={32} height={32} />
          <span className="font-semibold text-lg" style={{ color: "var(--indigo)" }}>JobGrade</span>
        </Link>
        <Link
          href="/b2b/abonamente"
          className="text-sm font-medium px-4 py-2 rounded-full border transition-colors"
          style={{ borderColor: "var(--indigo)", color: "var(--indigo)" }}
        >
          Vezi prețurile
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-16">
        {/* Titlu + transparență */}
        <div className="text-center mb-8 pt-4">
          <h1 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: "var(--indigo-dark)" }}>
            Diagnostic organizațional gratuit
          </h1>
          <p className="text-base text-gray-600 max-w-xl mx-auto">
            Introduceți datele companiei dumneavoastră și primiți o analiză de bază — gratuit, fără cont, fără obligații.
            Prețurile complete sunt vizibile <Link href="/b2b/abonamente" className="underline" style={{ color: "var(--indigo)" }}>aici</Link>.
          </p>
        </div>

        {/* Progress bar */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: "var(--indigo)" }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1 text-right">{progress}% completat</p>
        </div>

        {/* Chat area */}
        <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Messages */}
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-indigo-50 text-gray-800"
                      : "bg-gray-50 text-gray-700"
                  }`}
                  style={msg.role === "user" ? { background: "#EEF2FF" } : {}}
                >
                  {msg.content.split("\n").map((line, j) => {
                    if (line.startsWith("## ")) return <h3 key={j} className="font-bold text-base mb-2">{line.replace("## ", "")}</h3>
                    if (line.startsWith("**") && line.endsWith("**")) return <p key={j} className="font-semibold my-1">{line.replace(/\*\*/g, "")}</p>
                    if (line.startsWith("- ")) return <p key={j} className="ml-3 my-0.5">• {line.replace("- ", "")}</p>
                    if (line.startsWith("[") && line.includes("](/")) {
                      const match = line.match(/\[(.+?)\]\((.+?)\)/)
                      if (match) return (
                        <Link key={j} href={match[2]} className="inline-block mt-3 px-5 py-2.5 rounded-full text-white text-sm font-semibold" style={{ background: "var(--indigo)" }}>
                          {match[1]}
                        </Link>
                      )
                    }
                    if (line === "---") return <hr key={j} className="my-3 border-gray-200" />
                    if (line.trim() === "") return <br key={j} />
                    return <p key={j} className="my-1">{line}</p>
                  })}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-50 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          {step <= STEPS.length && (
            <div className="border-t border-gray-100 p-4">
              <form onSubmit={(e) => { e.preventDefault(); handleSend() }} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Scrieți aici..."
                  className="flex-1 px-4 py-2.5 rounded-full border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="px-5 py-2.5 rounded-full text-white text-sm font-medium transition-opacity disabled:opacity-40"
                  style={{ background: "var(--indigo)" }}
                >
                  Trimite
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Prețuri vizibile */}
        <div className="max-w-2xl mx-auto mt-8 grid grid-cols-3 gap-3">
          {[
            { name: "Essentials", price: "299", range: "1-50 ang.", credit: "8,00" },
            { name: "Business", price: "599", range: "51-200 ang.", credit: "6,50" },
            { name: "Enterprise", price: "999", range: "200+ ang.", credit: "5,50" },
          ].map((tier) => (
            <div key={tier.name} className="bg-white rounded-lg border border-gray-100 p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">{tier.range}</p>
              <p className="font-bold text-lg" style={{ color: "var(--indigo)" }}>{tier.name}</p>
              <p className="text-xl font-bold text-gray-800 mt-1">{tier.price} <span className="text-xs font-normal text-gray-500">RON/lună</span></p>
              <p className="text-xs text-gray-400 mt-1">{tier.credit} RON/credit</p>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-gray-400 mt-3">
          Diagnosticul de bază este gratuit. Prețurile sunt pentru funcționalitățile premium.
          <br />
          <Link href="/b2b/abonamente" className="underline" style={{ color: "var(--indigo)" }}>Detalii complete</Link>
        </p>
      </main>
    </div>
  )
}
