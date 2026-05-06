/**
 * /api/v1/reports/readiness
 *
 * GET — Returnează statusul tuturor rapoartelor pentru tenant-ul curent.
 * Folosit de SmartReportsDashboard.
 */

import { NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"
import { getReportReadiness } from "@/lib/reports/report-readiness-engine"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.tenantId) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const reports = await getReportReadiness(session.user.tenantId)
    return NextResponse.json({ reports })
  } catch (error) {
    console.error("[REPORTS READINESS GET]", error)
    return NextResponse.json({ message: "Eroare interna." }, { status: 500 })
  }
}
