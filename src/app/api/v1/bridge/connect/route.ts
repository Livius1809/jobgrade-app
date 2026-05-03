/**
 * POST /api/v1/bridge/connect — Inițiază conexiune (punte) între client și furnizor
 * PATCH /api/v1/bridge/connect — Actualizează status conexiune (accept, reject, complete, feedback)
 * GET /api/v1/bridge/connect?participantId=X — Listare conexiuni per participant
 */

export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST — creează conexiune nouă
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { clientId, providerId, needId, offerId } = body

  if (!clientId || !providerId || !needId || !offerId) {
    return NextResponse.json({ error: "clientId, providerId, needId, offerId sunt obligatorii" }, { status: 400 })
  }

  // Verificăm existența părților
  const [client, provider, need, offer] = await Promise.all([
    prisma.bridgeParticipant.findUnique({ where: { id: clientId } }),
    prisma.bridgeParticipant.findUnique({ where: { id: providerId } }),
    prisma.bridgeNeed.findUnique({ where: { id: needId } }),
    prisma.bridgeOffer.findUnique({ where: { id: offerId } }),
  ])

  if (!client || !provider || !need || !offer) {
    return NextResponse.json({ error: "Una din entități nu există" }, { status: 404 })
  }

  // Verificăm să nu existe deja
  const existing = await prisma.bridgeConnection.findFirst({
    where: { needId, offerId, status: { notIn: ["REJECTED", "EXPIRED"] } },
  })

  if (existing) {
    return NextResponse.json({ error: "Conexiune deja existentă", connectionId: existing.id }, { status: 409 })
  }

  // Calculăm distanța
  let distanceKm: number | null = null
  if (client.latitude && client.longitude && provider.latitude && provider.longitude) {
    const R = 6371
    const dLat = (provider.latitude - client.latitude) * Math.PI / 180
    const dLng = (provider.longitude - client.longitude) * Math.PI / 180
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(client.latitude * Math.PI / 180) * Math.cos(provider.latitude * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2
    distanceKm = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10
  }

  const connection = await prisma.bridgeConnection.create({
    data: {
      clientId,
      providerId,
      needId,
      offerId,
      matchScore: 0.5, // scor manual — cel automat vine din matching engine
      distanceKm,
      matchReason: "Conexiune inițiată manual de participant",
      status: "PROPOSED",
    },
  })

  return NextResponse.json({
    connectionId: connection.id,
    status: connection.status,
    distanceKm,
    message: "Conexiune creată. Furnizorul va fi notificat.",
  }, { status: 201 })
}

// PATCH — actualizare status
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { connectionId, action, rating, comment } = body

  if (!connectionId || !action) {
    return NextResponse.json({ error: "connectionId și action sunt obligatorii" }, { status: 400 })
  }

  const connection = await prisma.bridgeConnection.findUnique({ where: { id: connectionId } })
  if (!connection) {
    return NextResponse.json({ error: "Conexiune inexistentă" }, { status: 404 })
  }

  const now = new Date()
  const updateData: any = { updatedAt: now }

  switch (action) {
    case "view":
      updateData.viewedAt = now
      updateData.status = "VIEWED"
      break

    case "accept":
      updateData.acceptedAt = now
      updateData.status = "ACCEPTED"
      break

    case "start":
      updateData.status = "IN_PROGRESS"
      break

    case "complete":
      updateData.completedAt = now
      updateData.status = "COMPLETED"
      // Marcăm nevoia ca satisfăcută
      await prisma.bridgeNeed.update({
        where: { id: connection.needId },
        data: { isSatisfied: true },
      })
      break

    case "reject":
      updateData.rejectedAt = now
      updateData.status = "REJECTED"
      updateData.rejectionReason = comment || null
      break

    case "client_feedback":
      updateData.clientRating = rating
      updateData.clientComment = comment
      // Actualizăm scorul furnizorului
      if (rating) await updateProviderQuality(connection.offerId)
      break

    case "provider_feedback":
      updateData.providerRating = rating
      updateData.providerComment = comment
      break

    default:
      return NextResponse.json({ error: `Acțiune necunoscută: ${action}` }, { status: 400 })
  }

  const updated = await prisma.bridgeConnection.update({
    where: { id: connectionId },
    data: updateData,
  })

  return NextResponse.json({
    connectionId: updated.id,
    status: updated.status,
    action,
  })
}

// GET — listare conexiuni per participant
export async function GET(req: NextRequest) {
  const participantId = req.nextUrl.searchParams.get("participantId")
  const status = req.nextUrl.searchParams.get("status")
  const role = req.nextUrl.searchParams.get("role") // "client" sau "provider"

  if (!participantId) {
    return NextResponse.json({ error: "participantId necesar" }, { status: 400 })
  }

  const where: any = {}
  if (role === "client") where.clientId = participantId
  else if (role === "provider") where.providerId = participantId
  else where.OR = [{ clientId: participantId }, { providerId: participantId }]

  if (status) where.status = status

  const connections = await prisma.bridgeConnection.findMany({
    where,
    include: {
      client: { select: { id: true, alias: true, territory: true } },
      provider: { select: { id: true, alias: true, territory: true } },
      need: { select: { id: true, category: true, description: true, urgency: true } },
      offer: { select: { id: true, category: true, description: true, priceRange: true, deliveryType: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  })

  // Statistici
  const stats = {
    total: connections.length,
    proposed: connections.filter(c => c.status === "PROPOSED").length,
    active: connections.filter(c => ["ACCEPTED", "IN_PROGRESS"].includes(c.status)).length,
    completed: connections.filter(c => c.status === "COMPLETED").length,
    avgRating: (() => {
      const ratings = connections
        .map(c => role === "provider" ? c.clientRating : c.providerRating)
        .filter((r): r is number => r !== null)
      return ratings.length > 0 ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10 : null
    })(),
  }

  return NextResponse.json({
    participantId,
    role: role || "ambele",
    stats,
    connections: connections.map(c => ({
      id: c.id,
      status: c.status,
      matchScore: c.matchScore,
      distanceKm: c.distanceKm,
      matchReason: c.matchReason,
      client: c.client,
      provider: c.provider,
      need: c.need,
      offer: c.offer,
      clientRating: c.clientRating,
      providerRating: c.providerRating,
      createdAt: c.createdAt,
      completedAt: c.completedAt,
    })),
  })
}

/**
 * Recalculează scorul de calitate al furnizorului din feedback-ul primit.
 */
async function updateProviderQuality(offerId: string) {
  const connections = await prisma.bridgeConnection.findMany({
    where: { offerId, clientRating: { not: null } },
    select: { clientRating: true },
  })

  if (connections.length === 0) return

  const ratings = connections.map(c => c.clientRating!).filter(r => r > 0)
  const avgRating = ratings.reduce((s, r) => s + r, 0) / ratings.length

  await prisma.bridgeOffer.update({
    where: { id: offerId },
    data: { qualityScore: Math.round(avgRating * 10) / 10 },
  })
}
