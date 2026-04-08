import { NextRequest, NextResponse } from "next/server"
import { backfillEmbeddings } from "@/lib/kb/embeddings"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/v1/kb/embeddings — statistici embedding coverage
 * POST /api/v1/kb/embeddings — backfill embeddings (batch)
 */

export async function GET() {
  const stats = await prisma.$queryRaw<
    { agentRole: string; total: bigint; with_embedding: bigint }[]
  >`
    SELECT "agentRole",
           count(*) as total,
           count(embedding) as with_embedding
    FROM kb_entries
    WHERE status = 'PERMANENT'::"KBStatus"
    GROUP BY "agentRole"
    ORDER BY count(*) DESC
  `

  const globalTotal = stats.reduce((s, r) => s + Number(r.total), 0)
  const globalWithEmb = stats.reduce((s, r) => s + Number(r.with_embedding), 0)

  return NextResponse.json({
    coverage: globalTotal > 0 ? globalWithEmb / globalTotal : 0,
    totalEntries: globalTotal,
    withEmbeddings: globalWithEmb,
    pending: globalTotal - globalWithEmb,
    byAgent: stats.map((r) => ({
      agentRole: r.agentRole,
      total: Number(r.total),
      withEmbedding: Number(r.with_embedding),
      coverage:
        Number(r.total) > 0
          ? Number(r.with_embedding) / Number(r.total)
          : 0,
    })),
  })
}

export async function POST(request: NextRequest) {
  const searchParams = new URL(request.url).searchParams
  const agentRole = searchParams.get("agentRole") ?? undefined
  const max = searchParams.get("max")
  const maxEntries = max ? parseInt(max) : undefined
  const dryRun = searchParams.get("dryRun") === "true"

  if (dryRun) {
    const [{ count }] = agentRole
      ? await prisma.$queryRawUnsafe<[{ count: bigint }]>(
          `SELECT count(*) FROM kb_entries WHERE embedding IS NULL AND status = 'PERMANENT' AND "agentRole" = $1`,
          agentRole
        )
      : await prisma.$queryRawUnsafe<[{ count: bigint }]>(
          `SELECT count(*) FROM kb_entries WHERE embedding IS NULL AND status = 'PERMANENT'`
        )

    return NextResponse.json({
      dryRun: true,
      pending: Number(count),
      estimatedBatches: Math.ceil(Number(count) / 20),
    })
  }

  const result = await backfillEmbeddings({ agentRole, maxEntries })

  return NextResponse.json({
    ...result,
    message: `Backfill complete: ${result.updated} updated, ${result.errors} errors`,
  })
}
