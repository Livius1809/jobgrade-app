import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import prisma from "@/lib/prisma"

export const metadata = { title: "Evoluție agenți — Owner Dashboard" }

export default async function AgentsReportPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "OWNER") redirect("/portal")

  const p = prisma as any

  // Fetch all agents with their status
  let agents: any[] = []
  try {
    agents = await p.agent.findMany({
      orderBy: { role: "asc" },
      select: {
        id: true,
        role: true,
        name: true,
        department: true,
        activityMode: true,
        consciousnessLevel: true,
        performanceScore: true,
        lastActiveAt: true,
        _count: { select: { kbEntries: true, tasks: true } },
      },
    })
  } catch { /* schema mismatch — graceful */ }

  const modeColors: Record<string, string> = {
    AUTONOMOUS: "bg-emerald-100 text-emerald-700",
    HYBRID: "bg-blue-100 text-blue-700",
    REACTIVE_TRIGGERED: "bg-amber-100 text-amber-700",
    SUPERVISED: "bg-slate-100 text-slate-600",
    DORMANT: "bg-slate-50 text-slate-400",
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/owner" className="text-sm text-indigo hover:underline">← Dashboard</Link>
        <h1 className="text-xl font-bold text-foreground">Evoluție agenți</h1>
        <span className="text-xs text-text-secondary">{agents.length} agenți</span>
      </div>

      {agents.length === 0 ? (
        <div className="rounded-xl border border-border bg-white p-5">
          <p className="text-sm text-text-secondary">Nu s-au putut încărca datele agenților.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/50">
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Agent</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Departament</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Mod</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Nivel</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Perf.</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">KB</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Tasks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {agents.map((agent: any) => (
                <tr key={agent.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="font-mono font-bold text-indigo text-xs">{agent.role}</span>
                    {agent.name && <span className="text-slate-500 ml-2 text-xs">{agent.name}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{agent.department ?? "—"}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${modeColors[agent.activityMode] ?? "bg-slate-100 text-slate-500"}`}>
                      {agent.activityMode}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center text-xs font-mono text-slate-600">{agent.consciousnessLevel ?? "—"}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`text-xs font-bold ${
                      (agent.performanceScore ?? 0) >= 70 ? "text-emerald-600" :
                      (agent.performanceScore ?? 0) >= 40 ? "text-amber-600" :
                      "text-red-600"
                    }`}>{agent.performanceScore ?? "—"}</span>
                  </td>
                  <td className="px-4 py-2.5 text-center text-xs font-mono text-slate-500">{agent._count?.kbEntries ?? "—"}</td>
                  <td className="px-4 py-2.5 text-center text-xs font-mono text-slate-500">{agent._count?.tasks ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
