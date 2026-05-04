import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Metadata } from "next"

export const metadata: Metadata = { title: "Satisfactie clienti — Owner Dashboard" }
export const dynamic = "force-dynamic"

async function fetchAnalytics(cookie: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000"
  const res = await fetch(`${base}/api/v1/support/analytics`, {
    headers: { cookie },
    cache: "no-store",
  })
  if (!res.ok) return null
  return res.json()
}

export default async function SupportAnalyticsPage() {
  const session = await auth()
  if (!session?.user || !["OWNER", "SUPER_ADMIN"].includes(session.user.role)) redirect("/login")

  // Forward cookie for auth
  const { cookies } = await import("next/headers")
  const cookieStore = await cookies()
  const cookie = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join("; ")
  const data = await fetchAnalytics(cookie)

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto py-8 px-4">
        <h1 className="text-xl font-bold mb-4">Satisfactie clienti</h1>
        <p className="text-sm text-slate-500">Nu s-au putut incarca datele.</p>
      </div>
    )
  }

  const stars = (val: number) => {
    const full = Math.floor(val)
    return "★".repeat(full) + "☆".repeat(5 - full)
  }

  const barWidth = (val: number, max: number) => max > 0 ? `${Math.round(val / max * 100)}%` : "0%"
  const maxDist = Math.max(...(data.ratingDistribution as number[]), 1)

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/owner" className="text-xs text-slate-400 hover:text-slate-600">← Dashboard</Link>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Satisfactie clienti</h1>
          <p className="text-sm text-slate-500">{data.totalTickets} tickete total, {data.totalRated} evaluate</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-extrabold text-slate-900">{data.avgRating}/5</div>
          <div className="text-amber-400 text-lg">{stars(data.avgRating)}</div>
          <p className="text-xs text-slate-400">{data.satisfactionRate}% satisfacuti (4+)</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <KpiCard label="Media 7 zile" value={data.trend.avg7d ?? "—"} sub={`${data.trend.count7d} evaluate`} color="indigo" />
        <KpiCard label="Media 30 zile" value={data.trend.avg30d ?? "—"} sub={`${data.trend.count30d} evaluate`} color="violet" />
        <KpiCard label="Timp raspuns mediu" value={data.avgResponseHours ? `${data.avgResponseHours}h` : "—"} sub="ore" color="emerald" />
        <KpiCard label="Escaladari" value={data.funnel.escalated} sub="tickete" color="red" />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Distribuție rating-uri */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Distributie rating-uri</h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map(r => (
              <div key={r} className="flex items-center gap-2">
                <span className="text-xs text-slate-500 w-4">{r}</span>
                <span className="text-amber-400 text-xs">★</span>
                <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${r >= 4 ? "bg-emerald-400" : r === 3 ? "bg-amber-400" : "bg-red-400"}`}
                    style={{ width: barWidth(data.ratingDistribution[r - 1], maxDist) }}
                  />
                </div>
                <span className="text-xs text-slate-500 w-8 text-right">{data.ratingDistribution[r - 1]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Medii per criteriu */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Criterii de satisfactie</h3>
          <div className="space-y-4">
            <CriterionBar label="Rezultat corespunde nevoii" value={data.criteriaAvg.rezultat} />
            <CriterionBar label="Timp de raspuns" value={data.criteriaAvg.timpRaspuns} />
            <CriterionBar label="Calitatea comunicarii" value={data.criteriaAvg.comunicare} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Per flow */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Satisfactie per categorie</h3>
          {data.perFlow.length === 0 ? (
            <p className="text-xs text-slate-400">Nu sunt date suficiente.</p>
          ) : (
            <div className="space-y-2">
              {data.perFlow.map((f: { flow: string; count: number; avg: number }) => (
                <div key={f.flow} className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-xs text-slate-600 capitalize">{f.flow}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{f.count} eval.</span>
                    <span className={`text-xs font-bold ${f.avg >= 4 ? "text-emerald-600" : f.avg >= 3 ? "text-amber-600" : "text-red-600"}`}>
                      {f.avg}/5
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Per agent */}
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Performanta per agent</h3>
          {data.perAgent.length === 0 ? (
            <p className="text-xs text-slate-400">Nu sunt date suficiente.</p>
          ) : (
            <div className="space-y-2">
              {data.perAgent.map((a: { agent: string; count: number; avg: number }) => (
                <div key={a.agent} className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-xs text-slate-600 font-mono">{a.agent}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{a.count} eval.</span>
                    <span className={`text-xs font-bold ${a.avg >= 4 ? "text-emerald-600" : a.avg >= 3 ? "text-amber-600" : "text-red-600"}`}>
                      {a.avg}/5
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Funnel statusuri */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 mb-6">
        <h3 className="text-sm font-bold text-slate-700 mb-3">Funnel tickete</h3>
        <div className="flex items-end gap-2 h-24">
          {[
            { label: "Noi", count: data.funnel.new, color: "bg-blue-400" },
            { label: "Clarif.", count: data.funnel.refining, color: "bg-amber-400" },
            { label: "Rutat", count: data.funnel.routed, color: "bg-indigo-400" },
            { label: "In lucru", count: data.funnel.inProgress, color: "bg-violet-400" },
            { label: "Rezolvat", count: data.funnel.resolved, color: "bg-emerald-300" },
            { label: "Raspuns", count: data.funnel.responded, color: "bg-emerald-500" },
            { label: "Inchis", count: data.funnel.closed, color: "bg-slate-400" },
            { label: "Escaladat", count: data.funnel.escalated, color: "bg-red-400" },
          ].map(step => {
            const maxFunnel = Math.max(data.totalTickets, 1)
            return (
              <div key={step.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold text-slate-600">{step.count}</span>
                <div className={`w-full ${step.color} rounded-t`} style={{ height: `${Math.max(4, step.count / maxFunnel * 80)}px` }} />
                <span className="text-[9px] text-slate-400">{step.label}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tickete cu rating scăzut */}
      {data.lowRated.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h3 className="text-sm font-bold text-red-700 mb-3">Atentie: tickete cu rating scazut (1-2)</h3>
          <div className="space-y-2">
            {data.lowRated.map((t: { id: string; subject: string; clientRating: number; clientFeedback: string | null; routedToAgent: string | null; createdAt: string }) => (
              <div key={t.id} className="flex items-start justify-between py-1 border-b border-red-100">
                <div>
                  <p className="text-xs font-medium text-red-800">{t.subject}</p>
                  <p className="text-[10px] text-red-500">
                    {new Date(t.createdAt).toLocaleDateString("ro-RO")} · Agent: {t.routedToAgent || "—"}
                  </p>
                  {t.clientFeedback && <p className="text-[10px] text-red-600 mt-0.5">{t.clientFeedback}</p>}
                </div>
                <span className="text-amber-400 text-sm shrink-0">{"★".repeat(t.clientRating)}{"☆".repeat(5 - t.clientRating)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  const colorMap: Record<string, string> = {
    indigo: "border-indigo-200 bg-indigo-50",
    violet: "border-violet-200 bg-violet-50",
    emerald: "border-emerald-200 bg-emerald-50",
    red: "border-red-200 bg-red-50",
  }
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color] || "border-slate-200 bg-white"}`}>
      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wide">{label}</p>
      <p className="text-2xl font-extrabold text-slate-900 mt-1">{value}</p>
      <p className="text-[10px] text-slate-400">{sub}</p>
    </div>
  )
}

function CriterionBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value / 5 * 100)
  const color = value >= 4 ? "bg-emerald-400" : value >= 3 ? "bg-amber-400" : "bg-red-400"
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-xs text-slate-600">{label}</span>
        <span className="text-xs font-bold text-slate-700">{value}/5</span>
      </div>
      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
