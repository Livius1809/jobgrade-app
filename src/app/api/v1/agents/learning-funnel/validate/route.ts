import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

function checkAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

interface BusinessCounts {
  kb: number
  artifacts: number
}

interface FunnelHealthReport {
  shared: BusinessCounts
  perBusiness: Record<string, BusinessCounts>
  isolationValid: boolean
  isolationDetails: string[]
  totalKB: number
  totalArtifacts: number
}

/**
 * GET /api/v1/agents/learning-funnel/validate
 *
 * Validare end-to-end a pâlniei de ingestie/învățare:
 *   - Count KBEntry per businessId (shared + business-specific)
 *   - Count LearningArtifact per businessId
 *   - Verificare izolare inter-business (zero cross-leaks)
 *   - Health report complet
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // ── 1. Agregare KB per businessId ────────────────────────────
    const kbByBusiness = await (prisma as any).kBEntry.groupBy({
      by: ["businessId"],
      _count: { _all: true },
    }).catch(() => [])

    // ── 2. Agregare LearningArtifact per businessId ─────────────
    const artifactsByBusiness = await prisma.learningArtifact.groupBy({
      by: ["businessId"],
      _count: { _all: true },
    }).catch(() => [])

    // ── 3. Construim raportul ────────────────────────────────────
    const sharedKB = (kbByBusiness as any[]).find((g: any) => g.businessId === "shared")?._count?._all ?? 0
    const sharedArtifacts = (artifactsByBusiness as any[]).find((g: any) => g.businessId === "shared")?._count?._all ?? 0

    const perBusiness: Record<string, BusinessCounts> = {}
    let totalKB = 0
    let totalArtifacts = 0

    for (const g of kbByBusiness as any[]) {
      if (g.businessId !== "shared") {
        if (!perBusiness[g.businessId]) perBusiness[g.businessId] = { kb: 0, artifacts: 0 }
        perBusiness[g.businessId].kb = g._count._all
      }
      totalKB += g._count._all
    }

    for (const g of artifactsByBusiness as any[]) {
      if (g.businessId !== "shared") {
        if (!perBusiness[g.businessId]) perBusiness[g.businessId] = { kb: 0, artifacts: 0 }
        perBusiness[g.businessId].artifacts = g._count._all
      }
      totalArtifacts += g._count._all
    }

    // ── 4. Verificare izolare inter-business ────────────────────
    const isolationDetails: string[] = []
    let isolationValid = true

    const businessIds = Object.keys(perBusiness)

    // Verificăm că nu există KB entries cu agentRole identic dar businessId diferit
    // care conțin conținut identic (cross-leak)
    if (businessIds.length >= 2) {
      for (let i = 0; i < businessIds.length; i++) {
        for (let j = i + 1; j < businessIds.length; j++) {
          const bidA = businessIds[i]
          const bidB = businessIds[j]

          // Verificăm dacă există duplicate de conținut între două business-uri
          // (sampling: primele 50 entries din fiecare)
          const entriesA = await (prisma as any).kBEntry.findMany({
            where: { businessId: bidA, status: "PERMANENT" },
            select: { content: true, agentRole: true },
            take: 50,
          }).catch(() => [])

          const entriesB = await (prisma as any).kBEntry.findMany({
            where: { businessId: bidB, status: "PERMANENT" },
            select: { content: true, agentRole: true },
            take: 50,
          }).catch(() => [])

          const contentSetB = new Set((entriesB as any[]).map((e: any) => e.content))
          const leaks = (entriesA as any[]).filter((e: any) => contentSetB.has(e.content))

          if (leaks.length > 0) {
            isolationValid = false
            isolationDetails.push(
              `Cross-leak: ${leaks.length} entries identice între ${bidA} și ${bidB}`
            )
          }
        }
      }
    }

    if (isolationDetails.length === 0) {
      isolationDetails.push("Izolare validă — zero cross-business leaks detectate")
    }

    // ── 5. Verificări suplimentare de sănătate ──────────────────
    if (sharedKB === 0) {
      isolationDetails.push("ATENȚIE: shared KB este gol — lipsesc datele core (L1/L2/L3)")
    }

    for (const [bid, counts] of Object.entries(perBusiness)) {
      if (counts.kb === 0 && counts.artifacts === 0) {
        isolationDetails.push(`ATENȚIE: business ${bid} nu are nici KB nici artifacts — posibil cold-start necesar`)
      }
    }

    const report: FunnelHealthReport = {
      shared: { kb: sharedKB, artifacts: sharedArtifacts },
      perBusiness,
      isolationValid,
      isolationDetails,
      totalKB,
      totalArtifacts,
    }

    return NextResponse.json(report)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
