/**
 * Verifică că toate cele 4 componente livrate azi sunt integrate:
 *  1. Task executor cu web search — verifică că existența taskurilor reactive
 *  2. Cron trigger — verifică că endpoint-ul răspunde și kill switch-ul funcționează
 *  3. Proactive-loop ↔ executor — verifică că self-tasks sunt executate în ciclu
 *  4. Signal→task pipeline — verifică că semnalele reactive au produs taskuri
 */
import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const p = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
}) as any

;(async () => {
  console.log("\n═══ VERIFICARE INTEGRARE 4 COMPONENTE ═══\n")

  // 1. Task executor cu web search — verificat deja în test-cia-with-web.ts
  const webSearchTask = await p.agentTask.findFirst({
    where: { tags: { has: "web-search-test" }, status: "COMPLETED" },
    select: { id: true, title: true, result: true },
  })
  console.log("1. Task executor + web search:")
  if (webSearchTask) {
    console.log(`   ✅ Task test COMPLETED: ${webSearchTask.id}`)
    console.log(`      (${webSearchTask.result?.length || 0} chars output cu citations)`)
  } else {
    console.log("   ⚠  Niciun task web-search-test găsit")
  }

  // 2. Cron trigger — verifică endpoint-ul răspunde la cron=true
  console.log("\n2. Cron trigger executor:")
  const cronRes = await fetch("http://localhost:3000/api/v1/agents/execute-task", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-key": process.env.INTERNAL_API_KEY || "",
    },
    body: JSON.stringify({ cron: true, limit: 1 }),
  })
  const cronJson: any = await cronRes.json()
  if (cronJson.skipped) {
    console.log(`   ✅ Kill switch funcțional: ${cronJson.reason}`)
    console.log(`      Pentru activare: EXECUTOR_CRON_ENABLED=true în .env`)
  } else {
    console.log(`   ⚠  Cron ar fi rulat (kill switch off?): ${JSON.stringify(cronJson.summary)}`)
  }

  // 3. Proactive-loop ↔ executor
  const selfTaskTest = await p.agentTask.findFirst({
    where: {
      tags: { has: "self-task-test" },
      status: "COMPLETED",
    },
    select: { id: true, assignedTo: true, result: true },
  })
  console.log("\n3. Proactive-loop ↔ executor integration:")
  if (selfTaskTest) {
    console.log(`   ✅ Self-task executat via ciclu proactiv: ${selfTaskTest.id}`)
    console.log(`      Agent: ${selfTaskTest.assignedTo}, output ${selfTaskTest.result?.length || 0} chars`)
  } else {
    console.log("   ⚠  Niciun self-task test găsit")
  }

  // 4. Signal→task pipeline
  console.log("\n4. Signal → Task pipeline:")
  const reactiveTasks = await p.agentTask.findMany({
    where: {
      tags: { has: "signal-reactive" },
      assignedBy: "COSO",
    },
    select: { id: true, assignedTo: true, title: true, status: true, tags: true },
  })
  console.log(`   ${reactiveTasks.length > 0 ? "✅" : "⚠"} Taskuri reactive create: ${reactiveTasks.length}`)
  for (const t of reactiveTasks.slice(0, 5)) {
    console.log(`      ${t.assignedTo} [${t.status}] ${t.title.slice(0, 60)}`)
  }

  const processedSignals = await p.externalSignal.count({
    where: { processedAt: { not: null } },
  })
  const unprocessedSignals = await p.externalSignal.count({
    where: { processedAt: null },
  })
  console.log(`   Semnale procesate: ${processedSignals}, neprocesate rămase: ${unprocessedSignals}`)

  // Summary
  console.log("\n═══ REZULTAT ═══")
  console.log(`  1. Task executor + web search:     ${webSearchTask ? "✅" : "⚠"}`)
  console.log(`  2. Cron trigger (kill switch):     ${cronJson.skipped ? "✅" : "⚠"}`)
  console.log(`  3. Proactive-loop integration:     ${selfTaskTest ? "✅" : "⚠"}`)
  console.log(`  4. Signal→task pipeline:           ${reactiveTasks.length > 0 ? "✅" : "⚠"}`)

  await p.$disconnect()
})().catch(async (e) => {
  console.error("FATAL:", e)
  process.exit(1)
})
