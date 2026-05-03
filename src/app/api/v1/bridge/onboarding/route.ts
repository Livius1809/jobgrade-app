/**
 * POST /api/v1/bridge/onboarding
 *
 * Înregistrare participant pe hartă.
 * Dual: ce ai nevoie + ce ai de oferit.
 * Returnează raport gratuit instant.
 */

export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateOnboardingReport } from "@/lib/bridge/onboarding-report"

export async function POST(req: NextRequest) {
  const body = await req.json()

  const {
    alias, email, phone,
    ageRange, gender,
    status, hierarchy, workplace,
    maritalStatus, hasChildren, childrenAges,
    territory, address, latitude, longitude, searchRadius,
    needs, offers,
  } = body

  if (!alias || !email || !territory) {
    return NextResponse.json({ error: "alias, email și territory sunt obligatorii" }, { status: 400 })
  }

  // Verificăm dacă participantul există deja
  const existing = await prisma.bridgeParticipant.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Email deja înregistrat", participantId: existing.id }, { status: 409 })
  }

  // Calculăm completitudinea profilului
  const fields = [alias, email, ageRange, gender, status, maritalStatus, territory, address]
  const profileCompleteness = fields.filter(Boolean).length / fields.length

  // Creăm participantul
  const participant = await prisma.bridgeParticipant.create({
    data: {
      alias,
      email,
      phone,
      ageRange,
      gender,
      status: status || "ANGAJAT",
      hierarchy,
      workplace,
      maritalStatus,
      hasChildren: hasChildren || false,
      childrenAges,
      territory: territory.toUpperCase(),
      address,
      latitude,
      longitude,
      searchRadius: searchRadius || 15,
      profileCompleteness,
      lastActiveAt: new Date(),
    },
  })

  // Creăm nevoile declarate
  if (needs && Array.isArray(needs)) {
    for (const need of needs) {
      await prisma.bridgeNeed.create({
        data: {
          participantId: participant.id,
          sectorId: need.sectorId || "SERVICII",
          nicheId: need.nicheId,
          category: need.category,
          description: need.description,
          urgency: need.urgency || "NORMAL",
          frequency: need.frequency,
          budget: need.budget,
          preferLocal: need.preferLocal !== false,
          acceptOnline: need.acceptOnline || false,
          maxDistanceKm: need.maxDistanceKm,
          territory: territory.toUpperCase(),
        },
      })
    }
  }

  // Creăm ofertele declarate
  if (offers && Array.isArray(offers)) {
    for (const offer of offers) {
      await prisma.bridgeOffer.create({
        data: {
          participantId: participant.id,
          sectorId: offer.sectorId || "SERVICII",
          nicheId: offer.nicheId,
          category: offer.category,
          description: offer.description,
          priceRange: offer.priceRange,
          priceUnit: offer.priceUnit,
          availableFrom: offer.availableFrom,
          deliveryType: offer.deliveryType || "LOCAL",
          coverageKm: offer.coverageKm,
          isOnline: offer.isOnline || false,
          experienceYears: offer.experienceYears,
          certifications: offer.certifications,
          capacity: offer.capacity,
          territory: territory.toUpperCase(),
        },
      })
    }
  }

  // Generăm raportul gratuit
  const report = await generateOnboardingReport(participant.id)

  return NextResponse.json({
    participantId: participant.id,
    alias: participant.alias,
    territory: participant.territory,
    profileCompleteness: Math.round(profileCompleteness * 100),
    report,
    message: "Bun venit pe hartă! Raportul tău gratuit e gata.",
  }, { status: 201 })
}
