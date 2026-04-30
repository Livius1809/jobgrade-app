/**
 * PATCH /api/v1/salary-grades/[id] — Actualizare grad salarial
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Neautorizat" }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const existing = await prisma.salaryGrade.findFirst({
    where: { id, tenantId: session.user.tenantId },
  })
  if (!existing) return NextResponse.json({ error: "Negăsit" }, { status: 404 })

  const updated = await prisma.salaryGrade.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.salaryMin !== undefined && { salaryMin: body.salaryMin }),
      ...(body.salaryMax !== undefined && { salaryMax: body.salaryMax }),
      ...(body.scoreMin !== undefined && { scoreMin: body.scoreMin }),
      ...(body.scoreMax !== undefined && { scoreMax: body.scoreMax }),
    },
  })

  return NextResponse.json({ id: updated.id })
}
