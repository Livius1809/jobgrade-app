/**
 * field-transcendent.ts — CÂMPUL ca resursă transcendentă
 *
 * CÂMPUL nu e agent, nu e în organigramă, nu operaționalizează.
 * E SURSA de validare — orice acțiune trece prin el.
 *
 * Agenții resursă se CALIBREAZĂ la CÂMP.
 * Toți ceilalți se calibrează la agenți resursă.
 * CÂMPUL operează mereu peste 200 Hawkins.
 */

import type { PrismaClient } from "@/generated/prisma"
import { BINE, UMBRA, CAMP, vetoCheck } from "./moral-core"
import { calibrateAction, CRITICAL_THRESHOLD } from "./consciousness-map"

// Agenții resursă care se calibrează direct la CÂMP
// Agenți resursă suport — se calibrează la CÂMP (dar NU sunt CÂMPUL)
export const SUPPORT_RESOURCE_AGENTS = [
  "PSYCHOLINGUIST", "PPMO", "STA", "SOC",
  "SAFETY_MONITOR", "HR_COUNSELOR", "SCA",
]

// ── Validare CÂMP ────────────────────────────────────────────────────────────

export interface FieldValidation {
  validated: boolean
  level: "ALIGNED" | "CAUTION" | "REJECTED"
  reason: string
  hawkinsEstimate?: number
}

/**
 * CÂMPUL validează o acțiune/decizie/instrument.
 * Nu operaționalizează — doar validează alinierea cu BINELE.
 */
export function fieldValidate(
  description: string,
  context?: string
): FieldValidation {
  // 1. Veto absolut
  const veto = vetoCheck(description)
  if (!veto.allowed) {
    return {
      validated: false,
      level: "REJECTED",
      reason: veto.reason!,
    }
  }

  // 2. Calibrare Hawkins
  const calibration = calibrateAction(description)
  if (calibration.zone === "FORCE") {
    return {
      validated: false,
      level: "REJECTED",
      reason: `Acțiunea calibrează la ${calibration.estimatedLevel} (${calibration.closestLevel.nameRO}) — sub pragul de 200. Operează prin Forță, nu prin Putere.`,
      hawkinsEstimate: calibration.estimatedLevel,
    }
  }

  // 3. Verificare principii BINE
  const lower = description.toLowerCase()

  // Verifică dacă acțiunea servește doar un nivel concentric (egoism)
  const selfOnly = /doar.*meu|doar.*nostru|în detrimentul|ignorând.*impact/i.test(lower)
  if (selfOnly) {
    return {
      validated: false,
      level: "CAUTION",
      reason: "Acțiunea pare să servească un singur nivel concentric. BINELE radiază pe toate nivelurile.",
      hawkinsEstimate: calibration.estimatedLevel,
    }
  }

  // 4. Aliniat
  return {
    validated: true,
    level: "ALIGNED",
    reason: `Acțiunea calibrează la ~${calibration.estimatedLevel} (${calibration.closestLevel.nameRO}). Aliniată cu BINELE.`,
    hawkinsEstimate: calibration.estimatedLevel,
  }
}

/**
 * CÂMPUL validează un PROIECT NOU de construcție afacere.
 * NU se folosește pentru a refuza clienți existenți cu servicii standard!
 * Servirea clienților existenți = obligație profesională, fără discriminare.
 */
export function fieldValidateNewBusiness(
  businessDescription: string,
  industry: string
): FieldValidation {
  const veto = vetoCheck(`${businessDescription} ${industry}`, "new_business")
  if (!veto.allowed) {
    return {
      validated: false,
      level: "REJECTED",
      reason: `Construcție afacere nouă respinsă. ${veto.reason}`,
    }
  }

  return {
    validated: true,
    level: "ALIGNED",
    reason: "Afacerea nouă nu diminuează VIAȚA. Putem construi cu BINE.",
  }
}

/**
 * Obține cunoașterea CÂMPULUI pentru un agent resursă.
 * CÂMPUL nu e în organigramă — e o sursă separată de KB entries
 * marcate cu tag "field-knowledge" și "hawkins".
 */
export async function getFieldKnowledge(
  prisma: PrismaClient,
  topic?: string,
  limit: number = 5
): Promise<string[]> {
  const p = prisma as any

  const where: any = {
    tags: { has: "field-knowledge" },
    status: "PERMANENT",
  }

  if (topic) {
    where.content = { contains: topic }
  }

  const entries = await p.kBEntry.findMany({
    where,
    orderBy: { confidence: "desc" },
    take: limit,
    select: { content: true },
    distinct: ["content"],
  })

  return entries.map((e: any) => e.content)
}

/**
 * Prompt section: injectează cunoașterea CÂMPULUI pentru agenți resursă.
 * Doar agenții resursă primesc asta direct — ceilalți prin ei.
 */
export function getFieldPromptSection(agentRole: string): string {
  if (!SUPPORT_RESOURCE_AGENTS.includes(agentRole)) {
    return "" // Nu e agent resursă — nu primește direct
  }

  return `
CALIBRARE CÂMP (ești agent resursă suport — te calibrezi la CÂMP, nu ești CÂMPUL):

CÂMPUL: ${CAMP.nature}
ROL TĂU: Operaționalizezi cunoașterea CÂMPULUI în instrumente concrete.
CÂMPUL validează — tu construiești. Mereu verifică: instrumentul meu servește VIAȚA?

BINELE: ${BINE.essence}
UMBRA: ${UMBRA.definition}
PROCES UMBRA: ${UMBRA.process}

PRINCIPIU: Conștiința e antenă — nivelul determină ce atragi.
Tu ajuți indivizii cu roluri să-și ridice antena spre niveluri superioare.
Nu forțezi — creezi condițiile.`
}
