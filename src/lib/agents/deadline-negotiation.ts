/**
 * deadline-negotiation.ts — Negocierea termenelor prin ierarhie
 *
 * Când vine un obiectiv cu termen:
 * 1. Managerul evaluează fezabilitatea (încărcare echipă + priorități curente)
 * 2. Dacă fezabil → acceptă și delegă
 * 3. Dacă nefezabil → revine cu:
 *    - De ce nu e fezabil (încărcarea reală)
 *    - Ce ar trebui schimbat (reprioritizare, resurse suplimentare)
 *    - Ordinea de priorități curentă cu propuneri de modificare
 *    - Consecințele fiecărei variante
 *    - Termen alternativ realist
 *
 * Se aplică la FIECARE nivel ierarhic, cascadat.
 * Principiu: dezvoltare armonioasă, nu acceptare oarbă → blocare.
 */

import { prisma } from "@/lib/prisma"
import { getDirectSubordinates } from "./hierarchy-enforcer"
import Anthropic from "@anthropic-ai/sdk"

export interface DeadlineProposal {
  /** Obiectivul propus */
  objectiveTitle: string
  /** Termenul cerut */
  requestedDeadline: Date
  /** Cine cere */
  requestedBy: string
  /** Cine evaluează */
  evaluatedBy: string
}

export interface FeasibilityResult {
  /** Fezabil în termenul cerut? */
  feasible: boolean
  /** Evaluatorul */
  evaluatedBy: string
  /** Încărcarea curentă a echipei */
  currentWorkload: {
    activeTasksCount: number
    blockedTasksCount: number
    pendingReviewCount: number
    activeObjectivesCount: number
  }
  /** Ordinea de priorități curentă */
  currentPriorities: Array<{
    title: string
    priority: string
    deadline: string | null
    progress: number
  }>
  /** Dacă fezabil: plan de execuție */
  executionPlan?: string
  /** Dacă nefezabil: motive + alternative */
  infeasibilityReason?: string
  alternatives?: Array<{
    option: string
    description: string
    consequence: string
    newDeadline?: string
  }>
  /** Termen realist propus */
  realisticDeadline?: Date
}

/**
 * Evaluează fezabilitatea unui obiectiv cu termen la un nivel ierarhic.
 */
