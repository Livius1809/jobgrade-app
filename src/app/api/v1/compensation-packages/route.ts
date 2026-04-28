/**
 * /api/v1/compensation-packages
 *
 * Pachete salariale: fix + variabil per post.
 * GET  — Lista pachete configurate
 * POST — Creaza/actualizeaza pachet per post
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const packages = await prisma.compensationPackage.findMany({
    where: { tenantId: session.user.tenantId },
    include: {
      job: { select: { id: true, title: true, departmentId: true, department: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  })

  // KPI-uri per job (pentru context)
  const kpis = await prisma.kpiDefinition.findMany({
    where: { tenantId: session.user.tenantId },
    select: { id: true, jobId: true, name: true, weight: true, targetValue: true, measurementUnit: true, frequency: true },
    orderBy: { weight: "desc" },
  })

  const kpisByJob: Record<string, any[]> = {}
  for (const k of kpis) {
    if (!kpisByJob[k.jobId]) kpisByJob[k.jobId] = []
    kpisByJob[k.jobId].push(k)
  }

  return NextResponse.json({
    packages: packages.map(p => ({
      id: p.id,
      jobId: p.jobId,
      jobTitle: p.job.title,
      department: p.job.department?.name || null,
      baseSalary: p.baseSalary,
      currency: p.currency,
      components: p.components,
      benefits: p.benefits,
      kpis: kpisByJob[p.jobId] || [],
      createdAt: p.createdAt,
    })),
    totalJobs: packages.length,
    jobsWithKpi: Object.keys(kpisByJob).length,
  })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const body = await req.json()
  const { jobId, baseSalary, currency, components, benefits } = body

  if (!jobId || baseSalary === undefined) {
    return NextResponse.json({ error: "jobId si baseSalary obligatorii" }, { status: 400 })
  }

  // Verifica jobul apartine tenantului
  const job = await prisma.job.findFirst({
    where: { id: jobId, tenantId: session.user.tenantId },
  })
  if (!job) {
    return NextResponse.json({ error: "Postul nu a fost gasit" }, { status: 404 })
  }

  // Upsert: un singur pachet per job
  const existing = await prisma.compensationPackage.findFirst({
    where: { tenantId: session.user.tenantId, jobId },
  })

  const data = {
    tenantId: session.user.tenantId,
    jobId,
    baseSalary: Number(baseSalary),
    currency: currency || "RON",
    components: components || {},
    benefits: benefits || null,
  }

  let result
  if (existing) {
    result = await prisma.compensationPackage.update({
      where: { id: existing.id },
      data,
    })
  } else {
    result = await prisma.compensationPackage.create({ data })
  }

  // Learning: pachet salarial configurat = cunoastere despre structura compensatii
  try {
    const { learnFromClientInput } = await import("@/lib/learning-hooks")
    await learnFromClientInput(session.user.tenantId, "COMPENSATION_PACKAGE", `Pachet configurat: ${job.title}, baza=${baseSalary} ${currency || "RON"}, componente=${JSON.stringify(components || {}).slice(0, 200)}`)
  } catch {}

  return NextResponse.json({ ok: true, id: result.id })
}
