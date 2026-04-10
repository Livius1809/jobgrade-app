/**
 * Sprint "Demo-Ready B2B" — seed obiectiv pentru organism (10.04.2026).
 *
 * Scope strâns: audit + plan pentru flow B2B critical path (signup → onboarding
 * → primul job evaluat → raport), FĂRĂ execuție. Organismul produce planul,
 * Claude Code CLI execută codul după.
 */
import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaPg } from "@prisma/adapter-pg"

const p = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
}) as any

const API_BASE = process.env.API_BASE || "http://localhost:3000"
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || ""
const CODE = "sprint-demo-ready-b2b-v1"

async function callExecutor(taskId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/v1/agents/execute-task`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-key": INTERNAL_KEY },
    body: JSON.stringify({ taskId }),
  })
  return res.json()
}

;(async () => {
  // 1. Obiectiv
  let obj = await p.organizationalObjective.findFirst({ where: { code: CODE } })
  if (!obj) {
    obj = await p.organizationalObjective.create({
      data: {
        businessId: "biz_jobgrade",
        code: CODE,
        title: "Sprint Demo-Ready — Flow B2B critical path (audit + plan)",
        description: [
          "Scope STRÂNS: primul flow B2B funcțional demo-able.",
          "",
          "CRITICAL PATH B2B care trebuie să funcționeze FĂRĂ BUG-URI:",
          "  1. Company signup (HR Director creează cont)",
          "  2. Onboarding B2B (SOA ghidat, colectare context firmă)",
          "  3. Primul job creat + evaluat (comitet, scoring, consens)",
          "  4. Raport generat (JobGrade per poziție)",
          "",
          "OUT OF SCOPE (nu atingi în acest sprint):",
          "  - B2C complet (5 cards, comunități)",
          "  - AI Act high-risk compliance",
          "  - Rotare chei producție",
          "  - Deploy Vercel producție",
          "  - Hetzner VPS n8n production",
          "  - Media Books pipeline complet",
          "  - Sign in with Vercel / OAuth extern",
          "",
          "ORGANISMUL (CCO + contributors) PRODUCE:",
          "  - Audit stare curentă pentru critical path",
          "  - Gap list cu priority (P0 blockers, P1 importante, P2 nice-to-have)",
          "  - Simulare narativă customer journey B2B (1 companie ficțională end-to-end)",
          "  - Date seed sugerate ca SQL INSERT sau Prisma create (ca text)",
          "  - Test plan concret per step din critical path",
          "  - Plan de execuție pas-cu-pas (cine, ce, ordine, dependency)",
          "",
          "ORGANISMUL NU VA EXECUTA — e responsabilitatea Claude Code CLI după review.",
          "",
          "IMPORTANT: Sub-taskuri MAX 6. Nu decompunere recursivă. Output focused.",
          "Fiecare sub-task produce un document max 3000 cuvinte, nu eseuri de 10k.",
        ].join("\n"),
        metricName: "critical_path_audit_completed",
        metricUnit: "%",
        targetValue: 100,
        currentValue: 0,
        direction: "INCREASE",
        status: "ACTIVE",
        priority: "HIGH",
        level: "STRATEGIC",
        startDate: new Date(),
        deadlineAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
        ownerRoles: ["CCO"],
        contributorRoles: ["PMA", "COA", "QLA", "SOA", "CIA"],
        tags: ["sprint-demo-ready", "b2b", "audit-and-plan"],
        createdBy: "OWNER",
      },
    })
    console.log(`[create] Obiectiv ${obj.id}`)
  } else {
    console.log(`[exists] Obiectiv ${obj.id}`)
  }

  // 2. Seed task CCO
  let seedTask = await p.agentTask.findFirst({
    where: {
      objectiveId: obj.id,
      assignedBy: "OWNER",
      assignedTo: "CCO",
      status: { in: ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"] },
    },
  })
  if (!seedTask) {
    seedTask = await p.agentTask.create({
      data: {
        businessId: "biz_jobgrade",
        assignedBy: "OWNER",
        assignedTo: "CCO",
        title: "DECOMPUNE: Sprint Demo-Ready B2B (audit + plan, FĂRĂ execuție)",
        description: [
          "Owner îți cere să coordonezi audit + plan pentru flow B2B critical path.",
          "",
          "OBIECTIV: " + CODE,
          "",
          "Decompune în MAX 6 sub-taskuri. Fiecare sub-task trebuie să producă un",
          "document FOCUSED (max 3000 cuvinte), nu eseuri lungi.",
          "",
          "SUB-TASKURI SUGERATE (dar tu decizi):",
          "",
          "1. PMA → Audit cod critical path B2B",
          "   - Ce pagini/route-uri există pentru signup, onboarding, job eval, raport",
          "   - Ce e complet / parțial / absent (P0 blocker list)",
          "   - Obs pe arhitectură (Server vs Client components, Prisma usage)",
          "   - Output: bug list + gap list + arhitectură note (max 2500 cuvinte)",
          "",
          "2. COA → Audit infrastructură demo-ready",
          "   - Ce e minim pentru demo local: dev server, DB Neon, n8n opțional",
          "   - Ce env vars sunt OBLIGATORII pentru critical path (lista)",
          "   - Ce e OK să lipsească la demo (Stripe prod, Sentry, etc.)",
          "   - Output: infra checklist + env vars list (max 1500 cuvinte)",
          "",
          "3. SOA + CIA → Simulare narativă customer journey B2B",
          "   - 1 companie ficțională (ex: HR-tech 80 angajați din RO)",
          "   - Persona HR Director (nume, poziție, pain point)",
          "   - Dialog natural primul contact → signup → onboarding → primul job",
          "   - Output: 8-12 turns dialog + ce ar trebui să vadă la fiecare pas (max 2500 cuvinte)",
          "",
          "4. COCSA → Date seed pentru demo",
          "   - 1 companie + 3 users (HR Dir, Manager, Eval) + 3 joburi + comitet 4 persoane",
          "   - Format: Prisma create statements CA TEXT (nu execuție)",
          "   - Include context realist (nume româneşti, poziții plauzibile)",
          "   - Output: script seed text (max 2000 cuvinte de cod + explicații)",
          "",
          "5. QLA → Test plan critical path",
          "   - Per step: ce testăm, cum testăm, criteriu PASS/FAIL",
          "   - Nu cod test — plan natural language",
          "   - Output: test checklist executabil (max 1500 cuvinte)",
          "",
          "6. (Opțional) DOAS → Verificare coerență",
          "   - Sunt toate pașii aliniate cu MVV JobGrade?",
          "   - Vreo incoerență descoperită în audit?",
          "   - Output: nota scurtă (max 800 cuvinte)",
          "",
          "APOI TU (CCO) agregi totul într-un PLAN FINAL DE EXECUȚIE:",
          "  - Top 10 acțiuni prioritizate cu dependency",
          "  - Fiecare acțiune: ce, cine (Claude Code), estimare effort",
          "  - Ordine de execuție",
          "  - Criteriu 'demo-ready' atins",
          "",
          "DEADLINE: 2h (dar așteptă-te la output mai rapid).",
          "Returnează needs-subtasks cu cele 6 sub-task-uri definite clar.",
        ].join("\n"),
        taskType: "PROCESS_EXECUTION",
        priority: "CRITICAL",
        objectiveId: obj.id,
        tags: ["sprint-demo-ready", "decompose", "audit-plan"],
        deadlineAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
        estimatedMinutes: 30,
        status: "ASSIGNED",
      },
    })
    console.log(`[create] Seed task CCO ${seedTask.id}`)
  } else {
    console.log(`[exists] Seed task CCO ${seedTask.id}`)
  }

  // 3. Trigger CCO decompose
  console.log(`\n[exec] CCO decompose...`)
  const r1 = await callExecutor(seedTask.id)
  const decomposeOutcome = r1?.result?.outcome
  const subTaskIds: string[] = r1?.result?.subTaskIds || []
  console.log(`  outcome=${decomposeOutcome} subTasks=${subTaskIds.length} durata=${r1?.result?.durationMs}ms`)

  if (decomposeOutcome !== "COMPLETED" || subTaskIds.length === 0) {
    console.log(`[FAIL] Decomposition a eșuat. Full response:`)
    console.log(JSON.stringify(r1, null, 2).slice(0, 2000))
    await p.$disconnect()
    process.exit(1)
  }

  // 4. Execute each sub-task sequentially
  console.log(`\n[exec] Rulez ${subTaskIds.length} sub-taskuri...`)
  const subResults: any[] = []
  for (let i = 0; i < subTaskIds.length; i++) {
    const subId = subTaskIds[i]
    const subMeta = await p.agentTask.findUnique({
      where: { id: subId },
      select: { assignedTo: true, title: true },
    })
    console.log(`\n  [${i + 1}/${subTaskIds.length}] ${subMeta?.assignedTo}: ${subMeta?.title?.slice(0, 60)}`)
    try {
      const r = await callExecutor(subId)
      const outcome = r?.result?.outcome
      const len = r?.result?.result?.length || 0
      const tokens = (r?.result?.tokensUsed?.input || 0) + (r?.result?.tokensUsed?.output || 0)
      const webSearches = r?.result?.webSearchCount || 0
      console.log(
        `    → ${outcome} ${len}ch ${tokens}tk ${r?.result?.durationMs}ms ` +
          (webSearches > 0 ? `websearch=${webSearches}` : "")
      )
      subResults.push({
        id: subId,
        assignedTo: subMeta?.assignedTo,
        title: subMeta?.title,
        outcome,
        result: r?.result?.result,
        length: len,
        tokens,
      })
    } catch (e: any) {
      console.log(`    → ERROR: ${e.message}`)
      subResults.push({ id: subId, error: e.message })
    }
  }

  // 5. Summary
  const totalTokens = subResults.reduce((acc, r) => acc + (r.tokens || 0), 0) +
    ((r1?.result?.tokensUsed?.input || 0) + (r1?.result?.tokensUsed?.output || 0))
  const estCost = (totalTokens * 0.000008).toFixed(3)
  console.log(`\n═══ SUMMARY ═══`)
  console.log(`Sub-taskuri: ${subResults.length}`)
  console.log(`  COMPLETED: ${subResults.filter((r: any) => r.outcome === "COMPLETED").length}`)
  console.log(`  BLOCKED:   ${subResults.filter((r: any) => r.outcome === "BLOCKED").length}`)
  console.log(`  FAILED:    ${subResults.filter((r: any) => r.outcome === "FAILED" || r.error).length}`)
  console.log(`Total tokens: ${totalTokens}`)
  console.log(`Cost estimat: ~$${estCost}`)
  console.log(`\nObjective ID: ${obj.id}`)
  console.log(`Seed task ID: ${seedTask.id}`)

  await p.$disconnect()
})().catch(async (e) => {
  console.error("FATAL:", e)
  process.exit(1)
})
