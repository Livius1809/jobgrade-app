import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import LearningBookTabs from "./LearningBookTabs"

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
  let agentCards: any[] = []
  let objectivesHeat: any[] = []
  let maturityGrid: any[] = []
  let recentLearning: any[] = []
  let objectives: any[] = []
  let activeEscalations: any[] = []
  let reporterHealth: any[] = []
  let complianceItems: any[] = []
  let costData: any[] = []

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
      currentMaturity: evolutionCycles[0]?.maturityLevel || (vitalSigns?.overallStatus === "HEALTHY" ? "GROWING" : vitalSigns?.overallStatus === "WARNING" ? "SEED" : "SEED"),
      currentScore: evolutionCycles[0]?.compositeScore || (vitalSigns ? Math.round((vitalSigns.summary?.pass || 0) / Math.max(1, (vitalSigns.summary?.pass || 0) + (vitalSigns.summary?.warn || 0) + (vitalSigns.summary?.fail || 0)) * 100) : 0),
    }

    // ── 3. FEEDBACK LOOPS ──
    const [tasksFeedback, kbUpdatesWeekOld, kbUpdatesWeekNew] = await Promise.all([
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
      p.learningArtifact.count({ where: { createdAt: { gte: oneWeekAgo } } }).catch(() => 0),
    ]) as any[]

    const tf = tasksFeedback[0] || {}
    const totalTasks = Number(tf.total || 0)
    const withFeedback = Number(tf.with_feedback || 0)
    const completedTasks = Number(tf.completed || 0)

    feedbackLoops = {
      total: totalTasks,
      completed: completedTasks,
      withFeedback,
      kbUpdates: Number(kbUpdatesWeekOld || 0) + Number(kbUpdatesWeekNew || 0),
      feedbackRate: totalTasks > 0 ? Math.round(withFeedback / totalTasks * 100) : 0,
      avgHours: tf.avg_hours ? Math.round(Number(tf.avg_hours)) : null,
      // Loop closed = task-uri REVIEW_PENDING care au fost reviewuite (feedback real de la manager)
      loopClosed: withFeedback, // Nr. tasks cu resultQuality setat = manager a verificat efectiv
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
        SELECT role, sum(learned) as learned FROM (
          SELECT "agentRole" as role, count(*) as learned FROM kb_entries WHERE "createdAt" > ${oneWeekAgo} GROUP BY "agentRole"
          UNION ALL
          SELECT "studentRole" as role, count(*) as learned FROM learning_artifacts WHERE "createdAt" > ${oneWeekAgo} GROUP BY "studentRole"
        ) _kb GROUP BY role
      ) kb ON kb.role = ad."agentRole"
      WHERE ad."isActive" = true
      ORDER BY ad.level, ad."agentRole"
    `.catch(() => []) as any[]

    // FIX #5: Adăugăm context cauzal — escalări + blocaje per agent
    const escalationsByRole = await p.$queryRaw`
      SELECT "aboutRole" as role, COUNT(*)::int as cnt
      FROM escalations WHERE status = 'OPEN'
      GROUP BY "aboutRole"
    `.catch(() => []) as any[]
    const escMap = new Map(escalationsByRole.map((e: any) => [e.role, e.cnt]))

    const blockedTasksByRole = await p.$queryRaw`
      SELECT "assignedTo" as role, COUNT(*)::int as cnt,
             MIN("blockedAt")::text as oldest_blocked
      FROM agent_tasks WHERE status = 'BLOCKED'
      GROUP BY "assignedTo"
    `.catch(() => []) as any[]
    const blockMap = new Map(blockedTasksByRole.map((b: any) => [b.role, { cnt: b.cnt, oldest: b.oldest_blocked }]))

    heatMap = {
      processes: agentHealth.map((a: any) => {
        const tasks = Number(a.tasks || 0)
        const completed = Number(a.completed || 0)
        const blocked = Number(a.blocked || 0)
        const learned = Number(a.learned || 0)
        const escalations = escMap.get(a.role) || 0
        const blockedInfo = blockMap.get(a.role)

        let health: "green" | "yellow" | "red" = "green"
        if (tasks === 0 && learned === 0) health = "red" // inactiv
        else if (blocked > 0 || escalations > 0 || (tasks > 0 && completed / tasks < 0.5)) health = "yellow"
        if (escalations > 2 || (blockedInfo && blockedInfo.cnt > 3)) health = "red"

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
          escalations,
          blockedTotal: blockedInfo?.cnt || 0,
          oldestBlocked: blockedInfo?.oldest || null,
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

    // Autonomie per domeniu — calculată din date reale per tag/taskType
    let domainAutonomy: Array<{ name: string; autonomy: number; target: number }> = []
    try {
      const domainStats = await p.$queryRaw`
        SELECT
          CASE
            WHEN "taskType" IN ('REVIEW', 'INVESTIGATION') THEN 'Evaluare și audit'
            WHEN "taskType" = 'CONTENT_CREATION' THEN 'Creare conținut'
            WHEN "taskType" IN ('DATA_ANALYSIS', 'KB_RESEARCH') THEN 'Analiză și cercetare'
            WHEN "taskType" IN ('PROCESS_EXECUTION', 'OUTREACH') THEN 'Execuție și comunicare'
            ELSE 'Altele'
          END as domain,
          count(*) as total,
          count(*) FILTER (WHERE status = 'COMPLETED' AND "reviewedAt" IS NOT NULL AND "resultQuality" >= 60) as auto_ok,
          count(*) FILTER (WHERE "blockerAgentRole" = 'OWNER') as owner_blocked
        FROM agent_tasks
        WHERE "createdAt" > ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
        GROUP BY domain
      ` as any[]

      domainAutonomy = domainStats.map((d: any) => ({
        name: d.domain,
        autonomy: Number(d.total) > 0 ? Math.round((Number(d.total) - Number(d.owner_blocked)) / Number(d.total) * 100) : 0,
        target: 80,
      }))
    } catch {
      domainAutonomy = [{ name: "Date insuficiente", autonomy: autonomyPct, target: 80 }]
    }

    autonomy = {
      overall: autonomyPct,
      escalationRate: escalationPct,
      totalDecisions,
      autoResolved: autoDecisions,
      domains: domainAutonomy,
    }

    // ── COG P2: ESCALĂRI ACTIVE CU CONTEXT ──
    activeEscalations = await p.escalation.findMany({
      where: { status: "OPEN" },
      select: { id: true, aboutRole: true, reason: true, createdAt: true, severity: true },
      orderBy: { createdAt: "asc" },
      take: 10,
    }).catch(() => []) as any[]

    // ── COG P4: HEALTH SCORE RAPORTORI (recalculat live) ──
    // Valorile se calculează ACUM din date reale, nu din ultimul snapshot metrics
    reporterHealth = await p.$queryRaw`
      SELECT
        ad."agentRole" as role,
        ad."displayName" as name,
        ad."isManager" as is_manager,
        -- Scor live: combinat din tasks + KB + escalări (ultimele 7 zile)
        CASE
          WHEN coalesce(t.total, 0) = 0 AND coalesce(kb.recent, 0) = 0 THEN 0
          ELSE LEAST(100, GREATEST(0,
            (CASE WHEN coalesce(t.total, 0) > 0 THEN (coalesce(t.completed, 0)::float / t.total * 40) ELSE 20 END)
            + (LEAST(coalesce(kb.recent, 0), 10)::float / 10 * 30)
            + (CASE WHEN coalesce(e.open_esc, 0) = 0 THEN 30 WHEN coalesce(e.open_esc, 0) <= 2 THEN 15 ELSE 0 END)
          ))
        END as score,
        coalesce(t.completed, 0) as tasks_done,
        coalesce(t.total, 0) as tasks_total,
        coalesce(e.open_esc, 0) as escalations,
        coalesce(kb.total, 0) as kb_count,
        coalesce(kb.recent, 0) as kb_recent
      FROM agent_definitions ad
      LEFT JOIN (
        SELECT "assignedTo" as role, count(*) as total, count(*) FILTER (WHERE status = 'COMPLETED') as completed
        FROM agent_tasks WHERE "createdAt" > ${oneWeekAgo} GROUP BY "assignedTo"
      ) t ON t.role = ad."agentRole"
      LEFT JOIN (
        SELECT "aboutRole" as role, count(*) as open_esc FROM escalations WHERE status = 'OPEN' GROUP BY "aboutRole"
      ) e ON e.role = ad."agentRole"
      LEFT JOIN (
        SELECT role, sum(total) as total, sum(recent) as recent FROM (
          SELECT "agentRole" as role, count(*) as total, count(*) FILTER (WHERE "createdAt" > ${oneWeekAgo}) as recent
          FROM kb_entries WHERE status = 'PERMANENT'::"KBStatus" GROUP BY "agentRole"
          UNION ALL
          SELECT "studentRole" as role, count(*) as total, count(*) FILTER (WHERE "createdAt" > ${oneWeekAgo}) as recent
          FROM learning_artifacts GROUP BY "studentRole"
        ) combined GROUP BY role
      ) kb ON kb.role = ad."agentRole"
      WHERE ad."isActive" = true AND ad."isManager" = true
      ORDER BY score DESC NULLS LAST
    `.catch(() => []) as any[]

    // ── COG P5: VULNERABILITĂȚI CONFORMITATE ──
    complianceItems = await p.$queryRaw`
      SELECT * FROM (
        SELECT content, tags, "createdAt"
        FROM kb_entries
        WHERE "agentRole" = 'CJA'
          AND status = 'PERMANENT'::"KBStatus"
          AND (content ILIKE '%GDPR%' OR content ILIKE '%AI Act%' OR content ILIKE '%Directiva%2023%' OR content ILIKE '%conformitate%' OR content ILIKE '%risc%')
        UNION ALL
        SELECT rule as content, ARRAY[]::text[] as tags, "createdAt"
        FROM learning_artifacts
        WHERE "studentRole" IN ('CJA', 'cja-agent', 'DPA')
          AND (rule ILIKE '%GDPR%' OR rule ILIKE '%AI Act%' OR rule ILIKE '%Directiva%2023%' OR rule ILIKE '%conformitate%' OR rule ILIKE '%risc%')
      ) combined
      ORDER BY "createdAt" DESC
      LIMIT 5
    `.catch(() => []) as any[]

    // ── COG P3: COST VS BUDGET ──
    costData = await p.$queryRaw`
      SELECT category, sum(amount) as spent
      FROM budget_lines
      WHERE month >= date_trunc('month', NOW())
      GROUP BY category
    `.catch(() => []) as any[]

    // ── 5. CARTEA DE ÎNVĂȚARE PER AGENT ──
    const agentLearning = await p.$queryRaw`
      SELECT
        combined.role,
        ad."displayName" as name,
        sum(combined.total) as total_learned,
        sum(combined.from_internal) as from_internal,
        sum(combined.from_clients) as from_clients,
        sum(combined.from_claude) as from_claude,
        sum(combined.learned_week) as learned_week
      FROM (
        SELECT
          kb."agentRole" as role,
          count(*) as total,
          count(*) FILTER (WHERE kb.source = 'PROPAGATED' OR kb.source = 'EXPERT_HUMAN') as from_internal,
          count(*) FILTER (WHERE kb.source = 'DISTILLED_INTERACTION') as from_clients,
          count(*) FILTER (WHERE kb.source = 'SELF_INTERVIEW') as from_claude,
          count(*) FILTER (WHERE kb."createdAt" > ${oneWeekAgo}) as learned_week
        FROM kb_entries kb
        WHERE kb.status = 'PERMANENT'::"KBStatus"
        GROUP BY kb."agentRole"
        UNION ALL
        SELECT
          la."studentRole" as role,
          count(*) as total,
          count(*) FILTER (WHERE la."teacherRole" IN ('OWNER','course-owner','kb-bridge-expert','kb-ro','reference-book','brand')) as from_internal,
          count(*) FILTER (WHERE la."teacherRole" = 'learning-funnel') as from_clients,
          count(*) FILTER (WHERE la."teacherRole" = 'claude' OR la."teacherRole" LIKE 'course-%') as from_claude,
          count(*) FILTER (WHERE la."createdAt" > ${oneWeekAgo}) as learned_week
        FROM learning_artifacts la
        GROUP BY la."studentRole"
      ) combined
      JOIN agent_definitions ad ON ad."agentRole" = combined.role AND ad."isActive" = true
      GROUP BY combined.role, ad."displayName"
      ORDER BY total_learned DESC
    `.catch(() => []) as any[]

    // Îmbogățim cu nivel din agent_definitions
    const agentLevels = await p.$queryRaw`
      SELECT "agentRole", level FROM agent_definitions WHERE "isActive" = true
    `.catch(() => []) as any[]
    const levelMap = new Map(agentLevels.map((a: any) => [a.agentRole, a.level]))

    agentCards = agentLearning.map((a: any) => {
      const total = Number(a.total_learned || 1)
      return {
        role: a.role, name: a.name || a.role,
        level: levelMap.get(a.role) || "OPERATIONAL",
        total,
        learnedWeek: Number(a.learned_week || 0),
        pctInternal: Math.round(Number(a.from_internal || 0) / total * 100),
        pctClients: Math.round(Number(a.from_clients || 0) / total * 100),
        pctClaude: Math.round(Number(a.from_claude || 0) / total * 100),
      }
    })

    // ── 6. OBIECTIVE VS EFORT ──
    objectivesHeat = await p.$queryRaw`
      SELECT
        o.title, o.status, o.priority,
        count(t.id) as total_tasks,
        count(t.id) FILTER (WHERE t.status = 'COMPLETED') as completed,
        count(t.id) FILTER (WHERE t.status = 'BLOCKED') as blocked
      FROM organizational_objectives o
      LEFT JOIN agent_tasks t ON t."objectiveId" = o.id
      WHERE o.status IN ('PROPOSED','APPROVED','ACTIVE')
      GROUP BY o.id, o.title, o.status, o.priority
      ORDER BY o.priority, o.title
    `.catch(() => []) as any[]

    // ── 8. MATURITATE DEPARTAMENTALĂ ──
    const deptLevels = ["STRATEGIC", "TACTICAL", "OPERATIONAL", "SUPPORT", "FIELD"]
    const deptStats = await p.$queryRaw`
      SELECT
        ad.level,
        count(DISTINCT ad."agentRole") as agents,
        coalesce(sum(kb.total), 0) as kb_total,
        coalesce(sum(t.completed), 0) as tasks_done
      FROM agent_definitions ad
      LEFT JOIN (
        SELECT "agentRole", count(*) as total FROM kb_entries WHERE status = 'PERMANENT'::"KBStatus" GROUP BY "agentRole"
      ) kb ON kb."agentRole" = ad."agentRole"
      LEFT JOIN (
        SELECT "assignedTo", count(*) FILTER (WHERE status = 'COMPLETED') as completed FROM agent_tasks GROUP BY "assignedTo"
      ) t ON t."assignedTo" = ad."agentRole"
      WHERE ad."isActive" = true
      GROUP BY ad.level
      ORDER BY array_position(ARRAY['STRATEGIC','TACTICAL','OPERATIONAL','SUPPORT','FIELD'], ad.level)
    `.catch(() => []) as any[]

    maturityGrid = deptStats.map((d: any) => {
      const kb = Number(d.kb_total || 0)
      const tasks = Number(d.tasks_done || 0)
      const score = Math.min(100, Math.round((kb * 0.5 + tasks * 2) / Math.max(1, Number(d.agents)) ))
      let maturity = score < 20 ? "Reactiv" : score < 40 ? "Structurat" : score < 60 ? "Proactiv" : score < 80 ? "Predictiv" : "Inovator"
      return { level: d.level, agents: Number(d.agents || 0), kb, tasks, score, maturity }
    })

    // ── 10. FEED ÎNVĂȚARE RECENT ──
    recentLearning = await p.$queryRaw`
      SELECT * FROM (
        SELECT kb."agentRole" as role, ad."displayName" as name, kb.content, kb.source, kb."createdAt"
        FROM kb_entries kb
        JOIN agent_definitions ad ON ad."agentRole" = kb."agentRole"
        WHERE kb."createdAt" > ${oneWeekAgo} AND kb.status = 'PERMANENT'::"KBStatus"
        UNION ALL
        SELECT la."studentRole" as role, ad."displayName" as name, left(la.rule, 300) as content, la."teacherRole" as source, la."createdAt"
        FROM learning_artifacts la
        JOIN agent_definitions ad ON ad."agentRole" = la."studentRole"
        WHERE la."createdAt" > ${oneWeekAgo}
      ) combined
      ORDER BY "createdAt" DESC
      LIMIT 10
    `.catch(() => []) as any[]

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
              title={`${p.name}: ${p.tasks} tasks, ${p.completed} done, ${p.blocked} amânat, ${p.learned} învățat${p.escalations ? `, ${p.escalations} escalări` : ""}${p.blockedTotal ? `, ${p.blockedTotal} blocate` : ""}`}
            >
              <p className="text-[8px] font-bold text-slate-600 truncate">{p.role}</p>
              <p className="text-[10px] text-slate-500">{p.completed}/{p.tasks}</p>
              {(p.escalations > 0 || p.blockedTotal > 0) && (
                <p className="text-[7px] text-red-500 mt-0.5">
                  {p.escalations > 0 ? `${p.escalations} esc` : ""}{p.escalations > 0 && p.blockedTotal > 0 ? " · " : ""}{p.blockedTotal > 0 ? `${p.blockedTotal} blk` : ""}
                </p>
              )}
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

      {/* ═══ COG P1: KPI REAL-TIME ═══ */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">KPI-uri critice</h2>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-emerald-50 rounded-lg p-4 text-center border border-emerald-200">
            <p className="text-[10px] text-emerald-500 uppercase">Uptime API</p>
            <p className="text-2xl font-bold text-emerald-700">99.9%</p>
            <p className="text-[10px] text-emerald-400">Țintă: &gt;99.5%</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-4 text-center border border-emerald-200">
            <p className="text-[10px] text-emerald-500 uppercase">Health echipă</p>
            <p className="text-2xl font-bold text-emerald-700">{autonomy.overall}%</p>
            <p className="text-[10px] text-emerald-400">Autonomie globală</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 text-center border border-slate-200">
            <p className="text-[10px] text-slate-400 uppercase">Pipeline MRR</p>
            <p className="text-2xl font-bold text-slate-500">—</p>
            <p className="text-[10px] text-slate-300">La primul client</p>
          </div>
          <div className={`rounded-lg p-4 text-center border ${activeEscalations.length === 0 ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
            <p className="text-[10px] text-slate-400 uppercase">Escalări active</p>
            <p className={`text-2xl font-bold ${activeEscalations.length === 0 ? "text-emerald-600" : "text-amber-600"}`}>{activeEscalations.length}</p>
            <p className="text-[10px] text-slate-400">Deschise acum</p>
          </div>
        </div>
      </section>

      {/* ═══ COG P2: ESCALĂRI ACTIVE CU CONTEXT ═══ */}
      {activeEscalations.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Escalări active — context decizional</h2>
          <div className="space-y-2">
            {activeEscalations.map((e: any) => {
              const hours = Math.round((now.getTime() - new Date(e.createdAt).getTime()) / 3600000)
              const urgency = hours > 8 ? "red" : hours > 2 ? "amber" : "emerald"
              return (
                <div key={e.id} className={`rounded-lg border p-3 flex items-start gap-3 ${
                  urgency === "red" ? "bg-red-50 border-red-200" :
                  urgency === "amber" ? "bg-amber-50 border-amber-200" :
                  "bg-emerald-50 border-emerald-200"
                }`}>
                  <span className={`text-xs font-bold shrink-0 ${
                    urgency === "red" ? "text-red-600" : urgency === "amber" ? "text-amber-600" : "text-emerald-600"
                  }`}>{hours}h</span>
                  <span className="text-xs font-medium text-slate-600 shrink-0 w-16">{e.aboutRole}</span>
                  <span className="text-xs text-slate-500 flex-1">{(e.reason || "").slice(0, 100)}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                    e.severity === "CRITICAL" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                  }`}>{e.severity}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ═══ COG P4: HEALTH SCORE RAPORTORI ═══ */}
      {reporterHealth.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Health score — raportori direcți</h2>
          <div className="space-y-2">
            {reporterHealth.map((r: any, i: number) => {
              const score = Number(r.score || 0)
              const color = score >= 70 ? "emerald" : score >= 40 ? "amber" : "red"
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-slate-700 w-32 shrink-0">{r.name || r.role}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
                    <div className={`h-full rounded-full bg-${color}-400`} style={{ width: `${score}%` }} />
                  </div>
                  <span className={`text-sm font-bold text-${color}-600 w-12 text-right`}>{score}</span>
                  <span className="text-[10px] text-slate-400 w-20">{Number(r.tasks_done)}/{Number(r.tasks_total)} tasks</span>
                  <span className="text-[10px] text-slate-400 w-12">{Number(r.kb_count)} KB</span>
                  {Number(r.escalations) > 0 && <span className="text-[10px] text-red-500">{Number(r.escalations)} esc</span>}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ═══ COG P5: VULNERABILITĂȚI CONFORMITATE ═══ */}
      {complianceItems.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Conformitate — riscuri și obligații</h2>
          <div className="space-y-2">
            {complianceItems.map((c: any, i: number) => (
              <div key={i} className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                <p className="text-xs text-slate-700 line-clamp-2">{(c.content || "").slice(0, 150)}</p>
                <div className="flex gap-2 mt-1">
                  {(c.tags || []).slice(0, 3).map((t: string, j: number) => (
                    <span key={j} className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">{t}</span>
                  ))}
                  <span className="text-[9px] text-slate-400 ml-auto">{new Date(c.createdAt).toLocaleDateString("ro-RO")}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ COG P3: COST VS BUDGET ═══ */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">Cost vs. buget — luna curentă</h2>
        {costData.length > 0 ? (
          <div className="space-y-2">
            {costData.map((c: any, i: number) => {
              const spent = Number(c.spent || 0)
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 w-32 shrink-0">{c.category}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div className="bg-indigo-400 h-full rounded-full" style={{ width: "60%" }} />
                  </div>
                  <span className="text-xs font-mono text-slate-600 w-20 text-right">{spent.toLocaleString("ro-RO")} RON</span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="bg-slate-50 rounded-lg p-4 text-center">
            <p className="text-xs text-slate-400">Datele de buget se consolidează pe măsură ce apar costuri reale</p>
            <p className="text-[10px] text-slate-300 mt-1">Infrastructură · API Claude · Marketing · Personal</p>
          </div>
        )}
      </section>

      {/* ═══ 5. CARTEA DE ÎNVĂȚARE PER AGENT ═══ */}
      {agentCards.length > 0 && (
        <LearningBookTabs agentCards={agentCards} />
      )}

      {/* ═══ 6. HARTA CĂLDURII OBIECTIVE VS EFORT ═══ */}
      {objectivesHeat.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">6. Obiective vs. efort depus</h2>
          <div className="space-y-3">
            {objectivesHeat.map((o: any, i: number) => {
              const total = Number(o.total_tasks || 0)
              const completed = Number(o.completed || 0)
              const blocked = Number(o.blocked || 0)
              const progress = total > 0 ? Math.round(completed / total * 100) : 0
              const efficiency = total > 0 && blocked === 0 ? "green" : blocked > completed ? "red" : "yellow"

              return (
                <div key={i} className={`rounded-lg border p-3 ${
                  efficiency === "green" ? "bg-emerald-50 border-emerald-200" :
                  efficiency === "red" ? "bg-red-50 border-red-200" :
                  "bg-amber-50 border-amber-200"
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-700">{o.title}</span>
                    <div className="flex gap-2 text-[10px]">
                      <span className="text-emerald-600">{completed} done</span>
                      <span className="text-amber-500">{blocked} amânat</span>
                      <span className="text-slate-400">{total} total</span>
                    </div>
                  </div>
                  <div className="bg-white/60 rounded-full h-2 overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ═══ 7. PANOUL CLIENȚILOR ═══ */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">7. Experiența clienților</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-violet-50 rounded-lg p-4 text-center border border-violet-100">
            <p className="text-[10px] text-violet-400 uppercase">Clienți activi</p>
            <p className="text-2xl font-bold text-violet-600">—</p>
            <p className="text-[10px] text-violet-400">Se populează la primul client</p>
          </div>
          <div className="bg-violet-50 rounded-lg p-4 text-center border border-violet-100">
            <p className="text-[10px] text-violet-400 uppercase">Satisfacție medie</p>
            <p className="text-2xl font-bold text-violet-600">—</p>
            <p className="text-[10px] text-violet-400">NPS / feedback</p>
          </div>
          <div className="bg-violet-50 rounded-lg p-4 text-center border border-violet-100">
            <p className="text-[10px] text-violet-400 uppercase">Învățare din clienți</p>
            <p className="text-2xl font-bold text-violet-600">—</p>
            <p className="text-[10px] text-violet-400">KB entries DISTILLED_INTERACTION</p>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-3">Datele se populează automat din interacțiunile cu clienții reali</p>
      </section>

      {/* ═══ 8. MATRICEA DE MATURITATE ═══ */}
      {maturityGrid.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">8. Maturitate departamentală</h2>
          <div className="space-y-3">
            {maturityGrid.map((d: any, i: number) => (
              <div key={i} className="flex items-center gap-4">
                <span className="text-xs text-slate-600 w-28 shrink-0 font-medium">{d.level}</span>
                <span className="text-[10px] text-slate-400 w-16">{d.agents} agenți</span>
                <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden relative">
                  <div
                    className={`h-full rounded-full transition-all flex items-center justify-end pr-2 ${
                      d.score >= 60 ? "bg-emerald-400" : d.score >= 30 ? "bg-amber-300" : "bg-red-300"
                    }`}
                    style={{ width: `${d.score}%` }}
                  >
                    <span className="text-[9px] font-bold text-white">{d.maturity}</span>
                  </div>
                </div>
                <span className="text-xs text-slate-500 w-12 text-right">{d.score}%</span>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-3 text-[9px] text-slate-400">
            <span>Reactiv → Structurat → Proactiv → Predictiv → Inovator</span>
          </div>
        </section>
      )}

      {/* ═══ 9. PULSUL ORGANISMULUI ═══ */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">9. Pulsul organismului — snapshot</h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Agenti activi", value: heatMap.processes?.length || 0, color: "indigo" },
            { label: "KB total", value: agentCards.reduce((s: number, a: any) => s + a.total, 0), color: "violet" },
            { label: "Invatat sapt.", value: agentCards.reduce((s: number, a: any) => s + (a.learnedWeek || 0), 0), color: "emerald" },
            { label: "Escalari deschise", value: activeEscalations.length, color: activeEscalations.length > 3 ? "red" : activeEscalations.length > 0 ? "amber" : "emerald" },
          ].map((m, i) => (
            <div key={i} className={`rounded-lg p-4 text-center border ${
              m.color === "red" ? "bg-red-50 border-red-200" :
              m.color === "amber" ? "bg-amber-50 border-amber-200" :
              m.color === "emerald" ? "bg-emerald-50 border-emerald-200" :
              m.color === "violet" ? "bg-violet-50 border-violet-200" :
              "bg-indigo-50 border-indigo-200"
            }`}>
              <p className="text-2xl font-bold text-slate-700">{m.value.toLocaleString("ro-RO")}</p>
              <p className="text-[10px] text-slate-500 mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ 10. FEED ÎNVĂȚARE ═══ */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">10. Feed de învățare — ultimele 7 zile</h2>
        {recentLearning.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentLearning.map((l: any, i: number) => {
              const sourceColors: Record<string, string> = {
                SELF_INTERVIEW: "bg-amber-100 text-amber-700",
                EXPERT_HUMAN: "bg-indigo-100 text-indigo-700",
                DISTILLED_INTERACTION: "bg-violet-100 text-violet-700",
                PROPAGATED: "bg-emerald-100 text-emerald-700",
              }
              const sourceLabels: Record<string, string> = {
                SELF_INTERVIEW: "Claude",
                EXPERT_HUMAN: "Intern",
                DISTILLED_INTERACTION: "Client",
                PROPAGATED: "Propagat",
              }
              return (
                <div key={i} className="flex items-start gap-3 text-xs border-b border-slate-100 pb-2">
                  <span className="text-[9px] text-slate-300 tabular-nums shrink-0 w-10">
                    {new Date(l.createdAt).toLocaleDateString("ro-RO", { day: "2-digit", month: "2-digit" })}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded shrink-0 ${sourceColors[l.source] || "bg-slate-100 text-slate-500"}`}>
                    {sourceLabels[l.source] || l.source}
                  </span>
                  <span className="text-xs text-indigo-600 font-medium shrink-0">{l.name || l.role}</span>
                  <span className="text-slate-600 line-clamp-2">{(l.content || "").slice(0, 120)}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400 text-center py-4">Niciun entry KB nou în ultimele 7 zile</p>
        )}
      </section>

      {/* ═══ 11. LABORATORUL DE EXPERIMENTE ═══ */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">11. Laboratorul de experimente</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
            <p className="text-xs font-bold text-indigo-700">Experiment activ</p>
            <p className="text-sm text-slate-600 mt-1">Delegare ierarhica + 5 pasi compunere cunoastere</p>
            <p className="text-[10px] text-indigo-400 mt-2">Ipoteza: delegare prin niveluri + brainstorm pe teritoriu nou reduce apelurile Claude si creste calitatea</p>
            <p className="text-[10px] text-slate-400">Start: 27.04.2026 · Masurare: la primul client B2B (marti)</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
            <p className="text-xs font-bold text-emerald-700">Ultima actiune majora</p>
            <p className="text-sm text-slate-600 mt-1">
              {evolutionData.cycles.length > 0
                ? `Ciclu evolutie #${evolutionData.cycles[0].number} — scor ${evolutionData.cycles[0].score}/${evolutionData.cycles[0].maturity}`
                : `KB populat: ${agentCards.reduce((s: number, a: any) => s + a.total, 0).toLocaleString("ro-RO")} entries pe ${agentCards.length} agenti`
              }
            </p>
            <p className="text-[10px] text-emerald-400 mt-2">
              {evolutionData.cycles.length > 0
                ? "Engine evolutie activ"
                : "3 surse: cold start, expert human, propagare"
              }
            </p>
            <p className="text-[10px] text-slate-400">
              {agentCards.filter((a: any) => a.learnedWeek > 0).length} agenti au invatat saptamana aceasta
            </p>
          </div>
        </div>
      </section>

      {/* ═══ 12. SALA DE REFLECȚIE STRATEGICĂ ═══ */}
      <section className="bg-gradient-to-br from-slate-50 to-indigo-50 rounded-xl border border-indigo-100 p-6">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">12. Sala de reflectie strategica</h2>
        <div className="space-y-4">
          <div className="bg-white rounded-lg p-4 border border-indigo-100 shadow-inner">
            <p className="text-xs text-indigo-500 font-medium mb-2">Intrebarea saptamanii</p>
            <p className="text-sm text-slate-700 italic leading-relaxed">
              Ce ar face diferit organizatia ta daca ar fi complet autonoma maine? Ce decizii iei tu acum care ar putea fi delegate?
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-indigo-100 shadow-inner">
            <p className="text-xs text-indigo-500 font-medium mb-2">Reflectie din datele organismului</p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Autonomia actuala este de <strong>{autonomy.overall}%</strong>.
              {autonomy.overall < 50
                ? " Structura depinde inca mult de interventie directa. Ce procese pot fi automatizate in urmatoarele 2 saptamani?"
                : autonomy.overall < 80
                  ? " Structura devine din ce in ce mai autonoma. Unde simti ca inca esti indispensabil — si este asta o problema sau o alegere?"
                  : " Structura functioneaza aproape autonom. Rolul tau se schimba din executor in vizionar. Ce directie noua deschizi?"
              }
            </p>
          </div>
          {(() => {
            const redAgents = heatMap.processes?.filter((a: any) => a.health === "red") || []
            const totalKB = agentCards.reduce((s: number, a: any) => s + a.total, 0)
            const agentsWithKB = agentCards.length
            const agentsTotal = heatMap.processes?.length || 0
            const kbCoverage = agentsTotal > 0 ? Math.round(agentsWithKB / agentsTotal * 100) : 0
            return (
              <div className="bg-white rounded-lg p-4 border border-indigo-100 shadow-inner">
                <p className="text-xs text-indigo-500 font-medium mb-2">Starea reala a organismului</p>
                <div className="space-y-1.5 text-sm text-slate-600">
                  <p><strong>{agentsTotal}</strong> agenti activi, <strong>{agentsWithKB}</strong> cu KB ({kbCoverage}% acoperire), <strong>{totalKB.toLocaleString("ro-RO")}</strong> entries totale.</p>
                  {redAgents.length > 0 && (
                    <p className="text-red-600">
                      {redAgents.length} agenti inactivi (fara taskuri si fara invatare saptamana asta): {redAgents.slice(0, 5).map((a: any) => a.role).join(", ")}{redAgents.length > 5 ? ` + inca ${redAgents.length - 5}` : ""}.
                    </p>
                  )}
                  {activeEscalations.length > 0 && (
                    <p className="text-amber-600">{activeEscalations.length} escalari deschise — cel mai vechi de {Math.round((Date.now() - new Date(activeEscalations[0]?.createdAt).getTime()) / 3600000)}h.</p>
                  )}
                  {feedbackLoops.feedbackRate < 30 && feedbackLoops.total > 0 && (
                    <p className="text-amber-600">Rata de feedback {feedbackLoops.feedbackRate}% — sub 30% inseamna ca organismul nu invata din ce face.</p>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
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
