import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { generatePayGapReport } from "@/lib/payroll/pay-gap-report"
import { generateSalaryJustification } from "@/lib/payroll/salary-justification"
import { generateCoherenceReport } from "@/lib/payroll/coherence-report"

export const maxDuration = 60

/**
 * POST /api/v1/payroll/reports
 *
 * Generează rapoarte salariale conform Directivei (UE) 2023/970.
 *
 * Body: { reportType: "pay-gap" | "justification" | "coherence" }
 *
 * Auth: NextAuth session — OWNER, SUPER_ADMIN sau COMPANY_ADMIN.
 */
export async function POST(req: NextRequest) {
  // 1. Autentificare
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json(
      { error: "Nu ești autentificat." },
      { status: 401 }
    )
  }

  // 2. Autorizare — doar roluri administrative
  const allowedRoles = ["OWNER", "SUPER_ADMIN", "COMPANY_ADMIN"]
  const userRole = (session.user as any).role
  if (!allowedRoles.includes(userRole)) {
    return NextResponse.json(
      { error: "Nu ai permisiunea de a genera rapoarte salariale." },
      { status: 403 }
    )
  }

  const tenantId = (session.user as any).tenantId
  if (!tenantId) {
    return NextResponse.json(
      { error: "Sesiune invalidă — lipsește tenantId." },
      { status: 400 }
    )
  }

  // 3. Parsare body
  let body: { reportType?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: "Body invalid — așteptat JSON cu { reportType }." },
      { status: 400 }
    )
  }

  const { reportType } = body
  const validTypes = ["pay-gap", "justification", "coherence"]
  if (!reportType || !validTypes.includes(reportType)) {
    return NextResponse.json(
      {
        error: `reportType invalid. Valori acceptate: ${validTypes.join(", ")}.`,
      },
      { status: 400 }
    )
  }

  // 4. Generare raport
  try {
    let report: unknown

    switch (reportType) {
      case "pay-gap":
        report = await generatePayGapReport(tenantId, prisma)
        break
      case "justification":
        report = await generateSalaryJustification(tenantId, prisma)
        break
      case "coherence":
        report = await generateCoherenceReport(tenantId, prisma)
        break
    }

    return NextResponse.json({
      success: true,
      reportType,
      generatedAt: new Date().toISOString(),
      data: report,
    })
  } catch (e: any) {
    console.error(`[PAYROLL REPORTS] Eroare generare ${reportType}:`, e.message)
    return NextResponse.json(
      {
        error: "Eroare la generarea raportului.",
        details: process.env.NODE_ENV === "development" ? e.message : undefined,
      },
      { status: 500 }
    )
  }
}
