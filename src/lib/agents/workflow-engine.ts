/**
 * workflow-engine.ts — Motor de execuție procese
 *
 * Conectează FluxStepRole (metadata) la execuție reală (runtime).
 *
 * Ciclul unui proces:
 *   1. startProcess(fluxId, context) → creează ProcessInstance + StepInstances
 *   2. La fiecare ciclu cron: advanceProcesses() → verifică pași completați → pornește următorii
 *   3. La SLA timeout: escalare automată
 *   4. La completare ultimul pas: ProcessInstance.status = COMPLETED
 *
 * Handoff automat: output pasul N → input pasul N+1
 * RACI enforcement: OWNER execută, REVIEWER validează, NOTIFIED e informat
 * SLA monitoring: depășire → escalare la managerul agentului
 *
 * Refolosibil: același engine la B2B client (monitorizare procese + Manual calitate)
 */

import { prisma } from "@/lib/prisma"

// ── Start proces ─────────────────────────────────────────────

export async function startProcess(
  businessId: string,
  fluxId: string,
  name: string,
  triggeredBy: string,
  initialContext?: Record<string, unknown>,
): Promise<string> {
  // 1. Încarcă definițiile pașilor din FluxStepRole
  const stepDefs = await prisma.fluxStepRole.findMany({
    where: { fluxId },
    orderBy: { stepId: "asc" },
  })

  if (stepDefs.length === 0) {
    throw new Error(`Flux ${fluxId} nu are pași definiți`)
  }

  // Grupăm per stepId (un pas poate avea mai mulți RACI)
  const stepsMap = new Map<string, typeof stepDefs>()
  for (const sd of stepDefs) {
    if (!stepsMap.has(sd.stepId)) stepsMap.set(sd.stepId, [])
    stepsMap.get(sd.stepId)!.push(sd)
  }

  const stepIds = [...stepsMap.keys()]
  const firstStep = stepIds[0]

  // 2. Creăm instanța de proces
  const instance = await prisma.processInstance.create({
    data: {
      businessId,
      fluxId,
      name,
      triggeredBy,
      currentStep: firstStep,
      context: (initialContext || {}) as any,
      status: "RUNNING",
    },
  })

  // 3. Creăm instanțele de pași
  for (const [stepId, roles] of stepsMap) {
    const ownerRole = roles.find(r => r.raci === "OWNER")
    const slaMinutes = ownerRole?.slaMinutes || null

    await prisma.processStepInstance.create({
      data: {
        processId: instance.id,
        stepId,
        assignedTo: ownerRole?.roleCode || roles[0].roleCode,
        status: stepId === firstStep ? "READY" : "PENDING",
        slaDeadline: slaMinutes
          ? new Date(Date.now() + slaMinutes * 60000)
          : null,
      },
    })
  }

  // 4. Creăm task pentru primul pas
  await createTaskForStep(instance.id, firstStep, businessId, initialContext)

  return instance.id
}

// ── Avansare procese (apelat la fiecare ciclu cron) ──────────

export async function advanceProcesses(): Promise<{
  advanced: number
  completed: number
  escalated: number
  failed: number
}> {
  let advanced = 0
  let completed = 0
  let escalated = 0
  let failed = 0

  // Găsim procese RUNNING
  const runningProcesses = await prisma.processInstance.findMany({
    where: { status: "RUNNING" },
    include: {
      steps: { orderBy: { stepId: "asc" } },
    },
  })

  for (const process of runningProcesses) {
    const steps = process.steps
    const currentStep = steps.find(s => s.stepId === process.currentStep)

    if (!currentStep) continue

    // ── Verificăm dacă pasul curent e completat ──
    if (currentStep.status === "COMPLETED") {
      // Handoff: output pasul curent → input pasul următor
      const currentIndex = steps.findIndex(s => s.id === currentStep.id)
      const nextStep = steps[currentIndex + 1]

      if (nextStep) {
        // Avansăm la pasul următor
        await prisma.processStepInstance.update({
          where: { id: nextStep.id },
          data: {
            status: "READY",
            input: (currentStep.output || {}) as any,
            startedAt: new Date(),
            slaDeadline: nextStep.slaDeadline || new Date(Date.now() + 24 * 3600000),
          },
        })

        await prisma.processInstance.update({
          where: { id: process.id },
          data: { currentStep: nextStep.stepId },
        })

        // Creăm task pentru noul pas
        await createTaskForStep(
          process.id,
          nextStep.stepId,
          process.businessId,
          currentStep.output as Record<string, unknown> | undefined,
        )

        // Notificăm NOTIFIED roles
        await notifyRoles(process.fluxId, nextStep.stepId, process.businessId)

        advanced++
      } else {
        // Ultimul pas completat → proces finalizat
        await prisma.processInstance.update({
          where: { id: process.id },
          data: { status: "COMPLETED", completedAt: new Date() },
        })
        completed++
      }
    }

    // ── Verificăm dacă task-ul pasului curent e completat (sync) ──
    if (currentStep.status === "READY" || currentStep.status === "IN_PROGRESS") {
      if (currentStep.taskId) {
        const task = await prisma.agentTask.findUnique({
          where: { id: currentStep.taskId },
          select: { status: true, result: true, resultQuality: true },
        })

        if (task?.status === "COMPLETED") {
          await prisma.processStepInstance.update({
            where: { id: currentStep.id },
            data: {
              status: "COMPLETED",
              output: (task.result ? { result: task.result } : {}) as any,
              completedAt: new Date(),
              reviewQuality: task.resultQuality,
            },
          })
          // Va fi avansat la următorul ciclu
        } else if (task?.status === "FAILED") {
          await prisma.processStepInstance.update({
            where: { id: currentStep.id },
            data: {
              status: "FAILED",
              failedAt: new Date(),
              failReason: "Task eșuat",
            },
          })

          await prisma.processInstance.update({
            where: { id: process.id },
            data: { status: "FAILED", failedAt: new Date(), failReason: `Pasul ${currentStep.stepId} eșuat` },
          })
          failed++
        }
      }
    }

    // ── SLA monitoring ──
    if (
      currentStep.status === "READY" || currentStep.status === "IN_PROGRESS"
    ) {
      if (currentStep.slaDeadline && new Date() > currentStep.slaDeadline) {
        // SLA depășit → escalare
        const manager = await prisma.agentRelationship.findFirst({
          where: { childRole: currentStep.assignedTo, relationType: "REPORTS_TO", isActive: true },
          select: { parentRole: true },
        }).catch(() => null)

        if (manager) {
          await prisma.agentTask.create({
            data: {
              businessId: process.businessId,
              assignedBy: "WORKFLOW_ENGINE",
              assignedTo: manager.parentRole,
              title: `[SLA] Pasul "${currentStep.stepId}" din "${process.name}" a depășit termenul`,
              description: `Agentul ${currentStep.assignedTo} nu a finalizat pasul în timpul alocat. Procesul ${process.fluxId} este blocat. Interveniți.`,
              taskType: "REVIEW",
              priority: "HIGH",
              status: "ASSIGNED",
              tags: ["sla-breach", "workflow", process.fluxId],
            },
          })
          escalated++
        }

        // Extindem SLA cu 50% (nu blocăm procesul, doar escalăm)
        const extensionMs = currentStep.slaDeadline
          ? (currentStep.slaDeadline.getTime() - (currentStep.startedAt?.getTime() || Date.now())) * 0.5
          : 3600000
        await prisma.processStepInstance.update({
          where: { id: currentStep.id },
          data: {
            slaDeadline: new Date(Date.now() + Math.max(extensionMs, 3600000)),
          },
        })
      }
    }
  }

  return { advanced, completed, escalated, failed }
}

