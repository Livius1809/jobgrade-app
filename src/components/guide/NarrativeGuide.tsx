"use client"

import { useState, useEffect, FormEvent } from "react"
import { useSearchParams, useRouter } from "next/navigation"

const SEEN_KEY = "jobgrade_consultant_intro_seen_v2"
const FREE_MINUTES_PER_MONTH = 135 // 3 sesiuni × 45 min (Q2 COG)
const COST_PER_MINUTE_CREDITS = 3 // 3 credite/min consultanță (Q2 COG)

/**
 * Consultant HR — bubble flotantă jos-dreapta.
 *
 * Două moduri tarifare distincte, cu indicator vizual PERMANENT:
 * 🟢 FAMILIARIZARE (gratuit) — întrebări despre platformă, servicii
 * 🟡 CONSULTANȚĂ (3 cr/min) — întrebări profesionale (norme, proceduri)
 *
 * Clientul vede MEREU în ce mod se află + counter minute gratuite.
 * Notificare explicită la tranziție familiarizare → consultanță.
 */
export default function NarrativeGuide() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [seenIntro, setSeenIntro] = useState(false)
  const [question, setQuestion] = useState("")
  const [submitted, setSubmitted] = useState(false)
  // Mod curent: familiarizare (gratuit) sau consultanță (plătit)
  const [mode, setMode] = useState<"FAMILIARIZARE" | "CONSULTANTA">("FAMILIARIZARE")
  // Counter minute gratuite rămase (persistent localStorage, reset lunar)
  const [freeMinutesLeft, setFreeMinutesLeft] = useState(FREE_MINUTES_PER_MONTH)
  // Tranziție: arătăm notificarea de trecere la plată
  const [showTransitionNotice, setShowTransitionNotice] = useState(false)

  const returnTo = searchParams.get("return_to")

  useEffect(() => {
    try {
      setSeenIntro(localStorage.getItem(SEEN_KEY) === "1")
      // Citim counter minute gratuite (cu reset lunar)
      const stored = localStorage.getItem("jobgrade_free_minutes_v1")
      if (stored) {
        const parsed = JSON.parse(stored)
        const storedMonth = parsed.month
        const currentMonth = `${new Date().getFullYear()}-${new Date().getMonth()}`
        if (storedMonth === currentMonth) {
          setFreeMinutesLeft(parsed.remaining)
        } else {
          // Luna nouă → reset
          localStorage.setItem("jobgrade_free_minutes_v1", JSON.stringify({
            month: currentMonth,
            remaining: FREE_MINUTES_PER_MONTH,
          }))
        }
      } else {
        localStorage.setItem("jobgrade_free_minutes_v1", JSON.stringify({
          month: `${new Date().getFullYear()}-${new Date().getMonth()}`,
          remaining: FREE_MINUTES_PER_MONTH,
        }))
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    if (returnTo) setOpen(true)
  }, [returnTo])

  function toggle() {
    setOpen((v) => !v)
    if (!open && !seenIntro) {
      setSeenIntro(true)
      try { localStorage.setItem(SEEN_KEY, "1") } catch {}
    }
  }

  function handleReturn() {
    if (!returnTo) return
    try { router.push(decodeURIComponent(returnTo)) } catch { router.back() }
  }

  function handleAsk(e: FormEvent) {
    e.preventDefault()
    if (!question.trim()) return

    // Placeholder: clasificare intent (va fi AI în viitor)
    // Pentru moment: dacă conține cuvinte cheie profesionale → CONSULTANȚĂ
    const professionalKeywords = /norm[aăe]|lege|legal|cod.*munc|concediu|demisie|preaviz|itm|anaf|salariu|contract|procedur[aăe]|regulament|audit|conformitate|directiv/i
    const isProfessional = professionalKeywords.test(question)

    if (isProfessional && mode === "FAMILIARIZARE") {
      // Tranziție: arătăm notificarea
      setShowTransitionNotice(true)
      return
    }

    setSubmitted(true)
  }

  function confirmTransition() {
    setMode("CONSULTANTA")
    setShowTransitionNotice(false)
    setSubmitted(true)
  }

  function cancelTransition() {
    setShowTransitionNotice(false)
  }

  const modeConfig = {
    FAMILIARIZARE: {
      badge: "🟢",
      label: "Familiarizare",
      sublabel: "gratuit",
      badgeBg: "bg-emerald-50 border-emerald-200 text-emerald-800",
    },
    CONSULTANTA: {
      badge: "🟡",
      label: "Consultanță",
      sublabel: `${COST_PER_MINUTE_CREDITS} cr/min`,
      badgeBg: "bg-amber-50 border-amber-200 text-amber-800",
    },
  }

  const currentMode = modeConfig[mode]

  return (
    <div className="fixed bottom-5 right-5 z-40 print:hidden">
      {/* Bubble închis */}
      {!open && (
        <button
          onClick={toggle}
          className="group relative flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
          aria-label="Deschide consultantul HR"
        >
          <span className="text-base">💡</span>
          <span className="text-sm font-medium">Consultant HR</span>
          {!seenIntro && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-coral rounded-full ring-2 ring-white">
              <span className="animate-ping absolute inset-0 rounded-full bg-coral opacity-60" />
            </span>
          )}
        </button>
      )}

      {/* Panel deschis */}
      {open && (
        <div className="w-80 max-w-[calc(100vw-2.5rem)] bg-white rounded-2xl shadow-2xl border border-indigo-200 overflow-hidden">
          {/* Header cu badge mod curent */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/40 px-4 py-3 border-b border-indigo-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-base">💡</span>
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-700">
                  Consultant HR
                </span>
              </div>
              <button
                onClick={toggle}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
                aria-label="Închide"
              >
                ×
              </button>
            </div>
            {/* Badge mod + counter — PERMANENT vizibil */}
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-medium ${currentMode.badgeBg}`}>
                {currentMode.badge} {currentMode.label} ({currentMode.sublabel})
              </span>
              {mode === "FAMILIARIZARE" && (
                <span className="text-[9px] text-emerald-700">
                  {freeMinutesLeft} min gratuite
                </span>
              )}
              {mode === "CONSULTANTA" && (
                <span className="text-[9px] text-amber-700">
                  {COST_PER_MINUTE_CREDITS} credite/min
                </span>
              )}
            </div>
          </div>

          {/* Bar walkthrough */}
          {returnTo && (
            <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-emerald-800 leading-snug">
                  📍 <strong>Aici găsești răspunsul.</strong>
                </p>
                <button
                  onClick={handleReturn}
                  className="flex-shrink-0 px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-medium rounded hover:bg-emerald-700 transition-colors whitespace-nowrap"
                >
                  ← Înapoi
                </button>
              </div>
            </div>
          )}

          {/* Notificare tranziție familiarizare → consultanță */}
          {showTransitionNotice && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
              <p className="text-[11px] text-amber-900 leading-snug mb-2">
                <strong>Întrebarea ta implică consultanță profesională.</strong>{" "}
                De aici se consumă {COST_PER_MINUTE_CREDITS} credite/minut.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={confirmTransition}
                  className="px-3 py-1 bg-amber-600 text-white text-[10px] font-medium rounded hover:bg-amber-700 transition-colors"
                >
                  Da, continui
                </button>
                <button
                  onClick={cancelTransition}
                  className="px-3 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] rounded hover:bg-slate-50 transition-colors"
                >
                  Rămân pe familiarizare
                </button>
              </div>
            </div>
          )}

          {/* Welcome */}
          <div className="p-4 space-y-3">
            <div className="flex gap-2">
              <span className="text-base flex-shrink-0">💡</span>
              <div className="flex-1 bg-indigo-50 rounded-2xl rounded-tl-sm px-3 py-2">
                <p className="text-xs text-slate-700 leading-relaxed">
                  Bună! Pe ce vă uitați azi? Aveți o întrebare specifică
                  sau căutați să rezolvați ceva anume?
                </p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 italic leading-snug pl-7">
              {mode === "FAMILIARIZARE"
                ? "Întrebările despre platformă și servicii sunt gratuite. Pentru consultanță profesională (norme, proceduri HR), veți fi notificat înainte de tarifare."
                : "Sunteți pe modul consultanță profesională. Se consumă credite."}
            </p>
          </div>

          {/* Input dialog */}
          <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3">
            <form onSubmit={handleAsk} className="space-y-2">
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={question}
                  onChange={(e) => {
                    setQuestion(e.target.value)
                    if (submitted) setSubmitted(false)
                  }}
                  placeholder={
                    mode === "FAMILIARIZARE"
                      ? "Cum funcționează evaluarea posturilor?"
                      : "Care sunt termenele legale pentru..."
                  }
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-md bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300"
                />
                <button
                  type="submit"
                  disabled={!question.trim()}
                  className="px-3 py-2 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Trimite
                </button>
              </div>
              {submitted && (
                <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mt-2">
                  <p className="text-[10px] text-amber-800 leading-snug">
                    📥 Mesajul a fost reținut. Modul conversațional cu AI
                    ajunge în curând — atunci consultantul va răspunde
                    direct, va pune întrebări de clarificare și, dacă e
                    cazul, vă va duce pe pagina cu răspunsul.
                  </p>
                </div>
              )}
            </form>
          </div>

          {/* Footer cu switch mod (pentru testing) */}
          {mode === "CONSULTANTA" && (
            <div className="border-t border-slate-100 px-4 py-2 bg-white">
              <button
                onClick={() => setMode("FAMILIARIZARE")}
                className="text-[9px] text-indigo-500 hover:underline"
              >
                ← Revin la familiarizare (gratuit)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
