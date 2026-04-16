/**
 * cost-calculator.ts — calcul cost intern conform metodologiei Owner
 *
 * Algoritm (vezi project_pricing_methodology.md):
 *   COST REAL măsurat → COST FURNIZOR ACOPERITOR → conversie RON la BNR+buffer% → MARJĂ
 *
 * Plase de siguranță (4 layere):
 *   1. Cost furnizor MAXIM/ACOPERITOR (worst case istoric per resursă)
 *   2. Model AI ACOPERITOR (Opus 4.6 ca worst case chiar dacă folosim Haiku)
 *   3. Token amplification factor (Opus poate genera mai multe tokens)
 *   4. BNR + buffer% pentru curs USD/RON
 *
 * Valorile concrete (covering costs, buffer%, etc.) sunt în DB —
 * populate de COG/Owner.
 */

import { prisma } from "@/lib/prisma"

export interface UsageMetrics {
  modelUsed?: string // model AI efectiv folosit (informativ)
  operationType?: string // mapare AIOperationTier (pentru cost acoperitor)
  tokensInput: number
  tokensOutput: number
  computeMs: number
  dbReadBytes: number
  dbWriteBytes: number
  bandwidthBytes: number
  emailsSent: number
  blobBytes: number
  humanMinutes: number
}

export interface CostBreakdown {
  costRealRON: number       // costul real (informativ)
  costCoveringRON: number   // costul acoperitor (folosit pentru margin)
  effectiveUsdRonRate: number
  detail: Record<string, number> // breakdown per resursă
}

/**
 * Calculează costul intern conform metodologiei.
 * Returnează atât costul real cât și cel acoperitor (cu plase de siguranță).
 */
export async function calculateInternalCost(usage: UsageMetrics): Promise<CostBreakdown> {
  // 1. Citim valorile curente din DB (populate de COG/Owner)
  const [providerCosts, creditValue, operationTier] = await Promise.all([
    prisma.providerCost.findMany({ orderBy: { effectiveFrom: "desc" } }),
    prisma.creditValue.findFirst({ orderBy: { effectiveFrom: "desc" } }),
    usage.operationType
      ? prisma.aIOperationTier.findUnique({ where: { operationType: usage.operationType } })
      : null,
  ])

  // Defaults conservatoare dacă DB nu e populat încă
  const usdRon = creditValue
    ? Number(creditValue.effectiveUsdRonRate)
    : 5.0 // fallback BNR + buffer aproximativ

  const detail: Record<string, number> = {}
  let costRealUSD = 0
  let costCoveringUSD = 0

  // 2. AI tokens (folosește operation tier pentru cost acoperitor)
  if (usage.tokensInput > 0 || usage.tokensOutput > 0) {
    const realModel = usage.modelUsed ?? operationTier?.currentModel ?? "claude-haiku-4-5-20251001"
    const coveringModel = operationTier?.coveringModel ?? "claude-opus-4-6"
    const ampFactor = operationTier ? Number(operationTier.tokenAmplificationFactor) : 1.0

    const realInputCost = providerCosts.find(p => p.resourceType === `${realModel}-input-tokens`)
    const realOutputCost = providerCosts.find(p => p.resourceType === `${realModel}-output-tokens`)
    const covInputCost = providerCosts.find(p => p.resourceType === `${coveringModel}-input-tokens`)
    const covOutputCost = providerCosts.find(p => p.resourceType === `${coveringModel}-output-tokens`)

    const realIn = realInputCost ? Number(realInputCost.currentCostUSD) * (usage.tokensInput / 1_000_000) : 0
    const realOut = realOutputCost ? Number(realOutputCost.currentCostUSD) * (usage.tokensOutput / 1_000_000) : 0
    const covIn = covInputCost ? Number(covInputCost.coveringCostUSD) * ((usage.tokensInput * ampFactor) / 1_000_000) : 0
    const covOut = covOutputCost ? Number(covOutputCost.coveringCostUSD) * ((usage.tokensOutput * ampFactor) / 1_000_000) : 0

    costRealUSD += realIn + realOut
    costCoveringUSD += covIn + covOut
    detail.aiTokensReal = realIn + realOut
    detail.aiTokensCovering = covIn + covOut
  }

  // 3. Compute (Vercel Active CPU)
  if (usage.computeMs > 0) {
    const cpu = providerCosts.find(p => p.resourceType === "vercel-active-cpu-min")
    if (cpu) {
      const minutes = usage.computeMs / 60_000
      costRealUSD += Number(cpu.currentCostUSD) * minutes
      costCoveringUSD += Number(cpu.coveringCostUSD) * minutes
      detail.computeReal = Number(cpu.currentCostUSD) * minutes
      detail.computeCovering = Number(cpu.coveringCostUSD) * minutes
    }
  }

  // 4. DB (Neon — read/write bytes echivalent transfer)
  const totalDbBytes = usage.dbReadBytes + usage.dbWriteBytes
  if (totalDbBytes > 0) {
    const db = providerCosts.find(p => p.resourceType === "neon-data-transfer-gb")
    if (db) {
      const gb = totalDbBytes / 1_000_000_000
      costRealUSD += Number(db.currentCostUSD) * gb
      costCoveringUSD += Number(db.coveringCostUSD) * gb
    }
  }

  // 5. Bandwidth (Vercel)
  if (usage.bandwidthBytes > 0) {
    const bw = providerCosts.find(p => p.resourceType === "vercel-bandwidth-gb")
    if (bw) {
      const gb = usage.bandwidthBytes / 1_000_000_000
      costRealUSD += Number(bw.currentCostUSD) * gb
      costCoveringUSD += Number(bw.coveringCostUSD) * gb
    }
  }

  // 6. Email (Resend)
  if (usage.emailsSent > 0) {
    const email = providerCosts.find(p => p.resourceType === "resend-email")
    if (email) {
      costRealUSD += Number(email.currentCostUSD) * usage.emailsSent
      costCoveringUSD += Number(email.coveringCostUSD) * usage.emailsSent
    }
  }

  // 7. Blob storage (Vercel Blob)
  if (usage.blobBytes > 0) {
    const blob = providerCosts.find(p => p.resourceType === "vercel-blob-gb")
    if (blob) {
      const gb = usage.blobBytes / 1_000_000_000
      costRealUSD += Number(blob.currentCostUSD) * gb
      costCoveringUSD += Number(blob.coveringCostUSD) * gb
    }
  }

  // 8. Time uman (cost mare per minut — definit de COG)
  if (usage.humanMinutes > 0) {
    const human = providerCosts.find(p => p.resourceType === "human-specialist-min")
    if (human) {
      // Pentru uman, „cost real" = „cost acoperitor" (rata e fixă negociată)
      costRealUSD += Number(human.currentCostUSD) * usage.humanMinutes
      costCoveringUSD += Number(human.coveringCostUSD) * usage.humanMinutes
    }
  }

  // Conversie USD → RON (BNR + buffer)
  const costRealRON = costRealUSD * usdRon
  const costCoveringRON = costCoveringUSD * usdRon

  return {
    costRealRON,
    costCoveringRON,
    effectiveUsdRonRate: usdRon,
    detail,
  }
}

