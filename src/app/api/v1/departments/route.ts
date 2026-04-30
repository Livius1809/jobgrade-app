import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authOrKey as auth } from "@/lib/auth-or-key"
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
    const tenantId = session.user.tenantId

    // Upsert: dacă există deja departamentul cu același nume, returnează-l
    const existing = await prisma.department.findFirst({
      where: { tenantId, name: data.name },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json({ id: existing.id }, { status: 200 })
    }

    const dept = await prisma.department.create({
      data: { tenantId, name: data.name },
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

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const departments = await prisma.department.findMany({
      where: { tenantId: session.user.tenantId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(departments)
  } catch (error) {
    console.error("[DEPARTMENTS GET]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
