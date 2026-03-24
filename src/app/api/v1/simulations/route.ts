import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  jobId: z.string(),
  packageId: z.string(),
  name: z.string().min(1),
  // kpiAchievements: { [kpiId]: achievedPercentage (0-200) }
  kpiAchievements: z.record(z.string(), z.number().min(0).max(200)),
})

interface PackageComponent {
  name: string
  type: "percentage" | "fixed"
  value: number
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const body = await req.json()
    const data = schema.parse(body)

    // Verify package belongs to this job and tenant
    const pkg = await prisma.compensationPackage.findFirst({
      where: { id: data.packageId, jobId: data.jobId, tenantId },
    })
    if (!pkg) {
      return NextResponse.json({ message: "Pachetul nu a fost găsit." }, { status: 404 })
    }

    // Fetch KPIs for the job
    const kpis = await prisma.kpiDefinition.findMany({
      where: { jobId: data.jobId, tenantId },
    })

    // Calculate weighted KPI achievement
    const totalWeight = kpis.reduce((sum, k) => sum + k.weight, 0)
    let weightedAchievement = 0
    for (const kpi of kpis) {
      const achieved = data.kpiAchievements[kpi.id] ?? 100
      const normalizedWeight = totalWeight > 0 ? kpi.weight / totalWeight : 0
      weightedAchievement += achieved * normalizedWeight
    }
    const performanceFactor = weightedAchievement / 100 // e.g., 1.0 = 100%

    // Calculate variable components
    const components = pkg.components as unknown as PackageComponent[]
    let variableTotal = 0
    const componentBreakdown = components.map((c) => {
      let calculatedValue = 0
      if (c.type === "percentage") {
        calculatedValue = (pkg.baseSalary * c.value) / 100 * performanceFactor
      } else {
        calculatedValue = c.value // fixed components are not performance-affected
      }
      variableTotal += calculatedValue
      return {
        name: c.name,
        type: c.type,
        baseValue: c.value,
        calculatedValue: Math.round(calculatedValue),
      }
    })

    const totalCompensation = pkg.baseSalary + variableTotal
    const calculatedResult = {
      baseSalary: pkg.baseSalary,
      currency: pkg.currency,
      performanceFactor: Math.round(performanceFactor * 100) / 100,
      weightedAchievement: Math.round(weightedAchievement * 10) / 10,
      componentBreakdown,
      variableTotal: Math.round(variableTotal),
      totalCompensation: Math.round(totalCompensation),
    }

    const simulation = await prisma.simulationScenario.create({
      data: {
        tenantId,
        jobId: data.jobId,
        packageId: data.packageId,
        name: data.name,
        kpiAchievements: data.kpiAchievements,
        calculatedResult,
        createdBy: session.user.id,
      },
    })

    return NextResponse.json({ ...simulation, calculatedResult }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[SIMULATIONS POST]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
