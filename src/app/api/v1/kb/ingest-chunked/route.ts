/**
 * POST /api/v1/kb/ingest-chunked — Ingestie documente mari pe tranșe
 *
 * Pentru PDF-uri de sute/mii de pagini care nu încap în timeout-ul de 300s.
 *
 * Flux:
 *  1. POST { action: "start", rawText, sourceTitle, sourceAuthor, sourceType }
 *     → Salvează textul în SystemConfig, returnează jobId + totalChunks
 *  2. POST { action: "process", jobId, batchSize? }
 *     → Procesează următoarele N chunk-uri (default 3), returnează progres
 *  3. Repeat "process" până completionPct = 100
 *  4. GET ?jobId=xxx → Status curent
 *
 * Auth: Owner session sau INTERNAL_API_KEY
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"
export const maxDuration = 300

interface ChunkedJob {
  id: string
  sourceTitle: string
  sourceAuthor: string
  sourceType: string
  chunks: string[]
  processedUpTo: number // index-ul ultimului chunk procesat
  entriesCreated: number
  byRole: Record<string, number>
  status: "IN_PROGRESS" | "COMPLETED" | "FAILED"
  error?: string
  createdAt: string
}

async function getJob(jobId: string): Promise<ChunkedJob | null> {
  const config = await prisma.systemConfig.findUnique({ where: { key: `INGEST_JOB_${jobId}` } })
  if (!config) return null
  return JSON.parse(config.value)
}

async function saveJob(job: ChunkedJob): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key: `INGEST_JOB_${job.id}` },
    update: { value: JSON.stringify(job) },
    create: { key: `INGEST_JOB_${job.id}`, value: JSON.stringify(job) },
  })
}

async function checkAuth(req: NextRequest): Promise<boolean> {
  const key = req.headers.get("x-internal-key")
  if (key === process.env.INTERNAL_API_KEY) return true
  try {
    const session = await auth()
    console.log("[ingest-chunked] auth:", session?.user?.email, session?.user?.role, "cookies:", req.cookies.getAll().map(c => c.name).join(","))
    return !!session?.user?.role && ["OWNER", "SUPER_ADMIN", "COMPANY_ADMIN"].includes(session.user.role)
  } catch (e: any) {
    console.error("[ingest-chunked] auth error:", e.message)
    return false
  }
}

// GET — Status
export async function GET(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const jobId = req.nextUrl.searchParams.get("jobId")
  if (!jobId) {
    // Lista toate joburile active
    const configs = await prisma.systemConfig.findMany({
      where: { key: { startsWith: "INGEST_JOB_" } },
    })
    const jobs = configs.map(c => {
      const j = JSON.parse(c.value) as ChunkedJob
      return {
        id: j.id, sourceTitle: j.sourceTitle, status: j.status,
        totalChunks: j.chunks.length, processedUpTo: j.processedUpTo,
        completionPct: Math.round((j.processedUpTo / j.chunks.length) * 100),
        entriesCreated: j.entriesCreated,
      }
    })
    return NextResponse.json({ jobs })
  }

  const job = await getJob(jobId)
  if (!job) return NextResponse.json({ error: "Job negasit" }, { status: 404 })

  return NextResponse.json({
    id: job.id,
    sourceTitle: job.sourceTitle,
    status: job.status,
    totalChunks: job.chunks.length,
    processedUpTo: job.processedUpTo,
    completionPct: Math.round((job.processedUpTo / job.chunks.length) * 100),
    entriesCreated: job.entriesCreated,
    byRole: job.byRole,
    error: job.error,
  })
}

// POST — Start sau Process
export async function POST(req: NextRequest) {
  if (!(await checkAuth(req))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const contentType = req.headers.get("content-type") || ""

  // ═══ START din FILE UPLOAD (FormData) ═══
  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const sourceTitle = formData.get("sourceTitle") as string
    const sourceAuthor = formData.get("sourceAuthor") as string
    const sourceType = (formData.get("sourceType") as string) || "carte"

    if (!file || !sourceTitle || !sourceAuthor) {
      return NextResponse.json({ error: "file, sourceTitle, sourceAuthor obligatorii" }, { status: 400 })
    }

    // Extrage text din PDF/DOCX
    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = "." + file.name.toLowerCase().split(".").pop()
    let rawText = ""

    try {
      if (ext === ".pdf") {
        // pdf-parse
        const pdfParseModule = await import("pdf-parse")
        const pdfParse = (pdfParseModule as any).default || pdfParseModule
        const result = await pdfParse(buffer)
        rawText = result.text
      } else if (ext === ".docx" || ext === ".doc") {
        const mammoth = await import("mammoth")
        const result = await mammoth.extractRawText({ buffer })
        rawText = result.value
      } else if (ext === ".txt") {
        rawText = buffer.toString("utf-8")
      } else {
        return NextResponse.json({ error: `Format nesuportat: ${ext}` }, { status: 400 })
      }
    } catch (e: any) {
      return NextResponse.json({ error: `Eroare extragere text: ${e.message}` }, { status: 500 })
    }

    if (rawText.length < 200) {
      return NextResponse.json({ error: "Prea putin text extras (<200 caractere). PDF-ul poate fi scanat (imagine)." }, { status: 400 })
    }

    // Chunk + salvare job (refolosim logica de mai jos)
    const maxChars = 3000
    const paragraphs = rawText.split(/\n\s*\n/)
    const chunks: string[] = []
    let current = ""
    for (const p of paragraphs) {
      if ((current + "\n\n" + p).length > maxChars && current.length > 0) {
        chunks.push(current.trim())
        current = p
      } else {
        current = current ? current + "\n\n" + p : p
      }
    }
    if (current.trim()) chunks.push(current.trim())

    const jobId = `ingest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const job: ChunkedJob = {
      id: jobId, sourceTitle, sourceAuthor, sourceType,
      chunks, processedUpTo: 0, entriesCreated: 0, byRole: {},
      status: "IN_PROGRESS", createdAt: new Date().toISOString(),
    }
    await saveJob(job)

    return NextResponse.json({
      ok: true, jobId, totalChunks: chunks.length,
      textLength: rawText.length,
      estimatedPages: Math.round(rawText.length / 2500),
      estimatedMinutes: Math.ceil(chunks.length * 0.5),
    })
  }

  const body = await req.json()
  const { action } = body

  // ═══ START — creează job din text brut (JSON) ═══
  if (action === "start") {
    const { rawText, sourceTitle, sourceAuthor, sourceType, chunkSize } = body
    if (!rawText || !sourceTitle || !sourceAuthor) {
      return NextResponse.json({ error: "rawText, sourceTitle, sourceAuthor obligatorii" }, { status: 400 })
    }

    // Chunk text
    const maxChars = chunkSize || 3000
    const paragraphs = rawText.split(/\n\s*\n/)
    const chunks: string[] = []
    let current = ""
    for (const p of paragraphs) {
      if ((current + "\n\n" + p).length > maxChars && current.length > 0) {
        chunks.push(current.trim())
        current = p
      } else {
        current = current ? current + "\n\n" + p : p
      }
    }
    if (current.trim()) chunks.push(current.trim())

    const jobId = `ingest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const job: ChunkedJob = {
      id: jobId,
      sourceTitle,
      sourceAuthor,
      sourceType: sourceType || "carte",
      chunks,
      processedUpTo: 0,
      entriesCreated: 0,
      byRole: {},
      status: "IN_PROGRESS",
      createdAt: new Date().toISOString(),
    }

    // Salvăm chunk-urile în DB (pot fi mari — SystemConfig acceptă text)
    await saveJob(job)

    return NextResponse.json({
      ok: true,
      jobId,
      totalChunks: chunks.length,
      estimatedCalls: chunks.length,
      estimatedMinutes: Math.ceil(chunks.length * 0.5), // ~30s per chunk
    })
  }

  // ═══ PROCESS — procesează următoarea tranșă ═══
  // ═══ APPEND-CHUNKS — adaugă chunk-uri la job existent ═══
  if (action === "append-chunks") {
    const { jobId, chunks: newChunks } = body
    if (!jobId || !Array.isArray(newChunks)) {
      return NextResponse.json({ error: "jobId si chunks[] obligatorii" }, { status: 400 })
    }
    const job = await getJob(jobId)
    if (!job) return NextResponse.json({ error: "Job negasit" }, { status: 404 })

    job.chunks.push(...newChunks)
    await saveJob(job)

    return NextResponse.json({ ok: true, totalChunks: job.chunks.length, appended: newChunks.length })
  }

  // ═══ PROCESS — procesează următoarea tranșă ═══
  if (action === "process") {
    const { jobId, batchSize } = body
    if (!jobId) return NextResponse.json({ error: "jobId obligatoriu" }, { status: 400 })

    const job = await getJob(jobId)
    if (!job) return NextResponse.json({ error: "Job negasit" }, { status: 404 })
    if (job.status === "COMPLETED") return NextResponse.json({ ok: true, status: "COMPLETED", entriesCreated: job.entriesCreated })

    const batch = batchSize || 3 // 3 chunk-uri per apel (~90s)
    const startIdx = job.processedUpTo
    const endIdx = Math.min(startIdx + batch, job.chunks.length)

    try {
      const { extractKnowledgeFromChunk } = await import("@/lib/kb/ingest-document")

      let batchEntries = 0
      for (let i = startIdx; i < endIdx; i++) {
        const entries = await (extractKnowledgeFromChunk as any)(
          job.chunks[i],
          job.sourceTitle,
          job.sourceAuthor,
          job.sourceType,
          i,
          job.chunks.length,
        )

        // Persistă în DB
        for (const entry of entries) {
          const existing = await prisma.kBEntry.findFirst({
            where: { agentRole: entry.agentRole, content: entry.content, status: "PERMANENT" },
          })
          if (!existing) {
            await prisma.kBEntry.create({
              data: {
                agentRole: entry.agentRole,
                kbType: entry.kbType || "METHODOLOGY",
                content: entry.content,
                source: "EXPERT_HUMAN",
                tags: [...(entry.tags || []), `ingest:${job.id}`, `source:${job.sourceTitle}`],
                status: "PERMANENT",
                confidence: entry.confidence || 0.8,
              },
            })
            batchEntries++
            job.byRole[entry.agentRole] = (job.byRole[entry.agentRole] || 0) + 1
          }
        }
      }

      job.processedUpTo = endIdx
      job.entriesCreated += batchEntries

      if (endIdx >= job.chunks.length) {
        job.status = "COMPLETED"
        // Learning
        try {
          const { learnFromReport } = await import("@/lib/learning-hooks")
          await learnFromReport("KB_INGESTION", "system", `Ingestie completa: ${job.sourceTitle} (${job.sourceAuthor}), ${job.entriesCreated} entries, ${job.chunks.length} chunks`)
        } catch {}
      }

      await saveJob(job)

      return NextResponse.json({
        ok: true,
        jobId: job.id,
        processed: endIdx - startIdx,
        processedUpTo: job.processedUpTo,
        totalChunks: job.chunks.length,
        completionPct: Math.round((job.processedUpTo / job.chunks.length) * 100),
        entriesCreated: job.entriesCreated,
        batchEntries,
        status: job.status,
        byRole: job.byRole,
      })
    } catch (e: any) {
      job.status = "FAILED"
      job.error = e.message
      await saveJob(job)
      return NextResponse.json({ error: e.message, jobId: job.id, status: "FAILED" }, { status: 500 })
    }
  }

  return NextResponse.json({ error: "action: start | process" }, { status: 400 })
}
