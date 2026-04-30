import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { KpiFrequency } from "@/generated/prisma"

const schema = z.object({
  jobId: z.string(),
  kpis: z.array(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      targetValue: z.string(),
      measurementUnit: z.string(),
      frequency: z.nativeEnum(KpiFrequency),
      weight: z.number(),
    })
  ),
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

    // Verifică că jobul aparține tenantului
    const job = await prisma.job.findFirst({
      where: { id: data.jobId, tenantId },
    })
    if (!job) {
      return NextResponse.json({ message: "Jobul nu a fost găsit." }, { status: 404 })
    }

    // Creează KPI-urile
    await prisma.kpiDefinition.createMany({
      data: data.kpis.map((kpi) => ({
        tenantId,
        jobId: data.jobId,
        name: kpi.name,
        weight: kpi.weight,
        targetValue: parseFloat(kpi.targetValue) || 0,
        measurementUnit: kpi.measurementUnit,
        frequency: kpi.frequency,
      })),
    })

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[KPIS POST]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
