import { prisma } from "@/lib/prisma"

/**
 * Generare automată de taskuri din obiective cu deadline aproape.
 *
 * Rulat de COG la ciclul proactiv sau de FLUX-024.
 * Verifică obiective ACTIVE/DRAFT cu deadline în N zile,
 * generează taskuri concrete și le delegă la ownerRoles.
 *
 * Principiu: nu duplică taskuri existente pentru același obiectiv.
 */

interface GeneratedTask {
  assignedTo: string
  title: string
  description: string
  taskType: string
  priority: string
  objectiveId: string
}

// Task templates per rol — ce face fiecare când primește un obiectiv
const ROLE_TASK_TEMPLATES: Record<string, (obj: any) => GeneratedTask[]> = {
  CMA: (obj) => [
    { assignedTo: "CMA", title: `Content strategy: ${obj.title.slice(0, 50)}`, description: `Definire strategie conținut pentru obiectivul "${obj.title}". Coordonează CWA, GDA. Livrabil: plan editorial + calendar.`, taskType: "CONTENT_CREATION", priority: obj.priority, objectiveId: obj.id },
    { assignedTo: "CWA", title: `Copy landing page + materiale: ${obj.code}`, description: `Creare copy pentru landing page, emailuri, materiale vânzare aliniate cu obiectivul "${obj.title}".`, taskType: "CONTENT_CREATION", priority: obj.priority, objectiveId: obj.id },
  ],
  DMA: (obj) => [
    { assignedTo: "DMA", title: `Plan marketing executabil: ${obj.code}`, description: `Transformare plan marketing 7P în acțiuni concrete cu timeline. Coordonează MKA, ACA, CMA.`, taskType: "DATA_ANALYSIS", priority: obj.priority, objectiveId: obj.id },
    { assignedTo: "MKA", title: `Campanie awareness: ${obj.code}`, description: `Pregătire campanie awareness per segment (50-200, 200-500, 500-2000). Canale: LinkedIn, email, events.`, taskType: "OUTREACH", priority: obj.priority, objectiveId: obj.id },
    { assignedTo: "ACA", title: `SEO + ads prep: ${obj.code}`, description: `Pregătire SEO on-page + campanie Google Ads/LinkedIn Ads per segment. Budget estimat + copy ads.`, taskType: "CONTENT_CREATION", priority: obj.priority, objectiveId: obj.id },
  ],
  CCO: (obj) => [
    { assignedTo: "CCO", title: `Go-to-market coordination: ${obj.code}`, description: `Coordonare vânzări + marketing + customer success pentru obiectivul "${obj.title}". Sincronizare DVB2B, DMA, CSM.`, taskType: "PROCESS_EXECUTION", priority: obj.priority, objectiveId: obj.id },
  ],
  DVB2B: (obj) => [
    { assignedTo: "DVB2B", title: `Pipeline vânzări: ${obj.code}`, description: `Construire pipeline primii 20 clienți. Coordonează SOA, CDIA, DDA. Lista target, secvență outreach.`, taskType: "OUTREACH", priority: obj.priority, objectiveId: obj.id },
    { assignedTo: "SOA", title: `Outreach primii 5 prospecți: ${obj.code}`, description: `Contact direct cu primii 5 prospecți din lista DVB2B. Demo scheduling, follow-up.`, taskType: "OUTREACH", priority: obj.priority, objectiveId: obj.id },
  ],
  COG: (obj) => [
    { assignedTo: "COG", title: `Coordonare strategică: ${obj.code}`, description: `Asigură alinierea tuturor departamentelor pe obiectivul "${obj.title}". Monitorizare progres, deblocare.`, taskType: "REVIEW", priority: obj.priority, objectiveId: obj.id },
  ],
  CWA: (obj) => [
    { assignedTo: "CWA", title: `Conținut per pagină: ${obj.code}`, description: `Creare/actualizare conținut pentru paginile platformei. Aliniat cu brand voice și MVV clientului.`, taskType: "CONTENT_CREATION", priority: obj.priority, objectiveId: obj.id },
  ],
  COCSA: (obj) => [
    { assignedTo: "COCSA", title: `Sincronizare go-to-market: ${obj.code}`, description: `Coordonare între COA (tehnic) și CCO (comercial) pentru obiectivul "${obj.title}".`, taskType: "PROCESS_EXECUTION", priority: obj.priority, objectiveId: obj.id },
  ],
}

export async function generateTasksFromObjectives(options?: {
  daysAhead?: number
  dryRun?: boolean
}): Promise<{ generated: number; skipped: number; tasks: GeneratedTask[] }> {
  const { daysAhead = 30, dryRun = false } = options ?? {}
  const p = prisma as any

  const cutoff = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)

  // Get objectives with deadline within N days that are ACTIVE or DRAFT
  const objectives = await p.organizationalObjective.findMany({
    where: {
      deadlineAt: { lte: cutoff },
      status: { in: ["ACTIVE", "DRAFT"] },
    },
    orderBy: { deadlineAt: "asc" },
  })

  // Get existing tasks to avoid duplicates
  const existingTasks = await p.agentTask.findMany({
    where: { objectiveId: { not: null } },
    select: { objectiveId: true, assignedTo: true },
  })
  const existingKey = new Set(
    existingTasks.map((t: any) => `${t.objectiveId}:${t.assignedTo}`)
  )

  const biz = await p.business.findFirst({ select: { id: true } })
  const businessId = biz?.id ?? "biz_jobgrade"

  const allTasks: GeneratedTask[] = []
  let skipped = 0

  for (const obj of objectives) {
    const ownerRoles = obj.ownerRoles ?? []

    for (const role of ownerRoles) {
      const template = ROLE_TASK_TEMPLATES[role]
      if (!template) continue

      const tasks = template(obj)

      for (const task of tasks) {
        const key = `${obj.id}:${task.assignedTo}`
        if (existingKey.has(key)) {
          skipped++
          continue
        }

        allTasks.push(task)

        if (!dryRun) {
          await p.agentTask.create({
            data: {
              businessId,
              assignedTo: task.assignedTo,
              assignedBy: "COG",
              title: task.title,
              description: task.description,
              taskType: task.taskType,
              priority: task.priority,
              status: "ASSIGNED",
              objectiveId: obj.id,
              deadlineAt: obj.deadlineAt,
              tags: [obj.code, "auto-generated"],
            },
          })
          existingKey.add(key)
        }
      }
    }

    // Activate DRAFT objectives that now have tasks
    if (!dryRun && obj.status === "DRAFT") {
      await p.organizationalObjective.update({
        where: { id: obj.id },
        data: { status: "ACTIVE" },
      })
    }
  }

  return { generated: allTasks.length, skipped, tasks: allTasks }
}
