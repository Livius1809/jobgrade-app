"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import type { DataQualityReport, DataQualityIssue, IssueSeverity } from "@/lib/data-quality"

interface Props {
  initialReport: DataQualityReport
}

const severityConfig: Record<IssueSeverity, { label: string; color: string; icon: string; bgColor: string }> = {
  BLOCKER: { label: "Blocker", color: "text-red-700", icon: "🔴", bgColor: "bg-red-50 border-red-200" },
  IMPORTANT: { label: "Important", color: "text-orange-700", icon: "🟡", bgColor: "bg-orange-50 border-orange-200" },
  QUESTION: { label: "Clarificare", color: "text-blue-700", icon: "🔵", bgColor: "bg-blue-50 border-blue-200" },
  INFO: { label: "Informativ", color: "text-gray-600", icon: "ℹ️", bgColor: "bg-gray-50 border-gray-200" },
}

export function DataQualityClient({ initialReport }: Props) {
  const router = useRouter()
  const [report, setReport] = useState(initialReport)
  const [resolving, setResolving] = useState<string | null>(null)
  const [freeText, setFreeText] = useState<Record<string, string>>({})

  const handleResolve = useCallback(async (issueId: string, response: string, selectedOption?: string) => {
    setResolving(issueId)
    try {
      const res = await fetch("/api/v1/data-quality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId, response, selectedOption }),
      })
      if (res.ok) {
        setReport(prev => ({
          ...prev,
          issues: prev.issues.map(i =>
            i.id === issueId ? { ...i, resolved: true, clientResponse: selectedOption || response } : i
          ),
          summary: {
            ...prev.summary,
            resolved: prev.summary.resolved + 1,
          },
        }))
      }
    } finally {
      setResolving(null)
    }
  }, [])

  const unresolvedIssues = report.issues.filter(i => !i.resolved)
  const resolvedIssues = report.issues.filter(i => i.resolved)
  const progress = report.issues.length > 0
    ? Math.round((resolvedIssues.length / report.issues.length) * 100)
    : 100

  return (
    <div className="space-y-6">
      {/* ─── Scor + Progress ─── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border bg-card">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Scor calitate</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${
              report.overallScore >= 80 ? "text-emerald-600" :
              report.overallScore >= 50 ? "text-orange-600" : "text-red-600"
            }`}>
              {report.overallScore}
            </span>
            <span className="text-sm text-muted-foreground">/ 100</span>
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-card">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Progres rezolvare</span>
          <div className="mt-2">
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {resolvedIssues.length} / {report.issues.length} rezolvate
            </p>
          </div>
        </div>

        <div className="p-4 rounded-lg border bg-card">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Pregătit pentru evaluare</span>
          <div className="mt-1">
            {report.summary.blockers === 0 || unresolvedIssues.filter(i => i.severity === "BLOCKER").length === 0 ? (
              <div>
                <span className="text-2xl">✅</span>
                <p className="text-xs text-emerald-600 mt-1">Puteți lansa evaluarea</p>
              </div>
            ) : (
              <div>
                <span className="text-2xl">⏳</span>
                <p className="text-xs text-orange-600 mt-1">
                  {unresolvedIssues.filter(i => i.severity === "BLOCKER").length} blocker(e) de rezolvat
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Summary badges ─── */}
      <div className="flex gap-2">
        {Object.entries(severityConfig).map(([sev, config]) => {
          const count = unresolvedIssues.filter(i => i.severity === sev).length
          if (count === 0) return null
          return (
            <span key={sev} className={`text-xs px-2 py-1 rounded-full border ${config.bgColor} ${config.color}`}>
              {config.icon} {count} {config.label.toLowerCase()}
            </span>
          )
        })}
      </div>

      {/* ─── Unresolved issues (sorted by severity) ─── */}
      {unresolvedIssues.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">De rezolvat</h2>
          {sortBySeverity(unresolvedIssues).map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              resolving={resolving === issue.id}
              freeText={freeText[issue.id] || ""}
              onFreeTextChange={(text) => setFreeText(prev => ({ ...prev, [issue.id]: text }))}
              onResolve={handleResolve}
            />
          ))}
        </div>
      )}

      {/* ─── Resolved issues (collapsed) ─── */}
      {resolvedIssues.length > 0 && (
        <details className="group">
          <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
            ✓ {resolvedIssues.length} rezolvate — click pentru detalii
          </summary>
          <div className="mt-2 space-y-2 opacity-60">
            {resolvedIssues.map((issue) => (
              <div key={issue.id} className="p-3 border rounded-md bg-muted/20">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-600">✓</span>
                  <span className="text-sm">{issue.description}</span>
                </div>
                {issue.clientResponse && (
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    Răspuns: {issue.clientResponse}
                  </p>
                )}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* ─── Action: launch evaluation ─── */}
      {unresolvedIssues.filter(i => i.severity === "BLOCKER").length === 0 && (
        <div className="pt-4 border-t">
          <a
            href="/sessions/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium"
          >
            Lansează evaluarea posturilor →
          </a>
          {unresolvedIssues.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2">
              Puteți continua evaluarea. Problemele rămase ({unresolvedIssues.length}) sunt non-blocante și pot fi rezolvate ulterior.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// ISSUE CARD
// ═══════════════════════════════════════════════════════════════

function IssueCard({
  issue,
  resolving,
  freeText,
  onFreeTextChange,
  onResolve,
}: {
  issue: DataQualityIssue
  resolving: boolean
  freeText: string
  onFreeTextChange: (text: string) => void
  onResolve: (id: string, response: string, option?: string) => void
}) {
  const config = severityConfig[issue.severity]

  return (
    <div className={`p-4 rounded-lg border ${config.bgColor}`}>
      {/* Header */}
      <div className="flex items-start gap-2">
        <span>{config.icon}</span>
        <div className="flex-1">
          <p className={`text-sm font-medium ${config.color}`}>{issue.description}</p>
          <p className="text-xs text-muted-foreground mt-1">{issue.details}</p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-white/50 px-2 py-0.5 rounded">
          {issue.category.replace("_", " ")}
        </span>
      </div>

      {/* Clarification question */}
      {issue.clarificationQuestion && (
        <div className="mt-3 pl-6">
          <p className="text-sm font-medium mb-2">{issue.clarificationQuestion}</p>

          {/* Options */}
          {issue.options && issue.options.length > 0 && (
            <div className="space-y-1.5">
              {issue.options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => onResolve(issue.id, option, option)}
                  disabled={resolving}
                  className="w-full text-left px-3 py-2 text-xs border rounded-md hover:bg-white/80 transition-colors disabled:opacity-50"
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {/* Free text input (for issues without predefined options) */}
          {!issue.options && (
            <div className="flex gap-2">
              <input
                type="text"
                value={freeText}
                onChange={(e) => onFreeTextChange(e.target.value)}
                placeholder="Răspunsul dvs..."
                className="flex-1 px-3 py-2 text-sm border rounded-md"
              />
              <button
                onClick={() => freeText && onResolve(issue.id, freeText)}
                disabled={resolving || !freeText}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {resolving ? "..." : "Trimite"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Affected items */}
      {issue.affectedItems.length > 0 && issue.affectedItems.length <= 5 && (
        <div className="mt-2 pl-6">
          <span className="text-[10px] text-muted-foreground">
            Afectează: {issue.affectedItems.join(", ")}
          </span>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

const severityOrder: Record<IssueSeverity, number> = {
  BLOCKER: 0,
  IMPORTANT: 1,
  QUESTION: 2,
  INFO: 3,
}

function sortBySeverity(issues: DataQualityIssue[]): DataQualityIssue[] {
  return [...issues].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
}
