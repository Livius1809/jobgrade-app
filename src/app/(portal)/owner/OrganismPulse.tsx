"use client"

import { useState } from "react"

interface VitalSignTest {
  name: string
  status: "PASS" | "WARN" | "FAIL" | "SKIP"
  notes?: string
  metrics?: Record<string, unknown>
}

interface OrganismPulseProps {
  verdict: "ALIVE" | "WEAKENED" | "CRITICAL" | "UNKNOWN"
  summary: { pass: number; warn: number; fail: number; skip: number }
  runAt: string | null
  tests: VitalSignTest[]
}

// ── Verdict config ──────────────────────────────────────────────────────────

const VERDICT_CONFIG = {
  ALIVE: {
    label: "🟢 ALIVE",
    description: "Organismul funcționează autonom, toate semnele vitale în parametri",
    bgClass: "bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent",
    borderClass: "border-emerald-500/30",
    textClass: "text-emerald-600 dark:text-emerald-400",
    pulseClass: "animate-pulse",
  },
  WEAKENED: {
    label: "🟡 WEAKENED",
    description: "Organism funcțional dar cu semne de slăbire — atenție recomandată",
    bgClass: "bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent",
    borderClass: "border-amber-500/30",
    textClass: "text-amber-600 dark:text-amber-400",
    pulseClass: "",
  },
  CRITICAL: {
    label: "🔴 CRITICAL",
    description: "Organism în stare critică — intervenție urgentă necesară",
    bgClass: "bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent",
    borderClass: "border-rose-500/40",
    textClass: "text-rose-600 dark:text-rose-400",
    pulseClass: "animate-pulse",
  },
  UNKNOWN: {
    label: "⚪ NERULAT",
    description: "Vital signs nerulate. Rulează: npx tsx scripts/test-living-organism.ts",
    bgClass: "bg-gradient-to-br from-gray-500/10 via-gray-500/5 to-transparent",
    borderClass: "border-gray-300",
    textClass: "text-gray-500",
    pulseClass: "",
  },
} as const

// ── Test status dot config ──────────────────────────────────────────────────

const DOT_CONFIG = {
  PASS: { emoji: "🟢", label: "PASS", ring: "ring-emerald-500/50", bg: "bg-emerald-500" },
  WARN: { emoji: "🟡", label: "WARN", ring: "ring-amber-500/50", bg: "bg-amber-500" },
  FAIL: { emoji: "🔴", label: "FAIL", ring: "ring-rose-500/50", bg: "bg-rose-500" },
  SKIP: { emoji: "⚪", label: "SKIP", ring: "ring-gray-300", bg: "bg-gray-300" },
} as const

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string | null): string {
  if (!iso) return "nicicând"
  try {
    const then = new Date(iso).getTime()
    const now = Date.now()
    const diffMs = now - then
    const diffMin = Math.floor(diffMs / 60_000)
    const diffHours = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHours / 24)
    if (diffMin < 1) return "acum câteva secunde"
    if (diffMin < 60) return `acum ${diffMin} min`
    if (diffHours < 24) return `acum ${diffHours}h`
    if (diffDays < 30) return `acum ${diffDays} zile`
    return new Date(iso).toLocaleDateString("ro-RO")
  } catch {
    return iso
  }
}

function shortTestName(name: string): string {
  // "1. Respirație" → "Respirație"
  return name.replace(/^\d+\.\s*/, "")
}

// ── Component ───────────────────────────────────────────────────────────────

