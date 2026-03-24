import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  name: z.string().min(2),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const body = await req.json()
    const data = schema.parse(body)

    const dept = await prisma.department.create({
      data: {
        tenantId: session.user.tenantId,
        name: data.name,
      },
    })

    return NextResponse.json({ id: dept.id }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[DEPARTMENTS POST]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
