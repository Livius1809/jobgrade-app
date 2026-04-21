import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const schema = z.object({
  action: z.enum(["data", "account"]),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const body = await req.json()
    const { action } = schema.parse(body)
    const tenantId = session.user.tenantId

    if (action === "data") {
      // Șterge datele de lucru — PĂSTREAZĂ: cont, profil companie, utilizatori
      // Ordine: copiii înainte de părinți (FK constraints)
      const deletes = [
        // Dependențe adânci
        { sql: "DELETE FROM salary_steps WHERE \"salaryGradeId\" IN (SELECT id FROM salary_grades WHERE \"tenantId\" = $1)", label: "salary_steps" },
        { sql: "DELETE FROM session_jobs WHERE \"sessionId\" IN (SELECT id FROM evaluation_sessions WHERE \"tenantId\" = $1)", label: "session_jobs" },
        { sql: "DELETE FROM kpi_definitions WHERE \"jobId\" IN (SELECT id FROM jobs WHERE \"tenantId\" = $1)", label: "kpi_definitions" },
        { sql: "DELETE FROM compensation_packages WHERE \"jobId\" IN (SELECT id FROM jobs WHERE \"tenantId\" = $1)", label: "compensation_packages" },
        // Tabele cu FK pe tenant
        { sql: "DELETE FROM salary_grades WHERE \"tenantId\" = $1", label: "salary_grades" },
        { sql: "DELETE FROM pay_gap_reports WHERE \"tenantId\" = $1", label: "pay_gap_reports" },
        { sql: "DELETE FROM joint_pay_assessments WHERE \"tenantId\" = $1", label: "joint_assessments" },
        { sql: "DELETE FROM employee_salary_records WHERE \"tenantId\" = $1", label: "employee_salary_records" },
        { sql: "DELETE FROM simulation_scenarios WHERE \"tenantId\" = $1", label: "simulation_scenarios" },
        { sql: "DELETE FROM reports WHERE \"tenantId\" = $1", label: "reports" },
        { sql: "DELETE FROM ai_generations WHERE \"tenantId\" = $1", label: "ai_generations" },
        { sql: "DELETE FROM evaluation_sessions WHERE \"tenantId\" = $1", label: "evaluation_sessions" },
        { sql: "DELETE FROM jobs WHERE \"tenantId\" = $1", label: "jobs" },
        // Financiar — TOATE
        { sql: "DELETE FROM service_purchases WHERE \"tenantId\" = $1", label: "service_purchases" },
        { sql: "DELETE FROM credit_transactions WHERE \"tenantId\" = $1", label: "credit_transactions" },
        { sql: "DELETE FROM credit_balances WHERE \"tenantId\" = $1", label: "credit_balances" },
        { sql: "DELETE FROM revenue_entries WHERE \"tenantId\" = $1", label: "revenue_entries" },
        // Payroll
        { sql: "DELETE FROM payroll_entries WHERE \"tenantId\" = $1", label: "payroll_entries" },
        { sql: "DELETE FROM payroll_import_batches WHERE \"tenantId\" = $1", label: "payroll_import_batches" },
        // Alte date
        { sql: "DELETE FROM employee_requests WHERE \"tenantId\" = $1", label: "employee_requests" },
        { sql: "DELETE FROM client_memories WHERE \"tenantId\" = $1", label: "client_memories" },
        // Departamente (date de lucru, nu profil)
        { sql: "DELETE FROM departments WHERE \"tenantId\" = $1", label: "departments" },
      ]

      const results: string[] = []
      for (const { sql, label } of deletes) {
        try {
          const result = await prisma.$executeRawUnsafe(sql, tenantId)
          if (result > 0) results.push(`${label}: ${result}`)
        } catch (e: any) {
          const msg = e.message?.slice(0, 100) || "unknown"
          console.log(`[ACCOUNT RESET] Skip ${label}: ${msg}`)
          results.push(`${label}: SKIP (${msg.slice(0, 40)})`)
        }
      }

      // NU ștergem: tenants, users, company_profiles (profil companie rămâne)
      console.log(`[ACCOUNT] Data reset → tenant ${tenantId}:`, results.join(", "))
      return NextResponse.json({ success: true, message: "Datele de lucru au fost șterse. Profilul companiei a fost păstrat.", details: results })
    }

    if (action === "account") {
      // Șterge TOTUL — CASCADE
      await prisma.tenant.delete({ where: { id: tenantId } })
      console.log(`[ACCOUNT] Account deleted → tenant ${tenantId}`)
      return NextResponse.json({ success: true, message: "Contul a fost șters complet." })
    }

    return NextResponse.json({ message: "Acțiune invalidă." }, { status: 400 })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error("[ACCOUNT RESET]", errMsg)
    return NextResponse.json({ message: `Eroare: ${errMsg}` }, { status: 500 })
  }
}
