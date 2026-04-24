"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Milestone {
  milestone: string
  owner: string
  dueDate: string
  done: boolean
}

interface Assessment {
  id: string
  status: string
  triggerReason: string
  triggeredAt: string
  dueDate: string | null
  resolvedAt: string | null
  rootCause: string | null
  actionPlan: Milestone[] | null
  reportYear: number | null
}

interface Props {
  assessments: Assessment[]
  canEdit: boolean
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Deschis", color: "bg-red-100 text-red-700" },
  IN_PROGRESS: { label: "În lucru", color: "bg-yellow-100 text-yellow-700" },
  RESOLVED: { label: "Rezolvat", color: "bg-green-100 text-green-700" },
  CLOSED: { label: "Închis", color: "bg-gray-100 text-gray-600" },
}

export default function AssessmentsClient({ assessments, canEdit }: Props) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [editData, setEditData] = useState<
    Record<string, { rootCause: string; status: string; newMilestone: string; newOwner: string; newDue: string }>
  >({})

  const getEdit = (id: string) =>
    editData[id] ?? { rootCause: "", status: "", newMilestone: "", newOwner: "", newDue: "" }

  const setEdit = (id: string, data: Partial<ReturnType<typeof getEdit>>) =>
    setEditData((prev) => ({ ...prev, [id]: { ...getEdit(id), ...data } }))

  const handleSave = async (assessment: Assessment) => {
    const ed = getEdit(assessment.id)
    setSaving(assessment.id)
    try {
      await fetch(`/api/v1/joint-assessments/${assessment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rootCause: ed.rootCause || assessment.rootCause || undefined,
          status: ed.status || assessment.status,
        }),
      })
      router.refresh()
    } finally {
      setSaving(null)
    }
  }

  const handleToggleMilestone = async (assessment: Assessment, idx: number) => {
    const plan = assessment.actionPlan ?? []
    const updated = plan.map((m, i) => (i === idx ? { ...m, done: !m.done } : m))
    setSaving(assessment.id)
    try {
      await fetch(`/api/v1/joint-assessments/${assessment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionPlan: updated }),
      })
      router.refresh()
    } finally {
      setSaving(null)
    }
  }

  const handleAddMilestone = async (assessment: Assessment) => {
    const ed = getEdit(assessment.id)
    if (!ed.newMilestone.trim()) return
    const plan = assessment.actionPlan ?? []
    const updated = [
      ...plan,
      { milestone: ed.newMilestone, owner: ed.newOwner, dueDate: ed.newDue, done: false },
    ]
    setSaving(assessment.id)
    try {
      await fetch(`/api/v1/joint-assessments/${assessment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionPlan: updated }),
      })
      setEdit(assessment.id, { newMilestone: "", newOwner: "", newDue: "" })
      router.refresh()
    } finally {
      setSaving(null)
    }
  }

  if (assessments.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h3 className="text-lg font-semibold text-gray-800">Nicio evaluare comună deschisă</h3>
        <p className="text-sm text-gray-500 mt-2">
          Evaluările comune sunt create automat când diferența salarială depășește 5% sau manual de
          către administratori.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {assessments.map((a) => {
        const isExpanded = expandedId === a.id
        const ed = getEdit(a.id)
        const statusInfo = STATUS_LABELS[a.status] ?? STATUS_LABELS.OPEN

        return (
          <div key={a.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div
              className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              onClick={() => setExpandedId(isExpanded ? null : a.id)}
            >
              <div className="flex items-center gap-4">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900 line-clamp-1">
                    {a.triggerReason.slice(0, 80)}…
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Declanșat: {new Date(a.triggeredAt).toLocaleDateString("ro-RO")}
                    {a.reportYear && ` · An raport: ${a.reportYear}`}
                    {a.dueDate && ` · Termen: ${new Date(a.dueDate).toLocaleDateString("ro-RO")}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/pay-gap/assessments/${a.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="px-3 py-1 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  Deschide
                </a>
                <span className="text-gray-400">{isExpanded ? "▲" : "▼"}</span>
              </div>
            </div>

            {/* Expanded details */}
            {isExpanded && (
              <div className="px-6 pb-6 border-t border-gray-100 space-y-5 pt-4">
                {/* Trigger reason */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                    Motiv declanșare
                  </h4>
                  <p className="text-sm text-gray-700">{a.triggerReason}</p>
                </div>

                {canEdit && (
                  <>
                    {/* Root cause */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        Analiză cauze rădăcină (Root Cause Analysis)
                      </h4>
                      <textarea
                        defaultValue={a.rootCause ?? ""}
                        onChange={(e) => setEdit(a.id, { rootCause: e.target.value })}
                        rows={3}
                        placeholder="Documentați cauzele care au generat diferența salarială..."
                        className="w-full text-sm border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                      />
                    </div>

                    {/* Status change */}
                    <div className="flex items-center gap-3">
                      <select
                        defaultValue={a.status}
                        onChange={(e) => setEdit(a.id, { status: e.target.value })}
                        className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="OPEN">Deschis</option>
                        <option value="IN_PROGRESS">În lucru</option>
                        <option value="RESOLVED">Rezolvat</option>
                        <option value="CLOSED">Închis</option>
                      </select>
                      <button
                        onClick={() => handleSave(a)}
                        disabled={saving === a.id}
                        className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {saving === a.id ? "Se salvează..." : "Salvează"}
                      </button>
                    </div>
                  </>
                )}

                {/* Action plan milestones */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">
                    Plan de acțiune (Art. 10.3)
                  </h4>
                  {(a.actionPlan?.length ?? 0) > 0 ? (
                    <div className="space-y-2 mb-4">
                      {a.actionPlan!.map((m, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                        >
                          {canEdit && (
                            <input
                              type="checkbox"
                              checked={m.done}
                              onChange={() => handleToggleMilestone(a, i)}
                              className="mt-0.5 rounded"
                            />
                          )}
                          {!canEdit && (
                            <span className="mt-0.5 text-gray-500">{m.done ? "✓" : "○"}</span>
                          )}
                          <div className="flex-1 text-sm">
                            <span
                              className={m.done ? "line-through text-gray-400" : "text-gray-800"}
                            >
                              {m.milestone}
                            </span>
                            <span className="text-xs text-gray-400 ml-2">
                              {m.owner && `· ${m.owner}`} {m.dueDate && `· ${m.dueDate}`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 mb-3">
                      Niciun milestone adăugat.
                    </p>
                  )}

                  {canEdit && (
                    <div className="flex gap-2 flex-wrap">
                      <input
                        type="text"
                        placeholder="Milestone (ex: Audit grile salariale)"
                        value={ed.newMilestone}
                        onChange={(e) => setEdit(a.id, { newMilestone: e.target.value })}
                        className="flex-1 min-w-[200px] text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Responsabil"
                        value={ed.newOwner}
                        onChange={(e) => setEdit(a.id, { newOwner: e.target.value })}
                        className="w-32 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="date"
                        value={ed.newDue}
                        onChange={(e) => setEdit(a.id, { newDue: e.target.value })}
                        className="w-36 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => handleAddMilestone(a)}
                        disabled={saving === a.id || !ed.newMilestone.trim()}
                        className="px-4 py-1.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
                      >
                        + Adaugă
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
