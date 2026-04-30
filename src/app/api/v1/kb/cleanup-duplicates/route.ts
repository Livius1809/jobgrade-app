/**
 * POST /api/v1/kb/cleanup-duplicates — Șterge KB entries duplicate din joburi de ingestie
 * Body: { deleteJobIds: string[], keepJobId: string }
 * Auth: INTERNAL_API_KEY
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-internal-key")
  if (key !== process.env.INTERNAL_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { deleteJobIds, keepJobId } = await req.json()
  if (!deleteJobIds || !keepJobId) {
    return NextResponse.json({ error: "deleteJobIds[] and keepJobId required" }, { status: 400 })
  }

  const results: Record<string, number> = {}

  for (const jobId of deleteJobIds) {
    const deleted = await prisma.kBEntry.deleteMany({
      where: { tags: { hasSome: [`ingest:${jobId}`] } },
    })
    results[jobId] = deleted.count

    // Also delete job config
    await prisma.systemConfig.deleteMany({
      where: { key: `INGEST_JOB_${jobId}` },
    })
  }

  // Count remaining for the kept job
  const remaining = await prisma.kBEntry.count({
    where: { tags: { hasSome: [`ingest:${keepJobId}`] } },
  })

  return NextResponse.json({ deleted: results, kept: { jobId: keepJobId, entries: remaining } })
}
