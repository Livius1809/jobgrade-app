/**
 * /api/v1/compliance/equity
 *
 * Raport echitate interna extins — analiza gap salarial pe MULTIPLE dimensiuni.
 * Dimensiuni automate (din date existente): gen, grad, departament, categorie post.
 * Dimensiuni extra (de la client): vechime, nivel ierarhic, varsta, studii.
 *
 * GET — Raport cu gap per dimensiune
 * POST — Client adauga dimensiuni extra per angajat
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"

export const dynamic = "force-dynamic"

interface EquityDimension {
  name: string
  label: string
  source: "AUTO" | "CLIENT"  // automat din date existente sau introdus de client
  groups: Array<{
    groupLabel: string
    count: number
    avgSalary: number
    medianSalary: number
  }>
  maxGapPct: number  // diferenta maxima intre grupuri (%)
  gapStatus: "OK" | "ATTENTION" | "CRITICAL"  // <5% OK, 5-10% ATTENTION, >10% CRITICAL
}

// GET — Genereaza raport echitate pe toate dimensiunile disponibile
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const tenantId = session.user.tenantId

  // Citim angajatii cu salariu
  const employees = await prisma.employeeSalaryRecord.findMany({
    where: { tenantId },
    select: {
      employeeCode: true,
      gender: true,
      baseSalary: true,
      variableComp: true,
      department: true,
      jobCategory: true,
      workSchedule: true,
      salaryGradeId: true,
      salaryGrade: { select: { grade: true, label: true } },
    },
  })

  if (employees.length === 0) {
    return NextResponse.json({
      dimensions: [],
      employeeCount: 0,
      message: "Nu exista date salariale. Importa statul de salarii din sectiunea dedicata.",
    })
  }

  // Citim dimensiuni extra de la client (daca exista)
  const extraDimensions = await getTenantData<Record<string, Record<string, string>>>(tenantId, "EQUITY_EXTRA_DIMS") || {}
  // Format: { "EMP001": { "vechime": "5-10 ani", "nivel": "N-2", "studii": "Superior" }, ... }

  const dimensions: EquityDimension[] = []

  // Helper: calcul gap per grupuri
  function computeDimension(name: string, label: string, source: "AUTO" | "CLIENT", getGroup: (e: any) => string | null): EquityDimension {
    const groups: Record<string, number[]> = {}
    for (const emp of employees) {
      const group = getGroup(emp)
      if (!group) continue
      const totalSalary = emp.baseSalary + (emp.variableComp || 0)
      if (!groups[group]) groups[group] = []
      groups[group].push(totalSalary)
    }

    const groupStats = Object.entries(groups)
      .filter(([_, salaries]) => salaries.length >= 2)  // minim 2 angajati per grup
      .map(([groupLabel, salaries]) => {
        const sorted = [...salaries].sort((a, b) => a - b)
        const avg = salaries.reduce((s, v) => s + v, 0) / salaries.length
        const median = sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)]
        return { groupLabel, count: salaries.length, avgSalary: Math.round(avg), medianSalary: Math.round(median) }
      })
      .sort((a, b) => b.avgSalary - a.avgSalary)

    let maxGapPct = 0
    if (groupStats.length >= 2) {
      const maxAvg = groupStats[0].avgSalary
      const minAvg = groupStats[groupStats.length - 1].avgSalary
      if (maxAvg > 0) maxGapPct = Math.round(((maxAvg - minAvg) / maxAvg) * 100)
    }

    return {
      name, label, source, groups: groupStats, maxGapPct,
      gapStatus: maxGapPct <= 5 ? "OK" : maxGapPct <= 10 ? "ATTENTION" : "CRITICAL",
    }
  }

  // Dimensiuni automate
  dimensions.push(computeDimension("gender", "Gen", "AUTO", e => e.gender))
  dimensions.push(computeDimension("department", "Departament", "AUTO", e => e.department))
  dimensions.push(computeDimension("jobCategory", "Categorie post", "AUTO", e => e.jobCategory))
  dimensions.push(computeDimension("grade", "Grad salarial", "AUTO", e => e.salaryGrade?.label || (e.salaryGradeId ? `Grad ${e.salaryGradeId}` : null)))
  dimensions.push(computeDimension("workSchedule", "Norma de lucru", "AUTO", e => e.workSchedule))

  // Dimensiuni extra de la client
  const extraKeys = new Set<string>()
  for (const dims of Object.values(extraDimensions)) {
    for (const key of Object.keys(dims)) extraKeys.add(key)
  }

  for (const key of extraKeys) {
    const labelMap: Record<string, string> = {
      vechime: "Vechime", nivel: "Nivel ierarhic", varsta: "Grupa de varsta", studii: "Nivel studii",
    }
    dimensions.push(computeDimension(
      key,
      labelMap[key] || key,
      "CLIENT",
      e => extraDimensions[e.employeeCode]?.[key] || null
    ))
  }

  // Filtram dimensiunile goale (fara grupuri)
  const validDimensions = dimensions.filter(d => d.groups.length >= 2)

  const criticalCount = validDimensions.filter(d => d.gapStatus === "CRITICAL").length
  const attentionCount = validDimensions.filter(d => d.gapStatus === "ATTENTION").length

  return NextResponse.json({
    dimensions: validDimensions,
    employeeCount: employees.length,
    stats: {
      totalDimensions: validDimensions.length,
      autoDimensions: validDimensions.filter(d => d.source === "AUTO").length,
      clientDimensions: validDimensions.filter(d => d.source === "CLIENT").length,
      critical: criticalCount,
      attention: attentionCount,
      ok: validDimensions.filter(d => d.gapStatus === "OK").length,
    },
    extraDimensionsAvailable: ["vechime", "nivel", "varsta", "studii"].filter(k => !extraKeys.has(k)),
    message: criticalCount > 0
      ? `${criticalCount} dimensiune(i) cu decalaj >10% — necesita argumentare conform Directivei EU 2023/970`
      : attentionCount > 0
      ? `${attentionCount} dimensiune(i) cu decalaj 5-10% — recomandam monitorizare`
      : "Echitate salariala in parametri normali pe toate dimensiunile analizate",
  })
}

// POST — Client adauga dimensiuni extra per angajat
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const body = await req.json()
  const { dimensionData } = body
  // Format asteptat: { "EMP001": { "vechime": "5-10 ani", "nivel": "N-2" }, "EMP002": { "vechime": "0-2 ani" } }

  if (!dimensionData || typeof dimensionData !== "object") {
    return NextResponse.json({ error: "dimensionData obligatoriu (obiect)" }, { status: 400 })
  }

  const existing = await getTenantData<Record<string, Record<string, string>>>(session.user.tenantId, "EQUITY_EXTRA_DIMS") || {}

  // Merge: pastreaza existente + adauga/suprascrie noi
  for (const [empCode, dims] of Object.entries(dimensionData as Record<string, Record<string, string>>)) {
    if (!existing[empCode]) existing[empCode] = {}
    Object.assign(existing[empCode], dims)
  }

  await setTenantData(session.user.tenantId, "EQUITY_EXTRA_DIMS", existing)

  return NextResponse.json({
    ok: true,
    employeesUpdated: Object.keys(dimensionData).length,
  })
}
