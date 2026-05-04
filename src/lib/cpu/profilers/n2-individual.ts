/**
 * N2: PROFILER INDIVIDUAL — sinteza omului complet
 *
 * Integrează TOATE dimensiunile N1 ale unei persoane + context.
 * Nu e suma dimensiunilor — e SINTEZA lor.
 *
 * Vede ce N1 nu vede:
 * - Competent DAR nemotivat = potențial irosit
 * - Motivat DAR fără integritate = pericol
 * - Competent + motivat + integru DAR valori incompatibile cu organizația = conflict latent
 *
 * Facade peste profiler-engine.ts (B2C) + score-normalizer.ts (B2B).
 * Unifică profilarea B2B și B2C într-un singur motor CPU.
 */

import { prisma } from "@/lib/prisma"
import { DimensionalProfiler, type DimensionalProfile } from "./n1-dimensional"
export type { DimensionalProfile }

// Re-export funcții existente ca N2
// B2C: profiler-engine.ts are getUserProfile() — ăla e N2 pentru persoane B2C
// B2B: score-normalizer.ts are buildIntegratedTraits() — ăla e N2 pentru angajați

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface IndividualProfile {
  entityId: string
  entityType: "PERSON"
  source: "B2C" | "B2B" | "BRIDGE" // de unde vine profilul

  /** Toate dimensiunile N1 disponibile */
  dimensions: DimensionalProfile[]
  completeness: number // 0-1

  /** SINTEZA — ce e omul ăsta cu adevărat */
  synthesis: {
    /** Stil dominant (din Herrmann) */
    cognitiveStyle?: { dominant: string; description: string }
    /** Tip personalitate (din MBTI) */
    personalityType?: { type: string; description: string }
    /** Nivel maturitate (din B2C spirală sau din experiență B2B) */
    maturityLevel: "NEWCOMER" | "EXPLORING" | "DEVELOPING" | "MATURING" | "INTEGRATED"
    /** Zona de conștiință (din Hawkins) */
    consciousnessZone?: "REACTIV" | "RATIONAL" | "INTEGRAT"
    /** Potențial de leadership (integrat din CPI260 + competențe + motivație) */
    leadershipPotential?: "RIDICAT" | "MEDIU" | "SCAZUT" | "NEMASURAT"
    /** Integritate (din ESQ-2 sau observație) */
    integrityLevel?: "RIDICATA" | "MEDIE" | "DE_MONITORIZAT" | "NEMASURATA"
  }

  /** CONGRUENȚE — unde dimensiunile se aliniază */
  congruences: Array<{
    dimensions: string[]
    finding: string
    valence: "POZITIVA" | "NEGATIVA" | "NEUTRA"
  }>

  /** TENSIUNI — unde dimensiunile se contrazic (oportunități de dezvoltare) */
  tensions: Array<{
    dimension1: string
    dimension2: string
    tension: string
    developmentOpportunity: string
  }>

  /** Recomandare pe care business-urile o consumă */
  forBusinesses: {
    /** JG B2B: ce post i se potrivește */
    suitableRoles?: string[]
    /** JG B2C: ce card e prioritar */
    priorityCard?: number
    /** edu4life: ce formare are nevoie */
    trainingNeeds?: string[]
    /** Matching: cât de bun e ca furnizor/angajat/partener */
    reliabilityScore?: number
  }
}

// ═══════════════════════════════════════════════════════════════
// INDIVIDUAL PROFILER
// ═══════════════════════════════════════════════════════════════

