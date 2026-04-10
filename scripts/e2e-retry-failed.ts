/**
 * Re-rulează taskurile BLOCKED/FAILED din obiectivul E2E v2 cu executor-ul
 * actualizat (sibling context + blockerType normalization).
 */
import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const p = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
}) as any

const API_BASE = process.env.API_BASE || "http://localhost:3000"
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || ""

async function callExecutor(taskId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/v1/agents/execute-task`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-key": INTERNAL_KEY },
    body: JSON.stringify({ taskId }),
  })
  return res.json()
}

;(async () => {
  const obj = await p.organizationalObjective.findFirst({
    where: { code: "e2e-outreach-hr-tech-ro-v2" },
  })
  if (!obj) return console.log("Obiectiv absent")

  // Găsește taskurile BLOCKED sau FAILED
  const toRetry = await p.agentTask.findMany({
    where: {
      objectiveId: obj.id,
      status: { in: ["BLOCKED", "FAILED"] },
    },
    orderBy: { createdAt: "asc" },
  })

  console.log(`\nRetry candidates: ${toRetry.length}`)
  for (const t of toRetry) {
    console.log(`  - ${t.assignedTo}: ${t.title.slice(0, 60)} (${t.status})`)
  }
  console.log()

  // Reset la ASSIGNED + clear blocker/failure
  for (const t of toRetry) {
    await p.agentTask.update({
      where: { id: t.id },
      data: {
        status: "ASSIGNED",
        blockerType: null,
        blockerDescription: null,
        blockedAt: null,
        failedAt: null,
        failureReason: null,
      },
    })
    console.log(`[reset] ${t.id} → ASSIGNED`)
  }

  // Re-execută fiecare
  console.log(`\nExecut ${toRetry.length} task-uri cu contextul sibling...\n`)
  for (const t of toRetry) {
    console.log(`▶ ${t.assignedTo}: ${t.title.slice(0, 60)}`)
    try {
      const r = await callExecutor(t.id)
      const outcome = r?.result?.outcome
      const resultLen = r?.result?.result?.length || 0
      const tokens = (r?.result?.tokensUsed?.input || 0) + (r?.result?.tokensUsed?.output || 0)
      console.log(`  → ${outcome} (${resultLen} chars, ${tokens} tokens, ${r?.result?.durationMs}ms)`)
      if (r?.result?.failureReason) console.log(`    FAILED: ${r.result.failureReason}`)
      if (r?.result?.blockerDescription) console.log(`    BLOCKED: ${r.result.blockerDescription.slice(0, 150)}`)
    } catch (e: any) {
      console.log(`  → ERROR: ${e.message}`)
    }
    console.log()
  }

  await p.$disconnect()
})()
