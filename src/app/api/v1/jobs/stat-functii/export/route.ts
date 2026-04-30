/**
 * POST /api/v1/jobs/stat-functii/export?format=excel|pdf
 * Genereaza stat de functii ca Excel sau PDF din datele trimise.
 * Gratuit — clientul primeste statul generat din datele pe care le-a introdus.
 */

import { NextRequest, NextResponse } from "next/server"
import { authOrKey as auth } from "@/lib/auth-or-key"

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

const LEVEL_LABELS: Record<number, string> = {
  1: "N (Top Management)",
  2: "N-1 (Director)",
  3: "N-2 (Manager)",
  4: "N-3 (Specialist)",
  5: "N-4 (Executant)",
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Neautorizat" }, { status: 401 })
  }

  const url = new URL(req.url)
  const format = url.searchParams.get("format") || "excel"
  const body = await req.json()
  const rows: StatFunctiiRow[] = body.rows || []

  if (rows.length === 0) {
    return NextResponse.json({ error: "Nicio pozitie" }, { status: 400 })
  }

  // Sortam: pe departament apoi pe nivel ierarhic
  const sorted = [...rows].sort((a, b) => {
    if (a.department !== b.department) return a.department.localeCompare(b.department)
    return a.hierarchyLevel - b.hierarchyLevel
  })

  if (format === "excel") {
    return generateExcel(sorted, session.user.name || "")
  }

  // PDF ca text simplu formatat (fara dependenta externa)
  return generateTextPdf(sorted, session.user.name || "")
}

async function generateExcel(rows: StatFunctiiRow[], userName: string): Promise<NextResponse> {
  // Generam CSV (compatibil Excel) — nu necesita dependenta xlsx
  const BOM = "\uFEFF" // UTF-8 BOM pentru diacritice in Excel
  const header = "Nr.crt,Departament,Cod,Denumire post,Nivel ierarhic,Nr. pozitii,Status"
  const csvRows = rows.map((r, i) => [
    i + 1,
    `"${r.department}"`,
    `"${r.code}"`,
    `"${r.title}"`,
    `"${LEVEL_LABELS[r.hierarchyLevel] || `N-${r.hierarchyLevel}`}"`,
    r.positionCount,
    r.isActive ? "Activ" : "Inactiv",
  ].join(","))

  const totalPositions = rows.reduce((s, r) => s + r.positionCount, 0)
  const footer = `\n,,,,TOTAL,${totalPositions},`

  const csv = BOM + header + "\n" + csvRows.join("\n") + footer

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="stat-functii.csv"`,
    },
  })
}

async function generateTextPdf(rows: StatFunctiiRow[], userName: string): Promise<NextResponse> {
  // Generam un HTML simplu care clientul il printeaza ca PDF
  const departments = [...new Set(rows.map(r => r.department))]
  const totalPositions = rows.reduce((s, r) => s + r.positionCount, 0)
  const now = new Date().toLocaleDateString("ro-RO", { day: "2-digit", month: "long", year: "numeric" })

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Stat de functii</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; margin: 40px; color: #1e293b; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  h2 { font-size: 13px; color: #475569; margin-top: 24px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th { background: #f1f5f9; text-align: left; padding: 6px 8px; border: 1px solid #e2e8f0; font-size: 10px; }
  td { padding: 5px 8px; border: 1px solid #e2e8f0; }
  .total { font-weight: bold; background: #f8fafc; }
  .footer { margin-top: 32px; font-size: 9px; color: #94a3b8; }
  @media print { body { margin: 20px; } }
</style></head><body>
<h1>Stat de functii</h1>
<p style="color:#64748b;font-size:10px;">Generat: ${now} | Total: ${rows.length} posturi, ${totalPositions} pozitii</p>`

  for (const dept of departments) {
    const deptRows = rows.filter(r => r.department === dept)
    const deptTotal = deptRows.reduce((s, r) => s + r.positionCount, 0)
    html += `<h2>${dept}</h2><table>
<tr><th>Nr.</th><th>Cod</th><th>Denumire post</th><th>Nivel ierarhic</th><th>Nr. pozitii</th></tr>`
    deptRows.forEach((r, i) => {
      html += `<tr><td>${i + 1}</td><td>${r.code}</td><td>${r.title}</td><td>${LEVEL_LABELS[r.hierarchyLevel] || ""}</td><td style="text-align:center">${r.positionCount}</td></tr>`
    })
    html += `<tr class="total"><td colspan="4" style="text-align:right">Total ${dept}</td><td style="text-align:center">${deptTotal}</td></tr></table>`
  }

  html += `<div class="footer">Document generat automat de platforma JobGrade. Pentru imprimare, folositi Ctrl+P sau File > Print.</div></body></html>`

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="stat-functii.html"`,
    },
  })
}
