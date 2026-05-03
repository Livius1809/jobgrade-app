/**
 * matching-engine.ts — Motor de matching cerere↔ofertă
 *
 * Input: o nevoie (BridgeNeed) sau o ofertă (BridgeOffer)
 * Output: lista de match-uri ordonate per scor relevanță
 *
 * Factori de scoring:
 * 1. Sector/nișă — match exact (1.0) sau sector comun (0.5)
 * 2. Proximitate — distanță fizică (invers proporțional)
 * 3. Disponibilitate — program, capacitate, delivery type
 * 4. Preț — bugetul clientului vs. prețul furnizorului
 * 5. Calitate — scorul furnizorului din feedback
 * 6. Urgență — nevoile urgente primesc bonus pe match-uri rapide
 */

import { prisma } from "@/lib/prisma"

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface MatchResult {
  offerId: string
  providerId: string
  providerAlias: string
  category: string
  description: string | null
  priceRange: string | null
  deliveryType: string
  distanceKm: number | null
  matchScore: number       // 0-1
  matchReasons: string[]   // de ce e relevant
  qualityScore: number | null
  isOnline: boolean
}

export interface DemandResult {
  needId: string
  clientId: string
  clientAlias: string
  territory: string
  category: string
  description: string | null
  urgency: string
  budget: string | null
  distanceKm: number | null
  matchScore: number
  matchReasons: string[]
}

// ═══════════════════════════════════════════════════════════════
// MATCHING: CLIENT CAUTĂ FURNIZOR
// ═══════════════════════════════════════════════════════════════

/**
 * Găsește furnizori pentru o nevoie specifică.
 * Ordonați per scor de relevanță descrescător.
 */
export async function findProvidersForNeed(
  needId: string,
  limit: number = 20
): Promise<MatchResult[]> {
  const need = await prisma.bridgeNeed.findUnique({
    where: { id: needId },
    include: { participant: true },
  })

  if (!need) return []

  // Căutăm oferte active din același sector
  const offers = await prisma.bridgeOffer.findMany({
    where: {
      isActive: true,
      sectorId: need.sectorId,
      // Nu returnăm ofertele aceluiași participant
      participantId: { not: need.participantId },
    },
    include: { participant: true },
  })

  // Scorăm fiecare ofertă
  const scored = offers.map(offer => {
    const { score, reasons } = calculateMatchScore(need, offer)
    const distanceKm = calculateDistance(
      need.participant.latitude, need.participant.longitude,
      offer.participant.latitude, offer.participant.longitude
    )

    return {
      offerId: offer.id,
      providerId: offer.participantId,
      providerAlias: offer.participant.alias,
      category: offer.category,
      description: offer.description,
      priceRange: offer.priceRange,
      deliveryType: offer.deliveryType,
      distanceKm,
      matchScore: score,
      matchReasons: reasons,
      qualityScore: offer.qualityScore,
      isOnline: offer.isOnline,
    }
  })

  return scored
    .filter(s => s.matchScore > 0.1) // filtru minim
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit)
}

/**
 * Găsește cerere (clienți) pentru o ofertă specifică.
 * Furnizorul vede cine are nevoie de ce oferă el.
 */
export async function findClientsForOffer(
  offerId: string,
  limit: number = 20
): Promise<DemandResult[]> {
  const offer = await prisma.bridgeOffer.findUnique({
    where: { id: offerId },
    include: { participant: true },
  })

  if (!offer) return []

  const needs = await prisma.bridgeNeed.findMany({
    where: {
      isActive: true,
      isSatisfied: false,
      sectorId: offer.sectorId,
      participantId: { not: offer.participantId },
    },
    include: { participant: true },
  })

  const scored = needs.map(need => {
    const { score, reasons } = calculateMatchScore(need, offer)
    const distanceKm = calculateDistance(
      need.participant.latitude, need.participant.longitude,
      offer.participant.latitude, offer.participant.longitude
    )

    return {
      needId: need.id,
      clientId: need.participantId,
      clientAlias: need.participant.alias,
      territory: need.participant.territory,
      category: need.category,
      description: need.description,
      urgency: need.urgency,
      budget: need.budget,
      distanceKm,
      matchScore: score,
      matchReasons: reasons,
    }
  })

  return scored
    .filter(s => s.matchScore > 0.1)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit)
}

// ═══════════════════════════════════════════════════════════════
// SCORING
// ═══════════════════════════════════════════════════════════════

