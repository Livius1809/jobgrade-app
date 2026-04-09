import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getBudgetStatus } from "@/lib/ai/budget-cap"
import { getDegradedModeStatus, getFailureLog } from "@/lib/ai/degraded-mode"

export const metadata = { title: "Costuri platformă — Owner Dashboard" }

export default async function CostsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "OWNER") redirect("/portal")

  const budget = getBudgetStatus()
  const degraded = getDegradedModeStatus()
  const recentFailures = getFailureLog(10)

  const healthLabel = degraded.health.available ? "Available" : "Down"
  const healthColor = degraded.health.available
    ? "bg-emerald-100 text-emerald-700"
    : "bg-red-100 text-red-700"

  const circuitLabel = degraded.circuitOpen ? "OPEN" : "CLOSED"
  const circuitColor = degraded.circuitOpen
    ? "bg-red-100 text-red-700"
    : "bg-emerald-100 text-emerald-700"

  return (
    <>
      {/* Auto-refresh every 5 minutes */}
      <meta httpEquiv="refresh" content="300" />

      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/owner" className="text-sm text-indigo hover:underline">
            &larr; Dashboard
          </Link>
          <h1 className="text-xl font-bold text-foreground">Costuri platformă</h1>
          <span className="text-xs text-text-secondary">
            {new Date().toLocaleDateString("ro-RO", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        {/* ── Platform Totals ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cost azi</p>
            <p className="text-2xl font-bold text-slate-800">
              ${budget.totalPlatformCostToday.toFixed(4)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Cost luna aceasta</p>
            <p className="text-2xl font-bold text-slate-800">
              ${budget.totalPlatformCostMonth.toFixed(4)}
            </p>
          </div>
        </div>

        {/* ── Claude API Status ────────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-3">Claude API Status</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500 mb-1">Health</p>
              <span className={`text-xs font-bold px-2 py-1 rounded ${healthColor}`}>
                {healthLabel}
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Circuit Breaker</p>
              <span className={`text-xs font-bold px-2 py-1 rounded ${circuitColor}`}>
                {circuitLabel}
              </span>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Cache size</p>
              <p className="text-sm font-semibold text-slate-700">{degraded.commercialCacheSize}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Failures (5 min)</p>
              <p className={`text-sm font-semibold ${degraded.recentFailures > 0 ? "text-red-600" : "text-slate-700"}`}>
                {degraded.recentFailures}
              </p>
            </div>
          </div>
          {degraded.circuitOpenedAt && (
            <p className="text-xs text-red-500 mt-2">
              Circuit deschis la: {degraded.circuitOpenedAt.toISOString()}
            </p>
          )}
          {degraded.health.consecutiveFailures > 0 && (
            <p className="text-xs text-amber-600 mt-1">
              Failures consecutive: {degraded.health.consecutiveFailures}
            </p>
          )}
        </div>

        {/* ── Top Consumers Today ──────────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-3">Top consumatori azi</h2>
          {budget.topConsumersToday.length === 0 ? (
            <p className="text-sm text-slate-400">Niciun consum inregistrat azi.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                    <th className="pb-2 font-medium">Identificator</th>
                    <th className="pb-2 font-medium text-right">Cost azi (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {budget.topConsumersToday.map((c) => (
                    <tr key={c.identifier} className="border-b border-slate-50">
                      <td className="py-2 text-slate-700 font-mono text-xs">{c.identifier}</td>
                      <td className="py-2 text-right text-slate-700">${c.dailyCost.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Users Above 50% Budget ──────────────────────────────────── */}
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-3">Utilizatori peste 50% buget</h2>
          {budget.usersAbove50Percent.length === 0 ? (
            <p className="text-sm text-slate-400">Niciun utilizator peste pragul de 50%.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                    <th className="pb-2 font-medium">Identificator</th>
                    <th className="pb-2 font-medium">Tier</th>
                    <th className="pb-2 font-medium text-right">Zilnic</th>
                    <th className="pb-2 font-medium text-right">Limita zilnica</th>
                    <th className="pb-2 font-medium text-right">% zilnic</th>
                    <th className="pb-2 font-medium text-right">Lunar</th>
                    <th className="pb-2 font-medium text-right">Limita lunara</th>
                    <th className="pb-2 font-medium text-right">% lunar</th>
                  </tr>
                </thead>
                <tbody>
                  {budget.usersAbove50Percent.map((u) => (
                    <tr key={u.identifier} className="border-b border-slate-50">
                      <td className="py-2 text-slate-700 font-mono text-xs">{u.identifier}</td>
                      <td className="py-2">
                        <span className="text-xs bg-slate-100 text-slate-600 rounded px-2 py-0.5">
                          {u.tier}
                        </span>
                      </td>
                      <td className="py-2 text-right text-slate-700">${u.dailyCost.toFixed(4)}</td>
                      <td className="py-2 text-right text-slate-500">${u.dailyLimit.toFixed(2)}</td>
                      <td className="py-2 text-right">
                        <span className={`font-semibold ${u.percentDaily >= 90 ? "text-red-600" : u.percentDaily >= 70 ? "text-amber-600" : "text-slate-700"}`}>
                          {u.percentDaily.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2 text-right text-slate-700">${u.monthlyCost.toFixed(4)}</td>
                      <td className="py-2 text-right text-slate-500">${u.monthlyLimit.toFixed(2)}</td>
                      <td className="py-2 text-right">
                        <span className={`font-semibold ${u.percentMonthly >= 90 ? "text-red-600" : u.percentMonthly >= 70 ? "text-amber-600" : "text-slate-700"}`}>
                          {u.percentMonthly.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Recent Failures ─────────────────────────────────────────── */}
        {recentFailures.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50/50 p-5">
            <h2 className="text-sm font-bold text-red-800 mb-3">Erori recente Claude API</h2>
            <div className="space-y-2">
              {recentFailures.map((f, i) => (
                <div key={i} className="flex items-start gap-3 text-xs">
                  <span className="text-slate-400 whitespace-nowrap font-mono">
                    {f.timestamp.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                  <span className="bg-red-100 text-red-700 rounded px-1.5 py-0.5 font-bold whitespace-nowrap">
                    {f.agentRole}
                  </span>
                  <span className="text-slate-600">{f.errorType}: {f.errorMessage}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-slate-400 text-center">
          Pagina se actualizeaza automat la fiecare 5 minute.
        </p>
      </div>
    </>
  )
}
