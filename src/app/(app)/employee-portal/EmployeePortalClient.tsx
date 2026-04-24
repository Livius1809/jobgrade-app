"use client"

import { useState, useCallback } from "react"
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

interface ResponseSection {
  category: string
  title: string
  content: string
  editable: boolean
}

interface Props {
  requests: RequestItem[]
  salaryGrades: { id: string; name: string }[]
  counts: Record<string, number>
  currentStatus: string
  canRespond: boolean
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: "In asteptare", color: "bg-yellow-100 text-yellow-700" },
  IN_REVIEW: { label: "In revizuire", color: "bg-blue-100 text-blue-700" },
  RESPONDED: { label: "Raspuns trimis", color: "bg-green-100 text-green-700" },
  OVERDUE: { label: "Depasit termen", color: "bg-red-100 text-red-700" },
}

export default function EmployeePortalClient({
  requests,
  counts,
  currentStatus,
  canRespond,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  // Semi-auto response state
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<Record<string, {
    anonymizedName: string
    sections: ResponseSection[]
    employeeName: string
    sectionEdits: Record<string, string>
  }>>({})

  const filtered = currentStatus
    ? requests.filter((r) => r.status === currentStatus)
    : requests

  const handleFilter = (s: string) => {
    const params = new URLSearchParams()
    if (s) params.set("status", s)
    router.push(`${pathname}?${params.toString()}`)
  }

  // Pre-generare raspuns semi-automat
  const loadPreview = useCallback(async (reqId: string) => {
    if (previewData[reqId]) return // deja incarcat
    setLoadingPreview(reqId)
    try {
      const res = await fetch(`/api/v1/employee-requests/${reqId}`)
      if (res.ok) {
        const data = await res.json()
        setPreviewData((prev) => ({
          ...prev,
          [reqId]: {
            anonymizedName: data.request.anonymizedName,
            sections: data.sections,
            employeeName: "", // admin completeaza manual
            sectionEdits: {},
          },
        }))
      }
    } finally {
      setLoadingPreview(null)
    }
  }, [previewData])

  const updateSectionEdit = (reqId: string, category: string, value: string) => {
    setPreviewData((prev) => ({
      ...prev,
      [reqId]: {
        ...prev[reqId],
        sectionEdits: { ...prev[reqId].sectionEdits, [category]: value },
      },
    }))
  }

  const updateEmployeeName = (reqId: string, value: string) => {
    setPreviewData((prev) => ({
      ...prev,
      [reqId]: { ...prev[reqId], employeeName: value },
    }))
  }

  // Trimite raspuns final
  const handleRespond = async (req: RequestItem, status: "IN_REVIEW" | "RESPONDED") => {
    const preview = previewData[req.id]
    if (!preview) return

    if (status === "RESPONDED" && !preview.employeeName.trim()) {
      alert("Completati numele angajatului inainte de a trimite raspunsul final.")
      return
    }

    // Compune raspunsul din sectiuni
    const recipientName = status === "RESPONDED"
      ? preview.employeeName.trim()
      : preview.anonymizedName

    const responseLines = [`Catre: ${recipientName}`, ""]
    for (const section of preview.sections) {
      const content = preview.sectionEdits[section.category] ?? section.content
      responseLines.push(`--- ${section.title} ---`)
      responseLines.push(content)
      responseLines.push("")
    }
    responseLines.push("---")
    responseLines.push("Acest raspuns este furnizat conform Directivei EU 2023/970 privind transparenta salariala.")

    const finalResponse = responseLines.join("\n")

    setSaving(req.id)
    try {
      const res = await fetch(`/api/v1/employee-requests/${req.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response: finalResponse,
          status,
          employeeName: preview.employeeName,
        }),
      })
      if (res.ok) {
        setPreviewData((prev) => {
          const copy = { ...prev }
          delete copy[req.id]
          return copy
        })
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
          { key: "IN_REVIEW", label: `In revizuire (${counts.IN_REVIEW})` },
          { key: "OVERDUE", label: `Depasite (${counts.OVERDUE})` },
          { key: "RESPONDED", label: `Raspunse (${counts.RESPONDED})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleFilter(key)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              currentStatus === key
                ? "bg-violet-600 text-white border-violet-600"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Pending count alert */}
      {(counts.PENDING > 0 || counts.OVERDUE > 0) && (
        <div className={`rounded-lg p-3 text-sm ${counts.OVERDUE > 0 ? "bg-red-50 border border-red-200 text-red-800" : "bg-amber-50 border border-amber-200 text-amber-800"}`}>
          {counts.OVERDUE > 0 && (
            <strong>{counts.OVERDUE} solicitari au depasit termenul legal de 2 luni! </strong>
          )}
          {counts.PENDING > 0 && (
            <span>Aveti {counts.PENDING} solicitari noi de finalizat. </span>
          )}
          Intrati pe fiecare pentru a pregati si trimite raspunsul.
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
          Nicio cerere gasita.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const isExpanded = expandedId === req.id
            const statusCfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.PENDING
            const days = daysUntil(req.dueDate)
            const isOverdue = req.status === "OVERDUE" || days < 0
            const preview = previewData[req.id]

            return (
              <div
                key={req.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <div
                  className="px-6 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => {
                    const newExpanded = isExpanded ? null : req.id
                    setExpandedId(newExpanded)
                    if (newExpanded && req.status !== "RESPONDED") {
                      loadPreview(req.id)
                    }
                  }}
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
                    <p className={`text-xs font-medium mt-0.5 ${
                      isOverdue ? "text-red-600" : days <= 14 ? "text-yellow-600" : "text-gray-500"
                    }`}>
                      {isOverdue ? `Depasit cu ${Math.abs(days)}z` : `Termen: ${days}z`}
                    </p>
                  </div>
                  <span className="text-gray-400 ml-2">{isExpanded ? "▲" : "▼"}</span>
                </div>

                {isExpanded && (
                  <div className="px-6 pb-6 border-t border-gray-100 space-y-4 pt-4">
                    {/* Request details */}
                    <div>
                      <span className="text-xs text-gray-500 uppercase font-medium">
                        Detalii cerere
                      </span>
                      <pre className="mt-1 text-sm text-gray-700 whitespace-pre-wrap font-sans bg-gray-50 rounded-lg p-3">
                        {req.requestDetails}
                      </pre>
                    </div>

                    {/* Existing response */}
                    {req.response && (
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-xs font-semibold text-green-700 uppercase mb-2">
                          Raspuns trimis
                        </p>
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                          {req.response}
                        </pre>
                      </div>
                    )}

                    {/* Semi-automatic response builder */}
                    {canRespond && req.status !== "RESPONDED" && (
                      <>
                        {loadingPreview === req.id && (
                          <div className="text-center py-6">
                            <div className="animate-spin w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full mx-auto" />
                            <p className="text-xs text-gray-500 mt-2">Se pregatesc datele...</p>
                          </div>
                        )}

                        {preview && (
                          <div className="space-y-4">
                            {/* Identitate anonimizata + camp completare manuala */}
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                              <h4 className="text-xs font-semibold text-amber-700 uppercase mb-2">
                                Identificare angajat (semi-automat)
                              </h4>
                              <p className="text-sm text-amber-800 mb-3">
                                Identitate sugerata din stat: <strong>{preview.anonymizedName}</strong>
                              </p>
                              <div>
                                <label className="text-xs text-gray-600 font-medium">
                                  Completati numele real (obligatoriu la trimitere)
                                </label>
                                <input
                                  type="text"
                                  value={preview.employeeName}
                                  onChange={(e) => updateEmployeeName(req.id, e.target.value)}
                                  placeholder={`ex: ${req.requestedBy}`}
                                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">
                                  Platforma nu proceseaza date personale — numele este completat manual de admin.
                                </p>
                              </div>
                            </div>

                            {/* Sectiuni raspuns pre-generat */}
                            <div>
                              <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                                Raspuns pre-generat ({preview.sections.length} sectiuni)
                              </h4>
                              <div className="space-y-3">
                                {preview.sections.map((section) => (
                                  <div
                                    key={section.category}
                                    className={`border rounded-lg p-4 ${
                                      section.editable
                                        ? "border-violet-200 bg-violet-50/30"
                                        : "border-gray-200"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <h5 className="text-sm font-medium text-gray-900">
                                        {section.title}
                                      </h5>
                                      {section.editable && (
                                        <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded">
                                          Editabil
                                        </span>
                                      )}
                                    </div>
                                    {section.editable ? (
                                      <textarea
                                        value={
                                          preview.sectionEdits[section.category] ?? section.content
                                        }
                                        onChange={(e) =>
                                          updateSectionEdit(req.id, section.category, e.target.value)
                                        }
                                        rows={4}
                                        className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-violet-500 resize-y"
                                      />
                                    ) : (
                                      <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                                        {section.content}
                                      </pre>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Butoane actiune */}
                            <div className="flex gap-2 pt-2">
                              <button
                                onClick={() => handleRespond(req, "IN_REVIEW")}
                                disabled={saving === req.id}
                                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                              >
                                Salveaza draft
                              </button>
                              <button
                                onClick={() => handleRespond(req, "RESPONDED")}
                                disabled={saving === req.id || !preview.employeeName.trim()}
                                className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
                              >
                                {saving === req.id
                                  ? "Se trimite..."
                                  : "Trimite raspuns final →"}
                              </button>
                            </div>
                            <p className="text-xs text-gray-400">
                              Raspunsul final va fi trimis automat la{" "}
                              <strong>{req.requestEmail}</strong>. Completati numele real inainte de trimitere.
                            </p>
                          </div>
                        )}
                      </>
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
