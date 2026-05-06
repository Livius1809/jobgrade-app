/**
 * /api/v1/b2c/matching-preferences
 *
 * GET  — Returns user's matching preferences (filters)
 * PUT  — Updates matching preferences
 *
 * Body: { targetIndustries?, excludedCompanies?, preferredLocations?, minMatchScore? }
 * Stored in SystemConfig as B2C_MATCHING_PREFS_{userId}.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { extractB2CAuth } from "@/lib/security/b2c-auth"

export const dynamic = "force-dynamic"

const preferencesSchema = z.object({
  targetIndustries: z.array(z.string()).optional(),
  excludedCompanies: z.array(z.string()).optional(),
  preferredLocations: z.array(z.string()).optional(),
  minMatchScore: z.number().min(0).max(100).optional(),
})

function prefsKey(userId: string): string {
  return `B2C_MATCHING_PREFS_${userId}`
}

/**
 * GET — Returns user's matching preferences
 */
export async function GET(req: NextRequest) {
  const b2cAuth = extractB2CAuth(req)
  if (!b2cAuth) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const userId = b2cAuth.sub

  const config = await prisma.systemConfig.findUnique({
    where: { key: prefsKey(userId) },
  })

  if (!config) {
    return NextResponse.json({
      targetIndustries: [],
      excludedCompanies: [],
      preferredLocations: [],
      minMatchScore: null,
    })
  }

  return NextResponse.json(JSON.parse(config.value))
}

/**
 * PUT — Updates matching preferences
 */
export async function PUT(req: NextRequest) {
  try {
    const b2cAuth = extractB2CAuth(req)
    if (!b2cAuth) {
      return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
    }

    const userId = b2cAuth.sub
    const body = await req.json()
    const data = preferencesSchema.parse(body)

    // Merge with existing preferences
    const existing = await prisma.systemConfig.findUnique({
      where: { key: prefsKey(userId) },
    })
    const current = existing ? JSON.parse(existing.value) : {}

    const updated = {
      ...current,
      ...(data.targetIndustries !== undefined && { targetIndustries: data.targetIndustries }),
      ...(data.excludedCompanies !== undefined && { excludedCompanies: data.excludedCompanies }),
      ...(data.preferredLocations !== undefined && { preferredLocations: data.preferredLocations }),
      ...(data.minMatchScore !== undefined && { minMatchScore: data.minMatchScore }),
      updatedAt: new Date().toISOString(),
    }

    await prisma.systemConfig.upsert({
      where: { key: prefsKey(userId) },
      update: { value: JSON.stringify(updated) },
      create: { key: prefsKey(userId), value: JSON.stringify(updated) },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Date invalide.", details: error.issues },
        { status: 400 },
      )
    }
    console.error("[matching-preferences PUT]", error)
    return NextResponse.json({ error: "Eroare interna." }, { status: 500 })
  }
}
