import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"

export const metadata = { title: "Evoluție Owner — Owner Dashboard" }
export const dynamic = "force-dynamic"

export default async function OwnerEvolutionPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "OWNER") redirect("/portal")

  const p = prisma as any
  const now = new Date()
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  let decisions: any = {}
  let patterns: any[] = []
  let reviewHistory: any[] = []

  try {
    // Decizii Owner (notificări DECISION cu răspuns)
    const [ownerNotifs, ownerTasks, reviewStats, weeklyActivity] = await Promise.all([
      p.notification.findMany({
        where: { requestKind: "DECISION", createdAt: { gte: d30 } },
        select: { id: true, title: true, read: true, createdAt: true, sourceRole: true },
        orderBy: { createdAt: "desc" },
        take: 30,
      }).catch(() => []),
      p.$queryRaw`
        SELECT
          count(*) as total,
          count(*) FILTER (WHERE "blockerAgentRole" = 'OWNER') as owner_blocked,
          count(*) FILTER (WHERE "assignedBy" = 'OWNER') as owner_created
        FROM agent_tasks WHERE "createdAt" > ${d30}
      ` as Promise<any[]>,
      p.$queryRaw`
        SELECT
          "reviewedBy",
          count(*) as total,
          count(*) FILTER (WHERE "resultQuality" >= 60) as approved,
          count(*) FILTER (WHERE "resultQuality" < 60) as rejected
        FROM agent_tasks
        WHERE "reviewedAt" > ${d30} AND "reviewedBy" IS NOT NULL
        GROUP BY "reviewedBy" ORDER BY total DESC LIMIT 10
      ` as Promise<any[]>,
      p.$queryRaw`
        SELECT
          date_trunc('week', "createdAt") as week,
          count(*) as tasks,
          count(*) FILTER (WHERE status = 'COMPLETED') as completed,
          count(*) FILTER (WHERE "kbHit" = true) as kb_hit
        FROM agent_tasks
        WHERE "createdAt" > ${d30}
        GROUP BY week ORDER BY week
      ` as Promise<any[]>,
    ])

    const ot = ownerTasks[0] || {}
    const totalNotifs = ownerNotifs.length
    const readNotifs = ownerNotifs.filter((n: any) => n.read).length
    const pendingDecisions = ownerNotifs.filter((n: any) => !n.read)

    decisions = {
      totalRequested: totalNotifs,
      responded: readNotifs,
      pending: pendingDecisions.length,
      responseRate: totalNotifs > 0 ? Math.round(readNotifs / totalNotifs * 100) : 0,
      tasksBlocked: Number(ot.owner_blocked || 0),
      tasksCreated: Number(ot.owner_created || 0),
      pendingList: pendingDecisions.slice(0, 5).map((n: any) => ({
        title: n.title?.slice(0, 60),
        from: n.sourceRole,
        date: new Date(n.createdAt).toLocaleDateString("ro-RO"),
      })),
    }

    reviewHistory = reviewStats.map((r: any) => ({
      manager: r.reviewedBy,
      total: Number(r.total),
      approved: Number(r.approved),
      rejected: Number(r.rejected),
      approvalRate: Number(r.total) > 0 ? Math.round(Number(r.approved) / Number(r.total) * 100) : 0,
    }))

    patterns = weeklyActivity.map((w: any) => ({
      week: new Date(w.week).toLocaleDateString("ro-RO", { day: "numeric", month: "short" }),
      tasks: Number(w.tasks),
      completed: Number(w.completed),
      kbHit: Number(w.kb_hit),
      realRate: Number(w.tasks) > 0 ? Math.round((Number(w.completed) - Number(w.kb_hit)) / Number(w.tasks) * 100) : 0,
    }))

  } catch (e: any) {
    console.error("[EVOLUTION]", e?.message)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/cockpit" className="text-sm text-indigo-600 hover:underline">← Dashboard</Link>
          <h1 className="text-xl font-bold text-slate-900">Evoluție Owner</h1>
        </div>
        <span className="text-xs text-slate-400">Ultimele 30 de zile — date reale</span>
      </div>

      {/* Decizii */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Decizii solicitate</h2>
        <div className="grid grid-cols-4 gap-3">
          <Stat label="Solicitate" value={decisions.totalRequested || 0} />
          <Stat label="Răspunse" value={decisions.responded || 0} accent="emerald" />
          <Stat label="În așteptare" value={decisions.pending || 0} accent={decisions.pending > 3 ? "red" : "amber"} />
          <Stat label="Rata răspuns" value={`${decisions.responseRate || 0}%`} accent={decisions.responseRate >= 80 ? "emerald" : "amber"} />
        </div>
      </section>

      {/* Decizii pending */}
      {decisions.pendingList?.length > 0 && (
        <section className="bg-violet-50 rounded-xl border border-violet-200 p-5">
          <h2 className="text-xs font-bold text-violet-700 uppercase tracking-wide mb-3">Așteaptă decizia ta</h2>
          {decisions.pendingList.map((d: any, i: number) => (
            <div key={i} className="text-xs mb-2 flex items-start gap-2">
              <span className="text-violet-500 font-bold shrink-0">{d.from}</span>
              <span className="text-slate-600">{d.title}</span>
              <span className="text-slate-400 ml-auto shrink-0">{d.date}</span>
            </div>
          ))}
        </section>
      )}

      {/* Activitate manageri review */}
      {reviewHistory.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Manageri — activitate review</h2>
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 text-slate-500">Manager</th>
                  <th className="text-right px-3 py-2 text-slate-500">Reviewuri</th>
                  <th className="text-right px-3 py-2 text-slate-500">Aprobate</th>
                  <th className="text-right px-3 py-2 text-slate-500">Respinse</th>
                  <th className="text-right px-3 py-2 text-slate-500">Rata aprobare</th>
                </tr>
              </thead>
              <tbody>
                {reviewHistory.map((r: any) => (
                  <tr key={r.manager} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-800">{r.manager}</td>
                    <td className="px-3 py-2 text-right">{r.total}</td>
                    <td className="px-3 py-2 text-right text-emerald-600">{r.approved}</td>
                    <td className="px-3 py-2 text-right text-red-600">{r.rejected}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`font-bold ${r.approvalRate >= 70 ? "text-emerald-600" : "text-amber-600"}`}>{r.approvalRate}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tendință săptămânală */}
      {patterns.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Tendință săptămânală</h2>
          <div className="space-y-2">
            {patterns.map((w: any) => (
              <div key={w.week} className="flex items-center gap-3 text-xs">
                <span className="text-slate-500 w-16 shrink-0">{w.week}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden flex">
                  <div className="bg-emerald-500 h-full" style={{ width: `${w.tasks > 0 ? (w.completed - w.kbHit) / w.tasks * 100 : 0}%` }} title="Făcut" />
                  <div className="bg-amber-400 h-full" style={{ width: `${w.tasks > 0 ? w.kbHit / w.tasks * 100 : 0}%` }} title="Știut" />
                </div>
                <span className="text-slate-600 w-20 text-right">{w.completed}/{w.tasks} · {w.realRate}%</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500" /> Făcut</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400" /> Știut (KB)</span>
          </div>
        </section>
      )}

      {/* Impact Owner */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Impact Owner pe organism</h2>
        <div className="grid grid-cols-2 gap-4">
          <Stat label="Task-uri blocate de tine" value={decisions.tasksBlocked || 0} accent={decisions.tasksBlocked > 5 ? "red" : undefined} />
          <Stat label="Task-uri create de tine" value={decisions.tasksCreated || 0} accent="indigo" />
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  const colors: Record<string, string> = { emerald: "text-emerald-600", red: "text-red-600", amber: "text-amber-600", indigo: "text-indigo-600", violet: "text-violet-600" }
  return (
    <div className="bg-slate-50 rounded-lg p-3">
      <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 ${accent ? colors[accent] || "text-slate-800" : "text-slate-800"}`}>{value}</p>
    </div>
  )
}
