/**
 * Test integrare proactive-loop ↔ task executor.
 * Creează un seed task Owner → COCSA, triggerez ciclul COCSA, verific execuția.
 */
import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const p = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
}) as any

const API_BASE = process.env.API_BASE || "http://localhost:3000"
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || ""

;(async () => {
  // Obiectivul COCSA
  const obj = await p.organizationalObjective.findFirst({
    where: { code: "b2b-first-client--cocsa" },
  })
  if (!obj) throw new Error("Obiectiv COCSA lipsă")

  // Creează seed task simplu (non-research) pentru COCSA
  const task = await p.agentTask.create({
    data: {
      businessId: "biz_jobgrade",
      assignedBy: "OWNER",
      assignedTo: "COCSA",
      title: "TEST SELF-TASK: Listează top 3 blocaje propriilor tale obiective",
      description: [
        "Owner cere un status rapid:",
        "",
        "Pentru obiectivul tău principal (b2b-first-client--cocsa),",
        "identifică TOP 3 blocaje curente bazate pe contextul pe care îl ai.",
        "",
        "Output (un singur document scurt, 200-400 cuvinte):",
        "  1. Blocaj #1 — descriere + severitate + ce ai nevoie",
        "  2. Blocaj #2 — descriere + severitate + ce ai nevoie",
        "  3. Blocaj #3 — descriere + severitate + ce ai nevoie",
        "",
        "NU cere web search. NU decompune. Execută direct cu cunoașterea internă.",
        "Returnează status=completed cu result = documentul.",
      ].join("\n"),
      taskType: "DATA_ANALYSIS",
      priority: "HIGH",
      objectiveId: obj.id,
      tags: ["e2e-test", "self-task-test"],
      deadlineAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      status: "ASSIGNED",
    },
  })

  console.log(`[create] Seed task COCSA: ${task.id}`)
  console.log(`[trigger] Proactive cycle COCSA...\n`)

  const startTs = Date.now()
  const res = await fetch(`${API_BASE}/api/v1/agents/cycle`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-key": INTERNAL_KEY,
    },
    body: JSON.stringify({ managerRole: "COCSA" }),
  })
  const json: any = await res.json()
  const elapsed = Date.now() - startTs

  console.log(`\n─── Ciclu COCSA (${elapsed}ms) ───`)
  const r = json?.result || {}
  console.log(`Self-tasks executed: ${r.selfTasksExecuted || 0}`)
  console.log(`Self-tasks blocked:  ${r.selfTasksBlocked || 0}`)
  console.log(`Self-tasks failed:   ${r.selfTasksFailed || 0}`)
  console.log(`Subordinates checked: ${r.subordinatesChecked || 0}`)
  console.log(`Actions: ${(r.actions || []).length}`)

  // Verifică starea taskului
  const finalTask = await p.agentTask.findUnique({
    where: { id: task.id },
    select: { status: true, result: true, failureReason: true, completedAt: true },
  })
  console.log()
  console.log(`─── Task final ───`)
  console.log(`Status: ${finalTask?.status}`)
  if (finalTask?.completedAt) console.log(`Completed: ${finalTask.completedAt.toISOString()}`)
  if (finalTask?.result) {
    console.log(`Result length: ${finalTask.result.length} chars`)
    console.log(`Preview:`)
    console.log(finalTask.result.slice(0, 500))
  }
  if (finalTask?.failureReason) console.log(`Failure: ${finalTask.failureReason}`)

  await p.$disconnect()
})().catch(async (e) => {
  console.error("FATAL:", e)
  process.exit(1)
})
