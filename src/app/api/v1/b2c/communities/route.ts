import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { extractB2CAuth, verifyB2COwnership } from "@/lib/security/b2c-auth"
import { checkPromptInjection, getInjectionBlockResponse } from "@/lib/security"

export const dynamic = "force-dynamic"
export const maxDuration = 15

// ── GET /api/v1/b2c/communities?userId=... — listare comunități accesibile ──

/**
 * Returnează comunitățile în care utilizatorul este membru.
 * Comunitățile sunt ÎNCHISE by default — accesul se acordă
 * doar când agentul AI setează communityReady=true pe card.
 */
export async function GET(req: NextRequest) {
  const p = prisma as any
  const userId = req.nextUrl.searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "userId e obligatoriu" }, { status: 400 })
  }

  const b2cAuth = extractB2CAuth(req)
  if (!b2cAuth || !verifyB2COwnership(b2cAuth, userId)) {
    return NextResponse.json({ error: "Autentificare B2C invalidă" }, { status: 401 })
  }

  try {
    // Comunități în care e deja membru
    const memberships = await p.b2CCommunityMember.findMany({
      where: { userId },
      include: {
        community: {
          select: {
            id: true,
            card: true,
            name: true,
            description: true,
            isActive: true,
            _count: { select: { members: true, messages: true } },
          },
        },
      },
    })

    const communities = memberships.map((m: any) => ({
      id: m.community.id,
      card: m.community.card,
      name: m.community.name,
      description: m.community.description,
      isActive: m.community.isActive,
      memberCount: m.community._count.members,
      messageCount: m.community._count.messages,
      myRole: m.role,
      joinedAt: m.joinedAt,
    }))

    return NextResponse.json({ communities })
  } catch (e: any) {
    console.error("[B2C Communities GET] Error:", e.message)
    return NextResponse.json(
      { error: "Eroare la încărcarea comunităților" },
      { status: 500 }
    )
  }
}

// ── POST /api/v1/b2c/communities — trimite mesaj în comunitate ──────────────

/**
 * Creează un mesaj într-o comunitate.
 * Autorul apare sub alias (pseudonim), nu identitate reală.
 *
 * Body: { userId: string, communityId: string, content: string }
 */
export async function POST(req: NextRequest) {
  const p = prisma as any

  try {
    const body = await req.json()
    const { userId, communityId, content } = body

    if (!userId || !communityId || !content?.trim()) {
      return NextResponse.json(
        { error: "userId, communityId și content sunt obligatorii" },
        { status: 400 }
      )
    }

    // B2C Auth
    const b2cAuth = extractB2CAuth(req)
    if (!b2cAuth || !verifyB2COwnership(b2cAuth, userId)) {
      return NextResponse.json({ error: "Autentificare B2C invalidă" }, { status: 401 })
    }

    // Prompt injection check
    const injectionCheck = checkPromptInjection(content)
    if (injectionCheck.blocked) {
      return NextResponse.json(
        { error: getInjectionBlockResponse() },
        { status: 400 }
      )
    }

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

    // Verifică comunitatea activă
    const community = await p.b2CCommunity.findUnique({
      where: { id: communityId },
      select: { isActive: true },
    })

    if (!community?.isActive) {
      return NextResponse.json(
        { error: "Comunitatea nu este activă" },
        { status: 403 }
      )
    }

    // Creează mesajul
    const message = await p.b2CCommunityMessage.create({
      data: {
        communityId,
        authorId: userId,
        content: content.trim(),
      },
    })

    // Rezolvă alias-ul autorului pentru răspuns
    const author = await p.b2CUser.findUnique({
      where: { id: userId },
      select: { alias: true },
    })

    return NextResponse.json({
      id: message.id,
      communityId: message.communityId,
      authorAlias: author?.alias || "Anonim",
      content: message.content,
      createdAt: message.createdAt,
    })
  } catch (e: any) {
    console.error("[B2C Communities POST] Error:", e.message)
    return NextResponse.json(
      { error: "Eroare la trimiterea mesajului" },
      { status: 500 }
    )
  }
}
