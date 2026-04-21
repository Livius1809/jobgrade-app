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
      const deletes = [
        "DELETE FROM service_purchases WHERE \"tenantId\" = $1",
        "DELETE FROM credit_transactions WHERE \"tenantId\" = $1",
        "DELETE FROM credit_balances WHERE \"tenantId\" = $1",
        "DELETE FROM revenue_entries WHERE \"tenantId\" = $1",
        "DELETE FROM session_jobs WHERE \"sessionId\" IN (SELECT id FROM evaluation_sessions WHERE \"tenantId\" = $1)",
        "DELETE FROM evaluation_sessions WHERE \"tenantId\" = $1",
        "DELETE FROM jobs WHERE \"tenantId\" = $1",
        "DELETE FROM payroll_entries WHERE \"tenantId\" = $1",
        "DELETE FROM employee_salary_records WHERE \"tenantId\" = $1",
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
