import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deductCredits, hasCredits, CREDIT_COSTS } from "@/lib/credits"
import ExcelJS from "exceljs"

const CREDIT_COST = CREDIT_COSTS.EXPORT_EXCEL

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: "Neautorizat." }, { status: 401 })
    }

    const { id: sessionId } = await params
    const tenantId = session.user.tenantId

    const sufficient = await hasCredits(tenantId, CREDIT_COST)
    if (!sufficient) {
      return NextResponse.json(
        { message: `Credite insuficiente. Necesari: ${CREDIT_COST}.` },
        { status: 402 }
      )
    }

    const evalSession = await prisma.evaluationSession.findFirst({
      where: { id: sessionId, tenantId },
      include: {
        jobResults: {
          include: {
            job: {
              select: {
                title: true,
                code: true,
                department: { select: { name: true } },
              },
            },
            salaryGrade: true,
          },
          orderBy: { rank: "asc" },
        },
        consensusStatuses: {
          include: {
            criterion: { select: { name: true } },
            finalSubfactor: { select: { code: true, points: true } },
          },
        },
        participants: {
          include: {
            user: { select: { firstName: true, lastName: true, jobTitle: true } },
          },
        },
      },
    })

    if (!evalSession) {
      return NextResponse.json({ message: "Sesiunea nu a fost găsită." }, { status: 404 })
    }

    const workbook = new ExcelJS.Workbook()
    workbook.creator = "JobGrade"
    workbook.created = new Date()

    // ── Sheet 1: Ierarhie joburi ──────────────────────────────────
    const sheet1 = workbook.addWorksheet("Ierarhie joburi")

    // Session info header
    sheet1.mergeCells("A1:G1")
    const titleCell = sheet1.getCell("A1")
    titleCell.value = `Sesiune: ${evalSession.name}`
    titleCell.font = { bold: true, size: 14 }
    titleCell.alignment = { horizontal: "center" }

    sheet1.mergeCells("A2:G2")
    const subtitleCell = sheet1.getCell("A2")
    subtitleCell.value = `Status: ${evalSession.status} · Finalizat: ${
      evalSession.completedAt
        ? evalSession.completedAt.toLocaleDateString("ro-RO")
        : "—"
    }`
    subtitleCell.alignment = { horizontal: "center" }
    subtitleCell.font = { color: { argb: "FF666666" }, size: 10 }

    sheet1.addRow([]) // spacer

    // Table header
    const headerRow = sheet1.addRow([
      "Rang",
      "Cod post",
      "Titlu post",
      "Departament",
      "Scor total",
      "Scor normalizat",
      "Grupă salarială",
    ])
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1D4ED8" },
      }
      cell.alignment = { horizontal: "center" }
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFAAAAAA" } },
      }
    })

    // Data rows
    evalSession.jobResults.forEach((jr, idx) => {
      const row = sheet1.addRow([
        jr.rank,
        jr.job.code ?? "—",
        jr.job.title,
        jr.job.department?.name ?? "—",
        jr.totalScore,
        jr.normalizedScore.toFixed(2),
        jr.salaryGrade?.name ?? "—",
      ])
      if (idx % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF8FAFC" },
          }
        })
      }
    })

    // Column widths
    sheet1.getColumn(1).width = 8
    sheet1.getColumn(2).width = 14
    sheet1.getColumn(3).width = 35
    sheet1.getColumn(4).width = 22
    sheet1.getColumn(5).width = 14
    sheet1.getColumn(6).width = 18
    sheet1.getColumn(7).width = 20

    // ── Sheet 2: Consens per criteriu ─────────────────────────────
    const sheet2 = workbook.addWorksheet("Consens criterii")

    const header2 = sheet2.addRow([
      "Criteriu",
      "Job",
      "Status consens",
      "Subfactor final",
      "Puncte finale",
    ])
    header2.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF7C3AED" },
      }
    })

    const jobMap: Record<string, string> = {}
    evalSession.jobResults.forEach((jr) => {
      jobMap[jr.jobId] = jr.job.title
    })

    evalSession.consensusStatuses.forEach((cs) => {
      sheet2.addRow([
        cs.criterion.name,
        jobMap[cs.jobId] ?? cs.jobId,
        cs.status,
        cs.finalSubfactor?.code ?? "—",
        cs.finalSubfactor?.points ?? "—",
      ])
    })

    sheet2.getColumn(1).width = 28
    sheet2.getColumn(2).width = 35
    sheet2.getColumn(3).width = 18
    sheet2.getColumn(4).width = 18
    sheet2.getColumn(5).width = 14

    // ── Sheet 3: Participanți ──────────────────────────────────────
    const sheet3 = workbook.addWorksheet("Participanți")

    const header3 = sheet3.addRow(["Evaluator", "Funcție", "Finalizat"])
    header3.eachCell((cell) => {
      cell.font = { bold: true }
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE5E7EB" },
      }
    })

    evalSession.participants.forEach((p) => {
      sheet3.addRow([
        `${p.user.firstName} ${p.user.lastName}`,
        p.user.jobTitle ?? "—",
        p.completedAt ? "Da" : "Nu",
      ])
    })

    sheet3.getColumn(1).width = 28
    sheet3.getColumn(2).width = 25
    sheet3.getColumn(3).width = 12

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()

    await deductCredits(
      tenantId,
      CREDIT_COST,
      `Export Excel: ${evalSession.name}`,
      sessionId
    )

    const filename = `${evalSession.name.replace(/[^a-zA-Z0-9]/g, "_")}_rezultate.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.byteLength),
      },
    })
  } catch (error) {
    console.error("[EXPORT EXCEL]", error)
    return NextResponse.json({ message: "Eroare la generarea exportului." }, { status: 500 })
  }
}
