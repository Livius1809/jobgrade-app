import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { slugify } from "@/lib/utils"
import { addCredits } from "@/lib/credits"
import { CreditTxnType, Plan } from "@/generated/prisma"

const schema = z.object({
  companyName: z.string().min(2),
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
})

const STARTER_CREDITS = 100

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = schema.parse(body)

    // Verifică email unic
    const existing = await prisma.user.findFirst({
      where: { email: data.email },
    })
    if (existing) {
      return NextResponse.json(
        { message: "Există deja un cont cu acest email." },
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(data.password, 12)
    const slug = slugify(data.companyName)

    // Verifică slug unic
    const slugExists = await prisma.tenant.findUnique({ where: { slug } })
    const finalSlug = slugExists ? `${slug}-${Date.now()}` : slug

    // Creează tenant + user + profil companie + credit balance
    const tenant = await prisma.$transaction(async (tx: any) => {
      const newTenant = await tx.tenant.create({
        data: {
          name: data.companyName,
          slug: finalSlug,
          plan: Plan.STARTER,
        },
      })

      await tx.user.create({
        data: {
          tenantId: newTenant.id,
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: "COMPANY_ADMIN",
          status: "ACTIVE",
        },
      })

      await tx.companyProfile.create({
        data: {
          tenantId: newTenant.id,
        },
      })

      await tx.creditBalance.create({
        data: {
          tenantId: newTenant.id,
          balance: STARTER_CREDITS,
        },
      })

      await tx.creditTransaction.create({
        data: {
          tenantId: newTenant.id,
          type: CreditTxnType.SUBSCRIPTION_MONTHLY,
          amount: STARTER_CREDITS,
          description: `${STARTER_CREDITS} credite incluse în planul Starter`,
        },
      })

      return newTenant
    })

    return NextResponse.json(
      { message: "Cont creat cu succes.", tenantId: tenant.id },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[REGISTER]", error)
    return NextResponse.json(
      { message: "A apărut o eroare internă." },
      { status: 500 }
    )
  }
}
