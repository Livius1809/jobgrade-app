"use client"

import { useState, useEffect } from "react"

interface RequestData {
  whatIsNeeded?: string      // Ce anume cere agentul (text clar)
  context?: string           // De ce are nevoie de asta
  options?: string[]         // Opțiuni predefinite (dacă e decizie)
  resourceId?: string        // ID resursă dacă e acces
  resourceLabel?: string     // Denumire resursă
  deadline?: string          // Termen dacă există
}

interface Notification {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  createdAt: string
  sourceRole: string | null
  requestKind: "INFORMATION" | "ACCESS" | "DECISION" | "ACTION" | "VALIDATION" | null
  requestData: string | null  // JSON stringified RequestData
  responseKind: string | null
  respondedAt: string | null
  escalationChain: string[]   // Lanț escalare: [șef direct, director, ..., OWNER]
}

// ── Traducere rol → nume uman ──────────────────────────────────────────────

const ROLE_NAMES: Record<string, string> = {
  COG: "Directorul General",
  COA: "Directorul Operațional",
  DOA: "Administratorul Operațional",
  DOAS: "Administratorul Operațional Senior",
  COCSA: "Strategul Comercial",
  PMA: "Managerul de Produs",
  CJA: "Juristul",
  CIA: "Analistul de Informații",
  MKA: "Managerul de Marketing",
  CMA: "Managerul de Conținut",
  SOA: "Agentul de Vânzări",
  HR_COUNSELOR: "Consilierul HR",
  MEDIATOR: "Mediatorul",
  DMA: "Managerul de Date",
  CFO: "Directorul Financiar",
  CCO: "Directorul de Conformitate",
  COSO: "Observatorul Strategic",
}

function roleName(role: string | null): string {
  if (!role) return "Echipa"
  return ROLE_NAMES[role] || role
}

// ── Traducere requestKind → ce vede Owner-ul ───────────────────────────────

