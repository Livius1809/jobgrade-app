/**
 * onboarding-report.ts — Generare raport gratuit la înregistrare
 *
 * Principiu: "Fiecare parte primește gratuit ce-l aduce la masă,
 *             plătește ce-l ajută să câștige."
 *
 * Raportul gratuit = valoarea imediată care aduce participantul pe platformă.
 * Conține: nevoi identificate, furnizori locali, ce lipsește, recomandări.
 *
 * Conexiunile concrete (contact furnizor, tranzacție) = premium.
 */

import { prisma } from "@/lib/prisma"
import { anthropic, AI_MODEL } from "@/lib/ai/client"
import { SECTOR_TAXONOMY } from "@/lib/crawl/sector-niche-taxonomy"

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface OnboardingReport {
  participantAlias: string
  territory: string

  /** Nevoi identificate din profil (AI) */
  identifiedNeeds: Array<{
    category: string
    sectorId: string
    intensity: "RIDICATA" | "MEDIE" | "SCAZUTA"
    reason: string
  }>

  /** Furnizori locali existenți per nevoie */
  localProviders: Array<{
    category: string
    count: number
    examples: string[]
    coverage: "BUNA" | "PARTIALA" | "LIPSESTE"
  }>

  /** Ce lipsește în zona participantului */
  gaps: Array<{
    category: string
    description: string
    nearestAlternative: string | null
  }>

  /** Recomandări personalizate */
  recommendations: string[]

  /** Dacă e furnizor — cerere existentă pentru ce oferă */
  demandForOffers?: Array<{
    category: string
    estimatedDemand: number
    competitorCount: number
    opportunity: string
  }>
}

// ═══════════════════════════════════════════════════════════════
// GENERARE RAPORT
// ═══════════════════════════════════════════════════════════════

export async function generateOnboardingReport(participantId: string): Promise<OnboardingReport> {
  const participant = await prisma.bridgeParticipant.findUnique({
    where: { id: participantId },
    include: { needs: true, offers: true },
  })

  if (!participant) throw new Error("Participant not found")

  // Date teritoriale
  const [territorialData, localEntities] = await Promise.all([
    prisma.territorialData.findMany({ where: { territory: participant.territory } }),
    prisma.localEntity.findMany({ where: { territory: participant.territory, isActive: true } }),
  ])

  // Generăm nevoi din profil via AI
  const identifiedNeeds = await identifyNeedsFromProfile(participant)

  // Verificăm furnizori locali per nevoie
  const localProviders = identifiedNeeds.map(need => {
    const relevantEntities = localEntities.filter(e =>
      e.category?.toLowerCase().includes(need.category.toLowerCase()) ||
      e.type.toLowerCase().includes(mapSectorToEntityType(need.sectorId).toLowerCase())
    )

    return {
      category: need.category,
      count: relevantEntities.length,
      examples: relevantEntities.slice(0, 3).map(e => e.name),
      coverage: (relevantEntities.length >= 3 ? "BUNA" : relevantEntities.length > 0 ? "PARTIALA" : "LIPSESTE") as "BUNA" | "PARTIALA" | "LIPSESTE",
    }
  })

  // Gaps — unde nu există furnizori
  const gaps = localProviders
    .filter(lp => lp.coverage !== "BUNA")
    .map(lp => ({
      category: lp.category,
      description: lp.coverage === "LIPSESTE"
        ? `Nu există furnizori de ${lp.category} în ${participant.territory}`
        : `Ofertă limitată de ${lp.category} (${lp.count} furnizori)`,
      nearestAlternative: findNearestAlternative(lp.category, participant.territory, territorialData),
    }))

  // Recomandări personalizate
  const recommendations = generateRecommendations(participant, identifiedNeeds, gaps)

  // Dacă e furnizor — cerere existentă
  let demandForOffers: OnboardingReport["demandForOffers"]
  if (participant.offers.length > 0) {
    demandForOffers = await estimateDemandForOffers(participant)
  }

  // Salvăm raportul în DB
  await prisma.bridgeReport.create({
    data: {
      participantId: participant.id,
      territory: participant.territory,
      needs: identifiedNeeds,
      localProviders,
      gaps,
      recommendations,
      opportunities: demandForOffers || [],
    },
  })

  return {
    participantAlias: participant.alias,
    territory: participant.territory,
    identifiedNeeds,
    localProviders,
    gaps,
    recommendations,
    demandForOffers,
  }
}

