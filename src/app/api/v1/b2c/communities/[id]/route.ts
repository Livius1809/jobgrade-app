import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { extractB2CAuth, verifyB2COwnership } from "@/lib/security/b2c-auth"

export const dynamic = "force-dynamic"
export const maxDuration = 15

// ── GET /api/v1/b2c/communities/[id]?userId=...&cursor=...&limit=... ────────

/**
 * Detalii comunitate + mesaje paginate (cele mai recente primele).
 * Mesajele afișează alias, NU identitate reală (GDPR pseudonim).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: communityId } = await params
  const p = prisma as any
  const userId = req.nextUrl.searchParams.get("userId")
  const cursor = req.nextUrl.searchParams.get("cursor")
  const limit = Math.min(50, parseInt(req.nextUrl.searchParams.get("limit") || "30", 10))

  if (!userId) {
    return NextResponse.json({ error: "userId e obligatoriu" }, { status: 400 })
  }

  const b2cAuth = extractB2CAuth(req)
  if (!b2cAuth || !verifyB2COwnership(b2cAuth, userId)) {
    return NextResponse.json({ error: "Autentificare B2C invalidă" }, { status: 401 })
  }

  try {
    // Verifică membership
    const membership = await p.b2CCommunityMember.findUnique({
      where: {
        communityId_userId: { communityId, userId },
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: "Nu ești membru al acestei comunități" },
        { status: 403 }
      )
    }

    // Community details
    const community = await p.b2CCommunity.findUnique({
      where: { id: communityId },
      select: {
        id: true,
        card: true,
        name: true,
        description: true,
        isActive: true,
        _count: { select: { members: true, messages: true } },
      },
    })

    if (!community) {
      return NextResponse.json({ error: "Comunitate negăsită" }, { status: 404 })
    }

    // Messages with cursor pagination
    const whereClause: any = { communityId }
    if (cursor) {
      whereClause.createdAt = { lt: new Date(cursor) }
    }

    const messages = await p.b2CCommunityMessage.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit + 1, // +1 to detect hasMore
    })

    const hasMore = messages.length > limit
    const page = hasMore ? messages.slice(0, limit) : messages

    // Rezolvă alias-uri pentru autori (batch)
    const authorIds = [...new Set(page.map((m: any) => m.authorId))]
    const authors = await p.b2CUser.findMany({
      where: { id: { in: authorIds } },
      select: { id: true, alias: true },
    })
    const aliasMap = new Map(authors.map((a: any) => [a.id, a.alias]))

    const formattedMessages = page.map((m: any) => ({
      id: m.id,
      authorAlias: aliasMap.get(m.authorId) || "Anonim",
      isMe: m.authorId === userId,
      content: m.content,
      createdAt: m.createdAt,
    }))

    return NextResponse.json({
      community: {
        id: community.id,
        card: community.card,
        name: community.name,
        description: community.description,
        isActive: community.isActive,
        memberCount: community._count.members,
        messageCount: community._count.messages,
      },
      messages: formattedMessages,
      hasMore,
      nextCursor: hasMore ? page[page.length - 1].createdAt.toISOString() : null,
    })
  } catch (e: any) {
    console.error("[B2C Community Detail GET] Error:", e.message)
    return NextResponse.json(
      { error: "Eroare la încărcarea comunității" },
      { status: 500 }
    )
  }
}

// ── POST /api/v1/b2c/communities/[id] — join community ─────────────────────

/**
 * Solicită accesul la comunitate.
 * REGULA: comunitatea e ÎNCHISĂ by default.
 * Accesul se acordă DOAR dacă communityReady=true pe cardul corespunzător.
 *
 * Body: { userId: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: communityId } = await params
  const p = prisma as any

  try {
    const body = await req.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: "userId e obligatoriu" }, { status: 400 })
    }

    const b2cAuth = extractB2CAuth(req)
    if (!b2cAuth || !verifyB2COwnership(b2cAuth, userId)) {
      return NextResponse.json({ error: "Autentificare B2C invalidă" }, { status: 401 })
    }

    // Verifică comunitatea
    const community = await p.b2CCommunity.findUnique({
      where: { id: communityId },
      select: { id: true, card: true, isActive: true },
    })

    if (!community) {
      return NextResponse.json({ error: "Comunitate negăsită" }, { status: 404 })
    }

    if (!community.isActive) {
      return NextResponse.json(
        { error: "Comunitatea nu este activă momentan" },
        { status: 403 }
      )
    }

    // Verifică dacă e deja membru
    const existing = await p.b2CCommunityMember.findUnique({
      where: {
        communityId_userId: { communityId, userId },
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Ești deja membru al acestei comunități" },
        { status: 409 }
      )
    }

    // REGULA CRITICĂ: comunitate ÎNCHISĂ by default.
    // Verifică communityReady pe cardul corespunzător.
    const cardProgress = await p.b2CCardProgress.findFirst({
      where: {
        userId,
        card: community.card,
      },
      select: {
        status: true,
        communityReady: true,
      },
    })

    if (!cardProgress || cardProgress.status === "LOCKED") {
      return NextResponse.json(
        { error: "Cardul corespunzător nu este activ" },
        { status: 403 }
      )
    }

    if (!cardProgress.communityReady) {
      return NextResponse.json(
        {
          error: "Accesul la comunitate nu a fost activat încă",
          hint: "Continuă interacțiunile pe acest card. Agentul AI va activa accesul când ești pregătit.",
        },
        { status: 403 }
      )
    }

    // Creează membership
    const member = await p.b2CCommunityMember.create({
      data: {
        communityId,
        userId,
        displayAlias: b2cAuth.alias,
        grantedBy: "SYSTEM",
        grantReason: "communityReady=true, acces automat",
        role: "MEMBER",
      },
    })

    // Log evolutiv
    await p.b2CEvolutionEntry.create({
      data: {
        userId,
        card: community.card,
        type: "MILESTONE",
        title: `A intrat în comunitate: ${community.card}`,
        phase: "CHRYSALIS",
        stage: 1,
        agentRole: "PROFILER",
        metadata: { communityId, role: "MEMBER" },
      },
    })

    return NextResponse.json({
      joined: true,
      communityId,
      role: member.role,
      displayAlias: member.displayAlias,
      joinedAt: member.joinedAt,
    })
  } catch (e: any) {
    console.error("[B2C Community Join POST] Error:", e.message)
    return NextResponse.json(
      { error: "Eroare la înscrierea în comunitate" },
      { status: 500 }
    )
  }
}
