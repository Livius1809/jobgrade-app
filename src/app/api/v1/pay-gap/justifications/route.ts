import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

/**
 * Justificări pay gap — documentare diferențe salariale per categorie / grup muncă egală.
 * Cerință Art. 9 Directiva EU 2023/970: angajatorul trebuie să justifice
 * diferențele salariale pe baza criteriilor obiective.
 *
 * Două moduri:
 * 1. Pe raport: reportId + category → stocate în PayGapReport.indicators.justifications
 * 2. Pe grup muncă egală: groupLabel → stocate în SystemConfig "PAY_GAP_JUSTIFICATIONS_{tenantId}"
 */

const JustificationSchema = z.object({
  reportId: z.string().optional(),
  groupLabel: z.string().optional(),
  category: z.string(),
  justification: z.string().min(10, "Justificarea trebuie să aibă minim 10 caractere."),
  criteria: z.array(z.enum([
    "VECHIME", "PERFORMANTA", "COMPETENTE", "CONDITII_MUNCA",
    "PIATA_MUNCII", "NEGOCIERE_INDIVIDUALA", "ALTELE"
  ])).min(1, "Selectați minim un criteriu obiectiv."),
  authorName: z.string().optional(),
  employees: z.array(z.object({
    code: z.string(),
    gender: z.string(),
    salary: z.number(),
    position: z.string().optional(),
  })).optional(),
})

// GET — listează justificările (pe reportId SAU pe tenant pentru muncă egală)
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

    const reportId = req.nextUrl.searchParams.get("reportId")
    const mode = req.nextUrl.searchParams.get("mode") // "equal-work" sau default

    if (mode === "equal-work") {
      // Justificări pe grupuri muncă egală — din SystemConfig
      const key = `PAY_GAP_JUSTIFICATIONS_${session.user.tenantId}`
      const config = await prisma.systemConfig.findUnique({ where: { key } }).catch(() => null)
      const justifications = config ? JSON.parse(config.value) : []
      return NextResponse.json({ justifications, mode: "equal-work" })
    }

    if (!reportId) return NextResponse.json({ message: "reportId sau mode=equal-work obligatoriu." }, { status: 400 })

    const report = await prisma.payGapReport.findFirst({
      where: { id: reportId, tenantId: session.user.tenantId },
    })
    if (!report) return NextResponse.json({ message: "Raport negăsit." }, { status: 404 })

    const indicators = report.indicators as Record<string, unknown>
    const justifications = (indicators?.justifications ?? []) as Array<Record<string, unknown>>

    return NextResponse.json({ justifications, mode: "report" })
  } catch (error) {
    console.error("[JUSTIFICATIONS GET]", error)
    return NextResponse.json({ message: "Eroare server." }, { status: 500 })
  }
}

// POST — adaugă sau actualizează justificarea pentru o categorie
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

    const { role, tenantId } = session.user
    if (!["COMPANY_ADMIN", "OWNER", "SUPER_ADMIN"].includes(role)) {
      return NextResponse.json({ message: "Acces interzis." }, { status: 403 })
    }

    const body = await req.json()
    const parsed = JustificationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 422 })
    }

    const justificationEntry = {
      category: parsed.data.category,
      groupLabel: parsed.data.groupLabel,
      justification: parsed.data.justification,
      criteria: parsed.data.criteria,
      employees: parsed.data.employees,
      authorName: parsed.data.authorName ?? `${session.user.name}`,
      updatedAt: new Date().toISOString(),
    }

    if (parsed.data.groupLabel && !parsed.data.reportId) {
      // Mod muncă egală — salvare în SystemConfig
      const key = `PAY_GAP_JUSTIFICATIONS_${tenantId}`
      const existing = await prisma.systemConfig.findUnique({ where: { key } }).catch(() => null)
      const justifications = existing ? JSON.parse(existing.value) : []
      const filtered = justifications.filter((j: any) => j.category !== parsed.data.category || j.groupLabel !== parsed.data.groupLabel)
      filtered.push(justificationEntry)

      await prisma.systemConfig.upsert({
        where: { key },
        create: { key, value: JSON.stringify(filtered), label: "Justificări pay gap muncă egală" },
        update: { value: JSON.stringify(filtered) },
      })

      return NextResponse.json({ ok: true, justifications: filtered, mode: "equal-work" })
    }

    // Mod raport clasic
    if (!parsed.data.reportId) return NextResponse.json({ message: "reportId sau groupLabel obligatoriu." }, { status: 400 })

    const report = await prisma.payGapReport.findFirst({
      where: { id: parsed.data.reportId, tenantId },
    })
    if (!report) return NextResponse.json({ message: "Raport negăsit." }, { status: 404 })

    const indicators = (report.indicators as Record<string, unknown>) ?? {}
    const justifications = ((indicators.justifications ?? []) as Array<Record<string, unknown>>)
      .filter(j => j.category !== parsed.data.category)

    justifications.push(justificationEntry)

    await prisma.payGapReport.update({
      where: { id: parsed.data.reportId },
      data: {
        indicators: JSON.parse(JSON.stringify({ ...indicators, justifications })),
      },
    })

    return NextResponse.json({ ok: true, justifications, mode: "report" })
  } catch (error) {
    console.error("[JUSTIFICATIONS POST]", error)
    return NextResponse.json({ message: "Eroare server." }, { status: 500 })
  }
}
