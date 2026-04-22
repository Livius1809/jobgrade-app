/**
 * Company Profiler — Punct 7: Memorie de evoluție
 *
 * Maturitatea nu e snapshot, e traiectorie.
 * "Acum 3 luni era IMPLICIT, acum e PARTIAL."
 * Permite rapoarte de progres și predicții.
 */

import { prisma } from "@/lib/prisma"
import type { DataPointPresence, EvolutionTrajectory, MaturityLevel, MaturitySnapshot } from "./types"

/**
 * Salvează un snapshot al maturității curente.
 * Apelat automat la fiecare recalculare de profil.
 */
export async function saveMaturitySnapshot(
  tenantId: string,
  level: MaturityLevel,
  score: number,
  coherenceScore: number,
  dataPoints: DataPointPresence,
): Promise<void> {
  try {
    // Verificăm dacă ultimul snapshot e diferit (evităm duplicatele la recalculări frecvente)
    const lastSnapshot = await prisma.companyProfileSnapshot.findFirst({
      where: { tenantId },
      orderBy: { takenAt: "desc" },
    }).catch(() => null)

    // Nu salvăm dacă nimic nu s-a schimbat în ultima oră
    if (lastSnapshot) {
      const hourAgo = Date.now() - 3600000
      if (
        lastSnapshot.takenAt.getTime() > hourAgo &&
        (lastSnapshot as any).maturityLevel === level &&
        (lastSnapshot as any).maturityScore === score
      ) {
        return
      }
    }

    await prisma.companyProfileSnapshot.create({
      data: {
        tenantId,
        maturityLevel: level,
        maturityScore: score,
        coherenceScore,
        dataPoints: dataPoints as any,
        takenAt: new Date(),
      },
    }).catch(() => {
      // Tabelul poate să nu existe încă — fail silently
    })
  } catch {}
}

/**
 * Citește traiectoria de evoluție a clientului.
 */
export async function getEvolutionTrajectory(
  tenantId: string,
  limitMonths = 6,
): Promise<EvolutionTrajectory> {
  const since = new Date()
  since.setMonth(since.getMonth() - limitMonths)

  let snapshots: MaturitySnapshot[] = []

  try {
    const rows = await prisma.companyProfileSnapshot.findMany({
      where: { tenantId, takenAt: { gte: since } },
      orderBy: { takenAt: "asc" },
    })

    snapshots = rows.map((r: any) => ({
      level: r.maturityLevel as MaturityLevel,
      score: r.maturityScore,
      coherenceScore: r.coherenceScore,
      dataPoints: r.dataPoints as DataPointPresence,
      takenAt: r.takenAt,
    }))
  } catch {
    // Tabelul poate să nu existe — returnăm traiectorie goală
  }

  if (snapshots.length === 0) {
    return {
      snapshots: [],
      trend: "STAGNANT",
      levelDelta: 0,
      narrative: "Nu există încă suficiente date pentru a determina traiectoria.",
      avgDaysBetweenLevels: null,
    }
  }

  const first = snapshots[0]
  const last = snapshots[snapshots.length - 1]

  const levelDelta = maturityOrd(last.level) - maturityOrd(first.level)
  const trend = levelDelta > 0 ? "ASCENDING" : levelDelta < 0 ? "DECLINING" : "STAGNANT"

  // Calculăm timpul mediu între niveluri
  let avgDays: number | null = null
  if (levelDelta > 0) {
    const totalDays = (last.takenAt.getTime() - first.takenAt.getTime()) / (1000 * 60 * 60 * 24)
    avgDays = Math.round(totalDays / levelDelta)
  }

  const narrative = buildEvolutionNarrative(first, last, snapshots.length, levelDelta, avgDays)

  return {
    snapshots,
    trend,
    levelDelta,
    narrative,
    avgDaysBetweenLevels: avgDays,
  }
}

/**
 * Returnează starea anterioară (ultimul snapshot) pentru comparare
 */
export async function getPreviousState(tenantId: string): Promise<{
  coherenceScore: number | null
  maturityLevel: MaturityLevel | null
  dataPoints: DataPointPresence | null
  readyServices: string[]
}> {
  try {
    const snapshot = await prisma.companyProfileSnapshot.findFirst({
      where: { tenantId },
      orderBy: { takenAt: "desc" },
    })

    if (!snapshot) {
      return { coherenceScore: null, maturityLevel: null, dataPoints: null, readyServices: [] }
    }

    return {
      coherenceScore: (snapshot as any).coherenceScore,
      maturityLevel: (snapshot as any).maturityLevel as MaturityLevel,
      dataPoints: (snapshot as any).dataPoints as DataPointPresence,
      readyServices: ((snapshot as any).readyServices || []) as string[],
    }
  } catch {
    return { coherenceScore: null, maturityLevel: null, dataPoints: null, readyServices: [] }
  }
}

function buildEvolutionNarrative(
  first: MaturitySnapshot,
  last: MaturitySnapshot,
  totalSnapshots: number,
  levelDelta: number,
  avgDays: number | null,
): string {
  if (levelDelta === 0) {
    if (last.score > first.score) {
      return `Organizația a consolidat nivelul ${last.level} (scor ${first.score} → ${last.score}), pregătind terenul pentru nivelul următor.`
    }
    return `Organizația se menține la nivelul ${last.level}. Scorul de maturitate: ${last.score}/100.`
  }

  if (levelDelta > 0) {
    const daysText = avgDays ? ` în medie ${avgDays} zile per nivel` : ""
    return `Organizația a evoluat de la ${first.level} la ${last.level} (${levelDelta} ${levelDelta === 1 ? "nivel" : "niveluri"})${daysText}. Scorul de maturitate a crescut de la ${first.score} la ${last.score}. Coerența: ${first.coherenceScore} → ${last.coherenceScore}.`
  }

  return `Atenție: nivelul de maturitate a scăzut de la ${first.level} la ${last.level}. Verificați datele operaționale.`
}

function maturityOrd(level: MaturityLevel): number {
  const ord: Record<MaturityLevel, number> = { IMPLICIT: 0, EMERGENT: 1, PARTIAL: 2, SUBSTANTIAL: 3, COMPLETE: 4 }
  return ord[level]
}
