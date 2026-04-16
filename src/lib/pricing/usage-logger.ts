/**
 * usage-logger.ts — telemetry per execuție serviciu
 *
 * Folosit de:
 * - wrapper Anthropic SDK (track tokens automat)
 * - middleware Prisma (track DB bytes opțional)
 * - manual din endpoint-uri pentru evenimente cu cost (email, blob, etc.)
 *
 * Output: înregistrare în service_usage_logs cu:
 * - usage brut (tokens, ms, bytes)
 * - cost real RON (informativ)
 * - cost acoperitor RON (folosit pentru margin)
 */

import { prisma } from "@/lib/prisma"
import { calculateInternalCost, type UsageMetrics } from "./cost-calculator"

export interface LogServiceUsageInput {
  tenantId: string
  userId?: string | null
  serviceCode: string // ex: "je-evaluate", "consultant-hr-chat"
  executionId?: string | null // ID logic (sesiune, raport, etc.)
  operationType?: string | null // ex: "intent-classification" — mapare AIOperationTier
  usage: Partial<UsageMetrics>
  metadata?: Record<string, unknown>
}

/**
 * Loghează o execuție de serviciu. Calculează costurile (real + acoperitor)
 * și salvează în DB.
 *
 * Returnează ID-ul log-ului creat — util pentru chargeCredits ulterior.
 */
export async function logServiceUsage(input: LogServiceUsageInput): Promise<string> {
  const fullUsage: UsageMetrics = {
    modelUsed: input.usage.modelUsed,
    operationType: input.operationType ?? input.usage.operationType,
    tokensInput: input.usage.tokensInput ?? 0,
    tokensOutput: input.usage.tokensOutput ?? 0,
    computeMs: input.usage.computeMs ?? 0,
    dbReadBytes: input.usage.dbReadBytes ?? 0,
    dbWriteBytes: input.usage.dbWriteBytes ?? 0,
    bandwidthBytes: input.usage.bandwidthBytes ?? 0,
    emailsSent: input.usage.emailsSent ?? 0,
    blobBytes: input.usage.blobBytes ?? 0,
    humanMinutes: input.usage.humanMinutes ?? 0,
  }

  const costs = await calculateInternalCost(fullUsage)

  const log = await prisma.serviceUsageLog.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId ?? null,
      serviceCode: input.serviceCode,
      executionId: input.executionId ?? null,
      operationType: input.operationType ?? null,
      modelUsed: fullUsage.modelUsed ?? null,
      tokensInput: fullUsage.tokensInput,
      tokensOutput: fullUsage.tokensOutput,
      computeMs: fullUsage.computeMs,
      dbReadBytes: fullUsage.dbReadBytes,
      dbWriteBytes: fullUsage.dbWriteBytes,
      bandwidthBytes: fullUsage.bandwidthBytes,
      emailsSent: fullUsage.emailsSent,
      blobBytes: fullUsage.blobBytes,
      humanMinutes: fullUsage.humanMinutes,
      costRealRON: costs.costRealRON,
      costCoveringRON: costs.costCoveringRON,
      metadata: (input.metadata ?? null) as never,
    },
    select: { id: true },
  })

  return log.id
}
