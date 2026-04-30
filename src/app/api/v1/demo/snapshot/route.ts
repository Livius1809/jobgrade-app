/**
 * GET /api/v1/demo/snapshot
 *
 * Generează un snapshot demo anonimizat din datele reale JG_itself.
 * Folosit pentru: prezentări, demo clienți, sandbox, materiale marketing.
 *
 * Query params:
 *   ?seed=abc     — seed pentru randomizare deterministă
 *   ?company=Acme — nume companie demo custom
 *   ?noise=0.15   — perturbație salarii (default 0.10)
 *   ?watermark=no — fără watermark
 *
 * Auth: internal key sau Owner/SUPER_ADMIN
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { anonymize, type AnonymizationConfig } from "@/lib/demo/anonymizer"

export const dynamic = "force-dynamic"

// Tenant JG_itself — sursă de date reale
const JG_TENANT = "cmolbwrlr000004jplchaxsy8"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  // Doar Owner sau internal key pot genera demo snapshots
  const role = (session.user as any).role
  if (!["OWNER", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Acces restricționat la Owner" }, { status: 403 })
  }

  // Config din query params
  const url = new URL(req.url)
  const config: AnonymizationConfig = {
    seed: url.searchParams.get("seed") || `demo-${new Date().toISOString().slice(0, 10)}`,
    salaryNoise: parseFloat(url.searchParams.get("noise") || "0.10"),
    watermark: url.searchParams.get("watermark") !== "no",
    companyName: url.searchParams.get("company") || undefined,
  }

  try {
    // Citim datele REALE din JG_itself
    const [departments, jobs, salaryRecords, tenant] = await Promise.all([
      prisma.department.findMany({
        where: { tenantId: JG_TENANT },
        select: { id: true, name: true },
      }),
      prisma.job.findMany({
        where: { tenantId: JG_TENANT, isActive: true },
        select: { id: true, title: true, departmentId: true, structureType: true, purpose: true },
      }),
      prisma.employeeSalaryRecord.findMany({
        where: { tenantId: JG_TENANT },
        select: {
          employeeCode: true, gender: true, baseSalary: true,
          variableComp: true, department: true, jobCategory: true,
          evaluationScore: true,
        },
      }),
      prisma.tenant.findUnique({
        where: { id: JG_TENANT },
        select: { name: true },
      }),
    ])

    // Anonimizăm
    const snapshot = anonymize(
      {
        departments,
        jobs: jobs.map(j => ({ ...j, structureType: j.structureType || "HUMAN", purpose: j.purpose || undefined })),
        salaryRecords: salaryRecords.map(r => ({
          ...r,
          baseSalary: Number(r.baseSalary),
          variableComp: Number(r.variableComp),
          evaluationScore: r.evaluationScore ? Number(r.evaluationScore) : null,
        })),
        companyName: tenant?.name,
      },
      config
    )

    // Adăugăm metadata sursă (fără date reale)
    return NextResponse.json({
      ...snapshot,
      source: {
        description: "Snapshot demo generat din date organizaționale reale, complet anonimizat",
        realDataSize: {
          departments: departments.length,
          jobs: jobs.length,
          salaryRecords: salaryRecords.length,
        },
        config: {
          seed: config.seed,
          noise: config.salaryNoise,
          watermark: config.watermark,
        },
      },
    })
  } catch (error) {
    console.error("[DEMO SNAPSHOT]", error)
    return NextResponse.json({ error: "Eroare la generare snapshot" }, { status: 500 })
  }
}