const REQUEST_LABELS: Record<string, { icon: string; label: string; color: string; bgColor: string; borderColor: string }> = {
  INFORMATION: { icon: "📋", label: "Solicita informatii", color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  ACCESS:      { icon: "🔑", label: "Solicita acces", color: "text-purple-700", bgColor: "bg-purple-50", borderColor: "border-purple-200" },
  DECISION:    { icon: "⚖️", label: "Necesita decizie", color: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-200" },
  ACTION:      { icon: "🎯", label: "Necesita actiune", color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-200" },
  VALIDATION:  { icon: "✅", label: "Solicita validare", color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-200" },
}

const FALLBACK_STYLE = { icon: "💬", label: "Mesaj", color: "text-slate-600", bgColor: "bg-slate-50", borderColor: "border-slate-200" }

// ── Eliminare jargon tehnic ────────────────────────────────────────────────

function cleanTechJargon(text: string): string {
  if (!text) return ""
  return text
    .replace(/FLUX-\d+[a-z]?\s*/gi, "")
    .replace(/\b(route\.ts|\.tsx?|\.mjs?|prisma|DB|cron|webhook|endpoint|API|SSR|ISR)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
}

// ── Componenta principala ──────────────────────────────────────────────────

export default function OwnerInbox() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [sending, setSending] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/v1/owner/notifications")
      .then(r => r.json())
      .then(data => {
        setNotifications(data.notifications || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function respond(id: string, responseKind: string, responseText?: string) {
    setSending(id)
    try {
      await fetch("/api/v1/owner/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, responseKind, responseText }),
      })
      setNotifications(prev => prev.map(n =>
        n.id === id ? { ...n, read: true, responseKind, respondedAt: new Date().toISOString() } : n
      ))
      setExpanded(null)
      setReplyText("")
    } catch { /* silently fail */ }
    setSending(null)
  }

  // Filtrare mesaje tehnice gestionate autonom de COG
  const COG_AUTO = /no_activity|dormant|reactivare|sincronizare|activare agent|diagnostic inactivitate/i
  const ownerMessages = notifications.filter(n => !COG_AUTO.test(n.title))
  const cogFiltered = notifications.length - ownerMessages.length
  const unread = ownerMessages.filter(n => !n.read)

  if (loading) return null
  if (ownerMessages.length === 0 && cogFiltered === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-slate-200" style={{ padding: "28px" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-[10px] text-amber-700 font-bold uppercase tracking-wide">Mesaje de la structura</p>
          {unread.length > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-bold">
              {unread.length}
            </span>
          )}
        </div>
        {cogFiltered > 0 && (
          <p className="text-[9px] text-slate-400">{cogFiltered} tehnice gestionate autonom</p>
        )}
      </div>

      <div style={{ height: "16px" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {ownerMessages.slice(0, 15).map(n => {
          const rk = n.requestKind
          const style = rk ? REQUEST_LABELS[rk] : FALLBACK_STYLE
          const reqData: RequestData = n.requestData ? JSON.parse(n.requestData) : {}
          const isExpanded = expanded === n.id
          const alreadyResponded = !!n.respondedAt

          return (
            <div
              key={n.id}
              className={`rounded-xl border transition-all ${
                alreadyResponded
                  ? "border-slate-100 bg-slate-50/30"
                  : `${style.borderColor} ${style.bgColor}`
              }`}
              style={{ padding: "16px" }}
            >
              {/* ── Header ── */}
              <div
                className="flex items-start justify-between gap-3 cursor-pointer"
                onClick={() => {
                  setExpanded(isExpanded ? null : n.id)
                  setReplyText("")
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {!n.read && !alreadyResponded && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />}
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                      alreadyResponded ? "bg-slate-100 text-slate-400" : `${style.bgColor} ${style.color}`
                    }`}>
                      {style.icon} {style.label}
                    </span>
                  </div>

                  {/* Solicitant principal + lanț escalare */}
                  <div style={{ height: "4px" }} />
                  <div className="flex items-center gap-1 flex-wrap text-[9px]">
                    <span className="font-semibold text-slate-600">
                      {roleName(n.sourceRole)}
                    </span>
                    {n.escalationChain && n.escalationChain.length > 0 && (
                      <>
                        <span className="text-slate-300 mx-0.5">|</span>
                        <span className="text-slate-400">escalare:</span>
                        {n.escalationChain.map((step, i) => (
                          <span key={i} className="flex items-center gap-0.5">
                            {i > 0 && <span className="text-slate-300">→</span>}
                            <span className={step === "OWNER"
                              ? "font-bold text-indigo-600"
                              : "text-slate-500"
                            }>
                              {step === "OWNER" ? "Tu" : roleName(step)}
                            </span>
                          </span>
                        ))}
                      </>
                    )}
                  </div>

                  <div style={{ height: "6px" }} />

                  {/* Rezumat: ce cere agentul (tradus) */}
                  <p className={`text-sm leading-relaxed ${alreadyResponded ? "text-slate-400" : "text-slate-800"}`}>
                    {reqData.whatIsNeeded
                      ? cleanTechJargon(reqData.whatIsNeeded)
                      : cleanTechJargon(n.body)
                    }
                  </p>

                  {/* Context scurt */}
                  {reqData.context && !isExpanded && (
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                      {cleanTechJargon(reqData.context)}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[9px] text-slate-300">
                    {new Date(n.createdAt).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" })}
                  </span>
                  {alreadyResponded && (
                    <span className="text-[8px] text-emerald-500 font-medium">raspuns</span>
                  )}
                  {reqData.deadline && !alreadyResponded && (
                    <span className="text-[8px] text-red-500 font-medium">termen: {reqData.deadline}</span>
                  )}
                </div>
              </div>

              {/* ── Expanded: context + butoane contextuale ── */}
              {isExpanded && !alreadyResponded && (
                <>
                  {/* Context complet */}
                  {reqData.context && (
                    <>
                      <div style={{ height: "10px" }} />
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        <span className="font-semibold">De ce:</span> {cleanTechJargon(reqData.context)}
                      </p>
                    </>
                  )}

                  <div style={{ height: "14px" }} />

                  {/* ── Butoane per tip cerere ── */}
                  {rk === "INFORMATION" && (
                    <InformationResponse
                      reqData={reqData}
                      replyText={replyText}
                      setReplyText={setReplyText}
                      onSend={(text) => respond(n.id, "INFO_PROVIDED", text)}
                      onClarify={() => respond(n.id, "CLARIFICATION", "Precizati mai exact ce informatii va trebuie si in ce scop.")}
                      sending={sending === n.id}
                    />
                  )}

                  {rk === "ACCESS" && (
                    <AccessResponse
                      reqData={reqData}
                      onGrant={() => respond(n.id, "ACCESS_GRANTED")}
                      onDeny={() => respond(n.id, "ACCESS_DENIED")}
                      onClarify={() => respond(n.id, "CLARIFICATION", "Explicati ce anume veti face cu acest acces si de ce e necesar.")}
                      sending={sending === n.id}
                    />
                  )}

                  {rk === "DECISION" && (
                    <DecisionResponse
                      reqData={reqData}
                      replyText={replyText}
                      setReplyText={setReplyText}
                      onApprove={() => respond(n.id, "APPROVED")}
                      onReject={() => respond(n.id, "REJECTED")}
                      onAdjust={(text) => respond(n.id, "ADJUSTED", text)}
                      onClarify={() => respond(n.id, "CLARIFICATION", "Am nevoie de mai mult context inainte de a decide.")}
                      sending={sending === n.id}
                    />
                  )}

                  {rk === "ACTION" && (
                    <ActionResponse
                      reqData={reqData}
                      replyText={replyText}
                      setReplyText={setReplyText}
                      onDone={(text) => respond(n.id, "ACTION_DONE", text)}
                      onDelegate={(text) => respond(n.id, "DELEGATED", text)}
                      onClarify={() => respond(n.id, "CLARIFICATION", "Precizati exact ce trebuie facut si pana cand.")}
                      sending={sending === n.id}
                    />
                  )}

                  {rk === "VALIDATION" && (
                    <ValidationResponse
                      reqData={reqData}
                      replyText={replyText}
                      setReplyText={setReplyText}
                      onValidate={() => respond(n.id, "VALIDATED")}
                      onAdjust={(text) => respond(n.id, "ADJUSTED", text)}
                      onClarify={() => respond(n.id, "CLARIFICATION", "Vreau sa vad mai multe detalii inainte de validare.")}
                      sending={sending === n.id}
                    />
                  )}

                  {/* Fallback pentru notificări vechi fără requestKind */}
                  {!rk && (
                    <LegacyResponse
                      replyText={replyText}
                      setReplyText={setReplyText}
                      onRespond={(text) => respond(n.id, "INFO_PROVIDED", text)}
                      onAck={() => respond(n.id, "APPROVED")}
                      onClarify={() => respond(n.id, "CLARIFICATION", "Va rog sa detaliati in termeni de business ce anume necesitati.")}
                      sending={sending === n.id}
                    />
                  )}
                </>
              )}

              {/* Deja raspuns — arată ce s-a răspuns */}
              {isExpanded && alreadyResponded && (
                <>
                  <div style={{ height: "10px" }} />
                  <p className="text-[10px] text-emerald-600 font-medium">
                    Raspuns: {responseLabel(n.responseKind)}
                    {n.respondedAt && ` — ${new Date(n.respondedAt).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`}
                  </p>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function responseLabel(kind: string | null): string {
  const labels: Record<string, string> = {
    INFO_PROVIDED: "Informatia a fost furnizata",
    ACCESS_GRANTED: "Acces acordat",
    ACCESS_DENIED: "Acces refuzat",
    APPROVED: "Aprobat",
    REJECTED: "Respins",
    ADJUSTED: "Aprobat cu ajustari",
    ACTION_DONE: "Actiune realizata",
    VALIDATED: "Validat",
    DELEGATED: "Delegat",
    CLARIFICATION: "S-au cerut lamuriri",
  }
  return labels[kind || ""] || kind || "—"
}

// ═══ Componente raspuns per tip ═══════════════════════════════════════════

function InformationResponse({ reqData, replyText, setReplyText, onSend, onClarify, sending }: {
  reqData: RequestData; replyText: string; setReplyText: (t: string) => void
  onSend: (text: string) => void; onClarify: () => void; sending: boolean
}) {
  return (
    <div>
      <p className="text-[10px] text-blue-600 font-semibold mb-2">
        Ce informatii furnizati:
      </p>
      <textarea
        value={replyText}
        onChange={e => setReplyText(e.target.value)}
        placeholder={reqData.whatIsNeeded
          ? `Furnizati: ${cleanTechJargon(reqData.whatIsNeeded)}`
          : "Scrieti informatia solicitata..."
        }
        className="w-full border border-blue-200 rounded-lg p-3 text-xs text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
        rows={3}
        autoFocus
      />
      <div style={{ height: "8px" }} />
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => onSend(replyText)}
          disabled={sending || replyText.trim().length < 3}
          className="text-[10px] font-medium bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40"
        >
          {sending ? "Se trimite..." : "Ofer informatia"}
        </button>
        <button onClick={onClarify} disabled={sending}
          className="text-[10px] font-medium bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-40"
        >
          Ce anume va trebuie?
        </button>
      </div>
    </div>
  )
}

function AccessResponse({ reqData, onGrant, onDeny, onClarify, sending }: {
  reqData: RequestData
  onGrant: () => void; onDeny: () => void; onClarify: () => void; sending: boolean
}) {
  return (
    <div>
      {reqData.resourceLabel && (
        <p className="text-[10px] text-purple-600 font-semibold mb-3">
          Resursa solicitata: <span className="font-bold">{reqData.resourceLabel}</span>
        </p>
      )}
      <div className="flex gap-2 flex-wrap">
        <button onClick={onGrant} disabled={sending}
          className="text-[10px] font-medium bg-emerald-600 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-40"
        >
          {sending ? "..." : "Acord accesul"}
        </button>
        <button onClick={onDeny} disabled={sending}
          className="text-[10px] font-medium bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-40"
        >
          Refuz accesul
        </button>
        <button onClick={onClarify} disabled={sending}
          className="text-[10px] font-medium bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-40"
        >
          De ce aveti nevoie?
        </button>
      </div>
    </div>
  )
}

function DecisionResponse({ reqData, replyText, setReplyText, onApprove, onReject, onAdjust, onClarify, sending }: {
  reqData: RequestData; replyText: string; setReplyText: (t: string) => void
  onApprove: () => void; onReject: () => void; onAdjust: (text: string) => void; onClarify: () => void; sending: boolean
}) {
  const [showAdjust, setShowAdjust] = useState(false)

  // Dacă agentul a oferit opțiuni predefinite
  if (reqData.options && reqData.options.length > 0 && !showAdjust) {
    return (
      <div>
        <p className="text-[10px] text-red-600 font-semibold mb-2">Optiuni propuse:</p>
        <div className="flex flex-col gap-2">
          {reqData.options.map((opt, i) => (
            <button key={i} onClick={() => onApprove()} disabled={sending}
              className="text-left text-xs bg-white border border-red-200 rounded-lg px-4 py-2.5 hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-40"
            >
              <span className="font-medium text-slate-800">{opt}</span>
            </button>
          ))}
        </div>
        <div style={{ height: "8px" }} />
        <div className="flex gap-2">
          <button onClick={() => setShowAdjust(true)} disabled={sending}
            className="text-[10px] font-medium bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-200 transition-colors"
          >
            Ajustez
          </button>
          <button onClick={onReject} disabled={sending}
            className="text-[10px] font-medium bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-40"
          >
            Resping
          </button>
          <button onClick={onClarify} disabled={sending}
            className="text-[10px] font-medium bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-40"
          >
            Mai mult context
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-3">
        <button onClick={onApprove} disabled={sending}
          className="text-[10px] font-medium bg-emerald-600 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-40"
        >
          {sending ? "..." : "Aprob"}
        </button>
        <button onClick={onReject} disabled={sending}
          className="text-[10px] font-medium bg-red-100 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-40"
        >
          Resping
        </button>
        <button onClick={onClarify} disabled={sending}
          className="text-[10px] font-medium bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-40"
        >
          Mai mult context
        </button>
      </div>
      {(showAdjust || !reqData.options) && (
        <>
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Aprob cu urmatoarele ajustari..."
            className="w-full border border-amber-200 rounded-lg p-3 text-xs text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
            rows={2}
          />
          {replyText.trim().length >= 3 && (
            <>
              <div style={{ height: "6px" }} />
              <button onClick={() => onAdjust(replyText)} disabled={sending}
                className="text-[10px] font-medium bg-amber-600 text-white px-4 py-1.5 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-40"
              >
                Aprob cu ajustari
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}

function ActionResponse({ reqData, replyText, setReplyText, onDone, onDelegate, onClarify, sending }: {
  reqData: RequestData; replyText: string; setReplyText: (t: string) => void
  onDone: (text: string) => void; onDelegate: (text: string) => void; onClarify: () => void; sending: boolean
}) {
  const [mode, setMode] = useState<"none" | "done" | "delegate">("none")

  if (mode === "none") {
    return (
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setMode("done")} disabled={sending}
          className="text-[10px] font-medium bg-emerald-600 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Am realizat actiunea
        </button>
        <button onClick={() => setMode("delegate")} disabled={sending}
          className="text-[10px] font-medium bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-200 transition-colors"
        >
          Deleghez
        </button>
        <button onClick={onClarify} disabled={sending}
          className="text-[10px] font-medium bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-40"
        >
          Ce anume trebuie facut?
        </button>
      </div>
    )
  }

  return (
    <div>
      <textarea
        value={replyText}
        onChange={e => setReplyText(e.target.value)}
        placeholder={mode === "done"
          ? "Ce am facut concret (optional)..."
          : "Deleghez catre... (precizati cui)"
        }
        className="w-full border border-slate-200 rounded-lg p-3 text-xs text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
        rows={2}
        autoFocus
      />
      <div style={{ height: "8px" }} />
      <div className="flex gap-2">
        <button
          onClick={() => mode === "done" ? onDone(replyText) : onDelegate(replyText)}
          disabled={sending || (mode === "delegate" && replyText.trim().length < 3)}
          className="text-[10px] font-medium bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40"
        >
          {sending ? "..." : mode === "done" ? "Confirma" : "Deleghez"}
        </button>
        <button onClick={() => { setMode("none"); setReplyText("") }}
          className="text-[10px] font-medium text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          Inapoi
        </button>
      </div>
    </div>
  )
}

function ValidationResponse({ reqData, replyText, setReplyText, onValidate, onAdjust, onClarify, sending }: {
  reqData: RequestData; replyText: string; setReplyText: (t: string) => void
  onValidate: () => void; onAdjust: (text: string) => void; onClarify: () => void; sending: boolean
}) {
  return (
    <div>
      {reqData.resourceLabel && (
        <p className="text-[10px] text-emerald-600 font-semibold mb-3">
          De validat: <span className="font-bold">{reqData.resourceLabel}</span>
        </p>
      )}
      <div className="flex gap-2 flex-wrap mb-3">
        <button onClick={onValidate} disabled={sending}
          className="text-[10px] font-medium bg-emerald-600 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-40"
        >
          {sending ? "..." : "Validez"}
        </button>
        <button onClick={onClarify} disabled={sending}
          className="text-[10px] font-medium bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-40"
        >
          Vreau sa vad mai mult
        </button>
      </div>
      <textarea
        value={replyText}
        onChange={e => setReplyText(e.target.value)}
        placeholder="Observatii sau ajustari necesare..."
        className="w-full border border-slate-200 rounded-lg p-3 text-xs text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300"
        rows={2}
      />
      {replyText.trim().length >= 3 && (
        <>
          <div style={{ height: "6px" }} />
          <button onClick={() => onAdjust(replyText)} disabled={sending}
            className="text-[10px] font-medium bg-amber-600 text-white px-4 py-1.5 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-40"
          >
            Validez cu observatii
          </button>
        </>
      )}
    </div>
  )
}

function LegacyResponse({ replyText, setReplyText, onRespond, onAck, onClarify, sending }: {
  replyText: string; setReplyText: (t: string) => void
  onRespond: (text: string) => void; onAck: () => void; onClarify: () => void; sending: boolean
}) {
  const [showInput, setShowInput] = useState(false)

  return (
    <div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setShowInput(true)}
          className="text-[10px] font-medium bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-200 transition-colors"
        >
          Raspunde
        </button>
        <button onClick={onAck} disabled={sending}
          className="text-[10px] font-medium bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-200 transition-colors disabled:opacity-40"
        >
          Am luat act
        </button>
        <button onClick={onClarify} disabled={sending}
          className="text-[10px] font-medium bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-40"
        >
          Detaliati
        </button>
      </div>
      {showInput && (
        <>
          <div style={{ height: "8px" }} />
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder="Scrieti raspunsul..."
            className="w-full border border-slate-200 rounded-lg p-3 text-xs text-slate-700 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
            rows={3}
            autoFocus
          />
          <div style={{ height: "6px" }} />
          <button onClick={() => onRespond(replyText)}
            disabled={sending || replyText.trim().length < 3}
            className="text-[10px] font-medium bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-40"
          >
            {sending ? "Se trimite..." : "Trimite"}
          </button>
        </>
      )}
    </div>
  )
}
