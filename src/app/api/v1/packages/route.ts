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
  jobId: z.string(),
  baseSalary: z.number().positive(),
  currency: z.string().default("RON"),
  components: z.array(componentSchema).default([]),
  benefits: z.array(z.string()).default([]),
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

    const job = await prisma.job.findFirst({
      where: { id: data.jobId, tenantId },
    })
    if (!job) {
      return NextResponse.json({ message: "Jobul nu a fost găsit." }, { status: 404 })
    }

    const pkg = await prisma.compensationPackage.create({
      data: {
        tenantId,
        jobId: data.jobId,
        baseSalary: data.baseSalary,
        currency: data.currency,
        components: data.components,
        benefits: data.benefits,
      },
      include: {
        job: { select: { title: true, code: true } },
      },
    })

    return NextResponse.json(pkg, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[PACKAGES POST]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
