/**
 * GET /api/v1/territory/compare?territories=MEDGIDIA,CERNAVODA,ADAMCLISI
 *
 * Raport comparativ între teritorii.
 * Compară: vitalitate, transformare, balanță, resurse, top sectoare.
 * Contextul permite interpretarea scorurilor (un 5 e bun sau rău?).
 */

export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { generateTerritorialReport } from "@/lib/crawl/territorial-report"

export async function GET(req: NextRequest) {
  const territoriesParam = req.nextUrl.searchParams.get("territories")
  if (!territoriesParam) {
    return NextResponse.json({ error: "territories parameter required (comma-separated)" }, { status: 400 })
  }

  const territories = territoriesParam.split(",").map(t => t.trim().toUpperCase()).slice(0, 5) // max 5

  if (territories.length < 2) {
    return NextResponse.json({ error: "Minimum 2 teritorii pentru comparație" }, { status: 400 })
  }

  // Generăm rapoarte în paralel
  const reports = await Promise.all(
    territories.map(async t => {
      try {
        return { territory: t, report: await generateTerritorialReport(t), error: null }
      } catch (error) {
        return { territory: t, report: null, error: String(error) }
      }
    })
  )

  const valid = reports.filter(r => r.report !== null)

  if (valid.length < 2) {
    return NextResponse.json({
      error: "Nu s-au putut genera suficiente rapoarte pentru comparație",
      details: reports.filter(r => r.error).map(r => ({ territory: r.territory, error: r.error })),
    }, { status: 400 })
  }

  // Comparație
  const comparison = {
    territories: valid.map(v => ({
      territory: v.territory,
      vitalityScore: v.report!.vitalityScore,
      avgTransformLevel: v.report!.avgTransformLevel,
      territorialBalance: v.report!.territorialBalance,
      resources: {
        natural: v.report!.resources.natural.score,
        cultural: v.report!.resources.cultural.score,
        human: v.report!.resources.human.score,
        infrastructure: v.report!.resources.infrastructure.score,
      },
      topSectors: v.report!.sectors.slice(0, 3).map(s => ({
        name: s.sectorName,
        score: s.sectorScore,
      })),
      topGaps: v.report!.topGaps.slice(0, 3).map(g => ({
        name: g.name,
        severity: g.severity,
      })),
      recommendedBridges: v.report!.recommendedBridges.length,
    })),

    // Medie per indicator (pentru context)
    averages: {
      vitalityScore: avg(valid.map(v => v.report!.vitalityScore)),
      avgTransformLevel: avg(valid.map(v => v.report!.avgTransformLevel)),
      territorialBalance: avg(valid.map(v => v.report!.territorialBalance)),
      resourceNatural: avg(valid.map(v => v.report!.resources.natural.score)),
      resourceCultural: avg(valid.map(v => v.report!.resources.cultural.score)),
      resourceHuman: avg(valid.map(v => v.report!.resources.human.score)),
      resourceInfra: avg(valid.map(v => v.report!.resources.infrastructure.score)),
    },

    // Lider per categorie
    leaders: {
      mostVital: findLeader(valid, v => v.report!.vitalityScore),
      bestTransformation: findLeader(valid, v => v.report!.avgTransformLevel),
      bestBalance: findLeader(valid, v => v.report!.territorialBalance),
      bestNaturalResources: findLeader(valid, v => v.report!.resources.natural.score),
      bestCulturalResources: findLeader(valid, v => v.report!.resources.cultural.score),
      bestHumanResources: findLeader(valid, v => v.report!.resources.human.score),
      bestInfrastructure: findLeader(valid, v => v.report!.resources.infrastructure.score),
    },

    // Complementarități (ce are unul și lipsește altuia)
    complementarities: findComplementarities(valid),

    // Potențial cluster regional
    clusterPotential: assessClusterPotential(valid),
  }

  return NextResponse.json({
    comparison,
    timestamp: new Date().toISOString(),
  })
}

function avg(values: number[]): number {
  if (values.length === 0) return 0
  return Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10
}

function findLeader(
  reports: Array<{ territory: string; report: any }>,
  getter: (r: any) => number
): string {
  let best = reports[0]
  for (const r of reports) {
    if (getter(r) > getter(best)) best = r
  }
  return best.territory
}

function findComplementarities(
  reports: Array<{ territory: string; report: any }>
): Array<{ from: string; to: string; resource: string; description: string }> {
  const results: Array<{ from: string; to: string; resource: string; description: string }> = []

  for (const a of reports) {
    for (const b of reports) {
      if (a.territory === b.territory) continue

      // A are resurse naturale, B nu
      if (a.report.resources.natural.score > 60 && b.report.resources.natural.score < 40) {
        results.push({
          from: a.territory, to: b.territory,
          resource: "Resurse naturale",
          description: `${a.territory} poate furniza materie primă pentru ${b.territory}`,
        })
      }

      // A are patrimoniu cultural, B nu
      if (a.report.resources.cultural.score > 50 && b.report.resources.cultural.score < 30) {
        results.push({
          from: a.territory, to: b.territory,
          resource: "Patrimoniu cultural",
          description: `${a.territory} poate atrage turism cultural care beneficiază și ${b.territory}`,
        })
      }

      // A are infra mai bună → hub pentru B
      if (a.report.resources.infrastructure.score > 60 && b.report.resources.infrastructure.score < 40) {
        results.push({
          from: a.territory, to: b.territory,
          resource: "Infrastructură",
          description: `${a.territory} poate servi ca hub logistic/servicii pentru ${b.territory}`,
        })
      }
    }
  }

  return results
}

function assessClusterPotential(
  reports: Array<{ territory: string; report: any }>
): { score: number; description: string; synergies: string[] } {
  const synergies: string[] = []
  let score = 3 // bază

  // Verificăm diversitate sectorială
  const allSectors = new Set<string>()
  for (const r of reports) {
    for (const s of r.report.sectors) {
      allSectors.add(s.sectorName)
    }
  }
  if (allSectors.size > 5) {
    score += 2
    synergies.push("Diversitate sectorială ridicată — clustere complementare posibile")
  }

  // Verificăm complementaritate resurse
  const naturalScores = reports.map(r => r.report.resources.natural.score)
  const culturalScores = reports.map(r => r.report.resources.cultural.score)
  if (Math.max(...naturalScores) - Math.min(...naturalScores) > 30) {
    score += 1
    synergies.push("Resurse naturale complementare — schimb de materie primă")
  }
  if (Math.max(...culturalScores) - Math.min(...culturalScores) > 20) {
    score += 1
    synergies.push("Patrimoniu cultural divers — rute turistice combinate")
  }

  // Proximitate geografică (dacă sunt în același județ)
  score += 1
  synergies.push("Proximitate geografică — transport și logistică eficiente")

  return {
    score: Math.min(10, score),
    description: score >= 7
      ? "Potențial ridicat de cluster regional — sinergii multiple identificate"
      : score >= 5
        ? "Potențial moderat — câteva sinergii dar necesită investiție în conectivitate"
        : "Potențial redus — teritoriile sunt prea similare sau prea diferite",
    synergies,
  }
}