// ═══════════════════════════════════════════════════════════════
// IDENTIFICARE NEVOI DIN PROFIL
// ═══════════════════════════════════════════════════════════════

async function identifyNeedsFromProfile(
  participant: any
): Promise<OnboardingReport["identifiedNeeds"]> {
  // Nevoi universale per profil
  const needs: OnboardingReport["identifiedNeeds"] = []

  const age = participant.ageRange ? parseInt(participant.ageRange) : 35

  // Nevoi bazate pe vârstă
  if (age <= 19) {
    needs.push({ category: "Educație", sectorId: "EDUCATIE", intensity: "RIDICATA", reason: "Vârstă de formare" })
  }
  if (age >= 20 && age <= 35) {
    needs.push({ category: "Orientare profesională", sectorId: "EDUCATIE", intensity: "RIDICATA", reason: "Vârstă de carieră activă" })
    needs.push({ category: "Locuință", sectorId: "IMOBILIAR", intensity: "MEDIE", reason: "Perioada de stabilire" })
  }
  if (age >= 30 && age <= 50 && participant.hasChildren) {
    needs.push({ category: "Educație copii", sectorId: "EDUCATIE", intensity: "RIDICATA", reason: `Copii: ${participant.childrenAges || "vârstă nedeclarată"}` })
    needs.push({ category: "Pediatrie", sectorId: "SANATATE", intensity: "RIDICATA", reason: "Familie cu copii" })
  }
  if (age >= 50) {
    needs.push({ category: "Sănătate preventivă", sectorId: "SANATATE", intensity: "RIDICATA", reason: "Vârstă de prevenție" })
  }
  if (age >= 60) {
    needs.push({ category: "Servicii medicale", sectorId: "SANATATE", intensity: "RIDICATA", reason: "Vârstă cu nevoi medicale crescute" })
    needs.push({ category: "Asistență la domiciliu", sectorId: "SANATATE", intensity: "MEDIE", reason: "Confort și autonomie" })
  }

  // Nevoi bazate pe statut
  if (participant.status === "SOMER") {
    needs.push({ category: "Formare profesională", sectorId: "EDUCATIE", intensity: "RIDICATA", reason: "Reconversie necesară" })
    needs.push({ category: "Orientare în carieră", sectorId: "EDUCATIE", intensity: "RIDICATA", reason: "Căutare loc de muncă" })
  }
  if (participant.status === "ANTREPRENOR") {
    needs.push({ category: "Contabilitate", sectorId: "SERVICII", intensity: "MEDIE", reason: "Nevoie operațională business" })
    needs.push({ category: "Consultanță juridică", sectorId: "SERVICII", intensity: "MEDIE", reason: "Conformitate legală" })
  }
  if (participant.status === "STUDENT") {
    needs.push({ category: "Practică profesională", sectorId: "EDUCATIE", intensity: "RIDICATA", reason: "Formare practică" })
  }

  // Nevoi universale
  needs.push({ category: "Alimentație", sectorId: "AGRICULTURA", intensity: "MEDIE", reason: "Nevoie universală" })
  needs.push({ category: "Transport", sectorId: "SERVICII", intensity: "MEDIE", reason: "Mobilitate" })

  // Adăugăm nevoile declarate explicit de participant
  const explicitNeeds = await prisma.bridgeNeed.findMany({
    where: { participantId: participant.id },
  })
  for (const en of explicitNeeds) {
    if (!needs.some(n => n.category === en.category)) {
      needs.push({
        category: en.category,
        sectorId: en.sectorId,
        intensity: en.urgency === "CRITIC" || en.urgency === "URGENT" ? "RIDICATA" : "MEDIE",
        reason: en.description || "Declarat de participant",
      })
    }
  }

  return needs
}

