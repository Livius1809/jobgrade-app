import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { Resend } from "resend"
import { calculatePayGapIndicators } from "@/lib/pay-gap"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const K_ANONYMITY = 5

const RespondSchema = z.object({
  response: z.string().min(10),
  status: z.enum(["IN_REVIEW", "RESPONDED"]),
  employeeName: z.string().optional(), // numele real completat manual de admin
})

/**
 * Anonimizare identitate: "Ana Popescu" → "An** P**sc**"
 */
function anonymizeName(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => {
      if (part.length <= 2) return part[0] + "*"
      return part.slice(0, 2) + "*".repeat(Math.min(part.length - 4, 3)) + part.slice(-2)
    })
    .join(" ")
}

/**
 * GET /api/v1/employee-requests/[id]
 * Pre-generează răspunsul semi-automat din datele disponibile în stat.
 * Admin vede identitatea anonimizată și completează manual.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

    const { role, tenantId } = session.user
    if (!["COMPANY_ADMIN", "OWNER", "SUPER_ADMIN", "FACILITATOR"].includes(role)) {
      return NextResponse.json({ message: "Acces interzis." }, { status: 403 })
    }

    const { id } = await params

    const request = await prisma.employeeRequest.findFirst({
      where: { id, tenantId },
      include: { salaryGrade: true },
    })

    if (!request) {
      return NextResponse.json({ message: "Cererea nu a fost gasita." }, { status: 404 })
    }

    // Parse categorii solicitate din requestDetails
    const requestedCategories: string[] = []
    const details = request.requestDetails ?? ""
    if (details.includes("nivel_salarial")) requestedCategories.push("nivel_salarial")
    if (details.includes("medie_categorie")) requestedCategories.push("medie_categorie")
    if (details.includes("clasa_salariala")) requestedCategories.push("clasa_salariala")
    if (details.includes("criterii_progresie")) requestedCategories.push("criterii_progresie")
    if (details.includes("pachet_beneficii")) requestedCategories.push("pachet_beneficii")
    if (details.includes("pozitie_quartila")) requestedCategories.push("pozitie_quartila")
    // Fallback: dacă nu are checkboxe, le sugerăm pe toate
    if (requestedCategories.length === 0) {
      requestedCategories.push("nivel_salarial", "medie_categorie", "clasa_salariala", "criterii_progresie")
    }

    // Identitate anonimizata
    const anonymized = anonymizeName(request.requestedBy)

    // Pre-generare raspuns per categorie
    const sections: { category: string; title: string; content: string; editable: boolean }[] = []

    // Date salariale per grad
    const year = new Date().getFullYear()
    let gradeData: { name: string; salaryMin: number | null; salaryMax: number | null } | null = null
    let gradeRecords: Array<{ gender: string; baseSalary: number; variableComp: number }> = []

    if (request.salaryGradeId) {
      const grade = await prisma.salaryGrade.findUnique({
        where: { id: request.salaryGradeId },
        select: { name: true, salaryMin: true, salaryMax: true },
      })
      gradeData = grade ? {
        name: grade.name,
        salaryMin: grade.salaryMin,
        salaryMax: grade.salaryMax,
      } : null

      gradeRecords = await prisma.employeeSalaryRecord.findMany({
        where: { tenantId, salaryGradeId: request.salaryGradeId, periodYear: year },
        select: { gender: true, baseSalary: true, variableComp: true },
      })
    }

    // NIVEL SALARIAL
    if (requestedCategories.includes("nivel_salarial")) {
      sections.push({
        category: "nivel_salarial",
        title: "Nivelul salarial (Art. 7.1a)",
        content: gradeData
          ? `Pozitia dvs. este incadrata in clasa salariala "${gradeData.name}". Salariul de baza brut lunar aferent: [COMPLETATI DE ADMIN].`
          : "Pozitia solicitantului nu a fost incadrata inca intr-o clasa salariala.",
        editable: true,
      })
    }

    // MEDIE CATEGORIE PE GEN
    if (requestedCategories.includes("medie_categorie")) {
      if (gradeRecords.length >= K_ANONYMITY) {
        const male = gradeRecords.filter((r) => r.gender === "MALE")
        const female = gradeRecords.filter((r) => r.gender === "FEMALE")
        const avgMale = male.length > 0 ? Math.round(male.reduce((s, r) => s + r.baseSalary, 0) / male.length) : null
        const avgFemale = female.length > 0 ? Math.round(female.reduce((s, r) => s + r.baseSalary, 0) / female.length) : null

        const maleText = male.length >= K_ANONYMITY && avgMale
          ? `${avgMale.toLocaleString("ro-RO")} RON (${male.length} persoane)`
          : `date insuficiente (sub ${K_ANONYMITY} persoane)`
        const femaleText = female.length >= K_ANONYMITY && avgFemale
          ? `${avgFemale.toLocaleString("ro-RO")} RON (${female.length} persoane)`
          : `date insuficiente (sub ${K_ANONYMITY} persoane)`

        sections.push({
          category: "medie_categorie",
          title: "Media salariala pe categorie, defalcata pe gen (Art. 7.1b)",
          content: `Clasa: ${gradeData?.name ?? "—"}\nAn referinta: ${year}\nTotal angajati in grupa: ${gradeRecords.length}\nMedia salariu baza barbati: ${maleText}\nMedia salariu baza femei: ${femaleText}`,
          editable: false,
        })
      } else {
        sections.push({
          category: "medie_categorie",
          title: "Media salariala pe categorie (Art. 7.1b)",
          content: `Nu exista suficiente date anonimizate pentru aceasta grupa salariala (cerinta k-anonymity: minim ${K_ANONYMITY} angajati per gen). Datele nu pot fi furnizate fara a compromite confidentialitatea.`,
          editable: false,
        })
      }
    }

    // CLASA SALARIALA
    if (requestedCategories.includes("clasa_salariala")) {
      sections.push({
        category: "clasa_salariala",
        title: "Clasa salariala si interval (Art. 6.1)",
        content: gradeData
          ? `Clasa: ${gradeData.name}\nInterval salarial brut lunar: ${gradeData.salaryMin ? Number(gradeData.salaryMin).toLocaleString("ro-RO") : "—"} – ${gradeData.salaryMax ? Number(gradeData.salaryMax).toLocaleString("ro-RO") : "—"} RON`
          : "Clasa salariala nu a fost definita pentru aceasta pozitie.",
        editable: false,
      })
    }

    // CRITERII PROGRESIE
    if (requestedCategories.includes("criterii_progresie")) {
      sections.push({
        category: "criterii_progresie",
        title: "Criteriile de progresie salariala (Art. 6.1)",
        content:
          "Criteriile obiective de stabilire si progresie salariala utilizate in organizatie:\n" +
          "1. Complexitatea muncii (nivel de dificultate si cunostinte necesare)\n" +
          "2. Responsabilitatea (impact asupra rezultatelor organizatiei)\n" +
          "3. Competentele necesare (calificari, experienta, abilitati)\n" +
          "4. Conditiile de munca (mediu fizic, solicitari specifice)\n\n" +
          "Aceste criterii sunt neutre din perspectiva genului si se aplica uniform tuturor angajatilor din aceeasi categorie de munca.",
        editable: true,
      })
    }

    // PACHET BENEFICII
    if (requestedCategories.includes("pachet_beneficii")) {
      sections.push({
        category: "pachet_beneficii",
        title: "Pachet compensatii si beneficii (Art. 7.1a)",
        content:
          "[COMPLETATI DE ADMIN: enumerati beneficiile aferente acestei categorii de post — compensatie variabila, bonusuri, beneficii in natura, tichete, asigurari etc.]",
        editable: true,
      })
    }

    // POZITIE QUARTILA
    if (requestedCategories.includes("pozitie_quartila")) {
      if (gradeRecords.length >= K_ANONYMITY) {
        const sorted = [...gradeRecords].sort((a, b) => a.baseSalary - b.baseSalary)
        const q1 = sorted[Math.floor(sorted.length * 0.25)]?.baseSalary ?? 0
        const q2 = sorted[Math.floor(sorted.length * 0.5)]?.baseSalary ?? 0
        const q3 = sorted[Math.floor(sorted.length * 0.75)]?.baseSalary ?? 0

        sections.push({
          category: "pozitie_quartila",
          title: "Distributia salariala pe quartile (Art. 9.1f)",
          content: `Distributia salariului de baza in grupa "${gradeData?.name ?? "—"}" (${gradeRecords.length} angajati):\nQ1 (25%): ${q1.toLocaleString("ro-RO")} RON\nQ2 (50% — mediana): ${q2.toLocaleString("ro-RO")} RON\nQ3 (75%): ${q3.toLocaleString("ro-RO")} RON\n\nPozitia solicitantului: [COMPLETATI DE ADMIN]`,
          editable: true,
        })
      } else {
        sections.push({
          category: "pozitie_quartila",
          title: "Distributia salariala (Art. 9.1f)",
          content: `Date insuficiente pentru distributie quartila (minim ${K_ANONYMITY} angajati necesari).`,
          editable: false,
        })
      }
    }

    return NextResponse.json({
      request: {
        id: request.id,
        requestedBy: request.requestedBy,
        anonymizedName: anonymized,
        requestEmail: request.requestEmail,
        requestDetails: request.requestDetails,
        status: request.status,
        dueDate: request.dueDate.toISOString(),
        createdAt: request.createdAt.toISOString(),
        salaryGradeName: gradeData?.name ?? null,
      },
      sections,
      requestedCategories,
    })
  } catch (error) {
    console.error("[EMPLOYEE REQUESTS GET]", error)
    return NextResponse.json({ message: "Eroare server." }, { status: 500 })
  }
}

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
