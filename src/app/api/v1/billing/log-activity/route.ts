import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const { type, description, jobId, credits } = await req.json()

    await prisma.creditTransaction.create({
      data: {
        tenantId: session.user.tenantId,
        type: "USAGE",
        amount: credits ? -Math.abs(credits) : 0,
        description: `[${type}] ${description || ""}`,
        sourceId: jobId || null,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[LOG-ACTIVITY]", error)
    return NextResponse.json({ message: "Eroare." }, { status: 500 })
  }
}
