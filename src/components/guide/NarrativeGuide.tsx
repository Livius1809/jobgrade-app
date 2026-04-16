"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { pickNarrative, type NarrativeContext, type UserRoleHint } from "@/lib/guide/messages"

interface NarrativeGuideProps {
  role: UserRoleHint | null
  hasIdentity?: boolean
  hasJobs?: boolean
  hasPayroll?: boolean
  relevanceIndex?: number
}

const SEEN_KEY = "jobgrade_guide_seen_v1"

export default function NarrativeGuide(props: NarrativeGuideProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set())

  // Hidratare seen din localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SEEN_KEY)
      if (raw) setSeenIds(new Set(JSON.parse(raw)))
    } catch {
      // ignore
    }
  }, [])

  const ctx: NarrativeContext = {
    pathname,
    role: props.role,
    hasIdentity: props.hasIdentity,
    hasJobs: props.hasJobs,
    hasPayroll: props.hasPayroll,
    relevanceIndex: props.relevanceIndex,
  }

  const message = pickNarrative(ctx)
  if (!message) return null

  const isUnseen = !seenIds.has(message.id)

  function markSeen() {
    const next = new Set(seenIds)
    next.add(message!.id)
    setSeenIds(next)
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(next)))
    } catch {
      // ignore
    }
  }

  function toggle() {
    setOpen((v) => !v)
    if (!open) markSeen()
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 print:hidden">
      {/* Bubble */}
      {!open && (
        <button
          onClick={toggle}
          className="group relative flex items-center gap-2 px-4 py-2.5 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
          aria-label="Deschide ghidul narativ"
        >
          <span className="text-base">🌟</span>
          <span className="text-sm font-medium">Ghid</span>
          {isUnseen && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-coral rounded-full ring-2 ring-white">
              <span className="animate-ping absolute inset-0 rounded-full bg-coral opacity-60" />
            </span>
          )}
        </button>
      )}

      {/* Panel deschis */}
      {open && (
        <div className="w-80 max-w-[calc(100vw-2.5rem)] bg-white rounded-2xl shadow-2xl border border-amber-200 overflow-hidden">
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 px-4 py-3 flex items-center justify-between border-b border-amber-100">
            <div className="flex items-center gap-2">
              <span className="text-base">🌟</span>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-700">
                Călăuza JobGrade
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
          <div className="p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">{message.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{message.body}</p>
            {message.cta && (
              <div className="pt-2">
                <Link
                  href={message.cta.href}
                  onClick={toggle}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-md text-xs font-medium hover:bg-amber-600 transition-colors"
                >
                  {message.cta.label}
                </Link>
              </div>
            )}
          </div>
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[9px] text-slate-400 italic">
              Sugestiile se adaptează la pagina și la contul tău
            </span>
            <button
              onClick={() => {
                try {
                  localStorage.removeItem(SEEN_KEY)
                  setSeenIds(new Set())
                } catch {
                  // ignore
                }
              }}
              className="text-[9px] text-slate-400 hover:text-slate-600 underline"
              title="Resetează istoricul mesajelor"
            >
              Resetează
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
