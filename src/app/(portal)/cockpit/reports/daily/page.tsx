import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"

export const metadata = { title: "Raport zilnic — Owner Dashboard" }
export const dynamic = "force-dynamic"

export default async function DailyReportPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "OWNER") redirect("/portal")

  const p = prisma as any
  const now = new Date()
  const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const h48 = new Date(now.getTime() - 48 * 60 * 60 * 1000)

  // ── Date reale din DB ──
  let data: any = {}
  try {
    const [tasks24h, tasks48h, reviewPending, blocked, costData, learningNew, escalations] = await Promise.all([
      p.$queryRaw`
        SELECT
          count(*) as total,
          count(*) FILTER (WHERE status = 'COMPLETED') as completed,
          count(*) FILTER (WHERE status = 'REVIEW_PENDING') as review_pending,
          count(*) FILTER (WHERE status IN ('ASSIGNED','ACCEPTED','IN_PROGRESS')) as in_progress,
          count(*) FILTER (WHERE status = 'FAILED') as failed,
          count(*) FILTER (WHERE "kbHit" = true) as kb_resolved,
          count(*) FILTER (WHERE "resultQuality" IS NOT NULL AND "resultQuality" >= 60) as approved,
          count(*) FILTER (WHERE "resultQuality" IS NOT NULL AND "resultQuality" < 60) as rejected
        FROM agent_tasks WHERE "createdAt" > ${h24}
      ` as Promise<any[]>,
      p.agentTask.count({ where: { createdAt: { gte: h48, lt: h24 }, status: "COMPLETED" } }),
      p.agentTask.count({ where: { status: "REVIEW_PENDING" } }),
      p.agentTask.findMany({
        where: { status: "BLOCKED" },
        select: { assignedTo: true, title: true, blockerDescription: true, blockerAgentRole: true },
        take: 10,
      }),
      p.$queryRaw`
        SELECT COALESCE(SUM("estimatedCostUSD"), 0) as cost
        FROM execution_telemetry WHERE "createdAt" > ${h24}
      ` as Promise<any[]>,
      p.$queryRaw`
        SELECT count(*) as cnt FROM learning_artifacts WHERE "createdAt" > ${h24} AND validated = true
      ` as Promise<any[]>,
      p.escalation?.findMany({
        where: { status: "OPEN" },
        select: { aboutRole: true, reason: true, severity: true },
        take: 5,
      }).catch(() => []),
    ])

    const t = tasks24h[0] || {}
    const completedYesterday = Number(tasks48h || 0)
    const completedToday = Number(t.completed || 0)
    const trend = completedYesterday > 0 ? Math.round((completedToday - completedYesterday) / completedYesterday * 100) : 0

    data = {
      tasks: {
        total: Number(t.total || 0),
        completed: completedToday,
        reviewPending: Number(t.review_pending || 0) + Number(reviewPending || 0),
        inProgress: Number(t.in_progress || 0),
        failed: Number(t.failed || 0),
        kbResolved: Number(t.kb_resolved || 0),
        approved: Number(t.approved || 0),
        rejected: Number(t.rejected || 0),
        trend,
      },
      blocked: (blocked || []).map((b: any) => ({
        agent: b.assignedTo,
        task: b.title?.slice(0, 60),
        reason: b.blockerDescription?.slice(0, 80) || "—",
        depends: b.blockerAgentRole || "—",
      })),
      cost: Math.round(Number(costData[0]?.cost || 0) * 100) / 100,
      learningNew: Number(learningNew[0]?.cnt || 0),
      escalations: (escalations || []).map((e: any) => ({
        role: e.aboutRole,
        reason: e.reason?.slice(0, 80),
        severity: e.severity,
      })),
    }
  } catch (e: any) {
    console.error("[DAILY]", e?.message)
  }

  const t = data.tasks || {}

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/cockpit" className="text-sm text-indigo-600 hover:underline">← Dashboard</Link>
          <h1 className="text-xl font-bold text-slate-900">Raport zilnic</h1>
        </div>
        <span className="text-xs text-slate-400">
          {now.toLocaleDateString("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </span>
      </div>

      {/* Pipeline 24h */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Pipeline ultimele 24h</h2>
        <div className="grid grid-cols-4 gap-3 mb-4">
          <Stat label="Task-uri noi" value={t.total || 0} />
          <Stat label="Completate" value={t.completed || 0} accent="emerald" trend={t.trend} />
          <Stat label="Așteaptă review" value={t.reviewPending || 0} accent={t.reviewPending > 5 ? "amber" : undefined} />
          <Stat label="Eșuate" value={t.failed || 0} accent={t.failed > 0 ? "red" : undefined} />
        </div>
        <div className="grid grid-cols-4 gap-3">
          <Stat label="Făcut (AI real)" value={t.completed - t.kbResolved || 0} accent="indigo" />
          <Stat label="Știut (KB)" value={t.kbResolved || 0} accent="amber" />
          <Stat label="Aprobate de manager" value={t.approved || 0} accent="emerald" />
          <Stat label="Respinse" value={t.rejected || 0} accent={t.rejected > 0 ? "red" : undefined} />
        </div>
      </section>

      {/* Blocaje active */}
      {data.blocked?.length > 0 && (
        <section className="bg-amber-50 rounded-xl border border-amber-200 p-5">
          <h2 className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-3">Blocaje active</h2>
          <div className="space-y-2">
            {data.blocked.map((b: any, i: number) => (
              <div key={i} className="flex items-start gap-3 text-xs border-b border-amber-100 pb-2">
                <span className="text-amber-600 font-bold shrink-0 w-16">{b.agent}</span>
                <div className="flex-1">
                  <p className="text-slate-700">{b.task}</p>
                  <p className="text-slate-400 mt-0.5">Motiv: {b.reason} · Depinde de: {b.depends}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Escalări */}
      {data.escalations?.length > 0 && (
        <section className="bg-red-50 rounded-xl border border-red-200 p-5">
          <h2 className="text-xs font-bold text-red-700 uppercase tracking-wide mb-3">Escalări deschise</h2>
          {data.escalations.map((e: any, i: number) => (
            <div key={i} className="text-xs mb-2">
              <span className="font-bold text-red-600">{e.role}</span>
              <span className="text-slate-500 ml-2">{e.severity}</span>
              <p className="text-slate-600 mt-0.5">{e.reason}</p>
            </div>
          ))}
        </section>
      )}

      {/* Metrici */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Metrici</h2>
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Cost AI 24h" value={`$${data.cost || 0}`} />
          <Stat label="Cunoștințe validate noi" value={data.learningNew || 0} accent="violet" />
          <Stat label="Rata reală execuție" value={t.total > 0 ? `${Math.round(((t.completed - t.kbResolved) / t.total) * 100)}%` : "—"} accent="indigo" />
        </div>
      </section>

      {data.blocked?.length === 0 && data.escalations?.length === 0 && (
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-5 text-center">
          <p className="text-sm text-emerald-700 font-medium">Niciun blocaj sau escalare activă.</p>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, accent, trend }: { label: string; value: string | number; accent?: string; trend?: number }) {
  const colors: Record<string, string> = { emerald: "text-emerald-600", red: "text-red-600", amber: "text-amber-600", indigo: "text-indigo-600", violet: "text-violet-600" }
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 ${accent ? colors[accent] || "text-slate-800" : "text-slate-800"}`}>{value}</p>
      {trend !== undefined && trend !== 0 && (
        <p className={`text-[10px] mt-0.5 ${trend > 0 ? "text-emerald-500" : "text-red-500"}`}>
          {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}% vs ieri
        </p>
      )}
    </div>
  )
}
