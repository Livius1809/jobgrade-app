import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"

export const metadata = { title: "Pipeline primul client — Owner Dashboard" }
export const dynamic = "force-dynamic"

const TIER_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  tier1: { label: "TIER 1 — Blocker", color: "text-red-700", bgColor: "bg-red-50 border-red-200" },
  tier2: { label: "TIER 2 — Saptamana 1", color: "text-amber-700", bgColor: "bg-amber-50 border-amber-200" },
  tier3: { label: "TIER 3 — Luna 1", color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200" },
  pipeline: { label: "Coordonare", color: "text-slate-700", bgColor: "bg-slate-50 border-slate-200" },
}

const PRIORITY_COLORS: Record<string, string> = {
  IMPORTANT_URGENT: "bg-red-100 text-red-700",
  URGENT: "bg-amber-100 text-amber-700",
  IMPORTANT: "bg-blue-100 text-blue-700",
  NECESAR: "bg-slate-100 text-slate-600",
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  ASSIGNED: { label: "Asteptare", color: "text-slate-500" },
  ACCEPTED: { label: "Acceptat", color: "text-blue-600" },
  IN_PROGRESS: { label: "In lucru", color: "text-indigo-600" },
  COMPLETED: { label: "Finalizat", color: "text-emerald-600" },
  BLOCKED: { label: "Blocat", color: "text-red-600" },
  EXPIRED: { label: "Expirat", color: "text-slate-400" },
  FAILED: { label: "Esuat", color: "text-red-500" },
}

export default async function PipelinePage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "OWNER") redirect("/portal")

  const p = prisma as any

  // Toate taskurile pipeline (au tag-uri tier1/tier2/tier3/pipeline)
  const tasks = await p.agentTask.findMany({
    where: {
      tags: { hasSome: ["tier1", "tier2", "tier3", "pipeline"] },
    },
    select: {
      id: true, title: true, assignedTo: true, assignedBy: true,
      status: true, priority: true, tags: true,
      createdAt: true, completedAt: true, startedAt: true,
      blockerDescription: true, result: true,
    },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  })

  // Grupăm pe tier
  const tiers = ["tier1", "tier2", "tier3", "pipeline"]
  const grouped = tiers.map(tier => ({
    tier,
    config: TIER_CONFIG[tier],
    tasks: tasks.filter((t: any) => t.tags.includes(tier)),
  })).filter(g => g.tasks.length > 0)

  // Stats
  const total = tasks.length
  const completed = tasks.filter((t: any) => t.status === "COMPLETED").length
  const inProgress = tasks.filter((t: any) => t.status === "IN_PROGRESS" || t.status === "ACCEPTED").length
  const blocked = tasks.filter((t: any) => t.status === "BLOCKED").length
  const waiting = tasks.filter((t: any) => t.status === "ASSIGNED").length
  const overallProgress = total > 0 ? Math.round(completed / total * 100) : 0

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Pipeline primul client B2B</h1>
          <p className="text-sm text-slate-500">Status evolutiv — actualizat live</p>
        </div>
        <Link href="/owner" className="text-xs text-indigo-600 hover:underline">← Dashboard</Link>
      </div>

      {/* Progress bar global */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-slate-700">Progres global</span>
          <span className="text-2xl font-bold text-indigo-600">{overallProgress}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden mb-3">
          <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${overallProgress}%` }} />
        </div>
        <div className="flex gap-6 text-xs">
          <span className="text-emerald-600 font-medium">{completed} finalizat</span>
          <span className="text-indigo-600 font-medium">{inProgress} in lucru</span>
          <span className="text-red-600 font-medium">{blocked} blocat</span>
          <span className="text-slate-400">{waiting} asteptare</span>
          <span className="text-slate-400 ml-auto">{total} total</span>
        </div>
      </div>

      {/* Tiers */}
      {grouped.map(g => {
        const tierCompleted = g.tasks.filter((t: any) => t.status === "COMPLETED").length
        const tierProgress = g.tasks.length > 0 ? Math.round(tierCompleted / g.tasks.length * 100) : 0

        return (
          <div key={g.tier} className={`rounded-xl border p-6 ${g.config.bgColor}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-sm font-bold uppercase tracking-wide ${g.config.color}`}>
                {g.config.label}
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">{tierCompleted}/{g.tasks.length}</span>
                <div className="w-24 bg-white/60 rounded-full h-2 overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${tierProgress}%` }} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {g.tasks.map((t: any) => {
                const statusInfo = STATUS_LABELS[t.status] || { label: t.status, color: "text-slate-500" }
                const priorityColor = PRIORITY_COLORS[t.priority] || PRIORITY_COLORS.NECESAR
                const isActive = t.status === "IN_PROGRESS" || t.status === "ACCEPTED"
                const isDone = t.status === "COMPLETED"
                const isBlocked = t.status === "BLOCKED"

                return (
                  <div key={t.id} className={`rounded-lg bg-white p-4 border transition-colors ${
                    isDone ? "border-emerald-200 opacity-70" :
                    isBlocked ? "border-red-300" :
                    isActive ? "border-indigo-300 ring-1 ring-indigo-100" :
                    "border-slate-200"
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${priorityColor}`}>
                            {t.priority?.replace("_", " ") || "?"}
                          </span>
                          <span className={`text-[10px] font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          {isDone && <span className="text-[10px] text-emerald-500">✓</span>}
                        </div>
                        <p className={`text-sm font-medium ${isDone ? "text-slate-400 line-through" : "text-slate-800"}`}>
                          {t.title}
                        </p>
                        {isBlocked && t.blockerDescription && (
                          <p className="text-[10px] text-red-500 mt-1">Blocat: {t.blockerDescription}</p>
                        )}
                        {isDone && t.completedAt && (
                          <p className="text-[10px] text-emerald-500 mt-1">
                            Finalizat {new Date(t.completedAt).toLocaleDateString("ro-RO")}
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-xs font-mono text-indigo-600">{t.assignedTo}</span>
                        <p className="text-[9px] text-slate-400 mt-0.5">
                          {new Date(t.createdAt).toLocaleDateString("ro-RO")}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <div className="mt-8">
        <Link href="/owner" className="text-sm text-indigo-600 hover:underline">← Inapoi la Owner Dashboard</Link>
      </div>
    </div>
  )
}
