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
      await prisma.$transaction([
        prisma.servicePurchase.deleteMany({ where: { tenantId } }),
        prisma.creditTransaction.deleteMany({ where: { tenantId } }),
        prisma.creditBalance.deleteMany({ where: { tenantId } }),
        (prisma as any).revenueEntry.deleteMany({ where: { tenantId } }),
        prisma.evaluationSession.deleteMany({ where: { tenantId } }),
        prisma.job.deleteMany({ where: { tenantId } }),
        (prisma as any).payrollEntry.deleteMany({ where: { tenantId } }).catch(() => {}),
        (prisma as any).employeeSalaryRecord.deleteMany({ where: { tenantId } }).catch(() => {}),
      ])

      console.log(`[ACCOUNT] Data reset → tenant ${tenantId}`)
      return NextResponse.json({ success: true, message: "Datele au fost șterse." })
    }

    if (action === "account") {
      // Șterge contul complet — CASCADE pe toate relațiile
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
