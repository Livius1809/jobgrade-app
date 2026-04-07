import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"

export const metadata = { title: "Evoluție agenți — Owner Dashboard" }

interface AgentReport {
  agentRole: string
  displayName: string
  level: string
  activityMode: string
  kbEntries: number
  embeddingCoverage: number
  cyclesLast7d: number
  tasksAssigned: number
  tasksCompleted: number
  escalationsOpen: number
  avgPerformance: number | null
  lastActive: string | null
  depth?: number
}

export default async function AgentsReportPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "OWNER") redirect("/portal")

  const p = prisma as any
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  let agents: AgentReport[] = []
  try {
    const definitions = await p.agentDefinition.findMany({
      where: { isActive: true },
      orderBy: { agentRole: "asc" },
      select: { agentRole: true, displayName: true, level: true, activityMode: true },
    })

    // Hierarchy
    const hierarchy = await p.$queryRaw`
      SELECT "childRole", "parentRole" FROM agent_relationships
      WHERE "relationType" = 'REPORTS_TO'
    ` as { childRole: string; parentRole: string }[]

    // Batch queries for all metrics
    const [kbStats, cycleStats, taskStats, escalationStats, metricStats] = await Promise.all([
      // KB entries + embeddings per agent
      p.$queryRaw`
        SELECT "agentRole", count(*) as total, count(embedding) as embedded
        FROM kb_entries WHERE status = 'PERMANENT'::"KBStatus"
        GROUP BY "agentRole"
      ` as Promise<{ agentRole: string; total: bigint; embedded: bigint }[]>,

      // Cycles last 7 days per manager
      p.$queryRaw`
        SELECT "managerRole" as role, count(*) as cycles
        FROM cycle_logs WHERE "createdAt" > ${sevenDaysAgo}
        GROUP BY "managerRole"
      ` as Promise<{ role: string; cycles: bigint }[]>,

      // Tasks per agent
      p.$queryRaw`
        SELECT "assignedTo" as role,
               count(*) as total,
               count(*) FILTER (WHERE status = 'COMPLETED') as completed
        FROM agent_tasks
        GROUP BY "assignedTo"
      ` as Promise<{ role: string; total: bigint; completed: bigint }[]>,

      // Open escalations per agent
      p.$queryRaw`
        SELECT "aboutRole" as role, count(*) as open
        FROM escalations WHERE status = 'OPEN'
        GROUP BY "aboutRole"
      ` as Promise<{ role: string; open: bigint }[]>,

      // Latest performance score per agent
      p.agentMetric.findMany({
        orderBy: { periodEnd: "desc" },
        distinct: ["agentRole"],
        select: { agentRole: true, performanceScore: true, periodEnd: true },
      }),
    ])

    // Index results
    const kbMap = new Map(kbStats.map(r => [r.agentRole, { total: Number(r.total), embedded: Number(r.embedded) }]))
    const cycleMap = new Map(cycleStats.map(r => [r.role, Number(r.cycles)]))
    const taskMap = new Map(taskStats.map(r => [r.role, { total: Number(r.total), completed: Number(r.completed) }]))
    const escalationMap = new Map(escalationStats.map(r => [r.role, Number(r.open)]))
    const metricMap = new Map<string, { score: number; date: string }>(metricStats.map((r: any) => [r.agentRole, { score: r.performanceScore, date: r.periodEnd }]))

    agents = definitions.map((d: any) => {
      const kb = kbMap.get(d.agentRole) ?? { total: 0, embedded: 0 }
      const tasks = taskMap.get(d.agentRole) ?? { total: 0, completed: 0 }
      const metric = metricMap.get(d.agentRole)

      return {
        agentRole: d.agentRole,
        displayName: d.displayName ?? d.agentRole,
        level: d.level,
        activityMode: d.activityMode,
        kbEntries: kb.total,
        embeddingCoverage: kb.total > 0 ? kb.embedded / kb.total : 0,
        cyclesLast7d: cycleMap.get(d.agentRole) ?? 0,
        tasksAssigned: tasks.total,
        tasksCompleted: tasks.completed,
        escalationsOpen: escalationMap.get(d.agentRole) ?? 0,
        avgPerformance: metric?.score ?? null,
        lastActive: metric?.date ? new Date(metric.date).toLocaleDateString("ro-RO") : null,
      }
    })
    // Build hierarchy tree with depth levels
    const parentOf = new Map<string, string>()
    const childrenOf = new Map<string, string[]>()
    for (const rel of hierarchy) {
      parentOf.set(rel.childRole, rel.parentRole)
      if (!childrenOf.has(rel.parentRole)) childrenOf.set(rel.parentRole, [])
      childrenOf.get(rel.parentRole)!.push(rel.childRole)
    }

    // Compute depth for each agent
    function getDepth(role: string): number {
      let depth = 0
      let current = role
      const seen = new Set<string>()
      while (parentOf.has(current) && !seen.has(current)) {
        seen.add(current)
        current = parentOf.get(current)!
        depth++
      }
      return depth
    }

    // Sort agents by tree order (DFS)
    function treeOrder(role: string, result: string[]) {
      result.push(role)
      const children = childrenOf.get(role) ?? []
      children.sort().forEach(c => treeOrder(c, result))
    }

    const roots = agents
      .map(a => a.agentRole)
      .filter(r => !parentOf.has(r))
    const ordered: string[] = []
    roots.sort().forEach(r => treeOrder(r, ordered))

    // Re-sort agents by tree order and add depth
    const agentMap = new Map(agents.map(a => [a.agentRole, a]))
    agents = ordered
      .filter(r => agentMap.has(r))
      .map(r => ({ ...agentMap.get(r)!, depth: getDepth(r) }))

  } catch (e: any) {
    console.error("[AGENTS REPORT]", e.message)
  }

  const modeColors: Record<string, string> = {
    PROACTIVE_CYCLIC: "bg-emerald-100 text-emerald-700",
    HYBRID: "bg-blue-100 text-blue-700",
    REACTIVE_TRIGGERED: "bg-amber-100 text-amber-700",
    PAUSED_KNOWN_GAP: "bg-red-100 text-red-600",
    DORMANT_UNTIL_DELEGATED: "bg-slate-50 text-slate-400",
  }

  const levelColors: Record<string, string> = {
    STRATEGIC: "text-indigo-600",
    TACTICAL: "text-amber-600",
    OPERATIONAL: "text-slate-500",
  }

  // Summary stats
  const totalKB = agents.reduce((s, a) => s + a.kbEntries, 0)
  const totalCycles = agents.reduce((s, a) => s + a.cyclesLast7d, 0)
  const activeAgents = agents.filter(a => a.cyclesLast7d > 0 || a.tasksCompleted > 0).length

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/owner" className="text-sm text-indigo hover:underline">← Dashboard</Link>
        <h1 className="text-xl font-bold text-foreground">Evoluție agenți</h1>
        <span className="text-xs text-text-secondary">{agents.length} agenți</span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard label="Agenți activi (7 zile)" value={`${activeAgents}/${agents.length}`} />
        <SummaryCard label="KB total" value={totalKB.toLocaleString()} />
        <SummaryCard label="Cicluri (7 zile)" value={totalCycles.toString()} />
        <SummaryCard label="Escaladări deschise" value={agents.reduce((s, a) => s + a.escalationsOpen, 0).toString()} accent={agents.some(a => a.escalationsOpen > 0)} />
      </div>

      {agents.length === 0 ? (
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="text-sm text-text-secondary">Nu s-au putut încărca datele agenților.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/50">
                <th className="text-left px-3 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Agent</th>
                <th className="text-center px-2 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nivel</th>
                <th className="text-center px-2 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mod</th>
                <th className="text-center px-2 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">KB</th>
                <th className="text-center px-2 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Emb%</th>
                <th className="text-center px-2 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cicluri 7d</th>
                <th className="text-center px-2 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tasks</th>
                <th className="text-center px-2 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Esc.</th>
                <th className="text-center px-2 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Perf.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {agents.map((a) => (
                <tr key={a.agentRole} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center" style={{ paddingLeft: `${(a.depth ?? 0) * 16}px` }}>
                      {(a.depth ?? 0) > 0 && <span className="text-slate-300 mr-1.5 text-[10px]">└</span>}
                      <span className="font-mono font-bold text-indigo text-xs">{a.agentRole}</span>
                      <span className="text-slate-400 ml-1.5 text-[10px]">{a.displayName}</span>
                      <span className="text-slate-300 ml-1 text-[9px]">N{a.depth ?? 0}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <span className={`text-[10px] font-bold ${levelColors[a.level] ?? "text-slate-500"}`}>{a.level}</span>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${modeColors[a.activityMode] ?? "bg-slate-100 text-slate-500"}`}>
                      {a.activityMode.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center text-xs font-mono text-slate-600">{a.kbEntries}</td>
                  <td className="px-2 py-2 text-center">
                    <span className={`text-xs font-mono ${a.embeddingCoverage >= 0.9 ? "text-emerald-600" : a.embeddingCoverage >= 0.5 ? "text-amber-600" : "text-red-500"}`}>
                      {(a.embeddingCoverage * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center text-xs font-mono text-slate-600">{a.cyclesLast7d || "—"}</td>
                  <td className="px-2 py-2 text-center text-xs font-mono">
                    {a.tasksAssigned > 0 ? (
                      <span className={a.tasksCompleted === a.tasksAssigned ? "text-emerald-600" : "text-slate-600"}>
                        {a.tasksCompleted}/{a.tasksAssigned}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {a.escalationsOpen > 0 ? (
                      <span className="text-xs font-bold text-red-500">{a.escalationsOpen}</span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-2 py-2 text-center">
                    {a.avgPerformance !== null ? (
                      <span className={`text-xs font-bold ${
                        a.avgPerformance >= 70 ? "text-emerald-600" :
                        a.avgPerformance >= 40 ? "text-amber-600" : "text-red-600"
                      }`}>{a.avgPerformance}</span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-coral/30 bg-coral/5" : "border-border bg-white"}`}>
      <div className={`text-xl font-bold ${accent ? "text-coral" : "text-foreground"}`}>{value}</div>
      <div className="text-[10px] text-text-secondary mt-1 uppercase tracking-wider">{label}</div>
    </div>
  )
}
