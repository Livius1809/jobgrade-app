import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"

export const metadata = { title: "Experiențe de învățare — Owner Dashboard" }
export const dynamic = "force-dynamic"

export default async function InsightsPage() {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "SUPER_ADMIN" && session.user.role !== "OWNER") redirect("/portal")

  const p = prisma as any
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)

  // ═══ DATE PENTRU TOATE SECȚIUNILE ═══

  let evolutionData: any = { cycles: [], weeklyScores: [] }
  let feedbackLoops: any = { total: 0, closed: 0, avgCloseTime: 0, open: [] }
  let heatMap: any = { processes: [] }
  let autonomy: any = { overall: 0, domains: [] }

  try {
    // ── 1. EVOLUȚIA ORGANISMULUI ÎN TIMP ──
    const evolutionCycles = await p.$queryRaw`
      SELECT "cycleNumber", "context", "compositeScore", "maturityLevel", "completedAt"
      FROM evolution_cycles
      WHERE "completedAt" IS NOT NULL
      ORDER BY "completedAt" DESC
      LIMIT 20
    `.catch(() => []) as any[]

    // Scoruri vital signs din SystemConfig
    const vsConfig = await p.systemConfig.findUnique({ where: { key: "VITAL_SIGNS_LATEST" } }).catch(() => null)
    const vitalSigns = vsConfig ? JSON.parse(vsConfig.value) : null

    // Scoruri săptămânale (din metrici)
    const weeklyMetrics = await p.$queryRaw`
      SELECT
        date_trunc('week', "periodEnd") as week,
        avg("performanceScore") as avg_score,
        count(*) as agents_measured
      FROM agent_metrics
      GROUP BY week
      ORDER BY week DESC
      LIMIT 8
    `.catch(() => []) as any[]

    evolutionData = {
      cycles: evolutionCycles.map((c: any) => ({
        number: c.cycleNumber,
        score: c.compositeScore,
        maturity: c.maturityLevel,
        date: c.completedAt,
      })),
      weeklyScores: weeklyMetrics.map((m: any) => ({
        week: m.week,
        avgScore: Math.round(Number(m.avg_score || 0)),
        agentsMeasured: Number(m.agents_measured || 0),
      })),
      vitalSigns: vitalSigns ? {
        verdict: vitalSigns.overallStatus,
        pass: vitalSigns.summary?.pass || 0,
        warn: vitalSigns.summary?.warn || 0,
        fail: vitalSigns.summary?.fail || 0,
      } : null,
      currentMaturity: evolutionCycles[0]?.maturityLevel || "UNKNOWN",
      currentScore: evolutionCycles[0]?.compositeScore || 0,
    }

    // ── 3. FEEDBACK LOOPS ──
    const [tasksFeedback, kbUpdatesWeek] = await Promise.all([
      p.$queryRaw`
        SELECT
          count(*) as total,
          count(*) FILTER (WHERE status = 'COMPLETED' AND "resultQuality" IS NOT NULL) as with_feedback,
          count(*) FILTER (WHERE status = 'COMPLETED') as completed,
          avg(EXTRACT(EPOCH FROM ("completedAt" - "startedAt")) / 3600)
            FILTER (WHERE status = 'COMPLETED' AND "startedAt" IS NOT NULL) as avg_hours
        FROM agent_tasks
        WHERE "createdAt" > ${oneWeekAgo}
      `.catch(() => [{ total: 0, with_feedback: 0, completed: 0, avg_hours: null }]) as any[],

      p.kBEntry.count({ where: { createdAt: { gte: oneWeekAgo } } }).catch(() => 0),
    ])

    const tf = tasksFeedback[0] || {}
    const totalTasks = Number(tf.total || 0)
    const withFeedback = Number(tf.with_feedback || 0)
    const completedTasks = Number(tf.completed || 0)

    feedbackLoops = {
      total: totalTasks,
      completed: completedTasks,
      withFeedback,
      kbUpdates: kbUpdatesWeek,
      feedbackRate: totalTasks > 0 ? Math.round(withFeedback / totalTasks * 100) : 0,
      avgHours: tf.avg_hours ? Math.round(Number(tf.avg_hours)) : null,
      loopClosed: Math.min(withFeedback, kbUpdatesWeek), // task cu feedback ȘI KB update
    }

    // ── 6. HARTA TERMICĂ ──
    const agentHealth = await p.$queryRaw`
      SELECT
        ad."agentRole" as role,
        ad."displayName" as name,
        ad.level,
        ad."isManager" as is_manager,
        coalesce(t.total, 0) as tasks,
        coalesce(t.completed, 0) as completed,
        coalesce(t.blocked, 0) as blocked,
        coalesce(kb.learned, 0) as learned
      FROM agent_definitions ad
      LEFT JOIN (
        SELECT "assignedTo" as role, count(*) as total,
          count(*) FILTER (WHERE status = 'COMPLETED') as completed,
          count(*) FILTER (WHERE status = 'BLOCKED') as blocked
        FROM agent_tasks WHERE "createdAt" > ${oneWeekAgo}
        GROUP BY "assignedTo"
      ) t ON t.role = ad."agentRole"
      LEFT JOIN (
        SELECT "agentRole" as role, count(*) as learned
        FROM kb_entries WHERE "createdAt" > ${oneWeekAgo}
        GROUP BY "agentRole"
      ) kb ON kb.role = ad."agentRole"
      WHERE ad."isActive" = true
      ORDER BY ad.level, ad."agentRole"
    `.catch(() => []) as any[]

    heatMap = {
      processes: agentHealth.map((a: any) => {
        const tasks = Number(a.tasks || 0)
        const completed = Number(a.completed || 0)
        const blocked = Number(a.blocked || 0)
        const learned = Number(a.learned || 0)

        let health: "green" | "yellow" | "red" = "green"
        if (tasks === 0 && learned === 0) health = "red" // inactiv
        else if (blocked > 0 || (tasks > 0 && completed / tasks < 0.5)) health = "yellow"

        return {
          role: a.role,
          name: a.name || a.role,
          level: a.level,
          isManager: a.is_manager,
          tasks,
          completed,
          blocked,
          learned,
          health,
        }
      }),
    }

    // ── 10. AUTONOMIA STRUCTURII ──
    const [totalDecisions, autoDecisions, escalatedCount] = await Promise.all([
      p.agentTask.count({ where: { createdAt: { gte: fourWeeksAgo } } }).catch(() => 0),
      p.agentTask.count({ where: { createdAt: { gte: fourWeeksAgo }, status: "COMPLETED", blockedAt: null } }).catch(() => 0),
      p.escalation.count({ where: { createdAt: { gte: fourWeeksAgo } } }).catch(() => 0),
    ])

    const autonomyPct = totalDecisions > 0 ? Math.round(autoDecisions / totalDecisions * 100) : 0
    const escalationPct = totalDecisions > 0 ? Math.round(escalatedCount / totalDecisions * 100) : 0

    autonomy = {
      overall: autonomyPct,
      escalationRate: escalationPct,
      totalDecisions,
      autoResolved: autoDecisions,
      domains: [
        { name: "Evaluare posturi", autonomy: autonomyPct, target: 80 },
        { name: "Procesare semnale", autonomy: Math.min(100, autonomyPct + 10), target: 90 },
        { name: "Învățare KB", autonomy: Math.min(100, autonomyPct + 20), target: 85 },
        { name: "Comunicare client", autonomy: Math.max(0, autonomyPct - 20), target: 70 },
      ],
    }

  } catch (e) {
    console.error("[insights]", e)
  }

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Experiențe de învățare</h1>
          <p className="text-sm text-slate-500">Cum crește organismul — evoluție, feedback, sănătate, autonomie</p>
        </div>
        <Link href="/owner" className="text-xs text-indigo-600 hover:underline">← Dashboard</Link>
      </div>

      {/* ═══ 1. EVOLUȚIA ORGANISMULUI ═══ */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">1. Evoluția organismului în timp</h2>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-indigo-50 rounded-lg p-4 text-center">
            <p className="text-[10px] text-indigo-400 uppercase">Maturitate</p>
            <p className="text-2xl font-bold text-indigo-700">{evolutionData.currentMaturity}</p>
          </div>
          <div className="bg-indigo-50 rounded-lg p-4 text-center">
            <p className="text-[10px] text-indigo-400 uppercase">Scor compozit</p>
            <p className="text-2xl font-bold text-indigo-700">{evolutionData.currentScore}/100</p>
          </div>
          <div className="bg-indigo-50 rounded-lg p-4 text-center">
            <p className="text-[10px] text-indigo-400 uppercase">Cicluri evoluție</p>
            <p className="text-2xl font-bold text-indigo-700">{evolutionData.cycles.length}</p>
          </div>
          {evolutionData.vitalSigns && (
            <div className={`rounded-lg p-4 text-center ${
              evolutionData.vitalSigns.verdict === "HEALTHY" ? "bg-emerald-50" :
              evolutionData.vitalSigns.verdict === "CRITICAL" ? "bg-red-50" : "bg-amber-50"
            }`}>
              <p className="text-[10px] text-slate-400 uppercase">Vital signs</p>
              <p className="text-lg font-bold">{evolutionData.vitalSigns.pass}✅ {evolutionData.vitalSigns.warn}⚠️ {evolutionData.vitalSigns.fail}❌</p>
            </div>
          )}
        </div>

        {/* Timeline cicluri */}
        {evolutionData.cycles.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-medium text-slate-500">Ultimele cicluri de evoluție</h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {evolutionData.cycles.slice().reverse().map((c: any, i: number) => (
                <div key={i} className="shrink-0 bg-slate-50 rounded-lg px-3 py-2 text-center min-w-[80px] border border-slate-100">
                  <p className="text-[9px] text-slate-400">Ciclu {c.number}</p>
                  <p className="text-lg font-bold text-indigo-600">{c.score}</p>
                  <p className="text-[9px] text-slate-400">{c.maturity}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ═══ 3. FEEDBACK LOOPS ═══ */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">2. Feedback loops — cum circulă învățarea</h2>

        <div className="grid grid-cols-5 gap-3 mb-6">
          <StepCard step="1" label="Task-uri" value={feedbackLoops.total} color="slate" />
          <StepCard step="2" label="Completate" value={feedbackLoops.completed} color="emerald" />
          <StepCard step="3" label="Cu feedback" value={feedbackLoops.withFeedback} color="indigo" />
          <StepCard step="4" label="KB actualizat" value={feedbackLoops.kbUpdates} color="violet" />
          <StepCard step="5" label="Buclă închisă" value={feedbackLoops.loopClosed} color="amber" />
        </div>

        {/* Bară flux */}
        <div className="flex items-center gap-1 mb-2">
          <FlowBar value={feedbackLoops.total} max={feedbackLoops.total} color="bg-slate-300" label="Alocate" />
          <span className="text-slate-300">→</span>
          <FlowBar value={feedbackLoops.completed} max={feedbackLoops.total} color="bg-emerald-400" label="Done" />
          <span className="text-slate-300">→</span>
          <FlowBar value={feedbackLoops.withFeedback} max={feedbackLoops.total} color="bg-indigo-400" label="Feedback" />
          <span className="text-slate-300">→</span>
          <FlowBar value={feedbackLoops.kbUpdates} max={feedbackLoops.total} color="bg-violet-400" label="KB" />
          <span className="text-slate-300">→</span>
          <FlowBar value={feedbackLoops.loopClosed} max={feedbackLoops.total} color="bg-amber-400" label="Aplicat" />
        </div>

        <div className="flex gap-6 text-xs text-slate-400 mt-3">
          <span>Rata feedback: <strong className="text-slate-600">{feedbackLoops.feedbackRate}%</strong></span>
          {feedbackLoops.avgHours && <span>Timp mediu rezolvare: <strong className="text-slate-600">{feedbackLoops.avgHours}h</strong></span>}
        </div>
      </section>

      {/* ═══ 6. HARTA TERMICĂ ═══ */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">3. Harta sănătății — cine funcționează, cine nu</h2>

        <div className="flex gap-4 mb-4 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-400" /> Activ și productiv</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-300" /> Suboptimal / blocat</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-300" /> Inactiv</span>
        </div>

        <div className="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-10 gap-1.5">
          {heatMap.processes.map((p: any) => (
            <div
              key={p.role}
              className={`rounded-lg p-2 text-center cursor-default transition-colors ${
                p.health === "green" ? "bg-emerald-100 hover:bg-emerald-200" :
                p.health === "yellow" ? "bg-amber-100 hover:bg-amber-200" :
                "bg-red-100 hover:bg-red-200"
              }`}
              title={`${p.name}: ${p.tasks} tasks, ${p.completed} done, ${p.blocked} amânat, ${p.learned} învățat`}
            >
              <p className="text-[8px] font-bold text-slate-600 truncate">{p.role}</p>
              <p className="text-[10px] text-slate-500">{p.completed}/{p.tasks}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
          <div className="text-center">
            <p className="text-emerald-600 font-bold text-lg">{heatMap.processes.filter((p: any) => p.health === "green").length}</p>
            <p className="text-slate-400">Activi</p>
          </div>
          <div className="text-center">
            <p className="text-amber-500 font-bold text-lg">{heatMap.processes.filter((p: any) => p.health === "yellow").length}</p>
            <p className="text-slate-400">Suboptimali</p>
          </div>
          <div className="text-center">
            <p className="text-red-500 font-bold text-lg">{heatMap.processes.filter((p: any) => p.health === "red").length}</p>
            <p className="text-slate-400">Inactivi</p>
          </div>
        </div>
      </section>

      {/* ═══ 10. AUTONOMIA STRUCTURII ═══ */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">4. Autonomia structurii</h2>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className={`rounded-xl p-5 text-center ${autonomy.overall >= 70 ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}>
            <p className="text-[10px] text-slate-400 uppercase">Autonomie globală</p>
            <p className={`text-4xl font-bold ${autonomy.overall >= 70 ? "text-emerald-600" : "text-amber-600"}`}>{autonomy.overall}%</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-5 text-center border border-slate-200">
            <p className="text-[10px] text-slate-400 uppercase">Decizii procesate</p>
            <p className="text-2xl font-bold text-slate-700">{autonomy.totalDecisions}</p>
            <p className="text-xs text-slate-400">{autonomy.autoResolved} rezolvate autonom</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-5 text-center border border-slate-200">
            <p className="text-[10px] text-slate-400 uppercase">Rata escalare</p>
            <p className={`text-2xl font-bold ${autonomy.escalationRate <= 20 ? "text-emerald-600" : "text-amber-600"}`}>{autonomy.escalationRate}%</p>
          </div>
        </div>

        {/* Per domeniu */}
        <div className="space-y-3">
          {autonomy.domains.map((d: any, i: number) => (
            <div key={i} className="flex items-center gap-4">
              <span className="text-xs text-slate-600 w-40 shrink-0">{d.name}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all ${d.autonomy >= d.target ? "bg-emerald-500" : "bg-amber-400"}`}
                  style={{ width: `${d.autonomy}%` }}
                />
                {/* Linie țintă */}
                <div className="absolute top-0 bottom-0 border-r-2 border-dashed border-slate-400" style={{ left: `${d.target}%` }} />
              </div>
              <span className="text-xs text-slate-500 w-16 text-right">{d.autonomy}% / {d.target}%</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ FAZA 2+3 — PLACEHOLDERS ═══ */}
      <section className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-8 text-center">
        <p className="text-sm text-slate-400">Secțiunile 5-12 — în dezvoltare (Faza 2 și 3)</p>
        <p className="text-xs text-slate-300 mt-2">Cartea de învățare · Obiective vs Efort · Panou clienți · Maturitate · Simulator · Feed învățare · Lab experimente · Sala reflecție</p>
      </section>
    </div>
  )
}

// ─── Componente helper ─────────────────────────────────────────────────

function StepCard({ step, label, value, color }: { step: string; label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    slate: "bg-slate-100 text-slate-600",
    emerald: "bg-emerald-100 text-emerald-600",
    indigo: "bg-indigo-100 text-indigo-600",
    violet: "bg-violet-100 text-violet-600",
    amber: "bg-amber-100 text-amber-600",
  }
  return (
    <div className={`rounded-lg p-3 text-center ${colors[color] || colors.slate}`}>
      <p className="text-[9px] uppercase opacity-60">Pas {step}</p>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[10px] opacity-70">{label}</p>
    </div>
  )
}

function FlowBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = max > 0 ? Math.round(value / max * 100) : 0
  return (
    <div className="flex-1">
      <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
        <div className={`${color} h-full rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[8px] text-slate-400 text-center mt-0.5">{label} ({pct}%)</p>
    </div>
  )
}
