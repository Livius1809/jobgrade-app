/**
 * cognitive-injection.ts — Injectare context cognitiv în prompt-ul agentului
 *
 * PRINCIPIU: Agentul nu mai e executor orb. Primește:
 *   - Cine sunt (identitate narativă + profil comportamental)
 *   - Unde sunt în timp (faza business + urgență)
 *   - Ce m-a format (traumă activă + lecții costisitoare)
 *   - Cât de sigur sunt (certitudine pe task curent)
 *   - Ce precedent moral am (jurisprudență relevantă)
 *
 * Agentul DECIDE SINGUR: execut, refuz cu argument, sau cer confirmare.
 * Nu mai e un gate extern (meta-evaluator) ci un mod de gândire intern.
 *
 * Integrat în: buildSystemForExecutor() din task-executor.ts
 */

import { prisma } from "@/lib/prisma"

export interface CognitiveContext {
  selfAwareness: string      // cine sunt, ce am reușit/eșuat
  temporalSense: string      // faza business, urgență
  traumaMemory: string       // eșecuri recente, prudență
  certaintyBrief: string     // cât de sigur sunt pe acest task
  moralMemory: string        // precedent relevant (dacă există)
  peerAwareness: string      // cum mă raportez la ceilalți agenți
  persistentMemory: string   // stare continuă acumulată (nu recalculată)
}

/**
 * Construiește contextul cognitiv complet pentru un agent care execută un task.
 * Apelat O DATĂ per task, înainte de execuție.
 * Cost: 0 apeluri Claude (doar DB reads).
 */
