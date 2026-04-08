import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { embedNewEntry } from "@/lib/kb/distill"

// Praguri de promovare Buffer → PERMANENT
const THRESHOLD_OCCURRENCES = 3       // minim 3 sesiuni distincte
const THRESHOLD_SUCCESS_RATE = 0.70   // minim 70% outcome pozitive
const THRESHOLD_CONFLICT_CONFIDENCE = 0.85  // intrările cu confidence > 0.85 sunt "autoritare"

const schema = z.object({
  agentRole: z.string().min(1),
  // Dacă e specificat, evaluează doar buffer-ul respectiv
  // Dacă nu, evaluează TOATE buffer-ele PENDING ale agentului
  bufferId: z.string().optional(),
})

function verifyInternalAuth(req: NextRequest): boolean {
  const key = process.env.INTERNAL_API_KEY
  if (!key) return false
  return req.headers.get("x-internal-key") === key
}

interface PromoteResult {
  bufferId: string
  decision: "PROMOTED" | "PENDING_MORE_DATA" | "REJECTED_LOW_SUCCESS" | "REJECTED_DUPLICATE"
  reason: string
  entryId?: string
}

/**
 * Evaluează un buffer și îl promovează în KB dacă îndeplinește toate pragurile.
 *
 * Criterii:
 * 1. Frecvență: occurrences >= 3
 * 2. Succes: positiveOutcomes / totalOutcomes >= 0.70 (ignorat dacă totalOutcomes = 0)
 * 3. Unicitate: nu există intrare similară cu confidence > 0.85 (via FTS)
 */
async function evaluateBuffer(
  bufferId: string,
  agentRole: string
): Promise<PromoteResult> {
  const buffer = await prisma.kBBuffer.findUnique({ where: { id: bufferId } })

  if (!buffer || buffer.agentRole !== agentRole || buffer.status !== "PENDING") {
    return {
      bufferId,
      decision: "REJECTED_LOW_SUCCESS",
      reason: "Buffer negăsit, aparține altui agent, sau nu e PENDING.",
    }
  }

  // Criteriu 1 — Frecvență
  if (buffer.occurrences < THRESHOLD_OCCURRENCES) {
    return {
      bufferId,
      decision: "PENDING_MORE_DATA",
      reason: `Frecvență insuficientă: ${buffer.occurrences}/${THRESHOLD_OCCURRENCES} sesiuni.`,
    }
  }

  // Criteriu 2 — Succes (dacă există date de outcome)
  if (buffer.totalOutcomes > 0) {
    const successRate = buffer.positiveOutcomes / buffer.totalOutcomes
    if (successRate < THRESHOLD_SUCCESS_RATE) {
      await prisma.kBBuffer.update({
        where: { id: bufferId },
        data: { status: "REJECTED", reviewedAt: new Date() },
      })
      return {
        bufferId,
        decision: "REJECTED_LOW_SUCCESS",
        reason: `Rată succes prea mică: ${(successRate * 100).toFixed(0)}% < ${THRESHOLD_SUCCESS_RATE * 100}%.`,
      }
    }
  }

  // Criteriu 3 — Unicitate (FTS simplu: primele 80 de caractere ca fingerprint)
  const fingerprint = buffer.rawContent.slice(0, 80).trim()
  const fingerprintQuery = fingerprint
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 4)
    .map((w) => w.replace(/['"\\:&|!<>()@*]/g, ""))
    .filter(Boolean)
    .slice(0, 5)
    .join(" | ")

  if (!fingerprintQuery) {
    return {
      bufferId,
      decision: "PENDING_MORE_DATA",
      reason: "Fingerprint insuficient pentru verificare unicitate.",
    }
  }

  const duplicate = await prisma.$queryRaw<{ id: string; confidence: number }[]>`
    SELECT id, confidence FROM kb_entries
    WHERE "agentRole" = ${agentRole}
      AND status = 'PERMANENT'::"KBStatus"
      AND confidence > ${THRESHOLD_CONFLICT_CONFIDENCE}
      AND to_tsvector('simple', unaccent(content))
          @@ to_tsquery('simple', unaccent(${fingerprintQuery}))
    LIMIT 1
  `

  if (duplicate.length > 0) {
    return {
      bufferId,
      decision: "REJECTED_DUPLICATE",
      reason: `Intrare similară cu confidence înalt există deja: id=${duplicate[0].id}.`,
    }
  }

  // Calculare confidence pentru noua intrare
  // Dacă avem date de outcome, baza e success rate; altfel 0.65 (promovat doar pe frecvență)
  const confidence =
    buffer.totalOutcomes > 0
      ? Math.min(0.95, (buffer.positiveOutcomes / buffer.totalOutcomes) * 0.9)
      : 0.65

  // Promovare: creare KBEntry PERMANENT + marcare buffer APPROVED
  const [entry] = await prisma.$transaction([
    prisma.kBEntry.create({
      data: {
        agentRole,
        kbType: "PERMANENT",
        content: buffer.rawContent,
        source: "DISTILLED_INTERACTION",
        confidence,
        status: "PERMANENT",
        tags: [],
        validatedAt: new Date(),
        usageCount: 0,
      },
    }),
    prisma.kBBuffer.update({
      where: { id: bufferId },
      data: { status: "APPROVED", reviewedAt: new Date() },
    }),
  ])

  // Generate embedding for the new entry (non-blocking)
  embedNewEntry(entry.id).catch(() => {})

  return {
    bufferId,
    decision: "PROMOTED",
    reason: `Promovat cu confidence=${confidence.toFixed(2)} (occurrences=${buffer.occurrences}, successRate=${buffer.totalOutcomes > 0 ? (buffer.positiveOutcomes / buffer.totalOutcomes).toFixed(2) : "n/a"}).`,
    entryId: entry.id,
  }
}

export async function POST(req: NextRequest) {
  if (!verifyInternalAuth(req)) {
    return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { agentRole, bufferId } = schema.parse(body)

    // Evaluare buffer specific
    if (bufferId) {
      const result = await evaluateBuffer(bufferId, agentRole)
      return NextResponse.json(result)
    }

    // Evaluare batch: toate buffer-ele PENDING ale agentului
    const pendingBuffers = await prisma.kBBuffer.findMany({
      where: { agentRole, status: "PENDING" },
      select: { id: true },
    })

    if (pendingBuffers.length === 0) {
      return NextResponse.json({ message: "Niciun buffer PENDING.", results: [] })
    }

    const results: PromoteResult[] = []
    for (const buf of pendingBuffers) {
      const result = await evaluateBuffer(buf.id, agentRole)
      results.push(result)
    }

    const promoted = results.filter((r) => r.decision === "PROMOTED").length
    const pending = results.filter((r) => r.decision === "PENDING_MORE_DATA").length
    const rejected = results.filter(
      (r) => r.decision === "REJECTED_LOW_SUCCESS" || r.decision === "REJECTED_DUPLICATE"
    ).length

    return NextResponse.json({
      summary: { total: results.length, promoted, pending, rejected },
      results,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Date invalide.", errors: error.issues }, { status: 400 })
    }
    console.error("[KB PROMOTE]", error)
    return NextResponse.json({ message: "Eroare la evaluare buffer." }, { status: 500 })
  }
}
