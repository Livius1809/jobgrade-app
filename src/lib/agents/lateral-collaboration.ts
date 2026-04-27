/**
 * lateral-collaboration.ts — Colaborare laterala mediata ierarhic
 *
 * Flux corect (ambii sefi implicati):
 *
 * 1. Agent A constata ca nu poate finaliza → cere APROBAREA sefului direct (sef_A)
 * 2. Sef_A aproba si trimite cerere la OMOLOGUL sau (sef_B) — seful agentului tinta
 * 3. Sef_B primeste cererea si DELEGHEAZA la subordonatul potrivit (Agent B)
 * 4. Agent B livreaza → raspunsul urca la sef_B → sef_A → Agent A
 * 5. Bucla inchisa: ambii sefi stiu, ambii subordonati stiu, nimeni nu e ocolit
 *
 * NU se permite: agent → agent direct cross-departament
 * TOTUL trece prin ierarhie
 */

import { prisma } from "@/lib/prisma"
import { getDirectSubordinates, getDirectSuperior } from "./hierarchy-enforcer"

export interface LateralRequest {
  requestingAgent: string
  taskId: string
  whatIsNeeded: string
  context: string
}

export interface LateralResult {
  action: "routed" | "escalated" | "self-resolved" | "no-peer-found"
  routedTo?: string
  mediatedBy?: string
  peerManagerNotified?: string
  peerTaskId?: string
  explanation: string
}

/**
 * Procesează o cerere de colaborare laterală — MEDIATA ierarhic.
 *
 * Pas 1: Gaseste seful direct al solicitantului (sef_A)
 * Pas 2: Gaseste seful agentului tinta sau omologul potrivit (sef_B)
 * Pas 3: Sef_A trimite cerere formala la sef_B
 * Pas 4: Sef_B delegheaza la subordonatul potrivit
 * Pas 5: Ambii sefi sunt notificati — bucla inchisa
 */
