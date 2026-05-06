/**
 * /api/v1/reports/vacancy-cost
 *
 * POST — Raport cost pozitie vacanta
 * Calculeaza: cost direct (salariu economisit), cost indirect (overtime,
 * recrutare, onboarding ~3 luni salariu), pierdere productivitate estimata.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const vacancyCostSchema = z.object({
  jobId: z.string().min(1),
})

interface VacancyCostBreakdown {
  jobId: string
  jobTitle: string
  department: string | null
  baseSalary: number
  currency: string
  directCost: {
    monthlySalarySaved: number
    description: string
  }
  indirectCost: {
    overtimeEstimate: number
    recruitmentCost: number
    onboardingCost: number
    total: number
    description: string
  }
  productivityLoss: {
    estimatedMonthlyLoss: number
    rampUpMonths: number
    totalLossDuringRampUp: number
    description: string
  }
  totalVacancyCostPerMonth: number
  summary: string
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const body = await req.json()
    const data = vacancyCostSchema.parse(body)

    // Load job
    const job = await prisma.job.findFirst({
      where: { id: data.jobId, tenantId },
      include: {
        department: { select: { id: true, name: true } },
        compensationPackages: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!job) {
      return NextResponse.json(
        { message: "Jobul nu a fost gasit." },
        { status: 404 },
      )
    }

    // Determine base salary
    const pkg = job.compensationPackages[0] ?? null
    const baseSalary = pkg?.baseSalary ?? 0
    const currency = pkg?.currency ?? "RON"

    // Count employees in same department for overtime distribution
    let deptEmployeeCount = 1
    if (job.departmentId) {
      deptEmployeeCount = await prisma.user.count({
        where: { tenantId, departmentId: job.departmentId },
      })
    }

    // ── Calculations ──────────────────────────────────────────────────

    // Direct cost: salary saved while position is vacant
    const monthlySalarySaved = baseSalary

    // Indirect costs
    // Overtime estimate: remaining team members absorb ~30% of workload
    const overtimeRate = 0.3
    const overtimePerPerson =
      deptEmployeeCount > 0
        ? (baseSalary * overtimeRate) / Math.max(deptEmployeeCount - 1, 1)
        : 0
    const overtimeEstimate = overtimePerPerson * Math.max(deptEmployeeCount - 1, 1)

    // Recruitment cost: ~50-100% of annual salary; we use 75% / 12 as monthly amortized
    const recruitmentCost = (baseSalary * 12 * 0.75) / 12

    // Onboarding cost: ~3 months salary for new hire to reach full productivity
    const rampUpMonths = 3
    const onboardingCost = baseSalary * rampUpMonths

    const indirectTotal = overtimeEstimate + recruitmentCost + onboardingCost

    // Productivity loss: estimated at 40% of salary value per month
    const productivityLossRate = 0.4
    const estimatedMonthlyLoss = baseSalary * productivityLossRate
    const totalLossDuringRampUp = estimatedMonthlyLoss * rampUpMonths

    // Total per month while vacant
    const totalVacancyCostPerMonth =
      monthlySalarySaved + indirectTotal + estimatedMonthlyLoss

    const report: VacancyCostBreakdown = {
      jobId: job.id,
      jobTitle: job.title,
      department: job.department?.name ?? null,
      baseSalary,
      currency,
      directCost: {
        monthlySalarySaved,
        description:
          "Salariul economisit lunar cat pozitia ramane vacanta.",
      },
      indirectCost: {
        overtimeEstimate,
        recruitmentCost,
        onboardingCost,
        total: indirectTotal,
        description:
          "Costuri distribuite: overtime echipa, recrutare (~75% salariu anual amortizat), onboarding (~3 luni salariu).",
      },
      productivityLoss: {
        estimatedMonthlyLoss,
        rampUpMonths,
        totalLossDuringRampUp,
        description:
          "Pierdere estimata de productivitate (~40% din valoarea salariului/luna) pe durata ramp-up.",
      },
      totalVacancyCostPerMonth,
      summary: baseSalary > 0
        ? `Costul total estimat al vacantei pentru "${job.title}" este ${Math.round(totalVacancyCostPerMonth)} ${currency}/luna. Recomandam ocuparea in maxim 30 de zile.`
        : `Nu exista pachet salarial definit pentru "${job.title}". Definiti un pachet de compensare pentru un raport complet.`,
    }

    return NextResponse.json(report)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 },
      )
    }
    console.error("[VACANCY-COST POST]", error)
    return NextResponse.json({ message: "Eroare interna." }, { status: 500 })
  }
}