function calculateMatchScore(
  need: any, // BridgeNeed + participant
  offer: any  // BridgeOffer + participant
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

  // 1. Sector match (obligatoriu — deja filtrat, dar nișa contează)
  if (need.sectorId === offer.sectorId) {
    score += 0.2
    reasons.push("Sector comun")

    if (need.nicheId && offer.nicheId && need.nicheId === offer.nicheId) {
      score += 0.15
      reasons.push("Nișă exactă")
    }
  }

  // 2. Categorie — keyword matching
  if (need.category && offer.category) {
    const needWords = need.category.toLowerCase().split(/[\s,]+/)
    const offerWords = offer.category.toLowerCase().split(/[\s,]+/)
    const commonWords = needWords.filter((w: string) => offerWords.includes(w))
    if (commonWords.length > 0) {
      score += 0.15 * Math.min(1, commonWords.length / 2)
      reasons.push(`Categorie similară: ${commonWords.join(", ")}`)
    }
  }

  // 3. Proximitate
  const distance = calculateDistance(
    need.participant.latitude, need.participant.longitude,
    offer.participant.latitude, offer.participant.longitude
  )

  if (distance !== null) {
    const maxDist = need.maxDistanceKm || need.participant.searchRadius || 30
    if (distance <= maxDist) {
      const proxScore = Math.max(0, 1 - distance / maxDist) * 0.2
      score += proxScore
      reasons.push(`${Math.round(distance)} km distanță`)
    } else if (offer.isOnline || offer.deliveryType === "ONLINE" || offer.deliveryType === "LIVRARE") {
      score += 0.1
      reasons.push("Disponibil online/livrare")
    }
  }

  // 4. Delivery type compatibility
  if (need.preferLocal && (offer.deliveryType === "LOCAL" || offer.deliveryType === "DEPLASARE")) {
    score += 0.1
    reasons.push("Disponibil local")
  }
  if (need.acceptOnline && offer.isOnline) {
    score += 0.05
    reasons.push("Disponibil online")
  }

  // 5. Calitate furnizor
  if (offer.qualityScore && offer.qualityScore >= 4) {
    score += 0.1
    reasons.push(`Scor calitate ${offer.qualityScore}/5`)
  } else if (offer.qualityScore && offer.qualityScore >= 3) {
    score += 0.05
  }

  // 6. Experiență
  if (offer.experienceYears && offer.experienceYears >= 5) {
    score += 0.05
    reasons.push(`${offer.experienceYears} ani experiență`)
  }

  // 7. Urgență bonus — nevoile urgente primesc prioritate pe match-uri disponibile
  if (need.urgency === "CRITIC") score *= 1.3
  else if (need.urgency === "URGENT") score *= 1.15

  return { score: Math.min(1, Math.round(score * 100) / 100), reasons }
}

// ═══════════════════════════════════════════════════════════════
// UTILITĂȚI
// ═══════════════════════════════════════════════════════════════

/**
 * Distanță Haversine între 2 puncte GPS (km).
 */
function calculateDistance(
  lat1: number | null, lng1: number | null,
  lat2: number | null, lng2: number | null
): number | null {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null

  const R = 6371 // km
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}

function toRad(deg: number): number {
  return deg * Math.PI / 180
}

/**
 * Propune match-uri automat pentru toate nevoile nesatisfăcute dintr-un teritoriu.
 * Rulat periodic de organism (cron).
 */
export async function autoMatchTerritory(territory: string): Promise<number> {
  const unmetNeeds = await prisma.bridgeNeed.findMany({
    where: {
      isActive: true,
      isSatisfied: false,
      participant: { territory },
    },
  })

  let matchesCreated = 0

  for (const need of unmetNeeds) {
    const providers = await findProvidersForNeed(need.id, 3)

    for (const provider of providers) {
      // Verificăm dacă conexiunea nu există deja
      const existing = await prisma.bridgeConnection.findFirst({
        where: { needId: need.id, offerId: provider.offerId },
      })

      if (!existing && provider.matchScore > 0.3) {
        await prisma.bridgeConnection.create({
          data: {
            clientId: need.participantId,
            providerId: provider.providerId,
            needId: need.id,
            offerId: provider.offerId,
            matchScore: provider.matchScore,
            distanceKm: provider.distanceKm,
            matchReason: provider.matchReasons.join("; "),
            status: "PROPOSED",
          },
        })
        matchesCreated++
      }
    }
  }

  return matchesCreated
}
