import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

export async function GET(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const agentRole = url.searchParams.get("agentRole")
    const kbType = url.searchParams.get("kbType") // PERMANENT, BUFFER, ARCHIVED
    const source = url.searchParams.get("source") // KBSource enum
    const search = url.searchParams.get("search")
    const minConfidence = url.searchParams.get("minConfidence")
    const maxConfidence = url.searchParams.get("maxConfidence")
    const page = parseInt(url.searchParams.get("page") || "1")
    const pageSize = Math.min(parseInt(url.searchParams.get("pageSize") || "20"), 100)

    const p = prisma as any

    // If no agentRole specified, return agent summary
    if (!agentRole) {
      const agentSummary = await p.kBEntry.groupBy({
        by: ["agentRole", "status"],
        _count: { _all: true },
      }).catch(() => [])

      // Build per-agent stats
      const agentMap: Record<string, { total: number; permanent: number; buffer: number; archived: number }> = {}
      for (const row of agentSummary as any[]) {
        if (!agentMap[row.agentRole]) {
          agentMap[row.agentRole] = { total: 0, permanent: 0, buffer: 0, archived: 0 }
        }
        agentMap[row.agentRole].total += row._count._all
        if (row.status === "PERMANENT") agentMap[row.agentRole].permanent += row._count._all
        else if (row.status === "BUFFER") agentMap[row.agentRole].buffer += row._count._all
        else if (row.status === "ARCHIVED") agentMap[row.agentRole].archived += row._count._all
      }

      // Embedding coverage per agent
      let embeddingCoverage: Record<string, { total: number; withEmbedding: number }> = {}
      try {
        const totalPerAgent = await p.kBEntry.groupBy({
          by: ["agentRole"],
          _count: { _all: true },
        })
        const withEmbeddingRaw = await p.$queryRaw`
          SELECT "agentRole", COUNT(*) as cnt
          FROM kb_entries
          WHERE embedding IS NOT NULL
          GROUP BY "agentRole"
        ` as any[]

        for (const row of totalPerAgent as any[]) {
          embeddingCoverage[row.agentRole] = { total: row._count._all, withEmbedding: 0 }
        }
        for (const row of withEmbeddingRaw) {
          if (embeddingCoverage[row.agentRole]) {
            embeddingCoverage[row.agentRole].withEmbedding = Number(row.cnt)
          }
        }
      } catch {
        // pgvector may not be enabled — skip embedding stats
      }

      const agents = Object.entries(agentMap).map(([role, stats]) => ({
        agentRole: role,
        ...stats,
        embeddingCoverage: embeddingCoverage[role]
          ? Math.round((embeddingCoverage[role].withEmbedding / embeddingCoverage[role].total) * 100)
          : null,
      }))

      agents.sort((a, b) => b.total - a.total)

      return NextResponse.json({ mode: "summary", agents })
    }

    // Build where clause for entries
    const where: any = { agentRole }
    if (kbType) {
      // Map friendly name to status enum
      const statusMap: Record<string, string> = {
        PERMANENT: "PERMANENT",
        BUFFER: "BUFFER",
        ARCHIVED: "ARCHIVED",
      }
      if (statusMap[kbType]) where.status = statusMap[kbType]
    }
    if (source) where.source = source
    if (minConfidence || maxConfidence) {
      where.confidence = {}
      if (minConfidence) where.confidence.gte = parseFloat(minConfidence)
      if (maxConfidence) where.confidence.lte = parseFloat(maxConfidence)
    }
    if (search) {
      where.content = { contains: search, mode: "insensitive" }
    }

    const [entries, totalCount] = await Promise.all([
      p.kBEntry.findMany({
        where,
        select: {
          id: true,
          agentRole: true,
          kbType: true,
          content: true,
          source: true,
          confidence: true,
          usageCount: true,
          successRate: true,
          status: true,
          tags: true,
          createdAt: true,
          validatedAt: true,
          propagatedFrom: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      p.kBEntry.count({ where }),
    ])

    return NextResponse.json({
      mode: "entries",
      agentRole,
      entries,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    })
  } catch (error) {
    console.error("[kb-browser] Error:", error)
    return NextResponse.json({ error: "internal" }, { status: 500 })
  }
}
