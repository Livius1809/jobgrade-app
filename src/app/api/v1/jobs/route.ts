import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { JobStatus } from "@/generated/prisma"

const schema = z.object({
  title: z.string().min(2),
  code: z.string().optional(),
  departmentId: z.string().optional(),
  representativeId: z.string().optional(),
  purpose: z.string().optional(),
  responsibilities: z.string().optional(),
  requirements: z.string().optional(),
  status: z.nativeEnum(JobStatus).default(JobStatus.DRAFT),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const body = await req.json()
    const data = schema.parse(body)

    const job = await prisma.job.create({
      data: {
        tenantId: session.user.tenantId,
        title: data.title,
        code: data.code || null,
        departmentId: data.departmentId || null,
        representativeId: data.representativeId || null,
        purpose: data.purpose || null,
        responsibilities: data.responsibilities || null,
        requirements: data.requirements || null,
        status: data.status,
      },
    })

    return NextResponse.json({ id: job.id }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[JOBS POST]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
