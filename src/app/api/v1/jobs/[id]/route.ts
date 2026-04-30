import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { JobStatus, JobStructureType } from "@/generated/prisma"

const schema = z.object({
  title: z.string().min(2).optional(),
  code: z.string().optional(),
  departmentId: z.string().optional().nullable(),
  representativeId: z.string().optional().nullable(),
  purpose: z.string().optional().nullable(),
  responsibilities: z.string().optional().nullable(),
  requirements: z.string().optional().nullable(),
  status: z.nativeEnum(JobStatus).optional(),
  structureType: z.nativeEnum(JobStructureType).optional(),
  aiAnalysis: z.any().optional(),
  aiAnalyzed: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const data = schema.parse(body)

    // Verifică că jobul aparține tenantului
    const existing = await prisma.job.findFirst({
      where: { id, tenantId: session.user.tenantId },
    })
    if (!existing) {
      return NextResponse.json({ message: "Nu a fost găsit." }, { status: 404 })
    }

    const job = await prisma.job.update({
      where: { id },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.code !== undefined && { code: data.code }),
        ...(data.departmentId !== undefined && {
          departmentId: data.departmentId,
        }),
        ...(data.representativeId !== undefined && {
          representativeId: data.representativeId,
        }),
        ...(data.purpose !== undefined && { purpose: data.purpose }),
        ...(data.responsibilities !== undefined && {
          responsibilities: data.responsibilities,
        }),
        ...(data.requirements !== undefined && {
          requirements: data.requirements,
        }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.structureType !== undefined && { structureType: data.structureType }),
        ...(data.aiAnalysis !== undefined && { aiAnalysis: data.aiAnalysis }),
        ...(data.aiAnalyzed !== undefined && { aiAnalyzed: data.aiAnalyzed }),
      },
    })

    return NextResponse.json({ id: job.id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[JOBS PATCH]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.job.findFirst({
      where: { id, tenantId: session.user.tenantId },
    })
    if (!existing) {
      return NextResponse.json({ message: "Nu a fost găsit." }, { status: 404 })
    }

    await prisma.job.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[JOBS DELETE]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
