"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface Department {
  id: string
  name: string
}

interface ProcessNode {
  id: string
  name: string
  supplier: string
  client: string
  description: string
  inputs: string[]
  outputs: string[]
}

interface ProcessMap {
  id: string
  scope: "DEPARTMENT" | "COMPANY"
  departmentId?: string
  departmentName?: string
  nodes: ProcessNode[]
  createdAt: string
}

export default function ProcessMapPage() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [scope, setScope] = useState<"DEPARTMENT" | "COMPANY">("COMPANY")
  const [selectedDept, setSelectedDept] = useState("")
  const [processMap, setProcessMap] = useState<ProcessMap | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => { loadDepartments() }, [])

  async function loadDepartments() {
    setLoading(true)
    try {
      const res = await fetch("/api/v1/departments")
      const data = await res.json()
      setDepartments(data.departments || data || [])
    } catch { /* silent */ }
    setLoading(false)
  }

  async function generateMap() {
    if (scope === "DEPARTMENT" && !selectedDept) return
    setGenerating(true)
    try {
      const res = await fetch("/api/v1/processes/map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          departmentId: scope === "DEPARTMENT" ? selectedDept : undefined,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setProcessMap(data.processMap || data)
      }
    } catch { /* silent */ }
    setGenerating(false)
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Harta procese</h1>
          <p className="text-sm text-text-secondary mt-1">
            Vizualizeaza fluxul furnizor &rarr; proces &rarr; client pentru fiecare activitate
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/processes/quality-manual"
            className="text-sm font-medium bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
          >
            Manual calitate
          </Link>
          <Link
            href="/portal"
            className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            &larr; Portal
          </Link>
        </div>
      </div>

      {loading && <p className="text-sm text-text-secondary">Se incarca...</p>}

      {!loading && (
        <>
          {/* Scope selector */}
          <div className="rounded-lg border border-border bg-surface p-5 mb-6">
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === "COMPANY"}
                  onChange={() => setScope("COMPANY")}
                  className="accent-indigo-600"
                />
                Toata compania
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === "DEPARTMENT"}
                  onChange={() => setScope("DEPARTMENT")}
                  className="accent-indigo-600"
                />
                Per departament
              </label>
            </div>

            {scope === "DEPARTMENT" && (
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground mb-4"
              >
                <option value="">-- Selecteaza departamentul --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={generateMap}
              disabled={generating || (scope === "DEPARTMENT" && !selectedDept)}
              className="text-sm font-medium bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {generating ? "Se genereaza harta..." : "Genereaza harta"}
            </button>
          </div>

          {/* Process map visualization */}
          {processMap && processMap.nodes && processMap.nodes.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-foreground">
                  Harta proceselor
                  {processMap.departmentName && ` — ${processMap.departmentName}`}
                </h2>
                <span className="text-xs text-text-secondary">
                  {processMap.nodes.length} procese
                </span>
              </div>

              {/* Horizontal flow */}
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-4 min-w-max">
                  {processMap.nodes.map((node, idx) => (
                    <div key={node.id} className="flex items-center gap-3">
                      {/* Node card */}
                      <div className="w-64 rounded-lg border border-border bg-surface p-4 shadow-sm">
                        {/* Supplier */}
                        <div className="text-[10px] uppercase tracking-wide text-text-secondary mb-1">
                          Furnizor
                        </div>
                        <div className="text-xs text-indigo-600 font-medium mb-3">
                          {node.supplier}
                        </div>

                        {/* Process */}
                        <div className="rounded-md bg-indigo-50 border border-indigo-200 px-3 py-2 mb-3">
                          <div className="text-sm font-semibold text-indigo-800">
                            {node.name}
                          </div>
                          {node.description && (
                            <div className="text-xs text-indigo-600 mt-1">
                              {node.description}
                            </div>
                          )}
                        </div>

                        {/* Inputs / Outputs */}
                        <div className="grid grid-cols-2 gap-2 text-[10px] mb-3">
                          <div>
                            <span className="text-text-secondary uppercase tracking-wide">
                              Intrari
                            </span>
                            <ul className="mt-1 space-y-0.5">
                              {(node.inputs || []).map((inp, i) => (
                                <li key={i} className="text-foreground">
                                  {inp}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <span className="text-text-secondary uppercase tracking-wide">
                              Iesiri
                            </span>
                            <ul className="mt-1 space-y-0.5">
                              {(node.outputs || []).map((out, i) => (
                                <li key={i} className="text-foreground">
                                  {out}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Client */}
                        <div className="text-[10px] uppercase tracking-wide text-text-secondary mb-1">
                          Client
                        </div>
                        <div className="text-xs text-teal-600 font-medium">
                          {node.client}
                        </div>
                      </div>

                      {/* Arrow between nodes */}
                      {idx < processMap.nodes.length - 1 && (
                        <div className="text-indigo-300 text-2xl flex-shrink-0">
                          &rarr;
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {processMap && (!processMap.nodes || processMap.nodes.length === 0) && (
            <div className="rounded-lg border border-border bg-surface p-6 text-center text-text-secondary text-sm">
              Harta a fost generata dar nu contine procese. Verifica datele companiei.
            </div>
          )}
        </>
      )}
    </div>
  )
}
