"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"

interface RequestItem {
  id: string
  requestedBy: string
  requestEmail: string
  requestDetails: string | null
  status: string
  dueDate: string
  createdAt: string
  respondedAt: string | null
  response: string | null
  salaryGradeName: string | null
}

interface Props {
  requests: RequestItem[]
  salaryGrades: { id: string; name: string }[]
  counts: Record<string, number>
  currentStatus: string
  canRespond: boolean
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: "În așteptare", color: "bg-yellow-100 text-yellow-700" },
  IN_REVIEW: { label: "În revizuire", color: "bg-blue-100 text-blue-700" },
  RESPONDED: { label: "Răspuns trimis", color: "bg-green-100 text-green-700" },
  OVERDUE: { label: "Depășit termen", color: "bg-red-100 text-red-700" },
}

export default function EmployeePortalClient({
  requests,
  salaryGrades,
  counts,
  currentStatus,
  canRespond,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [responseText, setResponseText] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  const filtered = currentStatus
    ? requests.filter((r) => r.status === currentStatus)
    : requests

  const handleFilter = (s: string) => {
    const params = new URLSearchParams()
    if (s) params.set("status", s)
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleRespond = async (req: RequestItem, status: "IN_REVIEW" | "RESPONDED") => {
    const text = responseText[req.id] ?? ""
    if (!text.trim()) return
    setSaving(req.id)
    try {
      const res = await fetch(`/api/v1/employee-requests/${req.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: text, status }),
      })
      if (res.ok) {
        setResponseText((prev) => ({ ...prev, [req.id]: "" }))
        setExpandedId(null)
        router.refresh()
      }
    } finally {
      setSaving(null)
    }
  }

  const daysUntil = (date: string) => {
    const diff = new Date(date).getTime() - Date.now()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "", label: `Toate (${counts.all})` },
          { key: "PENDING", label: `Noi (${counts.PENDING})` },
          { key: "IN_REVIEW", label: `În revizuire (${counts.IN_REVIEW})` },
          { key: "OVERDUE", label: `Depășite (${counts.OVERDUE})` },
          { key: "RESPONDED", label: `Răspunse (${counts.RESPONDED})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleFilter(key)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              currentStatus === key
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
          Nicio cerere găsită.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const isExpanded = expandedId === req.id
            const statusCfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.PENDING
            const days = daysUntil(req.dueDate)
            const isOverdue = req.status === "OVERDUE" || days < 0

            return (
              <div
                key={req.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <div
                  className="px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                >
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusCfg.color}`}>
                    {statusCfg.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {req.requestedBy}
                      <span className="text-gray-400 font-normal ml-2 text-xs">
                        {req.requestEmail}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                      {req.requestDetails?.slice(0, 100)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-500">
                      {new Date(req.createdAt).toLocaleDateString("ro-RO")}
                    </p>
                    <p
                      className={`text-xs font-medium mt-0.5 ${
                        isOverdue ? "text-red-600" : days <= 14 ? "text-yellow-600" : "text-gray-500"
                      }`}
                    >
                      {isOverdue
                        ? `Depășit cu ${Math.abs(days)}z`
                        : `Termen: ${days}z`}
                    </p>
                  </div>
                  <span className="text-gray-400 ml-2">{isExpanded ? "▲" : "▼"}</span>
                </div>

                {isExpanded && (
                  <div className="px-6 pb-6 border-t border-gray-100 space-y-4 pt-4">
                    {/* Request details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-xs text-gray-500 uppercase font-medium">
                          Detalii cerere
                        </span>
                        <p className="mt-1 text-gray-700">{req.requestDetails}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 uppercase font-medium">Info</span>
                        <div className="mt-1 space-y-1 text-gray-600">
                          <p>Grupă solicitată: {req.salaryGradeName ?? "—"}</p>
                          <p>Termen: {new Date(req.dueDate).toLocaleDateString("ro-RO")}</p>
                          {req.respondedAt && (
                            <p>
                              Răspuns trimis: {new Date(req.respondedAt).toLocaleDateString("ro-RO")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Existing response */}
                    {req.response && (
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-xs font-semibold text-green-700 uppercase mb-2">
                          Răspuns trimis
                        </p>
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                          {req.response}
                        </pre>
                      </div>
                    )}

                    {/* Response form */}
                    {canRespond && req.status !== "RESPONDED" && (
                      <div className="space-y-3">
                        <label className="block text-xs font-semibold text-gray-500 uppercase">
                          Răspuns HR (Art. 7.1 — va include automat date anonimizate dacă există)
                        </label>
                        <textarea
                          value={responseText[req.id] ?? ""}
                          onChange={(e) =>
                            setResponseText((prev) => ({ ...prev, [req.id]: e.target.value }))
                          }
                          rows={4}
                          placeholder="Introduceți răspunsul pentru angajat. Sistemul va adăuga automat datele salariale anonimizate (k≥5) dacă grupa salarială are suficiente date..."
                          className="w-full text-sm border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 resize-y"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRespond(req, "IN_REVIEW")}
                            disabled={saving === req.id || !responseText[req.id]?.trim()}
                            className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                          >
                            Salvează draft (În revizuire)
                          </button>
                          <button
                            onClick={() => handleRespond(req, "RESPONDED")}
                            disabled={saving === req.id || !responseText[req.id]?.trim()}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {saving === req.id ? "Se trimite..." : "Trimite răspuns final →"}
                          </button>
                        </div>
                        <p className="text-xs text-gray-400">
                          Trimiterea răspunsului final va notifica automat angajatul prin email la{" "}
                          <strong>{req.requestEmail}</strong>.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
