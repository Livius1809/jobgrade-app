import { prisma } from "@/lib/prisma"
import { generateEmbedding } from "./embeddings"

export interface KBSearchResult {
  id: string
  agentRole: string
  content: string
  kbType: string
  source: string
  confidence: number
  tags: string[]
  similarity?: number
}

export interface KBHealthStats {
  agentRole: string
  permanentCount: number
  bufferCount: number
  avgConfidence: number
  lastValidated: Date | null
  embeddingCoverage: number
}

/**
 * Semantic search cu pgvector cosine similarity.
 * Fallback la full-text search dacă embedding-ul nu e disponibil.
 */
export async function searchKB(
  agentRole: string,
  query: string,
  limit = 10,
  kbType?: string
): Promise<KBSearchResult[]> {
  // Try semantic search first
  try {
    const results = await semanticSearch(agentRole, query, limit, kbType)
    if (results.length > 0) return results
  } catch {
    // Fallback to full-text if Voyage API fails
  }

  return fullTextSearch(agentRole, query, limit, kbType)
}

/**
 * Semantic search: generează embedding pentru query, apoi cosine similarity în pgvector.
 */
async function semanticSearch(
  agentRole: string,
  query: string,
  limit: number,
  kbType?: string
): Promise<KBSearchResult[]> {
  const queryEmbedding = await generateEmbedding(query, "query")
  const vecStr = `[${queryEmbedding.join(",")}]`

  const kbTypeFilter = kbType
    ? `AND "kbType" = '${kbType}'::"KBType"`
    : ""

  return prisma.$queryRawUnsafe<KBSearchResult[]>(
    `SELECT id, "agentRole", content, "kbType"::text, source::text, confidence, tags,
            1 - (embedding <=> $1::vector) AS similarity
     FROM kb_entries
     WHERE "agentRole" = $2
       AND status = 'PERMANENT'::"KBStatus"
       AND embedding IS NOT NULL
       ${kbTypeFilter}
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    vecStr,
    agentRole,
    limit
  )
}

/**
 * Semantic search cross-agent: caută în KB-urile tuturor agenților.
 */
export async function searchKBCrossAgent(
  query: string,
  limit = 10,
  minSimilarity = 0.5
): Promise<KBSearchResult[]> {
  try {
    const queryEmbedding = await generateEmbedding(query, "query")
    const vecStr = `[${queryEmbedding.join(",")}]`

    return prisma.$queryRawUnsafe<KBSearchResult[]>(
      `SELECT id, "agentRole", content, "kbType"::text, source::text, confidence, tags,
              1 - (embedding <=> $1::vector) AS similarity
       FROM kb_entries
       WHERE status = 'PERMANENT'::"KBStatus"
         AND embedding IS NOT NULL
         AND 1 - (embedding <=> $1::vector) >= $2
       ORDER BY embedding <=> $1::vector
       LIMIT $3`,
      vecStr,
      minSimilarity,
      limit
    )
  } catch {
    return []
  }
}

/**
 * Full-text search cu ts_rank (fallback).
 */
function buildOrQuery(query: string): string {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .map((w) => w.replace(/['"\\:&|!<>()]/g, ""))
    .filter(Boolean)
    .join(" | ")
}

async function fullTextSearch(
  agentRole: string,
  query: string,
  limit: number,
  kbType?: string
): Promise<KBSearchResult[]> {
  const orQuery = buildOrQuery(query)
  if (!orQuery) return []

  if (kbType) {
    return prisma.$queryRaw<KBSearchResult[]>`
      SELECT id, "agentRole", content, "kbType"::text, source::text, confidence, tags,
             ts_rank(to_tsvector('simple', unaccent(content)), to_tsquery('simple', unaccent(${orQuery}))) AS similarity
      FROM kb_entries
      WHERE "agentRole" = ${agentRole}
        AND status = 'PERMANENT'::"KBStatus"
        AND "kbType" = ${kbType}::"KBType"
        AND to_tsvector('simple', unaccent(content)) @@ to_tsquery('simple', unaccent(${orQuery}))
      ORDER BY similarity DESC, confidence DESC
      LIMIT ${limit}
    `
  }

  return prisma.$queryRaw<KBSearchResult[]>`
    SELECT id, "agentRole", content, "kbType"::text, source::text, confidence, tags,
           ts_rank(to_tsvector('simple', unaccent(content)), to_tsquery('simple', unaccent(${orQuery}))) AS similarity
    FROM kb_entries
    WHERE "agentRole" = ${agentRole}
      AND status = 'PERMANENT'::"KBStatus"
      AND to_tsvector('simple', unaccent(content)) @@ to_tsquery('simple', unaccent(${orQuery}))
    ORDER BY similarity DESC, confidence DESC
    LIMIT ${limit}
  `
}

export async function getKBHealth(agentRole: string): Promise<KBHealthStats> {
  const [permanentCount, bufferCount, stats, embCount] = await Promise.all([
    prisma.kBEntry.count({ where: { agentRole, status: "PERMANENT" } }),
    prisma.kBBuffer.count({ where: { agentRole, status: "PENDING" } }),
    prisma.$queryRaw<
      [{ avg_confidence: number | null; last_validated: Date | null }]
    >`
      SELECT AVG(confidence) as avg_confidence, MAX("validatedAt") as last_validated
      FROM kb_entries
      WHERE "agentRole" = ${agentRole} AND status = 'PERMANENT'::"KBStatus"
    `,
    prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT count(*) FROM kb_entries WHERE "agentRole" = $1 AND status = 'PERMANENT' AND embedding IS NOT NULL`,
      agentRole
    ),
  ])

  return {
    agentRole,
    permanentCount,
    bufferCount,
    avgConfidence: Number(stats[0]?.avg_confidence ?? 0),
    lastValidated: stats[0]?.last_validated ?? null,
    embeddingCoverage:
      permanentCount > 0 ? Number(embCount[0].count) / permanentCount : 0,
  }
}
