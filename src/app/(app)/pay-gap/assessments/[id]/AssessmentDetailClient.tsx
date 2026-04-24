"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import JointAssessmentReport, {
  CHAPTER_DEFINITIONS,
  type ReportChapter,
  type GapCategory,
} from "@/components/joint-assessment/JointAssessmentReport"
import ChapterVoting, {
  VOTING_DIMENSIONS,
  type ChapterVote,
} from "@/components/joint-assessment/ChapterVoting"
import VersionComparison, {
  type ReportVersion,
} from "@/components/joint-assessment/VersionComparison"
import LegalDeadlineMonitor from "@/components/joint-assessment/LegalDeadlineMonitor"
import SignatureCanvas from "@/components/sessions/SignatureCanvas"

// ── Tipuri ──────────────────────────────────────────────────

type Tab = "raport" | "vot" | "discutie" | "semnaturi" | "versiuni" | "jurnal"

interface JurnalEntry {
  timestamp: string
  actiune: string
  detalii: string
  efectuatDe: string
}

interface Participant {
  name: string
  email: string
  role: string
  addedAt?: string
}

interface Props {
  assessmentId: string
  status: string
  triggerReason: string
  triggeredAt: string
  dueDate: string | null
  resolvedAt: string | null
  rootCause: string | null
  reportYear: number | null
  chapters: Record<string, string>
  categories: GapCategory[]
  votes: ChapterVote[]
  signatures: {
    memberId: string
    memberName: string
    memberRole: string
    version: number
    signedAt: string
  }[]
  versions: ReportVersion[]
  currentVersion: number
  participants: Participant[]
  jurnal: JurnalEntry[]
  canEdit: boolean
  currentUserId: string
  currentUserName: string
  currentUserRole: string
}

const TAB_LABELS: Record<Tab, string> = {
  raport: "Raport",
  vot: "Vot per capitol",
  discutie: "Discutie grup",
  semnaturi: "Semnaturi",
  versiuni: "Versiuni",
  jurnal: "Jurnal proces",
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Deschis", color: "bg-red-100 text-red-700" },
  IN_PROGRESS: { label: "In lucru", color: "bg-yellow-100 text-yellow-700" },
  RESOLVED: { label: "Rezolvat", color: "bg-green-100 text-green-700" },
  CLOSED: { label: "Inchis", color: "bg-gray-100 text-gray-600" },
}

// ── Componenta ──────────────────────────────────────────────

