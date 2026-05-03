/**
 * GET /api/v1/bridge/search?needId=X — Client caută furnizor
 * GET /api/v1/bridge/search?offerId=X — Furnizor vede cerere
 * GET /api/v1/bridge/search?territory=X&sector=Y — Căutare generală
 */

export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { findProvidersForNeed, findClientsForOffer } from "@/lib/bridge/matching-engine"

export async function GET(req: NextRequest) {
  const needId = req.nextUrl.searchParams.get("needId")
  const offerId = req.nextUrl.searchParams.get("offerId")
  const territory = req.nextUrl.searchParams.get("territory")
  const sector = req.nextUrl.searchParams.get("sector")
  const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20")

  // Mod 1: Client caută furnizor pentru o nevoie specifică
  if (needId) {
    const providers = await findProvidersForNeed(needId, limit)
    return NextResponse.json({
      mode: "client_seeks_provider",
      needId,
      results: providers,
      total: providers.length,
    })
  }

  // Mod 2: Furnizor vede cerere pentru o ofertă specifică
  if (offerId) {
    const clients = await findClientsForOffer(offerId, limit)
    return NextResponse.json({
      mode: "provider_sees_demand",
      offerId,
      results: clients,
      total: clients.length,
    })
  }

  // Mod 3: Căutare generală per teritoriu + sector
  if (territory) {
    const where: any = {
      participant: { territory: territory.toUpperCase() },
      isActive: true,
    }
    if (sector) where.sectorId = sector

    const [needs, offers] = await Promise.all([
      prisma.bridgeNeed.findMany({
        where: { ...where, isSatisfied: false },
        include: { participant: { select: { alias: true, territory: true } } },
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.bridgeOffer.findMany({
        where,
        include: { participant: { select: { alias: true, territory: true } } },
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ])

    return NextResponse.json({
      mode: "territory_overview",
      territory: territory.toUpperCase(),
      sector: sector || "toate",
      needs: {
        total: needs.length,
        items: needs.map(n => ({
          id: n.id,
          alias: n.participant.alias,
          category: n.category,
          sectorId: n.sectorId,
          urgency: n.urgency,
          description: n.description,
        })),
      },
      offers: {
        total: offers.length,
        items: offers.map(o => ({
          id: o.id,
          alias: o.participant.alias,
          category: o.category,
          sectorId: o.sectorId,
          priceRange: o.priceRange,
          deliveryType: o.deliveryType,
          qualityScore: o.qualityScore,
        })),
      },
    })
  }

  return NextResponse.json({ error: "Parametru necesar: needId, offerId, sau territory" }, { status: 400 })
}
