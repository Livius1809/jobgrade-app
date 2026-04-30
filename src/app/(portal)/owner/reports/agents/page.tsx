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

  let pipeline = { total: 0, totalWeek: 0, completed: 0, completedWeek: 0, yesterdayTotal: 0, yesterdayCompleted: 0, prevWeekTotal: 0, prevWeekCompleted: 0, cumulativeTotal: 0, cumulativeCompleted: 0, inProgress: 0, postponed: 0, escalated: 0, claudeCalls: 0, claudeCallsYesterday: 0, claudeCallsWeek: 0, costToday: 0, costWeek: 0, byDept: [] as any[] }
  let diagnosis = { onTime: 0, postponed: 0, ownerDependent: 0, reasons: [] as any[] }
  let learning = { total: 0, prevTotal: 0, totalKB: 0, fromInternal: 0, fromClients: 0, fromClaude: 0, fromSeed: 0, fromExternal: 0, todayKB: 0, yesterdayKB: 0 }
  let objectives = [] as any[]
  let agents = [] as any[]

  try {
    // ═══ PIPELINE ═══
    const [taskStats, tasksByDept, escalationCount, claudeCallCount] = await Promise.all([
      p.$queryRaw`
        SELECT
          count(*) as total,
          count(*) FILTER (WHERE status = 'COMPLETED') as completed,
          count(*) FILTER (WHERE status IN ('ASSIGNED','IN_PROGRESS','ACCEPTED')) as in_progress,
          count(*) FILTER (WHERE status = 'BLOCKED') as postponed,
          count(*) FILTER (WHERE "createdAt"::date = CURRENT_DATE) as today_total,
          count(*) FILTER (WHERE "createdAt"::date = CURRENT_DATE AND status = 'COMPLETED') as today_completed,
          count(*) FILTER (WHERE "createdAt"::date = CURRENT_DATE - 1) as yesterday_total,
          count(*) FILTER (WHERE "createdAt"::date = CURRENT_DATE - 1 AND status = 'COMPLETED') as yesterday_completed
        FROM agent_tasks
        WHERE "createdAt" > ${oneWeekAgo} AND status != 'CANCELLED'
      ` as Promise<any[]>,
      p.$queryRaw`
        SELECT "assignedBy" as dept, count(*) as total,
          count(*) FILTER (WHERE status = 'COMPLETED') as completed
        FROM agent_tasks WHERE "createdAt" > ${oneWeekAgo}
        GROUP BY "assignedBy" ORDER BY total DESC LIMIT 10
      ` as Promise<any[]>,
      p.escalation.count({ where: { createdAt: { gte: oneWeekAgo } } }).catch(() => 0),
      p.$queryRaw`
        SELECT COUNT(*) as total,
          COUNT(*) FILTER (WHERE "createdAt"::date = CURRENT_DATE) as today,
          COUNT(*) FILTER (WHERE "createdAt"::date = CURRENT_DATE - 1) as yesterday,
          ROUND(SUM("estimatedCostUSD")::numeric, 2) as cost_week,
          ROUND(SUM("estimatedCostUSD") FILTER (WHERE "createdAt"::date = CURRENT_DATE)::numeric, 2) as cost_today
        FROM execution_telemetry WHERE "createdAt" > ${oneWeekAgo}
      `.catch(() => [{}]) as Promise<any[]>,
    ])

    // Cumulative + previous week queries
    const [cumulativeStats, prevWeekStats] = await Promise.all([
      p.$queryRaw`
        SELECT count(*) as total, count(*) FILTER (WHERE status = 'COMPLETED') as completed
        FROM agent_tasks WHERE status != 'CANCELLED'
      `.catch(() => [{ total: 0, completed: 0 }]) as Promise<any[]>,
      p.$queryRaw`
        SELECT count(*) as total, count(*) FILTER (WHERE status = 'COMPLETED') as completed
        FROM agent_tasks WHERE "createdAt" > ${twoWeeksAgo} AND "createdAt" <= ${oneWeekAgo} AND status != 'CANCELLED'
      `.catch(() => [{ total: 0, completed: 0 }]) as Promise<any[]>,
    ])

    const cumRow = cumulativeStats[0] || {}
    const prevRow = prevWeekStats[0] || {}

    const telemetry = (claudeCallCount as any[])[0] || {}
    const ts = taskStats[0] || {}
    pipeline = {
      total: Number(ts.today_total || 0),
      totalWeek: Number(ts.total || 0),
      completed: Number(ts.today_completed || 0),
      completedWeek: Number(ts.completed || 0),
      yesterdayTotal: Number(ts.yesterday_total || 0),
      yesterdayCompleted: Number(ts.yesterday_completed || 0),
      prevWeekTotal: Number(prevRow.total || 0),
      prevWeekCompleted: Number(prevRow.completed || 0),
      cumulativeTotal: Number(cumRow.total || 0),
      cumulativeCompleted: Number(cumRow.completed || 0),
      inProgress: Number(ts.in_progress || 0),
      postponed: Number(ts.postponed || 0),
      escalated: escalationCount,
      claudeCalls: Number(telemetry.today || 0),
      claudeCallsYesterday: Number(telemetry.yesterday || 0),
      claudeCallsWeek: Number(telemetry.total || 0),
      costToday: Number(telemetry.cost_today || 0),
      costWeek: Number(telemetry.cost_week || 0),
      byDept: tasksByDept.map((d: any) => ({ dept: d.dept, total: Number(d.total), completed: Number(d.completed) })),
    }

    // ═══ DIAGNOZĂ: de ce alocate ≠ realizate ═══
    // Pattern-uri de filtrat (tehnice, zgomot, irelevante)
    const NOISE = /no_activity|no_cycles|no_actions|monotony|dormant|austria|putin|trump|NATO|alegeri|bursier|fotbal|Eurovision/i

    const [postponedTasks, overdueTasks, ownerBlockedTasks, ownerTasks] = await Promise.all([
      // Task-uri amânate (BLOCKED) — doar active, fără cancelled/failed
      p.agentTask.findMany({
        where: { status: "BLOCKED" },
        select: { title: true, assignedTo: true, blockerDescription: true, blockerType: true, blockerAgentRole: true, deadlineAt: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 30,
      }).catch(() => []),
      // Task-uri cu termen depășit — exclude COMPLETED, FAILED, CANCELLED
      p.agentTask.findMany({
        where: { deadlineAt: { lt: now }, status: { notIn: ["COMPLETED", "FAILED", "CANCELLED"] } },
        select: { title: true, assignedTo: true, assignedBy: true, deadlineAt: true, status: true, blockerDescription: true, blockerType: true, failureReason: true, result: true, tags: true },
        orderBy: { deadlineAt: "asc" },
        take: 30,
      }).catch(() => []),
      // Task-uri care depind de Owner — doar cele cu decizie reală necesară
      p.agentTask.findMany({
        where: {
          blockerAgentRole: "OWNER",
          status: { notIn: ["COMPLETED", "FAILED", "CANCELLED"] },
        },
        select: { title: true, assignedTo: true, status: true, blockerDescription: true, deadlineAt: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }).catch(() => []),
      // Task-uri Owner total
      p.agentTask.findMany({
        where: { assignedBy: "OWNER" },
        select: { status: true },
      }).catch(() => []),
    ])

    // Filtrare zgomot
    const filterNoise = (items: any[]) => items.filter((t: any) =>
      !NOISE.test(t.title || "") && !NOISE.test(t.blockerDescription || "") && !NOISE.test(t.reason || "")
    )

    const ownerTotal = ownerTasks.length
    const ownerCompleted = ownerTasks.filter((t: any) => t.status === "COMPLETED").length

    // Funcție de curățare text (scoate limbaj tehnic)
    const cleanText = (s: string) => s
      .replace(/nivel\s*\d+/gi, "conducere")
      .replace(/OWNER/g, "conducere")
      .replace(/escalat/gi, "necesită decizie")

    const filteredPostponed = filterNoise(postponedTasks)
    const filteredOverdue = filterNoise(overdueTasks)
    const filteredOwnerBlocked = filterNoise(ownerBlockedTasks)

    diagnosis = {
      onTime: pipeline.completed,
      postponed: pipeline.postponed,
      ownerDependent: filteredOwnerBlocked.length,
      reasons: filteredPostponed.map((t: any) => ({
        task: t.title?.slice(0, 60),
        agent: t.assignedTo,
        reason: cleanText(t.blockerDescription?.slice(0, 80) || t.blockerType || "condiții neîndeplinite"),
        deadline: t.deadlineAt ? new Date(t.deadlineAt).toLocaleDateString("ro-RO") : "—",
        dependsOn: t.blockerAgentRole === "OWNER" ? "conducere" : t.blockerAgentRole || "—",
      })),
      overdue: filteredOverdue.map((t: any) => {
        const days = Math.ceil((now.getTime() - new Date(t.deadlineAt).getTime()) / (24 * 60 * 60 * 1000))
        // Cauza depășirii: blocker > failure > status contextual
        const cause = t.blockerDescription
          ? cleanText(t.blockerDescription.slice(0, 120))
          : t.blockerType === "WAITING_INPUT" ? "Așteaptă date de intrare"
          : t.blockerType === "WAITING_DEPENDENCY" ? "Depinde de alt task"
          : t.status === "BLOCKED" ? "Blocat — cauză nespecificată"
          : t.status === "ASSIGNED" ? "Neacceptat de agent — posibil ignorat"
          : t.status === "IN_PROGRESS" ? `În lucru de ${days} zile peste termen`
          : "Cauză neidentificată"
        return {
          task: t.title?.slice(0, 80),
          agent: t.assignedTo,
          assignedBy: t.assignedBy === "OWNER" ? "conducere" : t.assignedBy,
          deadline: new Date(t.deadlineAt).toLocaleDateString("ro-RO"),
          daysOverdue: days,
          status: t.status === "BLOCKED" ? "amânat" : t.status === "ASSIGNED" ? "alocat" : t.status === "IN_PROGRESS" ? "în lucru" : t.status,
          cause,
        }
      }),
      ownerBlocked: filteredOwnerBlocked.map((t: any) => ({
        task: t.title?.slice(0, 60),
        agent: t.assignedTo,
        status: t.status === "BLOCKED" ? "amânat" : t.status,
        reason: cleanText(t.blockerDescription?.slice(0, 80) || "Necesită decizia conducerii"),
        deadline: t.deadlineAt ? new Date(t.deadlineAt).toLocaleDateString("ro-RO") : "—",
      })),
    } as any

    // ═══ ÎNVĂȚARE + KB total ═══
    const [kbThisWeek, kbPrevWeek, kbTotal, laTotal, laThisWeek, laPrevWeek] = await Promise.all([
      p.$queryRaw`
        SELECT
          count(*) as total,
          count(*) FILTER (WHERE source = 'PROPAGATED') as from_internal,
          count(*) FILTER (WHERE source = 'DISTILLED_INTERACTION') as from_clients,
          count(*) FILTER (WHERE source IN ('SELF_INTERVIEW', 'EXPERT_HUMAN')) as from_seed
        FROM kb_entries WHERE "createdAt" > ${oneWeekAgo}
      ` as Promise<any[]>,
      p.kBEntry.count({ where: { createdAt: { gte: twoWeeksAgo, lt: oneWeekAgo } } }).catch(() => 0),
      p.kBEntry.count().catch(() => 0),
      p.learningArtifact.count().catch(() => 0),
      // Learning artifacts din execuții Claude (POST_EXECUTION) — ASTEA LIPSEAU
      p.$queryRaw`
        SELECT
          count(*) as total,
          count(*) FILTER (WHERE "sourceType" = 'POST_EXECUTION') as from_execution,
          count(*) FILTER (WHERE "sourceType" = 'EXTRAPOLATION') as from_extrapolation
        FROM learning_artifacts WHERE "createdAt" > ${oneWeekAgo}
      ` as Promise<any[]>,
      p.learningArtifact.count({ where: { createdAt: { gte: twoWeeksAgo, lt: oneWeekAgo } } }).catch(() => 0),
    ])

    const kbRow = kbThisWeek[0] || {}
    const laRow = laThisWeek[0] || {}
    const kbTotal7d = Number(kbRow.total || 0)
    const laTotal7d = Number(laRow.total || 0)
    const totalThisWeek = kbTotal7d + laTotal7d
    const fromInternal = Number(kbRow.from_internal || 0)
    const fromClients = Number(kbRow.from_clients || 0)
    const fromSeed = Number(kbRow.from_seed || 0)
    // Claude = seeduire (SELF_INTERVIEW din KB) + execuții (POST_EXECUTION din learning_artifacts)
    const fromClaude = fromSeed + Number(laRow.from_execution || 0) + Number(laRow.from_extrapolation || 0)

    // KB zilnic (azi + ieri)
    const today = new Date(); today.setHours(0,0,0,0)
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
    const [kbToday, kbYesterday] = await Promise.all([
      p.kBEntry.count({ where: { createdAt: { gte: today } } }).catch(() => 0),
      p.kBEntry.count({ where: { createdAt: { gte: yesterday, lt: today } } }).catch(() => 0),
    ])

    learning = {
      total: totalThisWeek,
      prevTotal: Number(kbPrevWeek || 0) + Number(laPrevWeek || 0),
      totalKB: Number(kbTotal || 0) + Number(laTotal || 0),
      fromInternal,
      fromClients,
      fromClaude,
      fromSeed,
      fromExternal: Math.max(0, totalThisWeek - fromInternal - fromClients - fromClaude - fromSeed),
      todayKB: kbToday,
      yesterdayKB: kbYesterday,
    }

    // ═══ OBIECTIVE ═══
    const objectiveStats = await p.$queryRaw`
      SELECT o.title, o.status, o.priority,
        count(t.id) as total_tasks,
        count(t.id) FILTER (WHERE t.status = 'COMPLETED') as completed_tasks
      FROM organizational_objectives o
      LEFT JOIN agent_tasks t ON t."objectiveId" = o.id AND t."createdAt" > ${oneWeekAgo}
      WHERE o.status IN ('PROPOSED','APPROVED','ACTIVE')
      GROUP BY o.id, o.title, o.status, o.priority
      ORDER BY o.priority ASC, total_tasks DESC
    `.catch(() => []) as any[]

    objectives = objectiveStats.map((o: any) => ({
      title: o.title,
      status: o.status,
      priority: o.priority,
      tasks: Number(o.total_tasks || 0),
      completed: Number(o.completed_tasks || 0),
      progress: Number(o.total_tasks || 0) > 0 ? Math.round(Number(o.completed_tasks || 0) / Number(o.total_tasks || 0) * 100) : 0,
    }))

    // ═══ PER AGENT ═══
    const definitions = await p.agentDefinition.findMany({
      where: { isActive: true }, orderBy: { agentRole: "asc" },
      select: { agentRole: true, displayName: true, level: true, isManager: true },
    })

    const [agentTasks, agentKB, agentKBTotal] = await Promise.all([
      p.$queryRaw`
        SELECT "assignedTo" as role,
          count(*) as total,
          count(*) FILTER (WHERE status = 'COMPLETED') as completed,
          count(*) FILTER (WHERE status = 'COMPLETED' AND "kbHit" = true) as kb_resolved,
          count(*) FILTER (WHERE status = 'COMPLETED' AND ("kbHit" = false OR "kbHit" IS NULL)) as real_executed,
          count(*) FILTER (WHERE status = 'BLOCKED') as postponed
        FROM agent_tasks WHERE "createdAt" > ${oneWeekAgo}
        GROUP BY "assignedTo"
      ` as Promise<any[]>,
      p.$queryRaw`
        SELECT role, sum(learned) as learned FROM (
          SELECT "agentRole" as role, count(*) as learned FROM kb_entries WHERE "createdAt" > ${oneWeekAgo} GROUP BY "agentRole"
          UNION ALL
          SELECT "studentRole" as role, count(*) as learned FROM learning_artifacts WHERE "createdAt" > ${oneWeekAgo} GROUP BY "studentRole"
        ) combined GROUP BY role
      ` as Promise<any[]>,
      p.$queryRaw`
        SELECT role, sum(total) as total FROM (
          SELECT "agentRole" as role, count(*) as total FROM kb_entries WHERE status = 'PERMANENT'::"KBStatus" GROUP BY "agentRole"
          UNION ALL
          SELECT "studentRole" as role, count(*) as total FROM learning_artifacts GROUP BY "studentRole"
        ) combined GROUP BY role
      ` as Promise<any[]>,
    ])

    const taskMap = new Map(agentTasks.map((r: any) => [r.role, { total: Number(r.total), completed: Number(r.completed), kbResolved: Number(r.kb_resolved), realExecuted: Number(r.real_executed), postponed: Number(r.postponed) }]))
    const kbMapWeek = new Map(agentKB.map((r: any) => [r.role, Number(r.learned)]))
    const kbMapTotal = new Map(agentKBTotal.map((r: any) => [r.role, Number(r.total)]))

    // Maturitate per agent: 5 straturi + KB hit rate
    const maturityData = await p.$queryRaw`
      SELECT
        la."studentRole" as role,
        count(*) FILTER (WHERE la."problemClass" = 'procedure') > 0 as has_sop,
        count(*) FILTER (WHERE la."problemClass" IN ('domain-knowledge', 'domain-ro-evaluare-posturi', 'domain-ro-benchmarking-salarial')) > 0 as has_domain,
        count(*) FILTER (WHERE la."problemClass" = 'business-knowledge') > 0 as has_business,
        count(*) FILTER (WHERE la."problemClass" = 'field-moral-procedure') > 0 as has_field,
        count(*) FILTER (WHERE la."problemClass" LIKE 'course-%' OR la."problemClass" LIKE 'skill-%') > 0 as has_skills
      FROM learning_artifacts la
      GROUP BY la."studentRole"
    `.catch(() => []) as any[]
    const maturityMap = new Map(maturityData.map((r: any) => [r.role, r]))

    // KB hit rate din telemetry (ultimele 7 zile)
    const hitRateData = await p.$queryRaw`
      SELECT
        "agentRole" as role,
        count(*) as total,
        count(*) FILTER (WHERE "kbHit" = true) as hits
      FROM execution_telemetry
      WHERE "createdAt" > ${new Date(Date.now() - 7 * 24 * 3600000)}
      GROUP BY "agentRole"
    `.catch(() => []) as any[]
    const hitRateMap = new Map(hitRateData.map((r: any) => [r.role, { total: Number(r.total), hits: Number(r.hits) }]))

    agents = definitions.map((d: any) => {
      const t = taskMap.get(d.agentRole) || { total: 0, completed: 0, kbResolved: 0, realExecuted: 0, postponed: 0 }
      const m = maturityMap.get(d.agentRole) || {}
      const hr = hitRateMap.get(d.agentRole) || { total: 0, hits: 0 }

      // Maturitate: 5 straturi × 20% fiecare
      const layers = [m.has_sop, m.has_domain, m.has_business, m.has_field, m.has_skills]
      const seedScore = layers.filter(Boolean).length * 20

      // KB hit rate
      const kbHitRate = hr.total > 0 ? Math.round(hr.hits / hr.total * 100) : null

      // Maturitate globală: seeduire (60%) + hit rate (40%)
      const maturityScore = kbHitRate !== null
        ? Math.round(seedScore * 0.6 + kbHitRate * 0.4)
        : seedScore

      return {
        role: d.agentRole, name: d.displayName || d.agentRole,
        level: d.level, isManager: d.isManager,
        tasks: t.total, completed: t.completed,
        kbResolved: t.kbResolved || 0, realExecuted: t.realExecuted || 0,
        postponed: t.postponed,
        completionRate: t.total > 0 ? Math.round(t.completed / t.total * 100) : null,
        realRate: t.total > 0 ? Math.round((t.realExecuted || 0) / t.total * 100) : null,
        learnedWeek: kbMapWeek.get(d.agentRole) || 0,
        kbTotal: kbMapTotal.get(d.agentRole) || 0,
        maturityScore,
        seedScore,
        kbHitRate,
      }
    }).filter((a: any) => a.tasks > 0 || a.learnedWeek > 0 || a.kbTotal > 0)

  } catch (e) {
    console.error("[agents-report]", e)
  }

  const completionRate = pipeline.total > 0 ? Math.round(pipeline.completed / pipeline.total * 100) : 0
  const escalationRate = pipeline.total > 0 ? Math.round(pipeline.escalated / pipeline.total * 100) : 0
  const learningGrowth = learning.prevTotal > 0
    ? Math.round((learning.total - learning.prevTotal) / learning.prevTotal * 100)
    : learning.total > 0 ? 100 : 0
  const lt = learning.total || 1
  const pctInternal = Math.round(learning.fromInternal / lt * 100)
  const pctClients = Math.round(learning.fromClients / lt * 100)
  const pctClaude = Math.round(learning.fromClaude / lt * 100)
  const pctExternal = Math.round(learning.fromExternal / lt * 100)

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

        {/* 3 perioade: Azi / 7 zile / Cumulat */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* AZI */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-2">Azi</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xl font-bold text-slate-800">{pipeline.total}</p>
                <p className="text-[10px] text-slate-400">Create</p>
                {pipeline.yesterdayTotal > 0 && (
                  <p className={`text-[9px] font-bold ${pipeline.total >= pipeline.yesterdayTotal ? "text-emerald-600" : "text-amber-600"}`}>
                    {pipeline.total >= pipeline.yesterdayTotal ? "+" : ""}{pipeline.total - pipeline.yesterdayTotal} vs ieri
                  </p>
                )}
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{pipeline.completed}</p>
                <p className="text-[10px] text-slate-400">Completate</p>
                {pipeline.yesterdayCompleted > 0 && (
                  <p className={`text-[9px] font-bold ${pipeline.completed >= pipeline.yesterdayCompleted ? "text-emerald-600" : "text-amber-600"}`}>
                    {pipeline.completed >= pipeline.yesterdayCompleted ? "+" : ""}{pipeline.completed - pipeline.yesterdayCompleted} vs ieri
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 7 ZILE */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold mb-2">7 zile</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xl font-bold text-slate-800">{pipeline.totalWeek}</p>
                <p className="text-[10px] text-slate-400">Create</p>
                {pipeline.prevWeekTotal > 0 && (
                  <p className={`text-[9px] font-bold ${pipeline.totalWeek >= pipeline.prevWeekTotal ? "text-emerald-600" : "text-amber-600"}`}>
                    {pipeline.totalWeek >= pipeline.prevWeekTotal ? "+" : ""}{pipeline.totalWeek - pipeline.prevWeekTotal} vs sapt. ant.
                  </p>
                )}
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{pipeline.completedWeek}</p>
                <p className="text-[10px] text-slate-400">Completate</p>
                {pipeline.prevWeekCompleted > 0 && (
                  <p className={`text-[9px] font-bold ${pipeline.completedWeek >= pipeline.prevWeekCompleted ? "text-emerald-600" : "text-amber-600"}`}>
                    {pipeline.completedWeek >= pipeline.prevWeekCompleted ? "+" : ""}{pipeline.completedWeek - pipeline.prevWeekCompleted} vs sapt. ant.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* CUMULAT */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <p className="text-[10px] text-indigo-400 uppercase tracking-wide font-bold mb-2">Cumulat</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-2xl font-bold text-slate-800">{pipeline.cumulativeTotal.toLocaleString("ro-RO")}</p>
                <p className="text-[10px] text-slate-400">Total create</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-600">{pipeline.cumulativeCompleted.toLocaleString("ro-RO")}</p>
                <p className="text-[10px] text-slate-400">Total completate</p>
                {pipeline.cumulativeTotal > 0 && (
                  <p className="text-[9px] text-indigo-500 font-bold">
                    {Math.round(pipeline.cumulativeCompleted / pipeline.cumulativeTotal * 100)}% rata globala
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status + Claude calls */}
        <div className="grid grid-cols-4 gap-3">
          <SC label="In lucru" value={pipeline.inProgress} accent="indigo" />
          <SC label="Amanate" value={pipeline.postponed} accent={pipeline.postponed > 0 ? "amber" : undefined} />
          <SC label="Rata escalare" value={`${escalationRate}%`} accent={escalationRate > 30 ? "red" : undefined} />
          <div className="bg-white rounded-xl border border-slate-200 p-3">
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Apeluri Claude azi</p>
            <p className="text-xl font-bold text-violet-600 mt-1">{pipeline.claudeCalls}</p>
            <div className="flex items-center gap-1 mt-0.5">
              {pipeline.claudeCallsYesterday > 0 && (
                <span className={`text-[9px] font-bold ${pipeline.claudeCalls < pipeline.claudeCallsYesterday ? "text-emerald-600" : "text-red-500"}`}>
                  {pipeline.claudeCalls < pipeline.claudeCallsYesterday ? "↓" : "↑"}{Math.abs(Math.round((1 - pipeline.claudeCalls / pipeline.claudeCallsYesterday) * 100))}% vs ieri
                </span>
              )}
            </div>
            <p className="text-[9px] text-slate-400 mt-0.5">${pipeline.costToday} azi · ${pipeline.costWeek} /7z · {pipeline.claudeCallsWeek} total</p>
          </div>
        </div>
        <div className="mt-3 bg-slate-100 rounded-full h-3 overflow-hidden">
          <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${completionRate}%` }} />
        </div>
        <p className="text-xs text-slate-400 mt-1">{completionRate}% rata de completare (azi)</p>
      </section>

      {/* ═══ DIAGNOZĂ ═══ */}
      <section>
        <h2 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">Diagnoză: de ce alocate ≠ realizate</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <SC label="Finalizate la termen" value={diagnosis.onTime} accent="emerald" />
          <SC label="Amânate (condiții neîndeplinite)" value={diagnosis.postponed} accent="amber" />
          <SC label="Depind de Owner" value={diagnosis.ownerDependent} accent={diagnosis.ownerDependent > 0 ? "red" : undefined} />
        </div>

        {/* Task-uri cu termen depășit */}
        {(diagnosis as any).overdue?.length > 0 && (
          <div className="bg-red-50 rounded-xl border border-red-200 p-4 mb-4">
            <h3 className="text-xs font-bold text-red-700 mb-2">Termen depășit</h3>
            <div className="space-y-2">
              {(diagnosis as any).overdue.map((r: any, i: number) => (
                <div key={i} className="flex items-start gap-3 text-xs border-b border-red-100 pb-2">
                  <span className="text-red-600 font-bold shrink-0 w-8 text-center">+{r.daysOverdue}z</span>
                  <span className="text-red-500 font-medium shrink-0 w-16">{r.agent}</span>
                  <div className="flex-1">
                    <p className="text-slate-700 font-medium">{r.task}</p>
                    <p className="text-red-600/70 mt-0.5">Cauza: {r.cause}</p>
                    <p className="text-slate-400 mt-0.5">Termen: {r.deadline} · Alocat de: {r.assignedBy} · Status: {r.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Task-uri care depind de Owner */}
        {(diagnosis as any).ownerBlocked?.length > 0 && (
          <div className="bg-violet-50 rounded-xl border border-violet-200 p-4 mb-4">
            <h3 className="text-xs font-bold text-violet-700 mb-2">Necesită atenția ta (Owner)</h3>
            <div className="space-y-2">
              {(diagnosis as any).ownerBlocked.map((r: any, i: number) => (
                <div key={i} className="flex items-start gap-3 text-xs border-b border-violet-100 pb-2">
                  <span className="text-violet-500 font-bold shrink-0">{r.agent}</span>
                  <div className="flex-1">
                    <p className="text-slate-700">{r.task}</p>
                    <p className="text-slate-400 mt-0.5">{r.reason} · Termen: {r.deadline}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Task-uri amânate — motive */}
        {diagnosis.reasons.length > 0 && (
          <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
            <h3 className="text-xs font-bold text-amber-700 mb-2">Task-uri amânate — motive</h3>
            <div className="space-y-2">
              {diagnosis.reasons.map((r: any, i: number) => (
                <div key={i} className="flex items-start gap-3 text-xs border-b border-amber-100 pb-2">
                  <span className="text-amber-500 font-bold shrink-0">{r.agent}</span>
                  <div className="flex-1">
                    <p className="text-slate-700">{r.task}</p>
                    <p className="text-slate-400 mt-0.5">Motiv: {r.reason} · Depinde de: {r.dependsOn} · Termen: {r.deadline}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ═══ OBIECTIVE ═══ */}
      {objectives.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">Progres pe obiective</h2>
          <div className="space-y-2">
            {objectives.map((o: any, i: number) => (
              <div key={i} className="bg-white rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-700 flex-1">{o.title}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded ${o.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{o.status}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${o.progress}%` }} />
                  </div>
                  <span className="text-xs text-slate-500 tabular-nums w-20 text-right">{o.completed}/{o.tasks} tasks · {o.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ ÎNVĂȚARE ═══ */}
      <section>
        <h2 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">Învățare organism</h2>

        {/* Pipeline învățare: 3 perioade */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Azi</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{learning.todayKB}</p>
            <p className="text-[10px] text-slate-400 mt-1">
              {learning.todayKB > learning.yesterdayKB ? <span className="text-emerald-600">+{learning.todayKB - learning.yesterdayKB} vs ieri</span>
                : learning.todayKB < learning.yesterdayKB ? <span className="text-red-500">{learning.todayKB - learning.yesterdayKB} vs ieri</span>
                : <span>= vs ieri</span>}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-[10px] text-slate-400 uppercase font-bold">7 zile</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{learning.total}</p>
            <p className="text-[10px] text-slate-400 mt-1">
              {learningGrowth > 0 ? <span className="text-emerald-600">+{learningGrowth}% vs anterioară</span>
                : learningGrowth < 0 ? <span className="text-red-500">{learningGrowth}% vs anterioară</span>
                : <span>= vs anterioară</span>}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-[10px] text-slate-400 uppercase font-bold">Cumulat</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{learning.totalKB.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 mt-1">entries total</p>
          </div>
        </div>

        {/* Surse */}
        <div className="grid grid-cols-4 gap-3">
          <SC label="Structura internă" value={`${pctInternal}%`} subtitle={`${learning.fromInternal} entries`} accent="indigo" />
          <SC label="Interacțiuni" value={`${pctClients}%`} subtitle={`${learning.fromClients} entries`} accent="violet" />
          <SC label="Claude (incl. seeduire)" value={`${pctClaude}%`} subtitle={`${learning.fromClaude} entries`} accent="amber" />
          <SC label="Surse externe" value={`${pctExternal}%`} subtitle={`${learning.fromExternal} entries`} accent="slate" />
        </div>
        <div className="mt-3 flex rounded-full h-3 overflow-hidden">
          {pctInternal > 0 && <div className="bg-indigo-500 h-full" style={{ width: `${pctInternal}%` }} />}
          {pctClients > 0 && <div className="bg-violet-500 h-full" style={{ width: `${pctClients}%` }} />}
          {pctClaude > 0 && <div className="bg-amber-400 h-full" style={{ width: `${pctClaude}%` }} />}
          {pctExternal > 0 && <div className="bg-slate-400 h-full" style={{ width: `${pctExternal}%` }} />}
        </div>
        <div className="flex gap-4 mt-2 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-indigo-500" /> Intern</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-violet-500" /> Interacțiuni</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400" /> Claude (incl. seeduire)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-slate-400" /> Extern</span>
        </div>
      </section>

      {/* ═══ DIRECȚIE ═══ */}
      <section>
        <h2 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">Direcție de creștere</h2>
        <div className="grid grid-cols-3 gap-4">
          <DC label="Autonomie" desc="Rezolvare fără escalare" value={100 - escalationRate} target={80} unit="%" />
          <DC label="Dependență Claude" desc="% învățare de la Claude" value={pctClaude} target={30} inverted unit="%" />
          <DC label="Experiență interacțiuni" desc="Învățare din conversații reale" value={pctClients} target={40} unit="%" />
        </div>
      </section>

      {/* ═══ TABEL AGENȚI ═══ */}
      {agents.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wide">Agenți — detalii</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="text-left px-3 py-2">Agent</th>
                  <th className="text-left px-3 py-2">Nivel</th>
                  <th className="text-right px-3 py-2">KB</th>
                  <th className="text-right px-3 py-2">Seed %</th>
                  <th className="text-right px-3 py-2">KB Hit</th>
                  <th className="text-right px-3 py-2">Maturitate</th>
                  <th className="text-right px-3 py-2">Învățat 7z</th>
                  <th className="text-right px-3 py-2">Tasks</th>
                  <th className="text-right px-3 py-2">Făcut</th>
                  <th className="text-right px-3 py-2">Știut</th>
                  <th className="text-right px-3 py-2">Amânate</th>
                  <th className="text-right px-3 py-2" title="Raport Făcut/Știut — presiunea de a converti cunoaștere în acțiune">Conversie</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a: any) => (
                  <tr key={a.role} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-3 py-2">
                      <span className="font-medium text-slate-800">{a.name}</span>
                      {a.isManager && <span className="ml-1 text-[9px] text-indigo-500 font-bold">MGR</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-400">{a.level}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-600">{a.kbTotal}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`font-bold ${a.seedScore >= 80 ? "text-emerald-600" : a.seedScore >= 40 ? "text-amber-600" : "text-red-600"}`}>
                        {a.seedScore}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-violet-600">{a.kbHitRate !== null ? `${a.kbHitRate}%` : "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <span className={`font-bold ${a.maturityScore >= 80 ? "text-emerald-600" : a.maturityScore >= 50 ? "text-amber-600" : "text-red-600"}`}>
                        {a.maturityScore}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-indigo-600">{a.learnedWeek || "—"}</td>
                    <td className="px-3 py-2 text-right font-mono">{a.tasks || "—"}</td>
                    <td className="px-3 py-2 text-right font-mono text-emerald-600" title="Executat real cu AI">{a.realExecuted || "—"}</td>
                    <td className="px-3 py-2 text-right font-mono text-amber-500" title="KB-RESOLVED — știut din memorie, nu neapărat acționat">
                      {a.kbResolved ? (
                        <span className={a.kbResolved > a.realExecuted ? "text-amber-600 font-bold" : "text-amber-400"}>
                          {a.kbResolved}
                          {a.kbResolved > a.realExecuted * 2 && <span className="text-[9px] text-red-500 ml-1" title="Știe mult, face puțin">!</span>}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-400">{a.postponed || "—"}</td>
                    <td className="px-3 py-2 text-right" title="Făcut / (Făcut+Știut) — cât din ce știe se transformă în acțiune">
                      {(a.realExecuted || a.kbResolved) ? (() => {
                        const total = (a.realExecuted || 0) + (a.kbResolved || 0)
                        const conversion = total > 0 ? Math.round((a.realExecuted || 0) / total * 100) : 0
                        return (
                          <span className={`font-bold ${conversion >= 60 ? "text-emerald-600" : conversion >= 30 ? "text-amber-600" : "text-red-600"}`}>
                            {conversion}%
                          </span>
                        )
                      })() : "—"}
                    </td>
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

function SC({ label, value, subtitle, accent }: { label: string; value: string | number; subtitle?: string; accent?: string }) {
  const c: Record<string, string> = { emerald: "text-emerald-600", red: "text-red-600", amber: "text-amber-600", indigo: "text-indigo-600", violet: "text-violet-600", slate: "text-slate-600" }
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3">
      <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 ${accent ? c[accent] || "text-slate-800" : "text-slate-800"}`}>{value}</p>
      {subtitle && <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}

function DC({ label, desc, value, target, inverted, unit }: { label: string; desc: string; value: number; target: number; inverted?: boolean; unit: string }) {
  const good = inverted ? value <= target : value >= target
  return (
    <div className={`rounded-xl border p-4 ${good ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
      <p className="text-xs font-bold text-slate-700">{label}</p>
      <p className="text-[10px] text-slate-400 mt-0.5">{desc}</p>
      <div className="flex items-end justify-between mt-3">
        <p className={`text-3xl font-bold ${good ? "text-emerald-600" : "text-amber-600"}`}>{value}{unit}</p>
        <p className="text-[10px] text-slate-400">țintă: {target}{unit}</p>
      </div>
    </div>
  )
}
