import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deductCredits, hasCredits } from "@/lib/credits"
import { anthropic, AI_MODEL } from "@/lib/ai/client"
import { AiGenerationType } from "@/generated/prisma"
import { buildKBContext } from "@/lib/kb/inject"

const CREDIT_COST = 4

const schema = z.object({
  jobId: z.string(),
  tone: z.enum(["professional", "dynamic", "friendly", "corporate"]),
  platform: z.enum(["ejobs", "bestjobs", "linkedin", "hipo", "generic"]),
  additionalInfo: z.string().optional(),
})

const PLATFORM_GUIDELINES: Record<string, string> = {
  ejobs: "Formatează pentru eJobs Romania: secțiuni clare, bullets, max 800 cuvinte.",
  bestjobs: "Formatează pentru BestJobs Romania: atractiv, concis, bullets.",
  linkedin: "Formatează pentru LinkedIn: opener memorabil, conversational, 400-600 cuvinte.",
  hipo: "Formatează pentru Hipo.ro: orientat spre tineri, dinamism, beneficii vizibile.",
  generic: "Format standard de anunț de angajare, adaptabil oricărei platforme.",
}

const TONE_GUIDELINES: Record<string, string> = {
  professional: "Ton profesional, echilibrat, care transmite seriozitate și competență.",
  dynamic: "Ton dinamic și energic, care inspiră acțiune imediată.",
  friendly: "Ton prietenos și accesibil, care face candidatul să se simtă binevenit.",
  corporate: "Ton formal și corporate, potrivit companiilor mari sau multinaționale.",
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

    // Verifică credite
    const sufficient = await hasCredits(tenantId, CREDIT_COST)
    if (!sufficient) {
      return NextResponse.json(
        { message: `Credite insuficiente. Necesari: ${CREDIT_COST} credite.` },
        { status: 402 }
      )
    }

    // Găsește jobul
    const job = await prisma.job.findFirst({
      where: { id: data.jobId, tenantId },
      include: {
        department: { select: { name: true } },
      },
    })
    if (!job) {
      return NextResponse.json(
        { message: "Jobul nu a fost găsit." },
        { status: 404 }
      )
    }

    const kbContext = await buildKBContext({
      agentRole: "HR_COUNSELOR",
      context: `anunț angajare recrutare ${job.title} ${data.tone} ${data.platform}`,
      limit: 3,
    })

    const systemPrompt = [
      "Ești expert în HR și recrutare din România, specializat în redactarea anunțurilor de angajare atractive și eficiente.",
      kbContext,
    ].filter(Boolean).join("\n\n")

    const prompt = `Generează un anunț de angajare profesional în limba română.

**Fișa de post:**
- Titlu: ${job.title}
- Departament: ${job.department?.name ?? "—"}
${job.purpose ? `- Scop: ${job.purpose}` : ""}
${job.responsibilities ? `- Responsabilități: ${job.responsibilities}` : ""}
${job.requirements ? `- Cerințe: ${job.requirements}` : ""}
${data.additionalInfo ? `\n**Informații suplimentare:**\n${data.additionalInfo}` : ""}

**Instrucțiuni de ton:** ${TONE_GUIDELINES[data.tone]}
**Instrucțiuni de platformă:** ${PLATFORM_GUIDELINES[data.platform]}

Generează un anunț complet, atractiv și profesional. Include: titlu captivant, descriere companie (generic), responsabilități, cerințe, beneficii (generic: mediu plăcut, oportunități de dezvoltare, pachet salarial competitiv), CTA.`

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    })

    const content = response.content[0].type === "text"
      ? response.content[0].text
      : ""

    const tokensUsed = response.usage.input_tokens + response.usage.output_tokens

    // Scade creditele și salvează generarea
    await prisma.$transaction(async (tx: any) => {
      await deductCredits(
        tenantId,
        CREDIT_COST,
        `Generare anunț angajare: ${job.title}`,
        job.id
      )

      await tx.aiGeneration.create({
        data: {
          tenantId,
          type: AiGenerationType.JOB_AD,
          sourceId: job.id,
          sourceType: "job",
          prompt,
          output: content,
          model: AI_MODEL,
          tokensUsed,
          credits: CREDIT_COST,
        },
      })
    })

    return NextResponse.json({ content })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[AI JOB-AD]", error instanceof Error ? error.constructor.name : "Unknown")
    return NextResponse.json({ message: "Eroare la generare AI." }, { status: 500 })
  }
}
