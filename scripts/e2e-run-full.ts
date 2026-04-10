/**
 * E2E Test Runner — rulează complet testul Owner→Organism cu task executor nou.
 *
 * Pași:
 *  1. Reactivează obiectivul E2E (sau creează v2 dacă e nevoie)
 *  2. Creează seed task nou pentru CCO (cel vechi e CANCELLED)
 *  3. Execută seed task → CCO decompune → sub-tasks
 *  4. Pentru fiecare sub-task, execută executor → rezultat
 *  5. Raport final cu toate output-urile salvate în docs/e2e-reports/
 *
 * Rulează: npx tsx scripts/e2e-run-full.ts
 */
import "dotenv/config"
import * as fs from "node:fs"
import * as path from "node:path"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const p = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
}) as any

const API_BASE = process.env.API_BASE || "http://localhost:3000"
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || ""
const OBJECTIVE_CODE = "e2e-outreach-hr-tech-ro-v2"
const REPORT_DIR = path.resolve(__dirname, "..", "docs", "e2e-reports")

function log(msg: string) {
  const ts = new Date().toTimeString().slice(0, 8)
  process.stderr.write(`[${ts}] ${msg}\n`)
}

async function callExecutor(taskId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/v1/agents/execute-task`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-key": INTERNAL_KEY,
    },
    body: JSON.stringify({ taskId }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Executor HTTP ${res.status}: ${text.slice(0, 300)}`)
  }
  return res.json()
}