function mapSectorToEntityType(sectorId: string): string {
  const map: Record<string, string> = {
    SANATATE: "HOSPITAL", EDUCATIE: "SCHOOL", TURISM: "RESTAURANT",
    SERVICII: "SERVICE", PRODUCTIE: "BUSINESS", AGRICULTURA: "BUSINESS",
  }
  return map[sectorId] || "BUSINESS"
}

function findNearestAlternative(
  category: string,
  territory: string,
  data: Array<{ category: string; key: string; value: string }>
): string | null {
  // Heuristică: cel mai apropiat oraș mare
  const infraData = data.filter(d => d.category === "INFRASTRUCTURE")
  const hasRailway = infraData.some(d => d.key.includes("rail") || d.key.includes("gara"))

  if (hasRailway) return "Oraș mare accesibil cu trenul"
  return "Cel mai apropiat centru urban cu servicii complete"
}

function generateRecommendations(
  participant: any,
  needs: OnboardingReport["identifiedNeeds"],
  gaps: OnboardingReport["gaps"]
): string[] {
  const recs: string[] = []

  const criticalGaps = gaps.filter(g => !g.nearestAlternative)
  if (criticalGaps.length > 0) {
    recs.push(`În zona ${participant.territory}, ${criticalGaps.length} din nevoile tale nu au furnizor local. Te vom notifica imediat când apare unul.`)
  }

  const highNeeds = needs.filter(n => n.intensity === "RIDICATA")
  if (highNeeds.length > 0) {
    recs.push(`Prioritățile tale imediate: ${highNeeds.map(n => n.category).join(", ")}. Am căutat furnizori în raza ta de căutare.`)
  }

  if (participant.status === "SOMER") {
    recs.push("Am identificat programe de formare profesională în zona ta. Verifică secțiunea de oferte educaționale.")
  }

  if (participant.offers.length > 0) {
    recs.push("Ai înregistrat și oferte — verifică secțiunea 'Cerere pentru serviciile tale' ca să vezi cine are nevoie de ce oferi.")
  }

  recs.push("Cu fiecare participant nou, harta devine mai precisă. Recomandă platforma în comunitatea ta.")

  return recs
}

async function estimateDemandForOffers(
  participant: any
): Promise<NonNullable<OnboardingReport["demandForOffers"]>> {
  const offers = await prisma.bridgeOffer.findMany({
    where: { participantId: participant.id, isActive: true },
  })

  const results: NonNullable<OnboardingReport["demandForOffers"]> = []

  for (const offer of offers) {
    // Câte nevoi active există în sector
    const needCount = await prisma.bridgeNeed.count({
      where: {
        sectorId: offer.sectorId,
        isActive: true,
        isSatisfied: false,
        participantId: { not: participant.id },
      },
    })

    // Câți competitori
    const competitorCount = await prisma.bridgeOffer.count({
      where: {
        sectorId: offer.sectorId,
        isActive: true,
        participantId: { not: participant.id },
      },
    })

    results.push({
      category: offer.category,
      estimatedDemand: needCount,
      competitorCount,
      opportunity: needCount > competitorCount
        ? `Cerere mai mare decât oferta — oportunitate excelentă (${needCount} nevoi, ${competitorCount} furnizori)`
        : needCount > 0
          ? `Cerere existentă — piață competitivă (${needCount} nevoi, ${competitorCount} furnizori)`
          : "Zero cerere înregistrată deocamdată — vei fi notificat la prima cerere",
    })
  }

  return results
}
