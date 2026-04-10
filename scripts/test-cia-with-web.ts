/**
 * Test CIA cu web search tool activat.
 * Task: "Identifică CEO-ul actual și emailul corporate pentru Hays Romania și Zitec."
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
  const obj = await p.organizationalObjective.findFirst({
    where: { code: "e2e-outreach-hr-tech-ro-v2" },
  })
  if (!obj) throw new Error("Obiectiv absent")

  // Reactivează obiectivul (dacă e MET)
  if (obj.status !== "ACTIVE") {
    await p.organizationalObjective.update({
      where: { id: obj.id },
      data: { status: "ACTIVE" },
    })
  }

  // Task concret cu web search forced prin taskType
  const task = await p.agentTask.create({
    data: {
      businessId: "biz_jobgrade",
      assignedBy: "OWNER",
      assignedTo: "CIA",
      title: "Verificare date decision makers reale — Hays Romania și Zitec",
      description: [
        "Caută ONLINE și verifică următoarele date pentru Hays Romania și Zitec:",
        "",
        "Pentru FIECARE firmă:",
        "  1. Numele actual al CEO / Country Manager / Managing Director (2024-2025)",
        "  2. Email corporate dacă e public disponibil",
        "  3. LinkedIn profile URL",
        "  4. Sursa de unde ai luat informația (URL direct)",
        "",
        "REGULI ABSOLUTE:",
        "  - Folosește web_search pentru FIECARE dată verificată",
        "  - Dacă NU găsești o informație certă, scrie explicit 'NEVERIFICAT — nu am găsit sursă'",
        "  - NU INVENTA niciun nume, email sau URL",
        "  - Citează sursa (URL) pentru fiecare dată",
        "",
        "Dacă nu găsești date certe pentru una din firme după 3-5 căutări,",
        "marchează status=blocked cu blocker.type=EXTERNAL și descrie ce căutări ai încercat.",
      ].join("\n"),
      taskType: "KB_RESEARCH",
      priority: "HIGH",
      objectiveId: obj.id,
      tags: ["e2e-test", "web-search-test", "verify-real-data"],
      deadlineAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      status: "ASSIGNED",
    },
  })

  console.log(`[create] Task CIA web-search: ${task.id}\n`)

  const res = await fetch(`${API_BASE}/api/v1/agents/execute-task`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-key": INTERNAL_KEY },
    body: JSON.stringify({ taskId: task.id }),
  })
  const json: any = await res.json()
  const r = json.result

  console.log(`Outcome: ${r?.outcome}`)
  console.log(`Duration: ${r?.durationMs}ms`)
  console.log(`Tokens: input=${r?.tokensUsed?.input} output=${r?.tokensUsed?.output}`)
  console.log(`Web searches: ${r?.webSearchCount}`)
  console.log()
  if (r?.blockerDescription) {
    console.log(`BLOCKED: ${r.blockerDescription}`)
  } else if (r?.result) {
    console.log("─── RESULT ───")
    console.log(r.result)
    console.log("─── END ───")
  } else if (r?.failureReason) {
    console.log(`FAILED: ${r.failureReason}`)
  }

  await p.$disconnect()
})().catch(async (e) => {
  console.error("FATAL:", e)
  process.exit(1)
})