async function main() {
  if (!INTERNAL_KEY) throw new Error("INTERNAL_API_KEY lipsă în .env")
  fs.mkdirSync(REPORT_DIR, { recursive: true })

  log("═══ E2E TEST RUNNER ═══")
  log(`Obiectiv: ${OBJECTIVE_CODE}`)

  // ── 1. OBIECTIV ────────────────────────────────────────────────────────────
  let objective = await p.organizationalObjective.findFirst({
    where: { code: OBJECTIVE_CODE },
  })
  if (!objective) {
    log("Creez obiectiv nou...")
    const deadline = new Date(Date.now() + 48 * 60 * 60 * 1000)
    objective = await p.organizationalObjective.create({
      data: {
        businessId: "biz_jobgrade",
        code: OBJECTIVE_CODE,
        title: "E2E TEST v2 — Outreach 10 firme HR-tech RO (cu task executor)",
        description: [
          "A doua rundă a testului end-to-end Owner→Organism — după construirea task executor-ului.",
          "",
          "OBIECTIV:",
          "Pregătește o campanie de outreach pentru 10 firme țintă din sectorul HR/recruiting/consulting RO,",
          "aliniată cu poziționarea JobGrade (evaluare personal, ierarhizare joburi, MBook-uri).",
          "",
          "LIVRABIL FINAL (agregat de CCO):",
          "  1. Lista 10 firme: nume, site, decision maker, context de potrivire",
          "  2. Pentru fiecare firmă, mesaj outreach personalizat (150-250 cuvinte RO, ton natural)",
          "  3. Plan follow-up (timing, canal, fallback no-reply)",
          "",
          "CONSTRÂNGERI:",
          "  - ZERO emailuri trimise. Doar material pregătit pentru Owner review.",
          "  - Mesaje RO natural (fără superlative americane 'perfect/amazing/incredible').",
          "  - Fir narativ per mesaj — poveste, nu înlănțuire fraze.",
          "  - Beneficiu specific rolului decision maker (HR Dir vs CEO vs CFO).",
          "",
          "COORDONARE:",
          "  - CIA: research firme + decision makers",
          "  - MKA: context piață HR RO",
          "  - CWA: draft mesaje",
          "  - CMA: format + storytelling",
          "  - SOA: unghi sales + follow-up",
          "  - DVB2B: validare pitch",
          "  - CCO: decompunere + agregare finală",
        ].join("\n"),
        metricName: "firms_outreach_ready",
        metricUnit: "firme",
        targetValue: 10,
        currentValue: 0,
        direction: "INCREASE",
        status: "ACTIVE",
        priority: "HIGH",
        level: "STRATEGIC",
        startDate: new Date(),
        deadlineAt: deadline,
        ownerRoles: ["CCO", "DVB2B"],
        contributorRoles: ["CIA", "MKA", "CWA", "CMA", "SOA"],
        tags: ["e2e-test", "outreach", "b2b-first-client", "owner-initiated", "v2"],
        createdBy: "OWNER",
      },
    })
    log(`  ✓ Obiectiv creat: ${objective.id}`)
  } else {
    // Asigură-te că e ACTIVE
    if (objective.status !== "ACTIVE") {
      await p.organizationalObjective.update({
        where: { id: objective.id },
        data: { status: "ACTIVE" },
      })
      log(`  ✓ Obiectiv reactivat: ${objective.id}`)
    } else {
      log(`  ✓ Obiectiv există deja: ${objective.id}`)
    }
  }

  // ── 2. SEED TASK CCO ───────────────────────────────────────────────────────
  // Verifică dacă există un seed task activ; dacă nu, crează-l
  let seedTask = await p.agentTask.findFirst({
    where: {
      objectiveId: objective.id,
      assignedBy: "OWNER",
      assignedTo: "CCO",
      status: { in: ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"] },
    },
  })
  if (!seedTask) {
    log("Creez seed task pentru CCO...")
    seedTask = await p.agentTask.create({
      data: {
        businessId: "biz_jobgrade",
        assignedBy: "OWNER",
        assignedTo: "CCO",
        title: "DECOMPUNE + DELEGĂ: Outreach 10 firme HR-tech RO",
        description: [
          "Owner-ul ți-a încredințat obiectivul strategic " + OBJECTIVE_CODE + ".",
          "",
          "Tu (CCO) ești owner principal. Responsabilitate: DECOMPUNE obiectivul în sub-taskuri",
          "concrete executabile și deleagă-le la contributors.",
          "",
          "Contributors disponibili: CIA, MKA, CWA, CMA, SOA, DVB2B",
          "",
          "FIECARE SUB-TASK TREBUIE SĂ AIBĂ:",
          "  - assignedTo: rolul executor",
          "  - title: scurt, imperativ, concret",
          "  - description: ce anume trebuie produs (criterii acceptare clare)",
          "  - taskType: corespunzător (KB_RESEARCH, CONTENT_CREATION, REVIEW, etc.)",
          "  - priority: HIGH sau CRITICAL",
          "",
          "IMPORTANT: decompune în 4-6 sub-taskuri COERENTE, nu 10 sub-taskuri atomice.",
          "Fiecare sub-task trebuie să fie un bloc de muncă de 1-3h care produce un artefact.",
          "",
          "Returnează JSON cu status='needs-subtasks' și array subTasks.",
        ].join("\n"),
        taskType: "PROCESS_EXECUTION",
        priority: "HIGH",
        objectiveId: objective.id,
        tags: ["e2e-test", "outreach", "decompose-delegate", "owner-seed", "v2"],
        deadlineAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        estimatedMinutes: 30,
        status: "ASSIGNED",
      },
    })
    log(`  ✓ Seed task creat: ${seedTask.id}`)
  } else {
    log(`  ✓ Seed task există: ${seedTask.id}`)
  }

  // ── 3. EXECUTE SEED TASK (CCO decompunere) ─────────────────────────────────
  log("")
  log("═══ PAS 1: CCO decompune obiectivul ═══")
  const seedResult = await callExecutor(seedTask.id)
  const seedOutcome = seedResult?.result?.outcome
  const subTaskIds: string[] = seedResult?.result?.subTaskIds || []
  log(`  Outcome: ${seedOutcome}`)
  log(`  Sub-taskuri create: ${subTaskIds.length}`)
  log(`  Durată: ${seedResult?.result?.durationMs}ms`)
  log(`  Tokens: ${(seedResult?.result?.tokensUsed?.input || 0) + (seedResult?.result?.tokensUsed?.output || 0)}`)

  if (seedOutcome !== "COMPLETED" || subTaskIds.length === 0) {
    log(`  ⚠ CCO NU a decompus. Output: ${JSON.stringify(seedResult).slice(0, 500)}`)
    await p.$disconnect()
    return
  }

  // ── 4. EXECUTE SUB-TASKS ───────────────────────────────────────────────────
  log("")
  log("═══ PAS 2: Executor pentru fiecare sub-task ═══")

  const subTaskResults: any[] = []
  for (let i = 0; i < subTaskIds.length; i++) {
    const subId = subTaskIds[i]
    const subTaskRow = await p.agentTask.findUnique({
      where: { id: subId },
      select: { id: true, assignedTo: true, title: true },
    })
    log(`  [${i + 1}/${subTaskIds.length}] ${subTaskRow?.assignedTo}: ${subTaskRow?.title?.slice(0, 60)}`)
    try {
      const r = await callExecutor(subId)
      const outcome = r?.result?.outcome
      const resultPreview = (r?.result?.result || "").slice(0, 120).replace(/\n/g, " ")
      log(`       → ${outcome} (${r?.result?.durationMs}ms, ${(r?.result?.tokensUsed?.input || 0) + (r?.result?.tokensUsed?.output || 0)} tokens)`)
      log(`       ${resultPreview}${(r?.result?.result || "").length > 120 ? "..." : ""}`)
      subTaskResults.push({
        id: subId,
        assignedTo: subTaskRow?.assignedTo,
        title: subTaskRow?.title,
        outcome,
        result: r?.result?.result,
        durationMs: r?.result?.durationMs,
        tokensUsed: r?.result?.tokensUsed,
        failureReason: r?.result?.failureReason,
      })
    } catch (e: any) {
      log(`       → ERROR: ${e.message}`)
      subTaskResults.push({
        id: subId,
        assignedTo: subTaskRow?.assignedTo,
        title: subTaskRow?.title,
        outcome: "ERROR",
        failureReason: e.message,
      })
    }
  }

  // ── 5. RAPORT FINAL ────────────────────────────────────────────────────────
  log("")
  log("═══ RAPORT FINAL ═══")

  const completed = subTaskResults.filter((r) => r.outcome === "COMPLETED").length
  const blocked = subTaskResults.filter((r) => r.outcome === "BLOCKED").length
  const failed = subTaskResults.filter((r) => r.outcome === "FAILED" || r.outcome === "ERROR").length
  const totalTokens = subTaskResults.reduce(
    (acc, r) => acc + (r.tokensUsed?.input || 0) + (r.tokensUsed?.output || 0),
    (seedResult?.result?.tokensUsed?.input || 0) + (seedResult?.result?.tokensUsed?.output || 0),
  )

  log(`  Seed (CCO decompose): COMPLETED cu ${subTaskIds.length} sub-tasks`)
  log(`  Sub-tasks: COMPLETED=${completed} BLOCKED=${blocked} FAILED/ERROR=${failed}`)
  log(`  Tokens totale: ${totalTokens} (~$${(totalTokens * 0.000008).toFixed(3)} estimat)`)

  // Scrie raport markdown
  const reportPath = path.join(REPORT_DIR, `e2e-test-${new Date().toISOString().slice(0, 16).replace(":", "-")}.md`)
  const md: string[] = []
  md.push(`# E2E Test Report — ${new Date().toISOString()}`)
  md.push("")
  md.push(`**Obiectiv:** ${OBJECTIVE_CODE}`)
  md.push(`**Seed task ID:** ${seedTask.id}`)
  md.push(`**Sub-tasks create:** ${subTaskIds.length}`)
  md.push(`**Outcome sub-tasks:** COMPLETED=${completed} BLOCKED=${blocked} FAILED/ERROR=${failed}`)
  md.push(`**Tokens totale:** ${totalTokens}`)
  md.push("")
  md.push("## CCO Decompunere (seed task)")
  md.push("")
  md.push("```")
  md.push((await p.agentTask.findUnique({ where: { id: seedTask.id }, select: { result: true } }))?.result || "—")
  md.push("```")
  md.push("")
  md.push("## Sub-tasks rezultate")
  md.push("")
  for (const r of subTaskResults) {
    md.push(`### ${r.assignedTo} — ${r.title}`)
    md.push("")
    md.push(`**Outcome:** ${r.outcome}`)
    md.push(`**Task ID:** ${r.id}`)
    if (r.durationMs) md.push(`**Durată:** ${r.durationMs}ms`)
    if (r.tokensUsed) md.push(`**Tokens:** ${r.tokensUsed.input} in + ${r.tokensUsed.output} out`)
    md.push("")
    if (r.result) {
      md.push("```")
      md.push(r.result)
      md.push("```")
    } else if (r.failureReason) {
      md.push(`**Failure reason:** ${r.failureReason}`)
    }
    md.push("")
  }
  fs.writeFileSync(reportPath, md.join("\n"))
  log(`  Raport scris: ${reportPath}`)

  await p.$disconnect()
}

main().catch(async (e) => {
  log(`FATAL: ${e.message}`)
  console.error(e)
  try { await p.$disconnect() } catch {}
  process.exit(1)
})
