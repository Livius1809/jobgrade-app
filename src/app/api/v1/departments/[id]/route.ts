import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  name: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const data = schema.parse(body)

    const existing = await prisma.department.findFirst({
      where: { id, tenantId: session.user.tenantId },
    })
    if (!existing) {
      return NextResponse.json({ message: "Nu a fost găsit." }, { status: 404 })
    }

    await prisma.department.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[DEPARTMENTS PATCH]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
