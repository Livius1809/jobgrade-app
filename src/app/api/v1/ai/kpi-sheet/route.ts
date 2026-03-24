import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deductCredits, hasCredits } from "@/lib/credits"
import { anthropic, AI_MODEL } from "@/lib/ai/client"

const CREDIT_COST = 3

const schema = z.object({
  jobId: z.string(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const body = await req.json()
    const data = schema.parse(body)

    const sufficient = await hasCredits(tenantId, CREDIT_COST)
    if (!sufficient) {
      return NextResponse.json(
        { message: `Credite insuficiente. Necesari: ${CREDIT_COST}.` },
        { status: 402 }
      )
    }

    const job = await prisma.job.findFirst({
      where: { id: data.jobId, tenantId },
      include: { department: { select: { name: true } } },
    })
    if (!job) {
      return NextResponse.json({ message: "Jobul nu a fost găsit." }, { status: 404 })
    }

    const prompt = `Ești expert în HR din România. Generează 5-8 KPI-uri relevante pentru poziția:

- Titlu: ${job.title}
- Departament: ${job.department?.name ?? "—"}
${job.responsibilities ? `- Responsabilități: ${job.responsibilities}` : ""}

Returnează **EXCLUSIV** un JSON valid:
{
  "kpis": [
    {
      "name": "Numele KPI",
      "description": "Descriere scurtă",
      "targetValue": "valoare numerică sau procent",
      "measurementUnit": "unitate de măsură (ex: %, RON, ore, număr)",
      "frequency": "MONTHLY" | "QUARTERLY" | "ANNUALLY",
      "weight": număr între 5 și 30 (suma tuturor = 100)
    }
  ]
}

Asigură-te că suma ponderilor este exact 100.`

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    })

    const raw = response.content[0].type === "text"
      ? response.content[0].text.trim()
      : ""

    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json(
        { message: "Eroare la parsarea răspunsului AI." },
        { status: 500 }
      )
    }

    const parsed = JSON.parse(jsonMatch[0])

    await deductCredits(
      tenantId,
      CREDIT_COST,
      `Generare KPI-uri: ${job.title}`,
      job.id
    )

    return NextResponse.json(parsed)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[AI KPI-SHEET]", error)
    return NextResponse.json({ message: "Eroare la generare." }, { status: 500 })
  }
}
