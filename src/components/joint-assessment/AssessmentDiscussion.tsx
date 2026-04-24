"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import VideoConference from "@/components/sessions/VideoConference"
import { CHAPTER_DEFINITIONS } from "./JointAssessmentReport"

/**
 * AssessmentDiscussion — Forum discuție pe capitolele raportului Art. 10.
 * Adaptat din DiscussionPanel (JE) dar cu:
 * - Capitole raport în loc de criterii A-G
 * - AI mediator contextualizat pe pay gap
 * - VideoConferință integrată
 */

interface Comment {
  id: string
  chapterId: string
  memberId: string
  memberName: string
  content: string
  isAi: boolean
  parentId: string | null
  createdAt: string
}

interface Props {
  assessmentId: string
  currentMemberId: string
  currentMemberName: string
}

export default function AssessmentDiscussion({
  assessmentId,
  currentMemberId,
  currentMemberName,
}: Props) {
  const [activeChapter, setActiveChapter] = useState(CHAPTER_DEFINITIONS[0].id)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [mediating, setMediating] = useState(false)
  const [showVideo, setShowVideo] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/v1/joint-assessments/${assessmentId}/discussion?chapterId=${activeChapter}`
      )
      if (res.ok) {
        const json = await res.json()
        setComments(json.comments ?? [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [assessmentId, activeChapter])

  useEffect(() => {
    setLoading(true)
    fetchComments()
    const interval = setInterval(fetchComments, 10000) // polling la 10s
    return () => clearInterval(interval)
  }, [fetchComments])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [comments])

  const handleSubmit = async () => {
    if (!newComment.trim() || submitting) return
    setSubmitting(true)
    try {
      await fetch(`/api/v1/joint-assessments/${assessmentId}/discussion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId: activeChapter,
          content: newComment.trim(),
        }),
      })
      setNewComment("")
      await fetchComments()
    } finally {
      setSubmitting(false)
    }
  }

  const handleRequestMediation = async () => {
    setMediating(true)
    try {
      await fetch(`/api/v1/joint-assessments/${assessmentId}/discussion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId: activeChapter,
          requestMediation: true,
        }),
      })
      await fetchComments()
    } finally {
      setMediating(false)
    }
  }

  const chapterComments = comments.filter((c) => c.chapterId === activeChapter)
  const activeChapterDef = CHAPTER_DEFINITIONS.find((c) => c.id === activeChapter)

  return (
    <div className="space-y-4">
      {/* Tabs capitole */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {CHAPTER_DEFINITIONS.map((ch) => {
          const count = comments.filter((c) => c.chapterId === ch.id).length
          return (
            <button
              key={ch.id}
              onClick={() => setActiveChapter(ch.id)}
              className={`flex-shrink-0 px-3 py-2 text-xs rounded-md transition-colors whitespace-nowrap ${
                activeChapter === ch.id
                  ? "bg-white text-gray-900 font-medium shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {ch.title}
              {count > 0 && (
                <span className="ml-1.5 bg-violet-100 text-violet-700 text-[10px] px-1.5 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Header capitol activ */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">
            {activeChapterDef?.title}
          </h4>
          <p className="text-xs text-gray-500">{activeChapterDef?.description}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowVideo((p) => !p)}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              showVideo
                ? "bg-violet-100 border-violet-300 text-violet-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {showVideo ? "Ascunde video" : "Videoconferinta"}
          </button>
          <button
            onClick={handleRequestMediation}
            disabled={mediating}
            className="px-3 py-1.5 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {mediating ? "Se mediaza..." : "AI Mediator"}
          </button>
        </div>
      </div>

      {/* Video */}
      {showVideo && (
        <div className="border border-violet-200 rounded-lg overflow-hidden">
          <VideoConference
            roomId={`art10-${assessmentId.slice(0, 8)}-${activeChapter}`}
            displayName={currentMemberName}
          />
        </div>
      )}

      {/* Comentarii */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="max-h-80 overflow-y-auto p-4 space-y-2.5">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : chapterComments.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Nicio discutie pe acest capitol. Fiti primul care contribuie.
            </div>
          ) : (
            chapterComments.map((c) => (
              <div
                key={c.id}
                className={`rounded-lg px-3.5 py-2.5 text-sm ${
                  c.isAi
                    ? "bg-violet-50 border border-violet-200"
                    : c.memberId === currentMemberId
                    ? "bg-violet-600 text-white ml-8"
                    : "bg-gray-50 border border-gray-200 mr-8"
                }`}
              >
                <div className="flex justify-between text-xs mb-1">
                  <span className={`font-medium ${c.isAi ? "text-violet-700" : c.memberId === currentMemberId ? "text-white/80" : "text-gray-500"}`}>
                    {c.isAi ? "AI Mediator" : c.memberName}
                  </span>
                  <span className={c.memberId === currentMemberId ? "text-white/60" : "text-gray-400"}>
                    {new Date(c.createdAt).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className={c.memberId === currentMemberId && !c.isAi ? "text-white" : c.isAi ? "text-violet-900" : "text-gray-700"}>
                  {c.content}
                </p>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-2.5 border-t border-gray-100 flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Scrieti un comentariu pe acest capitol..."
            disabled={submitting}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-violet-400 focus:ring-1 focus:ring-violet-200 outline-none"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !newComment.trim()}
            className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            Trimite
          </button>
        </div>
      </div>
    </div>
  )
}
