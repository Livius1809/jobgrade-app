import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { prisma } from "@/lib/prisma"
import { calibrateOwnerInput } from "@/lib/agents/owner-calibration"
import { logOwnerCalibration } from "@/lib/agents/owner-calibration-log"

export const maxDuration = 60

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

    // Calibrare L1+L2+L3 pe titlu + conținut
    const calibrationText = `${title.trim()}: ${content.trim().substring(0, 1000)}`
    const calibration = calibrateOwnerInput(calibrationText)
    logOwnerCalibration(calibration, "direct", prisma as any).catch(() => {})

    // STOP pe CRITIC — documentul nu se publică
    if (calibration.flags.some(f => f.severity === "CRITIC")) {
      return NextResponse.json({
        error: "Documentul conține conținut cu discrepanță critică și nu poate fi publicat",
        ownerCalibration: {
          flags: calibration.flags,
          isAligned: false,
        },
      }, { status: 422 })
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
      ...(calibration.flags.length > 0 && {
        ownerCalibration: {
          flags: calibration.flags,
          isAligned: calibration.isAligned,
        },
      }),
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

    // Găsește toate documentele unice din KB (text paste + ingestie)
    const docMap = new Map<string, { title: string; agents: Set<string>; chunks: number; createdAt: string; tags: string[]; sourceType?: string }>()

    // 1. Documente din text paste (tag: document-library)
    const textDocs = await p.kBEntry.findMany({
      where: { tags: { has: "document-library" }, status: "PERMANENT" },
      select: { content: true, tags: true, agentRole: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    })

    for (const doc of textDocs) {
      const titleMatch = doc.content.match(/\[Doc: ([^\]]+)\]/)
      const title = titleMatch ? titleMatch[1].replace(/ \(\d+\/\d+\)/, "") : "Fără titlu"
      if (!docMap.has(title)) {
        docMap.set(title, { title, agents: new Set(), chunks: 0, createdAt: doc.createdAt?.toISOString?.() || new Date().toISOString(), tags: doc.tags.filter((t: string) => t !== "document-library") })
      }
      const entry = docMap.get(title)!
      entry.agents.add(doc.agentRole)
      entry.chunks++
    }

    // 2. Documente din ingestie (joburi completate)
    const ingestConfigs = await p.systemConfig.findMany({
      where: { key: { startsWith: "INGEST_JOB_" } },
    })

    for (const cfg of ingestConfigs) {
      try {
        const job = JSON.parse(cfg.value)
        if (job.status !== "COMPLETED") continue
        const title = job.sourceTitle
        if (docMap.has(title)) continue // deja adăugat

        // Găsește agenții infuzați din KB entries ale acestui job
        const entries = await p.kBEntry.findMany({
          where: { tags: { hasSome: [`ingest:${job.id}`] }, status: "PERMANENT" },
          select: { agentRole: true },
        })

        const agents = new Set<string>(entries.map((e: any) => e.agentRole))
        docMap.set(title, {
          title,
          agents,
          chunks: entries.length,
          createdAt: job.createdAt || new Date().toISOString(),
          tags: [job.sourceType || "carte", `${job.sourceAuthor || ""}`].filter(Boolean),
          sourceType: job.sourceType,
        })
      } catch {}
    }

    const documents = [...docMap.values()].map(d => ({
      ...d,
      agents: [...d.agents].sort(),
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
