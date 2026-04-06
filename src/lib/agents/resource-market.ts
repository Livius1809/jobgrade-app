import { prisma } from "@/lib/prisma"

/**
 * Piață internă de resurse — mecanismul prin care agenții negociază
 * prioritizarea sarcinilor când resursele (API calls, buget compute) sunt limitate.
 *
 * Principiu: fiecare agent are un buget zilnic de "credite" de procesare.
 * Când un agent are nevoie de mai multe resurse, poate "împrumuta" de la
 * agenți cu buget neutilizat, cu cost de prioritate.
 *
 * Implementare MVP: tabel ResourceBudget + endpoint de alocare/transfer.
 */

export interface ResourceAllocation {
  agentRole: string
  dailyBudget: number
  used: number
  available: number
  borrowed: number
  lent: number
}

export interface TransferResult {
  success: boolean
  reason: string
  fromAvailable?: number
  toAvailable?: number
}

/**
 * Obține starea resurselor tuturor agenților activi.
 */
export async function getResourceAllocations(): Promise<ResourceAllocation[]> {
  const p = prisma as any

  // Get all active agents
  const agents = await p.agentDefinition.findMany({
    where: { isActive: true },
    select: { agentRole: true, level: true },
  })

  // Get budget data
  const budgets = await p.resourceBudget.findMany({
    where: {
      periodStart: { lte: new Date() },
      periodEnd: { gte: new Date() },
    },
  }).catch(() => [])

  const budgetMap = new Map(budgets.map((b: any) => [b.agentRole, b]))

  // Default budgets by level
  const DEFAULT_BUDGET: Record<string, number> = {
    STRATEGIC: 100,
    TACTICAL: 50,
    OPERATIONAL: 20,
  }

  return agents.map((a: any) => {
    const budget = budgetMap.get(a.agentRole)
    const dailyBudget = budget?.dailyBudget ?? DEFAULT_BUDGET[a.level] ?? 20
    const used = budget?.used ?? 0
    const borrowed = budget?.borrowed ?? 0
    const lent = budget?.lent ?? 0

    return {
      agentRole: a.agentRole,
      dailyBudget,
      used,
      available: dailyBudget - used + borrowed - lent,
      borrowed,
      lent,
    }
  })
}

/**
 * Transferă resurse de la un agent la altul.
 * Validări: donatorul trebuie să aibă suficient disponibil.
 */
export async function transferResources(
  fromRole: string,
  toRole: string,
  amount: number
): Promise<TransferResult> {
  if (amount <= 0) {
    return { success: false, reason: "Amount must be positive" }
  }

  const allocations = await getResourceAllocations()
  const from = allocations.find((a) => a.agentRole === fromRole)
  const to = allocations.find((a) => a.agentRole === toRole)

  if (!from) return { success: false, reason: `Agent ${fromRole} not found` }
  if (!to) return { success: false, reason: `Agent ${toRole} not found` }
  if (from.available < amount) {
    return {
      success: false,
      reason: `${fromRole} has only ${from.available} available (requested ${amount})`,
    }
  }

  const p = prisma as any

  // Upsert budget records
  const now = new Date()
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

  await p.resourceBudget.upsert({
    where: { agentRole_periodStart: { agentRole: fromRole, periodStart: dayStart } },
    update: { lent: { increment: amount } },
    create: {
      agentRole: fromRole,
      dailyBudget: from.dailyBudget,
      used: from.used,
      lent: amount,
      borrowed: 0,
      periodStart: dayStart,
      periodEnd: dayEnd,
    },
  }).catch(() => {
    // Table might not exist yet — log but don't fail
    console.warn("[RESOURCE-MARKET] ResourceBudget table not ready — transfer logged only")
  })

  await p.resourceBudget.upsert({
    where: { agentRole_periodStart: { agentRole: toRole, periodStart: dayStart } },
    update: { borrowed: { increment: amount } },
    create: {
      agentRole: toRole,
      dailyBudget: to.dailyBudget,
      used: to.used,
      lent: 0,
      borrowed: amount,
      periodStart: dayStart,
      periodEnd: dayEnd,
    },
  }).catch(() => {})

  return {
    success: true,
    reason: `${amount} credite transferate de la ${fromRole} la ${toRole}`,
    fromAvailable: from.available - amount,
    toAvailable: to.available + amount,
  }
}

/**
 * Identifică agenți cu surplus de resurse (disponibil > 60% din buget)
 * și agenți cu deficit (disponibil < 10% din buget).
 */
export async function identifyImbalances(): Promise<{
  surplus: ResourceAllocation[]
  deficit: ResourceAllocation[]
  suggestions: string[]
}> {
  const allocations = await getResourceAllocations()

  const surplus = allocations.filter(
    (a) => a.dailyBudget > 0 && a.available / a.dailyBudget > 0.6
  )
  const deficit = allocations.filter(
    (a) => a.dailyBudget > 0 && a.available / a.dailyBudget < 0.1
  )

  const suggestions: string[] = []
  for (const d of deficit) {
    const bestDonor = surplus
      .filter((s) => s.available > 10)
      .sort((a, b) => b.available - a.available)[0]
    if (bestDonor) {
      const amount = Math.min(bestDonor.available / 2, d.dailyBudget * 0.3)
      suggestions.push(
        `Transfer ${Math.round(amount)} credite de la ${bestDonor.agentRole} (surplus ${bestDonor.available}) la ${d.agentRole} (deficit)`
      )
    }
  }

  return { surplus, deficit, suggestions }
}
