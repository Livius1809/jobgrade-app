import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { sendPasswordResetEmail } from "@/lib/email"

const schema = z.object({
  email: z.string().email(),
})

/**
 * POST /api/v1/auth/forgot-password
 * Generates a password reset token and sends email.
 * Always returns 200 to avoid revealing whether the email exists.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email } = schema.parse(body)

    // Find user by email (across all tenants — email alone is sufficient for reset)
    const user = await prisma.user.findFirst({
      where: { email, status: "ACTIVE" },
      select: { id: true, firstName: true, email: true },
    })

    if (user) {
      // Generate a secure token
      const rawToken = crypto.randomUUID()
      const hashedToken = crypto
        .createHash("sha256")
        .update(rawToken)
        .digest("hex")

      const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      // Remove any existing reset tokens for this email
      await prisma.verificationToken.deleteMany({
        where: { identifier: `reset:${email}` },
      })

      // Store hashed token in VerificationToken table
      await prisma.verificationToken.create({
        data: {
          identifier: `reset:${email}`,
          token: hashedToken,
          expires,
        },
      })

      // Send email with the raw (unhashed) token
      try {
        await sendPasswordResetEmail({
          to: email,
          firstName: user.firstName,
          token: rawToken,
        })
      } catch (emailError) {
        console.error("[FORGOT-PASSWORD EMAIL ERROR]", emailError)
      }
    }

    // Always return 200 regardless of whether user was found
    return NextResponse.json({
      message:
        "Dacă adresa de email există în sistem, vei primi un link de resetare.",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Email invalid.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[FORGOT-PASSWORD]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
