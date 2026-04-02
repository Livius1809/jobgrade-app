import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * POST /api/v1/docs — Adaugă document în biblioteca partajată
 * Body: { title: string, content: string, tags?: string[], targetAgents?: string[] }
 *
 * Documentul se stochează ca KB entries pe agenții specificați (sau pe toți).
 * Agenții îl accesează automat prin KB query.
 */
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user.role !== "OWNER" && session.user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Acces restricționat" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { title, content, tags, targetAgents } = body

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "Titlu și conținut obligatorii" }, { status: 400 })
    }

    const p = prisma as any

    // Împarte conținutul în chunks de max 2000 caractere (pentru KB entries)
    const chunks = splitIntoChunks(content.trim(), 2000)
    const docTags = ["document-library", ...(tags || []), title.toLowerCase().replace(/[^a-z0-9]/g, "-")]

    // Determină agenții destinatari
    let agents: string[]
    if (targetAgents && targetAgents.length > 0) {
      agents = targetAgents
    } else {
      // Toți agenții activi
      const allAgents = await p.agentDefinition.findMany({
        where: { isActive: true },
        select: { agentRole: true },
      })
      agents = allAgents.map((a: any) => a.agentRole)
    }

    let totalCreated = 0

    for (const agentRole of agents) {
      for (let i = 0; i < chunks.length; i++) {
        try {
          await p.kBEntry.create({
            data: {
              agentRole,
              kbType: "SHARED_DOMAIN",
              content: `[Doc: ${title}${chunks.length > 1 ? ` (${i + 1}/${chunks.length})` : ""}] ${chunks[i]}`,
              source: "EXPERT_HUMAN",
              confidence: 0.90,
              status: "PERMANENT",
              tags: docTags,
              usageCount: 0,
              validatedAt: new Date(),
            },
          })
          totalCreated++
        } catch { /* duplicate — skip */ }
      }
    }

    return NextResponse.json({
      success: true,
      title,
      chunks: chunks.length,
      agents: agents.length,
      totalEntries: totalCreated,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * GET /api/v1/docs — Listează documentele din bibliotecă
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: "Nu ești autentificat" }, { status: 401 })
  }

  try {
    const p = prisma as any

    // Găsește toate documentele unice din KB
    const docs = await p.kBEntry.findMany({
      where: {
        tags: { has: "document-library" },
        status: "PERMANENT",
      },
      select: {
        content: true,
        tags: true,
        agentRole: true,
        createdAt: true,
        confidence: true,
      },
      orderBy: { createdAt: "desc" },
    })

    // Grupează pe titlu
    const docMap = new Map<string, { title: string; agents: Set<string>; chunks: number; createdAt: string; tags: string[] }>()

    for (const doc of docs) {
      const titleMatch = doc.content.match(/\[Doc: ([^\]]+)\]/)
      const title = titleMatch ? titleMatch[1].replace(/ \(\d+\/\d+\)/, "") : "Fără titlu"

      if (!docMap.has(title)) {
        docMap.set(title, {
          title,
          agents: new Set(),
          chunks: 0,
          createdAt: doc.createdAt?.toISOString?.() || new Date().toISOString(),
          tags: doc.tags.filter((t: string) => t !== "document-library"),
        })
      }

      const entry = docMap.get(title)!
      entry.agents.add(doc.agentRole)
      entry.chunks++
    }

    const documents = [...docMap.values()].map(d => ({
      ...d,
      agents: [...d.agents],
      agentCount: d.agents.size,
    }))

    return NextResponse.json({ documents, total: documents.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

/**
 * DELETE /api/v1/docs — Șterge un document din bibliotecă
 * Body: { title: string }
 */
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user.role !== "OWNER" && session.user.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Acces restricționat" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { title } = body

    if (!title) {
      return NextResponse.json({ error: "Titlu obligatoriu" }, { status: 400 })
    }

    const p = prisma as any
    const tag = title.toLowerCase().replace(/[^a-z0-9]/g, "-")

    const deleted = await p.kBEntry.deleteMany({
      where: {
        tags: { hasEvery: ["document-library", tag] },
      },
    })

    return NextResponse.json({ deleted: deleted.count })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// ── Helper: split text into chunks ──────────────────────────────────────────

function splitIntoChunks(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text]

  const chunks: string[] = []
  const paragraphs = text.split(/\n\n+/)
  let current = ""

  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length > maxLen && current.length > 0) {
      chunks.push(current.trim())
      current = para
    } else {
      current = current ? current + "\n\n" + para : para
    }
  }
  if (current.trim()) chunks.push(current.trim())

  return chunks
}
