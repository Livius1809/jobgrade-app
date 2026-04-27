/**
 * lateral-collaboration.ts — Colaborare orizontală mediată ierarhic
 *
 * Când un agent constată că nu poate finaliza un task (lipsesc competențe
 * din alt departament):
 *
 * 1. Escalează la șeful direct: "Nu pot finaliza, lipsește X"
 * 2. Șeful identifică omologul de pe același palier: "Întreabă pe Y"
 * 3. Y primește cererea, rafinează, delegă în structura lui
 * 4. Răspunsul urcă la Y, Y trimite la solicitant
 * 5. Solicitantul integrează și livrează
 *
 * Responsabilitatea comunicării finale revine celui cu contribuția
 * cea mai mare (de regulă, inițiatorul cererii).
 *
 * Principiu: comunicare laterală MEDIATĂ ierarhic, nu directă.
 * Agentul nu contactează pe oricine — trece prin șeful lui.
 */

import { prisma } from "@/lib/prisma"
import { getDirectSubordinates, getDirectSuperior } from "./hierarchy-enforcer"

export interface LateralRequest {
  /** Agentul care are nevoie de ajutor */
  requestingAgent: string
  /** Task-ul pe care lucrează */
  taskId: string
  /** Ce competență/informație lipsește */
  whatIsNeeded: string
  /** Context: de ce are nevoie */
  context: string
}

export interface LateralResult {
  /** Ce s-a întâmplat */
  action: "routed" | "escalated" | "self-resolved" | "no-peer-found"
  /** La cine s-a trimis cererea */
  routedTo?: string
  /** Prin ce manager s-a mediat */
  mediatedBy?: string
  /** Task-ul creat pentru omolog */
  peerTaskId?: string
  /** Explicație */
  explanation: string
}

/**
 * Procesează o cerere de colaborare laterală.
 *
 * Flow:
 * 1. Găsește superiorul direct al solicitantului
 * 2. Superiorul identifică care din omologii lui (pe același nivel) are competența
 * 3. Creează task la omolog cu prefix "[Cerere laterală]"
 * 4. Omologul rafinează și delegă în structura lui
 */
