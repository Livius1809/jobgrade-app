process.env.DATABASE_URL = "postgresql://neondb_owner:npg_F3tgLQ4mZnca@ep-divine-union-alg0gr3m-pooler.c-3.eu-central-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require"

import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("DB:", new URL(process.env.DATABASE_URL!).host)

  // 1. Obiective active
  console.log("\n=== 1. OBIECTIVE ORGANIZATIONALE ===")
  const objectives = await prisma.organizationalObjective.findMany({
    where: { status: { not: "ARCHIVED" } },
    select: { code: true, title: true, status: true, priority: true, currentValue: true, targetValue: true },
    orderBy: { priority: "asc" },
  })
  if (objectives.length === 0) {
    console.log("  ZERO obiective active! Structura nu are pe ce sa lucreze.")
  } else {
    for (const o of objectives) {
      console.log("  " + o.code + " | " + o.status + " | " + o.priority + " | " + (o.title || "").slice(0, 50))
    }
  }

  // 2. KB hit rate — de ce totul e kbHit?
  console.log("\n=== 2. KB HIT RATE (ultimele 50 completate) ===")
  const recent = await prisma.agentTask.findMany({
    where: { status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    take: 50,
    select: { kbHit: true, result: true, assignedTo: true, title: true, completedAt: true },
  })
  const kbHits = recent.filter(t => t.kbHit)
  const realExec = recent.filter(t => !t.kbHit)
  console.log("  kbHit=true: " + kbHits.length + "/50 (" + Math.round(kbHits.length / 50 * 100) + "%)")
  console.log("  kbHit=false: " + realExec.length + "/50")

  // Mostre kbHit — ce "stie" din KB
  console.log("\n  Mostre kbHit=true (ce recita):")
  for (const t of kbHits.slice(0, 5)) {
    const snippet = (t.result || "").slice(0, 80).replace(/\n/g, " ")
    console.log("    " + t.assignedTo + " | " + (t.title || "").slice(0, 40) + " → " + snippet)
  }

  // 3. REVIEW_PENDING — cine ar trebui sa review-eze
  console.log("\n=== 3. REVIEW_PENDING — cine trebuie sa review-eze ===")
  const pending = await prisma.agentTask.findMany({
    where: { status: "REVIEW_PENDING" as any },
    select: { assignedTo: true, assignedBy: true, title: true, completedAt: true },
    orderBy: { completedAt: "desc" },
    take: 10,
  })
  for (const t of pending) {
    console.log("  Executor: " + t.assignedTo + " | Manager (reviewer): " + t.assignedBy + " | " + (t.title || "").slice(0, 50))
  }

  // 4. Proactive loop — ruleaza managerii cicluri?
  console.log("\n=== 4. CICLURI PROACTIVE MANAGERI (ultimele 48h) ===")
  const h48 = new Date(Date.now() - 48 * 60 * 60 * 1000)
  const p = prisma as any
  const cycles = await p.cycleLog?.findMany({
    where: { startedAt: { gte: h48 } },
    select: { agentRole: true, startedAt: true, actions: true },
    orderBy: { startedAt: "desc" },
    take: 10,
  }).catch(() => [])
  if (!cycles || cycles.length === 0) {
    console.log("  ZERO cicluri in 48h! Managerii nu ruleaza proactive-loop.")
  } else {
    for (const c of cycles) {
      const actions = Array.isArray(c.actions) ? c.actions.length : 0
      console.log("  " + c.agentRole + " | " + c.startedAt?.toISOString().slice(0, 16) + " | " + actions + " actiuni")
    }
  }

  // 5. Cron jobs Vercel — sunt configurate?
  console.log("\n=== 5. CRON STATUS ===")
  const cronKeys = ["EXECUTOR_CRON_ENABLED", "SIGNALS_CRON_ENABLED", "RETRY_CRON_ENABLED"]
  for (const key of cronKeys) {
    const val = await prisma.systemConfig.findUnique({ where: { key } })
    console.log("  " + key + ": " + (val?.value || "NOT SET"))
  }

  // 6. Learning artifacts — se creeaza noi?
  console.log("\n=== 6. LEARNING ARTIFACTS RECENTE ===")
  const h24 = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const newArtifacts = await prisma.learningArtifact.count({ where: { createdAt: { gte: h24 } } })
  const totalArtifacts = await prisma.learningArtifact.count()
  console.log("  Total: " + totalArtifacts)
  console.log("  Create in ultimele 24h: " + newArtifacts)
}

main().catch(e => console.error(e.message)).finally(() => prisma.$disconnect())
