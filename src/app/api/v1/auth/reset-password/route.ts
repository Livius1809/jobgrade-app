import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import crypto from "crypto"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
})

/**
 * POST /api/v1/auth/reset-password
 * Validates the reset token and updates the user's password.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, newPassword } = schema.parse(body)

    // Hash the incoming token to compare with stored hash
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex")

    // Find the verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token: hashedToken },
    })

    if (!verificationToken) {
      return NextResponse.json(
        { message: "Token invalid sau expirat." },
        { status: 400 }
      )
    }

    // Check expiry
    if (verificationToken.expires < new Date()) {
      // Clean up expired token
      await prisma.verificationToken.delete({
        where: { token: hashedToken },
      })
      return NextResponse.json(
        { message: "Token expirat. Solicită un nou link de resetare." },
        { status: 400 }
      )
    }

    // Extract email from identifier (format: "reset:email@example.com")
    const email = verificationToken.identifier.replace(/^reset:/, "")

    // Find user
    const user = await prisma.user.findFirst({
      where: { email, status: "ACTIVE" },
    })

    if (!user) {
      return NextResponse.json(
        { message: "Utilizator negăsit." },
        { status: 400 }
      )
    }

    // Hash new password and update
    const passwordHash = await bcrypt.hash(newPassword, 12)

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    })

    // Delete the used token
    await prisma.verificationToken.delete({
      where: { token: hashedToken },
    })

    return NextResponse.json({
      message: "Parola a fost resetată cu succes.",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[RESET-PASSWORD]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