export async function requestLateralHelp(req: LateralRequest): Promise<LateralResult> {
  const p = prisma as any

  // 1. Găsește superiorul direct
  const manager = await getDirectSuperior(req.requestingAgent)
  if (!manager) {
    return { action: "escalated", explanation: `${req.requestingAgent} nu are superior direct — escalare manuală` }
  }

  // 2. Găsește omologii (ceilalți subordonați ai aceluiași manager)
  const siblings = await getDirectSubordinates(manager)
  const peers = siblings.filter(s => s !== req.requestingAgent)

  if (peers.length === 0) {
    // Niciun omolog — escalăm la nivelul superior
    const grandManager = await getDirectSuperior(manager)
    if (grandManager) {
      // Creăm task de escalare la managerul superior
      const task = await p.agentTask.create({
        data: {
          businessId: "biz_jobgrade",
          assignedBy: manager,
          assignedTo: grandManager,
          title: `[Escalare laterală] ${req.requestingAgent} are nevoie de competențe din alt departament`,
          description: `Subordonatul meu ${req.requestingAgent} lucrează la task ${req.taskId} și are nevoie de:\n${req.whatIsNeeded}\n\nContext: ${req.context}\n\nNu am în echipa mea pe cineva care poate ajuta. Te rog direcționează la departamentul potrivit.`,
          taskType: "INVESTIGATION",
          priority: "HIGH",
          status: "ASSIGNED",
          tags: ["lateral-escalation", `from:${req.requestingAgent}`, `via:${manager}`, `original-task:${req.taskId}`],
        },
      })
      return {
        action: "escalated",
        mediatedBy: manager,
        routedTo: grandManager,
        peerTaskId: task.id,
        explanation: `Niciun omolog disponibil la nivel ${manager}. Escalat la ${grandManager} pentru redirecționare inter-departamentală.`,
      }
    }
    return { action: "no-peer-found", explanation: "Niciun omolog și niciun superior — nu se poate ruta" }
  }

  // 3. Identifică cel mai potrivit omolog din KB
  // Strategie: caută semantic în KB-ul fiecărui peer care omolog are cunoaștere pe tema cerută
  let bestPeer: string | null = null
  let bestScore = 0

  try {
    const { searchKB } = await import("@/lib/kb/search")
    for (const peer of peers) {
      const results = await searchKB(peer, req.whatIsNeeded, 3)
      const score = results.length > 0 ? (results[0].similarity ?? 0) : 0
      if (score > bestScore) {
        bestScore = score
        bestPeer = peer
      }
    }
  } catch {
    // Fallback: primul peer din listă
    bestPeer = peers[0]
  }

  if (!bestPeer) bestPeer = peers[0]

  // 4. Creează task la omologul identificat
  const task = await p.agentTask.create({
    data: {
      businessId: "biz_jobgrade",
      assignedBy: manager,
      assignedTo: bestPeer,
      title: `[Cerere laterală de la ${req.requestingAgent}] ${req.whatIsNeeded.slice(0, 80)}`,
      description: [
        `Colegul tău ${req.requestingAgent} (din echipa lui ${manager}) lucrează la un task și are nevoie de ajutorul tău.`,
        ``,
        `CE ARE NEVOIE: ${req.whatIsNeeded}`,
        `CONTEXT: ${req.context}`,
        ``,
        `INSTRUCȚIUNI:`,
        `1. Rafinează cererea pentru domeniul tău de competență`,
        `2. Dacă poți răspunde direct din KB-ul tău, răspunde`,
        `3. Dacă trebuie să delegi la subordonații tăi, delegă`,
        `4. Rezultatul final trebuie integrat de ${req.requestingAgent} în task-ul lui`,
        `5. Comunică rezultatul înapoi — ${req.requestingAgent} are responsabilitatea livrării finale`,
      ].join("\n"),
      taskType: "INVESTIGATION",
      priority: "HIGH",
      status: "ASSIGNED",
      tags: [
        "lateral-collaboration",
        `from:${req.requestingAgent}`,
        `via:${manager}`,
        `original-task:${req.taskId}`,
        `peer-request`,
      ],
    },
  })

  // 5. Marchează task-ul original ca BLOCKED cu referință la cererea laterală
  await p.agentTask.update({
    where: { id: req.taskId },
    data: {
      blockerType: "DEPENDENCY",
      blockerDescription: `Aștept răspuns lateral de la ${bestPeer} (task: ${task.id}). Cerere mediată de ${manager}.`,
      blockerTaskId: task.id,
      blockedAt: new Date(),
    },
  }).catch(() => {})

  return {
    action: "routed",
    routedTo: bestPeer,
    mediatedBy: manager,
    peerTaskId: task.id,
    explanation: `Cerere trimisă la ${bestPeer} (omolog, mediat de ${manager}). KB match: ${Math.round(bestScore * 100)}%. Task original marcat BLOCKED/DEPENDENCY.`,
  }
}

/**
 * Integrează răspunsul lateral în task-ul original.
 * Apelat când task-ul lateral e COMPLETED.
 */
export async function integrateLateralResponse(
  lateralTaskId: string,
  lateralResult: string,
): Promise<{ unblocked: boolean; originalTaskId: string | null }> {
  const p = prisma as any

  // Găsește task-ul original care așteaptă
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

  // Deblochează și adaugă rezultatul lateral în descriere
  await p.agentTask.update({
    where: { id: originalTask.id },
    data: {
      status: "ASSIGNED",
      blockerType: null,
      blockerDescription: null,
      blockerTaskId: null,
      blockedAt: null,
      unblockedAt: new Date(),
      description: `${originalTask.description}\n\n--- RĂSPUNS LATERAL (de la cererea ${lateralTaskId}) ---\n${lateralResult}\n\nIntegrează acest răspuns în soluția ta finală.`,
    },
  })

  return { unblocked: true, originalTaskId: originalTask.id }
}