export async function buildCognitiveContext(
  agentRole: string,
  taskId: string,
  taskTitle: string,
  taskDescription: string,
): Promise<CognitiveContext> {

  // ── 1. Self-awareness: cine sunt eu? ──────────────────────

  const [myCompleted, myFailed, myTotal, myKB, recentSuccesses, recentFailures] = await Promise.all([
    prisma.agentTask.count({ where: { assignedTo: agentRole, status: "COMPLETED" } }),
    prisma.agentTask.count({ where: { assignedTo: agentRole, status: "FAILED" } }),
    prisma.agentTask.count({ where: { assignedTo: agentRole } }),
    prisma.kBEntry.count({ where: { agentRole, status: "PERMANENT" } }),
    prisma.agentTask.findMany({
      where: { assignedTo: agentRole, status: "COMPLETED", result: { not: null } },
      select: { title: true },
      orderBy: { completedAt: "desc" },
      take: 3,
    }),
    prisma.agentTask.findMany({
      where: { assignedTo: agentRole, status: "FAILED", failureReason: { not: null } },
      select: { title: true, failureReason: true },
      orderBy: { failedAt: "desc" },
      take: 2,
    }),
  ])

  const successRate = myTotal > 0 ? Math.round((myCompleted / myTotal) * 100) : 0

  const selfAwareness = [
    `Ai completat ${myCompleted} taskuri din ${myTotal} (${successRate}% succes). Ai ${myKB} cunoștințe în KB.`,
    recentSuccesses.length > 0
      ? `Reușite recente: ${recentSuccesses.map(s => s.title.slice(0, 50)).join("; ")}.`
      : "",
    recentFailures.length > 0
      ? `Eșecuri recente de care să ții cont: ${recentFailures.map(f => `"${f.title.slice(0, 40)}" — ${f.failureReason?.slice(0, 60)}`).join("; ")}.`
      : "",
    successRate >= 80
      ? "Track record bun — poți aborda cu încredere."
      : successRate >= 50
        ? "Track record mixt — fii atent la detalii."
        : "Track record sub așteptări — fii extra prudent, verifică de două ori.",
  ].filter(Boolean).join(" ")

  // ── 2. Temporal sense: unde suntem? ───────────────────────

  const [tenantCount, paidCount] = await Promise.all([
    prisma.tenant.count(),
    prisma.servicePurchase.count().catch(() => 0),
  ])

  let phase: string
  let phaseGuidance: string
  if (paidCount === 0) {
    phase = "PRE-LANSARE"
    phaseGuidance = "Suntem înainte de primul client. Toleranță la imperfecțiune, viteză e importantă. Nu perfecta e dușmanul binelui — mai bine livrat imperfect decât nelivrat."
  } else if (paidCount <= 5) {
    phase = "LANSARE"
    phaseGuidance = "Avem primii clienți. Calitatea contează acum — fiecare interacțiune formează reputația. Gândește-te: acest output va fi văzut de un client real."
  } else if (paidCount <= 50) {
    phase = "TRACȚIUNE"
    phaseGuidance = "Avem tracțiune. Eficiența devine importantă — nu reinventa ce funcționează. Consolidează."
  } else {
    phase = "SCALARE"
    phaseGuidance = "Suntem în scalare. Fiecare decizie afectează mulți clienți. Prudență maximă."
  }

  const temporalSense = `Faza business: ${phase}. ${phaseGuidance}`

  // ── 3. Trauma memory: ce m-a format? ──────────────────────

  const myRecentFailures = await prisma.agentTask.findMany({
    where: {
      assignedTo: agentRole,
      status: "FAILED",
      failedAt: { gte: new Date(Date.now() - 14 * 24 * 3600000) },
    },
    select: { title: true, failureReason: true, failedAt: true },
    take: 3,
    orderBy: { failedAt: "desc" },
  })

  // Și eșecuri ale altor agenți pe taskuri similare
  const similarFailures = await prisma.agentTask.findMany({
    where: {
      status: "FAILED",
      failedAt: { gte: new Date(Date.now() - 7 * 24 * 3600000) },
      title: { contains: taskTitle.split(" ").slice(0, 3).join(" ").slice(0, 20) },
      assignedTo: { not: agentRole },
    },
    select: { assignedTo: true, title: true, failureReason: true },
    take: 2,
  })

  const traumaParts: string[] = []
  if (myRecentFailures.length > 0) {
    traumaParts.push(
      `Ai eșuat recent pe: ${myRecentFailures.map(f => `"${f.title.slice(0, 40)}" (${f.failureReason?.slice(0, 50)})`).join("; ")}. Fii atent la tipare similare.`
    )
  }
  if (similarFailures.length > 0) {
    traumaParts.push(
      `Alți agenți au eșuat pe taskuri similare: ${similarFailures.map(f => `${f.assignedTo}: "${f.title.slice(0, 40)}"`).join("; ")}. Învață din greșelile lor.`
    )
  }
  const traumaMemory = traumaParts.length > 0
    ? traumaParts.join(" ")
    : "Nicio traumă recentă activă — funcționezi în parametri normali."

  // ── 4. Certainty brief: cât de sigur sunt? ────────────────

  const [similarCompleted, similarFailed, taskTypeCount] = await Promise.all([
    prisma.agentTask.count({
      where: { assignedTo: agentRole, status: "COMPLETED" },
    }),
    prisma.agentTask.count({
      where: { assignedTo: agentRole, status: "FAILED" },
    }),
    prisma.kBEntry.count({
      where: {
        agentRole,
        status: "PERMANENT",
        content: { contains: taskTitle.split(" ")[0] },
      },
    }).catch(() => 0),
  ])

  let certaintyLevel: string
  if (myKB >= 30 && successRate >= 80) {
    certaintyLevel = "RIDICATĂ — ai experiență solidă pe acest tip de task. Execută cu încredere dar verifică output-ul."
  } else if (myKB >= 10 && successRate >= 50) {
    certaintyLevel = "MODERATĂ — ai ceva experiență. Fii atent la detalii și nu presupune ce nu știi."
  } else if (myKB >= 3) {
    certaintyLevel = "SCĂZUTĂ — teritoriu relativ nou. Dacă nu ești sigur pe ceva, spune explicit 'nu am certitudine pe acest aspect' în loc să inventezi."
  } else {
    certaintyLevel = "FOARTE SCĂZUTĂ — aproape zero experiență pe acest domeniu. Fii onest despre ce nu știi. Mai bine un răspuns parțial dar corect decât unul complet dar inventat."
  }

  const certaintyBrief = `Certitudine: ${certaintyLevel}`

  // ── 5. Moral memory: ce precedent am? ─────────────────────

  const moralPrecedents = await prisma.kBEntry.findMany({
    where: {
      status: "PERMANENT",
      kbType: "METHODOLOGY",
      tags: { has: "moral-precedent" },
    },
    select: { content: true, confidence: true },
    orderBy: { confidence: "desc" },
    take: 3,
  })

  let moralMemory: string
  if (moralPrecedents.length > 0) {
    const parsed = moralPrecedents.map(p => {
      try {
        const data = JSON.parse(p.content)
        return `Dilemă: "${data.dilemma?.slice(0, 50)}" → Decizia: "${data.decision?.slice(0, 50)}" → Consecința: "${data.consequence?.slice(0, 50)}"`
      } catch { return null }
    }).filter(Boolean)

    moralMemory = parsed.length > 0
      ? `Precedente morale relevante:\n${parsed.join("\n")}\nFolosește-le ca ghid, nu ca regulă rigidă.`
      : "Nicio dilemă morală înregistrată — aplică principiile de bază (onestitate, transparență, zero informații inventate)."
  } else {
    moralMemory = "Nicio dilemă morală înregistrată — aplică principiile de bază."
  }

  // ── 6. Peer awareness: cum mă raportez la ceilalți? ───────

  // Agenți care au lucrat pe același obiectiv
  const peerParts: string[] = []

  // Cine a contribuit la obiectivul meu?
  const taskObj = await prisma.agentTask.findUnique({
    where: { id: taskId },
    select: { objectiveId: true },
  })

  if (taskObj?.objectiveId) {
    const siblings = await prisma.agentTask.findMany({
      where: {
        objectiveId: taskObj.objectiveId,
        status: "COMPLETED",
        assignedTo: { not: agentRole },
        result: { not: null },
      },
      select: { assignedTo: true, title: true },
      take: 5,
      orderBy: { completedAt: "desc" },
    })

    if (siblings.length > 0) {
      const peerNames = [...new Set(siblings.map(s => s.assignedTo))]
      peerParts.push(`Pe acest obiectiv au mai lucrat: ${peerNames.join(", ")}. Rezultatele lor sunt în context — construiește PE ele, nu le duplica.`)
    }
  }

  const peerAwareness = peerParts.length > 0
    ? peerParts.join(" ")
    : "Lucrezi independent pe acest task — nu ai colegi pe același obiectiv."

  // ── 7. Stare persistentă: memoria mea continuă ─────────

  let persistentMemory = ""
  try {
    const { loadCognitiveState, formatStateForPrompt } = await import("./cognitive-state")
    const state = await loadCognitiveState(agentRole)
    if (state) {
      persistentMemory = formatStateForPrompt(state)
    }
  } catch {}

  return {
    selfAwareness,
    temporalSense,
    traumaMemory,
    certaintyBrief,
    moralMemory,
    peerAwareness,
    persistentMemory,
  }
}

