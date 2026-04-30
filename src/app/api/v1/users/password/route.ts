import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const body = await req.json()
    const data = schema.parse(body)

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })
    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { message: "Utilizator negăsit." },
        { status: 404 }
      )
    }

    const isValid = await bcrypt.compare(data.currentPassword, user.passwordHash)
    if (!isValid) {
      return NextResponse.json(
        { message: "Parola actuală este incorectă." },
        { status: 400 }
      )
    }

    const newHash = await bcrypt.hash(data.newPassword, 12)

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[PASSWORD PATCH]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