export const IndividualProfiler = {
  /**
   * Construiește profilul individual complet din surse disponibile.
   * Caută în DB: B2CProfile, evaluări JG, BridgeParticipant.
   */
  async buildProfile(entityId: string): Promise<IndividualProfile> {
    // Încercăm B2C profile
    const b2cProfile = await prisma.b2CProfile?.findFirst?.({
      where: { userId: entityId },
    }).catch(() => null)

    // Încercăm Bridge participant
    const bridgeParticipant = await prisma.bridgeParticipant?.findUnique?.({
      where: { id: entityId },
    }).catch(() => null)

    // Colectăm dimensiunile N1 disponibile
    const dimensions: DimensionalProfile[] = []

    if (b2cProfile) {
      // Herrmann
      if (b2cProfile.herrmannA && b2cProfile.herrmannB) {
        dimensions.push({
          dimensionId: "COGNITIVE_STYLE",
          entityId,
          entityType: "PERSON",
          rawResult: {
            A: b2cProfile.herrmannA,
            B: b2cProfile.herrmannB,
            C: b2cProfile.herrmannC,
            D: b2cProfile.herrmannD,
          },
          confidence: b2cProfile.herrmannA > 0 ? 0.8 : 0.3,
          measuredAt: b2cProfile.updatedAt?.toISOString() || new Date().toISOString(),
        })
      }

      // Hawkins
      if (b2cProfile.hawkinsEstimate) {
        dimensions.push(
          DimensionalProfiler.consciousness(
            b2cProfile.hawkinsEstimate,
            b2cProfile.hawkinsConfidence || 0.5,
            entityId
          )
        )
      }

      // VIA
      if (b2cProfile.viaSignature && (b2cProfile.viaSignature as string[]).length > 0) {
        dimensions.push({
          dimensionId: "VALUES",
          entityId,
          entityType: "PERSON",
          rawResult: {
            signature: b2cProfile.viaSignature,
            undeveloped: b2cProfile.viaUndeveloped,
          },
          confidence: 0.7,
          measuredAt: b2cProfile.updatedAt?.toISOString() || new Date().toISOString(),
        })
      }
    }

    // Integrăm N1
    const integrated = DimensionalProfiler.integrateAllDimensions(dimensions)

    // Sinteză
    const synthesis = buildSynthesis(dimensions, b2cProfile, bridgeParticipant)

    // Congruențe și tensiuni
    const { congruences, tensions } = detectCongruencesAndTensions(dimensions, synthesis)

    // Recomandări per business
    const forBusinesses = generateBusinessRecommendations(synthesis, dimensions, b2cProfile)

    const source = b2cProfile ? "B2C" : bridgeParticipant ? "BRIDGE" : "B2B"

    return {
      entityId,
      entityType: "PERSON",
      source,
      dimensions,
      completeness: integrated.completeness,
      synthesis,
      congruences,
      tensions,
      forBusinesses,
    }
  },
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function buildSynthesis(
  dimensions: DimensionalProfile[],
  b2cProfile: any,
  bridgeParticipant: any
): IndividualProfile["synthesis"] {
  const synthesis: IndividualProfile["synthesis"] = {
    maturityLevel: "NEWCOMER",
  }

  // Stil cognitiv din Herrmann
  const herrmann = dimensions.find(d => d.dimensionId === "COGNITIVE_STYLE")
  if (herrmann?.rawResult) {
    const { A, B, C, D } = herrmann.rawResult
    const max = Math.max(A || 0, B || 0, C || 0, D || 0)
    const dominant = max === A ? "A" : max === B ? "B" : max === C ? "C" : "D"
    const descriptions: Record<string, string> = {
      A: "Analitic — gândire logică, fapte, date",
      B: "Organizat — structură, proces, detalii",
      C: "Relațional — empatie, comunicare, echipă",
      D: "Vizionar — imaginație, sinteză, inovație",
    }
    synthesis.cognitiveStyle = { dominant, description: descriptions[dominant] }
  }

  // Tip personalitate din MBTI
  const mbti = dimensions.find(d => d.dimensionId === "PERSONALITY_TYPE")
  if (mbti?.rawResult?.type) {
    synthesis.personalityType = { type: mbti.rawResult.type, description: mbti.rawResult.description || "" }
  }

  // Maturitate din B2C profil
  if (b2cProfile?.spiralLevel) {
    const levels: IndividualProfile["synthesis"]["maturityLevel"][] = [
      "NEWCOMER", "EXPLORING", "DEVELOPING", "MATURING", "INTEGRATED",
    ]
    synthesis.maturityLevel = levels[Math.min(4, (b2cProfile.spiralLevel || 1) - 1)]
  }

  // Conștiință din Hawkins
  const hawkins = dimensions.find(d => d.dimensionId === "CONSCIOUSNESS")
  if (hawkins?.rawResult?.zone) {
    const zones: Record<string, IndividualProfile["synthesis"]["consciousnessZone"]> = {
      REACTIV_EMOTIONAL: "REACTIV",
      RATIONAL: "RATIONAL",
      INTEGRAT: "INTEGRAT",
    }
    synthesis.consciousnessZone = zones[hawkins.rawResult.zone] || "RATIONAL"
  }

  // Leadership din instrumente externe
  const leadership = dimensions.find(d => d.dimensionId === "LEADERSHIP")
  if (leadership?.normalizedScore) {
    synthesis.leadershipPotential = leadership.normalizedScore >= 60 ? "RIDICAT" : leadership.normalizedScore >= 40 ? "MEDIU" : "SCAZUT"
  }

  // Integritate din ESQ-2
  const integrity = dimensions.find(d => d.dimensionId === "INTEGRITY")
  if (integrity?.normalizedScore) {
    synthesis.integrityLevel = integrity.normalizedScore >= 60 ? "RIDICATA" : integrity.normalizedScore >= 40 ? "MEDIE" : "DE_MONITORIZAT"
  }

  return synthesis
}

function detectCongruencesAndTensions(
  dimensions: DimensionalProfile[],
  synthesis: IndividualProfile["synthesis"]
): { congruences: IndividualProfile["congruences"]; tensions: IndividualProfile["tensions"] } {
  const congruences: IndividualProfile["congruences"] = []
  const tensions: IndividualProfile["tensions"] = []

  // Herrmann D (vizionar) + MBTI N (intuitiv) = congruență creativă
  const herrmann = dimensions.find(d => d.dimensionId === "COGNITIVE_STYLE")
  const mbti = dimensions.find(d => d.dimensionId === "PERSONALITY_TYPE")

  if (herrmann?.rawResult && mbti?.rawResult?.type) {
    const isHermannD = (herrmann.rawResult.D || 0) > 60
    const isMBTIN = mbti.rawResult.type?.includes("N")

    if (isHermannD && isMBTIN) {
      congruences.push({
        dimensions: ["COGNITIVE_STYLE", "PERSONALITY_TYPE"],
        finding: "Stil vizionar (Herrmann D) aliniat cu intuiție (MBTI N) — potențial creativ ridicat",
        valence: "POZITIVA",
      })
    }
    if (isHermannD && !isMBTIN) {
      tensions.push({
        dimension1: "COGNITIVE_STYLE",
        dimension2: "PERSONALITY_TYPE",
        tension: "Herrmann D (vizionar) dar MBTI S (senzorial) — conflict între aspirație și metodă",
        developmentOpportunity: "Poate învăța să-și implementeze viziunile pas cu pas (B → D bridge)",
      })
    }
  }

  // Competență ridicată + motivație scăzută = potențial irosit
  const competence = dimensions.find(d => d.dimensionId === "COMPETENCE")
  const motivation = dimensions.find(d => d.dimensionId === "MOTIVATION")

  if (competence?.normalizedScore && motivation?.normalizedScore) {
    if (competence.normalizedScore > 60 && motivation.normalizedScore < 40) {
      tensions.push({
        dimension1: "COMPETENCE",
        dimension2: "MOTIVATION",
        tension: "Competent dar nemotivat — potențial irosit",
        developmentOpportunity: "Investigare cauze: mediu greșit? Valori incompatibile? Burnout?",
      })
    }
    if (competence.normalizedScore < 40 && motivation.normalizedScore > 60) {
      tensions.push({
        dimension1: "COMPETENCE",
        dimension2: "MOTIVATION",
        tension: "Motivat dar lipsesc competențele — efort fără rezultat",
        developmentOpportunity: "Formare profesională țintită — motivația e combustibilul, competența e motorul",
      })
    }
  }

  // Integritate scăzută + leadership ridicat = pericol
  if (synthesis.integrityLevel === "DE_MONITORIZAT" && synthesis.leadershipPotential === "RIDICAT") {
    tensions.push({
      dimension1: "INTEGRITY",
      dimension2: "LEADERSHIP",
      tension: "Potențial de leadership ridicat cu integritate discutabilă — risc pentru organizație",
      developmentOpportunity: "Nu se promovează fără clarificarea dimensiunii de integritate",
    })
  }

  // Hawkins sub 200 + poziție de decizie = risc
  if (synthesis.consciousnessZone === "REACTIV" && synthesis.leadershipPotential === "RIDICAT") {
    tensions.push({
      dimension1: "CONSCIOUSNESS",
      dimension2: "LEADERSHIP",
      tension: "Nivel conștiință reactiv-emoțional în combinație cu putere decizională — decizii impulsive",
      developmentOpportunity: "Coaching pentru auto-reglare emoțională înainte de promovare în funcții de decizie",
    })
  }

  return { congruences, tensions }
}

function generateBusinessRecommendations(
  synthesis: IndividualProfile["synthesis"],
  dimensions: DimensionalProfile[],
  b2cProfile: any
): IndividualProfile["forBusinesses"] {
  const recs: IndividualProfile["forBusinesses"] = {}

  // JG B2C: ce card e prioritar
  if (synthesis.maturityLevel === "NEWCOMER") recs.priorityCard = 1
  else if (synthesis.maturityLevel === "EXPLORING") recs.priorityCard = 2
  else if (synthesis.maturityLevel === "DEVELOPING") recs.priorityCard = 3
  else if (synthesis.maturityLevel === "MATURING") recs.priorityCard = 4
  else recs.priorityCard = 5

  // Formare necesară
  const trainingNeeds: string[] = []
  if (synthesis.leadershipPotential === "SCAZUT") trainingNeeds.push("Dezvoltare competențe de conducere")
  if (synthesis.consciousnessZone === "REACTIV") trainingNeeds.push("Auto-reglare emoțională")
  if (dimensions.find(d => d.dimensionId === "COMPETENCE")?.normalizedScore &&
      (dimensions.find(d => d.dimensionId === "COMPETENCE")?.normalizedScore || 0) < 40) {
    trainingNeeds.push("Formare profesională de bază")
  }
  if (trainingNeeds.length > 0) recs.trainingNeeds = trainingNeeds

  // Reliability score (pentru matching)
  let reliability = 5 // baza
  if (synthesis.integrityLevel === "RIDICATA") reliability += 2
  if (synthesis.integrityLevel === "DE_MONITORIZAT") reliability -= 2
  if (synthesis.maturityLevel === "INTEGRATED") reliability += 2
  if (synthesis.consciousnessZone === "INTEGRAT") reliability += 1
  recs.reliabilityScore = Math.max(1, Math.min(10, reliability))

  return recs
}