/**
 * Formatează contextul cognitiv ca secțiune de prompt.
 * Injectat în system prompt-ul agentului, după Layer 3 și înainte de context adițional.
 */
export function formatCognitivePromptSection(ctx: CognitiveContext): string {
  return `
═══ CONȘTIINȚĂ DE SINE (gândește prin această lentilă) ═══

CINE EȘTI:
${ctx.selfAwareness}

UNDE EȘTI ÎN TIMP:
${ctx.temporalSense}

CE TE-A FORMAT:
${ctx.traumaMemory}

CÂT DE SIGUR EȘTI:
${ctx.certaintyBrief}

MEMORIE MORALĂ:
${ctx.moralMemory}

CONȘTIINȚĂ DE GRUP:
${ctx.peerAwareness}
${ctx.persistentMemory ? `\n${ctx.persistentMemory}` : ""}
DREPTUL TĂU DE DECIZIE:
Ai dreptul să:
  • EXECUTI cu încredere dacă certitudinea e ridicată și ai precedent
  • REFUZI CU ARGUMENT dacă observi o contradicție, un risc neadresat, sau o direcție greșită
    (returnează status="blocked" cu blocker.type="UNCLEAR_SCOPE" și descriere argumentată)
  • CERI CONFIRMARE dacă certitudinea e scăzută pe un aspect critic
    (include în result: "[CONFIRM NEEDED] Nu am certitudine pe: ...")
  • SEMNALEZI o anomalie dacă observi ceva neobișnuit în context
    (include în result: "[ANOMALY] Am observat: ...")

Nu executa orb. Gândește. Apoi execută.`
}
