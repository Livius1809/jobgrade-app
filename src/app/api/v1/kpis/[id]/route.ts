import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const { id } = await params
    const tenantId = session.user.tenantId

    const existing = await prisma.kpiDefinition.findFirst({
      where: { id, tenantId },
    })
    if (!existing) {
      return NextResponse.json({ message: "KPI-ul nu a fost găsit." }, { status: 404 })
    }

    await prisma.kpiDefinition.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[KPI DELETE]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
