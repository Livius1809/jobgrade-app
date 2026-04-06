/**
 * Outcome Tracker — măsoară pipeline metrics când lead-ul ajunge la ACTIVE.
 *
 * Livrat: 06.04.2026, Pas 4 "Primul Client".
 */

import { prisma } from "@/lib/prisma"

export async function measurePipelineOutcome(leadId: string): Promise<{
  measured: boolean
  daysToActive: number | null
  outcomeId: string | null
}> {
  const lead = await (prisma as any).lead.findUnique({ where: { id: leadId } })
  if (!lead) return { measured: false, daysToActive: null, outcomeId: null }
  if (lead.stage !== "ACTIVE") return { measured: false, daysToActive: null, outcomeId: null }

  const createdAt = new Date(lead.createdAt)
  const closedAt = lead.closedAt ? new Date(lead.closedAt) : new Date()
  const daysToActive = Math.round((closedAt.getTime() - createdAt.getTime()) / 86400000)

  // Find or create the pipeline outcome
  let outcome = await prisma.serviceOutcome.findFirst({
    where: { serviceCode: "b2b_first_client_pipeline" },
  })

  if (!outcome) {
    // Seed it
    const business = await prisma.business.findFirst({ where: { code: "jobgrade" } })
    if (!business) return { measured: false, daysToActive, outcomeId: null }

    outcome = await prisma.serviceOutcome.create({
      data: {
        businessId: business.id,
        serviceCode: "b2b_first_client_pipeline",
        serviceName: "B2B Pipeline: Lead to Active",
        metricName: "lead_to_active_days",
        metricUnit: "days",
        targetValue: 30,
        collectionMethod: "automated",
        collectionFrequency: "per_session",
      },
    })
  }

  // Record measurement
  const measurement = await prisma.outcomeMeasurement.create({
    data: {
      outcomeId: outcome.id,
      value: daysToActive,
      source: "system_auto",
      notes: `Lead ${lead.companyName} (${leadId}): ${daysToActive} zile de la creare la ACTIVE.`,
      tenantId: lead.tenantId,
    },
  })

  // Update currentValue on outcome
  await prisma.serviceOutcome.update({
    where: { id: outcome.id },
    data: { currentValue: daysToActive },
  })

  return {
    measured: true,
    daysToActive,
    outcomeId: measurement.id,
  }
}
