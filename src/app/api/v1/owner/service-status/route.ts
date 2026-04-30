/**
 * GET /api/v1/owner/service-status — Status servicii C1-C4 pentru Owner Dashboard
 *
 * Returnează datele necesare pentru a calcula pipeline-urile C1-C4.
 * Aceleași date ca pe portal, agregate pentru vizualizare Owner.
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !["OWNER", "SUPER_ADMIN"].includes((session.user as any).role)) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 403 })
  }

  const tenantId = (session.user as any).tenantId
  const p = prisma as any

  const [
    jobCount, jobsWithDesc, departmentCount, latestSession, evaluatedJobs,
    employeeCount, salaryGradeCount, latestPayGap, resolvedJPA, complianceDocs,
    kpiCount, jobsWithKpi, benchmarkCount, sociogramCount, validatedSession,
  ] = await Promise.all([
    prisma.job.count({ where: { tenantId, status: "ACTIVE" } }),
    prisma.job.count({ where: { tenantId, status: "ACTIVE", purpose: { not: null } } }).catch(() => 0),
    prisma.department.count({ where: { tenantId, isActive: true } }).catch(() => 0),
    prisma.evaluationSession.findFirst({ where: { tenantId }, orderBy: { createdAt: "desc" }, select: { status: true } }).catch(() => null),
    prisma.jobResult.count({ where: { session: { tenantId } } }).catch(() => 0),
    p.employeeSalaryRecord?.count({ where: { tenantId } }).catch(() => 0),
    prisma.salaryGrade.count({ where: { tenantId } }).catch(() => 0),
    prisma.payGapReport.findFirst({ where: { tenantId }, orderBy: { reportYear: "desc" }, select: { reportYear: true } }).catch(() => null),
    p.jointPayAssessment?.findFirst({ where: { tenantId, status: "RESOLVED" } }).catch(() => null),
    p.systemConfig?.findMany({ where: { key: { startsWith: `TENANT_${tenantId}_COMPLIANCE_DOC_` } } }).catch(() => []),
    prisma.kpiDefinition.count({ where: { tenantId } }).catch(() => 0),
    prisma.kpiDefinition.groupBy({ by: ["jobId"], where: { tenantId } }).then((g: any[]) => g.length).catch(() => 0),
    p.salaryBenchmark?.count({ where: { country: "RO" } }).catch(() => 0),
    p.sociogramSession?.count({ where: { tenantId } }).catch(() => 0),
    prisma.evaluationSession.findFirst({ where: { tenantId, status: "VALIDATED" as any } }).catch(() => null),
  ])

  const profile = await prisma.companyProfile.findUnique({
    where: { tenantId },
    select: { mission: true, vision: true },
  }).catch(() => null)

  const isValidated = !!validatedSession
  const docs = (complianceDocs as any[]) || []

  return NextResponse.json({
    c1: {
      jobCount,
      jobsWithDescription: jobsWithDesc,
      statFunctiiExists: departmentCount >= 2,
      departmentCount,
      sessionCount: latestSession ? 1 : 0,
      sessionStatus: (latestSession as any)?.status || null,
      evaluatedJobCount: evaluatedJobs,
      rankedJobCount: evaluatedJobs,
      isValidated,
    },
    c2: {
      c1Complete: isValidated || evaluatedJobs > 0,
      jobCount,
      hasSalaryData: Number(employeeCount || 0) > 0,
      employeeCount: Number(employeeCount || 0),
      hasSalaryGrades: Number(salaryGradeCount || 0) > 0,
      salaryGradeCount: Number(salaryGradeCount || 0),
      hasPayGapReport: !!latestPayGap,
      payGapYear: (latestPayGap as any)?.reportYear || null,
      hasJointAssessment: !!resolvedJPA,
      complianceEventsTotal: 7,
      complianceOverdue: 0,
      complianceCompleted: 0,
      uploadedDocsCount: docs.length,
      hasROI: docs.some((d: any) => d.key?.includes("_ROI_")),
      hasCCM: docs.some((d: any) => d.key?.includes("_CCM_")),
    },
    c3: {
      c1c2Complete: isValidated && Number(salaryGradeCount || 0) > 0,
      jobCount,
      hasSalaryGrades: Number(salaryGradeCount || 0) > 0,
      kpiCount: Number(kpiCount || 0),
      jobsWithKpi: Number(jobsWithKpi || 0),
      hasBenchmarkData: Number(benchmarkCount || 0) > 0,
      hasVariableComp: false,
      evaluatedEmployees: 0,
      totalEmployees: Number(employeeCount || 0),
      hasPsychometricResults: false,
      hasSociogram: Number(sociogramCount || 0) > 0,
      teamCount: departmentCount,
      teamsWithSociogram: Number(sociogramCount || 0),
      hasMatchingActive: false,
      processMapCount: 0,
      hasQualityManual: false,
      sopCount: 0,
    },
    c4: {
      c1c2c3Complete: isValidated && Number(salaryGradeCount || 0) > 0,
      hasClimateResults: false,
      climateDimensionsScored: 0,
      hasAuditCultural: false,
      hasMVV: !!(profile?.mission || profile?.vision),
      has3CReport: false,
      hasROICulture: false,
      hasInterventionPlan: false,
      hasSimulations: false,
      hasMonitoring: false,
      pulseCount: 0,
      hasStrategicObjectives: false,
    },
  })
}
