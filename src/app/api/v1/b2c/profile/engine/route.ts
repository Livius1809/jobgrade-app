/**
 * GET /api/v1/b2c/profile/engine — Profil complet B2C (echivalent Company Profiler)
 * Un singur apel: userId → tot ce trebuie pentru orice agent/card
 */

import { NextRequest, NextResponse } from "next/server"
import { extractB2CAuth, verifyB2COwnership } from "@/lib/security/b2c-auth"
import { getUserProfile } from "@/lib/b2c/profiler-engine"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")
  if (!userId) return NextResponse.json({ error: "userId necesar" }, { status: 400 })

  const b2cAuth = extractB2CAuth(req)
  if (!b2cAuth || !verifyB2COwnership(b2cAuth, userId)) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  try {
    const profile = await getUserProfile(userId)

    // Nu trimitem agentContext la client (invizibil)
    const { agentContext, ...clientSafe } = profile

    // Profil B2C accesat = cunoaștere despre structura profilurilor candidați
    try {
      const { learnFromReport } = await import("@/lib/learning-hooks")
      await learnFromReport("B2C_PROFILE_ENGINE", userId, `Profil accesat: cards=${Object.keys((profile as any).cards || {}).join(",") || "?"}`)
    } catch {}

    return NextResponse.json(clientSafe)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
