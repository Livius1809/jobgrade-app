import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const componentSchema = z.object({
  name: z.string(),
  type: z.enum(["percentage", "fixed"]),
  value: z.number(),
})

const schema = z.object({
  baseSalary: z.number().positive().optional(),
  currency: z.string().optional(),
  components: z.array(componentSchema).optional(),
  benefits: z.array(z.string()).optional(),
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
    const tenantId = session.user.tenantId
    const body = await req.json()
    const data = schema.parse(body)

    const existing = await prisma.compensationPackage.findFirst({
      where: { id, tenantId },
    })
    if (!existing) {
      return NextResponse.json({ message: "Pachetul nu a fost găsit." }, { status: 404 })
    }

    const updated = await prisma.compensationPackage.update({
      where: { id },
      data: {
        ...(data.baseSalary !== undefined && { baseSalary: data.baseSalary }),
        ...(data.currency !== undefined && { currency: data.currency }),
        ...(data.components !== undefined && { components: data.components }),
        ...(data.benefits !== undefined && { benefits: data.benefits }),
      },
      include: {
        job: { select: { title: true, code: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[PACKAGES PATCH]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}

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

    const existing = await prisma.compensationPackage.findFirst({
      where: { id, tenantId },
    })
    if (!existing) {
      return NextResponse.json({ message: "Pachetul nu a fost găsit." }, { status: 404 })
    }

    await prisma.compensationPackage.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[PACKAGES DELETE]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