export default function OrganismPulse({
  verdict,
  summary,
  runAt,
  tests,
}: OrganismPulseProps) {
  const [expandedTest, setExpandedTest] = useState<number | null>(null)
  const VERDICT_ALIAS: Record<string, keyof typeof VERDICT_CONFIG> = {
    HEALTHY: "ALIVE", WARNING: "WEAKENED", CRITICAL: "CRITICAL",
  }
  const key = (VERDICT_ALIAS[verdict as string] ?? verdict) as keyof typeof VERDICT_CONFIG
  const config = VERDICT_CONFIG[key] || VERDICT_CONFIG.UNKNOWN

  return (
    <section
      className={`rounded-2xl border-2 ${config.borderClass} ${config.bgClass} p-6 shadow-sm`}
    >
      {/* ── Header verdict ──────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-text-secondary/80">
              Organism Pulse
            </h2>
            <span className="text-[10px] text-text-secondary/50">
              · vital signs {formatRelativeTime(runAt)}
            </span>
          </div>
          <div className={`text-2xl font-bold tracking-tight ${config.textClass} ${config.pulseClass}`}>
            {config.label}
          </div>
          <p className="text-xs text-text-secondary mt-1 max-w-md">
            {config.description}
          </p>
        </div>

        {/* Summary counts */}
        <div className="flex gap-3 text-xs">
          <SummaryChip label="PASS" count={summary.pass} color="emerald" />
          <SummaryChip label="WARN" count={summary.warn} color="amber" />
          <SummaryChip label="FAIL" count={summary.fail} color="rose" />
          <SummaryChip label="SKIP" count={summary.skip} color="gray" />
        </div>
      </div>

      {/* ── 10 puncte colorate ──────────────────────────────────── */}
      {tests.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {tests.map((test, i) => {
              const dot = DOT_CONFIG[test.status]
              const isExpanded = expandedTest === i
              return (
                <button
                  key={i}
                  onClick={() => setExpandedTest(isExpanded ? null : i)}
                  className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:scale-105 ${
                    isExpanded
                      ? `ring-2 ${dot.ring} bg-white/70 dark:bg-white/5`
                      : "hover:bg-white/50 dark:hover:bg-white/5"
                  }`}
                  title={`${shortTestName(test.name)} — ${dot.label}`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${dot.bg}`} />
                  <span className="text-text-secondary group-hover:text-foreground transition-colors">
                    {shortTestName(test.name)}
                  </span>
                </button>
              )
            })}
          </div>

          {/* ── Detaliu test expandat ──────────────────────────── */}
          {expandedTest !== null && tests[expandedTest] && (
            <div className="mt-3 p-4 rounded-lg bg-white/60 dark:bg-black/20 border border-border/50 text-xs">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2.5 h-2.5 rounded-full ${DOT_CONFIG[tests[expandedTest].status].bg}`} />
                    <strong className="text-sm text-foreground">
                      {tests[expandedTest].name}
                    </strong>
                    <span className={`text-[10px] uppercase tracking-wider font-bold ${
                      tests[expandedTest].status === "PASS" ? "text-emerald-600" :
                      tests[expandedTest].status === "WARN" ? "text-amber-600" :
                      tests[expandedTest].status === "FAIL" ? "text-rose-600" :
                      "text-gray-500"
                    }`}>
                      {tests[expandedTest].status}
                    </span>
                  </div>
                  {tests[expandedTest].notes && (
                    <p className="text-text-secondary italic">
                      &ldquo;{tests[expandedTest].notes}&rdquo;
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setExpandedTest(null)}
                  className="text-text-secondary/50 hover:text-foreground text-lg leading-none"
                  aria-label="Închide detaliu"
                >
                  ×
                </button>
              </div>

              {/* Metrici */}
              {tests[expandedTest].metrics &&
                Object.keys(tests[expandedTest].metrics!).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border/30">
                    <div className="text-[10px] uppercase tracking-wider text-text-secondary/60 mb-1.5">
                      Metrici
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 font-mono text-[11px]">
                      {Object.entries(tests[expandedTest].metrics!).slice(0, 9).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2">
                          <span className="text-text-secondary/70 truncate">{k}:</span>
                          <span className="text-foreground truncate">
                            {typeof v === "object" ? JSON.stringify(v).slice(0, 20) : String(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          )}
        </>
      ) : (
        <div className="text-xs text-text-secondary/70 italic">
          Niciun test rulat încă. Rulează manual:
          <code className="ml-1.5 px-1.5 py-0.5 bg-black/10 dark:bg-white/10 rounded font-mono text-[11px]">
            npx tsx scripts/test-living-organism.ts
          </code>
        </div>
      )}
    </section>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SummaryChip({
  label,
  count,
  color,
}: {
  label: string
  count: number
  color: "emerald" | "amber" | "rose" | "gray"
}) {
  const colorMap = {
    emerald: "text-emerald-600 bg-emerald-500/10",
    amber: "text-amber-600 bg-amber-500/10",
    rose: "text-rose-600 bg-rose-500/10",
    gray: "text-gray-500 bg-gray-500/10",
  }
  return (
    <div className={`px-2.5 py-1 rounded-md font-mono font-bold ${colorMap[color]}`}>
      {count}
      <span className="ml-1 text-[9px] font-normal opacity-70">{label}</span>
    </div>
  )
}
