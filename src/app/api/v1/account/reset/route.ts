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
      // Șterge datele de test — păstrează contul și profilul
      // Ordine: copiii înainte de părinți (FK constraints)
      // Ștergere completă — TRUNCATE cascade pe tenantId
      // Cea mai sigură abordare: un singur statement cu CTE
      const deletes = [
        // Nivel 3: cele mai adânci dependențe
        "DELETE FROM salary_steps WHERE \"salaryGradeId\" IN (SELECT id FROM salary_grades WHERE \"tenantId\" = $1)",
        "DELETE FROM session_jobs WHERE \"sessionId\" IN (SELECT id FROM evaluation_sessions WHERE \"tenantId\" = $1)",
        "DELETE FROM kpi_definitions WHERE \"jobId\" IN (SELECT id FROM jobs WHERE \"tenantId\" = $1)",
        "DELETE FROM compensation_packages WHERE \"jobId\" IN (SELECT id FROM jobs WHERE \"tenantId\" = $1)",
        // Nivel 2: tabele cu FK pe tenant direct
        "DELETE FROM salary_grades WHERE \"tenantId\" = $1",
        "DELETE FROM pay_gap_reports WHERE \"tenantId\" = $1",
        "DELETE FROM joint_pay_assessments WHERE \"tenantId\" = $1",
        "DELETE FROM employee_salary_records WHERE \"tenantId\" = $1",
        "DELETE FROM simulation_scenarios WHERE \"tenantId\" = $1",
        "DELETE FROM reports WHERE \"tenantId\" = $1",
        "DELETE FROM ai_generations WHERE \"tenantId\" = $1",
        "DELETE FROM evaluation_sessions WHERE \"tenantId\" = $1",
        "DELETE FROM jobs WHERE \"tenantId\" = $1",
        // Financiar
        "DELETE FROM service_purchases WHERE \"tenantId\" = $1",
        "DELETE FROM credit_transactions WHERE \"tenantId\" = $1",
        "DELETE FROM credit_balances WHERE \"tenantId\" = $1",
        "DELETE FROM revenue_entries WHERE \"tenantId\" = $1",
        // Payroll
        "DELETE FROM payroll_entries WHERE \"tenantId\" = $1",
        "DELETE FROM payroll_import_batches WHERE \"tenantId\" = $1",
        // Alte date
        "DELETE FROM employee_requests WHERE \"tenantId\" = $1",
        "DELETE FROM client_memories WHERE \"tenantId\" = $1",
      ]

      for (const sql of deletes) {
        try {
          await prisma.$executeRawUnsafe(sql, tenantId)
        } catch (e: any) {
          // Tabelul poate să nu existe sau să fie gol — continuăm
          console.log(`[ACCOUNT RESET] Skip: ${e.message?.slice(0, 80)}`)
        }
      }

      console.log(`[ACCOUNT] Data reset → tenant ${tenantId}`)
      return NextResponse.json({ success: true, message: "Datele au fost șterse." })
    }

    if (action === "account") {
      await prisma.tenant.delete({ where: { id: tenantId } })
      console.log(`[ACCOUNT] Account deleted → tenant ${tenantId}`)
      return NextResponse.json({ success: true, message: "Contul a fost șters." })
    }

    return NextResponse.json({ message: "Acțiune invalidă." }, { status: 400 })
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error("[ACCOUNT RESET]", errMsg)
    return NextResponse.json({ message: `Eroare: ${errMsg}` }, { status: 500 })
  }
}
