"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface Comment {
  id: string
  criterionId: string
  userId: string | null
  round: number
  content: string
  isAi: boolean
  parentId: string | null
  createdAt: string
  user: {
    id: string
    firstName: string
    lastName: string
    jobTitle: string | null
  } | null
}

interface Props {
  sessionId: string
  sessionJobId: string
  criterionId: string
  criterionName: string
  currentUserId: string
}

export default function DiscussionPanel({
  sessionId,
  sessionJobId,
  criterionId,
  criterionName,
  currentUserId,
}: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [mediating, setMediating] = useState(false)
  const [mediationError, setMediationError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const baseUrl = `/api/v1/sessions/${sessionId}/consensus/${sessionJobId}/discussion`
  const mediateUrl = `/api/v1/sessions/${sessionId}/consensus/${sessionJobId}/ai-mediate`

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`${baseUrl}?criterionId=${criterionId}`)
      if (res.ok) {
        const json = await res.json()
        setComments(json.comments)
      }
    } catch {
      // silent retry on next poll
    } finally {
      setLoading(false)
    }
  }, [baseUrl, criterionId])

  useEffect(() => {
    setLoading(true)
    setComments([])
    fetchComments()
  }, [fetchComments])

  // Poll every 8s
  useEffect(() => {
    const interval = setInterval(fetchComments, 8000)
    return () => clearInterval(interval)
  }, [fetchComments])

  // Scroll to bottom on new comments
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [comments.length])

  async function handleSubmit() {
    if (!newComment.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(baseUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          criterionId,
          content: newComment.trim(),
          ...(replyTo ? { parentId: replyTo } : {}),
        }),
      })
      if (res.ok) {
        setNewComment("")
        setReplyTo(null)
        await fetchComments()
      }
    } catch {
      // error handled silently
    } finally {
      setSubmitting(false)
    }
  }

  // Calculate current mediation round
  const aiCommentCount = comments.filter((c) => c.isAi).length
  const nextMediationRound = aiCommentCount + 1

  async function handleRequestMediation() {
    setMediating(true)
    setMediationError(null)
    try {
      const res = await fetch(mediateUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          criterionId,
          round: nextMediationRound,
        }),
      })
      if (res.status === 402) {
        const json = await res.json()
        setMediationError(json.message)
      } else if (!res.ok) {
        setMediationError("Eroare la medierea AI.")
      } else {
        await fetchComments()
      }
    } catch {
      setMediationError("Eroare de rețea.")
    } finally {
      setMediating(false)
    }
  }

  // Build threaded structure
  const rootComments = comments.filter((c) => !c.parentId)
  const repliesMap: Record<string, Comment[]> = {}
  for (const c of comments) {
    if (c.parentId) {
      if (!repliesMap[c.parentId]) repliesMap[c.parentId] = []
      repliesMap[c.parentId].push(c)
    }
  }

  const replyToComment = replyTo
    ? comments.find((c) => c.id === replyTo)
    : null

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">
            Discuție — {criterionName}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {comments.length} mesaje
            </span>
            <button
              onClick={handleRequestMediation}
              disabled={mediating}
              className="px-3 py-1 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              {mediating ? (
                <>
                  <span className="animate-spin w-3 h-3 border border-white border-t-transparent rounded-full" />
                  Se analizează...
                </>
              ) : (
                <>
                  Mediator AI
                  {nextMediationRound > 3 && (
                    <span className="text-purple-200 text-[10px]">(credite)</span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          Argumentați-vă poziția raportat la criteriile de scorare. Schimbați opinia doar pe bază de logică.
        </p>
        {mediationError && (
          <p className="text-xs text-red-600 mt-1">{mediationError}</p>
        )}
        {nextMediationRound > 3 && (
          <p className="text-xs text-amber-600 mt-1">
            Runda {nextMediationRound} de mediere — se consumă credite din sold.
          </p>
        )}
      </div>

      {/* Comments list */}
      <div className="max-h-80 overflow-y-auto px-4 py-3 space-y-3">
        {loading ? (
          <div className="text-center text-sm text-gray-400 py-4">
            Se încarcă discuția...
          </div>
        ) : rootComments.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-4">
            Niciun comentariu. Fiți primul care adaugă un argument.
          </div>
        ) : (
          rootComments.map((comment) => (
            <CommentBubble
              key={comment.id}
              comment={comment}
              replies={repliesMap[comment.id] || []}
              currentUserId={currentUserId}
              onReply={(id) => setReplyTo(id)}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
        {replyToComment && (
          <div className="flex items-center gap-2 mb-2 text-xs text-blue-600">
            <span>
              Răspuns la {replyToComment.user?.firstName ?? "AI"}{" "}
              {replyToComment.user?.lastName ?? "Mediator"}
            </span>
            <button
              onClick={() => setReplyTo(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            placeholder="Scrie argumentul tău... (Enter pentru a trimite)"
            rows={2}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !newComment.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
          >
            {submitting ? "..." : "Trimite"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Comment Bubble ──────────────────────────────────

function CommentBubble({
  comment,
  replies,
  currentUserId,
  onReply,
}: {
  comment: Comment
  replies: Comment[]
  currentUserId: string
  onReply: (id: string) => void
}) {
  const isOwn = comment.userId === currentUserId
  const isAi = comment.isAi
  const authorName = isAi
    ? "AI Mediator"
    : `${comment.user?.firstName ?? ""} ${comment.user?.lastName ?? ""}`

  return (
    <div className="space-y-2">
      <div
        className={`rounded-lg px-3 py-2.5 ${
          isAi
            ? "bg-purple-50 border border-purple-200"
            : isOwn
            ? "bg-blue-50 border border-blue-200"
            : "bg-gray-50 border border-gray-200"
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-semibold ${
                isAi ? "text-purple-700" : "text-gray-700"
              }`}
            >
              {authorName}
            </span>
            {comment.user?.jobTitle && (
              <span className="text-[10px] text-gray-400">
                {comment.user.jobTitle}
              </span>
            )}
            {isAi && (
              <span className="text-[10px] bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded-full font-medium">
                AI
              </span>
            )}
          </div>
          <span className="text-[10px] text-gray-400">
            {new Date(comment.createdAt).toLocaleTimeString("ro-RO", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <div className="text-sm text-gray-800 whitespace-pre-wrap">
          {comment.content}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <button
            onClick={() => onReply(comment.id)}
            className="text-[10px] text-gray-400 hover:text-blue-600 transition-colors"
          >
            Răspunde
          </button>
          <span className="text-[10px] text-gray-300">
            Runda {comment.round}
          </span>
        </div>
      </div>

      {/* Replies (one level deep) */}
      {replies.length > 0 && (
        <div className="ml-6 space-y-2">
          {replies.map((reply) => (
            <CommentBubble
              key={reply.id}
              comment={reply}
              replies={[]}
              currentUserId={currentUserId}
              onReply={onReply}
            />
          ))}
        </div>
      )}
    </div>
  )
}
