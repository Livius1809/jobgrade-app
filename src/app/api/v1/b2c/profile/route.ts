import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { extractB2CAuth, verifyB2COwnership } from "@/lib/security/b2c-auth"

export const maxDuration = 15

// ── Traducere pentru client (zero jargon tehnic) ───────────────────────────

function translatePhase(phase: string): string {
  switch (phase) {
    case "CHRYSALIS": return "Înainte să știi"
    case "BUTTERFLY": return "Ai văzut ce te ținea pe loc"
    case "FLIGHT": return "Mergi conștient spre unde vrei"
    case "LEAP": return "Ești gata pentru mai mult"
    default: return phase
  }
}

function translateStage(stage: number): string {
  switch (stage) {
    case 1: return "Începutul drumului"
    case 2: return "Ai văzut ce nu știai"
    case 3: return "Aplici conștient"
    case 4: return "A devenit firesc"
    default: return `Etapa ${stage}`
  }
}

// ── GET /api/v1/b2c/profile?userId=... ─────────────────────────────────────

/**
 * Returnează profilul evolutiv al clientului — tradus în limbaj uman.
 * Clientul vede propria evoluție, NU scoruri tehnice.
 */
export async function GET(req: NextRequest) {
  const p = prisma as any
  const userId = req.nextUrl.searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "userId e obligatoriu" }, { status: 400 })
  }

  // B2C Auth
  const b2cAuth = extractB2CAuth(req)
  if (!b2cAuth || !verifyB2COwnership(b2cAuth, userId)) {
    return NextResponse.json({ error: "Autentificare B2C invalidă" }, { status: 401 })
  }

  try {
    const user = await p.b2CUser.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        cards: { orderBy: { card: "asc" } },
        evolutionLog: { orderBy: { createdAt: "desc" }, take: 20 },
        testResults: {
          orderBy: { administeredAt: "desc" },
          select: { testType: true, testName: true, administeredAt: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Utilizator negăsit" }, { status: 404 })
    }

    const profile = user.profile

    // Profil tradus pentru client (zero jargon)
    const clientProfile = {
      alias: user.alias,
      // Spirala globală
      evolution: {
        phase: translatePhase(profile?.spiralLevel === 1 ? "CHRYSALIS" : profile?.spiralLevel === 2 ? "BUTTERFLY" : profile?.spiralLevel === 3 ? "FLIGHT" : "LEAP"),
        stage: translateStage(profile?.spiralStage || 1),
        level: profile?.spiralLevel || 1,
      },
      // Carduri cu progres
      cards: user.cards.map((c: any) => ({
        card: c.card,
        status: c.status,
        phase: translatePhase(c.phase),
        stage: translateStage(c.stage),
        communityReady: c.communityReady,
      })),
      // Traseul (vizibil clientului)
      journey: user.evolutionLog.map((e: any) => ({
        title: e.title,
        phase: translatePhase(e.phase),
        card: e.card,
        type: e.type,
        date: e.createdAt,
      })),
      // Teste parcurse (doar numele, nu scoruri)
      testsCompleted: user.testResults.map((t: any) => ({
        name: t.testName,
        date: t.administeredAt,
      })),
      // Strengths (traduse — doar dacă există)
      strengths: profile?.viaSignature?.length
        ? profile.viaSignature
        : [],
    }

    return NextResponse.json({ profile: clientProfile })
  } catch (e: any) {
    console.error("[B2C Profile GET] Error:", e.message)
    return NextResponse.json({ error: "Eroare la încărcarea profilului" }, { status: 500 })
  }
}

// ── GET /api/v1/b2c/profile/internal?userId=... ────────────────────────────
// Profil INTERN — pentru agenți, cu toate datele tehnice.
// NU se expune clientului.

export async function POST(req: NextRequest) {
  const p = prisma as any

  try {
    const body = await req.json()
    const { userId, agentRole } = body

    if (!userId || !agentRole) {
      return NextResponse.json({ error: "userId și agentRole sunt obligatorii" }, { status: 400 })
    }

    const user = await p.b2CUser.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        cards: true,
        testResults: { orderBy: { administeredAt: "desc" } },
        evolutionLog: { orderBy: { createdAt: "desc" }, take: 30 },
        sessions: { orderBy: { startedAt: "desc" }, take: 10 },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "Utilizator negăsit" }, { status: 404 })
    }

    // Profil complet intern — toate datele tehnice pentru agent
    return NextResponse.json({
      user: {
        id: user.id,
        alias: user.alias,
        age: user.age,
        gender: user.gender,
        lastJobTitle: user.lastJobTitle,
        hasCurrentJob: user.hasCurrentJob,
        status: user.status,
      },
      profile: user.profile,
      cards: user.cards,
      testResults: user.testResults,
      evolutionLog: user.evolutionLog,
      sessions: user.sessions,
      requestedBy: agentRole,
    })
  } catch (e: any) {
    console.error("[B2C Profile Internal] Error:", e.message)
    return NextResponse.json({ error: "Eroare la încărcarea profilului intern" }, { status: 500 })
  }
}
