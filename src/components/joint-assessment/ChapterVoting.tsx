"use client"

import { useState } from "react"

// ── Tipuri ──────────────────────────────────────────────────

export interface ChapterVote {
  memberId: string
  memberName: string
  memberRole: string
  chapterId: string
  validated: boolean
  comment?: string
  votedAt: string
}

interface VotingDimension {
  id: string
  label: string
  description: string
}

interface Props {
  chapterId: string
  chapterTitle: string
  dimensions: VotingDimension[]
  votes: ChapterVote[]
  totalMembers: number
  currentMemberId?: string
  readOnly?: boolean
  onVote?: (chapterId: string, dimensionId: string, validated: boolean, comment?: string) => void
}

// ── Constante ───────────────────────────────────────────────

export const VOTING_DIMENSIONS: VotingDimension[] = [
  {
    id: "soliditate",
    label: "Soliditatea argumentelor",
    description: "Cauzele identificate sunt corecte?",
  },
  {
    id: "fezabilitate",
    label: "Fezabilitatea masurilor",
    description: "Planul de corectie e realist?",
  },
  {
    id: "plan",
    label: "Planul de urmat",
    description: "Sunt de acord cu termenele si responsabilii?",
  },
  {
    id: "monitorizare",
    label: "Monitorizare",
    description: "Mecanismul de verificare e adecvat?",
  },
]

// ── Componenta ──────────────────────────────────────────────

export default function ChapterVoting({
  chapterId,
  chapterTitle,
  dimensions,
  votes,
  totalMembers,
  currentMemberId,
  readOnly = false,
  onVote,
}: Props) {
  const [localVotes, setLocalVotes] = useState<
    Record<string, { validated: boolean; comment: string }>
  >({})
  const [showCommentFor, setShowCommentFor] = useState<string | null>(null)

  // Calcul progres per dimensiune
  const getVotesForDimension = (dimId: string) =>
    votes.filter(
      (v) => v.chapterId === `${chapterId}:${dimId}` && v.validated
    )

  const getRejectionsForDimension = (dimId: string) =>
    votes.filter(
      (v) => v.chapterId === `${chapterId}:${dimId}` && !v.validated
    )

  const allDimensionsValidated = dimensions.every((dim) => {
    const validatedCount = getVotesForDimension(dim.id).length
    return validatedCount === totalMembers
  })

  const myVoteForDimension = (dimId: string) =>
    votes.find(
      (v) =>
        v.chapterId === `${chapterId}:${dimId}` &&
        v.memberId === currentMemberId
    )

  const handleVote = (dimId: string, validated: boolean) => {
    const local = localVotes[dimId]
    if (!validated && (!local?.comment || !local.comment.trim())) {
      setShowCommentFor(dimId)
      return
    }
    onVote?.(chapterId, dimId, validated, local?.comment)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">{chapterTitle}</h4>
        {allDimensionsValidated && (
          <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 font-medium">
            Capitol validat
          </span>
        )}
      </div>

      {/* Dimensiuni de vot */}
      <div className="space-y-3">
        {dimensions.map((dim) => {
          const validated = getVotesForDimension(dim.id)
          const rejected = getRejectionsForDimension(dim.id)
          const myVote = myVoteForDimension(dim.id)
          const progress = totalMembers > 0
            ? Math.round((validated.length / totalMembers) * 100)
            : 0
          const isFullConsensus = validated.length === totalMembers

          return (
            <div
              key={dim.id}
              className={`border rounded-lg p-4 transition-colors ${
                isFullConsensus
                  ? "border-green-200 bg-green-50/50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {dim.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {dim.description}
                  </div>
                </div>

                {/* Progres */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-xs text-gray-500">
                    {validated.length}/{totalMembers}
                  </div>
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isFullConsensus ? "bg-green-500" : "bg-violet-500"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Butoane vot (doar daca nu e read-only si nu a votat deja) */}
              {!readOnly && !myVote && currentMemberId && (
                <div className="mt-3 space-y-2">
                  {showCommentFor === dim.id && (
                    <div className="space-y-2">
                      <textarea
                        value={localVotes[dim.id]?.comment ?? ""}
                        onChange={(e) =>
                          setLocalVotes((prev) => ({
                            ...prev,
                            [dim.id]: {
                              validated: false,
                              comment: e.target.value,
                            },
                          }))
                        }
                        placeholder="Comentariu obligatoriu: ce nu e de acord si ce propuneti..."
                        rows={3}
                        className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-y"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleVote(dim.id, true)}
                      className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Validez
                    </button>
                    <button
                      onClick={() => handleVote(dim.id, false)}
                      className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Nu validez
                    </button>
                  </div>
                </div>
              )}

              {/* Votul meu existent */}
              {myVote && (
                <div className="mt-2 text-xs">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                      myVote.validated
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {myVote.validated ? "Validat" : "Respins"}
                    <span className="text-gray-400">
                      {" · "}
                      {new Date(myVote.votedAt).toLocaleDateString("ro-RO")}
                    </span>
                  </span>
                  {myVote.comment && (
                    <p className="mt-1 text-gray-600 italic">
                      &quot;{myVote.comment}&quot;
                    </p>
                  )}
                </div>
              )}

              {/* Respingeri cu comentariu */}
              {rejected.length > 0 && (
                <div className="mt-2 space-y-1">
                  {rejected.map((r, i) => (
                    <div
                      key={i}
                      className="text-xs bg-red-50 border border-red-100 rounded p-2"
                    >
                      <span className="font-medium text-red-700">
                        {r.memberName} ({r.memberRole}):
                      </span>{" "}
                      <span className="text-red-600">
                        {r.comment ?? "Fara comentariu"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
