import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { anthropic, AI_MODEL } from "@/lib/ai/client"

export const dynamic = "force-dynamic"

const requestSchema = z.object({
  criterionId: z.string(),
})

/**
 * POST — AI suggests a subfactor level for a specific criterion on a job.
 * Analyzes the job description, responsibilities, and requirements
 * against the criterion's subfactor descriptors.
 * Returns: suggested code + reasoning + relevant text highlights.
 *
 * Part of the mini-consensus AI ↔ evaluator flow (Bloc 2).
 * No credit cost — included in the evaluation package.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sessionJobId: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const { id: sessionId, sessionJobId } = await params
    const tenantId = session.user.tenantId
    const body = await req.json()
    const { criterionId } = requestSchema.parse(body)

    // Verify session
    const evalSession = await prisma.evaluationSession.findFirst({
      where: { id: sessionId, tenantId },
      select: { id: true },
    })
    if (!evalSession) {
      return NextResponse.json({ message: "Sesiunea nu a fost găsită." }, { status: 404 })
    }

    // Get job details
    const sessionJob = await prisma.sessionJob.findFirst({
      where: { id: sessionJobId, sessionId },
      include: {
        job: {
          select: {
            title: true,
            purpose: true,
            responsibilities: true,
            requirements: true,
            department: { select: { name: true } },
          },
        },
      },
    })
    if (!sessionJob) {
      return NextResponse.json({ message: "Jobul nu a fost găsit." }, { status: 404 })
    }

    // Get criterion with subfactors
    const criterion = await prisma.criterion.findUnique({
      where: { id: criterionId },
      include: { subfactors: { orderBy: { order: "asc" } } },
    })
    if (!criterion) {
      return NextResponse.json({ message: "Criteriu invalid." }, { status: 400 })
    }

    const subfactorDescriptors = criterion.subfactors
      .map((sf) => `  ${sf.code}: ${sf.description}`)
      .join("\n")

    const jobText = [
      sessionJob.job.purpose && `SCOP: ${sessionJob.job.purpose}`,
      sessionJob.job.responsibilities && `RESPONSABILITĂȚI: ${sessionJob.job.responsibilities}`,
      sessionJob.job.requirements && `CERINȚE: ${sessionJob.job.requirements}`,
    ].filter(Boolean).join("\n\n")

    const systemPrompt = `Ești expert în evaluarea posturilor (Job Evaluation) cu metodologie analitică pe 6 criterii.
Analizezi o fișă de post și recomanzi un nivel (literă A-G) pentru un criteriu specific.

REGULI:
- Compari textul din fișa postului cu descriptorii fiecărui nivel.
- Identifici exact ce porțiuni din fișă susțin recomandarea ta.
- Răspunzi DOAR în formatul JSON cerut.
- Limba română.
- NU menționezi puncte — doar litere.`

    const userPrompt = `POSTUL: ${sessionJob.job.title}
Departament: ${sessionJob.job.department?.name ?? "—"}

${jobText}

CRITERIUL DE ANALIZAT: ${criterion.name}
${criterion.description || ""}

NIVELURI DISPONIBILE:
${subfactorDescriptors}

Analizează fișa postului și returnează un JSON cu structura:
{
  "suggestedCode": "litera recomandată (A-G)",
  "reasoning": "explicație în 2-3 propoziții de ce acest nivel, cu referire la descriptorul literei",
  "highlights": ["fragment relevant 1 din fișa postului", "fragment relevant 2"]
}

Returnează DOAR JSON-ul, fără alte comentarii.`

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 400,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    })

    const aiText =
      response.content[0].type === "text" ? response.content[0].text : "{}"

    // Parse AI response
    let suggestion: { suggestedCode: string; reasoning: string; highlights: string[] }
    try {
      // Extract JSON from potential markdown wrapper
      const jsonMatch = aiText.match(/\{[\s\S]*\}/)
      suggestion = JSON.parse(jsonMatch?.[0] ?? "{}")
    } catch {
      suggestion = {
        suggestedCode: "",
        reasoning: aiText,
        highlights: [],
      }
    }

    // Find the matching subfactor
    const suggestedSubfactor = criterion.subfactors.find(
      (sf) => sf.code === suggestion.suggestedCode
    )

    return NextResponse.json({
      criterionId,
      criterionName: criterion.name,
      suggestedCode: suggestion.suggestedCode,
      suggestedSubfactorId: suggestedSubfactor?.id ?? null,
      reasoning: suggestion.reasoning,
      highlights: suggestion.highlights || [],
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Date invalide.", errors: error.issues },
        { status: 400 }
      )
    }
    console.error("[AI-SUGGEST]", error)
    return NextResponse.json({ message: "Eroare internă." }, { status: 500 })
  }
}
