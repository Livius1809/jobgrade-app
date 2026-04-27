/**
 * POST /api/v1/jobs/stat-functii
 * Salveaza statul de functii generat din fisele de post.
 * Stocheaza in CompanyProfile.aiAnalysis (camp JSON existent).
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getTenantData, setTenantData } from "@/lib/tenant-storage"

export const dynamic = "force-dynamic"

interface StatFunctiiRow {
  jobId: string
  title: string
  code: string
  department: string
  hierarchyLevel: number
  positionCount: number
  isActive: boolean
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const body = await req.json()
  const rows: StatFunctiiRow[] = body.rows

  if (!rows || rows.length === 0) {
    return NextResponse.json({ error: "Nicio pozitie" }, { status: 400 })
  }

  // Salvam in SystemConfig via tenant-storage
  await setTenantData(session.user.tenantId, "STAT_FUNCTII", {
    rows,
    generatedAt: new Date().toISOString(),
    totalPositions: rows.reduce((s, r) => s + r.positionCount, 0),
    totalJobs: rows.length,
    departments: [...new Set(rows.map(r => r.department))],
  })

  return NextResponse.json({
    ok: true,
    saved: rows.length,
    totalPositions: rows.reduce((s, r) => s + r.positionCount, 0),
  })
}

// GET — citeste statul de functii salvat
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const statFunctii = await getTenantData(session.user.tenantId, "STAT_FUNCTII")
  return NextResponse.json({ statFunctii })
}
