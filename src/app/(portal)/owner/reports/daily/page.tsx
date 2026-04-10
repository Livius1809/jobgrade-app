import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export const metadata = { title: "Raport zilnic — Owner Dashboard" }
export const maxDuration = 60

// Direct server-side call to chatWithCOG — evită self-fetch HTTP care eșuează
// în SSR pe Next.js 16 (same fix pattern as /owner page.tsx from 07.04.2026).
async function fetchCOGReport() {
  try {
    const { prisma } = await import("@/lib/prisma")
    const { chatWithCOG } = await import("@/lib/agents/cog-chat")
    return await chatWithCOG(
      "Generează raportul zilnic complet: 1) Starea fiecărui departament (tehnic, business, legal, marketing), 2) Taskuri în lucru cu blocaje și factor blocant, 3) KPI-uri: entries KB noi, cicluri manageriale executate, escaladări, brainstorming activ, 4) Acțiuni recomandate pentru Owner. Format structurat.",
      prisma,
    )
  } catch (e: any) {
    console.error("[DAILY REPORT]", e?.message ?? e)
    return null
  }
}

export default async function DailyReportPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "OWNER") redirect("/portal")

  const report = await fetchCOGReport()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/owner" className="text-sm text-indigo hover:underline">← Dashboard</Link>
        <h1 className="text-xl font-bold text-foreground">Raport zilnic</h1>
        <span className="text-xs text-text-secondary">
          {new Date().toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </span>
      </div>

      {!report ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm text-amber-700">Nu s-a putut genera raportul. Verifică dacă COG-ul este activ.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* COG Answer */}
          <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-3">Raport COG</h2>
            <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {report.cogAnswer}
            </div>
          </div>

          {/* Data Sources */}
          {report.dataSources && (
            <div className="rounded-xl border border-border bg-white p-5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Surse date</h3>
              <div className="flex flex-wrap gap-2">
                {report.dataSources.map((src: string, i: number) => (
                  <span key={i} className="text-xs bg-slate-100 text-slate-600 rounded-lg px-3 py-1">{src}</span>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Actions */}
          {report.suggestedActions && report.suggestedActions.length > 0 && (
            <div className="rounded-xl border border-border bg-white p-5">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Acțiuni recomandate</h3>
              <div className="space-y-2">
                {report.suggestedActions.map((action: { action: string; priority: string }, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      action.priority === "HIGH" ? "bg-orange-100 text-orange-700" :
                      action.priority === "CRITICAL" ? "bg-red-100 text-red-700" :
                      "bg-slate-100 text-slate-600"
                    }`}>{action.priority}</span>
                    <span className="text-slate-700">{action.action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Questions for Owner */}
          {report.questionsForOwner && report.questionsForOwner.length > 0 && (
            <div className="rounded-xl border border-indigo/20 bg-indigo-50/50 p-5">
              <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">Întrebări pentru tine</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
                {report.questionsForOwner.map((q: string, i: number) => (
                  <li key={i}>{q}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