// ── Creează task pentru un pas de proces ──────────────────────

async function createTaskForStep(
  processId: string,
  stepId: string,
  businessId: string,
  inputContext?: Record<string, unknown>,
): Promise<void> {
  // Găsim definirea pasului
  const step = await prisma.processStepInstance.findFirst({
    where: { processId, stepId },
  })
  if (!step) return

  const process = await prisma.processInstance.findUnique({
    where: { id: processId },
    select: { fluxId: true, name: true },
  })

  // Găsim RACI info
  const raciRoles = await prisma.fluxStepRole.findMany({
    where: { fluxId: process?.fluxId || "", stepId },
  })

  const reviewers = raciRoles.filter(r => r.raci === "REVIEWER").map(r => r.roleCode)

  const task = await prisma.agentTask.create({
    data: {
      businessId,
      assignedBy: "WORKFLOW_ENGINE",
      assignedTo: step.assignedTo,
      title: `[PROCES] ${process?.name || ""} — Pasul: ${stepId}`,
      description: [
        `Execută pasul "${stepId}" din procesul "${process?.name}".`,
        inputContext ? `\nDate de intrare (din pasul anterior):\n${JSON.stringify(inputContext, null, 2).slice(0, 500)}` : "",
        reviewers.length > 0 ? `\nRevieweri: ${reviewers.join(", ")} — output-ul tău va fi validat de ei.` : "",
        `\nLivrabil: output complet, review-abil, care devine input pentru pasul următor.`,
      ].filter(Boolean).join("\n"),
      taskType: "PROCESS_EXECUTION",
      priority: "HIGH",
      status: "ASSIGNED",
      tags: ["workflow", process?.fluxId || "", stepId],
    },
  })

  // Legăm task-ul de step
  await prisma.processStepInstance.update({
    where: { id: step.id },
    data: { taskId: task.id, status: "IN_PROGRESS", startedAt: new Date() },
  })
}

// ── Notifică roluri NOTIFIED ─────────────────────────────────

async function notifyRoles(
  fluxId: string,
  stepId: string,
  businessId: string,
): Promise<void> {
  const notified = await prisma.fluxStepRole.findMany({
    where: { fluxId, stepId, raci: "NOTIFIED" },
    select: { roleCode: true },
  })

  for (const n of notified) {
    await prisma.agentTask.create({
      data: {
        businessId,
        assignedBy: "WORKFLOW_ENGINE",
        assignedTo: n.roleCode,
        title: `[NOTIFICARE] Procesul "${fluxId}" a avansat la pasul "${stepId}"`,
        description: `Ești notificat că procesul a avansat. Nu e necesară acțiune din partea ta decât dacă observi o problemă.`,
        taskType: "KB_RESEARCH",
        priority: "LOW",
        status: "ASSIGNED",
        tags: ["workflow-notification", fluxId, stepId],
      },
    }).catch(() => {})
  }
}

// ── Query: stare proces ──────────────────────────────────────

export async function getProcessStatus(processId: string) {
  const process = await prisma.processInstance.findUnique({
    where: { id: processId },
    include: {
      steps: { orderBy: { stepId: "asc" } },
    },
  })

  if (!process) return null

  const totalSteps = process.steps.length
  const completedSteps = process.steps.filter(s => s.status === "COMPLETED").length
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

  return {
    id: process.id,
    name: process.name,
    fluxId: process.fluxId,
    status: process.status,
    progress,
    currentStep: process.currentStep,
    steps: process.steps.map(s => ({
      stepId: s.stepId,
      assignedTo: s.assignedTo,
      status: s.status,
      slaDeadline: s.slaDeadline,
      completedAt: s.completedAt,
      reviewQuality: s.reviewQuality,
    })),
    startedAt: process.startedAt,
    completedAt: process.completedAt,
  }
}
