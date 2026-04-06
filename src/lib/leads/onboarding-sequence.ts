/**
 * Onboarding Sequence — creează 5 AgentTask-uri SOA pentru secvența de 14 zile.
 *
 * Livrat: 06.04.2026, Pas 4 "Primul Client".
 * Bazat pe SOA system prompt: Day 1 setup, Day 2 training, Day 3 pilot, Day 7 check-in, Day 14 handoff CSSA.
 */

import { prisma } from "@/lib/prisma"

const ONBOARDING_STEPS = [
  {
    day: 1,
    title: "Setup: creare cont, import fișe post, configurare comisie evaluare",
    description: "Ajută clientul să-și configureze contul: import Excel fișe post, setare comisie evaluare, familiarizare cu interfața.",
    taskType: "PROCESS_EXECUTION",
    priority: "HIGH",
  },
  {
    day: 2,
    title: "Training Admin (20 min): navigare, invitare evaluatori, lansare sesiune",
    description: "Sesiune scurtă de training cu admin-ul companiei: cum invită evaluatori, cum lansează o sesiune, cum vede rezultatele.",
    taskType: "PROCESS_EXECUTION",
    priority: "HIGH",
  },
  {
    day: 3,
    title: "Prima evaluare pilot: 3-5 posturi din organigrama clientului",
    description: "Ghidează clientul prin prima evaluare reală pe 3-5 posturi. Verifică dacă criteriile sunt înțelese, răspunde la întrebări.",
    taskType: "PROCESS_EXECUTION",
    priority: "MEDIUM",
  },
  {
    day: 7,
    title: "Check-in săptămânal: probleme, ajustări, feedback",
    description: "Contactează clientul proactiv. Întreabă dacă a întâmpinat dificultăți, dacă are nevoie de suport suplimentar.",
    taskType: "REVIEW",
    priority: "MEDIUM",
  },
  {
    day: 14,
    title: "Handoff la CSSA: status report + feedback client → client activ",
    description: "Predare către Customer Success. Include: raport status onboarding, feedback client, obiective atinse/rămase, recomandări.",
    taskType: "OUTREACH",
    priority: "HIGH",
  },
]

export async function createOnboardingSequence(leadId: string, businessId: string): Promise<{
  tasksCreated: number
  taskIds: string[]
}> {
  const lead = await (prisma as any).lead.findUnique({ where: { id: leadId } })
  if (!lead) throw new Error(`Lead ${leadId} not found`)

  const baseDate = lead.closedAt ?? new Date()
  const taskIds: string[] = []

  for (const step of ONBOARDING_STEPS) {
    const deadlineAt = new Date(new Date(baseDate).getTime() + step.day * 86400000)

    const task = await prisma.agentTask.create({
      data: {
        businessId,
        assignedTo: step.day === 14 ? "CSSA" : "SOA", // Day 14 = handoff
        assignedBy: "SOA",
        taskType: step.taskType as never,
        priority: step.priority as never,
        title: `[Onboarding ${lead.companyName}] ${step.title}`,
        description: step.description,
        deadlineAt,
        tags: ["onboarding", `lead:${leadId}`, `day:${step.day}`],
      },
    })
    taskIds.push(task.id)
  }

  return {
    tasksCreated: taskIds.length,
    taskIds,
  }
}
