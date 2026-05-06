import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { extractB2CAuth, verifyB2COwnership } from "@/lib/security/b2c-auth"

export const dynamic = "force-dynamic"
export const maxDuration = 15

// ── GET /api/v1/b2c/communities/[id]/members?userId=... ─────────────────────

/**
 * Returnează membrii comunității — DOAR alias-uri, NICIODATĂ identitate reală.
 * Privacy by design: pseudonim + cod.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: communityId } = await params
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
    // Verifică membership propriu (trebuie să fii membru ca să vezi membrii)
    const myMembership = await p.b2CCommunityMember.findUnique({
      where: {
        communityId_userId: { communityId, userId },
      },
    })

    if (!myMembership) {
      return NextResponse.json(
        { error: "Nu ești membru al acestei comunități" },
        { status: 403 }
      )
    }

    // Membrii comunității — doar alias + rol
    const members = await p.b2CCommunityMember.findMany({
      where: { communityId },
      orderBy: { joinedAt: "asc" },
      select: {
        displayAlias: true,
        role: true,
        joinedAt: true,
        userId: true,
      },
    })

    const formattedMembers = members.map((m: any) => ({
      alias: m.displayAlias,
      role: m.role,
      joinedAt: m.joinedAt,
      isMe: m.userId === userId,
    }))

    return NextResponse.json({
      communityId,
      members: formattedMembers,
      total: formattedMembers.length,
    })
  } catch (e: any) {
    console.error("[B2C Community Members GET] Error:", e.message)
    return NextResponse.json(
      { error: "Eroare la încărcarea membrilor" },
      { status: 500 }
    )
  }
}
