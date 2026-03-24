import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  tenantName: z.string().min(2).optional(),
  website: z.string().url().optional().or(z.literal("")),
  description: z.string().optional(),
  mission: z.string().optional(),
  vision: z.string().optional(),
  industry: z.string().optional(),
  size: z.string().optional(),
  cui: z.string().optional(),
  regCom: z.string().optional(),
  address: z.string().optional(),
  county: z.string().optional(),
})

export async function PUT(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const body = await req.json()
    const data = schema.parse(body)

    await prisma.$transaction(async (tx: any) => {
      if (data.tenantName) {
        await tx.tenant.update({
          where: { id: tenantId },
          data: { name: data.tenantName },
        })
      }

      await tx.companyProfile.upsert({
        where: { tenantId },
        update: {
          website: data.website || null,
          description: data.description || null,
          mission: data.mission || null,
          vision: data.vision || null,
          industry: data.industry || null,
          size: data.size || null,
          cui: data.cui || null,
          regCom: data.regCom || null,
          address: data.address || null,
          county: data.county || null,
        },
        create: {
          tenantId,
          website: data.website || null,
          description: data.description || null,
          mission: data.mission || null,
          vision: data.vision || null,
          industry: data.industry || null,
          size: data.size || null,
          cui: data.cui || null,
          regCom: data.regCom || null,
          address: data.address || null,
          county: data.county || null,
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[COMPANY PUT]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
