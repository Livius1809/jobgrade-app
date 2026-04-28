/**
 * MVV Progressive Builder API
 *
 * GET — returnează starea curentă MVV
 * POST — rebuild MVV din datele curente
 * PATCH — clientul validează MVV (sau parte din el)
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { rebuildMVV } from "@/lib/mvv/builder"

export const dynamic = "force-dynamic"

// GET — starea curentă MVV
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const profile = await prisma.companyProfile.findUnique({
      where: { tenantId: session.user.tenantId },
      select: {
        mission: true, vision: true, values: true,
        missionDraft: true, visionDraft: true, valuesDraft: true,
        mvvMaturity: true, mvvLastBuiltAt: true, mvvLastBuiltFrom: true,
        mvvCoherenceScore: true, mvvCoherenceGaps: true, mvvValidatedAt: true,
      },
    })

    if (!profile) {
      return NextResponse.json({ maturity: "IMPLICIT", mission: null, vision: null, values: [] })
    }

    return NextResponse.json({
      maturity: profile.mvvMaturity,
      mission: profile.mission,
      missionDraft: profile.missionDraft,
      vision: profile.vision,
      visionDraft: profile.visionDraft,
      values: profile.values,
      valuesDraft: profile.valuesDraft,
      coherenceScore: profile.mvvCoherenceScore,
      coherenceGaps: profile.mvvCoherenceGaps,
      lastBuiltAt: profile.mvvLastBuiltAt,
      lastBuiltFrom: profile.mvvLastBuiltFrom,
      validatedAt: profile.mvvValidatedAt,
    })
  } catch (error) {
    console.error("[MVV GET]", error)
    return NextResponse.json({ message: "Eroare." }, { status: 500 })
  }
}

// POST — rebuild MVV
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const result = await rebuildMVV(session.user.tenantId)

    // MVV = cunoastere despre cum se defineste clientul — valoros universal
    try {
      const { learningFunnel } = await import("@/lib/agents/learning-funnel")
      const mvvSummary = [(result.missionValidated || result.missionDraft)?.slice(0, 100), (result.visionValidated || result.visionDraft)?.slice(0, 100)].filter(Boolean).join(" | ")
      if (mvvSummary.length > 20) {
        await learningFunnel({
          agentRole: "COCSA", type: "DECISION",
          input: `MVV rebuild pentru tenant ${session.user.tenantId}`,
          output: mvvSummary,
          success: true,
          metadata: { source: "mvv-builder", maturity: result.maturity },
        })
      }
    } catch {}

    return NextResponse.json(result)
  } catch (error) {
    console.error("[MVV REBUILD]", error)
    return NextResponse.json({ message: "Eroare la rebuild." }, { status: 500 })
  }
}

// PATCH — clientul validează MVV
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const { mission, vision, values } = await req.json()

    await prisma.companyProfile.update({
      where: { tenantId: session.user.tenantId },
      data: {
        mission: mission || undefined,
        vision: vision || undefined,
        values: values || undefined,
        mvvValidatedAt: new Date(),
        mvvMaturity: "COMPLETE",
      },
    })

    // Company Profiler: MVV validat = acțiune semnificativă majoră
    import("@/lib/company-profiler").then(m => m.onSignificantAction(session.user.tenantId)).catch(() => {})

    // Log în jurnal
    await prisma.creditTransaction.create({
      data: {
        tenantId: session.user.tenantId,
        type: "USAGE",
        amount: 0,
        description: "[MVV_VALIDATED] Misiune, viziune și valori validate de client",
      },
    }).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[MVV VALIDATE]", error)
    return NextResponse.json({ message: "Eroare." }, { status: 500 })
  }
}
