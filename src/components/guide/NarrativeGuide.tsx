"use client"

import { useState, useEffect, FormEvent } from "react"
import { useSearchParams, useRouter } from "next/navigation"

const SEEN_KEY = "jobgrade_consultant_intro_seen_v2"

/**
 * Consultant HR — bubble flotantă jos-dreapta.
 *
 * Filosofie: dialog activ, ca un vânzător consultativ care folosește
 * întrebări deschise/închise pentru a ajunge la miezul dorinței
 * clientului — ce vrea să afle sau să facă. Nu așteaptă întrebări;
 * deschide discuția și o întreține.
 *
 * Iterația 1 (acum — UI chat-ready, fără AI încă):
 * - Welcome ca întrebare deschisă (deschide dialogul)
 * - Input enabled pentru typing (semnal de intenție)
 * - La submit: mesaj clar „AI conversațional ajunge în curând"
 * - Bar walkthrough activ când există ?return_to în URL
 *
 * Iterația viitoare:
 * - System prompt „vânzător consultativ HR" cu pattern open→narrow→close
 * - Backend Anthropic cu memory per sesiune
 * - Tool navigate_to (folosește return_to mecanism deja livrat)
 * - Adaptare pe rolul utilizatorului (HR Director vs Owner)
 */
export default function NarrativeGuide() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [seenIntro, setSeenIntro] = useState(false)
  const [question, setQuestion] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const returnTo = searchParams.get("return_to")

  useEffect(() => {
    try {
      setSeenIntro(localStorage.getItem(SEEN_KEY) === "1")
    } catch {
      // ignore
    }
  }, [])

  // Auto-deschide când suntem într-un walkthrough (consultantul ne-a adus aici)
  useEffect(() => {
    if (returnTo) setOpen(true)
  }, [returnTo])

  function toggle() {
    setOpen((v) => !v)
    if (!open && !seenIntro) {
      setSeenIntro(true)
      try {
        localStorage.setItem(SEEN_KEY, "1")
      } catch {
        // ignore
      }
    }
  }

  function handleReturn() {
    if (!returnTo) return
    try {
      router.push(decodeURIComponent(returnTo))
    } catch {
      router.back()
    }
  }

  function handleAsk(e: FormEvent) {
    e.preventDefault()
    if (!question.trim()) return
    // Placeholder — va activa chat AI în iterația viitoare
    setSubmitted(true)
  }

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
          {/* Header */}
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/40 px-4 py-3 flex items-center justify-between border-b border-indigo-100">
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

          {/* Bar walkthrough — vizibil doar când consultantul ne-a adus aici */}
          {returnTo && (
            <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-emerald-800 leading-snug">
                  📍 <strong>Aici găsești răspunsul.</strong> Când ai înțeles,
                  te întorc unde am plecat.
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

          {/* Welcome — primul mesaj e o întrebare deschisă (deschide dialogul) */}
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
              Sunt aici să vă ajut să găsiți rapid ce căutați — fie un
              răspuns la o întrebare profesională, fie ghidare prin
              platformă.
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
                  placeholder="Scrieți răspunsul sau întrebarea..."
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
        </div>
      )}
    </div>
  )
}
