"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface SalaryRecord {
  id: string
  employeeCode: string
  gender: string
  baseSalary: number
  variableComp: number
  department: string | null
  periodYear: number
  salaryGradeName: string | null
}

interface SalaryGrade {
  id: string
  name: string
}

interface Props {
  year: number
  records: SalaryRecord[]
  salaryGrades: SalaryGrade[]
}

const CSV_TEMPLATE =
  "employeeCode,gender,baseSalary,variableComp,department,jobCategory,salaryGradeId,periodYear\n" +
  "EMP001,MALE,5000,500,IT,Senior Developer,,2025\n" +
  "EMP002,FEMALE,4800,450,IT,Senior Developer,,2025\n"

export default function EmployeeImportClient({ year, records, salaryGrades }: Props) {
  const router = useRouter()
  const [csvText, setCsvText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([])

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "template_angajati_salarii.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const parseCsv = (text: string): Record<string, string>[] => {
    const lines = text.trim().split("\n")
    if (lines.length < 2) return []
    const headers = lines[0].split(",").map((h) => h.trim())
    return lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim())
      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]))
    })
  }

  const handleCsvChange = (text: string) => {
    setCsvText(text)
    setError("")
    setSuccess("")
    if (text.trim()) {
      setPreviewRows(parseCsv(text).slice(0, 5))
    } else {
      setPreviewRows([])
    }
  }

  const handleImport = async () => {
    if (!csvText.trim()) {
      setError("Introduceți date CSV.")
      return
    }

    const rows = parseCsv(csvText)
    if (rows.length === 0) {
      setError("Nicio înregistrare validă găsită.")
      return
    }

    const records = rows.map((r) => ({
      employeeCode: r.employeeCode,
      gender: r.gender as "MALE" | "FEMALE" | "OTHER",
      baseSalary: parseFloat(r.baseSalary),
      variableComp: parseFloat(r.variableComp || "0"),
      department: r.department || undefined,
      jobCategory: r.jobCategory || undefined,
      salaryGradeId: r.salaryGradeId || undefined,
      periodYear: parseInt(r.periodYear || String(year)),
      periodMonth: r.periodMonth ? parseInt(r.periodMonth) : undefined,
    }))

    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/v1/pay-gap/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.message ?? "Eroare import.")
      } else {
        setSuccess(`${data.count} înregistrări importate cu succes.`)
        setCsvText("")
        setPreviewRows([])
        router.refresh()
      }
    } catch {
      setError("Eroare rețea.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Import section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Import date CSV</h2>
          <button
            onClick={downloadTemplate}
            className="text-sm text-blue-600 hover:underline"
          >
            Descarcă template →
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date CSV (antet + rânduri)
            </label>
            <textarea
              value={csvText}
              onChange={(e) => handleCsvChange(e.target.value)}
              placeholder={CSV_TEMPLATE}
              rows={8}
              className="w-full text-xs font-mono border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
            />
          </div>

          {previewRows.length > 0 && (
            <div className="overflow-x-auto">
              <p className="text-xs text-gray-500 mb-2">
                Previzualizare ({previewRows.length} din {parseCsv(csvText).length} rânduri):
              </p>
              <table className="text-xs border border-gray-200 rounded-lg w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(previewRows[0]).map((h) => (
                      <th
                        key={h}
                        className="px-3 py-2 text-left font-medium text-gray-600 border-b border-gray-200"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="px-3 py-2 text-gray-700">
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </div>
          )}
          {success && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
              ✓ {success}
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={loading || !csvText.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Se importă..." : "Importă înregistrări"}
          </button>
        </div>
      </div>

      {/* Existing records */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">
            Înregistrări {year} ({records.length} total)
          </h2>
        </div>
        {records.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            Nicio înregistrare pentru {year}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Cod angajat
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Gen
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Salar bază
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Comp. variabilă
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Departament
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">
                    Grupă salar.
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {r.employeeCode}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          r.gender === "MALE"
                            ? "bg-blue-100 text-blue-700"
                            : r.gender === "FEMALE"
                            ? "bg-pink-100 text-pink-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {r.gender === "MALE" ? "M" : r.gender === "FEMALE" ? "F" : "A"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">
                      {r.baseSalary.toLocaleString("ro-RO")} RON
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500">
                      {r.variableComp > 0
                        ? `${r.variableComp.toLocaleString("ro-RO")} RON`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.department ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {r.salaryGradeName ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
