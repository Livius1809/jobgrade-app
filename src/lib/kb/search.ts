import { prisma } from "@/lib/prisma"

export interface KBSearchResult {
  id: string
  agentRole: string
  content: string
  kbType: string
  source: string
  confidence: number
  tags: string[]
}

export interface KBHealthStats {
  agentRole: string
  permanentCount: number
  bufferCount: number
  avgConfidence: number
  lastValidated: Date | null
}

/**
 * Construiește un to_tsquery cu OR între cuvinte (|), cu unaccent.
 * Astfel, orice cuvânt din query poate potrivi conținut — mai util decât AND strict.
 * Cuvintele scurte (<3 caractere) sunt excluse pentru a evita false pozitive.
 * Upgrade path: înlocuiește cu pgvector cosine similarity când embeddings sunt disponibile.
 */
function buildOrQuery(query: string): string {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .map((w) => w.replace(/['"\\:&|!<>()]/g, "")) // sanitizare caractere speciale tsquery
    .filter(Boolean)
    .join(" | ")
}

export async function searchKB(
  agentRole: string,
  query: string,
  limit = 10,
  kbType?: string
): Promise<KBSearchResult[]> {
  const orQuery = buildOrQuery(query)
  if (!orQuery) return []

  if (kbType) {
    return prisma.$queryRaw<KBSearchResult[]>`
      SELECT id, "agentRole", content, "kbType"::text, source::text, confidence, tags,
             ts_rank(to_tsvector('simple', unaccent(content)), to_tsquery('simple', unaccent(${orQuery}))) AS rank
      FROM kb_entries
      WHERE "agentRole" = ${agentRole}
        AND status = 'PERMANENT'::"KBStatus"
        AND "kbType" = ${kbType}::"KBType"
        AND to_tsvector('simple', unaccent(content)) @@ to_tsquery('simple', unaccent(${orQuery}))
      ORDER BY rank DESC, confidence DESC
      LIMIT ${limit}
    `
  }

  return prisma.$queryRaw<KBSearchResult[]>`
    SELECT id, "agentRole", content, "kbType"::text, source::text, confidence, tags,
           ts_rank(to_tsvector('simple', unaccent(content)), to_tsquery('simple', unaccent(${orQuery}))) AS rank
    FROM kb_entries
    WHERE "agentRole" = ${agentRole}
      AND status = 'PERMANENT'::"KBStatus"
      AND to_tsvector('simple', unaccent(content)) @@ to_tsquery('simple', unaccent(${orQuery}))
    ORDER BY rank DESC, confidence DESC
    LIMIT ${limit}
  `
}

export async function getKBHealth(agentRole: string): Promise<KBHealthStats> {
  const [permanentCount, bufferCount, stats] = await Promise.all([
    prisma.kBEntry.count({ where: { agentRole, status: "PERMANENT" } }),
    prisma.kBBuffer.count({ where: { agentRole, status: "PENDING" } }),
    prisma.$queryRaw<[{ avg_confidence: number | null; last_validated: Date | null }]>`
      SELECT AVG(confidence) as avg_confidence, MAX("validatedAt") as last_validated
      FROM kb_entries
      WHERE "agentRole" = ${agentRole} AND status = 'PERMANENT'::"KBStatus"
    `,
  ])

  return {
    agentRole,
    permanentCount,
    bufferCount,
    avgConfidence: Number(stats[0]?.avg_confidence ?? 0),
    lastValidated: stats[0]?.last_validated ?? null,
  }
}
