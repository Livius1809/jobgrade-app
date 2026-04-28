/**
 * organism-health.ts — Diagnostic complet organism
 *
 * Ruleaza: npx tsx scripts/organism-health.ts
 * Verifica TOATE sistemele si raporteaza verde/galben/rosu per componenta.
 */
process.env.DATABASE_URL = "postgresql://neondb_owner:npg_F3tgLQ4mZnca@ep-divine-union-alg0gr3m-pooler.c-3.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"

import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

type Status = "VERDE" | "GALBEN" | "ROSU"

interface Check {
  component: string
  status: Status
  detail: string
  metric?: number
}

async function main() {
  const now = new Date()
  const h1 = new Date(now.getTime() - 1 * 3600000)
  const h6 = new Date(now.getTime() - 6 * 3600000)
  const h24 = new Date(now.getTime() - 24 * 3600000)
  const h48 = new Date(now.getTime() - 48 * 3600000)
  const d7 = new Date(now.getTime() - 7 * 24 * 3600000)
  const p = prisma as any

  console.log("=".repeat(70))
  console.log("  DIAGNOSTIC ORGANISM — " + now.toISOString().slice(0, 16))
  console.log("  DB: " + new URL(process.env.DATABASE_URL!).host)
  console.log("=".repeat(70))

  const checks: Check[] = []

  // ═══ 1. CRON EXECUTOR ═══
  const lastRun = await prisma.systemConfig.findUnique({ where: { key: "EXECUTOR_LAST_RUN" } })
  if (lastRun?.value) {
    const age = (now.getTime() - new Date(lastRun.value).getTime()) / 3600000
    checks.push({
      component: "Cron Executor",
      status: age < 1 ? "VERDE" : age < 2 ? "GALBEN" : "ROSU",
      detail: `Ultimul run: ${Math.round(age * 60)}min in urma`,
      metric: Math.round(age * 60),
    })
  } else {
    checks.push({ component: "Cron Executor", status: "ROSU", detail: "EXECUTOR_LAST_RUN = NOT SET (timestamps nu se salveaza?)" })
  }

  // ═══ 2. PROACTIVE LOOP ═══
  const cycles48h = await p.cycleLog?.count({ where: { startedAt: { gte: h48 } } }).catch(() => 0) ?? 0
  const cyclesRecent = await p.cycleLog?.findMany({
    where: { startedAt: { gte: h48 } },
    select: { agentRole: true, startedAt: true },
    orderBy: { startedAt: "desc" },
    take: 5,
  }).catch(() => []) ?? []

  if (cycles48h > 0) {
    const managers = [...new Set(cyclesRecent.map((c: any) => c.agentRole))]
    checks.push({
      component: "Proactive Loop",
      status: cycles48h >= 7 ? "VERDE" : "GALBEN",
      detail: `${cycles48h} cicluri in 48h. Manageri activi: ${managers.join(", ")}`,
      metric: cycles48h,
    })
  } else {
    checks.push({ component: "Proactive Loop", status: "ROSU", detail: "ZERO cicluri in 48h — managerii nu ruleaza" })
  }

  // ═══ 3. LEARNING ENGINE ═══
  const learningLast = await prisma.systemConfig.findUnique({ where: { key: "LEARNING_ORCHESTRATOR_LAST_DAILY" } })
  const artifacts24h = await prisma.learningArtifact.count({ where: { createdAt: { gte: h24 } } })
  const totalArtifacts = await prisma.learningArtifact.count()

  if (learningLast?.value) {
    const age = (now.getTime() - new Date(learningLast.value).getTime()) / 3600000
    checks.push({
      component: "Learning Engine (daily)",
      status: age < 25 ? "VERDE" : age < 50 ? "GALBEN" : "ROSU",
      detail: `Ultima rulare daily: ${Math.round(age)}h in urma. Artifacts 24h: ${artifacts24h}. Total: ${totalArtifacts}`,
      metric: artifacts24h,
    })
  } else {
    checks.push({
      component: "Learning Engine (daily)",
      status: "ROSU",
      detail: `NEVER RUN pe prod. Artifacts 24h: ${artifacts24h}. Total: ${totalArtifacts}`,
    })
  }

  // ═══ 4. OPERATIONAL ENGINE ═══
  const opLast = await prisma.systemConfig.findUnique({ where: { key: "OPERATIONAL_ENGINE_LAST" } })
  if (opLast?.value) {
    try {
      const report = JSON.parse(opLast.value)
      checks.push({
        component: "Operational Engine",
        status: report.anomalyCount.critical === 0 ? (report.anomalyCount.high === 0 ? "VERDE" : "GALBEN") : "ROSU",
        detail: `Anomalii: ${report.anomalyCount.total} (${report.anomalyCount.critical}C ${report.anomalyCount.high}H). Auto-remedieri: ${report.autoRemediationsApplied}`,
        metric: report.anomalyCount.total,
      })
    } catch {
      checks.push({ component: "Operational Engine", status: "GALBEN", detail: "Snapshot exista dar nu se parseaza" })
    }
  } else {
    checks.push({ component: "Operational Engine", status: "ROSU", detail: "NEVER RUN — self-check nu ruleaza" })
  }

  // ═══ 5. TASK EXECUTION ═══
  const completed6h = await prisma.agentTask.count({ where: { completedAt: { gte: h6 }, status: "COMPLETED" } })
  const kbHit6h = await prisma.agentTask.count({ where: { completedAt: { gte: h6 }, status: "COMPLETED", kbHit: true } })
  const kbRate = completed6h > 0 ? Math.round((kbHit6h / completed6h) * 100) : 0
  const realRate = 100 - kbRate

  checks.push({
    component: "Task Execution (6h)",
    status: completed6h > 0 ? (realRate >= 30 ? "VERDE" : "GALBEN") : "ROSU",
    detail: `${completed6h} completate. KB-hit: ${kbRate}%. Real exec: ${realRate}%`,
    metric: completed6h,
  })

  // ═══ 6. REVIEW PENDING ═══
  const reviewPending = await prisma.agentTask.count({ where: { status: "REVIEW_PENDING" as any } })
  checks.push({
    component: "Review Queue",
    status: reviewPending < 20 ? "VERDE" : reviewPending < 50 ? "GALBEN" : "ROSU",
    detail: `${reviewPending} task-uri asteapta review de la manageri`,
    metric: reviewPending,
  })

  // ═══ 7. BUCLE / LOOPS ═══
  const cancelledRecent = await prisma.agentTask.count({
    where: { status: "CANCELLED", updatedAt: { gte: h24 }, title: { contains: "Reconfigurare atributii" } },
  })
  const selfCheckLoops = await prisma.agentTask.count({
    where: { status: "CANCELLED", updatedAt: { gte: h24 }, title: { contains: "Self-check" } },
  })
  const returnLoops = await prisma.agentTask.count({
    where: { status: { in: ["ASSIGNED", "ACCEPTED"] }, title: { startsWith: "[Returnat]" }, createdAt: { gte: h24 } },
  })

  const loopCount = cancelledRecent + selfCheckLoops + returnLoops
  checks.push({
    component: "Bucle detectate (24h)",
    status: loopCount === 0 ? "VERDE" : loopCount < 5 ? "GALBEN" : "ROSU",
    detail: `Reconfig: ${cancelledRecent}x, Self-check: ${selfCheckLoops}x, Retururi: ${returnLoops}x`,
    metric: loopCount,
  })

  // ═══ 8. ESCALADARI OWNER ═══
  const ownerNotifs = await p.notification?.count({
    where: { type: "AGENT_MESSAGE", createdAt: { gte: h24 }, respondedAt: null },
  }).catch(() => 0) ?? 0

  checks.push({
    component: "Escaladari Owner (24h)",
    status: ownerNotifs <= 1 ? "VERDE" : ownerNotifs <= 3 ? "GALBEN" : "ROSU",
    detail: `${ownerNotifs} notificari active nerezolvate`,
    metric: ownerNotifs,
  })

  // ═══ 9. KB HEALTH ═══
  const validated = await prisma.learningArtifact.count({ where: { validated: true } })
  const validatedPct = totalArtifacts > 0 ? Math.round((validated / totalArtifacts) * 100) : 0

  checks.push({
    component: "KB Health",
    status: validatedPct >= 40 ? "VERDE" : validatedPct >= 20 ? "GALBEN" : "ROSU",
    detail: `${totalArtifacts} total, ${validated} validate (${validatedPct}%). Artifacts 24h: ${artifacts24h}`,
    metric: validatedPct,
  })

  // ═══ 10. OBIECTIVE ═══
  const objectivesActive = await prisma.organizationalObjective.count({ where: { status: { not: "ARCHIVED" } } })
  const tasksOnObjectives = await prisma.agentTask.count({
    where: { createdAt: { gte: d7 }, objectiveId: { not: null }, status: { not: "CANCELLED" } },
  })

  checks.push({
    component: "Obiective",
    status: tasksOnObjectives > 0 ? "VERDE" : "GALBEN",
    detail: `${objectivesActive} active. ${tasksOnObjectives} task-uri legate de obiective in 7 zile`,
    metric: objectivesActive,
  })

  // ═══ 11. BLOCKED TASKS ═══
  const blocked = await prisma.agentTask.count({ where: { status: "BLOCKED" } })
  checks.push({
    component: "Task-uri BLOCKED",
    status: blocked === 0 ? "VERDE" : blocked < 10 ? "GALBEN" : "ROSU",
    detail: `${blocked} blocate activ`,
    metric: blocked,
  })

  // ═══ 12. META-ORGANISM KB ═══
  const metaKB = await p.kBEntry?.count({
    where: { tags: { hasSome: ["meta-organism"] } },
  }).catch(() => 0) ?? 0

  checks.push({
    component: "Meta-organism KB",
    status: metaKB >= 70 ? "VERDE" : metaKB > 0 ? "GALBEN" : "ROSU",
    detail: `${metaKB} agenti au KB meta-organism`,
    metric: metaKB,
  })

  // ═══ 13. COST ESTIMATE ═══
  // ~$0.015 per task completion cu Haiku, ~$0.08 cu Sonnet
  const estimatedCost = completed6h * 0.015 + (completed6h * 0.1 * 0.08) // 10% Sonnet
  checks.push({
    component: "Cost estimat (6h)",
    status: estimatedCost < 1 ? "VERDE" : estimatedCost < 3 ? "GALBEN" : "ROSU",
    detail: `~$${estimatedCost.toFixed(2)} estimat (${completed6h} tasks × avg $0.02)`,
    metric: Math.round(estimatedCost * 100) / 100,
  })

  // ═══ 14. TASK-URI PRODUCTIVE VS SPAM ═══
  const created6h = await prisma.agentTask.count({ where: { createdAt: { gte: h6 } } })
  const cancelled6h = await prisma.agentTask.count({ where: { status: "CANCELLED", updatedAt: { gte: h6 } } })
  const productiveRatio = created6h > 0 ? Math.round(((created6h - cancelled6h) / created6h) * 100) : 100

  checks.push({
    component: "Task-uri productive (6h)",
    status: productiveRatio >= 70 ? "VERDE" : productiveRatio >= 40 ? "GALBEN" : "ROSU",
    detail: `Create: ${created6h}, Anulate: ${cancelled6h}. Ratio productiv: ${productiveRatio}%`,
    metric: productiveRatio,
  })

  // ═══ RAPORT ═══
  console.log("")
  const verde = checks.filter(c => c.status === "VERDE").length
  const galben = checks.filter(c => c.status === "GALBEN").length
  const rosu = checks.filter(c => c.status === "ROSU").length

  console.log(`VERDICT: ${verde} VERDE | ${galben} GALBEN | ${rosu} ROSU`)
  console.log("-".repeat(70))

  for (const check of checks) {
    const icon = check.status === "VERDE" ? "[OK]" : check.status === "GALBEN" ? "[!!]" : "[XX]"
    const pad = check.component.padEnd(28)
    console.log(`  ${icon} ${pad} ${check.detail}`)
  }

  console.log("-".repeat(70))

  if (rosu > 0) {
    console.log("\nACTIUNI NECESARE:")
    for (const check of checks.filter(c => c.status === "ROSU")) {
      console.log(`  FIX: ${check.component} — ${check.detail}`)
    }
  }

  if (galben > 0) {
    console.log("\nDE MONITORIZAT:")
    for (const check of checks.filter(c => c.status === "GALBEN")) {
      console.log(`  WATCH: ${check.component} — ${check.detail}`)
    }
  }

  if (rosu === 0 && galben === 0) {
    console.log("\nTOATE SISTEMELE FUNCTIONALE. Organismul respira normal.")
  }

  console.log("")
}

main().catch(e => console.error(e.message)).finally(() => prisma.$disconnect())
