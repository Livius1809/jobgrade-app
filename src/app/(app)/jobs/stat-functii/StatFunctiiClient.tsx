"use client"

import { useCallback, useRef, useState } from "react"
import { useRouter } from "next/navigation"

interface StatFunctiiRow {
  jobId: string
  title: string
  code: string
  department: string
  hierarchyLevel: number
  positionCount: number
  isActive: boolean
}

interface StatFunctiiData {
  rows: StatFunctiiRow[]
  generatedAt: string
  totalPositions: number
  totalJobs: number
  departments: string[]
}

interface Props {
  initialData: StatFunctiiData | null
}

export function StatFunctiiClient({ initialData }: Props) {
  const router = useRouter()
  const [data, setData] = useState<StatFunctiiData | null>(initialData)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingRow, setEditingRow] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>("")
  const fileRef = useRef<HTMLInputElement>(null)

  // ─── Upload stat funcții ───
  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/v1/jobs/import-stat-functii", {
        method: "POST",
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error || "Eroare la import")
      } else {
        // Save to stat-functii store
        await fetch("/api/v1/jobs/stat-functii", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: json.positions }),
        })
        router.refresh()
      }
    } catch {
      setError("Eroare de rețea")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }, [router])

  // ─── Inline edit ───
  const handleEdit = useCallback(async (rowIndex: number, field: keyof StatFunctiiRow, value: string | number | boolean) => {
    if (!data) return
    const updated = [...data.rows]
    updated[rowIndex] = { ...updated[rowIndex], [field]: value }

    const newData = {
      ...data,
      rows: updated,
      totalPositions: updated.reduce((s, r) => s + r.positionCount, 0),
      departments: [...new Set(updated.map(r => r.department))],
    }
    setData(newData)

    // Persist
    await fetch("/api/v1/jobs/stat-functii", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: updated }),
    })
  }, [data])

  // ─── Export ───
  const handleExport = useCallback(async () => {
    const res = await fetch("/api/v1/jobs/stat-functii/export")
    if (res.ok) {
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "stat-functii.xlsx"
      a.click()
      URL.revokeObjectURL(url)
    }
  }, [])

  // ─── Filter ───
  const filteredRows = data?.rows.filter(r =>
    !filter || r.department.toLowerCase().includes(filter.toLowerCase()) ||
    r.title.toLowerCase().includes(filter.toLowerCase())
  ) || []

  // ─── Group by department ───
  const departments = data?.departments || []
  const groupedByDept = departments.map(dept => ({
    name: dept,
    rows: filteredRows.filter(r => r.department === dept),
    totalPositions: filteredRows.filter(r => r.department === dept).reduce((s, r) => s + r.positionCount, 0),
  })).filter(g => g.rows.length > 0)

  // ─── No data state ───
  if (!data) {
    return (
      <div className="border-2 border-dashed rounded-lg p-12 text-center">
        <h3 className="text-lg font-medium mb-2">Niciun stat de funcții încărcat</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Încarcă un fișier Excel, PDF sau imagine cu organigrama/statul de funcții.
        </p>
        <label className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90 transition-colors">
          {uploading ? "Se procesează..." : "Încarcă fișier"}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.pdf,.png,.jpg,.jpeg"
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* ─── Header stats ─── */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 rounded-md border bg-card">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Posturi distincte</span>
          <p className="text-xl font-bold mt-1">{data.totalJobs}</p>
        </div>
        <div className="p-3 rounded-md border bg-card">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Total poziții</span>
          <p className="text-xl font-bold mt-1">{data.totalPositions}</p>
        </div>
        <div className="p-3 rounded-md border bg-card">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Departamente</span>
          <p className="text-xl font-bold mt-1">{departments.length}</p>
        </div>
        <div className="p-3 rounded-md border bg-card">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Actualizat</span>
          <p className="text-sm font-medium mt-1">{new Date(data.generatedAt).toLocaleDateString("ro-RO")}</p>
        </div>
      </div>

      {/* ─── Toolbar ─── */}
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Filtrează după departament sau post..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 px-3 py-2 border rounded-md text-sm"
        />
        <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-md text-sm cursor-pointer hover:bg-muted transition-colors">
          {uploading ? "..." : "Re-import"}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.pdf,.png,.jpg,.jpeg"
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
        <button
          onClick={handleExport}
          className="px-3 py-2 border rounded-md text-sm hover:bg-muted transition-colors"
        >
          Export Excel
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* ─── Table grouped by department ─── */}
      <div className="space-y-6">
        {groupedByDept.map((dept) => (
          <div key={dept.name} className="border rounded-lg overflow-hidden">
            <div className="bg-muted/30 px-4 py-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{dept.name}</h3>
              <span className="text-xs text-muted-foreground">
                {dept.rows.length} posturi · {dept.totalPositions} poziții
              </span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2 w-12">Nivel</th>
                  <th className="px-4 py-2">Cod</th>
                  <th className="px-4 py-2">Titlu post</th>
                  <th className="px-4 py-2 w-20 text-center">Nr. poz.</th>
                  <th className="px-4 py-2 w-20 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {dept.rows
                  .sort((a, b) => a.hierarchyLevel - b.hierarchyLevel)
                  .map((row) => {
                    const globalIndex = data.rows.indexOf(row)
                    return (
                      <tr key={row.jobId} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                          {row.hierarchyLevel}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs">
                          {row.code || "—"}
                        </td>
                        <td className="px-4 py-2">
                          {editingRow === row.jobId ? (
                            <input
                              defaultValue={row.title}
                              onBlur={(e) => {
                                handleEdit(globalIndex, "title", e.target.value)
                                setEditingRow(null)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") (e.target as HTMLInputElement).blur()
                              }}
                              className="w-full px-2 py-1 border rounded text-sm"
                              autoFocus
                            />
                          ) : (
                            <span
                              onClick={() => setEditingRow(row.jobId)}
                              className="cursor-pointer hover:underline"
                            >
                              {row.title}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center font-mono">
                          {row.positionCount}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            row.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                          }`}>
                            {row.isActive ? "Activ" : "Inactiv"}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}
