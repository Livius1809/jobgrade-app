"use client"

import { useState, useEffect, useCallback } from "react"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Objective {
  id: string
  code: string
  title: string
  description: string
  metricName: string
  metricUnit: string | null
  targetValue: number
  currentValue: number | null
  direction: string
  priority: string
  status: string
  level: string
  parentObjectiveId: string | null
  ownerRoles: string[]
  deadlineAt: string | null
  createdAt: string
}

interface ObjectivesResponse {
  business: { id: string; code: string; name: string }
  total: number
  objectives: Objective[]
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusBadge(status: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    ACTIVE: { bg: "bg-emerald-100", text: "text-emerald-800", label: "Activ" },
    DRAFT: { bg: "bg-gray-100", text: "text-gray-700", label: "Draft" },
    AT_RISK: { bg: "bg-amber-100", text: "text-amber-800", label: "La risc" },
    MET: { bg: "bg-blue-100", text: "text-blue-800", label: "Atins" },
    FAILED: { bg: "bg-red-100", text: "text-red-800", label: "Neatins" },
    SUSPENDED: { bg: "bg-gray-200", text: "text-gray-600", label: "Suspendat" },
    ARCHIVED: { bg: "bg-gray-200", text: "text-gray-500", label: "Arhivat" },
  }
  const s = map[status] ?? { bg: "bg-gray-100", text: "text-gray-600", label: status }
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}
    >
      {s.label}
    </span>
  )
}

function priorityLabel(p: string) {
  const map: Record<string, string> = {
    CRITICAL: "Critic",
    HIGH: "Ridicat",
    MEDIUM: "Mediu",
    LOW: "Scazut",
  }
  return map[p] ?? p
}

function levelLabel(l: string) {
  const map: Record<string, string> = {
    STRATEGIC: "Strategic",
    TACTICAL: "Tactic",
    OPERATIONAL: "Operational",
  }
  return map[l] ?? l
}

function progressPercent(obj: Objective): number {
  if (obj.targetValue === 0) return 0
  const current = obj.currentValue ?? 0
  return Math.min(100, Math.round((current / obj.targetValue) * 100))
}

/* ------------------------------------------------------------------ */
/*  Objective Card                                                     */
/* ------------------------------------------------------------------ */

function ObjectiveCard({
  obj,
  children,
  depth,
}: {
  obj: Objective
  children?: React.ReactNode
  depth: number
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = !!children
  const progress = progressPercent(obj)

  return (
    <div className={depth > 0 ? "ml-6 border-l-2 border-gray-200 pl-4" : ""}>
      <div className="rounded-lg border border-border bg-surface p-4 mb-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-text-secondary">
                {obj.code}
              </span>
              <span className="text-xs text-indigo-600 font-medium">
                {levelLabel(obj.level)}
              </span>
              {statusBadge(obj.status)}
            </div>

            <button
              type="button"
              onClick={() => hasChildren && setExpanded(!expanded)}
              className={`text-sm font-semibold text-foreground text-left ${
                hasChildren ? "cursor-pointer hover:text-indigo-700" : "cursor-default"
              }`}
            >
              {hasChildren && (
                <span className="mr-1">{expanded ? "\u25BC" : "\u25B6"}</span>
              )}
              {obj.title}
            </button>
          </div>

          <div className="text-right shrink-0">
            <div className="text-xs text-text-secondary">
              {priorityLabel(obj.priority)}
            </div>
            {obj.deadlineAt && (
              <div className="text-xs text-text-secondary mt-0.5">
                {new Date(obj.deadlineAt).toLocaleDateString("ro-RO")}
              </div>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-text-secondary">
              {obj.metricName}
              {obj.metricUnit ? ` (${obj.metricUnit})` : ""}
            </span>
            <span className="text-xs font-medium text-foreground">
              {obj.currentValue ?? 0} / {obj.targetValue} ({progress}%)
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                progress >= 80
                  ? "bg-emerald-500"
                  : progress >= 40
                    ? "bg-amber-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Owner roles */}
        {obj.ownerRoles.length > 0 && (
          <div className="mt-2 flex gap-1 flex-wrap">
            {obj.ownerRoles.map((role) => (
              <span
                key={role}
                className="inline-block px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs"
              >
                {role}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Children */}
      {expanded && children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tree builder                                                       */
/* ------------------------------------------------------------------ */

function buildTree(
  objectives: Objective[],
  parentId: string | null,
  depth: number,
): React.ReactNode {
  const children = objectives.filter(
    (o) => o.parentObjectiveId === parentId,
  )
  if (children.length === 0) return null

  return (
    <>
      {children.map((obj) => {
        const sub = buildTree(objectives, obj.id, depth + 1)
        return (
          <ObjectiveCard key={obj.id} obj={obj} depth={depth}>
            {sub}
          </ObjectiveCard>
        )
      })}
    </>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ObjectivesCascadePage() {
  const [data, setData] = useState<ObjectivesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // The objectives API uses internal auth via x-internal-key.
      // We call through a proxy or use the key from env if available.
      // For client-side, try the cascade endpoint which may use session auth.
      const res = await fetch("/api/v1/objectives/cascade")
      if (!res.ok) {
        // Fallback: try objectives with a businessId query param
        const fallback = await fetch(
          "/api/v1/objectives?businessId=biz_jobgrade&includeArchived=false",
        )
        if (!fallback.ok)
          throw new Error("Nu s-au putut incarca obiectivele.")
        const fbData = await fallback.json()
        setData(fbData)
        return
      }
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  /* ---- Render ---- */

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-sm text-text-secondary">
        Se incarca obiectivele...
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center text-sm text-red-600">
        {error}
      </div>
    )
  }

  const objectives = data?.objectives ?? []

  // Separate top-level (no parent) and build tree
  const tree = buildTree(objectives, null, 0)

  // Fallback: if no tree structure, display flat grouped by level
  const hasTree = objectives.some((o) => o.parentObjectiveId !== null)

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">
          Obiective strategice
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Cascada: strategic &rarr; tactic &rarr; operational
          {data?.business?.name ? ` | ${data.business.name}` : ""}
        </p>
        <p className="text-xs text-text-secondary mt-0.5">
          {objectives.length} obiective
        </p>
      </div>

      {objectives.length === 0 && (
        <div className="rounded-lg border border-border bg-surface p-8 text-center text-sm text-text-secondary">
          Niciun obiectiv definit.
        </div>
      )}

      {hasTree ? (
        tree
      ) : (
        // Flat display grouped by level
        <>
          {(["STRATEGIC", "TACTICAL", "OPERATIONAL"] as const).map((level) => {
            const group = objectives.filter((o) => o.level === level)
            if (group.length === 0) return null
            return (
              <div key={level} className="mb-6">
                <h2 className="text-sm font-semibold text-foreground mb-3">
                  {levelLabel(level)}
                </h2>
                {group.map((obj) => (
                  <ObjectiveCard key={obj.id} obj={obj} depth={0} />
                ))}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
