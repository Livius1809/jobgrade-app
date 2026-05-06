"use client"

import { useState, useEffect, useCallback } from "react"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DeptJob {
  id: string
  title: string
}

interface DeptNode {
  id: string
  name: string
  jobs: DeptJob[]
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function NodeCard({
  label,
  subtitle,
  count,
  expanded,
  onToggle,
  children,
}: {
  label: string
  subtitle?: string
  count?: number
  expanded?: boolean
  onToggle?: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center">
      {/* Card */}
      <button
        type="button"
        onClick={onToggle}
        className="rounded-lg border border-border bg-surface px-4 py-3 shadow-sm hover:shadow-md transition-shadow text-left min-w-[180px] cursor-pointer"
      >
        <span className="block text-sm font-semibold text-foreground">
          {label}
        </span>
        {subtitle && (
          <span className="block text-xs text-text-secondary mt-0.5">
            {subtitle}
          </span>
        )}
        {count !== undefined && (
          <span className="inline-flex items-center gap-1 mt-1 text-xs text-indigo-600 font-medium">
            {count} {count === 1 ? "post" : "posturi"}
            {onToggle && (
              <span className="ml-1">{expanded ? "\u25B2" : "\u25BC"}</span>
            )}
          </span>
        )}
      </button>

      {/* Children with connector line */}
      {expanded && children && (
        <div className="flex flex-col items-center mt-1">
          <div className="w-px h-4 bg-gray-300" />
          {children}
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function OrgChartTree() {
  const [departments, setDepartments] = useState<DeptNode[]>([])
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch("/api/v1/departments")
        if (!res.ok) throw new Error("Eroare la incarcarea departamentelor.")
        const data: Array<{ id: string; name: string }> = await res.json()

        // departments route returns {id,name}. Jobs are loaded per-dept lazily.
        // For a simple tree we treat each dept as a node; jobs come from the
        // department detail endpoint if available, otherwise we show count only.
        const nodes: DeptNode[] = data.map((d) => ({
          id: d.id,
          name: d.name,
          jobs: [],
        }))

        if (!cancelled) {
          setDepartments(nodes)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message)
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const toggleDept = useCallback(
    (deptId: string) => {
      setExpandedDepts((prev) => {
        const next = new Set(prev)
        if (next.has(deptId)) {
          next.delete(deptId)
        } else {
          next.add(deptId)

          // Lazy-load jobs for this department
          const dept = departments.find((d) => d.id === deptId)
          if (dept && dept.jobs.length === 0) {
            fetch(`/api/v1/departments/${deptId}`)
              .then((r) => (r.ok ? r.json() : null))
              .then((detail) => {
                if (detail?.jobs) {
                  setDepartments((prev) =>
                    prev.map((d) =>
                      d.id === deptId
                        ? {
                            ...d,
                            jobs: (
                              detail.jobs as Array<{ id: string; title: string }>
                            ).map((j) => ({ id: j.id, title: j.title })),
                          }
                        : d,
                    ),
                  )
                }
              })
              .catch(() => {
                /* silent */
              })
          }
        }
        return next
      })
    },
    [departments],
  )

  /* ---- Render ---- */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-text-secondary">
        Se incarca organigrama...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 py-6 text-center">{error}</div>
    )
  }

  return (
    <div className="w-full overflow-x-auto py-6">
      <div className="flex flex-col items-center min-w-max">
        {/* Root node — Company */}
        <NodeCard label="Companie" subtitle="Organigrama" />

        {/* Connector line */}
        <div className="w-px h-6 bg-gray-300" />

        {/* Horizontal rail for departments */}
        {departments.length > 0 && (
          <>
            <div
              className="h-px bg-gray-300"
              style={{
                width:
                  departments.length > 1
                    ? `${(departments.length - 1) * 220}px`
                    : "1px",
              }}
            />

            <div className="flex gap-6 mt-0">
              {departments.map((dept) => {
                const isExpanded = expandedDepts.has(dept.id)
                return (
                  <div key={dept.id} className="flex flex-col items-center">
                    {/* Vertical connector from rail */}
                    <div className="w-px h-4 bg-gray-300" />

                    <NodeCard
                      label={dept.name}
                      count={dept.jobs.length}
                      expanded={isExpanded}
                      onToggle={() => toggleDept(dept.id)}
                    >
                      {/* Jobs list under department */}
                      <div className="flex flex-col gap-2">
                        {dept.jobs.map((job) => (
                          <div
                            key={job.id}
                            className="rounded border border-border bg-white px-3 py-2 text-xs text-foreground shadow-sm min-w-[160px]"
                          >
                            {job.title}
                          </div>
                        ))}
                        {dept.jobs.length === 0 && (
                          <span className="text-xs text-text-secondary italic">
                            Niciun post definit
                          </span>
                        )}
                      </div>
                    </NodeCard>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {departments.length === 0 && (
          <p className="text-sm text-text-secondary mt-4">
            Niciun departament definit.
          </p>
        )}
      </div>
    </div>
  )
}
