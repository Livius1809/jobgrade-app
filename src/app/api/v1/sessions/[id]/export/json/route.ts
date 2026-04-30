import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { deductCredits, hasCredits, CREDIT_COSTS } from "@/lib/credits"

const CREDIT_COST = CREDIT_COSTS.EXPORT_EXCEL // same cost as Excel

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const { id: sessionId } = await params
    const tenantId = session.user.tenantId

    const sufficient = await hasCredits(tenantId, CREDIT_COST)
    if (!sufficient) {
      return NextResponse.json(
        { message: `Credite insuficiente. Necesari: ${CREDIT_COST}.` },
        { status: 402 }
      )
    }

    const evalSession = await prisma.evaluationSession.findFirst({
      where: { id: sessionId, tenantId },
      include: {
        jobResults: {
          include: {
            job: {
              select: {
                title: true,
                code: true,
                purpose: true,
                department: { select: { name: true } },
              },
            },
            salaryGrade: {
              select: { name: true, scoreMin: true, scoreMax: true, salaryMin: true, salaryMax: true, currency: true },
            },
          },
          orderBy: { rank: "asc" },
        },
        salaryGrades: {
          orderBy: { order: "asc" },
        },
        participants: {
          include: {
            user: { select: { firstName: true, lastName: true, jobTitle: true } },
          },
        },
        consensusStatuses: {
          include: {
            criterion: { select: { name: true } },
            finalSubfactor: { select: { code: true, points: true, description: true } },
          },
        },
      },
    })

    if (!evalSession) {
      return NextResponse.json({ message: "Sesiunea nu a fost găsită." }, { status: 404 })
    }

    const company = await prisma.companyProfile.findUnique({
      where: { tenantId },
      select: { cui: true, description: true, industry: true },
    })

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, slug: true },
    })

    // Build JSON structure compliant with EU 2023/970 reporting standards
    const exportData = {
      meta: {
        exportedAt: new Date().toISOString(),
        exportVersion: "1.0",
        standard: "EU_2023_970_Art9",
        platform: "JobGrade",
        platformVersion: "1.0.0",
      },
      company: {
        name: tenant?.name ?? "",
        cui: company?.cui ?? "",
        industry: company?.industry ?? "",
        slug: tenant?.slug ?? "",
      },
      session: {
        id: evalSession.id,
        name: evalSession.name,
        status: evalSession.status,
        startedAt: evalSession.startedAt?.toISOString() ?? null,
        completedAt: evalSession.completedAt?.toISOString() ?? null,
        consensusThreshold: evalSession.consensusThreshold,
        evaluatorCount: evalSession.participants.length,
      },
      salaryGrades: evalSession.salaryGrades.map((sg) => ({
        id: sg.id,
        name: sg.name,
        order: sg.order,
        scoreRange: { min: sg.scoreMin, max: sg.scoreMax },
        salaryRange: {
          min: sg.salaryMin ?? null,
          max: sg.salaryMax ?? null,
          currency: sg.currency,
        },
      })),
      jobHierarchy: evalSession.jobResults.map((jr) => ({
        rank: jr.rank,
        jobCode: jr.job.code ?? null,
        jobTitle: jr.job.title,
        department: jr.job.department?.name ?? null,
        purpose: jr.job.purpose ?? null,
        scoring: {
          totalPoints: jr.totalScore,
          normalizedScore: jr.normalizedScore,
          maxPoints: 2800,
          percentile: parseFloat((jr.normalizedScore * 100).toFixed(1)),
        },
        salaryGrade: jr.salaryGrade
          ? {
              name: jr.salaryGrade.name,
              scoreRange: { min: jr.salaryGrade.scoreMin, max: jr.salaryGrade.scoreMax },
              salaryRange: {
                min: jr.salaryGrade.salaryMin ?? null,
                max: jr.salaryGrade.salaryMax ?? null,
                currency: jr.salaryGrade.currency,
              },
            }
          : null,
      })),
      evaluationCriteria: evalSession.consensusStatuses.reduce<
        Record<string, { criterion: string; finalSubfactor: string | null; points: number | null; status: string }[]>
      >((acc, cs) => {
        const jobId = cs.jobId
        if (!acc[jobId]) acc[jobId] = []
        acc[jobId].push({
          criterion: cs.criterion.name,
          finalSubfactor: cs.finalSubfactor?.code ?? null,
          points: cs.finalSubfactor?.points ?? null,
          status: cs.status,
        })
        return acc
      }, {}),
      evaluators: evalSession.participants.map((p) => ({
        name: `${p.user.firstName} ${p.user.lastName}`,
        role: p.user.jobTitle ?? null,
        completedAt: p.completedAt?.toISOString() ?? null,
      })),
    }

    await deductCredits(
      tenantId,
      CREDIT_COST,
      `Export JSON: ${evalSession.name}`,
      sessionId
    )

    // Export JSON EU = cunoaștere despre conformitate solicitată
    try {
      const { learnFromReport } = await import("@/lib/learning-hooks")
      await learnFromReport("EXPORT_JSON_EU", tenantId, `Export JSON EU2023/970: ${evalSession.name}`)
    } catch {}

    const filename = `${evalSession.name.replace(/[^a-zA-Z0-9]/g, "_")}_EU2023970.json`

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("[EXPORT JSON]", error)
    return NextResponse.json({ message: "Eroare la generarea exportului." }, { status: 500 })
  }
}
