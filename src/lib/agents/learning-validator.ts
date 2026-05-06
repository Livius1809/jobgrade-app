/**
 * learning-validator.ts — Validare explicita a cunostintelor invatate
 *
 * Cunostintele create de learning-funnel.ts incep cu validated=false.
 * Acest modul promoveaza artefactele care au demonstrat eficacitate
 * si elimina pe cele dovedite ineficiente.
 *
 * Criteriile de validare:
 *  1. appliedCount >= 3 — a fost aplicata de minim 3 ori
 *  2. effectivenessScore >= 0.7 — aplicarile au fost majoritare cu succes
 *  3. Nu exista anti-pattern contradictorie cu scor mare
 *  -> Daca toate sunt indeplinite: validated = true
 *
 * Criteriile de invalidare (stergere):
 *  1. appliedCount >= 5 — a fost testata suficient
 *  2. effectivenessScore < 0.3 — s-a dovedit ineficienta
 *  -> Daca ambele: stergere (cunostinta toxica)
 *
 * Apelat periodic din /api/cron/maintenance.
 */

import { prisma } from "@/lib/prisma"

export interface ValidationResult {
  validated: number
  invalidated: number
  unchanged: number
}

/**
 * Valideaza toate artefactele de invatare nevalidate.
 * Promoveaza cele eficiente, sterge cele dovedite ineficiente.
 */
export async function validateLearningArtifacts(): Promise<ValidationResult> {
  const result: ValidationResult = {
    validated: 0,
    invalidated: 0,
    unchanged: 0,
  }

  // Fetch all unvalidated artifacts
  const unvalidated = await prisma.learningArtifact.findMany({
    where: { validated: false },
  })

  for (const artifact of unvalidated) {
    // Check invalidation first (proven ineffective -> delete)
    if (artifact.appliedCount >= 5 && artifact.effectivenessScore < 0.3) {
      await prisma.learningArtifact.delete({
        where: { id: artifact.id },
      })
      result.invalidated++
      continue
    }

    // Check validation criteria
    if (
      artifact.appliedCount >= 3 &&
      artifact.effectivenessScore >= 0.7
    ) {
      // Check for contradicting anti-patterns with high score
      const contradicting = await prisma.learningArtifact.findFirst({
        where: {
          studentRole: artifact.studentRole,
          problemClass: "anti-pattern-discovered",
          effectivenessScore: { gte: 0.7 },
          rule: { contains: artifact.rule.slice(0, 30), mode: "insensitive" },
          id: { not: artifact.id },
        },
      })

      if (!contradicting) {
        await prisma.learningArtifact.update({
          where: { id: artifact.id },
          data: { validated: true },
        })
        result.validated++
        continue
      }
    }

    result.unchanged++
  }

  if (result.validated > 0 || result.invalidated > 0) {
    console.log(
      `[learning-validator] ${result.validated} validated, ` +
      `${result.invalidated} invalidated (deleted), ` +
      `${result.unchanged} unchanged`
    )
  }

  return result
}