export async function evaluateFeasibility(proposal: DeadlineProposal): Promise<FeasibilityResult> {
  const p = prisma as any
  const now = new Date()

  // 1. Colectează încărcarea echipei
  const subordinates = await getDirectSubordinates(proposal.evaluatedBy)
  const allRoles = [proposal.evaluatedBy, ...subordinates]

  const [activeTasks, blockedTasks, pendingReview, activeObjectives] = await Promise.all([
    p.agentTask.count({
      where: { assignedTo: { in: allRoles }, status: { in: ["ASSIGNED", "ACCEPTED", "IN_PROGRESS"] } },
    }).catch(() => 0),
    p.agentTask.count({
      where: { assignedTo: { in: allRoles }, status: "BLOCKED" },
    }).catch(() => 0),
    p.agentTask.count({
      where: { assignedTo: { in: allRoles }, status: "REVIEW_PENDING" },
    }).catch(() => 0),
    p.organizationalObjective.count({
      where: { status: "ACTIVE", ownerRoles: { hasSome: allRoles } },
    }).catch(() => 0),
  ])

  // 2. Priorități curente
  const objectives = await p.organizationalObjective.findMany({
    where: { status: "ACTIVE", ownerRoles: { hasSome: allRoles } },
    select: { title: true, priority: true, deadlineAt: true, currentValue: true, targetValue: true },
    orderBy: [{ priority: "asc" }, { deadlineAt: "asc" }],
    take: 10,
  }).catch(() => [])

  const currentPriorities = objectives.map((o: any) => ({
    title: o.title,
    priority: o.priority,
    deadline: o.deadlineAt?.toISOString().split("T")[0] || null,
    progress: o.targetValue > 0 ? Math.round((o.currentValue || 0) / o.targetValue * 100) : 0,
  }))

  const workload = {
    activeTasksCount: activeTasks,
    blockedTasksCount: blockedTasks,
    pendingReviewCount: pendingReview,
    activeObjectivesCount: activeObjectives,
  }

  // 3. Evaluare AI — managerul evaluează cu cunoașterea lui
  const daysUntilDeadline = Math.round((proposal.requestedDeadline.getTime() - now.getTime()) / (24 * 3600000))

  const client = new Anthropic()
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1000,
    system: `Esti managerul ${proposal.evaluatedBy}. Evaluezi daca poti livra un obiectiv in termenul cerut.

REGULA FUNDAMENTALA DE ARGUMENTARE:
- Argumentezi DOAR cu vocabularul nivelului TAU ierarhic
- NU cobori in detalii tehnice ale subordonatilor
- Daca esti director (COG, COA, COCSA, CCO, CFO, DMA): vorbesti despre echipe, prioritati, capacitate, directii
- Daca esti manager (EMA, QLA, PMA, CSSA): vorbesti despre taskuri, competente, blocaje operationale
- NICIODATA detalii de cod, API-uri, campuri din DB, endpoint-uri — alea raman la nivelul tehnic

Exemplu CORECT pentru director: "Echipa comerciala are 3 prioritati mai mari in lucru"
Exemplu GRESIT pentru director: "Endpoint-ul /api/v1/pricing returneaza 404"

Raspunde STRICT cu JSON valid:
{
  "feasible": true/false,
  "reason": "explicatie concisa LA NIVELUL TAU",
  "executionPlan": "plan daca feasible (sau null)",
  "alternatives": [
    {"option": "Varianta A", "description": "ce schimbam", "consequence": "ce pierdem/castigam", "newDeadline": "2026-06-01"}
  ],
  "realisticDays": numar_zile_realiste
}`,
    messages: [{
      role: "user",
      content: `OBIECTIV NOU: "${proposal.objectiveTitle}"
TERMEN CERUT: ${daysUntilDeadline} zile (${proposal.requestedDeadline.toISOString().split("T")[0]})
CERUT DE: ${proposal.requestedBy}

INCARCAREA ECHIPEI MELE (${subordinates.length} subordonati):
- Taskuri active: ${activeTasks}
- Taskuri blocate: ${blockedTasks}
- Asteapta review: ${pendingReview}
- Obiective active: ${activeObjectives}

PRIORITATI CURENTE:
${currentPriorities.map((p: any, i: number) => `${i + 1}. ${p.title} (${p.priority}, deadline: ${p.deadline || "fara"}, progres: ${p.progress}%)`).join("\n")}

Evalueaza ONEST: pot livra in termen? Daca nu, propune alternative CONCRETE cu consecinte.`,
    }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""

  try {
    const parsed = JSON.parse(text)

    if (parsed.feasible) {
      return {
        feasible: true,
        evaluatedBy: proposal.evaluatedBy,
        currentWorkload: workload,
        currentPriorities,
        executionPlan: parsed.executionPlan || parsed.reason,
      }
    }

    return {
      feasible: false,
      evaluatedBy: proposal.evaluatedBy,
      currentWorkload: workload,
      currentPriorities,
      infeasibilityReason: parsed.reason,
      alternatives: parsed.alternatives || [],
      realisticDeadline: parsed.realisticDays
        ? new Date(now.getTime() + parsed.realisticDays * 24 * 3600000)
        : undefined,
    }
  } catch {
    // Parse error — fallback conservator
    return {
      feasible: activeTasks < 10 && blockedTasks < 3,
      evaluatedBy: proposal.evaluatedBy,
      currentWorkload: workload,
      currentPriorities,
      executionPlan: activeTasks < 10 ? "Capacitate disponibila" : undefined,
      infeasibilityReason: activeTasks >= 10 ? `Echipa supraincarcata: ${activeTasks} taskuri active, ${blockedTasks} blocate` : undefined,
    }
  }
}

/**
 * Negociere cascadată — evaluează la fiecare nivel ierarhic.
 * COG întreabă directorii → directorii întreabă managerii → fiecare evaluează.
 */
export async function cascadedNegotiation(
  objectiveTitle: string,
  requestedDeadline: Date,
  startFromRole: string,
  requestedBy: string,
): Promise<{
  overallFeasible: boolean
  evaluations: FeasibilityResult[]
  summary: string
}> {
  const evaluations: FeasibilityResult[] = []

  // Evaluare la nivelul curent
  const currentEval = await evaluateFeasibility({
    objectiveTitle,
    requestedDeadline,
    requestedBy,
    evaluatedBy: startFromRole,
  })
  evaluations.push(currentEval)

  // Dacă nu e fezabil, nu mai cascadăm — revenim cu motivele
  if (!currentEval.feasible) {
    return {
      overallFeasible: false,
      evaluations,
      summary: `${startFromRole}: NEFEZABIL — ${currentEval.infeasibilityReason}. ${currentEval.alternatives?.length ? `${currentEval.alternatives.length} alternative propuse.` : "Fara alternative."}`,
    }
  }

  // Fezabil la nivelul curent — cascadăm la subordonați
  const subs = await getDirectSubordinates(startFromRole)
  for (const sub of subs.slice(0, 5)) { // max 5 subordonați evaluați
    const subEval = await evaluateFeasibility({
      objectiveTitle,
      requestedDeadline,
      requestedBy: startFromRole,
      evaluatedBy: sub,
    })
    evaluations.push(subEval)

    // Dacă un subordonat spune nefezabil, marcăm overall ca nefezabil
    if (!subEval.feasible) {
      return {
        overallFeasible: false,
        evaluations,
        summary: `${startFromRole}: fezabil, dar ${sub}: NEFEZABIL — ${subEval.infeasibilityReason}. Obiectivul nu poate fi livrat integral.`,
      }
    }
  }

  return {
    overallFeasible: true,
    evaluations,
    summary: `Fezabil la toate nivelurile evaluate (${evaluations.length} manageri consultați). Plan de execuție disponibil.`,
  }
}