export async function requestLateralHelp(req: LateralRequest): Promise<LateralResult> {
  const p = prisma as any

  // Pas 1: Gaseste superiorul direct al solicitantului
  const managerA = await getDirectSuperior(req.requestingAgent)
  if (!managerA) {
    return { action: "escalated", explanation: `${req.requestingAgent} nu are superior direct` }
  }

  // Pas 2: Gaseste cel mai potrivit omolog/manager de pe alt ramura
  // Cauta in KB-urile tuturor agentilor cine are competenta ceruta
  let targetPeer: string | null = null
  let targetPeerManager: string | null = null

  // Mai intai: cautam in toti agentii (nu doar omologi directi)
  // si gasim cine are KB relevant
  try {
    const allAgents = await p.agent?.findMany({
      where: { isActive: true },
      select: { role: true },
    }) ?? []

    const { searchKB } = await import("@/lib/kb/search")
    let bestScore = 0

    for (const agent of allAgents) {
      if (agent.role === req.requestingAgent || agent.role === managerA) continue
      const results = await searchKB(agent.role, req.whatIsNeeded, 2)
      const score = results.length > 0 ? (results[0].similarity ?? 0) : 0
      if (score > bestScore) {
        bestScore = score
        targetPeer = agent.role
      }
    }
  } catch {
    // Fallback: cautam omologii directi ai managerA
    const siblings = await getDirectSubordinates(managerA)
    const peers = siblings.filter(s => s !== req.requestingAgent)
    if (peers.length > 0) targetPeer = peers[0]
  }

  if (!targetPeer) {
    return { action: "no-peer-found", explanation: "Niciun agent cu competenta relevanta gasit" }
  }

  // Gasim seful agentului tinta (sef_B)
  targetPeerManager = await getDirectSuperior(targetPeer)

  // Pas 3: Sef_A trimite cerere formala la sef_B (sau direct la targetPeer daca sunt la acelasi nivel)
  const mediator = targetPeerManager || managerA

  // Task 1: Cerere de la sef_A catre sef_B
  // (Daca sef_A = sef_B, adica sunt in acelasi departament, cererea merge direct)
  if (targetPeerManager && targetPeerManager !== managerA) {
    // Departamente diferite — notificam sef_B
    await p.agentTask.create({
      data: {
        businessId: "biz_jobgrade",
        assignedBy: managerA,
        assignedTo: targetPeerManager,
        title: `[Cerere inter-departamentala] Echipa mea are nevoie de sprijin din echipa ta`,
        description: [
          `Subordonatul meu ${req.requestingAgent} lucreaza la un task si are nevoie de competente din echipa ta.`,
          ``,
          `CE ARE NEVOIE: ${req.whatIsNeeded}`,
          `CONTEXT: ${req.context}`,
          ``,
          `Te rog delegheaza la subordonatul tau cel mai potrivit (recomandat: ${targetPeer}).`,
          `Raspunsul va reveni la ${req.requestingAgent} prin mine (${managerA}).`,
        ].join("\n"),
        taskType: "INVESTIGATION",
        priority: "HIGH",
        status: "ASSIGNED",
        tags: ["lateral-manager-request", `from:${managerA}`, `for:${req.requestingAgent}`, `target:${targetPeer}`, `original-task:${req.taskId}`],
      },
    })
  }

  // Task 2: Cerere operationala la agentul tinta (delegata de sef_B)
  const task = await p.agentTask.create({
    data: {
      businessId: "biz_jobgrade",
      assignedBy: targetPeerManager || managerA,
      assignedTo: targetPeer,
      title: `[Cerere laterala de la ${req.requestingAgent}] ${req.whatIsNeeded.slice(0, 80)}`,
      description: [
        `Colegul ${req.requestingAgent} (din echipa ${managerA}) are nevoie de ajutorul tau.`,
        `Cererea a fost aprobata de seful tau ${targetPeerManager || managerA}.`,
        ``,
        `CE ARE NEVOIE: ${req.whatIsNeeded}`,
        `CONTEXT: ${req.context}`,
        ``,
        `INSTRUCTIUNI:`,
        `1. Raspunde la cerere din competenta ta`,
        `2. Daca trebuie sa delegi mai departe, delegheaza la subordonatii tai`,
        `3. Rezultatul final ajunge la ${req.requestingAgent} prin ierarhie`,
        `4. Confirma livrarea sefului tau (${targetPeerManager || managerA})`,
      ].join("\n"),
      taskType: "INVESTIGATION",
      priority: "HIGH",
      status: "ASSIGNED",
      tags: [
        "lateral-collaboration",
        `from:${req.requestingAgent}`,
        `via:${managerA}`,
        `approved-by:${targetPeerManager || managerA}`,
        `original-task:${req.taskId}`,
      ],
    },
  })

  // Pas 4: Marcam task-ul original ca BLOCKED cu dependenta
  await p.agentTask.update({
    where: { id: req.taskId },
    data: {
      blockerType: "DEPENDENCY",
      blockerDescription: `Cerere laterala trimisa la ${targetPeer} (aprobata de ${managerA}, notificat ${targetPeerManager || "acelasi manager"}). Asteptam raspuns.`,
      blockerTaskId: task.id,
      blockedAt: new Date(),
    },
  }).catch(() => {})

  return {
    action: "routed",
    routedTo: targetPeer,
    mediatedBy: managerA,
    peerManagerNotified: targetPeerManager || undefined,
    peerTaskId: task.id,
    explanation: `Cerere trimisa la ${targetPeer} (seful lui ${targetPeerManager || managerA} notificat). Mediat de ${managerA}. Bucla ierarhica inchisa.`,
  }
}

/**
 * Integreaza raspunsul lateral in task-ul original.
 * Apelat cand task-ul lateral e COMPLETED.
 */
export async function integrateLateralResponse(
  lateralTaskId: string,
  lateralResult: string,
): Promise<{ unblocked: boolean; originalTaskId: string | null }> {
  const p = prisma as any

  const originalTask = await p.agentTask.findFirst({
    where: {
      blockerTaskId: lateralTaskId,
      status: "BLOCKED",
      blockerType: "DEPENDENCY",
    },
  })

  if (!originalTask) {
    return { unblocked: false, originalTaskId: null }
  }

  await p.agentTask.update({
    where: { id: originalTask.id },
    data: {
      status: "ASSIGNED",
      blockerType: null,
      blockerDescription: null,
      blockerTaskId: null,
      blockedAt: null,
      unblockedAt: new Date(),
      description: `${originalTask.description}\n\n--- RASPUNS LATERAL (de la cererea ${lateralTaskId}) ---\n${lateralResult}\n\nIntegheaza acest raspuns in solutia ta finala.`,
    },
  })

  // Capturam in sistemul de invatare
  try {
    const { learningFunnel } = await import("./learning-funnel")
    await learningFunnel({
      agentRole: originalTask.assignedTo,
      type: "FEEDBACK",
      input: `Cerere laterala: ${originalTask.title}`,
      output: lateralResult.slice(0, 1500),
      success: true,
      metadata: { source: "lateral-collaboration", lateralTaskId },
    })
  } catch {}

  return { unblocked: true, originalTaskId: originalTask.id }
}