export default function AssessmentDetailClient({
  assessmentId,
  status,
  triggeredAt,
  dueDate,
  resolvedAt,
  reportYear,
  chapters,
  categories,
  votes,
  signatures,
  versions,
  currentVersion,
  participants,
  jurnal,
  canEdit,
  currentUserId,
  currentUserName,
}: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>("raport")
  const [saving, setSaving] = useState(false)

  const statusInfo = STATUS_LABELS[status] ?? STATUS_LABELS.OPEN

  // ── Handlers ────────────────────────────────────────────

  const handleUpdateChapter = useCallback(
    async (chapterId: string, content: string) => {
      setSaving(true)
      try {
        await fetch(`/api/v1/joint-assessments/${assessmentId}/chapters`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chapterId, content }),
        })
        router.refresh()
      } finally {
        setSaving(false)
      }
    },
    [assessmentId, router]
  )

  const handleVote = useCallback(
    async (
      chapterId: string,
      dimensionId: string,
      validated: boolean,
      comment?: string
    ) => {
      setSaving(true)
      try {
        await fetch(`/api/v1/joint-assessments/${assessmentId}/votes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chapterId, dimensionId, validated, comment }),
        })
        router.refresh()
      } finally {
        setSaving(false)
      }
    },
    [assessmentId, router]
  )

  const handleSign = useCallback(
    async (dataUrl: string) => {
      setSaving(true)
      try {
        await fetch(`/api/v1/joint-assessments/${assessmentId}/signatures`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signatureDataUrl: dataUrl,
            version: currentVersion,
          }),
        })
        router.refresh()
      } finally {
        setSaving(false)
      }
    },
    [assessmentId, currentVersion, router]
  )

  const handleCreateVersion = useCallback(
    async () => {
      const label = prompt("Eticheta versiune (ex: Dupa consens, Monitorizare luna 3):")
      if (!label) return
      const gapStr = prompt("Gap-ul procentual actual:")
      if (!gapStr) return
      const gapProcent = parseFloat(gapStr)
      if (isNaN(gapProcent)) return

      setSaving(true)
      try {
        await fetch(`/api/v1/joint-assessments/${assessmentId}/versions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label, gapProcent }),
        })
        router.refresh()
      } finally {
        setSaving(false)
      }
    },
    [assessmentId, router]
  )

  // ── Prepare data ────────────────────────────────────────

  const reportChapters: ReportChapter[] = CHAPTER_DEFINITIONS.map((def) => ({
    id: def.id,
    title: def.title,
    description: def.description,
    content: chapters[def.id] ?? "",
  }))

  const totalMembers = Math.max(participants.length, 1)

  const hasSignedCurrentVersion = signatures.some(
    (s) => s.memberId === currentUserId && s.version === currentVersion
  )

  const fmt = (d: string) =>
    new Date(d).toLocaleString("ro-RO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Status + Deadline monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusInfo.color}`}
            >
              {statusInfo.label}
            </span>
            {reportYear && (
              <span className="text-xs text-gray-400">An raport: {reportYear}</span>
            )}
          </div>
          <div className="text-sm text-gray-600">
            <strong>Membri comisie:</strong> {participants.length}
          </div>
          {participants.length > 0 && (
            <div className="space-y-1">
              {participants.map((p, i) => (
                <div key={i} className="text-xs text-gray-600 flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      p.role === "WORKER_REP"
                        ? "bg-blue-100 text-blue-700"
                        : p.role === "MANAGEMENT"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {p.role === "WORKER_REP"
                      ? "Rep. salariati"
                      : p.role === "MANAGEMENT"
                      ? "Management"
                      : "Facilitator"}
                  </span>
                  <span>{p.name}</span>
                </div>
              ))}
            </div>
          )}
          {saving && (
            <div className="text-xs text-violet-600 animate-pulse">Se salveaza...</div>
          )}
        </div>

        <div className="lg:col-span-2">
          <LegalDeadlineMonitor
            triggeredAt={triggeredAt}
            dueDate={dueDate}
            status={status}
            resolvedAt={resolvedAt}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-shrink-0 px-4 py-2 text-sm rounded-md transition-colors whitespace-nowrap ${
              activeTab === tab
                ? "bg-white text-gray-900 font-medium shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        {/* ── TAB: Raport ── */}
        {activeTab === "raport" && (
          <JointAssessmentReport
            chapters={reportChapters}
            categories={categories}
            readOnly={!canEdit}
            onUpdateChapter={handleUpdateChapter}
          />
        )}

        {/* ── TAB: Vot per capitol ── */}
        {activeTab === "vot" && (
          <div className="space-y-6">
            {CHAPTER_DEFINITIONS.map((ch) => (
              <ChapterVoting
                key={ch.id}
                chapterId={ch.id}
                chapterTitle={ch.title}
                dimensions={VOTING_DIMENSIONS}
                votes={votes}
                totalMembers={totalMembers}
                currentMemberId={currentUserId}
                readOnly={!canEdit}
                onVote={handleVote}
              />
            ))}
          </div>
        )}

        {/* ── TAB: Discutie grup ── */}
        {activeTab === "discutie" && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">💬</div>
            <h3 className="text-lg font-semibold text-gray-800">
              Discutie grup + Video
            </h3>
            <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
              Aceleasi componente ca la comisia JE: forum threaded cu AI mediator
              contextualizat pe pay gap, videoconferinta Jitsi.
            </p>
            <p className="text-xs text-gray-400 mt-4">
              Componentele DiscussionPanel si VideoConference din /components/sessions/
              vor fi integrate cu context adaptat pe capitolele raportului Art. 10.
            </p>
          </div>
        )}

        {/* ── TAB: Semnaturi ── */}
        {activeTab === "semnaturi" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700 uppercase">
                Semnaturi — V{currentVersion}
              </h3>
              <span className="text-xs text-gray-500">
                {signatures.filter((s) => s.version === currentVersion).length} /{" "}
                {totalMembers} semnaturi
              </span>
            </div>

            {/* Lista semnaturi existente */}
            <div className="space-y-2">
              {signatures
                .filter((s) => s.version === currentVersion)
                .map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-green-600 font-bold text-lg">✓</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {s.memberName}
                        </div>
                        <div className="text-xs text-gray-500">{s.memberRole}</div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {fmt(s.signedAt)}
                    </div>
                  </div>
                ))}

              {/* Membri care nu au semnat */}
              {participants
                .filter(
                  (p) =>
                    !signatures.some(
                      (s) =>
                        s.memberName === p.name &&
                        s.version === currentVersion
                    )
                )
                .map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-gray-300 font-bold text-lg">○</span>
                      <div>
                        <div className="text-sm font-medium text-gray-600">
                          {p.name}
                        </div>
                        <div className="text-xs text-gray-400">{p.role}</div>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">In asteptare</span>
                  </div>
                ))}
            </div>

            {/* Semnatura proprie */}
            {canEdit && !hasSignedCurrentVersion && (
              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  Semnati versiunea V{currentVersion}
                </h4>
                <p className="text-xs text-gray-500 mb-3">
                  Prin semnatura confirmati ca ati citit si sunteti de acord cu
                  raportul de evaluare comuna in versiunea curenta (V
                  {currentVersion}).
                </p>
                <SignatureCanvas onSign={handleSign} />
              </div>
            )}

            {hasSignedCurrentVersion && (
              <div className="text-center py-4">
                <p className="text-sm text-green-600 font-medium">
                  Ati semnat deja versiunea V{currentVersion}.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Versiuni ── */}
        {activeTab === "versiuni" && (
          <div className="space-y-4">
            {canEdit && (
              <div className="flex justify-end">
                <button
                  onClick={handleCreateVersion}
                  disabled={saving}
                  className="px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
                >
                  + Creeaza versiune noua
                </button>
              </div>
            )}
            <VersionComparison
              versions={versions}
              currentVersion={currentVersion}
            />
          </div>
        )}

        {/* ── TAB: Jurnal proces ── */}
        {activeTab === "jurnal" && (
          <div className="space-y-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase">
                Jurnal proces — Proba legala
              </h3>
              <span className="text-xs text-gray-400">
                {jurnal.length} intrari
              </span>
            </div>

            {jurnal.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                Nicio intrare in jurnal.
              </p>
            ) : (
              <div className="max-h-[500px] overflow-y-auto space-y-2">
                {[...jurnal].reverse().map((entry, i) => (
                  <div
                    key={i}
                    className={`rounded-lg px-4 py-3 text-sm border ${
                      entry.actiune.includes("ESCALADARE") ||
                      entry.actiune.includes("CRITIC")
                        ? "bg-red-50 border-red-200"
                        : entry.actiune.includes("SEMNATURA") ||
                          entry.actiune.includes("COMPLETAT")
                        ? "bg-green-50 border-green-200"
                        : entry.actiune.includes("VOT")
                        ? "bg-blue-50 border-blue-200"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span className="font-medium">
                        {entry.efectuatDe} — {entry.actiune.replace(/_/g, " ")}
                      </span>
                      <span>{fmt(entry.timestamp)}</span>
                    </div>
                    <p className="text-gray-700">{entry.detalii}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
