import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deductCredits, hasCredits, CREDIT_COSTS } from "@/lib/credits"

const CREDIT_COST = CREDIT_COSTS.EXPORT_EXCEL

function escapeXml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

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
              select: {
                name: true,
                scoreMin: true,
                scoreMax: true,
                salaryMin: true,
                salaryMax: true,
                currency: true,
              },
            },
          },
          orderBy: { rank: "asc" },
        },
        salaryGrades: { orderBy: { order: "asc" } },
        participants: { select: { completedAt: true } },
      },
    })

    if (!evalSession) {
      return NextResponse.json({ message: "Sesiunea nu a fost găsită." }, { status: 404 })
    }

    const company = await prisma.companyProfile.findUnique({
      where: { tenantId },
      select: { cui: true, industry: true },
    })

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    })

    const now = new Date().toISOString()

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- JobGrade Export — EU Directive 2023/970 Art. 9 Compliance -->
<JobGradeReport xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  exportedAt="${escapeXml(now)}"
  standard="EU_2023_970_Art9"
  version="1.0">

  <Company>
    <Name>${escapeXml(tenant?.name)}</Name>
    <CUI>${escapeXml(company?.cui)}</CUI>
    <Industry>${escapeXml(company?.industry)}</Industry>
  </Company>

  <EvaluationSession
    id="${escapeXml(evalSession.id)}"
    status="${escapeXml(evalSession.status)}"
    completedAt="${escapeXml(evalSession.completedAt?.toISOString())}">
    <Name>${escapeXml(evalSession.name)}</Name>
    <ConsensusThreshold>${evalSession.consensusThreshold}</ConsensusThreshold>
    <EvaluatorCount>${evalSession.participants?.length ?? 0}</EvaluatorCount>
  </EvaluationSession>

  <SalaryGrades>
${evalSession.salaryGrades
  .map(
    (sg) => `    <Grade order="${sg.order}" id="${escapeXml(sg.id)}">
      <Name>${escapeXml(sg.name)}</Name>
      <ScoreMin>${sg.scoreMin}</ScoreMin>
      <ScoreMax>${sg.scoreMax}</ScoreMax>
      <SalaryMin currency="${escapeXml(sg.currency)}">${sg.salaryMin ?? ""}</SalaryMin>
      <SalaryMax currency="${escapeXml(sg.currency)}">${sg.salaryMax ?? ""}</SalaryMax>
    </Grade>`
  )
  .join("\n")}
  </SalaryGrades>

  <JobHierarchy>
${evalSession.jobResults
  .map(
    (jr) => `    <Job rank="${jr.rank}">
      <Code>${escapeXml(jr.job.code)}</Code>
      <Title>${escapeXml(jr.job.title)}</Title>
      <Department>${escapeXml(jr.job.department?.name)}</Department>
      <Purpose>${escapeXml(jr.job.purpose)}</Purpose>
      <TotalScore>${jr.totalScore}</TotalScore>
      <NormalizedScore>${jr.normalizedScore.toFixed(2)}</NormalizedScore>
      <MaxScore>2800</MaxScore>
      <Percentile>${(jr.normalizedScore * 100).toFixed(1)}</Percentile>
      ${
        jr.salaryGrade
          ? `<SalaryGrade>
        <Name>${escapeXml(jr.salaryGrade.name)}</Name>
        <ScoreMin>${jr.salaryGrade.scoreMin}</ScoreMin>
        <ScoreMax>${jr.salaryGrade.scoreMax}</ScoreMax>
        <SalaryMin currency="${escapeXml(jr.salaryGrade.currency)}">${jr.salaryGrade.salaryMin ?? ""}</SalaryMin>
        <SalaryMax currency="${escapeXml(jr.salaryGrade.currency)}">${jr.salaryGrade.salaryMax ?? ""}</SalaryMax>
      </SalaryGrade>`
          : "<SalaryGrade />"
      }
    </Job>`
  )
  .join("\n")}
  </JobHierarchy>

</JobGradeReport>
`

    await deductCredits(
      tenantId,
      CREDIT_COST,
      `Export XML: ${evalSession.name}`,
      sessionId
    )

    // Export XML EU = cunoaștere despre conformitate solicitată
    try {
      const { learnFromReport } = await import("@/lib/learning-hooks")
      await learnFromReport("EXPORT_XML_EU", tenantId, `Export XML EU2023/970: ${evalSession.name}`)
    } catch {}

    const filename = `${evalSession.name.replace(/[^a-zA-Z0-9]/g, "_")}_EU2023970.xml`

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("[EXPORT XML]", error)
    return NextResponse.json({ message: "Eroare la generarea exportului." }, { status: 500 })
  }
}
