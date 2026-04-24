/**
 * objective-invalidation.ts — Detectează obiective deja livrate prin cod
 *
 * Problema: Claude sesiune scrie cod (layouts, API routes, modele), dar COG-ul
 * continuă să aibă obiective/taskuri pentru aceleași lucruri. Nr. taskuri = nr. apeluri Claude.
 *
 * Soluția: La fiecare ciclu cron, verificăm dacă obiectivele au fost deja
 * livrate prin cod (KB entries cu tag-uri de sesiune Claude) și le marcăm COMPLETED.
 *
 * Surse de adevăr:
 *   1. KB entries cu source=EXPERT_HUMAN și tags care conțin "sesiune-" → cod livrat
 *   2. Obiective ACTIVE cu description care se suprapune cu KB content
 */

import { prisma } from "@/lib/prisma"

// Cuvinte cheie care leagă un obiectiv de o livrare cod
const DELIVERY_KEYWORDS = [
  "livrat", "implementat", "creat", "construit", "adaugat",
  "layout", "api route", "model", "schema", "componenta",
  "task 26", "task 27", "task-26", "task-27",
  "raport angajat", "jurnal ghid", "art.5", "art.7",
  "flying wheels", "permisiuni", "pdf",
]

export async function invalidateDeliveredObjectives(): Promise<number> {
  // 1. Preluăm KB entries recente (ultimele 7 zile) marcate ca livrări cod
  const recentDeliveries = await prisma.kBEntry.findMany({
    where: {
      source: "EXPERT_HUMAN",
      status: "PERMANENT",
      createdAt: { gt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      tags: { hasSome: ["sesiune-24apr-3", "sesiune-24apr-2", "sesiune-24apr-1"] },
    },
    select: { content: true, tags: true },
  })

  if (recentDeliveries.length === 0) return 0

  // 2. Construim un set de keywords din livrări
  const deliveredKeywords = new Set<string>()
  for (const d of recentDeliveries) {
    const lower = d.content.toLowerCase()
    for (const kw of DELIVERY_KEYWORDS) {
      if (lower.includes(kw)) deliveredKeywords.add(kw)
    }
    for (const tag of d.tags) {
      deliveredKeywords.add(tag.toLowerCase())
    }
  }

  // 3. Găsim obiective ACTIVE care sunt deja acoperite
  const activeObjectives = await prisma.organizationalObjective.findMany({
    where: { status: "ACTIVE", currentValue: { lt: 100 } },
    select: { id: true, code: true, description: true, currentValue: true },
  })

  let invalidated = 0

  for (const obj of activeObjectives) {
    const desc = (obj.description || "").toLowerCase()
    const code = (obj.code || "").toLowerCase()

    // Verificăm dacă obiectivul se potrivește cu cel puțin 2 keywords din livrări
    let matchCount = 0
    for (const kw of deliveredKeywords) {
      if (desc.includes(kw) || code.includes(kw)) matchCount++
    }

    if (matchCount >= 2) {
      // Marcăm obiectivul ca 100% (livrat prin cod)
      await prisma.organizationalObjective.update({
        where: { id: obj.id },
        data: {
          currentValue: 100,
          description: `${obj.description}\n\n[AUTO] Marcat 100% — livrat prin cod în sesiune Claude (${new Date().toISOString().slice(0, 10)})`,
        },
      })
      invalidated++
    }
  }

  // 4. Completăm și taskurile aferente obiectivelor invalidate
  if (invalidated > 0) {
    const completedObjIds = activeObjectives
      .filter(o => {
        const desc = (o.description || "").toLowerCase()
        const code = (o.code || "").toLowerCase()
        let mc = 0
        for (const kw of deliveredKeywords) {
          if (desc.includes(kw) || code.includes(kw)) mc++
        }
        return mc >= 2
      })
      .map(o => o.id)

    // Taskuri legate de aceste obiective — marcate COMPLETED
    await prisma.agentTask.updateMany({
      where: {
        objectiveId: { in: completedObjIds },
        status: { in: ["ASSIGNED", "IN_PROGRESS"] },
      },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        result: "[AUTO] Task completat — obiectivul a fost livrat prin cod în sesiune Claude",
      },
    }).catch(() => {})
  }

  return invalidated
}
