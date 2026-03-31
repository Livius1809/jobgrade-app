import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { Resend } from "resend"
import { calculatePayGapIndicators } from "@/lib/pay-gap"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const K_ANONYMITY = 5

const RespondSchema = z.object({
  response: z.string().min(10),
  status: z.enum(["IN_REVIEW", "RESPONDED"]),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

    const { role, tenantId, id: userId } = session.user
    if (!["COMPANY_ADMIN", "OWNER", "SUPER_ADMIN", "FACILITATOR"].includes(role)) {
      return NextResponse.json({ message: "Acces interzis." }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = RespondSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ message: "Date invalide." }, { status: 422 })
    }

    const existing = await prisma.employeeRequest.findFirst({
      where: { id, tenantId },
      include: { salaryGrade: true },
    })
    if (!existing) {
      return NextResponse.json({ message: "Cererea nu a fost găsită." }, { status: 404 })
    }

    // If responding, generate anonymized pay data (k-anonymity ≥ 5) — US-041
    let finalResponse = parsed.data.response

    if (parsed.data.status === "RESPONDED" && existing.salaryGradeId) {
      const year = new Date().getFullYear()
      const gradeRecords = await prisma.employeeSalaryRecord.findMany({
        where: { tenantId, salaryGradeId: existing.salaryGradeId, periodYear: year },
        select: { gender: true, baseSalary: true, variableComp: true,
                  department: true, jobCategory: true, salaryGradeId: true },
      })

      if (gradeRecords.length >= K_ANONYMITY) {
        const ind = calculatePayGapIndicators(gradeRecords)
        const maleCount = gradeRecords.filter((r) => r.gender === "MALE").length
        const femaleCount = gradeRecords.filter((r) => r.gender === "FEMALE").length

        finalResponse +=
          `\n\n--- Date anonimizate conform Art. 7.1 Directiva EU 2023/970 ---\n` +
          `Grupă salarială: ${existing.salaryGrade?.name ?? existing.salaryGradeId}\n` +
          `An referință: ${year}\n` +
          `Nr. angajați în grupă: ${gradeRecords.length} (${maleCount} M / ${femaleCount} F)\n` +
          `Salar mediu bărbați: ${ind.mean_base_male.toLocaleString("ro-RO")} RON\n` +
          `Salar mediu femei: ${ind.mean_base_female.toLocaleString("ro-RO")} RON\n` +
          (ind.a_mean_base_gap !== null
            ? `Diferență medie salariu de bază: ${ind.a_mean_base_gap}%\n`
            : `Diferență medie: date insuficiente (grupă < ${K_ANONYMITY} per gen)\n`)
      } else {
        finalResponse +=
          `\n\n--- Date anonimizate ---\n` +
          `Nu există suficiente date anonimizate pentru această grupă salarială ` +
          `(cerință k-anonymity: minim ${K_ANONYMITY} angajați per gen).`
      }
    }

    const updated = await prisma.employeeRequest.update({
      where: { id },
      data: {
        response: finalResponse,
        status: parsed.data.status,
        respondedAt: parsed.data.status === "RESPONDED" ? new Date() : undefined,
        respondedBy: parsed.data.status === "RESPONDED" ? userId : undefined,
      },
    })

    // Email response to employee (US-041)
    if (parsed.data.status === "RESPONDED" && resend) {
      try {
        await resend.emails.send({
          from: "JobGrade <noreply@jobgrade.ro>",
          to: [existing.requestEmail],
          subject: "Răspuns la cererea dvs. Art. 7 — Transparență salarială",
          html: `
            <p>Stimate/Stimată ${existing.requestedBy},</p>
            <p>Cererea dvs. de informații salariale (Nr. ${id}) a primit răspuns.</p>
            <pre style="background:#f5f5f5;padding:12px;border-radius:4px;font-size:13px;">${finalResponse}</pre>
            <p style="font-size:11px;color:#666;">Conform Art. 7 Directiva EU 2023/970 privind transparența salarială.</p>
          `,
        })
      } catch (emailErr) {
        console.error("[EMPLOYEE REQUEST RESPONSE EMAIL]", emailErr)
      }
    }

    return NextResponse.json({ request: updated })
  } catch (error) {
    console.error("[EMPLOYEE REQUESTS PATCH]", error)
    return NextResponse.json({ message: "Eroare server." }, { status: 500 })
  }
}
