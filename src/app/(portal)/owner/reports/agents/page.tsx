import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"

export const metadata = { title: "Evoluție agenți — Owner Dashboard" }

export default async function AgentsReportPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "OWNER") redirect("/portal")

  const p = prisma as any

  // Fetch all agents with their status
  let agents: any[] = []
  try {
    agents = await p.agentDefinition.findMany({
      where: { isActive: true },
      orderBy: { agentRole: "asc" },
      select: {
        id: true,
        agentRole: true,
        displayName: true,
        level: true,
        activityMode: true,
      },
    })
  } catch { /* schema mismatch — graceful */ }

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
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Nume</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Nivel</th>
                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Mod activitate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {agents.map((agent: any) => (
                <tr key={agent.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="font-mono font-bold text-indigo text-xs">{agent.agentRole}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{agent.displayName ?? "—"}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`text-xs font-bold ${levelColors[agent.level] ?? "text-slate-500"}`}>{agent.level}</span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${modeColors[agent.activityMode] ?? "bg-slate-100 text-slate-500"}`}>
                      {agent.activityMode}
                    </span>
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
