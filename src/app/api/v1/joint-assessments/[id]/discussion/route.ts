import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import Anthropic from "@anthropic-ai/sdk"

export const dynamic = "force-dynamic"

const CommentSchema = z.object({
  chapterId: z.string().min(1),
  content: z.string().min(1).optional(),
  requestMediation: z.boolean().optional(),
})

/**
 * GET — comentarii pe un capitol
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

  const { id } = await params
  const chapterId = req.nextUrl.searchParams.get("chapterId")

  const assessment = await prisma.jointPayAssessment.findFirst({
    where: { id, tenantId: session.user.tenantId },
  })
  if (!assessment) return NextResponse.json({ message: "Negasit." }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actionPlan = (assessment.actionPlan as any) ?? {}
  const allComments = actionPlan.discussion ?? []

  const comments = chapterId
    ? allComments.filter((c: { chapterId: string }) => c.chapterId === chapterId)
    : allComments

  return NextResponse.json({ comments })
}

/**
 * POST — adaugă comentariu sau solicită mediere AI
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const parsed = CommentSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ message: "Date invalide." }, { status: 422 })

    const assessment = await prisma.jointPayAssessment.findFirst({
      where: { id, tenantId: session.user.tenantId },
    })
    if (!assessment) return NextResponse.json({ message: "Negasit." }, { status: 404 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actionPlan = (assessment.actionPlan as any) ?? {}
    if (!actionPlan.discussion) actionPlan.discussion = []
    if (!actionPlan.jurnal) actionPlan.jurnal = []

    const now = new Date().toISOString()
    const memberName = session.user.name ?? session.user.email

    if (parsed.data.requestMediation) {
      // AI Mediator — analizează discuția pe capitol și oferă perspectivă
      const chapterComments = actionPlan.discussion
        .filter((c: { chapterId: string }) => c.chapterId === parsed.data.chapterId)
        .slice(-10) // ultimele 10 mesaje

      const conversationText = chapterComments
        .map((c: { memberName: string; isAi: boolean; content: string }) =>
          `${c.isAi ? "AI Mediator" : c.memberName}: ${c.content}`
        )
        .join("\n")

      const client = new Anthropic()
      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        system: `Esti mediatorul AI intr-o evaluare comuna Art. 10 (Directiva EU 2023/970). Echipa discuta un capitol al raportului de pay gap. Rolul tau: ofera perspective obiective bazate pe date, ajuta la consens, nu ia parte. Raspunde in romana, concis (1-2 paragrafe). Capitol discutat: ${parsed.data.chapterId}.`,
        messages: [
          { role: "user", content: conversationText || "Echipa nu a inceput inca discutia pe acest capitol. Ofera o introducere si intrebari de ghidaj." },
        ],
      })

      const aiText = response.content[0].type === "text" ? response.content[0].text : ""

      actionPlan.discussion.push({
        id: `ai-${Date.now()}`,
        chapterId: parsed.data.chapterId,
        memberId: "AI_MEDIATOR",
        memberName: "AI Mediator",
        content: aiText,
        isAi: true,
        parentId: null,
        createdAt: now,
      })

      actionPlan.jurnal.push({
        timestamp: now,
        actiune: "MEDIERE_AI",
        detalii: `AI Mediator a intervenit pe capitolul "${parsed.data.chapterId}".`,
        efectuatDe: "AI_MEDIATOR",
      })
    } else if (parsed.data.content) {
      // Comentariu normal
      actionPlan.discussion.push({
        id: `msg-${Date.now()}`,
        chapterId: parsed.data.chapterId,
        memberId: session.user.id,
        memberName,
        content: parsed.data.content,
        isAi: false,
        parentId: null,
        createdAt: now,
      })

      actionPlan.jurnal.push({
        timestamp: now,
        actiune: "DISCUTIE_MESAJ",
        detalii: `${memberName} a comentat pe capitolul "${parsed.data.chapterId}".`,
        efectuatDe: memberName,
      })
    }

    await prisma.jointPayAssessment.update({
      where: { id },
      data: { actionPlan },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[JOINT-ASSESSMENT DISCUSSION]", error)
    return NextResponse.json({ message: "Eroare server." }, { status: 500 })
  }
}