/**
 * Calculează ansamblul lunar CAPEX + OPEX pentru intern (Owner/COG dashboard).
 *
 * CAPEX = costuri fixe lunare indiferent de volum
 * OPEX_PER_CLIENT × N_clients = cost incremental scalat cu nr. clienți
 * OPEX_PER_EXECUTION (din ServiceUsageLog luna în curs)
 *
 * Output: cost total lunar + alocare CAPEX/serviciu pentru pricing minim viabil
 */
export interface MonthlyCostOverview {
  capexUSD: number
  capexRON: number
  opexPerClientUSD: number
  opexPerClientRON: number
  activeClients: number
  totalOpexClientsRON: number
  totalExecutionCostRealRON: number
  totalExecutionCostCoveringRON: number
  totalExecutions: number
  totalMonthlyCostRON: number
  capexAllocationPerExecutionRON: number // CAPEX / total executions luna în curs
  effectiveUsdRonRate: number
}

export async function calculateMonthlyOverview(
  monthStart?: Date
): Promise<MonthlyCostOverview> {
  const start = monthStart ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)

  const [providerCosts, creditValue, activeClientsCount, executions] = await Promise.all([
    prisma.providerCost.findMany(),
    prisma.creditValue.findFirst({ orderBy: { effectiveFrom: "desc" } }),
    prisma.tenant.count({ where: { status: "ACTIVE" } }),
    prisma.serviceUsageLog.aggregate({
      where: { createdAt: { gte: start, lt: end } },
      _sum: { costRealRON: true, costCoveringRON: true },
      _count: { _all: true },
    }),
  ])

  const usdRon = creditValue ? Number(creditValue.effectiveUsdRonRate) : 5.0

  // CAPEX (cele mai recente preturi pe categoria CAPEX, însumate)
  const capexCosts = providerCosts.filter(p => p.costCategory === "CAPEX")
  const capexUSD = capexCosts.reduce((sum, p) => sum + Number(p.coveringCostUSD), 0)
  const capexRON = capexUSD * usdRon

  // OPEX per client (lunar)
  const opexPerClientCosts = providerCosts.filter(p => p.costCategory === "OPEX_PER_CLIENT")
  const opexPerClientUSD = opexPerClientCosts.reduce((sum, p) => sum + Number(p.coveringCostUSD), 0)
  const opexPerClientRON = opexPerClientUSD * usdRon
  const totalOpexClientsRON = opexPerClientRON * activeClientsCount

  // OPEX per execution (din log-uri luna curentă — deja calculat in RON)
  const totalExecutionCostRealRON = Number(executions._sum.costRealRON ?? 0)
  const totalExecutionCostCoveringRON = Number(executions._sum.costCoveringRON ?? 0)
  const totalExecutions = executions._count._all

  const totalMonthlyCostRON = capexRON + totalOpexClientsRON + totalExecutionCostCoveringRON
  const capexAllocationPerExecutionRON = totalExecutions > 0 ? capexRON / totalExecutions : 0

  return {
    capexUSD,
    capexRON,
    opexPerClientUSD,
    opexPerClientRON,
    activeClients: activeClientsCount,
    totalOpexClientsRON,
    totalExecutionCostRealRON,
    totalExecutionCostCoveringRON,
    totalExecutions,
    totalMonthlyCostRON,
    capexAllocationPerExecutionRON,
    effectiveUsdRonRate: usdRon,
  }
}
