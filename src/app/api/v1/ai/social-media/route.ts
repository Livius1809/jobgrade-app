import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { deductCredits, hasCredits } from "@/lib/credits"
import { anthropic, AI_MODEL } from "@/lib/ai/client"
import { AiGenerationType } from "@/generated/prisma"

const COST_PER_PLATFORM = 2

const schema = z.object({
  jobId: z.string(),
  platforms: z.array(z.enum(["linkedin", "facebook", "instagram"])).min(1),
  tone: z.enum(["professional", "dynamic", "friendly"]),
})

const PLATFORM_GUIDELINES: Record<string, string> = {
  linkedin: "LinkedIn: profesional, 150-300 cuvinte, hashtag-uri relevante, CTA clar. Structura: hook → descriere rol → beneficii → CTA.",
  facebook: "Facebook: mai casual, 100-200 cuvinte, emoji-uri moderate, vizibil și atractiv. Structura: intrebare hook → rol → beneficii → link aplica.",
  instagram: "Instagram: concis, max 150 cuvinte, hashtag-uri (15-20), emoji-uri, vizual și dinamic.",
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const tenantId = session.user.tenantId
    const body = await req.json()
    const data = schema.parse(body)

    const totalCost = data.platforms.length * COST_PER_PLATFORM

    const sufficient = await hasCredits(tenantId, totalCost)
    if (!sufficient) {
      return NextResponse.json(
        { message: `Credite insuficiente. Necesari: ${totalCost}.` },
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

    const results: Record<string, string> = {}

    for (const platform of data.platforms) {
      const prompt = `Ești expert în social media HR din România. Generează un post de recrutare în română pentru:

- Titlu: ${job.title}
- Departament: ${job.department?.name ?? "—"}
${job.purpose ? `- Scop: ${job.purpose}` : ""}
${job.responsibilities ? `- Responsabilități: ${job.responsibilities}` : ""}

Ton: ${data.tone}
Platformă: ${PLATFORM_GUIDELINES[platform]}

Generează EXCLUSIV conținutul postului, gata de publicat.`

      const response = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      })

      results[platform] =
        response.content[0].type === "text" ? response.content[0].text : ""
    }

    await deductCredits(
      tenantId,
      totalCost,
      `Social media posts (${data.platforms.join(", ")}): ${job.title}`,
      job.id
    )

    return NextResponse.json({ results })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[AI SOCIAL-MEDIA]", error instanceof Error ? error.constructor.name : "Unknown")
    return NextResponse.json({ message: "Eroare la generare." }, { status: 500 })
  }
}
