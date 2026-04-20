import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"

export const metadata = { title: "Evoluție organism — Owner Dashboard" }

export const dynamic = "force-dynamic"

export default async function AgentsReportPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "OWNER") redirect("/portal")

  const p = prisma as any
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  let pipeline = { total: 0, completed: 0, escalated: 0, blocked: 0, claudeCalls: 0, byDept: [] as any[] }
  let learning = { total: 0, prevTotal: 0, fromInternal: 0, fromClients: 0, fromClaude: 0, fromExternal: 0 }
  let agents: any[] = []

  try {
    // ═══════════════════════════════════════════════════════════════
    // BLOC 1: Pipeline task-uri (ultima săptămână)
    // ═══════════════════════════════════════════════════════════════

    const [taskStats, tasksByDept, escalationCount, claudeCallCount] = await Promise.all([
      // Task-uri totale și completate
      p.$queryRaw`
        SELECT
          count(*) as total,
          count(*) FILTER (WHERE status = 'COMPLETED') as completed,
          count(*) FILTER (WHERE status = 'BLOCKED') as blocked
        FROM agent_tasks
        WHERE "createdAt" > ${oneWeekAgo}
      ` as Promise<any[]>,

      // Distribuție pe departamente (assignedBy = managerul/departamentul)
      p.$queryRaw`
        SELECT "assignedBy" as dept, count(*) as total,
          count(*) FILTER (WHERE status = 'COMPLETED') as completed
        FROM agent_tasks
        WHERE "createdAt" > ${oneWeekAgo}
        GROUP BY "assignedBy"
        ORDER BY total DESC
        LIMIT 10
      ` as Promise<any[]>,

      // Escalări
      p.escalation.count({
        where: { createdAt: { gte: oneWeekAgo } },
      }).catch(() => 0),

      // Apeluri Claude (estimăm din task-uri completate cu result != null)
      p.agentTask.count({
        where: {
          createdAt: { gte: oneWeekAgo },
          status: "COMPLETED",
          result: { not: null },
        },
      }).catch(() => 0),
    ])

    pipeline = {
      total: Number(taskStats[0]?.total || 0),
      completed: Number(taskStats[0]?.completed || 0),
      blocked: Number(taskStats[0]?.blocked || 0),
      escalated: escalationCount,
      claudeCalls: claudeCallCount,
      byDept: tasksByDept.map((d: any) => ({
        dept: d.dept,
        total: Number(d.total),
        completed: Number(d.completed),
      })),
    }

    // ═══════════════════════════════════════════════════════════════
    // BLOC 2: Învățare (creștere KB per sursă)
    // ═══════════════════════════════════════════════════════════════

    const [kbThisWeek, kbPrevWeek] = await Promise.all([
      p.$queryRaw`
        SELECT
          count(*) as total,
          count(*) FILTER (WHERE source = 'PROPAGATED' OR source = 'EXPERT_HUMAN') as from_internal,
          count(*) FILTER (WHERE source = 'DISTILLED_INTERACTION') as from_clients,
          count(*) FILTER (WHERE source = 'SELF_INTERVIEW') as from_claude
        FROM kb_entries
        WHERE "createdAt" > ${oneWeekAgo}
      ` as Promise<any[]>,

      p.kBEntry.count({
        where: { createdAt: { gte: twoWeeksAgo, lt: oneWeekAgo } },
      }).catch(() => 0),
    ])

    const kbRow = kbThisWeek[0] || {}
    const totalThisWeek = Number(kbRow.total || 0)
    const fromInternal = Number(kbRow.from_internal || 0)
    const fromClients = Number(kbRow.from_clients || 0)
    const fromClaude = Number(kbRow.from_claude || 0)
    const fromExternal = totalThisWeek - fromInternal - fromClients - fromClaude

    learning = {
      total: totalThisWeek,
      prevTotal: Number(kbPrevWeek || 0),
      fromInternal,
      fromClients,
      fromClaude,
      fromExternal: Math.max(0, fromExternal),
    }

    // ═══════════════════════════════════════════════════════════════
    // BLOC 3: Per agent — rezumat
    // ═══════════════════════════════════════════════════════════════

    const definitions = await p.agentDefinition.findMany({
      where: { isActive: true },
      orderBy: { agentRole: "asc" },
      select: { agentRole: true, displayName: true, level: true, isManager: true },
    })

    const [agentTasks, agentKB] = await Promise.all([
      p.$queryRaw`
        SELECT "assignedTo" as role,
          count(*) as total,
          count(*) FILTER (WHERE status = 'COMPLETED') as completed,
          count(*) FILTER (WHERE status = 'BLOCKED') as blocked
        FROM agent_tasks
        WHERE "createdAt" > ${oneWeekAgo}
        GROUP BY "assignedTo"
      ` as Promise<any[]>,

      p.$queryRaw`
        SELECT "agentRole" as role, count(*) as learned
        FROM kb_entries
        WHERE "createdAt" > ${oneWeekAgo}
        GROUP BY "agentRole"
      ` as Promise<any[]>,
    ])

    const taskMap = new Map(agentTasks.map((r: any) => [r.role, { total: Number(r.total), completed: Number(r.completed), blocked: Number(r.blocked) }]))
    const kbMap = new Map(agentKB.map((r: any) => [r.role, Number(r.learned)]))

    agents = definitions.map((d: any) => {
      const t = taskMap.get(d.agentRole) || { total: 0, completed: 0, blocked: 0 }
      return {
        role: d.agentRole,
        name: d.displayName || d.agentRole,
        level: d.level,
        isManager: d.isManager,
        tasks: t.total,
        completed: t.completed,
        blocked: t.blocked,
        completionRate: t.total > 0 ? Math.round(t.completed / t.total * 100) : null,
        learned: kbMap.get(d.agentRole) || 0,
      }
    }).filter((a: any) => a.tasks > 0 || a.learned > 0)

  } catch (e) {
    console.error("[agents-report]", e)
  }

  // Calcule derivate
  const completionRate = pipeline.total > 0 ? Math.round(pipeline.completed / pipeline.total * 100) : 0
  const escalationRate = pipeline.total > 0 ? Math.round(pipeline.escalated / pipeline.total * 100) : 0
  const learningGrowth = learning.prevTotal > 0
    ? Math.round((learning.total - learning.prevTotal) / learning.prevTotal * 100)
    : learning.total > 0 ? 100 : 0
  const learningTotal = learning.total || 1 // evit /0
  const pctInternal = Math.round(learning.fromInternal / learningTotal * 100)
  const pctClients = Math.round(learning.fromClients / learningTotal * 100)
  const pctClaude = Math.round(learning.fromClaude / learningTotal * 100)
  const pctExternal = Math.round(learning.fromExternal / learningTotal * 100)

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Evoluție organism</h1>
          <p className="text-sm text-slate-500">Ultima săptămână — pipeline, învățare, direcție de creștere</p>
        </div>
        <Link href="/owner" className="text-xs text-indigo-600 hover:underline">← Dashboard</Link>
      </div>

      {/* ═══ PIPELINE ═══ */}
      <section>
        <h2 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">Pipeline task-uri</h2>
        <div className="grid grid-cols-5 gap-4">
          <StatCard label="Total alocate" value={pipeline.total} />
          <StatCard label="Completate" value={pipeline.completed} accent="emerald" />
          <StatCard label="Blocate" value={pipeline.blocked} accent={pipeline.blocked > 0 ? "red" : undefined} />
          <StatCard label="Rata escalare" value={`${escalationRate}%`} accent={escalationRate > 30 ? "amber" : undefined} />
          <StatCard label="Apeluri Claude" value={pipeline.claudeCalls} accent="indigo" />
        </div>

        {/* Bară progres completare */}
        <div className="mt-4 bg-slate-100 rounded-full h-3 overflow-hidden">
          <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${completionRate}%` }} />
        </div>
        <p className="text-xs text-slate-400 mt-1">{completionRate}% rata de completare</p>

        {/* Per departament */}
        {pipeline.byDept.length > 0 && (
          <div className="mt-4 grid grid-cols-5 gap-2">
            {pipeline.byDept.slice(0, 10).map((d: any) => (
              <div key={d.dept} className="bg-slate-50 rounded-lg p-2 text-center">
                <p className="text-[10px] text-slate-400 truncate">{d.dept}</p>
                <p className="text-sm font-bold text-slate-700">{d.completed}/{d.total}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ═══ ÎNVĂȚARE ═══ */}
      <section>
        <h2 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">Învățare organism</h2>
        <div className="grid grid-cols-5 gap-4">
          <StatCard
            label="Total învățare"
            value={`${learning.total} entries`}
            subtitle={learningGrowth > 0 ? `+${learningGrowth}% vs. săpt. anterioară` : learningGrowth < 0 ? `${learningGrowth}%` : "—"}
            accent={learningGrowth > 0 ? "emerald" : learningGrowth < 0 ? "red" : undefined}
          />
          <StatCard label="Din structura internă" value={`${pctInternal}%`} subtitle={`${learning.fromInternal} entries`} accent="indigo" />
          <StatCard label="De la clienți" value={`${pctClients}%`} subtitle={`${learning.fromClients} entries`} accent="violet" />
          <StatCard label="De la Claude" value={`${pctClaude}%`} subtitle={`${learning.fromClaude} entries`} accent="amber" />
          <StatCard label="Surse externe" value={`${pctExternal}%`} subtitle={`${learning.fromExternal} entries`} accent="slate" />
        </div>

        {/* Bară distribuție învățare */}
        <div className="mt-4 flex rounded-full h-3 overflow-hidden">
          {pctInternal > 0 && <div className="bg-indigo-500 h-full" style={{ width: `${pctInternal}%` }} title="Intern" />}
          {pctClients > 0 && <div className="bg-violet-500 h-full" style={{ width: `${pctClients}%` }} title="Clienți" />}
          {pctClaude > 0 && <div className="bg-amber-400 h-full" style={{ width: `${pctClaude}%` }} title="Claude" />}
          {pctExternal > 0 && <div className="bg-slate-400 h-full" style={{ width: `${pctExternal}%` }} title="Extern" />}
        </div>
        <div className="flex gap-4 mt-2 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-indigo-500" /> Intern</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-violet-500" /> Clienți</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400" /> Claude</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-slate-400" /> Extern</span>
        </div>
      </section>

      {/* ═══ INDICATORI DIRECȚIE ═══ */}
      <section>
        <h2 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">Direcție de creștere</h2>
        <div className="grid grid-cols-3 gap-4">
          <DirectionCard
            label="Autonomie"
            description="Rata rezolvare internă fără escalare"
            value={100 - escalationRate}
            target={80}
            unit="%"
          />
          <DirectionCard
            label="Dependență Claude"
            description="Cât din învățare vine de la Claude"
            value={pctClaude}
            target={30}
            inverted
            unit="%"
          />
          <DirectionCard
            label="Experiență clienți"
            description="Învățare din interacțiuni reale"
            value={pctClients}
            target={40}
            unit="%"
          />
        </div>
      </section>

      {/* ═══ TABEL AGENȚI ACTIVI ═══ */}
      {agents.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">Agenți activi această săptămână</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="text-left px-4 py-2">Agent</th>
                  <th className="text-left px-4 py-2">Nivel</th>
                  <th className="text-right px-4 py-2">Tasks</th>
                  <th className="text-right px-4 py-2">Done</th>
                  <th className="text-right px-4 py-2">Blocat</th>
                  <th className="text-right px-4 py-2">Rata</th>
                  <th className="text-right px-4 py-2">Învățat</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a: any) => (
                  <tr key={a.role} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-4 py-2">
                      <span className="font-medium text-slate-800">{a.name}</span>
                      {a.isManager && <span className="ml-1 text-[9px] text-indigo-500 font-bold">MGR</span>}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-400">{a.level}</td>
                    <td className="px-4 py-2 text-right font-mono">{a.tasks}</td>
                    <td className="px-4 py-2 text-right font-mono text-emerald-600">{a.completed}</td>
                    <td className="px-4 py-2 text-right font-mono text-red-500">{a.blocked || "—"}</td>
                    <td className="px-4 py-2 text-right">
                      {a.completionRate !== null ? (
                        <span className={`font-bold ${a.completionRate >= 70 ? "text-emerald-600" : a.completionRate >= 40 ? "text-amber-600" : "text-red-600"}`}>
                          {a.completionRate}%
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-indigo-600">{a.learned || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

// ─── Componente helper ─────────────────────────────────────────────────────

function StatCard({ label, value, subtitle, accent }: { label: string; value: string | number; subtitle?: string; accent?: string }) {
  const colors: Record<string, string> = {
    emerald: "text-emerald-600",
    red: "text-red-600",
    amber: "text-amber-600",
    indigo: "text-indigo-600",
    violet: "text-violet-600",
    slate: "text-slate-600",
  }
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ? colors[accent] || "text-slate-800" : "text-slate-800"}`}>{value}</p>
      {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}

function DirectionCard({ label, description, value, target, inverted, unit }: {
  label: string; description: string; value: number; target: number; inverted?: boolean; unit: string
}) {
  const isGood = inverted ? value <= target : value >= target
  return (
    <div className={`rounded-xl border p-4 ${isGood ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
      <p className="text-xs font-bold text-slate-700">{label}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">{description}</p>
      <div className="flex items-end justify-between mt-3">
        <p className={`text-3xl font-bold ${isGood ? "text-emerald-600" : "text-amber-600"}`}>{value}{unit}</p>
        <p className="text-[10px] text-slate-400">țintă: {target}{unit}</p>
      </div>
    </div>
  )
}
