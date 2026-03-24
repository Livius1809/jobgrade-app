import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = schema.parse(body)

    // Find and validate token
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        token: data.token,
        expires: { gt: new Date() },
      },
    })

    if (!verificationToken) {
      return NextResponse.json(
        { message: "Link-ul de activare este invalid sau a expirat." },
        { status: 400 }
      )
    }

    // Find the invited user
    const user = await prisma.user.findFirst({
      where: {
        email: verificationToken.identifier,
        status: "INVITED",
      },
    })

    if (!user) {
      return NextResponse.json(
        { message: "Contul nu a fost găsit sau este deja activ." },
        { status: 404 }
      )
    }

    const passwordHash = await bcrypt.hash(data.password, 12)

    await prisma.$transaction([
      // Set password and activate user
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          status: "ACTIVE",
        },
      }),
      // Delete the used token
      prisma.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: verificationToken.identifier,
            token: verificationToken.token,
          },
        },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[AUTH ACTIVATE]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
