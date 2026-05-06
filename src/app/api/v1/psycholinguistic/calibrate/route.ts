/**
 * POST /api/v1/psycholinguistic/calibrate
 *
 * Incarca profilul B2C (Herrmann + Hawkins) si returneaza CalibratedMessage.
 * Body: { userId: string }
 *
 * Auth: B2C token (utilizatorul isi calibreaza propria comunicare)
 *       sau internal key (agentii interni calibreaza comunicarea cu un client).
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { extractB2CAuth, verifyB2COwnership } from "@/lib/security/b2c-auth"
import {
  calibrateCommunication,
  buildPsycholinguisticPromptBlock,
  type CommunicationProfile,
} from "@/lib/engines/psycholinguistic-engine"

export const dynamic = "force-dynamic"
export const maxDuration = 15

export async function POST(req: NextRequest) {
  const p = prisma as any

  try {
    const body = await req.json().catch(() => ({}))
    const { userId } = body

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "userId e obligatoriu" },
        { status: 400 }
      )
    }

    // Auth: B2C token sau internal key
    const internalKey = req.headers.get("x-internal-key")
    const isInternalCall = internalKey === process.env.INTERNAL_API_KEY && !!internalKey

    if (!isInternalCall) {
      const b2cAuth = extractB2CAuth(req)
      if (!b2cAuth || !verifyB2COwnership(b2cAuth, userId)) {
        return NextResponse.json(
          { error: "Autentificare B2C invalida" },
          { status: 401 }
        )
      }
    }

    // Incarca user + profil
    const user = await p.b2CUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        locale: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: "Utilizator B2C inexistent" },
        { status: 404 }
      )
    }

    const profile = await p.b2CProfile.findUnique({
      where: { userId },
      select: {
        herrmannA: true,
        herrmannB: true,
        herrmannC: true,
        herrmannD: true,
        hawkinsEstimate: true,
      },
    })

    if (!profile) {
      return NextResponse.json(
        { error: "Profilul nu exista inca — necesita onboarding complet" },
        { status: 404 }
      )
    }

    // Daca nu avem scoruri Herrmann, returnam defaults
    const hasHerrmann =
      profile.herrmannA !== null &&
      profile.herrmannB !== null &&
      profile.herrmannC !== null &&
      profile.herrmannD !== null

    if (!hasHerrmann) {
      return NextResponse.json({
        calibrated: {
          tone: "empathetic" as const,
          vocabularyLevel: "moderate" as const,
          messageStyle:
            user.locale === "ro"
              ? "Profilul Herrmann nu este inca completat. Foloseste un ton cald, echilibrat, pana la calibrarea completa."
              : "Herrmann profile not yet completed. Use a warm, balanced tone until full calibration.",
          frustrationResponse:
            user.locale === "ro"
              ? "Inteleg. Hai sa vedem impreuna ce putem face."
              : "I understand. Let's see together what we can do.",
        },
        promptBlock: null,
        partial: true,
      })
    }

    const commProfile: CommunicationProfile = {
      herrmann: {
        A: profile.herrmannA,
        B: profile.herrmannB,
        C: profile.herrmannC,
        D: profile.herrmannD,
      },
      hawkinsEstimate: profile.hawkinsEstimate ?? undefined,
      preferredLanguage: (user.locale === "en" ? "en" : "ro") as "ro" | "en",
    }

    const calibrated = calibrateCommunication(commProfile)
    const promptBlock = buildPsycholinguisticPromptBlock(commProfile)

    return NextResponse.json({
      calibrated,
      promptBlock,
      partial: false,
    })
  } catch (e: any) {
    console.error("[Psycholinguistic Calibrate] Error:", e.message)
    return NextResponse.json(
      { error: "Eroare la calibrarea comunicarii" },
      { status: 500 }
    )
  }
}
