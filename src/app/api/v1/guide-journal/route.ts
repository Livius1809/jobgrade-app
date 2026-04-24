import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

export const dynamic = "force-dynamic"

const CreateSchema = z.object({
  page: z.string().min(1),
  question: z.string().min(2).max(2000),
  answer: z.string().min(2),
  helpful: z.boolean().optional(),
  category: z.string().optional(),
  delegatedTo: z.string().optional(),
})

// GET — jurnal Ghid cu statistici
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

  const { tenantId } = session.user
  const { searchParams } = new URL(req.url)
  const page = searchParams.get("page")
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200)
  const offset = parseInt(searchParams.get("offset") || "0")

  const where = {
    tenantId,
    ...(page ? { page } : {}),
  }

  const [entries, total, stats] = await Promise.all([
    prisma.guideJournalEntry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.guideJournalEntry.count({ where }),
    // Statistici frecvență per categorie (feedback loop)
    prisma.guideJournalEntry.groupBy({
      by: ["category"],
      where: { tenantId },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    }),
  ])

  // Top întrebări frecvente (pentru antrenare Ghid)
  const frequentPages = await prisma.guideJournalEntry.groupBy({
    by: ["page"],
    where: { tenantId },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  })

  // Satisfaction rate
  const helpfulStats = await prisma.guideJournalEntry.groupBy({
    by: ["helpful"],
    where: { tenantId, helpful: { not: null } },
    _count: { id: true },
  })

  return NextResponse.json({
    entries,
    total,
    stats: {
      byCategory: stats.map((s) => ({ category: s.category, count: s._count.id })),
      byPage: frequentPages.map((p) => ({ page: p.page, count: p._count.id })),
      satisfaction: {
        helpful: helpfulStats.find((h) => h.helpful === true)?._count.id || 0,
        notHelpful: helpfulStats.find((h) => h.helpful === false)?._count.id || 0,
      },
    },
  })
}

// POST — salvează intrare în jurnal
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

  const { tenantId, id: userId } = session.user

  const body = await req.json()
  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: "Date invalide." }, { status: 400 })
  }

  const entry = await prisma.guideJournalEntry.create({
    data: {
      tenantId,
      userId,
      ...parsed.data,
    },
  })

  return NextResponse.json(entry, { status: 201 })
}

// PATCH — actualizare feedback (helpful)
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ message: "Neautorizat." }, { status: 401 })

  const body = await req.json()
  const { id, helpful } = z.object({ id: z.string(), helpful: z.boolean() }).parse(body)

  const entry = await prisma.guideJournalEntry.update({
    where: { id },
    data: { helpful },
  })

  // ── Feedback client → creștere cognitivă agent delegat ──
  // helpful=true → interacțiune validată ca succes real
  // helpful=false → interacțiune eșuată — agentul trebuie să învețe
  if (entry.delegatedTo) {
    try {
      const { updateStateAfterExecution } = await import("@/lib/agents/cognitive-state")
      await updateStateAfterExecution(entry.delegatedTo.toUpperCase(), {
        taskId: entry.id,
        taskTitle: `Feedback client: "${entry.question.slice(0, 40)}"`,
        succeeded: helpful,
        failureReason: helpful ? undefined : "Client feedback: răspunsul nu a fost util",
        costUSD: 0,
        wasFirstAttempt: true,
        taskType: "CLIENT_FEEDBACK",
      })
    } catch {} // fire-and-forget
  }

  return NextResponse.json({ success: true })
}
