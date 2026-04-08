import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { extractB2CAuth, verifyB2COwnership } from "@/lib/security/b2c-auth"

export const maxDuration = 15

// ── Card metadata (ce vede clientul) ───────────────────────────────────────

const CARD_META: Record<string, { title: string; description: string; agent: string }> = {
  CARD_1: {
    title: "Drumul către mine",
    description: "Descoperă cine ești cu adevărat, dincolo de roluri și așteptări.",
    agent: "Călăuza",
  },
  CARD_2: {
    title: "Eu și ceilalți, adică NOI",
    description: "Înțelege cum funcționezi în relație cu ceilalți și construiește relații mai sănătoase.",
    agent: "Consilier Dezvoltare Personală",
  },
  CARD_3: {
    title: "Îmi asum un rol profesional",
    description: "Descoperă-ți valoarea profesională și găsește-ți locul potrivit.",
    agent: "Consilier Carieră",
  },
  CARD_4: {
    title: "Oameni de succes / Oameni de valoare",
    description: "Ce contează cu adevărat? Dincolo de realizări, descoperă ce te face valoros.",
    agent: "Coach",
  },
  CARD_5: {
    title: "Eu și antreprenoriatul transformațional",
    description: "Pune totul cap la cap într-un proiect care contează.",
    agent: "Coach",
  },
  CARD_6: {
    title: "Spune-mi despre mine",
    description: "Profilerul tău personal — te cunoaște din toate interacțiunile tale.",
    agent: "Profiler",
  },
}

// ── GET /api/v1/b2c/cards?userId=... ───────────────────────────────────────

/**
 * Returnează toate cardurile cu status, fază, metadata.
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
    const cards = await p.b2CCardProgress.findMany({
      where: { userId },
      orderBy: { card: "asc" },
    })

    if (!cards.length) {
      return NextResponse.json({ error: "Utilizator negăsit sau fără carduri" }, { status: 404 })
    }

    const result = cards.map((c: any) => ({
      card: c.card,
      ...CARD_META[c.card],
      status: c.status,
      phase: c.phase,
      stage: c.stage,
      communityReady: c.communityReady,
      activatedAt: c.activatedAt,
      completedAt: c.completedAt,
      hasQuestionnaire: !!c.questionnaireData,
      hasCv: !!c.cvFileUrl,
    }))

    return NextResponse.json({ cards: result })
  } catch (e: any) {
    console.error("[B2C Cards GET] Error:", e.message)
    return NextResponse.json({ error: "Eroare la încărcarea cardurilor" }, { status: 500 })
  }
}

// ── POST /api/v1/b2c/cards — activare card ─────────────────────────────────

/**
 * Activează un card (consumă credite dacă e plătit).
 * Card 3 și Card 6 sunt gratuite (activate la onboarding).
 *
 * Body: { userId: string, card: string }
 */
export async function POST(req: NextRequest) {
  const p = prisma as any

  try {
    const body = await req.json()
    const { userId, card } = body

    if (!userId || !card) {
      return NextResponse.json({ error: "userId și card sunt obligatorii" }, { status: 400 })
    }

    // B2C Auth
    const b2cAuth = extractB2CAuth(req)
    if (!b2cAuth || !verifyB2COwnership(b2cAuth, userId)) {
      return NextResponse.json({ error: "Autentificare B2C invalidă" }, { status: 401 })
    }

    // Verifică user
    const user = await p.b2CUser.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: "Utilizator negăsit" }, { status: 404 })
    }

    // Verifică cardul
    const progress = await p.b2CCardProgress.findUnique({
      where: { userId_card: { userId, card } },
    })

    if (!progress) {
      return NextResponse.json({ error: "Card negăsit" }, { status: 404 })
    }

    if (progress.status !== "LOCKED") {
      return NextResponse.json({ error: "Cardul e deja activ" }, { status: 409 })
    }

    // Card 3 și 6 sunt gratuite — celelalte costă credite
    const FREE_CARDS = ["CARD_3", "CARD_6"]
    const CARD_COST = 10 // credite per activare card plătit

    if (!FREE_CARDS.includes(card)) {
      // Verifică credite
      const balance = await p.b2CCreditBalance.findUnique({ where: { userId } })
      if (!balance || balance.balance < CARD_COST) {
        return NextResponse.json(
          { error: "Credite insuficiente", required: CARD_COST, available: balance?.balance || 0 },
          { status: 402 }
        )
      }

      // Consumă credite
      await p.b2CCreditBalance.update({
        where: { userId },
        data: { balance: { decrement: CARD_COST } },
      })

      await p.b2CCreditTransaction.create({
        data: {
          userId,
          type: "CARD_ACTIVATION",
          amount: -CARD_COST,
          description: `Activare ${CARD_META[card]?.title || card}`,
          card,
        },
      })
    }

    // Activează cardul
    const updated = await p.b2CCardProgress.update({
      where: { userId_card: { userId, card } },
      data: {
        status: "ACTIVE",
        activatedAt: new Date(),
      },
    })

    // Log evolutiv
    await p.b2CEvolutionEntry.create({
      data: {
        userId,
        card,
        type: "MILESTONE",
        title: `Card activat: ${CARD_META[card]?.title || card}`,
        phase: "CHRYSALIS",
        stage: 1,
        agentRole: CARD_META[card]?.agent === "Călăuza" ? "CALAUZA" : "PROFILER",
      },
    })

    return NextResponse.json({
      card: updated.card,
      status: updated.status,
      phase: updated.phase,
      activatedAt: updated.activatedAt,
    })
  } catch (e: any) {
    console.error("[B2C Cards POST] Error:", e.message)
    return NextResponse.json({ error: "Eroare la activarea cardului" }, { status: 500 })
  }
}

// ── PATCH /api/v1/b2c/cards — completare chestionar card ───────────────────

/**
 * Salvează răspunsurile la mini-chestionarul unui card.
 *
 * Body: { userId: string, card: string, questionnaireData: object }
 */
export async function PATCH(req: NextRequest) {
  const p = prisma as any

  try {
    const body = await req.json()
    const { userId, card, questionnaireData } = body

    if (!userId || !card || !questionnaireData) {
      return NextResponse.json({ error: "userId, card și questionnaireData sunt obligatorii" }, { status: 400 })
    }

    // B2C Auth
    const b2cAuth = extractB2CAuth(req)
    if (!b2cAuth || !verifyB2COwnership(b2cAuth, userId)) {
      return NextResponse.json({ error: "Autentificare B2C invalidă" }, { status: 401 })
    }

    const progress = await p.b2CCardProgress.findUnique({
      where: { userId_card: { userId, card } },
    })

    if (!progress || progress.status === "LOCKED") {
      return NextResponse.json({ error: "Cardul nu e activ" }, { status: 403 })
    }

    const updated = await p.b2CCardProgress.update({
      where: { userId_card: { userId, card } },
      data: { questionnaireData },
    })

    return NextResponse.json({
      card: updated.card,
      hasQuestionnaire: true,
    })
  } catch (e: any) {
    console.error("[B2C Cards PATCH] Error:", e.message)
    return NextResponse.json({ error: "Eroare la salvarea chestionarului" }, { status: 500 })
  }
}
