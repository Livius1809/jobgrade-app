import { prisma } from "@/lib/prisma"

const VOYAGE_MODEL = "voyage-4-lite"
const VOYAGE_DIMENSIONS = 1024
const BATCH_SIZE = 20 // Voyage supports up to 128 inputs per request
const RATE_LIMIT_PAUSE = 1500 // ms between batches (increase to 21000 if no payment method on Voyage)

interface VoyageEmbeddingResponse {
  data: { embedding: number[]; index: number }[]
  usage: { total_tokens: number }
}

async function callVoyageAPI(
  texts: string[],
  inputType: "document" | "query"
): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY
  if (!apiKey) throw new Error("VOYAGE_API_KEY not configured")

  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: texts,
      model: VOYAGE_MODEL,
      input_type: inputType,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Voyage API ${res.status}: ${body}`)
  }

  const json = (await res.json()) as VoyageEmbeddingResponse
  return json.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding)
}

/**
 * Generează embedding pentru un text (query sau document).
 */
export async function generateEmbedding(
  text: string,
  inputType: "document" | "query" = "document"
): Promise<number[]> {
  const [embedding] = await callVoyageAPI([text], inputType)
  return embedding
}

/**
 * Generează embeddings în batch pentru mai multe texte.
 */
export async function generateEmbeddings(
  texts: string[],
  inputType: "document" | "query" = "document"
): Promise<number[][]> {
  const results: number[][] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)
    const embeddings = await callVoyageAPI(batch, inputType)
    results.push(...embeddings)

    if (i + BATCH_SIZE < texts.length) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_PAUSE))
    }
  }

  return results
}

/**
 * Populează embeddings pentru KB entries care nu au.
 * Returnează numărul de entries actualizate.
 */
export async function backfillEmbeddings(options?: {
  agentRole?: string
  batchSize?: number
  maxEntries?: number
  onProgress?: (done: number, total: number) => void
}): Promise<{ updated: number; errors: number; totalTokens: number }> {
  const { agentRole, batchSize = BATCH_SIZE, maxEntries, onProgress } =
    options ?? {}

  // Fetch entries without embeddings
  const whereClause = agentRole
    ? `WHERE embedding IS NULL AND status = 'PERMANENT' AND "agentRole" = '${agentRole}'`
    : `WHERE embedding IS NULL AND status = 'PERMANENT'`

  const limitClause = maxEntries ? `LIMIT ${maxEntries}` : ""

  const entries = await prisma.$queryRawUnsafe<
    { id: string; content: string }[]
  >(
    `SELECT id, content FROM kb_entries ${whereClause} ORDER BY "createdAt" DESC ${limitClause}`
  )

  if (entries.length === 0) return { updated: 0, errors: 0, totalTokens: 0 }

  let updated = 0
  let errors = 0
  let totalTokens = 0

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize)
    const texts = batch.map((e) => e.content.slice(0, 8000)) // truncate to avoid token limits

    try {
      const apiKey = process.env.VOYAGE_API_KEY
      if (!apiKey) throw new Error("VOYAGE_API_KEY not configured")

      const res = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          input: texts,
          model: VOYAGE_MODEL,
          input_type: "document",
        }),
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`Voyage API ${res.status}: ${body}`)
      }

      const json = (await res.json()) as VoyageEmbeddingResponse
      totalTokens += json.usage.total_tokens

      const sorted = json.data.sort((a, b) => a.index - b.index)

      // Update each entry with its embedding via raw SQL
      for (let j = 0; j < sorted.length; j++) {
        const vecStr = `[${sorted[j].embedding.join(",")}]`
        await prisma.$executeRawUnsafe(
          `UPDATE kb_entries SET embedding = $1::vector WHERE id = $2`,
          vecStr,
          batch[j].id
        )
        updated++
      }
    } catch (err) {
      console.error(
        `Embedding batch error (offset ${i}):`,
        err instanceof Error ? err.message : err
      )
      errors += batch.length
    }

    onProgress?.(Math.min(i + batchSize, entries.length), entries.length)

    if (i + batchSize < entries.length) {
      await new Promise((r) => setTimeout(r, RATE_LIMIT_PAUSE))
    }
  }

  return { updated, errors, totalTokens }
}

export { VOYAGE_MODEL, VOYAGE_DIMENSIONS }
