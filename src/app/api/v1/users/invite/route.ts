import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@/generated/prisma"
import { sendInviteEmail } from "@/lib/email"
import crypto from "crypto"

const schema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  role: z.nativeEnum(UserRole),
  jobTitle: z.string().optional(),
  departmentId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const body = await req.json()
    const data = schema.parse(body)

    // Verifică email unic în tenant
    const existing = await prisma.user.findFirst({
      where: { tenantId, email: data.email },
    })
    if (existing) {
      return NextResponse.json(
        { message: "Există deja un utilizator cu acest email în cont." },
        { status: 409 }
      )
    }

    // Generează token temporar pentru setare parolă
    const inviteToken = crypto.randomBytes(32).toString("hex")
    const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 zile

    // Obține datele companiei pentru email
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    })

    const inviter = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { firstName: true, lastName: true },
    })

    const user = await prisma.user.create({
      data: {
        tenantId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        jobTitle: data.jobTitle || null,
        departmentId: data.departmentId || null,
        role: data.role,
        status: "INVITED",
      },
    })

    // Salvează token-ul de invitație
    await prisma.verificationToken.create({
      data: {
        identifier: data.email,
        token: inviteToken,
        expires: inviteExpires,
      },
    })

    // Trimite email de invitație
    try {
      await sendInviteEmail({
        to: data.email,
        firstName: data.firstName,
        inviterName: inviter
          ? `${inviter.firstName} ${inviter.lastName}`
          : "Administratorul",
        companyName: tenant?.name ?? "organizație",
        token: inviteToken,
      })
    } catch (emailError) {
      // Email failure nu blochează crearea contului
      console.error("[INVITE EMAIL ERROR]", emailError)
    }

    return NextResponse.json(
      { id: user.id, message: "Invitație trimisă cu succes." },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[USERS INVITE]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
