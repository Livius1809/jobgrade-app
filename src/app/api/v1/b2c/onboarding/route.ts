import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export const maxDuration = 30

/**
 * POST /api/v1/b2c/onboarding
 *
 * Pas 1-3 din flow-ul B2C:
 *   1. Clientul alege alias (pseudonim — "numele de crisalidă")
 *   2. Sistemul creează email alias@jobgrade.ro
 *   3. Se creează contul + formular minimal
 *
 * Body: { alias: string, age?: number, gender?: "MALE"|"FEMALE"|"OTHER", lastJobTitle?: string, hasCurrentJob?: boolean }
 * Returns: { userId, alias, email, cards[] }
 */
export async function POST(req: NextRequest) {
  const p = prisma as any

  try {
    const body = await req.json()
    const { alias, age, gender, lastJobTitle, hasCurrentJob } = body

    // Validare alias
    if (!alias || typeof alias !== "string" || alias.trim().length < 2) {
      return NextResponse.json(
        { error: "Aliasul trebuie să aibă minim 2 caractere" },
        { status: 400 }
      )
    }

    const cleanAlias = alias.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-_]/g, "")

    if (cleanAlias.length < 2) {
      return NextResponse.json(
        { error: "Aliasul poate conține doar litere, cifre și cratime" },
        { status: 400 }
      )
    }

    // Verifică dacă aliasul e luat
    const existing = await p.b2CUser.findUnique({ where: { alias: cleanAlias } })
    if (existing) {
      return NextResponse.json(
        { error: "Acest alias este deja folosit. Alege altul." },
        { status: 409 }
      )
    }

    // Generează email pe domeniu
    const email = `${cleanAlias}@jobgrade.ro`

    // Creează userul B2C
    const user = await p.b2CUser.create({
      data: {
        alias: cleanAlias,
        email,
        age: age ? parseInt(age, 10) : null,
        gender: gender || null,
        lastJobTitle: lastJobTitle || null,
        hasCurrentJob: hasCurrentJob ?? null,
        status: "ONBOARDING",
      },
    })

    // Creează profilul evolutiv gol
    await p.b2CProfile.create({
      data: {
        userId: user.id,
        viaSignature: [],
        viaUndeveloped: [],
      },
    })

    // Creează balanța de credite (0 inițial)
    await p.b2CCreditBalance.create({
      data: { userId: user.id, balance: 0 },
    })

    // Creează progresul pe toate cele 6 carduri
    // Card 3 (Carieră) și Card 6 (Profiler) = ACTIVE by default
    const cards = [
      { card: "CARD_1", status: "LOCKED" },
      { card: "CARD_2", status: "LOCKED" },
      { card: "CARD_3", status: "ACTIVE", activatedAt: new Date() },
      { card: "CARD_4", status: "LOCKED" },
      { card: "CARD_5", status: "LOCKED" },
      { card: "CARD_6", status: "ACTIVE", activatedAt: new Date() },
    ]

    const cardRecords = await Promise.all(
      cards.map((c) =>
        p.b2CCardProgress.create({
          data: {
            userId: user.id,
            card: c.card,
            status: c.status,
            activatedAt: (c as any).activatedAt || null,
          },
        })
      )
    )

    // Log prima intrare evolutivă
    await p.b2CEvolutionEntry.create({
      data: {
        userId: user.id,
        card: "CARD_6",
        type: "MILESTONE",
        title: "Bine ai venit în ecosistem",
        description: `${cleanAlias} a intrat în platformă`,
        phase: "CHRYSALIS",
        stage: 1,
        agentRole: "PROFILER",
      },
    })

    return NextResponse.json({
      userId: user.id,
      alias: cleanAlias,
      email,
      cards: cardRecords.map((c: any) => ({
        card: c.card,
        status: c.status,
        phase: c.phase,
      })),
    })
  } catch (e: any) {
    console.error("[B2C Onboarding] Error:", e.message)
    return NextResponse.json(
      { error: "Nu am putut crea contul", details: e.message },
      { status: 500 }
    )
  }
}
