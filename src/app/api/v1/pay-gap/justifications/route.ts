import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

/**
 * Justificări pay gap — documentare diferențe salariale per categorie.
 * Cerință Art. 9 Directiva EU 2023/970: angajatorul trebuie să justifice
 * diferențele salariale pe baza criteriilor obiective.
 *
 * Stocăm justificările în PayGapReport.indicators (câmp JSON extins)
 * sub cheia "justifications".
 */

const JustificationSchema = z.object({
  reportId: z.string(),
  category: z.string(),
  justification: z.string().min(10, "Justificarea trebuie să aibă minim 10 caractere."),
  criteria: z.array(z.enum([
    "VECHIME", "PERFORMANTA", "COMPETENTE", "CONDITII_MUNCA",
    "PIATA_MUNCII", "NEGOCIERE_INDIVIDUALA", "ALTELE"
  ])).min(1, "Selectați minim un criteriu obiectiv."),
  authorName: z.string().optional(),
})

// GET — listează justificările existente pentru un raport
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

    const reportId = req.nextUrl.searchParams.get("reportId")
    if (!reportId) return NextResponse.json({ message: "reportId obligatoriu." }, { status: 400 })

    const report = await prisma.payGapReport.findFirst({
      where: { id: reportId, tenantId: session.user.tenantId },
    })
    if (!report) return NextResponse.json({ message: "Raport negăsit." }, { status: 404 })

    const indicators = report.indicators as Record<string, unknown>
    const justifications = (indicators?.justifications ?? []) as Array<Record<string, unknown>>

    return NextResponse.json({ justifications })
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

    const report = await prisma.payGapReport.findFirst({
      where: { id: parsed.data.reportId, tenantId },
    })
    if (!report) return NextResponse.json({ message: "Raport negăsit." }, { status: 404 })

    const indicators = (report.indicators as Record<string, unknown>) ?? {}
    const justifications = ((indicators.justifications ?? []) as Array<Record<string, unknown>>)
      .filter(j => j.category !== parsed.data.category) // remove old entry for this category

    justifications.push({
      category: parsed.data.category,
      justification: parsed.data.justification,
      criteria: parsed.data.criteria,
      authorName: parsed.data.authorName ?? `${session.user.name}`,
      updatedAt: new Date().toISOString(),
    })

    await prisma.payGapReport.update({
      where: { id: parsed.data.reportId },
      data: {
        indicators: JSON.parse(JSON.stringify({ ...indicators, justifications })),
      },
    })

    return NextResponse.json({ ok: true, justifications })
  } catch (error) {
    console.error("[JUSTIFICATIONS POST]", error)
    return NextResponse.json({ message: "Eroare server." }, { status: 500 })
  }
}
